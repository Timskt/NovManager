use crate::models::*;
use chrono::Utc;
use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tracing::info;

pub struct SqliteStorage {
    conn: Arc<Mutex<Connection>>,
    db_path: PathBuf,
}

impl SqliteStorage {
    pub fn new() -> Result<Self, Box<dyn std::error::Error + Send + Sync>> {
        let db_path = Self::locate_db_path();
        if let Some(parent) = db_path.parent() {
            fs::create_dir_all(parent)?;
        }

        info!("Connecting to SQLite database at {:?}", db_path);
        let conn = Connection::open(&db_path)?;

        // 开启 WAL 高并发模式和外键支持
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;",
        )?;

        let storage = Self {
            conn: Arc::new(Mutex::new(conn)),
            db_path,
        };

        storage.init_tables()?;
        storage.maybe_seed_data()?;

        Ok(storage)
    }

    fn locate_db_path() -> PathBuf {
        if let Ok(p) = std::env::var("NOV_DB_PATH") {
            return PathBuf::from(p);
        }

        // 候选路径检查
        let candidates = [
            PathBuf::from("data/novmanager_local.db"),
            PathBuf::from("../backend/data/novmanager_local.db"),
            PathBuf::from("backend/data/novmanager_local.db"),
        ];

        for c in &candidates {
            if c.exists() {
                return c.clone();
            }
        }

        // 默认存放到本目录下的 data/novmanager_local.db
        PathBuf::from("data/novmanager_local.db")
    }

    fn init_tables(&self) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute_batch(
            r#"
            CREATE TABLE IF NOT EXISTS novels (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subtitle TEXT DEFAULT '',
                genre TEXT DEFAULT '仙侠修真',
                target_word_count INTEGER DEFAULT 1000000,
                current_word_count INTEGER DEFAULT 0,
                default_pov TEXT DEFAULT 'THIRD_LIMITED',
                style_guide_json TEXT DEFAULT '{}',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS world_settings (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                category TEXT NOT NULL,
                name TEXT NOT NULL,
                aliases_json TEXT DEFAULT '[]',
                content TEXT NOT NULL,
                priority INTEGER DEFAULT 50,
                tags_json TEXT DEFAULT '[]',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS characters (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                name TEXT NOT NULL,
                role_type TEXT NOT NULL,
                gender TEXT DEFAULT '男',
                profile_json TEXT DEFAULT '{}',
                background TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS character_states (
                id TEXT PRIMARY KEY,
                character_id TEXT NOT NULL,
                chapter_id TEXT,
                chapter_index INTEGER DEFAULT 1,
                location TEXT DEFAULT '',
                combat_power TEXT DEFAULT '',
                health_status TEXT DEFAULT 'HEALTHY',
                status_tags_json TEXT DEFAULT '[]',
                state_summary TEXT DEFAULT '',
                updated_at TEXT NOT NULL,
                FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS character_relations (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                from_character_id TEXT NOT NULL,
                to_character_id TEXT NOT NULL,
                relation_type TEXT NOT NULL,
                affinity_score INTEGER DEFAULT 0,
                description TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS volumes (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                volume_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                summary TEXT DEFAULT '',
                main_conflict TEXT DEFAULT '',
                target_climax TEXT DEFAULT '',
                boundary_constraints TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS chapters (
                id TEXT PRIMARY KEY,
                volume_id TEXT NOT NULL,
                novel_id TEXT NOT NULL,
                chapter_index INTEGER NOT NULL,
                title TEXT NOT NULL,
                outline TEXT DEFAULT '',
                pov_character_id TEXT,
                word_count_goal INTEGER DEFAULT 3000,
                actual_word_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'PLANNED',
                FOREIGN KEY (volume_id) REFERENCES volumes(id) ON DELETE CASCADE,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS scenes (
                id TEXT PRIMARY KEY,
                chapter_id TEXT NOT NULL,
                scene_index INTEGER NOT NULL,
                scene_goal TEXT DEFAULT '',
                conflict TEXT DEFAULT '',
                turn_point TEXT DEFAULT '',
                outcome TEXT DEFAULT '',
                involved_character_ids_json TEXT DEFAULT '[]',
                location TEXT DEFAULT '',
                draft_content TEXT DEFAULT '',
                agent_notes TEXT DEFAULT '',
                FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS foreshadowings (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                clue_description TEXT NOT NULL,
                planted_chapter_id TEXT,
                planted_chapter_index INTEGER,
                planned_resolve_chapter_id TEXT,
                planned_resolve_chapter_index INTEGER,
                actual_resolved_chapter_id TEXT,
                status TEXT DEFAULT 'PLANTED',
                notes TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS polish_techniques (
                id TEXT PRIMARY KEY,
                novel_id TEXT,
                chapter_id TEXT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                category_label TEXT NOT NULL,
                description TEXT NOT NULL,
                before_snippet TEXT DEFAULT '',
                after_snippet TEXT DEFAULT '',
                applicable_scene TEXT DEFAULT '',
                applied_count INTEGER DEFAULT 1,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS self_evaluations (
                id TEXT PRIMARY KEY,
                novel_id TEXT,
                chapter_id TEXT,
                scene_index INTEGER,
                overall_score INTEGER NOT NULL,
                scores_json TEXT NOT NULL,
                strengths_json TEXT NOT NULL,
                weaknesses_json TEXT NOT NULL,
                refinements_json TEXT NOT NULL,
                iteration_count INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS app_state (
                key TEXT PRIMARY KEY,
                val TEXT NOT NULL
            );
            "#,
        )?;
        Ok(())
    }

    fn maybe_seed_data(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let count: i64 = {
            let conn = self.conn.lock().unwrap();
            conn.query_row("SELECT count(*) FROM novels", [], |row| row.get(0))?
        };

        if count > 0 {
            info!("Database already contains {} novels, skipping seed.", count);
            return Ok(());
        }

        info!("Database is empty. Checking for novel_store.json to seed...");
        let candidates = [
            PathBuf::from("data/novel_store.json"),
            PathBuf::from("../backend/data/novel_store.json"),
            PathBuf::from("backend/data/novel_store.json"),
        ];

        for c in &candidates {
            if c.exists() {
                if let Ok(content) = fs::read_to_string(c) {
                    if let Ok(val) = serde_json::from_str::<Value>(&content) {
                        info!("Found seed JSON at {:?}, importing...", c);
                        self.import_json_store(&val)?;
                        return Ok(());
                    }
                }
            }
        }

        info!("No seed file found, creating built-in sample novels.");
        self.seed_sample_data()?;
        Ok(())
    }

    pub fn import_json_store(&self, root: &Value) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let now_iso = Utc::now().to_rfc3339();
        let conn = self.conn.lock().unwrap();
        let tx = conn.unchecked_transaction()?;

        if let Some(active_id) = root.get("active_novel_id").and_then(|v| v.as_str()) {
            tx.execute(
                "INSERT OR REPLACE INTO app_state (key, val) VALUES ('active_novel_id', ?)",
                params![active_id],
            )?;
        }

        // 1. Novels
        if let Some(novels) = root.get("novels").and_then(|v| v.as_object()) {
            for (_, n) in novels {
                let id = n.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let title = n.get("title").and_then(|v| v.as_str()).unwrap_or_default();
                let subtitle = n.get("subtitle").and_then(|v| v.as_str()).unwrap_or_default();
                let genre = n.get("genre").and_then(|v| v.as_str()).unwrap_or("仙侠修真");
                let target_word_count = n.get("target_word_count").and_then(|v| v.as_i64()).unwrap_or(1000000);
                let current_word_count = n.get("current_word_count").and_then(|v| v.as_i64()).unwrap_or(0);
                let default_pov = n.get("default_pov").and_then(|v| v.as_str()).unwrap_or("THIRD_LIMITED");
                let style_guide_json = n.get("style_guide").map(|v| v.to_string()).unwrap_or_else(|| "{}".to_string());
                let created_at = n.get("created_at").and_then(|v| v.as_str()).unwrap_or(&now_iso);
                let updated_at = n.get("updated_at").and_then(|v| v.as_str()).unwrap_or(&now_iso);

                tx.execute(
                    "INSERT OR REPLACE INTO novels (id, title, subtitle, genre, target_word_count, current_word_count, default_pov, style_guide_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, title, subtitle, genre, target_word_count, current_word_count, default_pov, style_guide_json, created_at, updated_at],
                )?;
            }
        }

        // 2. World settings
        if let Some(settings) = root.get("world_settings").and_then(|v| v.as_object()) {
            for (_, s) in settings {
                let id = s.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let novel_id = s.get("novel_id").and_then(|v| v.as_str()).unwrap_or_default();
                let category = s.get("category").and_then(|v| v.as_str()).unwrap_or("RULE");
                let name = s.get("name").and_then(|v| v.as_str()).unwrap_or_default();
                let aliases_json = s.get("aliases").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());
                let content = s.get("content").and_then(|v| v.as_str()).unwrap_or_default();
                let priority = s.get("priority").and_then(|v| v.as_i64()).unwrap_or(50);
                let tags_json = s.get("tags").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());

                tx.execute(
                    "INSERT OR REPLACE INTO world_settings (id, novel_id, category, name, aliases_json, content, priority, tags_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, novel_id, category, name, aliases_json, content, priority, tags_json],
                )?;
            }
        }

        // 3. Characters
        if let Some(chars) = root.get("characters").and_then(|v| v.as_object()) {
            for (_, c) in chars {
                let id = c.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let novel_id = c.get("novel_id").and_then(|v| v.as_str()).unwrap_or_default();
                let name = c.get("name").and_then(|v| v.as_str()).unwrap_or_default();
                let role_type = c.get("role_type").and_then(|v| v.as_str()).unwrap_or("SUPPORTING");
                let gender = c.get("gender").and_then(|v| v.as_str()).unwrap_or("男");
                let profile_json = c.get("profile").map(|v| v.to_string()).unwrap_or_else(|| "{}".to_string());
                let background = c.get("background").and_then(|v| v.as_str()).unwrap_or_default();
                let created_at = c.get("created_at").and_then(|v| v.as_str()).unwrap_or(&now_iso);

                tx.execute(
                    "INSERT OR REPLACE INTO characters (id, novel_id, name, role_type, gender, profile_json, background, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, novel_id, name, role_type, gender, profile_json, background, created_at],
                )?;
            }
        }

        // 4. Character states
        if let Some(states) = root.get("character_states").and_then(|v| v.as_array()) {
            for st in states {
                let id = st.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let character_id = st.get("character_id").and_then(|v| v.as_str()).unwrap_or_default();
                let chapter_id = st.get("chapter_id").and_then(|v| v.as_str()).unwrap_or_default();
                let chapter_index = st.get("chapter_index").and_then(|v| v.as_i64()).unwrap_or(1);
                let location = st.get("location").and_then(|v| v.as_str()).unwrap_or_default();
                let combat_power = st.get("combat_power").and_then(|v| v.as_str()).unwrap_or_default();
                let health_status = st.get("health_status").and_then(|v| v.as_str()).unwrap_or("HEALTHY");
                let status_tags_json = st.get("status_tags").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());
                let state_summary = st.get("state_summary").and_then(|v| v.as_str()).unwrap_or_default();
                let updated_at = st.get("updated_at").and_then(|v| v.as_str()).unwrap_or(&now_iso);

                tx.execute(
                    "INSERT OR REPLACE INTO character_states (id, character_id, chapter_id, chapter_index, location, combat_power, health_status, status_tags_json, state_summary, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, character_id, chapter_id, chapter_index, location, combat_power, health_status, status_tags_json, state_summary, updated_at],
                )?;
            }
        }

        // 5. Character relations
        if let Some(rels) = root.get("character_relations").and_then(|v| v.as_array()) {
            for r in rels {
                let id = r.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let novel_id = r.get("novel_id").and_then(|v| v.as_str()).unwrap_or_default();
                let from_character_id = r.get("from_character_id").and_then(|v| v.as_str()).unwrap_or_default();
                let to_character_id = r.get("to_character_id").and_then(|v| v.as_str()).unwrap_or_default();
                let relation_type = r.get("relation_type").and_then(|v| v.as_str()).unwrap_or_default();
                let affinity_score = r.get("affinity_score").and_then(|v| v.as_i64()).unwrap_or(0);
                let description = r.get("description").and_then(|v| v.as_str()).unwrap_or_default();

                tx.execute(
                    "INSERT OR REPLACE INTO character_relations (id, novel_id, from_character_id, to_character_id, relation_type, affinity_score, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
                    params![id, novel_id, from_character_id, to_character_id, relation_type, affinity_score, description],
                )?;
            }
        }

        // 6. Volumes, chapters, scenes
        if let Some(vols) = root.get("volumes").and_then(|v| v.as_object()) {
            for (_, vol) in vols {
                let id = vol.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let novel_id = vol.get("novel_id").and_then(|v| v.as_str()).unwrap_or_default();
                let volume_index = vol.get("volume_index").and_then(|v| v.as_i64()).unwrap_or(1);
                let title = vol.get("title").and_then(|v| v.as_str()).unwrap_or_default();
                let summary = vol.get("summary").and_then(|v| v.as_str()).unwrap_or_default();
                let main_conflict = vol.get("main_conflict").and_then(|v| v.as_str()).unwrap_or_default();
                let target_climax = vol.get("target_climax").and_then(|v| v.as_str()).unwrap_or_default();
                let boundary_constraints = vol.get("boundary_constraints").and_then(|v| v.as_str()).unwrap_or_default();

                tx.execute(
                    "INSERT OR REPLACE INTO volumes (id, novel_id, volume_index, title, summary, main_conflict, target_climax, boundary_constraints) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, novel_id, volume_index, title, summary, main_conflict, target_climax, boundary_constraints],
                )?;

                if let Some(chaps) = vol.get("chapters").and_then(|v| v.as_array()) {
                    for c in chaps {
                        let c_id = c.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                        let c_vol_id = c.get("volume_id").and_then(|v| v.as_str()).unwrap_or(id);
                        let c_novel_id = c.get("novel_id").and_then(|v| v.as_str()).unwrap_or(novel_id);
                        let chapter_index = c.get("chapter_index").and_then(|v| v.as_i64()).unwrap_or(1);
                        let c_title = c.get("title").and_then(|v| v.as_str()).unwrap_or_default();
                        let outline = c.get("outline").and_then(|v| v.as_str()).unwrap_or_default();
                        let pov_character_id = c.get("pov_character_id").and_then(|v| v.as_str());
                        let word_count_goal = c.get("word_count_goal").and_then(|v| v.as_i64()).unwrap_or(3000);
                        let actual_word_count = c.get("actual_word_count").and_then(|v| v.as_i64()).unwrap_or(0);
                        let status = c.get("status").and_then(|v| v.as_str()).unwrap_or("PLANNED");

                        tx.execute(
                            "INSERT OR REPLACE INTO chapters (id, volume_id, novel_id, chapter_index, title, outline, pov_character_id, word_count_goal, actual_word_count, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                            params![c_id, c_vol_id, c_novel_id, chapter_index, c_title, outline, pov_character_id, word_count_goal, actual_word_count, status],
                        )?;

                        if let Some(scenes) = c.get("scenes").and_then(|v| v.as_array()) {
                            for sc in scenes {
                                let sc_id = sc.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                                let sc_chap_id = sc.get("chapter_id").and_then(|v| v.as_str()).unwrap_or(c_id);
                                let scene_index = sc.get("scene_index").and_then(|v| v.as_i64()).unwrap_or(1);
                                let scene_goal = sc.get("scene_goal").and_then(|v| v.as_str()).unwrap_or_default();
                                let conflict = sc.get("conflict").and_then(|v| v.as_str()).unwrap_or_default();
                                let turn_point = sc.get("turn_point").and_then(|v| v.as_str()).unwrap_or_default();
                                let outcome = sc.get("outcome").and_then(|v| v.as_str()).unwrap_or_default();
                                let involved_ids = sc.get("involved_character_ids").map(|v| v.to_string()).unwrap_or_else(|| "[]".to_string());
                                let location = sc.get("location").and_then(|v| v.as_str()).unwrap_or_default();
                                let draft_content = sc.get("draft_content").and_then(|v| v.as_str()).unwrap_or_default();
                                let agent_notes = sc.get("agent_notes").and_then(|v| v.as_str()).unwrap_or_default();

                                tx.execute(
                                    "INSERT OR REPLACE INTO scenes (id, chapter_id, scene_index, scene_goal, conflict, turn_point, outcome, involved_character_ids_json, location, draft_content, agent_notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                                    params![sc_id, sc_chap_id, scene_index, scene_goal, conflict, turn_point, outcome, involved_ids, location, draft_content, agent_notes],
                                )?;
                            }
                        }
                    }
                }
            }
        }

        // 7. Foreshadowings
        if let Some(foreshadowings) = root.get("foreshadowings").and_then(|v| v.as_object()) {
            for (_, f) in foreshadowings {
                let id = f.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let novel_id = f.get("novel_id").and_then(|v| v.as_str()).unwrap_or_default();
                let title = f.get("title").and_then(|v| v.as_str()).unwrap_or_default();
                let clue_description = f.get("clue_description").and_then(|v| v.as_str()).unwrap_or_default();
                let planted_chapter_id = f.get("planted_chapter_id").and_then(|v| v.as_str());
                let planted_chapter_index = f.get("planted_chapter_index").and_then(|v| v.as_i64());
                let planned_resolve_chapter_id = f.get("planned_resolve_chapter_id").and_then(|v| v.as_str());
                let planned_resolve_chapter_index = f.get("planned_resolve_chapter_index").and_then(|v| v.as_i64());
                let actual_resolved_chapter_id = f.get("actual_resolved_chapter_id").and_then(|v| v.as_str());
                let status = f.get("status").and_then(|v| v.as_str()).unwrap_or("PLANTED");
                let notes = f.get("notes").and_then(|v| v.as_str()).unwrap_or_default();

                tx.execute(
                    "INSERT OR REPLACE INTO foreshadowings (id, novel_id, title, clue_description, planted_chapter_id, planted_chapter_index, planned_resolve_chapter_id, planned_resolve_chapter_index, actual_resolved_chapter_id, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, novel_id, title, clue_description, planted_chapter_id, planted_chapter_index, planned_resolve_chapter_id, planned_resolve_chapter_index, actual_resolved_chapter_id, status, notes],
                )?;
            }
        }

        // 8. Polish techniques
        if let Some(techniques) = root.get("polish_techniques").and_then(|v| v.as_object()) {
            for (_, t) in techniques {
                let id = t.get("id").and_then(|v| v.as_str()).unwrap_or_default();
                let novel_id = t.get("novel_id").and_then(|v| v.as_str());
                let chapter_id = t.get("chapter_id").and_then(|v| v.as_str());
                let name = t.get("name").and_then(|v| v.as_str()).unwrap_or_default();
                let category = t.get("category").and_then(|v| v.as_str()).unwrap_or("PACING");
                let category_label = t.get("category_label").and_then(|v| v.as_str()).unwrap_or("节奏张力");
                let description = t.get("description").and_then(|v| v.as_str()).unwrap_or_default();
                let before_snippet = t.get("before_snippet").and_then(|v| v.as_str()).unwrap_or_default();
                let after_snippet = t.get("after_snippet").and_then(|v| v.as_str()).unwrap_or_default();
                let applicable_scene = t.get("applicable_scene").and_then(|v| v.as_str()).unwrap_or_default();
                let applied_count = t.get("applied_count").and_then(|v| v.as_i64()).unwrap_or(1);
                let created_at = t.get("created_at").and_then(|v| v.as_str()).unwrap_or(&now_iso);
                let updated_at = t.get("updated_at").and_then(|v| v.as_str()).unwrap_or(&now_iso);

                tx.execute(
                    "INSERT OR REPLACE INTO polish_techniques (id, novel_id, chapter_id, name, category, category_label, description, before_snippet, after_snippet, applicable_scene, applied_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![id, novel_id, chapter_id, name, category, category_label, description, before_snippet, after_snippet, applicable_scene, applied_count, created_at, updated_at],
                )?;
            }
        }

        tx.commit()?;
        info!("Seeded successfully from JSON store!");
        Ok(())
    }

    fn seed_sample_data(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let sample_str = r#"{
            "active_novel_id": "nov-001",
            "novels": {
                "nov-001": {
                    "id": "nov-001",
                    "title": "太虚纪元",
                    "subtitle": "青铜残片现世，天道断绝三万年后的人间绝响",
                    "genre": "修真玄幻 / 仙侠智斗",
                    "target_word_count": 1500000,
                    "current_word_count": 68420,
                    "default_pov": "THIRD_LIMITED",
                    "style_guide": {
                        "tone": "冷峻克制，重智斗博弈，重因果逻辑，严谨无口水话",
                        "pacing": "张弛有度，日常紧扣资源争夺，冲突高潮干净利落",
                        "description_density": "中等偏浓郁",
                        "forbidden_phrases": ["恐怖如斯", "倒吸一口凉气", "桀桀怪笑", "嘴角泛起一抹弧度"]
                    },
                    "created_at": "2026-08-01T08:00:00Z",
                    "updated_at": "2026-09-04T10:30:00Z"
                },
                "nov-002": {
                    "id": "nov-002",
                    "title": "天演寻真录",
                    "subtitle": "",
                    "genre": "仙侠修真 / 天道推演",
                    "target_word_count": 1000000,
                    "current_word_count": 0,
                    "default_pov": "主角视角",
                    "style_guide": {
                        "tone": "节奏紧凑、戏剧性强",
                        "pacing": "张弛有度",
                        "description_density": "适中",
                        "forbidden_phrases": ["恐怖如斯", "倒吸一口凉气"]
                    },
                    "created_at": "2026-09-05T08:00:00Z",
                    "updated_at": "2026-09-05T09:00:00Z"
                }
            },
            "world_settings": {
                "ws-001": {
                    "id": "ws-001",
                    "novel_id": "nov-001",
                    "category": "POWER_SYSTEM",
                    "name": "太虚五境修行法则",
                    "aliases": ["境界体系", "修真法则"],
                    "priority": 100,
                    "tags": ["战力基石", "铁律"],
                    "content": "练气期(1-9层)不可飞行；筑基期真气凝液，可短途腾空；金丹期真元化罡，寿五百载。核心铁律：金丹及以下修士绝不可撕裂空间或瞬移！跨大境界不可逆斩，妄动秘法必遭天道反噬。"
                },
                "ws-002": {
                    "id": "ws-002",
                    "novel_id": "nov-001",
                    "category": "ITEM",
                    "name": "九渊青铜残片（其二）",
                    "aliases": ["青铜片", "古器"],
                    "priority": 95,
                    "tags": ["金手指", "上古禁器"],
                    "content": "林越贴身异宝。特性：推演低阶功法破绽、敛息遮蔽金丹神识探查、中和魔宗血煞毒素。代价：强行推演会导致识海剧痛，短期无法动用神识。"
                },
                "ws-003": {
                    "id": "ws-003",
                    "novel_id": "nov-001",
                    "category": "GEOGRAPHY",
                    "name": "坠星崖",
                    "aliases": ["断魂谷"],
                    "priority": 75,
                    "tags": ["主战场", "险地"],
                    "content": "北域与南岭交界绝壁，罡风呼啸如刀，筑基修士难以御剑腾空，崖底有万年古遗迹与地脉禁制。"
                }
            },
            "characters": {
                "char-001": {
                    "id": "char-001",
                    "novel_id": "nov-001",
                    "name": "林越",
                    "role_type": "PROTAGONIST",
                    "gender": "男",
                    "profile": {
                        "appearance": "青灰道袍，眼神如刀削，深邃内敛，左手食指有厚茧。",
                        "personality_traits": ["极度谨慎", "隐忍坚毅", "杀伐果断", "惜字如金"],
                        "voice_and_tone": "语速平缓低沉，少用反问与感叹句，极少放狠话；面对强敌时惜字如金。",
                        "core_motivation": "追查家族灭门真相，求存长生",
                        "fatal_flaw": "多疑成癖，极难信任同门",
                        "catchphrases": ["事不可为，且退一步。", "拔剑之后，便无退路。"]
                    },
                    "background": "太虚剑宗绝剑峰弟子",
                    "created_at": "2026-08-01T08:00:00Z"
                },
                "char-002": {
                    "id": "char-002",
                    "novel_id": "nov-001",
                    "name": "苏青瑶",
                    "role_type": "SUPPORTING",
                    "gender": "女",
                    "profile": {
                        "appearance": "碧玉水波裙，长发挽剑簪，双眸清澈，英姿飒爽。",
                        "personality_traits": ["聪慧机敏", "外柔内刚", "深明大义"],
                        "voice_and_tone": "清脆利落，行事干脆，对魔门冷冽如霜。",
                        "core_motivation": "登临剑道绝巅，暗查父亲异样",
                        "fatal_flaw": "同门情谊牵绊",
                        "catchphrases": ["绝剑峰的林师兄，倒真是一块捂不热的顽石。"]
                    },
                    "background": "太虚剑宗掌教幼女",
                    "created_at": "2026-08-01T08:00:00Z"
                },
                "char-003": {
                    "id": "char-003",
                    "novel_id": "nov-001",
                    "name": "夜枭",
                    "role_type": "ANTAGONIST",
                    "gender": "男",
                    "profile": {
                        "appearance": "面容苍白俊美，玄黑血纹大氅，腰悬嗜血短刃。",
                        "personality_traits": ["残忍嗜杀", "城府极深", "狂妄自负"],
                        "voice_and_tone": "阴柔居高临下，语调拉长，喜欢在击溃对手前心理施压。",
                        "core_motivation": "抢夺九枚青铜残片，开启血海大阵突破金丹枷锁",
                        "fatal_flaw": "轻视正道年轻一辈",
                        "catchphrases": ["挣扎的蝼蚁，血往往比认命的骨头更甜。"]
                    },
                    "background": "血煞魔宗少主",
                    "created_at": "2026-08-01T08:00:00Z"
                }
            },
            "character_states": [
                {
                    "id": "cs-001",
                    "character_id": "char-001",
                    "chapter_id": "chap-011",
                    "chapter_index": 11,
                    "location": "坠星崖底古溶洞外围",
                    "combat_power": "筑基后期（战力损耗四成）",
                    "health_status": "INJURED",
                    "status_tags": ["左肩贯穿伤", "真元透支", "青铜残片发烫中"],
                    "state_summary": "被魔宗死士透骨钉穿肩，拼死斩杀敌手后负伤遁入溶洞。",
                    "updated_at": "2026-09-04T09:00:00Z"
                }
            ],
            "volumes": {
                "vol-001": {
                    "id": "vol-001",
                    "novel_id": "nov-001",
                    "volume_index": 1,
                    "title": "第一卷：潜龙出渊",
                    "summary": "讲述落魄庶子林越自灭门惨剧后隐忍拜入太虚剑宗...",
                    "main_conflict": "林越持青铜残片在魔宗追杀与宗门暗流中杀出血路",
                    "target_climax": "坠星崖绝地血战，破除死局",
                    "boundary_constraints": "全卷战力严格压制在筑基期至金丹初期",
                    "chapters": [
                        {
                            "id": "chap-011",
                            "volume_id": "vol-001",
                            "novel_id": "nov-001",
                            "chapter_index": 11,
                            "title": "绝壁惊变",
                            "outline": "林越察觉被宗门同道暗算引来魔宗死士...",
                            "pov_character_id": "char-001",
                            "word_count_goal": 3200,
                            "actual_word_count": 3180,
                            "status": "PUBLISHED",
                            "scenes": [
                                {
                                    "id": "sc-11-1",
                                    "chapter_id": "chap-011",
                                    "scene_index": 1,
                                    "scene_goal": "暗中识破伏击，引诱魔宗死士踏入绝灵杀阵",
                                    "conflict": "三名魔宗筑基后期死士手持尸火短刃合围逼近",
                                    "turn_point": "暗中启动三道绝灵困杀阵，出其不意拔剑反杀二人",
                                    "outcome": "斩杀两名死士，但被领头死士以透骨钉刺穿左肩",
                                    "involved_character_ids": ["char-001"],
                                    "location": "坠星崖外围乱石林",
                                    "draft_content": "暮色四合，残阳如血。\n\n林越伏在一块巨大的青黑色风化岩后，屏息凝神，左手掌心紧贴着冰冷的岩面。\n\n四周极其安静，静得只能听见狂风穿过石孔发出的尖锐呼啸。但空气中那一缕微不可察的血腥气与腐尸香，却瞒不过他的感知。\n\n“绝剑峰的探子……动作倒是挺快。”\n\n三名身着血煞魔宗服饰的黑袍修士呈品字形急速穿插，手中短刃吞吐着惨绿色的尸火，直逼林越藏身之所。\n\n林越眼眸低垂，毫无慌乱。他早在半个时辰前便在此地布下了三道‘绝灵困杀阵’。当领头黑袍人踏入石隙阵眼的刹那，林越骤然拔剑！\n\n剑若惊鸿，刺破暮色！",
                                    "agent_notes": "展现林越心思缜密，反杀干脆利落"
                                }
                            ]
                        }
                    ]
                }
            },
            "foreshadowings": {
                "fs-001": {
                    "id": "fs-001",
                    "novel_id": "nov-001",
                    "title": "青铜残片上的逆向铭文",
                    "clue_description": "残片背面刻有一行古篆，文字结构与当代修真界完全相反，疑似远古大荒文字。",
                    "planted_chapter_id": "chap-011",
                    "planted_chapter_index": 11,
                    "planned_resolve_chapter_index": 20,
                    "status": "FERMENTING",
                    "notes": "后续由苏青瑶辨认出属于绝天地通封印铭文"
                }
            }
        }"#;
        let sample_json: Value = serde_json::from_str(sample_str)?;
        self.import_json_store(&sample_json)?;
        Ok(())
    }

    // ----------------- CRUD 核心逻辑 -----------------

    pub fn get_database_status(&self) -> Value {
        let conn = self.conn.lock().unwrap();
        let novels_count: i64 = conn
            .query_row("SELECT count(*) FROM novels", [], |r| r.get(0))
            .unwrap_or(0);

        json!({
            "connected": true,
            "engine": "SQLite3 (Embedded Local-First with WAL Mode)",
            "db_path": self.db_path.to_string_lossy(),
            "wal_enabled": true,
            "novels_count": novels_count
        })
    }

    pub fn list_novels(&self) -> Result<Vec<Novel>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, subtitle, genre, target_word_count, current_word_count, default_pov, style_guide_json, created_at, updated_at FROM novels ORDER BY created_at ASC"
        )?;

        let rows = stmt.query_map([], |row| {
            let style_guide_str: String = row.get(7)?;
            let style_guide: StyleGuide = serde_json::from_str(&style_guide_str).unwrap_or_default();
            Ok(Novel {
                id: row.get(0)?,
                title: row.get(1)?,
                subtitle: row.get(2)?,
                genre: row.get(3)?,
                target_word_count: row.get(4)?,
                current_word_count: row.get(5)?,
                default_pov: row.get(6)?,
                style_guide,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_active_novel_id(&self) -> String {
        if let Ok(env_id) = std::env::var("NOV_ACTIVE_NOVEL_ID") {
            if !env_id.trim().is_empty() {
                return env_id;
            }
        }

        let conn = self.conn.lock().unwrap();
        let res: Result<String, _> = conn.query_row(
            "SELECT val FROM app_state WHERE key = 'active_novel_id'",
            [],
            |r| r.get(0),
        );

        if let Ok(id) = res {
            return id;
        }

        // 回退取第一个小说
        let first_id: Result<String, _> = conn.query_row(
            "SELECT id FROM novels ORDER BY created_at ASC LIMIT 1",
            [],
            |r| r.get(0),
        );

        first_id.unwrap_or_else(|_| "nov-001".to_string())
    }

    pub fn set_active_novel_id(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let exists: i64 = conn.query_row(
            "SELECT count(*) FROM novels WHERE id = ?",
            params![id],
            |r| r.get(0),
        )?;
        if exists == 0 {
            return Ok(false);
        }

        conn.execute(
            "INSERT OR REPLACE INTO app_state (key, val) VALUES ('active_novel_id', ?)",
            params![id],
        )?;
        Ok(true)
    }

    pub fn resolve_novel_id(&self, novel_id_or_title: Option<&str>) -> String {
        let target = match novel_id_or_title {
            Some(s) if !s.trim().is_empty() && s != "active" && s != "current" => s.trim(),
            _ => return self.get_active_novel_id(),
        };

        let conn = self.conn.lock().unwrap();
        // 1. 精确匹配 ID
        let id_match: Result<String, _> = conn.query_row(
            "SELECT id FROM novels WHERE id = ?",
            params![target],
            |r| r.get(0),
        );
        if let Ok(id) = id_match {
            return id;
        }

        // 2. 标题模糊匹配
        let title_match: Result<String, _> = conn.query_row(
            "SELECT id FROM novels WHERE title LIKE ? LIMIT 1",
            params![format!("%{}%", target)],
            |r| r.get(0),
        );
        if let Ok(id) = title_match {
            return id;
        }

        self.get_active_novel_id()
    }

    pub fn get_novel(&self, id: &str) -> Result<Option<Novel>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, title, subtitle, genre, target_word_count, current_word_count, default_pov, style_guide_json, created_at, updated_at FROM novels WHERE id = ?"
        )?;

        let mut rows = stmt.query(params![resolved])?;
        if let Some(row) = rows.next()? {
            let style_guide_str: String = row.get(7)?;
            let style_guide: StyleGuide = serde_json::from_str(&style_guide_str).unwrap_or_default();
            Ok(Some(Novel {
                id: row.get(0)?,
                title: row.get(1)?,
                subtitle: row.get(2)?,
                genre: row.get(3)?,
                target_word_count: row.get(4)?,
                current_word_count: row.get(5)?,
                default_pov: row.get(6)?,
                style_guide,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn create_or_update_novel(&self, mut novel: Novel) -> Result<Novel, rusqlite::Error> {
        let now = Utc::now().to_rfc3339();
        if novel.id.trim().is_empty() {
            novel.id = format!("nov-{}", Utc::now().timestamp_millis());
        }
        if novel.created_at.is_empty() {
            novel.created_at = now.clone();
        }
        novel.updated_at = now;

        let style_guide_str = serde_json::to_string(&novel.style_guide).unwrap_or_else(|_| "{}".to_string());

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO novels (id, title, subtitle, genre, target_word_count, current_word_count, default_pov, style_guide_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                novel.id,
                novel.title,
                novel.subtitle.as_deref().unwrap_or(""),
                novel.genre,
                novel.target_word_count,
                novel.current_word_count,
                novel.default_pov,
                style_guide_str,
                novel.created_at,
                novel.updated_at
            ],
        )?;

        Ok(novel)
    }

    pub fn delete_novel(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM novels WHERE id = ?", params![id])?;
        if rows > 0 {
            // 如果删除的是当前活跃小说，自动重置
            let active: Result<String, _> = conn.query_row(
                "SELECT val FROM app_state WHERE key = 'active_novel_id'",
                [],
                |r| r.get(0),
            );
            if let Ok(active_id) = active {
                if active_id == id {
                    let first_id: Result<String, _> = conn.query_row(
                        "SELECT id FROM novels ORDER BY created_at ASC LIMIT 1",
                        [],
                        |r| r.get(0),
                    );
                    if let Ok(fid) = first_id {
                        let _ = conn.execute(
                            "INSERT OR REPLACE INTO app_state (key, val) VALUES ('active_novel_id', ?)",
                            params![fid],
                        );
                    }
                }
            }
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn get_world_settings(&self, novel_id: &str, category: Option<&str>) -> Result<Vec<WorldSetting>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut sql = "SELECT id, novel_id, category, name, aliases_json, content, priority, tags_json FROM world_settings WHERE novel_id = ?".to_string();
        if category.is_some() {
            sql.push_str(" AND category = ?");
        }
        sql.push_str(" ORDER BY priority DESC");

        let mut stmt = conn.prepare(&sql)?;
        let mut list = Vec::new();

        let process_row = |row: &rusqlite::Row| {
            let aliases_str: String = row.get(4)?;
            let tags_str: String = row.get(7)?;
            Ok(WorldSetting {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                category: row.get(2)?,
                name: row.get(3)?,
                aliases: serde_json::from_str(&aliases_str).unwrap_or_default(),
                content: row.get(5)?,
                priority: row.get(6)?,
                tags: serde_json::from_str(&tags_str).unwrap_or_default(),
            })
        };

        if let Some(cat) = category {
            let rows = stmt.query_map(params![resolved, cat], process_row)?;
            for r in rows {
                list.push(r?);
            }
        } else {
            let rows = stmt.query_map(params![resolved], process_row)?;
            for r in rows {
                list.push(r?);
            }
        }

        Ok(list)
    }

    pub fn query_lore(&self, novel_id: &str, q: &str, category: Option<&str>) -> Result<Vec<Value>, rusqlite::Error> {
        let settings = self.get_world_settings(novel_id, category)?;
        let q_lower = q.to_lowercase();
        let mut scored = Vec::new();

        for s in settings {
            let mut score = 0;
            if s.name.to_lowercase().contains(&q_lower) {
                score += 10;
            }
            for a in &s.aliases {
                if a.to_lowercase().contains(&q_lower) {
                    score += 8;
                }
            }
            if s.content.to_lowercase().contains(&q_lower) {
                score += 5;
            }
            for t in &s.tags {
                if t.to_lowercase().contains(&q_lower) {
                    score += 4;
                }
            }
            for ch in q_lower.chars() {
                if s.name.contains(ch) || s.content.contains(ch) {
                    score += 1;
                }
            }

            if score > 0 {
                scored.push(json!({
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "content": s.content,
                    "score": score
                }));
            }
        }

        scored.sort_by(|a, b| {
            let sa = a.get("score").and_then(|v| v.as_i64()).unwrap_or(0);
            let sb = b.get("score").and_then(|v| v.as_i64()).unwrap_or(0);
            sb.cmp(&sa)
        });

        scored.truncate(5);
        Ok(scored)
    }

    pub fn get_characters(&self, novel_id: &str) -> Result<Vec<Character>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, name, role_type, gender, profile_json, background, created_at FROM characters WHERE novel_id = ? ORDER BY created_at ASC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            let profile_str: String = row.get(5)?;
            let profile: CharacterProfile = serde_json::from_str(&profile_str).unwrap_or_default();
            Ok(Character {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                name: row.get(2)?,
                role_type: row.get(3)?,
                gender: row.get(4)?,
                profile,
                background: row.get(6)?,
                created_at: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_character(&self, id: &str) -> Result<Option<Character>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, name, role_type, gender, profile_json, background, created_at FROM characters WHERE id = ?"
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let profile_str: String = row.get(5)?;
            let profile: CharacterProfile = serde_json::from_str(&profile_str).unwrap_or_default();
            Ok(Some(Character {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                name: row.get(2)?,
                role_type: row.get(3)?,
                gender: row.get(4)?,
                profile,
                background: row.get(6)?,
                created_at: row.get(7)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_character_state_at_chapter(&self, char_id: &str, chapter_index: Option<i64>) -> Result<Option<CharacterState>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let (sql, params_vec): (String, Vec<rusqlite::types::Value>) = match chapter_index {
            Some(idx) if idx > 0 => (
                "SELECT id, character_id, chapter_id, chapter_index, location, combat_power, health_status, status_tags_json, state_summary, updated_at FROM character_states WHERE character_id = ? AND chapter_index <= ? ORDER BY chapter_index DESC LIMIT 1".to_string(),
                vec![char_id.to_string().into(), idx.into()],
            ),
            _ => (
                "SELECT id, character_id, chapter_id, chapter_index, location, combat_power, health_status, status_tags_json, state_summary, updated_at FROM character_states WHERE character_id = ? ORDER BY chapter_index DESC LIMIT 1".to_string(),
                vec![char_id.to_string().into()],
            ),
        };

        let mut stmt = conn.prepare(&sql)?;
        let mut rows = stmt.query(rusqlite::params_from_iter(params_vec))?;
        if let Some(row) = rows.next()? {
            let tags_str: String = row.get(7)?;
            Ok(Some(CharacterState {
                id: row.get(0)?,
                character_id: row.get(1)?,
                chapter_id: row.get(2)?,
                chapter_index: row.get(3)?,
                location: row.get(4)?,
                combat_power: row.get(5)?,
                health_status: row.get(6)?,
                status_tags: serde_json::from_str(&tags_str).unwrap_or_default(),
                state_summary: row.get(8)?,
                updated_at: row.get(9)?,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn update_character_state(&self, req: UpdateCharacterStateRequest) -> Result<CharacterState, rusqlite::Error> {
        let prev = self.get_character_state_at_chapter(&req.character_id, None)?;
        let chap_idx = match req.chapter_index {
            Some(idx) => idx,
            None => {
                let chap = self.get_chapter(&req.chapter_id)?;
                chap.map(|c| c.chapter_index).unwrap_or(1)
            }
        };

        let id = format!("cs-{}", Utc::now().timestamp_millis());
        let location = req.location.or_else(|| prev.as_ref().map(|p| p.location.clone())).unwrap_or_else(|| "场中".to_string());
        let combat_power = req.combat_power.or_else(|| prev.as_ref().map(|p| p.combat_power.clone())).unwrap_or_else(|| "常态".to_string());
        let health_status = req.health_status.or_else(|| prev.as_ref().map(|p| p.health_status.clone())).unwrap_or_else(|| "HEALTHY".to_string());
        let status_tags = req.status_tags.or_else(|| prev.as_ref().map(|p| p.status_tags.clone())).unwrap_or_default();
        let updated_at = Utc::now().to_rfc3339();
        let tags_json = serde_json::to_string(&status_tags).unwrap_or_else(|_| "[]".to_string());

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO character_states (id, character_id, chapter_id, chapter_index, location, combat_power, health_status, status_tags_json, state_summary, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id,
                req.character_id,
                req.chapter_id,
                chap_idx,
                location,
                combat_power,
                health_status,
                tags_json,
                req.state_summary,
                updated_at
            ],
        )?;

        Ok(CharacterState {
            id,
            character_id: req.character_id,
            chapter_id: req.chapter_id,
            chapter_index: chap_idx,
            location,
            combat_power,
            health_status,
            status_tags,
            state_summary: req.state_summary,
            updated_at,
        })
    }

    pub fn get_character_relations(&self, novel_id: &str) -> Result<Vec<CharacterRelation>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, from_character_id, to_character_id, relation_type, affinity_score, description FROM character_relations WHERE novel_id = ?"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            Ok(CharacterRelation {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                from_character_id: row.get(2)?,
                to_character_id: row.get(3)?,
                relation_type: row.get(4)?,
                affinity_score: row.get(5)?,
                description: row.get(6)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn update_character_relation(&self, novel_id: &str, mut rel: CharacterRelation) -> Result<CharacterRelation, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        if rel.id.trim().is_empty() {
            rel.id = format!("rel-{}", Utc::now().timestamp_millis());
        }
        rel.novel_id = resolved;

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO character_relations (id, novel_id, from_character_id, to_character_id, relation_type, affinity_score, description) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![
                rel.id,
                rel.novel_id,
                rel.from_character_id,
                rel.to_character_id,
                rel.relation_type,
                rel.affinity_score,
                rel.description
            ],
        )?;

        Ok(rel)
    }

    pub fn delete_character_relation(&self, relation_id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let rows = conn.execute("DELETE FROM character_relations WHERE id = ?", params![relation_id])?;
        Ok(rows > 0)
    }

    pub fn get_volumes(&self, novel_id: &str) -> Result<Vec<Volume>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut v_stmt = conn.prepare(
            "SELECT id, novel_id, volume_index, title, summary, main_conflict, target_climax, boundary_constraints FROM volumes WHERE novel_id = ? ORDER BY volume_index ASC"
        )?;

        let mut c_stmt = conn.prepare(
            "SELECT id, volume_id, novel_id, chapter_index, title, outline, pov_character_id, word_count_goal, actual_word_count, status FROM chapters WHERE volume_id = ? ORDER BY chapter_index ASC"
        )?;

        let mut s_stmt = conn.prepare(
            "SELECT id, chapter_id, scene_index, scene_goal, conflict, turn_point, outcome, involved_character_ids_json, location, draft_content, agent_notes FROM scenes WHERE chapter_id = ? ORDER BY scene_index ASC"
        )?;

        let v_rows = v_stmt.query_map(params![resolved], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, String>(1)?,
                row.get::<_, i64>(2)?,
                row.get::<_, String>(3)?,
                row.get::<_, Option<String>>(4)?,
                row.get::<_, String>(5)?,
                row.get::<_, String>(6)?,
                row.get::<_, Option<String>>(7)?,
            ))
        })?;

        let mut volumes = Vec::new();
        for v in v_rows {
            let (v_id, n_id, v_idx, v_title, v_summary, v_conflict, v_climax, v_constraints) = v?;

            let c_rows = c_stmt.query_map(params![v_id], |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, i64>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, Option<String>>(6)?,
                    row.get::<_, i64>(7)?,
                    row.get::<_, i64>(8)?,
                    row.get::<_, String>(9)?,
                ))
            })?;

            let mut chapters = Vec::new();
            for c in c_rows {
                let (c_id, c_vid, c_nid, c_idx, c_title, c_outline, c_pov, c_goal, c_actual, c_status) = c?;

                let s_rows = s_stmt.query_map(params![c_id], |row| {
                    let involved_str: String = row.get(7)?;
                    Ok(Scene {
                        id: row.get(0)?,
                        chapter_id: row.get(1)?,
                        scene_index: row.get(2)?,
                        scene_goal: row.get(3)?,
                        conflict: row.get(4)?,
                        turn_point: row.get(5)?,
                        outcome: row.get(6)?,
                        involved_character_ids: serde_json::from_str(&involved_str).unwrap_or_default(),
                        location: row.get(8)?,
                        draft_content: row.get(9)?,
                        agent_notes: row.get(10)?,
                    })
                })?;

                let mut scenes = Vec::new();
                for sc in s_rows {
                    scenes.push(sc?);
                }

                chapters.push(Chapter {
                    id: c_id,
                    volume_id: c_vid,
                    novel_id: c_nid,
                    chapter_index: c_idx,
                    title: c_title,
                    outline: c_outline,
                    pov_character_id: c_pov,
                    word_count_goal: c_goal,
                    actual_word_count: c_actual,
                    status: c_status,
                    scenes,
                });
            }

            volumes.push(Volume {
                id: v_id,
                novel_id: n_id,
                volume_index: v_idx,
                title: v_title,
                summary: v_summary,
                main_conflict: v_conflict,
                target_climax: v_climax,
                boundary_constraints: v_constraints,
                chapters,
            });
        }

        Ok(volumes)
    }

    pub fn get_chapter(&self, chapter_id: &str) -> Result<Option<Chapter>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut c_stmt = conn.prepare(
            "SELECT id, volume_id, novel_id, chapter_index, title, outline, pov_character_id, word_count_goal, actual_word_count, status FROM chapters WHERE id = ?"
        )?;

        let mut rows = c_stmt.query(params![chapter_id])?;
        if let Some(row) = rows.next()? {
            let c_id: String = row.get(0)?;
            let mut s_stmt = conn.prepare(
                "SELECT id, chapter_id, scene_index, scene_goal, conflict, turn_point, outcome, involved_character_ids_json, location, draft_content, agent_notes FROM scenes WHERE chapter_id = ? ORDER BY scene_index ASC"
            )?;

            let s_rows = s_stmt.query_map(params![c_id], |r| {
                let involved_str: String = r.get(7)?;
                Ok(Scene {
                    id: r.get(0)?,
                    chapter_id: r.get(1)?,
                    scene_index: r.get(2)?,
                    scene_goal: r.get(3)?,
                    conflict: r.get(4)?,
                    turn_point: r.get(5)?,
                    outcome: r.get(6)?,
                    involved_character_ids: serde_json::from_str(&involved_str).unwrap_or_default(),
                    location: r.get(8)?,
                    draft_content: r.get(9)?,
                    agent_notes: r.get(10)?,
                })
            })?;

            let mut scenes = Vec::new();
            for s in s_rows {
                scenes.push(s?);
            }

            Ok(Some(Chapter {
                id: c_id,
                volume_id: row.get(1)?,
                novel_id: row.get(2)?,
                chapter_index: row.get(3)?,
                title: row.get(4)?,
                outline: row.get(5)?,
                pov_character_id: row.get(6)?,
                word_count_goal: row.get(7)?,
                actual_word_count: row.get(8)?,
                status: row.get(9)?,
                scenes,
            }))
        } else {
            Ok(None)
        }
    }

    pub fn get_novel_bundle(&self, id: &str) -> Result<Option<Value>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(id));
        let novel = match self.get_novel(&resolved)? {
            Some(n) => n,
            None => return Ok(None),
        };

        let mut volumes = self.get_volumes(&resolved)?;
        if volumes.is_empty() {
            // 自动初始化第一卷第一章第一幕
            let v_id = format!("vol-{}", Utc::now().timestamp_millis());
            let c_id = format!("chap-{}-1", Utc::now().timestamp_millis());
            let s_id = format!("sc-{}-1", Utc::now().timestamp_millis());

            let conn = self.conn.lock().unwrap();
            conn.execute(
                "INSERT INTO volumes (id, novel_id, volume_index, title, summary, main_conflict, target_climax, boundary_constraints) VALUES (?, ?, 1, '第一卷', '', '', '', '')",
                params![v_id, resolved],
            )?;
            conn.execute(
                "INSERT INTO chapters (id, volume_id, novel_id, chapter_index, title, outline, word_count_goal, actual_word_count, status) VALUES (?, ?, ?, 1, '第一章', '', 3000, 0, 'PLANNED')",
                params![c_id, v_id, resolved],
            )?;
            conn.execute(
                "INSERT INTO scenes (id, chapter_id, scene_index, scene_goal, conflict, turn_point, outcome, involved_character_ids_json, location, draft_content, agent_notes) VALUES (?, ?, 1, '起笔开篇', '', '', '', '[]', '', '', '')",
                params![s_id, c_id],
            )?;

            drop(conn);
            volumes = self.get_volumes(&resolved)?;
        }

        let characters = self.get_characters(&resolved)?;
        let character_relations = self.get_character_relations(&resolved)?;
        let world_settings = self.get_world_settings(&resolved, None)?;
        let foreshadowings = self.get_foreshadowings(&resolved, None)?;

        let mut character_states = Vec::new();
        for c in &characters {
            if let Some(st) = self.get_character_state_at_chapter(&c.id, None)? {
                character_states.push(st);
            }
        }

        let active_chap_id = volumes
            .first()
            .and_then(|v| v.chapters.first())
            .map(|c| c.id.clone())
            .unwrap_or_default();

        let is_active = resolved == self.get_active_novel_id();

        Ok(Some(json!({
            "novel": novel,
            "world_settings": world_settings,
            "characters": characters,
            "character_states": character_states,
            "character_relations": character_relations,
            "volumes": volumes,
            "foreshadowings": foreshadowings,
            "versions": [],
            "active_chapter_id": active_chap_id,
            "active_scene_index": 1,
            "is_active": is_active
        })))
    }

    pub fn save_scene_draft(&self, req: SaveSceneDraftRequest) -> Result<Value, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();

        let count: i64 = conn.query_row(
            "SELECT count(*) FROM scenes WHERE chapter_id = ? AND scene_index = ?",
            params![req.chapter_id, req.scene_index],
            |r| r.get(0),
        )?;

        let agent_notes = req.agent_notes.unwrap_or_default();
        if count == 0 {
            let sc_id = format!("sc-{}-{}", req.chapter_id, req.scene_index);
            conn.execute(
                "INSERT INTO scenes (id, chapter_id, scene_index, draft_content, agent_notes) VALUES (?, ?, ?, ?, ?)",
                params![sc_id, req.chapter_id, req.scene_index, req.content, agent_notes],
            )?;
        } else {
            conn.execute(
                "UPDATE scenes SET draft_content = ?, agent_notes = ? WHERE chapter_id = ? AND scene_index = ?",
                params![req.content, agent_notes, req.chapter_id, req.scene_index],
            )?;
        }

        // 更新章节状态为 DRAFTED
        conn.execute(
            "UPDATE chapters SET status = 'DRAFTED' WHERE id = ?",
            params![req.chapter_id],
        )?;

        // 更新小说当前字数
        let word_len = req.content.chars().count() as i64;
        let resolved = self.resolve_novel_id(Some(&req.novel_id));
        conn.execute(
            "UPDATE novels SET current_word_count = current_word_count + ? WHERE id = ?",
            params![word_len, resolved],
        )?;

        let ver_id = format!("ver-{}", Utc::now().timestamp_millis());
        Ok(json!({
            "version_id": ver_id,
            "scene_index": req.scene_index,
            "word_count": word_len,
            "status": "saved"
        }))
    }

    pub fn check_setting_consistency(&self, req: CheckConsistencyRequest) -> Result<Vec<InspectionIssue>, rusqlite::Error> {
        let novel = self.get_novel(&req.novel_id)?;
        let mut issues = Vec::new();
        let draft = &req.draft_text;

        // 1. 战力铁律违背检测
        if draft.contains("撕裂空间") || draft.contains("瞬移") {
            issues.push(InspectionIssue {
                id: "iss-power-01".to_string(),
                issue_type: "SETTING_VIOLATION".to_string(),
                severity: "CRITICAL".to_string(),
                location_snippet: "撕裂空间 / 瞬移".to_string(),
                explanation: "世界观法则严禁筑基期与金丹期撕裂空间，化神期方可半步横渡虚空。此处出现严重战力崩坏越级！".to_string(),
                fix_advice: "建议改为‘身形化作残影，风遁疾驰’。".to_string(),
            });
        }

        // 2. 全书违禁词过滤
        if let Some(n) = &novel {
            for phrase in &n.style_guide.forbidden_phrases {
                if draft.contains(phrase) {
                    issues.push(InspectionIssue {
                        id: format!("iss-phrase-{}", phrase),
                        issue_type: "TYPO".to_string(),
                        severity: "WARNING".to_string(),
                        location_snippet: phrase.clone(),
                        explanation: format!("命中了全书风格指南违禁词【{}】，降低了作品的严谨沉浸感。", phrase),
                        fix_advice: "建议删除此成语，替换为具体动作或心理刻画。".to_string(),
                    });
                }
            }
        }

        // 3. 人设 OOC 检测
        if draft.contains("林越") && (draft.contains("哈哈哈") || draft.contains("受死吧")) {
            issues.push(InspectionIssue {
                id: "iss-ooc-01".to_string(),
                issue_type: "OOC".to_string(),
                severity: "WARNING".to_string(),
                location_snippet: "狂笑或嚣张挑衅".to_string(),
                explanation: "主角林越人设为极度谨慎、隐忍坚毅、惜字如金，绝不发表无意义嚣张言论。".to_string(),
                fix_advice: "修改为冷漠直接拔剑，不发一语。".to_string(),
            });
        }

        // 4. 生理伤势矛盾检测
        if let Ok(Some(st)) = self.get_character_state_at_chapter("char-001", None) {
            let has_shoulder_wound = st.status_tags.iter().any(|t| t.contains("左肩贯穿伤"));
            if has_shoulder_wound && (draft.contains("左手挥剑") || draft.contains("左臂发力")) {
                issues.push(InspectionIssue {
                    id: "iss-wound-01".to_string(),
                    issue_type: "PLOT_HOLE".to_string(),
                    severity: "CRITICAL".to_string(),
                    location_snippet: "左手挥剑 / 左臂发力".to_string(),
                    explanation: "林越在第11章中左肩被透骨钉洞穿，真元封禁，生理上不可能用左臂正常运剑！".to_string(),
                    fix_advice: "修改为‘右手单手持剑，左肩鲜血渗出道袍’。".to_string(),
                });
            }
        }

        Ok(issues)
    }

    pub fn get_foreshadowings(&self, novel_id: &str, status: Option<&str>) -> Result<Vec<Foreshadowing>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut sql = "SELECT id, novel_id, title, clue_description, planted_chapter_id, planted_chapter_index, planned_resolve_chapter_id, planned_resolve_chapter_index, actual_resolved_chapter_id, status, notes FROM foreshadowings WHERE novel_id = ?".to_string();
        if status.is_some() {
            sql.push_str(" AND status = ?");
        }
        sql.push_str(" ORDER BY planted_chapter_index ASC");

        let mut stmt = conn.prepare(&sql)?;
        let mut list = Vec::new();

        let process_row = |row: &rusqlite::Row| {
            Ok(Foreshadowing {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                title: row.get(2)?,
                clue_description: row.get(3)?,
                planted_chapter_id: row.get(4)?,
                planted_chapter_index: row.get(5)?,
                planned_resolve_chapter_id: row.get(6)?,
                planned_resolve_chapter_index: row.get(7)?,
                actual_resolved_chapter_id: row.get(8)?,
                status: row.get(9)?,
                notes: row.get(10)?,
            })
        };

        if let Some(st) = status {
            let rows = stmt.query_map(params![resolved, st], process_row)?;
            for r in rows {
                list.push(r?);
            }
        } else {
            let rows = stmt.query_map(params![resolved], process_row)?;
            for r in rows {
                list.push(r?);
            }
        }

        Ok(list)
    }

    pub fn record_foreshadowing(&self, req: RecordForeshadowingRequest) -> Result<Foreshadowing, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&req.novel_id));
        let id = format!("fs-{}", Utc::now().timestamp_millis());
        let planted_idx = Some(12);
        let planned_idx = req.planned_resolve_chapter_index.or(Some(15));
        let status = "PLANTED".to_string();
        let notes = req.notes.clone();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT INTO foreshadowings (id, novel_id, title, clue_description, planted_chapter_id, planted_chapter_index, planned_resolve_chapter_id, planned_resolve_chapter_index, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                id,
                resolved,
                req.title,
                req.clue_description,
                req.planted_chapter_id,
                planted_idx,
                req.planned_resolve_chapter_id,
                planned_idx,
                status,
                notes.as_deref().unwrap_or("")
            ],
        )?;

        Ok(Foreshadowing {
            id,
            novel_id: resolved,
            title: req.title,
            clue_description: req.clue_description,
            planted_chapter_id: req.planted_chapter_id,
            planted_chapter_index: planted_idx,
            planned_resolve_chapter_id: req.planned_resolve_chapter_id,
            planned_resolve_chapter_index: planned_idx,
            actual_resolved_chapter_id: None,
            status,
            notes,
        })
    }

    pub fn get_polish_techniques(&self, novel_id: &str, category: Option<&str>) -> Result<Vec<PolishTechnique>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut sql = "SELECT id, novel_id, chapter_id, name, category, category_label, description, before_snippet, after_snippet, applicable_scene, applied_count, created_at, updated_at FROM polish_techniques WHERE novel_id = ?".to_string();
        if category.is_some() {
            sql.push_str(" AND (category = ? OR category_label = ?)");
        }
        sql.push_str(" ORDER BY applied_count DESC");

        let mut stmt = conn.prepare(&sql)?;
        let mut list = Vec::new();

        let process_row = |row: &rusqlite::Row| {
            Ok(PolishTechnique {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                chapter_id: row.get(2)?,
                name: row.get(3)?,
                category: row.get(4)?,
                category_label: row.get(5)?,
                description: row.get(6)?,
                before_snippet: row.get(7)?,
                after_snippet: row.get(8)?,
                applicable_scene: row.get(9)?,
                applied_count: row.get(10)?,
                created_at: row.get(11)?,
                updated_at: row.get(12)?,
            })
        };

        if let Some(cat) = category {
            let rows = stmt.query_map(params![resolved, cat, cat], process_row)?;
            for r in rows {
                list.push(r?);
            }
        } else {
            let rows = stmt.query_map(params![resolved], process_row)?;
            for r in rows {
                list.push(r?);
            }
        }

        Ok(list)
    }

    pub fn save_polish_techniques(&self, req: SaveTechniquesRequest) -> Result<Vec<PolishTechnique>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&req.novel_id));
        let conn = self.conn.lock().unwrap();
        let mut saved = Vec::new();
        let now = Utc::now().to_rfc3339();

        for t in req.techniques {
            let name = t.name.trim();
            if name.is_empty() {
                continue;
            }

            let existing_id: Result<String, _> = conn.query_row(
                "SELECT id FROM polish_techniques WHERE novel_id = ? AND name = ?",
                params![resolved, name],
                |r| r.get(0),
            );

            if let Ok(id) = existing_id {
                conn.execute(
                    "UPDATE polish_techniques SET applied_count = applied_count + 1, updated_at = ?, description = COALESCE(NULLIF(?, ''), description), before_snippet = COALESCE(NULLIF(?, ''), before_snippet), after_snippet = COALESCE(NULLIF(?, ''), after_snippet), category = ?, category_label = ? WHERE id = ?",
                    params![
                        now,
                        t.description,
                        t.before_snippet.as_deref().unwrap_or(""),
                        t.after_snippet.as_deref().unwrap_or(""),
                        t.category,
                        t.category_label,
                        id
                    ],
                )?;

                let updated_t = conn.query_row(
                    "SELECT id, novel_id, chapter_id, name, category, category_label, description, before_snippet, after_snippet, applicable_scene, applied_count, created_at, updated_at FROM polish_techniques WHERE id = ?",
                    params![id],
                    |row| {
                        Ok(PolishTechnique {
                            id: row.get(0)?,
                            novel_id: row.get(1)?,
                            chapter_id: row.get(2)?,
                            name: row.get(3)?,
                            category: row.get(4)?,
                            category_label: row.get(5)?,
                            description: row.get(6)?,
                            before_snippet: row.get(7)?,
                            after_snippet: row.get(8)?,
                            applicable_scene: row.get(9)?,
                            applied_count: row.get(10)?,
                            created_at: row.get(11)?,
                            updated_at: row.get(12)?,
                        })
                    },
                )?;
                saved.push(updated_t);
            } else {
                let id = t.id.unwrap_or_else(|| format!("tech-{}-{}", Utc::now().timestamp_millis(), saved.len()));
                let chapter_id = req.chapter_id.clone().or(t.chapter_id);

                conn.execute(
                    "INSERT INTO polish_techniques (id, novel_id, chapter_id, name, category, category_label, description, before_snippet, after_snippet, applicable_scene, applied_count, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![
                        id,
                        resolved,
                        chapter_id,
                        name,
                        t.category,
                        t.category_label,
                        t.description,
                        t.before_snippet.as_deref().unwrap_or(""),
                        t.after_snippet.as_deref().unwrap_or(""),
                        t.applicable_scene.as_deref().unwrap_or(""),
                        1,
                        now,
                        now
                    ],
                )?;

                saved.push(PolishTechnique {
                    id: Some(id),
                    novel_id: Some(resolved.clone()),
                    chapter_id,
                    name: name.to_string(),
                    category: t.category,
                    category_label: t.category_label,
                    description: t.description,
                    before_snippet: t.before_snippet,
                    after_snippet: t.after_snippet,
                    applicable_scene: t.applicable_scene,
                    applied_count: 1,
                    created_at: now.clone(),
                    updated_at: now.clone(),
                });
            }
        }

        Ok(saved)
    }

    pub fn get_polish_techniques_stats(&self, novel_id: &str) -> Result<Value, rusqlite::Error> {
        let techs = self.get_polish_techniques(novel_id, None)?;
        let total_applied: i64 = techs.iter().map(|t| t.applied_count).sum();
        let mut category_dist = std::collections::HashMap::new();

        for t in &techs {
            let cat = if t.category_label.is_empty() {
                "其他".to_string()
            } else {
                t.category_label.clone()
            };
            *category_dist.entry(cat).or_insert(0) += 1;
        }

        let top: Vec<_> = techs.iter().take(5).collect();

        Ok(json!({
            "total_techniques": techs.len(),
            "total_applied_count": total_applied,
            "category_distribution": category_dist,
            "top_techniques": top
        }))
    }

    pub fn save_evaluation(&self, eval: &SelfEvaluationResult) -> Result<(), rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let scores_json = serde_json::to_string(&eval.dimensions).unwrap_or_else(|_| "{}".to_string());
        let strengths_json = serde_json::to_string(&eval.strengths).unwrap_or_else(|_| "[]".to_string());
        let weaknesses_json = serde_json::to_string(&eval.weaknesses).unwrap_or_else(|_| "[]".to_string());
        let refinements_json = serde_json::to_string(&eval.suggested_refinements).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT OR REPLACE INTO self_evaluations (id, novel_id, chapter_id, scene_index, overall_score, scores_json, strengths_json, weaknesses_json, refinements_json, iteration_count, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                eval.id,
                eval.novel_id,
                eval.chapter_id,
                eval.scene_index,
                eval.overall_score,
                scores_json,
                strengths_json,
                weaknesses_json,
                refinements_json,
                eval.iteration_count,
                eval.created_at
            ],
        )?;

        Ok(())
    }

    pub fn list_evaluations(&self, novel_id: Option<&str>, chapter_id: Option<&str>) -> Result<Vec<Value>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut sql = "SELECT id, novel_id, chapter_id, scene_index, overall_score, scores_json, strengths_json, weaknesses_json, refinements_json, iteration_count, created_at FROM self_evaluations WHERE 1=1".to_string();
        let mut params_vec: Vec<rusqlite::types::Value> = Vec::new();

        if let Some(nid) = novel_id {
            sql.push_str(" AND novel_id = ?");
            params_vec.push(nid.to_string().into());
        }
        if let Some(cid) = chapter_id {
            sql.push_str(" AND chapter_id = ?");
            params_vec.push(cid.to_string().into());
        }
        sql.push_str(" ORDER BY created_at DESC LIMIT 50");

        let mut stmt = conn.prepare(&sql)?;
        let rows = stmt.query_map(rusqlite::params_from_iter(params_vec), |row| {
            let scores_str: String = row.get(5)?;
            let strengths_str: String = row.get(6)?;
            let weaknesses_str: String = row.get(7)?;
            let refinements_str: String = row.get(8)?;

            Ok(json!({
                "id": row.get::<_, String>(0)?,
                "novel_id": row.get::<_, String>(1)?,
                "chapter_id": row.get::<_, String>(2)?,
                "scene_index": row.get::<_, i64>(3)?,
                "overall_score": row.get::<_, i64>(4)?,
                "scores": serde_json::from_str::<Value>(&scores_str).unwrap_or(json!({})),
                "strengths": serde_json::from_str::<Value>(&strengths_str).unwrap_or(json!([])),
                "weaknesses": serde_json::from_str::<Value>(&weaknesses_str).unwrap_or(json!([])),
                "refinements": serde_json::from_str::<Value>(&refinements_str).unwrap_or(json!([])),
                "iteration_count": row.get::<_, i64>(9)?,
                "created_at": row.get::<_, String>(10)?,
            }))
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }
}
