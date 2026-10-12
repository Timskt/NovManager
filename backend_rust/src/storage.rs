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

            CREATE TABLE IF NOT EXISTS video_storyboards (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_id TEXT NOT NULL,
                scene_id TEXT NOT NULL,
                title TEXT NOT NULL,
                aspect_ratio TEXT DEFAULT '16:9',
                target_platform TEXT DEFAULT 'SORA',
                total_duration_seconds REAL DEFAULT 0.0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS video_shots (
                id TEXT PRIMARY KEY,
                storyboard_id TEXT NOT NULL,
                scene_id TEXT NOT NULL,
                shot_number INTEGER NOT NULL,
                duration_seconds REAL DEFAULT 5.0,
                shot_type TEXT DEFAULT 'MEDIUM',
                camera_movement TEXT DEFAULT 'STATIC',
                visual_prompt TEXT NOT NULL,
                motion_prompt TEXT DEFAULT '',
                negative_prompt TEXT DEFAULT '',
                lighting TEXT DEFAULT '',
                character_references_json TEXT DEFAULT '[]',
                sound_cue TEXT DEFAULT '',
                dialogue_cue TEXT DEFAULT '',
                created_at TEXT NOT NULL,
                FOREIGN KEY (storyboard_id) REFERENCES video_storyboards(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS workflow_pipelines (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                nodes_json TEXT NOT NULL,
                active_node_id TEXT,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS dungeon_arcs (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                arc_name TEXT NOT NULL,
                location TEXT NOT NULL,
                stage TEXT NOT NULL,
                danger_level INTEGER DEFAULT 5,
                milestone_gates_json TEXT NOT NULL,
                loot_economy_json TEXT NOT NULL,
                survival_rate REAL DEFAULT 0.5,
                created_at TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS gods_eye_states (
                novel_id TEXT PRIMARY KEY,
                current_era TEXT NOT NULL,
                celestial_anomalies TEXT NOT NULL,
                macro_crisis_countdown_days INTEGER DEFAULT 100,
                offscreen_factions_json TEXT NOT NULL,
                global_tension_index REAL DEFAULT 0.5,
                updated_at TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS model_providers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                provider_type TEXT NOT NULL,
                base_url TEXT NOT NULL,
                api_keys_json TEXT NOT NULL,
                active_key_index INTEGER DEFAULT 0,
                supported_models_json TEXT NOT NULL,
                rpm_limit INTEGER DEFAULT 60,
                tpm_limit INTEGER DEFAULT 100000,
                is_enabled INTEGER DEFAULT 1,
                health_status TEXT DEFAULT 'HEALTHY',
                latency_ms INTEGER DEFAULT 0,
                last_checked_at TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS model_role_assignments (
                role TEXT PRIMARY KEY,
                primary_provider_id TEXT NOT NULL,
                primary_model TEXT NOT NULL,
                fallback_provider_id TEXT NOT NULL,
                fallback_model TEXT NOT NULL,
                temperature REAL DEFAULT 0.7,
                top_p REAL DEFAULT 0.9,
                max_tokens INTEGER DEFAULT 4000,
                timeout_ms INTEGER DEFAULT 30000,
                retry_count INTEGER DEFAULT 3
            );

            CREATE TABLE IF NOT EXISTS model_telemetry (
                id TEXT PRIMARY KEY,
                provider_id TEXT NOT NULL,
                model TEXT NOT NULL,
                role TEXT NOT NULL,
                request_type TEXT NOT NULL,
                input_tokens INTEGER DEFAULT 0,
                output_tokens INTEGER DEFAULT 0,
                cost_usd REAL DEFAULT 0.0,
                latency_ms INTEGER DEFAULT 0,
                status_code INTEGER DEFAULT 200,
                error_message TEXT,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS style_dna_profiles (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                author TEXT NOT NULL,
                source_title TEXT DEFAULT '',
                source_url TEXT,
                tags_json TEXT DEFAULT '[]',
                sensory_density REAL DEFAULT 0.5,
                dialogue_ratio REAL DEFAULT 0.3,
                sentence_variance REAL DEFAULT 0.5,
                metaphor_frequency REAL DEFAULT 0.4,
                pacing_velocity REAL DEFAULT 0.6,
                vocabulary_richness REAL DEFAULT 0.7,
                forbidden_cliches_json TEXT DEFAULT '[]',
                golden_exemplars_json TEXT DEFAULT '[]',
                prompt_directive TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS information_asymmetry_items (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                secret_title TEXT NOT NULL,
                reader_knows INTEGER DEFAULT 1,
                protagonist_knows INTEGER DEFAULT 0,
                antagonist_knows INTEGER DEFAULT 0,
                dramatic_irony_score REAL DEFAULT 0.8,
                created_at TEXT DEFAULT '',
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS offscreen_news_events (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                era TEXT NOT NULL,
                region TEXT NOT NULL,
                event_summary TEXT NOT NULL,
                faction_involved TEXT NOT NULL,
                tension_delta REAL DEFAULT 0.0,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS epiphany_sparks (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                spark_type TEXT DEFAULT 'PLOT_TWIST',
                source TEXT DEFAULT 'AUTHOR_BRAINWAVE',
                reader_username TEXT,
                heat_score INTEGER DEFAULT 90,
                status TEXT DEFAULT 'INBOX',
                target_chapter_index INTEGER,
                target_scene_note TEXT,
                ai_weave_advice TEXT,
                tags_json TEXT DEFAULT '[]',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS reader_discussions (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_index INTEGER DEFAULT 1,
                paragraph_snippet TEXT DEFAULT '',
                reader_name TEXT NOT NULL,
                platform TEXT DEFAULT '起点本章说',
                comment_text TEXT NOT NULL,
                likes INTEGER DEFAULT 0,
                sentiment TEXT DEFAULT 'THEORY_CRAFTING',
                extracted_hook TEXT,
                converted_spark_id TEXT,
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS creation_skills (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                source_novel_title TEXT DEFAULT '',
                description TEXT NOT NULL,
                prompt_directive TEXT DEFAULT '',
                example_snippet TEXT DEFAULT '',
                trigger_keywords_json TEXT DEFAULT '[]',
                is_enabled INTEGER DEFAULT 1,
                auto_match_eligible INTEGER DEFAULT 1,
                reused_count INTEGER DEFAULT 1,
                effectiveness_rating INTEGER DEFAULT 92,
                created_at TEXT NOT NULL
            );
            "#,
        )?;

        // Graceful column migrations for existing databases
        let _ = conn.execute("ALTER TABLE dungeon_arcs ADD COLUMN created_at TEXT DEFAULT ''", []);
        let _ = conn.execute("ALTER TABLE gods_eye_states ADD COLUMN updated_at TEXT DEFAULT ''", []);

        Ok(())
    }


    fn maybe_seed_data(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let (novels_count, chars_count, states_count): (i64, i64, i64) = {
            let conn = self.conn.lock().unwrap();
            let nc: i64 = conn.query_row("SELECT count(*) FROM novels", [], |row| row.get(0)).unwrap_or(0);
            let cc: i64 = conn.query_row("SELECT count(*) FROM characters", [], |row| row.get(0)).unwrap_or(0);
            let sc: i64 = conn.query_row("SELECT count(*) FROM character_states", [], |row| row.get(0)).unwrap_or(0);
            (nc, cc, sc)
        };

        if novels_count == 0 || chars_count == 0 || states_count == 0 {
            info!("Database missing seed entities (novels: {}, chars: {}, states: {}). Checking seed sources...", novels_count, chars_count, states_count);
            let candidates = [
                PathBuf::from("data/novel_store.json"),
                PathBuf::from("../backend/data/novel_store.json"),
                PathBuf::from("backend/data/novel_store.json"),
            ];

            let mut imported = false;
            for c in &candidates {
                if c.exists() {
                    if let Ok(content) = fs::read_to_string(c) {
                        if let Ok(val) = serde_json::from_str::<Value>(&content) {
                            info!("Found seed JSON at {:?}, importing...", c);
                            if let Ok(()) = self.import_json_store(&val) {
                                imported = true;
                                break;
                            }
                        }
                    }
                }
            }

            if !imported {
                info!("No valid seed file found, creating built-in sample novels.");
                self.seed_sample_data()?;
            }
        }

        self.maybe_seed_video_and_workflow_data()?;
        self.maybe_seed_enterprise_engines()?;
        self.maybe_seed_sparks_and_skills_data()?;
        Ok(())
    }

    fn maybe_seed_enterprise_engines(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        // 1. Seed Model Providers if empty
        let prov_count: i64 = conn.query_row("SELECT count(*) FROM model_providers", [], |r| r.get(0)).unwrap_or(0);
        if prov_count == 0 {
            let providers = vec![
                (
                    "prov-deepseek",
                    "DeepSeek Official",
                    "DeepSeek",
                    "https://api.deepseek.com/v1",
                    json!(["sk-dsk-live-primary-key", "sk-dsk-backup-pool-key"]).to_string(),
                    0,
                    json!(["deepseek-chat", "deepseek-reasoner"]).to_string(),
                    120,
                    200000,
                    1,
                    "HEALTHY",
                    320,
                    &now,
                ),
                (
                    "prov-claude",
                    "Anthropic Claude",
                    "Anthropic",
                    "https://api.anthropic.com/v1",
                    json!(["sk-ant-live-main-key"]).to_string(),
                    0,
                    json!(["claude-3-7-sonnet-20250219", "claude-3-5-haiku-20241022"]).to_string(),
                    80,
                    160000,
                    1,
                    "HEALTHY",
                    450,
                    &now,
                ),
                (
                    "prov-openai",
                    "OpenAI Platform",
                    "OpenAI",
                    "https://api.openai.com/v1",
                    json!(["sk-proj-prod-primary", "sk-proj-prod-secondary"]).to_string(),
                    0,
                    json!(["gpt-4.5-preview", "gpt-4o", "o3-mini"]).to_string(),
                    100,
                    300000,
                    1,
                    "HEALTHY",
                    380,
                    &now,
                ),
                (
                    "prov-gemini",
                    "Google Gemini Cloud",
                    "Gemini",
                    "https://generativelanguage.googleapis.com/v1beta",
                    json!(["AIzaSyLiveProductionKey"]).to_string(),
                    0,
                    json!(["gemini-2.5-pro", "gemini-2.0-flash"]).to_string(),
                    150,
                    400000,
                    1,
                    "HEALTHY",
                    290,
                    &now,
                ),
                (
                    "prov-siliconflow",
                    "SiliconFlow Matrix",
                    "SiliconFlow",
                    "https://api.siliconflow.cn/v1",
                    json!(["sk-sf-commercial-pool"]).to_string(),
                    0,
                    json!(["Qwen/Qwen2.5-72B-Instruct", "deepseek-ai/DeepSeek-V3"]).to_string(),
                    200,
                    500000,
                    1,
                    "HEALTHY",
                    180,
                    &now,
                ),
                (
                    "prov-ollama",
                    "Local Ollama Cluster",
                    "Ollama",
                    "http://localhost:11434",
                    json!(["local-bearer-token"]).to_string(),
                    0,
                    json!(["qwen2.5:32b", "deepseek-r1:32b", "llama3.3:70b"]).to_string(),
                    9999,
                    9999999,
                    1,
                    "HEALTHY",
                    45,
                    &now,
                ),
            ];

            for p in providers {
                conn.execute(
                    "INSERT OR REPLACE INTO model_providers (id, name, provider_type, base_url, api_keys_json, active_key_index, supported_models_json, rpm_limit, tpm_limit, is_enabled, health_status, latency_ms, last_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![p.0, p.1, p.2, p.3, p.4, p.5, p.6, p.7, p.8, p.9, p.10, p.11, p.12],
                )?;
            }
        }

        // 2. Seed Model Role Assignments if empty
        let role_count: i64 = conn.query_row("SELECT count(*) FROM model_role_assignments", [], |r| r.get(0)).unwrap_or(0);
        if role_count == 0 {
            let roles = vec![
                ("Planner", "prov-deepseek", "deepseek-reasoner", "prov-claude", "claude-3-7-sonnet-20250219", 0.6, 0.95, 8000, 60000, 3),
                ("Drafter", "prov-claude", "claude-3-7-sonnet-20250219", "prov-deepseek", "deepseek-chat", 0.75, 0.9, 6000, 45000, 3),
                ("Stylist", "prov-deepseek", "deepseek-chat", "prov-openai", "gpt-4.5-preview", 0.7, 0.85, 4000, 30000, 2),
                ("Inspector", "prov-gemini", "gemini-2.5-pro", "prov-claude", "claude-3-7-sonnet-20250219", 0.2, 0.8, 4000, 30000, 3),
                ("VideoDirector", "prov-openai", "gpt-4.5-preview", "prov-gemini", "gemini-2.5-pro", 0.6, 0.9, 5000, 40000, 3),
            ];

            for r in roles {
                conn.execute(
                    "INSERT OR REPLACE INTO model_role_assignments (role, primary_provider_id, primary_model, fallback_provider_id, fallback_model, temperature, top_p, max_tokens, timeout_ms, retry_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![r.0, r.1, r.2, r.3, r.4, r.5, r.6, r.7, r.8, r.9],
                )?;
            }
        }

        // 3. Seed Style DNA Profiles if empty
        let dna_count: i64 = conn.query_row("SELECT count(*) FROM style_dna_profiles", [], |r| r.get(0)).unwrap_or(0);
        if dna_count == 0 {
            let profiles = vec![
                (
                    "dna-jinyong",
                    "金庸·儒侠典雅风",
                    "金庸",
                    "《天龙八部》/《笑傲江湖》",
                    Some("https://baike.baidu.com/item/金庸作品集"),
                    json!(["武侠正统", "文白相间", "侠之大者", "传统古典"]).to_string(),
                    0.72,
                    0.42,
                    0.68,
                    0.78,
                    0.55,
                    0.88,
                    json!(["恐怖如斯", "倒吸一口凉气", "桀桀怪笑", "给爷死", "卧槽", "蝼蚁一般"]).to_string(),
                    json!([
                        "红日初升，霞光万道。乔峰勒马山岗，青衫被朔风猎猎吹动，目光如电扫过雁门关外苍茫关山。",
                        "令狐冲长剑斜指，使一招'浪子回头'，剑尖在半空划出半个圆圈，隐隐有风雷之声。"
                    ]).to_string(),
                    "采用金庸武侠文风：语言雅正含蓄，古雅厚重。描写打斗需注重身法招式、内力气度与空间虚实配合，对白讲究礼节分寸与机锋博弈，严禁现代网络口语。",
                    &now,
                ),
                (
                    "dna-cuttlefish",
                    "爱潜水的乌贼·克系蒸汽维多利亚",
                    "爱潜水的乌贼",
                    "《诡秘之主》",
                    Some("https://www.qidian.com/book/1010868264/"),
                    json!(["克苏鲁", "蒸汽朋克", "塔罗会", "非凡序列", "细密铺垫"]).to_string(),
                    0.85,
                    0.35,
                    0.70,
                    0.82,
                    0.48,
                    0.82,
                    json!(["战神回归", "龙王赘婿", "叮！系统觉醒", "打脸狂魔", "一掌拍碎苍穹"]).to_string(),
                    json!([
                        "绯红的月光穿透薄雾，将煤气路灯投射出扭曲拉长的阴影。克莱恩按了按黑色的半高丝绸礼帽，耳畔微不可察的疯狂呓语如潮水般退去。",
                        "灰雾之上，巍峨的青铜长桌在无垠死寂中耸立，二十二张高背椅倒映着古老星辰的斑驳光痕。"
                    ]).to_string(),
                    "仿爱潜水的乌贼《诡秘之主》风格：聚焦维多利亚工业蒸汽与神秘学克苏鲁交织氛围。强调环境细节、衣着质感与心理微动作。非凡战斗注重规则破解与代价制衡，伴随认知污染感。",
                    &now,
                ),
                (
                    "dna-wangyu",
                    "忘语·凡人流古典修仙",
                    "忘语",
                    "《凡人修仙传》",
                    Some("https://www.qidian.com/book/107580/"),
                    json!(["凡人流", "杀伐果断", "步步为营", "古典仙侠", "法宝灵阵"]).to_string(),
                    0.65,
                    0.28,
                    0.55,
                    0.45,
                    0.62,
                    0.75,
                    json!(["圣母心肠", "毫无防备", "强行装逼", "红颜倒贴", "降智反派"]).to_string(),
                    json!([
                        "韩立面无表情，单手一拍储物袋，青竹蜂云剑化作数十道碧绿剑芒呼啸而出，同时足下青元剑芒暴涨，身形已在数十丈外飘退。",
                        "修仙界弱肉强食，稍有不慎便是魂飞魄散之局。他神识微扫，确认方圆百里再无旁人，方才将古修洞府的隐匿禁制重新布下。"
                    ]).to_string(),
                    "仿忘语《凡人修仙传》风格：主角性格沉稳谨慎、杀伐果断、算无遗策。着重刻画修真资源的争夺、法宝功法的相生相克、禁制阵法的严谨推演。对白冷静客套，杜绝热血无脑莽撞。",
                    &now,
                ),
                (
                    "dna-maoni",
                    "猫腻·文青沉郁慢热风",
                    "猫腻",
                    "《将夜》/《间客》/《庆余年》",
                    Some("https://www.qidian.com/book/2083870/"),
                    json!(["文青格调", "家国情怀", "精妙台词", "诗意悲壮", "群像深刻"]).to_string(),
                    0.78,
                    0.45,
                    0.85,
                    0.80,
                    0.42,
                    0.80,
                    json!(["降智反派", "龙傲天无脑横推", "系统叮的一声", "路人震惊体"]).to_string(),
                    json!([
                        "雪落无声。范闲拢着袖子站在台阶上，看着檐下滴落的雨水，轻声说道：这个世界上总有些事情，比生死还要重上那么一点点。",
                        "宁缺握着桑桑冰凉的手，桑桑背着黑色的大铁伞。两人走在清晨空旷的长安朱雀大街上，脚步声清脆，把秋风里的落叶踩得粉碎。"
                    ]).to_string(),
                    "仿猫腻文风：文青气质，抒情意境浓郁。善用白描刻画人物心理与世情百态，行文节奏舒缓克制，注重群像塑造与宿命哲学辩证，高潮爆发时具强烈的情感共鸣与诗意悲壮感。",
                    &now,
                ),
                (
                    "dna-chendong",
                    "辰东·太古玄幻开大合",
                    "辰东",
                    "《遮天》/《完美世界》",
                    Some("https://www.qidian.com/book/1735921/"),
                    json!(["太古洪荒", "大开大合", "九龙拉棺", "万古苍凉", "星河崩碎"]).to_string(),
                    0.88,
                    0.30,
                    0.75,
                    0.85,
                    0.70,
                    0.85,
                    json!(["小家子气", "畏畏缩缩", "斤斤计较一两碎银", "现代口嗨"]).to_string(),
                    json!([
                        "九具庞大的龙尸拉着一口青铜巨棺，自冰冷与黑暗的宇宙深处穿行而来，星河为之颤栗，整片星空都在无声呜咽。",
                        "登天路，踏歌行，弹指遮天！叶凡傲立星空绝巅，万物母气鼎垂落万道玄黄母气，一拳轰碎前方整片浩瀚星海！"
                    ]).to_string(),
                    "仿辰东玄幻风格：大开大合，气势磅礴苍凉，格局浩大无匹。极力渲染太古洪荒、星河帝路、悲壮宿命与无上神战。语言具有史诗厚重感与恢宏画面冲击力。",
                    &now,
                ),
            ];

            for p in profiles {
                conn.execute(
                    "INSERT OR REPLACE INTO style_dna_profiles (id, name, author, source_title, source_url, tags_json, sensory_density, dialogue_ratio, sentence_variance, metaphor_frequency, pacing_velocity, vocabulary_richness, forbidden_cliches_json, golden_exemplars_json, prompt_directive, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![p.0, p.1, p.2, p.3, p.4, p.5, p.6, p.7, p.8, p.9, p.10, p.11, p.12, p.13, p.14, p.15],
                )?;
            }
        }

        // 4. Seed Information Asymmetry Items if empty
        let asym_count: i64 = conn.query_row("SELECT count(*) FROM information_asymmetry_items", [], |r| r.get(0)).unwrap_or(0);
        if asym_count == 0 {
            let items = vec![
                (
                    "asym-001",
                    "nov-001",
                    "林越怀中的青铜残片实为'太虚补天图'核心枢纽，而非普通筑基灵器",
                    1,
                    0,
                    0,
                    0.92,
                    &now,
                ),
                (
                    "asym-002",
                    "nov-001",
                    "太虚剑宗绝剑峰顾玄陵长老暗中与血煞魔宗联手，布下假秘境借刀杀人",
                    1,
                    0,
                    1,
                    0.88,
                    &now,
                ),
                (
                    "asym-003",
                    "nov-001",
                    "坠星崖底潜伏的地煞血蟒神魂已被魔尊残魂寄生夺舍",
                    0,
                    0,
                    1,
                    0.75,
                    &now,
                ),
            ];

            for it in items {
                conn.execute(
                    "INSERT OR REPLACE INTO information_asymmetry_items (id, novel_id, secret_title, reader_knows, protagonist_knows, antagonist_knows, dramatic_irony_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![it.0, it.1, it.2, it.3, it.4, it.5, it.6, it.7],
                )?;
            }
        }

        // 5. Seed Offscreen News Events if empty
        let news_count: i64 = conn.query_row("SELECT count(*) FROM offscreen_news_events", [], |r| r.get(0)).unwrap_or(0);
        if news_count == 0 {
            let events = vec![
                (
                    "news-001",
                    "nov-001",
                    "天道断绝三万年",
                    "南域九疑山",
                    "九疑山古仙遗迹结界松动，百草宗宗主引动地火七十二日开炉炼制九品造化丹，引来三位化神期老怪潜伏环伺。",
                    "百草宗 / 隐世散修",
                    0.15,
                    &now,
                ),
                (
                    "news-002",
                    "nov-001",
                    "天道断绝三万年",
                    "极北冰原玄冥海",
                    "上古玄武冰魄被血煞魔宗副宗主强行抽取，引发八级暴风雪席卷雪原三万里，数万冰原异兽向南迁徙冲击北关防线。",
                    "血煞魔宗 / 北境守夜卫",
                    0.25,
                    &now,
                ),
                (
                    "news-003",
                    "nov-001",
                    "天道断绝三万年",
                    "中州天机阁总坛",
                    "天机阁推演大星盘时七根浑天仪铜柱骤然崩断，阁主吐血闭关前留下一句谶语：'天道有缺，太虚重开，潜龙不在深渊而在绝壁'。",
                    "天机阁 / 太虚剑宗",
                    0.30,
                    &now,
                ),
            ];

            for ev in events {
                conn.execute(
                    "INSERT OR REPLACE INTO offscreen_news_events (id, novel_id, era, region, event_summary, faction_involved, tension_delta, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    params![ev.0, ev.1, ev.2, ev.3, ev.4, ev.5, ev.6, ev.7],
                )?;
            }
        }

        Ok(())
    }

    fn maybe_seed_video_and_workflow_data(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let conn = self.conn.lock().unwrap();

        // 1. Seed video storyboard if empty
        let sb_count: i64 = conn.query_row("SELECT count(*) FROM video_storyboards", [], |r| r.get(0)).unwrap_or(0);
        if sb_count == 0 {
            let sb_id = "sb-001";
            let novel_id = "nov-001";
            let chapter_id = "chap-011";
            let scene_id = "sc-11-1";
            let title = "《太虚纪元》第一幕：绝壁乱石林伏击战";
            let aspect_ratio = "16:9";
            let target_platform = "RUNWAY_GEN3";
            let total_duration = 15.5;
            let now = Utc::now().to_rfc3339();

            conn.execute(
                "INSERT OR REPLACE INTO video_storyboards (id, novel_id, chapter_id, scene_id, title, aspect_ratio, target_platform, total_duration_seconds, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![sb_id, novel_id, chapter_id, scene_id, title, aspect_ratio, target_platform, total_duration, now, now],
            )?;

            let shots = vec![
                (
                    "shot-001-1",
                    sb_id,
                    scene_id,
                    1,
                    4.5,
                    "WIDE",
                    "DOLLY_IN",
                    "Dusk atmosphere, jagged black rocks against blood-red twilight sky. Wind howling across mist-covered canyon of Falling Star Cliff, ancient basalt cliffs with glowing faint spiritual runes.",
                    "Slow push forward through the narrow stone gorge, wind blowing dust and withered grass.",
                    "blurry, cartoon, modern buildings, oversaturated, deformed",
                    "Golden hour rim light from setting sun contrasting with dark shadows of rocky crags",
                    r#"["Lin Yue (char-001)"]"#,
                    "Deep ominous howling canyon wind with distant ethereal bell chimes",
                    "",
                    &now,
                ),
                (
                    "shot-001-2",
                    sb_id,
                    scene_id,
                    2,
                    5.0,
                    "CLOSE_UP",
                    "PAN_RIGHT",
                    "Extreme close-up of Lin Yue's sharp eyes under dark grey Taoist hood. Cold restrained gaze, calm breathing, a bead of cold sweat running down his temple, calloused hand firmly gripping the hilt of his ancient bronze sword.",
                    "Subtle breathing movement, camera pans slowly across his focused eyes to the reflection of approaching enemies in his pupils.",
                    "cross-eyed, trembling, cartoon, soft focus",
                    "Chiaroscuro, high contrast cinematic side light illuminating half his face",
                    r#"["Lin Yue (char-001)"]"#,
                    "Muffled heartbeat slowing down, breath holding",
                    "林越暗忖：绝剑峰的探子……动作倒是挺快。",
                    &now,
                ),
                (
                    "shot-001-3",
                    sb_id,
                    scene_id,
                    3,
                    6.0,
                    "MEDIUM",
                    "TRACKING",
                    "Three black-robed Blood Demon sect assassins moving in triangular formation with corpse-fire daggers glowing pale green. Suddenly spiritual formation arrays flare azure on the ground as Lin Yue draws his sword with blinding silver flash.",
                    "Dynamic fast tracking shot following the sword arc piercing through the twilight, shattering corpse fire in explosive sparks.",
                    "low quality, distorted hands, bad anatomy, jittery",
                    "Explosive blue formation luminescence contrasting with sickly green corpse fire",
                    r#"["Lin Yue (char-001)", "Ye Xiao (char-003) Assassins"]"#,
                    "Sharp metallic sword unsheathing ringing sound, explosive spiritual blast",
                    "",
                    &now,
                ),
            ];

            for s in shots {
                conn.execute(
                    "INSERT OR REPLACE INTO video_shots (id, storyboard_id, scene_id, shot_number, duration_seconds, shot_type, camera_movement, visual_prompt, motion_prompt, negative_prompt, lighting, character_references_json, sound_cue, dialogue_cue, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![s.0, s.1, s.2, s.3, s.4, s.5, s.6, s.7, s.8, s.9, s.10, s.11, s.12, s.13, s.14],
                )?;
            }
        }

        // 2. Seed workflow pipeline if empty
        let pipe_count: i64 = conn.query_row("SELECT count(*) FROM workflow_pipelines", [], |r| r.get(0)).unwrap_or(0);
        if pipe_count == 0 {
            let now = Utc::now().to_rfc3339();
            let nodes = json!([
                {
                    "id": "wf-01",
                    "name": "世界观创生与法则推演",
                    "stage": "WORLD_GENESIS",
                    "status": "COMPLETED",
                    "agent_role": "WorldArchon",
                    "output_summary": "太虚五境修行法则及九渊青铜残片设定已完全固化并完成一致性校验"
                },
                {
                    "id": "wf-02",
                    "name": "卷宗宏观大纲设计",
                    "stage": "OUTLINE",
                    "status": "COMPLETED",
                    "agent_role": "PlotGrandmaster",
                    "output_summary": "第一卷潜龙出渊主线危机及坠星崖绝地血战高潮节拍已确立"
                },
                {
                    "id": "wf-03",
                    "name": "高张力场景节拍细化",
                    "stage": "BEATS",
                    "status": "COMPLETED",
                    "agent_role": "BeatSculptor",
                    "output_summary": "第11章乱石林伏击反杀三段式反转节拍已梳理"
                },
                {
                    "id": "wf-04",
                    "name": "正文深度自迭代草拟",
                    "stage": "DRAFT",
                    "status": "RUNNING",
                    "agent_role": "ProseArtisan",
                    "output_summary": "第11章正文正在结合冷峻克制风格指南执行第三轮润色"
                },
                {
                    "id": "wf-05",
                    "name": "世界观铁律与生理伤势审计",
                    "stage": "CONSISTENCY_AUDIT",
                    "status": "PENDING",
                    "agent_role": "CanonInquisitor",
                    "output_summary": null
                },
                {
                    "id": "wf-06",
                    "name": "AI电影级分镜母本合成",
                    "stage": "VIDEO_STORYBOARD",
                    "status": "PENDING",
                    "agent_role": "CinematicDirector",
                    "output_summary": null
                }
            ]);

            conn.execute(
                "INSERT OR REPLACE INTO workflow_pipelines (id, novel_id, title, nodes_json, active_node_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                params!["pipe-001", "nov-001", "《太虚纪元》创作工程流水线", nodes.to_string(), "wf-04", now],
            )?;
        }

        // 3. Seed gods eye HUD if empty
        let ge_count: i64 = conn.query_row("SELECT count(*) FROM gods_eye_states", [], |r| r.get(0)).unwrap_or(0);
        if ge_count == 0 {
            let now = Utc::now().to_rfc3339();
            let anomalies = json!(["北域妖皇星逆行九度", "天道断绝壁垒暗生裂隙", "血煞魔宗护山大阵异动"]);
            let factions = json!([
                {
                    "faction_name": "血煞魔宗",
                    "leader": "夜枭",
                    "current_plot": "调遣三路死士包围坠星崖，企图夺取林越身上青铜残片",
                    "threat_level": "EXTREME",
                    "distance_km": 12
                },
                {
                    "faction_name": "太虚剑宗绝剑峰",
                    "leader": "顾玄陵长老",
                    "current_plot": "暗中派遣宗门密探探查林越动向，怀疑其私藏上古器物",
                    "threat_level": "MODERATE",
                    "distance_km": 45
                }
            ]);

            conn.execute(
                "INSERT OR REPLACE INTO gods_eye_states (novel_id, current_era, celestial_anomalies, macro_crisis_countdown_days, offscreen_factions_json, global_tension_index, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                params!["nov-001", "天道断绝三万年·末法大劫前夜", anomalies.to_string(), 84, factions.to_string(), 0.88, now],
            )?;
        }

        // 4. Seed dungeon arcs if empty
        let dng_count: i64 = conn.query_row("SELECT count(*) FROM dungeon_arcs", [], |r| r.get(0)).unwrap_or(0);
        if dng_count == 0 {
            let now = Utc::now().to_rfc3339();
            let gates = json!(["突破崖顶罡风绝壁", "破解地脉绝灵困杀阵", "探索万年古溶洞地宫", "镇压狂化地煞血蟒", "开启青铜古门获取太虚真传承"]);
            let loot = json!({
                "guaranteed_drops": ["太阴玄冰髓", "地阶残破阵盘"],
                "potential_artifact": "九渊青铜残片（其二）",
                "risk_multiplier": "1.8x"
            });

            conn.execute(
                "INSERT OR REPLACE INTO dungeon_arcs (id, novel_id, arc_name, location, stage, danger_level, milestone_gates_json, loot_economy_json, survival_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params!["dng-001", "nov-001", "坠星崖底远古神魔遗迹试炼", "坠星崖最深处断魂渊", "MID_CHAMBER", 8, gates.to_string(), loot.to_string(), 0.35, now],
            )?;
        }

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

    // ----------------- Video Storyboard & Cine-AI Repository -----------------

    pub fn list_video_storyboards(&self, novel_id: &str) -> Result<Vec<VideoStoryboard>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, novel_id, chapter_id, scene_id, title, aspect_ratio, target_platform, total_duration_seconds, created_at, updated_at FROM video_storyboards WHERE novel_id = ? ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            Ok(VideoStoryboard {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                chapter_id: row.get(2)?,
                scene_id: row.get(3)?,
                title: row.get(4)?,
                aspect_ratio: row.get(5)?,
                target_platform: row.get(6)?,
                shots: Vec::new(),
                total_duration_seconds: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            })
        })?;

        let mut storyboards = Vec::new();
        for r in rows {
            let mut sb = r?;
            let mut shot_stmt = conn.prepare(
                "SELECT id, scene_id, shot_number, duration_seconds, shot_type, camera_movement, visual_prompt, motion_prompt, negative_prompt, lighting, character_references_json, sound_cue, dialogue_cue, created_at FROM video_shots WHERE storyboard_id = ? ORDER BY shot_number ASC"
            )?;
            let shot_rows = shot_stmt.query_map(params![sb.id], |srow| {
                let refs_str: String = srow.get(10)?;
                Ok(VideoShot {
                    id: srow.get(0)?,
                    scene_id: srow.get(1)?,
                    storyboard_id: Some(sb.id.clone()),
                    shot_number: srow.get(2)?,
                    duration_seconds: srow.get(3)?,
                    shot_type: srow.get(4)?,
                    camera_movement: srow.get(5)?,
                    visual_prompt: srow.get(6)?,
                    motion_prompt: srow.get(7)?,
                    negative_prompt: srow.get(8)?,
                    lighting: srow.get(9)?,
                    character_references: serde_json::from_str(&refs_str).unwrap_or_default(),
                    sound_cue: srow.get(11)?,
                    dialogue_cue: srow.get(12)?,
                    created_at: srow.get(13)?,
                })
            })?;
            for s in shot_rows {
                sb.shots.push(s?);
            }
            if sb.total_duration_seconds == 0.0 && !sb.shots.is_empty() {
                sb.total_duration_seconds = sb.shots.iter().map(|s| s.duration_seconds).sum();
            }
            storyboards.push(sb);
        }

        Ok(storyboards)
    }

    pub fn get_video_storyboard(&self, id: &str) -> Result<Option<VideoStoryboard>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, chapter_id, scene_id, title, aspect_ratio, target_platform, total_duration_seconds, created_at, updated_at FROM video_storyboards WHERE id = ?"
        )?;

        let mut rows = stmt.query(params![id])?;
        if let Some(row) = rows.next()? {
            let mut sb = VideoStoryboard {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                chapter_id: row.get(2)?,
                scene_id: row.get(3)?,
                title: row.get(4)?,
                aspect_ratio: row.get(5)?,
                target_platform: row.get(6)?,
                shots: Vec::new(),
                total_duration_seconds: row.get(7)?,
                created_at: row.get(8)?,
                updated_at: row.get(9)?,
            };

            let mut shot_stmt = conn.prepare(
                "SELECT id, scene_id, shot_number, duration_seconds, shot_type, camera_movement, visual_prompt, motion_prompt, negative_prompt, lighting, character_references_json, sound_cue, dialogue_cue, created_at FROM video_shots WHERE storyboard_id = ? ORDER BY shot_number ASC"
            )?;
            let shot_rows = shot_stmt.query_map(params![id], |srow| {
                let refs_str: String = srow.get(10)?;
                Ok(VideoShot {
                    id: srow.get(0)?,
                    scene_id: srow.get(1)?,
                    storyboard_id: Some(id.to_string()),
                    shot_number: srow.get(2)?,
                    duration_seconds: srow.get(3)?,
                    shot_type: srow.get(4)?,
                    camera_movement: srow.get(5)?,
                    visual_prompt: srow.get(6)?,
                    motion_prompt: srow.get(7)?,
                    negative_prompt: srow.get(8)?,
                    lighting: srow.get(9)?,
                    character_references: serde_json::from_str(&refs_str).unwrap_or_default(),
                    sound_cue: srow.get(11)?,
                    dialogue_cue: srow.get(12)?,
                    created_at: srow.get(13)?,
                })
            })?;
            for s in shot_rows {
                sb.shots.push(s?);
            }
            if sb.total_duration_seconds == 0.0 && !sb.shots.is_empty() {
                sb.total_duration_seconds = sb.shots.iter().map(|s| s.duration_seconds).sum();
            }

            Ok(Some(sb))
        } else {
            Ok(None)
        }
    }

    pub fn create_or_update_video_storyboard(&self, mut sb: VideoStoryboard) -> Result<VideoStoryboard, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&sb.novel_id));
        sb.novel_id = resolved;

        if sb.id.is_empty() {
            sb.id = format!("sb-{}", Utc::now().timestamp_millis());
        }
        let now = Utc::now().to_rfc3339();
        if sb.created_at.is_empty() {
            sb.created_at = now.clone();
        }
        sb.updated_at = now.clone();

        let total_duration: f32 = sb.shots.iter().map(|s| s.duration_seconds).sum();
        if total_duration > 0.0 {
            sb.total_duration_seconds = total_duration;
        }

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO video_storyboards (id, novel_id, chapter_id, scene_id, title, aspect_ratio, target_platform, total_duration_seconds, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![sb.id, sb.novel_id, sb.chapter_id, sb.scene_id, sb.title, sb.aspect_ratio, sb.target_platform, sb.total_duration_seconds, sb.created_at, sb.updated_at],
        )?;

        for shot in &sb.shots {
            let refs_json = serde_json::to_string(&shot.character_references).unwrap_or_else(|_| "[]".to_string());
            let shot_created = if shot.created_at.is_empty() { &now } else { &shot.created_at };
            conn.execute(
                "INSERT OR REPLACE INTO video_shots (id, storyboard_id, scene_id, shot_number, duration_seconds, shot_type, camera_movement, visual_prompt, motion_prompt, negative_prompt, lighting, character_references_json, sound_cue, dialogue_cue, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                params![shot.id, sb.id, shot.scene_id, shot.shot_number, shot.duration_seconds, shot.shot_type, shot.camera_movement, shot.visual_prompt, shot.motion_prompt, shot.negative_prompt, shot.lighting, refs_json, shot.sound_cue, shot.dialogue_cue, shot_created],
            )?;
        }

        Ok(sb)
    }

    pub fn delete_video_storyboard(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let deleted = conn.execute("DELETE FROM video_storyboards WHERE id = ?", params![id])?;
        conn.execute("DELETE FROM video_shots WHERE storyboard_id = ?", params![id])?;
        Ok(deleted > 0)
    }

    pub fn add_video_shot(&self, storyboard_id: &str, mut shot: VideoShot) -> Result<VideoShot, rusqlite::Error> {
        if shot.id.is_empty() {
            shot.id = format!("shot-{}", Utc::now().timestamp_millis());
        }
        let now = Utc::now().to_rfc3339();
        if shot.created_at.is_empty() {
            shot.created_at = now;
        }
        shot.storyboard_id = Some(storyboard_id.to_string());

        let conn = self.conn.lock().unwrap();
        let refs_json = serde_json::to_string(&shot.character_references).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT INTO video_shots (id, storyboard_id, scene_id, shot_number, duration_seconds, shot_type, camera_movement, visual_prompt, motion_prompt, negative_prompt, lighting, character_references_json, sound_cue, dialogue_cue, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![shot.id, storyboard_id, shot.scene_id, shot.shot_number, shot.duration_seconds, shot.shot_type, shot.camera_movement, shot.visual_prompt, shot.motion_prompt, shot.negative_prompt, shot.lighting, refs_json, shot.sound_cue, shot.dialogue_cue, shot.created_at],
        )?;

        let total_dur: f64 = conn.query_row(
            "SELECT COALESCE(SUM(duration_seconds), 0.0) FROM video_shots WHERE storyboard_id = ?",
            params![storyboard_id],
            |r| r.get(0),
        ).unwrap_or(0.0);

        conn.execute(
            "UPDATE video_storyboards SET total_duration_seconds = ?, updated_at = ? WHERE id = ?",
            params![total_dur, Utc::now().to_rfc3339(), storyboard_id],
        )?;

        Ok(shot)
    }

    pub fn update_video_shot(&self, shot: VideoShot) -> Result<Option<VideoShot>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let sb_id: Option<String> = conn.query_row(
            "SELECT storyboard_id FROM video_shots WHERE id = ?",
            params![shot.id],
            |r| r.get(0),
        ).ok();

        let target_sb_id = match (&shot.storyboard_id, &sb_id) {
            (Some(s), _) => s.clone(),
            (None, Some(s)) => s.clone(),
            _ => return Ok(None),
        };

        let refs_json = serde_json::to_string(&shot.character_references).unwrap_or_else(|_| "[]".to_string());

        let rows_affected = conn.execute(
            "UPDATE video_shots SET scene_id = ?, shot_number = ?, duration_seconds = ?, shot_type = ?, camera_movement = ?, visual_prompt = ?, motion_prompt = ?, negative_prompt = ?, lighting = ?, character_references_json = ?, sound_cue = ?, dialogue_cue = ? WHERE id = ?",
            params![shot.scene_id, shot.shot_number, shot.duration_seconds, shot.shot_type, shot.camera_movement, shot.visual_prompt, shot.motion_prompt, shot.negative_prompt, shot.lighting, refs_json, shot.sound_cue, shot.dialogue_cue, shot.id],
        )?;

        if rows_affected > 0 {
            let total_dur: f64 = conn.query_row(
                "SELECT COALESCE(SUM(duration_seconds), 0.0) FROM video_shots WHERE storyboard_id = ?",
                params![target_sb_id],
                |r| r.get(0),
            ).unwrap_or(0.0);

            conn.execute(
                "UPDATE video_storyboards SET total_duration_seconds = ?, updated_at = ? WHERE id = ?",
                params![total_dur, Utc::now().to_rfc3339(), target_sb_id],
            )?;

            let mut res = shot;
            res.storyboard_id = Some(target_sb_id);
            Ok(Some(res))
        } else {
            Ok(None)
        }
    }

    pub fn delete_video_shot(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let sb_id: Option<String> = conn.query_row(
            "SELECT storyboard_id FROM video_shots WHERE id = ?",
            params![id],
            |r| r.get(0),
        ).ok();

        let rows_affected = conn.execute("DELETE FROM video_shots WHERE id = ?", params![id])?;
        if rows_affected > 0 {
            if let Some(target_sb_id) = sb_id {
                let total_dur: f64 = conn.query_row(
                    "SELECT COALESCE(SUM(duration_seconds), 0.0) FROM video_shots WHERE storyboard_id = ?",
                    params![target_sb_id],
                    |r| r.get(0),
                ).unwrap_or(0.0);

                conn.execute(
                    "UPDATE video_storyboards SET total_duration_seconds = ?, updated_at = ? WHERE id = ?",
                    params![total_dur, Utc::now().to_rfc3339(), target_sb_id],
                )?;
            }
            Ok(true)
        } else {
            Ok(false)
        }
    }

    // ----------------- Workflow Pipeline Repository -----------------

    pub fn get_workflow_pipeline(&self, novel_id: &str) -> Result<WorkflowPipeline, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, novel_id, title, nodes_json, active_node_id, updated_at FROM workflow_pipelines WHERE novel_id = ? ORDER BY updated_at DESC LIMIT 1"
        )?;

        let mut rows = stmt.query(params![resolved])?;
        if let Some(row) = rows.next()? {
            let nodes_str: String = row.get(3)?;
            let nodes: Vec<WorkflowNode> = serde_json::from_str(&nodes_str).unwrap_or_default();
            Ok(WorkflowPipeline {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                title: row.get(2)?,
                nodes,
                active_node_id: row.get(4)?,
                updated_at: row.get(5)?,
            })
        } else {
            let now = Utc::now().to_rfc3339();
            let default_nodes = vec![
                WorkflowNode { id: "wf-01".to_string(), name: "世界观创生与法则推演".to_string(), stage: "WORLD_GENESIS".to_string(), status: "COMPLETED".to_string(), agent_role: "WorldArchon".to_string(), output_summary: Some("世界观与战力法则已推演".to_string()) },
                WorkflowNode { id: "wf-02".to_string(), name: "卷宗宏观大纲设计".to_string(), stage: "OUTLINE".to_string(), status: "COMPLETED".to_string(), agent_role: "PlotGrandmaster".to_string(), output_summary: Some("卷宗高潮冲突结构已锁定".to_string()) },
                WorkflowNode { id: "wf-03".to_string(), name: "高张力场景节拍细化".to_string(), stage: "BEATS".to_string(), status: "COMPLETED".to_string(), agent_role: "BeatSculptor".to_string(), output_summary: Some("场景起伏与情节点已排布".to_string()) },
                WorkflowNode { id: "wf-04".to_string(), name: "正文深度自迭代草拟".to_string(), stage: "DRAFT".to_string(), status: "RUNNING".to_string(), agent_role: "ProseArtisan".to_string(), output_summary: Some("正文撰写中".to_string()) },
                WorkflowNode { id: "wf-05".to_string(), name: "世界观铁律与生理伤势审计".to_string(), stage: "CONSISTENCY_AUDIT".to_string(), status: "PENDING".to_string(), agent_role: "CanonInquisitor".to_string(), output_summary: None },
                WorkflowNode { id: "wf-06".to_string(), name: "AI电影级分镜母本合成".to_string(), stage: "VIDEO_STORYBOARD".to_string(), status: "PENDING".to_string(), agent_role: "CinematicDirector".to_string(), output_summary: None },
            ];
            let pipeline = WorkflowPipeline {
                id: format!("pipe-{}", Utc::now().timestamp_millis()),
                novel_id: resolved.clone(),
                title: "智能小说创作工作流".to_string(),
                nodes: default_nodes,
                active_node_id: Some("wf-04".to_string()),
                updated_at: now.clone(),
            };
            let nodes_json = serde_json::to_string(&pipeline.nodes).unwrap_or_else(|_| "[]".to_string());
            conn.execute(
                "INSERT OR REPLACE INTO workflow_pipelines (id, novel_id, title, nodes_json, active_node_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                params![pipeline.id, pipeline.novel_id, pipeline.title, nodes_json, pipeline.active_node_id, pipeline.updated_at],
            )?;
            Ok(pipeline)
        }
    }

    pub fn save_workflow_pipeline(&self, mut pipeline: WorkflowPipeline) -> Result<WorkflowPipeline, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&pipeline.novel_id));
        pipeline.novel_id = resolved;
        if pipeline.id.is_empty() {
            pipeline.id = format!("pipe-{}", Utc::now().timestamp_millis());
        }
        pipeline.updated_at = Utc::now().to_rfc3339();

        let conn = self.conn.lock().unwrap();
        let nodes_json = serde_json::to_string(&pipeline.nodes).unwrap_or_else(|_| "[]".to_string());
        conn.execute(
            "INSERT OR REPLACE INTO workflow_pipelines (id, novel_id, title, nodes_json, active_node_id, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            params![pipeline.id, pipeline.novel_id, pipeline.title, nodes_json, pipeline.active_node_id, pipeline.updated_at],
        )?;

        Ok(pipeline)
    }

    pub fn advance_workflow_step(
        &self,
        novel_id: &str,
        node_id: Option<&str>,
        new_status: Option<&str>,
        output_summary: Option<&str>,
        agent_role: Option<&str>,
    ) -> Result<WorkflowPipeline, rusqlite::Error> {
        let mut pipeline = self.get_workflow_pipeline(novel_id)?;

        let target_node_id = node_id
            .map(|s| s.to_string())
            .or_else(|| pipeline.active_node_id.clone())
            .unwrap_or_else(|| "wf-01".to_string());

        let mut node_idx_opt = None;
        for (i, node) in pipeline.nodes.iter_mut().enumerate() {
            if node.id == target_node_id {
                if let Some(st) = new_status {
                    node.status = st.to_string();
                } else {
                    node.status = "COMPLETED".to_string();
                }
                if let Some(sum) = output_summary {
                    node.output_summary = Some(sum.to_string());
                }
                if let Some(role) = agent_role {
                    node.agent_role = role.to_string();
                }
                node_idx_opt = Some(i);
                break;
            }
        }

        if let Some(idx) = node_idx_opt {
            if pipeline.nodes[idx].status == "COMPLETED" {
                if let Some(next_node) = pipeline.nodes.iter_mut().skip(idx + 1).find(|n| n.status != "COMPLETED") {
                    if next_node.status == "PENDING" {
                        next_node.status = "RUNNING".to_string();
                    }
                    pipeline.active_node_id = Some(next_node.id.clone());
                }
            }
        }

        self.save_workflow_pipeline(pipeline)
    }

    // ----------------- GodsEye State Repository -----------------

    pub fn get_gods_eye_state(&self, novel_id: &str) -> Result<GodsEyeState, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT novel_id, current_era, celestial_anomalies, macro_crisis_countdown_days, offscreen_factions_json, global_tension_index, updated_at FROM gods_eye_states WHERE novel_id = ?"
        )?;

        let mut rows = stmt.query(params![resolved])?;
        if let Some(row) = rows.next()? {
            let anomalies_str: String = row.get(2)?;
            let factions_str: String = row.get(4)?;
            let anomalies = serde_json::from_str(&anomalies_str).unwrap_or_else(|_| {
                if anomalies_str.is_empty() {
                    vec![]
                } else {
                    vec![anomalies_str]
                }
            });
            Ok(GodsEyeState {
                novel_id: row.get(0)?,
                current_era: row.get(1)?,
                celestial_anomalies: anomalies,
                macro_crisis_countdown_days: row.get(3)?,
                offscreen_factions: serde_json::from_str(&factions_str).unwrap_or_default(),
                global_tension_index: row.get(5)?,
                updated_at: row.get(6)?,
            })
        } else {
            let now = Utc::now().to_rfc3339();
            let state = GodsEyeState {
                novel_id: resolved.clone(),
                current_era: "太虚断纪·天道初变".to_string(),
                celestial_anomalies: vec!["妖皇星现世".to_string(), "灵气暗流涌动".to_string()],
                macro_crisis_countdown_days: 100,
                offscreen_factions: vec![json!({"faction": "暗流魔道", "threat": "HIGH"})],
                global_tension_index: 0.75,
                updated_at: now.clone(),
            };
            let anomalies_json = serde_json::to_string(&state.celestial_anomalies).unwrap_or_else(|_| "[]".to_string());
            let factions_json = serde_json::to_string(&state.offscreen_factions).unwrap_or_else(|_| "[]".to_string());
            conn.execute(
                "INSERT OR REPLACE INTO gods_eye_states (novel_id, current_era, celestial_anomalies, macro_crisis_countdown_days, offscreen_factions_json, global_tension_index, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                params![state.novel_id, state.current_era, anomalies_json, state.macro_crisis_countdown_days, factions_json, state.global_tension_index, now],
            )?;
            Ok(state)
        }
    }

    pub fn save_gods_eye_state(&self, mut state: GodsEyeState) -> Result<GodsEyeState, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&state.novel_id));
        state.novel_id = resolved;
        let now = Utc::now().to_rfc3339();
        state.updated_at = now.clone();

        let conn = self.conn.lock().unwrap();
        let anomalies_json = serde_json::to_string(&state.celestial_anomalies).unwrap_or_else(|_| "[]".to_string());
        let factions_json = serde_json::to_string(&state.offscreen_factions).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT OR REPLACE INTO gods_eye_states (novel_id, current_era, celestial_anomalies, macro_crisis_countdown_days, offscreen_factions_json, global_tension_index, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            params![state.novel_id, state.current_era, anomalies_json, state.macro_crisis_countdown_days, factions_json, state.global_tension_index, now],
        )?;

        Ok(state)
    }

    // ----------------- Dungeon Arcs Repository -----------------

    pub fn list_dungeon_arcs(&self, novel_id: &str) -> Result<Vec<DungeonArc>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();

        let mut stmt = conn.prepare(
            "SELECT id, novel_id, arc_name, location, stage, danger_level, milestone_gates_json, loot_economy_json, survival_rate, created_at FROM dungeon_arcs WHERE novel_id = ? ORDER BY danger_level DESC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            let gates_str: String = row.get(6)?;
            let loot_str: String = row.get(7)?;
            Ok(DungeonArc {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                arc_name: row.get(2)?,
                location: row.get(3)?,
                stage: row.get(4)?,
                danger_level: row.get(5)?,
                milestone_gates: serde_json::from_str(&gates_str).unwrap_or_default(),
                loot_economy: serde_json::from_str(&loot_str).unwrap_or(json!({})),
                survival_rate: row.get(8)?,
                created_at: row.get(9)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn create_or_update_dungeon_arc(&self, mut arc: DungeonArc) -> Result<DungeonArc, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&arc.novel_id));
        arc.novel_id = resolved;
        if arc.id.is_empty() {
            arc.id = format!("dng-{}", Utc::now().timestamp_millis());
        }
        if arc.created_at.is_empty() {
            arc.created_at = Utc::now().to_rfc3339();
        }

        let conn = self.conn.lock().unwrap();
        let gates_json = serde_json::to_string(&arc.milestone_gates).unwrap_or_else(|_| "[]".to_string());
        let loot_json = serde_json::to_string(&arc.loot_economy).unwrap_or_else(|_| "{}".to_string());

        conn.execute(
            "INSERT OR REPLACE INTO dungeon_arcs (id, novel_id, arc_name, location, stage, danger_level, milestone_gates_json, loot_economy_json, survival_rate, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![arc.id, arc.novel_id, arc.arc_name, arc.location, arc.stage, arc.danger_level, gates_json, loot_json, arc.survival_rate, arc.created_at],
        )?;

        Ok(arc)
    }

    // ----------------- Model Provider & Router Repository -----------------

    pub fn list_model_providers(&self) -> Result<Vec<ModelProvider>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, provider_type, base_url, api_keys_json, active_key_index, supported_models_json, rpm_limit, tpm_limit, is_enabled, health_status, latency_ms, last_checked_at FROM model_providers ORDER BY id ASC"
        )?;

        let rows = stmt.query_map([], |row| {
            let keys_str: String = row.get(4)?;
            let models_str: String = row.get(6)?;
            let active_idx: i64 = row.get(5)?;
            let rpm: i64 = row.get(7)?;
            let tpm: i64 = row.get(8)?;
            let enabled: i64 = row.get(9)?;
            let latency: i64 = row.get(11)?;

            Ok(ModelProvider {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                base_url: row.get(3)?,
                api_keys: serde_json::from_str(&keys_str).unwrap_or_default(),
                active_key_index: active_idx as usize,
                supported_models: serde_json::from_str(&models_str).unwrap_or_default(),
                rpm_limit: rpm as u32,
                tpm_limit: tpm as u32,
                is_enabled: enabled != 0,
                health_status: row.get(10)?,
                latency_ms: latency as u64,
                last_checked_at: row.get(12)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_model_provider(&self, id: &str) -> Result<Option<ModelProvider>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, provider_type, base_url, api_keys_json, active_key_index, supported_models_json, rpm_limit, tpm_limit, is_enabled, health_status, latency_ms, last_checked_at FROM model_providers WHERE id = ?"
        )?;

        let mut rows = stmt.query_map(params![id], |row| {
            let keys_str: String = row.get(4)?;
            let models_str: String = row.get(6)?;
            let active_idx: i64 = row.get(5)?;
            let rpm: i64 = row.get(7)?;
            let tpm: i64 = row.get(8)?;
            let enabled: i64 = row.get(9)?;
            let latency: i64 = row.get(11)?;

            Ok(ModelProvider {
                id: row.get(0)?,
                name: row.get(1)?,
                provider_type: row.get(2)?,
                base_url: row.get(3)?,
                api_keys: serde_json::from_str(&keys_str).unwrap_or_default(),
                active_key_index: active_idx as usize,
                supported_models: serde_json::from_str(&models_str).unwrap_or_default(),
                rpm_limit: rpm as u32,
                tpm_limit: tpm as u32,
                is_enabled: enabled != 0,
                health_status: row.get(10)?,
                latency_ms: latency as u64,
                last_checked_at: row.get(12)?,
            })
        })?;

        if let Some(res) = rows.next() {
            Ok(Some(res?))
        } else {
            Ok(None)
        }
    }

    pub fn create_or_update_model_provider(&self, mut provider: ModelProvider) -> Result<ModelProvider, rusqlite::Error> {
        if provider.id.is_empty() {
            provider.id = format!("prov-{}", Utc::now().timestamp_millis());
        }
        if provider.last_checked_at.is_empty() {
            provider.last_checked_at = Utc::now().to_rfc3339();
        }

        let conn = self.conn.lock().unwrap();
        let keys_json = serde_json::to_string(&provider.api_keys).unwrap_or_else(|_| "[]".to_string());
        let models_json = serde_json::to_string(&provider.supported_models).unwrap_or_else(|_| "[]".to_string());
        let enabled_val: i64 = if provider.is_enabled { 1 } else { 0 };

        conn.execute(
            "INSERT OR REPLACE INTO model_providers (id, name, provider_type, base_url, api_keys_json, active_key_index, supported_models_json, rpm_limit, tpm_limit, is_enabled, health_status, latency_ms, last_checked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                provider.id,
                provider.name,
                provider.provider_type,
                provider.base_url,
                keys_json,
                provider.active_key_index as i64,
                models_json,
                provider.rpm_limit as i64,
                provider.tpm_limit as i64,
                enabled_val,
                provider.health_status,
                provider.latency_ms as i64,
                provider.last_checked_at
            ],
        )?;

        Ok(provider)
    }

    pub fn delete_model_provider(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute("DELETE FROM model_providers WHERE id = ?", params![id])?;
        Ok(affected > 0)
    }

    // ----------------- Model Role Assignments Repository -----------------

    pub fn list_model_role_assignments(&self) -> Result<Vec<ModelRoleAssignment>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT role, primary_provider_id, primary_model, fallback_provider_id, fallback_model, temperature, top_p, max_tokens, timeout_ms, retry_count FROM model_role_assignments ORDER BY role ASC"
        )?;

        let rows = stmt.query_map([], |row| {
            let temp: f64 = row.get(5)?;
            let top_p: f64 = row.get(6)?;
            let max_tokens: i64 = row.get(7)?;
            let timeout_ms: i64 = row.get(8)?;
            let retry_count: i64 = row.get(9)?;

            Ok(ModelRoleAssignment {
                role: row.get(0)?,
                primary_provider_id: row.get(1)?,
                primary_model: row.get(2)?,
                fallback_provider_id: row.get(3)?,
                fallback_model: row.get(4)?,
                temperature: temp as f32,
                top_p: top_p as f32,
                max_tokens: max_tokens as u32,
                timeout_ms: timeout_ms as u64,
                retry_count: retry_count as u32,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_model_role_assignment(&self, role: &str) -> Result<Option<ModelRoleAssignment>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT role, primary_provider_id, primary_model, fallback_provider_id, fallback_model, temperature, top_p, max_tokens, timeout_ms, retry_count FROM model_role_assignments WHERE role = ?"
        )?;

        let mut rows = stmt.query_map(params![role], |row| {
            let temp: f64 = row.get(5)?;
            let top_p: f64 = row.get(6)?;
            let max_tokens: i64 = row.get(7)?;
            let timeout_ms: i64 = row.get(8)?;
            let retry_count: i64 = row.get(9)?;

            Ok(ModelRoleAssignment {
                role: row.get(0)?,
                primary_provider_id: row.get(1)?,
                primary_model: row.get(2)?,
                fallback_provider_id: row.get(3)?,
                fallback_model: row.get(4)?,
                temperature: temp as f32,
                top_p: top_p as f32,
                max_tokens: max_tokens as u32,
                timeout_ms: timeout_ms as u64,
                retry_count: retry_count as u32,
            })
        })?;

        if let Some(res) = rows.next() {
            Ok(Some(res?))
        } else {
            Ok(None)
        }
    }

    pub fn save_model_role_assignment(&self, assignment: ModelRoleAssignment) -> Result<ModelRoleAssignment, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO model_role_assignments (role, primary_provider_id, primary_model, fallback_provider_id, fallback_model, temperature, top_p, max_tokens, timeout_ms, retry_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                assignment.role,
                assignment.primary_provider_id,
                assignment.primary_model,
                assignment.fallback_provider_id,
                assignment.fallback_model,
                assignment.temperature as f64,
                assignment.top_p as f64,
                assignment.max_tokens as i64,
                assignment.timeout_ms as i64,
                assignment.retry_count as i64,
            ],
        )?;
        Ok(assignment)
    }

    // ----------------- Model Telemetry & Fallback Simulation -----------------

    pub fn record_model_telemetry(&self, mut t: ModelTelemetry) -> Result<ModelTelemetry, rusqlite::Error> {
        if t.id.is_empty() {
            t.id = format!("tel-{}", Utc::now().timestamp_millis());
        }
        if t.timestamp.is_empty() {
            t.timestamp = Utc::now().to_rfc3339();
        }

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO model_telemetry (id, provider_id, model, role, request_type, input_tokens, output_tokens, cost_usd, latency_ms, status_code, error_message, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                t.id,
                t.provider_id,
                t.model,
                t.role,
                t.request_type,
                t.input_tokens as i64,
                t.output_tokens as i64,
                t.cost_usd,
                t.latency_ms as i64,
                t.status_code as i64,
                t.error_message,
                t.timestamp,
            ],
        )?;
        Ok(t)
    }

    pub fn list_model_telemetry(&self, limit: Option<usize>) -> Result<Vec<ModelTelemetry>, rusqlite::Error> {
        let lim = limit.unwrap_or(100).min(500) as i64;
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, provider_id, model, role, request_type, input_tokens, output_tokens, cost_usd, latency_ms, status_code, error_message, timestamp FROM model_telemetry ORDER BY timestamp DESC LIMIT ?"
        )?;

        let rows = stmt.query_map(params![lim], |row| {
            let in_tok: i64 = row.get(5)?;
            let out_tok: i64 = row.get(6)?;
            let cost: f64 = row.get(7)?;
            let lat: i64 = row.get(8)?;
            let status: i64 = row.get(9)?;

            Ok(ModelTelemetry {
                id: row.get(0)?,
                provider_id: row.get(1)?,
                model: row.get(2)?,
                role: row.get(3)?,
                request_type: row.get(4)?,
                input_tokens: in_tok as u32,
                output_tokens: out_tok as u32,
                cost_usd: cost,
                latency_ms: lat as u64,
                status_code: status as u16,
                error_message: row.get(10)?,
                timestamp: row.get(11)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn simulate_model_fallback(&self, req: FallbackSimulateRequest) -> Result<FallbackSimulateResponse, Box<dyn std::error::Error + Send + Sync>> {
        let assignment = self.get_model_role_assignment(&req.role)?
            .unwrap_or_else(|| ModelRoleAssignment {
                role: req.role.clone(),
                primary_provider_id: "prov-deepseek".to_string(),
                primary_model: "deepseek-reasoner".to_string(),
                fallback_provider_id: "prov-claude".to_string(),
                fallback_model: "claude-3-7-sonnet-20250219".to_string(),
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 4000,
                timeout_ms: 30000,
                retry_count: 3,
            });

        let primary_opt = self.get_model_provider(&assignment.primary_provider_id)?;
        let fallback_opt = self.get_model_provider(&assignment.fallback_provider_id)?;

        let primary_name = primary_opt.as_ref().map(|p| p.name.clone()).unwrap_or_else(|| assignment.primary_provider_id.clone());
        let fallback_name = fallback_opt.as_ref().map(|p| p.name.clone()).unwrap_or_else(|| assignment.fallback_provider_id.clone());

        let p_lat = primary_opt.as_ref().map(|p| p.latency_ms).unwrap_or(320);
        let f_lat = fallback_opt.as_ref().map(|p| p.latency_ms).unwrap_or(450);

        let status_code = req.simulate_status_code.unwrap_or(200);
        let prompt_tokens = req.prompt_tokens.unwrap_or(1500);

        if status_code == 429 || status_code >= 400 {
            // Record failure telemetry for primary
            let _ = self.record_model_telemetry(ModelTelemetry {
                id: format!("tel-fail-{}", Utc::now().timestamp_millis()),
                provider_id: assignment.primary_provider_id.clone(),
                model: assignment.primary_model.clone(),
                role: req.role.clone(),
                request_type: "REASONING".to_string(),
                input_tokens: prompt_tokens,
                output_tokens: 0,
                cost_usd: 0.0,
                latency_ms: p_lat,
                status_code,
                error_message: Some(format!("HTTP {} Rate limit/Quota exhausted on provider '{}'", status_code, primary_name)),
                timestamp: Utc::now().to_rfc3339(),
            });

            // Rotate key or trip circuit breaker on primary provider
            if let Some(mut p) = primary_opt {
                if !p.api_keys.is_empty() {
                    p.active_key_index = (p.active_key_index + 1) % p.api_keys.len();
                }
                p.health_status = "RATE_LIMITED".to_string();
                let _ = self.create_or_update_model_provider(p);
            }

            // Record success telemetry on fallback
            let _ = self.record_model_telemetry(ModelTelemetry {
                id: format!("tel-fall-{}", Utc::now().timestamp_millis()),
                provider_id: assignment.fallback_provider_id.clone(),
                model: assignment.fallback_model.clone(),
                role: req.role.clone(),
                request_type: "REASONING".to_string(),
                input_tokens: prompt_tokens,
                output_tokens: 1800,
                cost_usd: 0.015,
                latency_ms: f_lat,
                status_code: 200,
                error_message: None,
                timestamp: Utc::now().to_rfc3339(),
            });

            Ok(FallbackSimulateResponse {
                success: true,
                attempted_providers: vec![primary_name.clone(), fallback_name.clone()],
                final_provider_id: assignment.fallback_provider_id.clone(),
                final_model: assignment.fallback_model.clone(),
                circuit_broken: true,
                message: format!(
                    "Primary provider '{}' encountered HTTP {} quota exhaustion. Multi-key pool rotated and circuit-breaker triggered failover to '{}' (model: '{}').",
                    primary_name, status_code, fallback_name, assignment.fallback_model
                ),
                latency_ms: p_lat + f_lat + 75,
            })
        } else {
            // Primary provider succeeded
            let _ = self.record_model_telemetry(ModelTelemetry {
                id: format!("tel-succ-{}", Utc::now().timestamp_millis()),
                provider_id: assignment.primary_provider_id.clone(),
                model: assignment.primary_model.clone(),
                role: req.role.clone(),
                request_type: "COMPLETION".to_string(),
                input_tokens: prompt_tokens,
                output_tokens: 2200,
                cost_usd: 0.008,
                latency_ms: p_lat,
                status_code: 200,
                error_message: None,
                timestamp: Utc::now().to_rfc3339(),
            });

            Ok(FallbackSimulateResponse {
                success: true,
                attempted_providers: vec![primary_name.clone()],
                final_provider_id: assignment.primary_provider_id.clone(),
                final_model: assignment.primary_model.clone(),
                circuit_broken: false,
                message: format!("Dispatched to primary provider '{}' (model: '{}') successfully.", primary_name, assignment.primary_model),
                latency_ms: p_lat + 15,
            })
        }
    }

    // ----------------- Style DNA & Literary Mimicry Repository -----------------

    pub fn list_style_dna_profiles(&self) -> Result<Vec<StyleDnaProfile>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, author, source_title, source_url, tags_json, sensory_density, dialogue_ratio, sentence_variance, metaphor_frequency, pacing_velocity, vocabulary_richness, forbidden_cliches_json, golden_exemplars_json, prompt_directive, created_at FROM style_dna_profiles ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            let tags_str: String = row.get(5)?;
            let cliches_str: String = row.get(12)?;
            let exemplars_str: String = row.get(13)?;

            let sensory: f64 = row.get(6)?;
            let dialogue: f64 = row.get(7)?;
            let variance: f64 = row.get(8)?;
            let metaphor: f64 = row.get(9)?;
            let pacing: f64 = row.get(10)?;
            let vocab: f64 = row.get(11)?;

            Ok(StyleDnaProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                author: row.get(2)?,
                source_title: row.get(3)?,
                source_url: row.get(4)?,
                tags: serde_json::from_str(&tags_str).unwrap_or_default(),
                sensory_density: sensory as f32,
                dialogue_ratio: dialogue as f32,
                sentence_variance: variance as f32,
                metaphor_frequency: metaphor as f32,
                pacing_velocity: pacing as f32,
                vocabulary_richness: vocab as f32,
                forbidden_cliches: serde_json::from_str(&cliches_str).unwrap_or_default(),
                golden_exemplars: serde_json::from_str(&exemplars_str).unwrap_or_default(),
                prompt_directive: row.get(14)?,
                created_at: row.get(15)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn get_style_dna_profile(&self, id: &str) -> Result<Option<StyleDnaProfile>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, author, source_title, source_url, tags_json, sensory_density, dialogue_ratio, sentence_variance, metaphor_frequency, pacing_velocity, vocabulary_richness, forbidden_cliches_json, golden_exemplars_json, prompt_directive, created_at FROM style_dna_profiles WHERE id = ?"
        )?;

        let mut rows = stmt.query_map(params![id], |row| {
            let tags_str: String = row.get(5)?;
            let cliches_str: String = row.get(12)?;
            let exemplars_str: String = row.get(13)?;

            let sensory: f64 = row.get(6)?;
            let dialogue: f64 = row.get(7)?;
            let variance: f64 = row.get(8)?;
            let metaphor: f64 = row.get(9)?;
            let pacing: f64 = row.get(10)?;
            let vocab: f64 = row.get(11)?;

            Ok(StyleDnaProfile {
                id: row.get(0)?,
                name: row.get(1)?,
                author: row.get(2)?,
                source_title: row.get(3)?,
                source_url: row.get(4)?,
                tags: serde_json::from_str(&tags_str).unwrap_or_default(),
                sensory_density: sensory as f32,
                dialogue_ratio: dialogue as f32,
                sentence_variance: variance as f32,
                metaphor_frequency: metaphor as f32,
                pacing_velocity: pacing as f32,
                vocabulary_richness: vocab as f32,
                forbidden_cliches: serde_json::from_str(&cliches_str).unwrap_or_default(),
                golden_exemplars: serde_json::from_str(&exemplars_str).unwrap_or_default(),
                prompt_directive: row.get(14)?,
                created_at: row.get(15)?,
            })
        })?;

        if let Some(res) = rows.next() {
            Ok(Some(res?))
        } else {
            Ok(None)
        }
    }

    pub fn create_or_update_style_dna_profile(&self, mut profile: StyleDnaProfile) -> Result<StyleDnaProfile, rusqlite::Error> {
        if profile.id.is_empty() {
            profile.id = format!("dna-{}", Utc::now().timestamp_millis());
        }
        if profile.created_at.is_empty() {
            profile.created_at = Utc::now().to_rfc3339();
        }

        let conn = self.conn.lock().unwrap();
        let tags_json = serde_json::to_string(&profile.tags).unwrap_or_else(|_| "[]".to_string());
        let cliches_json = serde_json::to_string(&profile.forbidden_cliches).unwrap_or_else(|_| "[]".to_string());
        let exemplars_json = serde_json::to_string(&profile.golden_exemplars).unwrap_or_else(|_| "[]".to_string());

        conn.execute(
            "INSERT OR REPLACE INTO style_dna_profiles (id, name, author, source_title, source_url, tags_json, sensory_density, dialogue_ratio, sentence_variance, metaphor_frequency, pacing_velocity, vocabulary_richness, forbidden_cliches_json, golden_exemplars_json, prompt_directive, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                profile.id,
                profile.name,
                profile.author,
                profile.source_title,
                profile.source_url,
                tags_json,
                profile.sensory_density as f64,
                profile.dialogue_ratio as f64,
                profile.sentence_variance as f64,
                profile.metaphor_frequency as f64,
                profile.pacing_velocity as f64,
                profile.vocabulary_richness as f64,
                cliches_json,
                exemplars_json,
                profile.prompt_directive,
                profile.created_at
            ],
        )?;

        Ok(profile)
    }

    pub fn extract_style_dna(&self, req: ExtractStyleDnaRequest) -> Result<StyleDnaProfile, Box<dyn std::error::Error + Send + Sync>> {
        let text = req.sample_text.trim();
        let total_chars = text.chars().count().max(1);

        // 1. Dialogue Ratio
        let mut in_quote = false;
        let mut dialogue_chars = 0usize;
        for c in text.chars() {
            if c == '“' || c == '「' || c == '"' {
                in_quote = true;
            } else if c == '”' || c == '」' || c == '"' {
                in_quote = false;
            } else if in_quote {
                dialogue_chars += 1;
            }
        }
        let dialogue_ratio = ((dialogue_chars as f32 / total_chars as f32) * 1.2).clamp(0.05, 0.95);

        // 2. Sensory Density
        let sensory_chars = ['红', '黑', '白', '青', '蓝', '紫', '金', '银', '光', '影', '暗', '霞', '明', '映', '耀', '声', '音', '响', '鸣', '啸', '雷', '呼', '铃', '低', '嘶', '冷', '热', '寒', '温', '凉', '刺', '痛', '麻', '冰', '灼', '颤', '香', '腥', '臭', '甜', '苦', '焦', '酸'];
        let mut sensory_count = 0usize;
        for c in text.chars() {
            if sensory_chars.contains(&c) {
                sensory_count += 1;
            }
        }
        let sensory_density = ((sensory_count as f32 * 25.0) / total_chars as f32).clamp(0.15, 0.95);

        // 3. Sentence Variance
        let sentences: Vec<&str> = text
            .split(|c| c == '。' || c == '！' || c == '？' || c == '!' || c == '?' || c == '\n')
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .collect();
        let s_count = sentences.len().max(1);
        let lengths: Vec<f32> = sentences.iter().map(|s| s.chars().count() as f32).collect();
        let avg_len: f32 = lengths.iter().sum::<f32>() / s_count as f32;
        let variance_val: f32 = lengths.iter().map(|l| (l - avg_len).powi(2)).sum::<f32>() / s_count as f32;
        let std_dev = variance_val.sqrt();
        let sentence_variance = (std_dev / avg_len.max(6.0)).clamp(0.1, 0.95);

        // 4. Metaphor Frequency
        let metaphor_words = ["如", "若", "似", "像", "仿佛", "犹如", "宛若", "如同", "恰似"];
        let mut metaphor_hits = 0usize;
        for m in &metaphor_words {
            metaphor_hits += text.matches(m).count();
        }
        let metaphor_frequency = ((metaphor_hits as f32 * 2.0) / s_count as f32).clamp(0.1, 0.95);

        // 5. Pacing Velocity
        let action_verbs = ['斩', '拔', '杀', '破', '瞬', '闪', '遁', '跃', '裂', '冲', '轰', '掠', '疾', '刺', '暴', '退', '扑'];
        let mut action_hits = 0usize;
        for c in text.chars() {
            if action_verbs.contains(&c) {
                action_hits += 1;
            }
        }
        let pacing_velocity = ((action_hits as f32 * 30.0) / total_chars as f32).clamp(0.2, 0.95);

        // 6. Vocabulary Richness (TTR + classical particles)
        let classical_particles = ['之', '乎', '者', '也', '乃', '其', '遂', '盖', '未', '甚', '且', '俱', '亦', '焉', '矣'];
        let mut classical_count = 0usize;
        for c in text.chars() {
            if classical_particles.contains(&c) {
                classical_count += 1;
            }
        }
        let mut unique_chars = std::collections::HashSet::new();
        for c in text.chars() {
            if !c.is_whitespace() {
                unique_chars.insert(c);
            }
        }
        let ttr = unique_chars.len() as f32 / total_chars as f32;
        let vocabulary_richness = (ttr * 0.7 + (classical_count as f32 * 10.0 / total_chars as f32) * 0.3).clamp(0.25, 0.95);

        // Forbidden Cliches & Exemplars
        let forbidden_cliches = vec![
            "恐怖如斯".to_string(),
            "倒吸一口凉气".to_string(),
            "桀桀怪笑".to_string(),
            "蝼蚁一般".to_string(),
            "给爷死".to_string(),
            "此子断不可留".to_string(),
        ];

        let mut exemplars = Vec::new();
        for s in &sentences {
            let clen = s.chars().count();
            if clen >= 18 && clen <= 85 {
                exemplars.push(s.to_string());
                if exemplars.len() >= 3 {
                    break;
                }
            }
        }
        if exemplars.is_empty() && !sentences.is_empty() {
            exemplars.push(sentences[0].to_string());
        }

        let name = req.name.unwrap_or_else(|| {
            format!("文风提取·{}", Utc::now().format("%m%d%H%M"))
        });
        let author = req.author.unwrap_or_else(|| "自析样本名家".to_string());
        let source_title = req.source_title.unwrap_or_else(|| "用户上传典范文本".to_string());

        let prompt_directive = format!(
            "仿写文风指令【{}】：感官描写密度 {:.2}，对白叙事占比 {:.2}，句式长短起伏方差 {:.2}，隐喻意象频率 {:.2}，动作推进速率 {:.2}，文辞丰沛度 {:.2}。行文要求：融情入景，严禁现代网络烂梗及陈词滥调（如{}）。",
            author, sensory_density, dialogue_ratio, sentence_variance, metaphor_frequency, pacing_velocity, vocabulary_richness, forbidden_cliches.join("、")
        );

        let profile = StyleDnaProfile {
            id: format!("dna-ext-{}", Utc::now().timestamp_millis()),
            name,
            author,
            source_title,
            source_url: req.source_url,
            tags: vec!["文本提取".to_string(), "深度文学DNA".to_string()],
            sensory_density,
            dialogue_ratio,
            sentence_variance,
            metaphor_frequency,
            pacing_velocity,
            vocabulary_richness,
            forbidden_cliches,
            golden_exemplars: exemplars,
            prompt_directive,
            created_at: Utc::now().to_rfc3339(),
        };

        self.create_or_update_style_dna_profile(profile)
            .map_err(|e| Box::new(e) as Box<dyn std::error::Error + Send + Sync>)
    }

    pub fn blend_style_dna(&self, req: StyleFusionRequest) -> Result<StyleFusionResponse, Box<dyn std::error::Error + Send + Sync>> {
        let p1 = self.get_style_dna_profile(&req.primary_profile_id)?
            .ok_or_else(|| format!("Primary Style DNA profile not found: {}", req.primary_profile_id))?;
        let p2 = self.get_style_dna_profile(&req.secondary_profile_id)?
            .ok_or_else(|| format!("Secondary Style DNA profile not found: {}", req.secondary_profile_id))?;

        let r = req.fusion_ratio.clamp(0.0, 1.0);
        let inv = 1.0 - r;

        let sensory_density = p1.sensory_density * r + p2.sensory_density * inv;
        let dialogue_ratio = p1.dialogue_ratio * r + p2.dialogue_ratio * inv;
        let sentence_variance = p1.sentence_variance * r + p2.sentence_variance * inv;
        let metaphor_frequency = p1.metaphor_frequency * r + p2.metaphor_frequency * inv;
        let pacing_velocity = p1.pacing_velocity * r + p2.pacing_velocity * inv;
        let vocabulary_richness = p1.vocabulary_richness * r + p2.vocabulary_richness * inv;

        let mut cliches_set = std::collections::HashSet::new();
        for c in &p1.forbidden_cliches {
            cliches_set.insert(c.clone());
        }
        for c in &p2.forbidden_cliches {
            cliches_set.insert(c.clone());
        }
        let forbidden_cliches: Vec<String> = cliches_set.into_iter().collect();

        let mut exemplars = Vec::new();
        exemplars.extend(p1.golden_exemplars.iter().take(2).cloned());
        exemplars.extend(p2.golden_exemplars.iter().take(2).cloned());

        let mut tags = Vec::new();
        tags.extend(p1.tags.iter().take(2).cloned());
        tags.extend(p2.tags.iter().take(2).cloned());
        tags.push("融合文风".to_string());

        let custom_name = req.custom_name.unwrap_or_else(|| {
            format!("{} × {} 融合典范", p1.name, p2.name)
        });

        let prompt_directive = format!(
            "融合文风指令【{} ({:.0}%) + {} ({:.0}%)】：感官密度 {:.2}，对话比 {:.2}，句式方差 {:.2}，隐喻频率 {:.2}，节奏速率 {:.2}，典雅丰沛度 {:.2}。汲取{}的叙事底蕴与{}的张力行文，形成全新文风矩阵。",
            p1.name, r * 100.0, p2.name, inv * 100.0, sensory_density, dialogue_ratio, sentence_variance, metaphor_frequency, pacing_velocity, vocabulary_richness, p1.author, p2.author
        );

        let fused_profile = StyleDnaProfile {
            id: format!("dna-blend-{}", Utc::now().timestamp_millis()),
            name: custom_name,
            author: format!("{}+{}", p1.author, p2.author),
            source_title: format!("{} / {}", p1.source_title, p2.source_title),
            source_url: None,
            tags,
            sensory_density,
            dialogue_ratio,
            sentence_variance,
            metaphor_frequency,
            pacing_velocity,
            vocabulary_richness,
            forbidden_cliches,
            golden_exemplars: exemplars,
            prompt_directive,
            created_at: Utc::now().to_rfc3339(),
        };

        let saved = self.create_or_update_style_dna_profile(fused_profile)?;
        let notes = format!(
            "成功融合文风 '{}' ({:.0}%) 与 '{}' ({:.0}%)。兼备首主创的文学骨架与次主创的感官张力，已入库 Style DNA 库。",
            p1.name, r * 100.0, p2.name, inv * 100.0
        );

        Ok(StyleFusionResponse {
            fused_profile: saved,
            blending_notes: notes,
        })
    }

    // ----------------- Idea-to-Universe Genesis Engine -----------------

    pub fn generate_idea_universe(&self, req: IdeaGenesisRequest) -> Result<IdeaGenesisResponse, Box<dyn std::error::Error + Send + Sync>> {
        let title = if !req.core_hook.is_empty() {
            format!("《{}：{}》", req.genre, req.core_hook)
        } else {
            format!("《{}·太初破壁录》", req.genre)
        };

        let novel_id = format!("nov-gen-{}", Utc::now().timestamp_millis());
        let vol_id_1 = format!("vol-{}-1", novel_id);
        let vol_id_2 = format!("vol-{}-2", novel_id);
        let vol_id_3 = format!("vol-{}-3", novel_id);

        let synopsis = format!(
            "【故事背景】在{}的恢宏大世中，天地秩序濒临破灭。主角怀揣核心机密【{}】，以【{}】为金手指依凭，自凡微尘埃中拔剑而起。主调风格【{}】，直面灭门与宿命大劫，打破上界禁锢，走出一条独属于自己的逆天伐道之路！",
            req.genre, req.logline, req.golden_finger_type, req.tone
        );

        // 1. Golden Three Chapters
        let chap1_id = format!("chap-{}-1", novel_id);
        let chap2_id = format!("chap-{}-2", novel_id);
        let chap3_id = format!("chap-{}-3", novel_id);

        let c1_scenes = vec![
            Scene {
                id: format!("sc-{}-1", chap1_id),
                chapter_id: chap1_id.clone(),
                scene_index: 1,
                scene_goal: "建立底层主角生死压迫，揭露反派逼杀动机".to_string(),
                conflict: "宗门恶仆持死契上门逼迫交出祖传遗物".to_string(),
                turn_point: "主角假意顺从，暗中引诱敌方踏入绝境死角".to_string(),
                outcome: "拉扯出逃生破局时间差，但自身负伤濒危".to_string(),
                involved_character_ids: vec!["char-protagonist".to_string(), "char-villain".to_string()],
                location: "青石寒崖柴房".to_string(),
                draft_content: "".to_string(),
                agent_notes: Some("突出冷峻克制心性，不可无脑咆哮".to_string()),
            },
            Scene {
                id: format!("sc-{}-2", chap1_id),
                chapter_id: chap1_id.clone(),
                scene_index: 2,
                scene_goal: format!("濒死绝境中正式激活【{}】金手指", req.golden_finger_type),
                conflict: "神魂剧痛与天地规则威压激烈冲撞".to_string(),
                turn_point: "金手指面板破开识海迷雾，解析出敌方致命死穴破绽".to_string(),
                outcome: "主角获得第一缕核心逆转生机，战力质变升华".to_string(),
                involved_character_ids: vec!["char-protagonist".to_string()],
                location: "断魂绝壁古岩裂隙".to_string(),
                draft_content: "".to_string(),
                agent_notes: Some("金手指能力展示需具备严谨代价与规则感".to_string()),
            },
        ];

        let c2_scenes = vec![
            Scene {
                id: format!("sc-{}-1", chap2_id),
                chapter_id: chap2_id.clone(),
                scene_index: 1,
                scene_goal: "实战检验金手指能力，诱杀第一重追杀者".to_string(),
                conflict: "三名凶残追兵封锁峡谷出口，布设天罗地网".to_string(),
                turn_point: "主角利用信息差制造地脉毒障，逐一分割孤立强敌".to_string(),
                outcome: "干净利落实施首杀反杀，缴获珍贵古符与灵石".to_string(),
                involved_character_ids: vec!["char-protagonist".to_string(), "char-hunter".to_string()],
                location: "黑风谷迷瘴乱石林".to_string(),
                draft_content: "".to_string(),
                agent_notes: Some("战斗动作需凌厉简练，杀伐果断".to_string()),
            },
        ];

        let c3_scenes = vec![
            Scene {
                id: format!("sc-{}-1", chap3_id),
                chapter_id: chap3_id.clone(),
                scene_index: 1,
                scene_goal: "首卷黄金三章高潮爆点：逆斩头目并引爆世界宏观悬念".to_string(),
                conflict: "敌对势力领队统领亲临，筑基大圆满威压封锁虚空".to_string(),
                turn_point: "主角引动远古禁制核心，金手指超负荷解构对方命门法宝".to_string(),
                outcome: "越级强势诛杀头目！夺得通往上古秘境的核心青铜古钥，震惊全场".to_string(),
                involved_character_ids: vec!["char-protagonist".to_string(), "char-boss".to_string()],
                location: "坠星崖古祭坛之巅".to_string(),
                draft_content: "".to_string(),
                agent_notes: Some("留下巨大宏观悬念钩子，促使读者强烈追更".to_string()),
            },
        ];

        let golden_three_chapters = vec![
            Chapter {
                id: chap1_id.clone(),
                volume_id: vol_id_1.clone(),
                novel_id: novel_id.clone(),
                chapter_index: 1,
                title: "第1章 异兆初现与觉醒".to_string(),
                outline: "主角绝境求生，在生死交界点引动上古因果，金手指首次觉醒。".to_string(),
                pov_character_id: Some("char-protagonist".to_string()),
                word_count_goal: 3000,
                actual_word_count: 0,
                status: "PLANNED".to_string(),
                scenes: c1_scenes,
            },
            Chapter {
                id: chap2_id.clone(),
                volume_id: vol_id_1.clone(),
                novel_id: novel_id.clone(),
                chapter_index: 2,
                title: "第2章 规则初探与暗流试探".to_string(),
                outline: "掌握金手指初步律令，在黑风谷以弱胜强伏击追杀者。".to_string(),
                pov_character_id: Some("char-protagonist".to_string()),
                word_count_goal: 3200,
                actual_word_count: 0,
                status: "PLANNED".to_string(),
                scenes: c2_scenes,
            },
            Chapter {
                id: chap3_id.clone(),
                volume_id: vol_id_1.clone(),
                novel_id: novel_id.clone(),
                chapter_index: 3,
                title: "第3章 绝壁破局与大势初成".to_string(),
                outline: "祭坛绝巅越阶诛杀头目，破开死局，引爆首卷最大宏观主线钩子。".to_string(),
                pov_character_id: Some("char-protagonist".to_string()),
                word_count_goal: 3500,
                actual_word_count: 0,
                status: "PLANNED".to_string(),
                scenes: c3_scenes,
            },
        ];

        // 2. Volumes
        let volumes = vec![
            Volume {
                id: vol_id_1,
                novel_id: novel_id.clone(),
                volume_index: 1,
                title: "第一卷 潜龙困渊·破壁觉醒".to_string(),
                summary: Some("底层绝境求生，掌握核心金手指机密，反杀宗门恶徒，夺取进入上古秘境资格。".to_string()),
                main_conflict: "宗门内部残酷倾轧与修道资源垄断".to_string(),
                target_climax: "坠星崖祭坛血战逆斩筑基统领，夺得古修青铜密钥".to_string(),
                boundary_constraints: Some("战力严格限制在练气至筑基初阶，金手指严守冷却限制".to_string()),
                chapters: golden_three_chapters.clone(),
            },
            Volume {
                id: vol_id_2,
                novel_id: novel_id.clone(),
                volume_index: 2,
                title: "第二卷 风起云涌·群雄逐鹿".to_string(),
                summary: Some("踏入宏大千州大域，卷入正邪道统争夺天道灵机之争，金手指进阶至第二层形态。".to_string()),
                main_conflict: "隐世宗门与太古皇朝对古仙遗迹的博弈倾轧".to_string(),
                target_climax: "万宗问鼎大典上力挽狂澜，镇压初代天骄".to_string(),
                boundary_constraints: Some("战力推进至金丹元婴交锋，世界观拓展至大域法则".to_string()),
                chapters: vec![],
            },
            Volume {
                id: vol_id_3,
                novel_id: novel_id.clone(),
                volume_index: 3,
                title: "第三卷 独断万古·天道争锋".to_string(),
                summary: Some("纪元终极死劫降临，幕后黑手破封而出，主角执掌完整天道法则熔炉，独断天命。".to_string()),
                main_conflict: "灭世大劫与天道规则终极坍塌".to_string(),
                target_climax: "身化法则天道，超脱纪元宿命，重建宇宙新规".to_string(),
                boundary_constraints: Some("化神及化道级因果法则博弈，神战终局".to_string()),
                chapters: vec![],
            },
        ];

        // 3. World Settings
        let world_settings = vec![
            WorldSetting {
                id: format!("ws-{}-1", novel_id),
                novel_id: novel_id.clone(),
                category: "POWER_SYSTEM".to_string(),
                name: format!("{}·九境通天修炼位阶", req.genre),
                aliases: vec!["境界体系".to_string(), "位阶法则".to_string()],
                content: "筑基、凝丹、神照、归墟、破妄、化神、返虚、合道、大乘。每一大境九小重，晋级需淬炼神魂因果与天地道意。".to_string(),
                priority: 90,
                tags: vec!["修仙".to_string(), "战力阶梯".to_string()],
            },
            WorldSetting {
                id: format!("ws-{}-2", novel_id),
                novel_id: novel_id.clone(),
                category: "GEOGRAPHY".to_string(),
                name: "三千道州与无垠大荒格局".to_string(),
                aliases: vec!["地理版图".to_string()],
                content: "中央神庭掌控九百神州，四极边荒遍布古遗迹与神魔古战场，地脉禁制遍布，常年风暴不歇。".to_string(),
                priority: 80,
                tags: vec!["地理".to_string(), "势力".to_string()],
            },
            WorldSetting {
                id: format!("ws-{}-3", novel_id),
                novel_id: novel_id.clone(),
                category: "CHEAT_RULE".to_string(),
                name: format!("{}·等价平衡铁律", req.golden_finger_type),
                aliases: vec!["金手指法则".to_string()],
                content: format!("核心能力：{}。任何推演与规则改写均受因果守恒定律制约，必须提供心神魂力或天地异宝作为能级代偿。", req.golden_finger_type),
                priority: 95,
                tags: vec!["金手指".to_string(), "底牌约束".to_string()],
            },
        ];

        // 4. Characters
        let main_characters = vec![
            Character {
                id: "char-protagonist".to_string(),
                novel_id: novel_id.clone(),
                name: "顾长青".to_string(),
                role_type: "PROTAGONIST".to_string(),
                gender: "男".to_string(),
                profile: CharacterProfile {
                    identity: Some("破落古修世家唯一遗孤".to_string()),
                    appearance: "清瘦坚毅，墨发披肩，眼神冷峻如古潭之冰".to_string(),
                    personality_traits: vec!["冷峻克制".to_string(), "杀伐果断".to_string(), "心机深沉".to_string(), "重诺守信".to_string()],
                    voice_and_tone: "嗓音低沉平稳，字句间极具定力".to_string(),
                    core_motivation: "超脱宿命棋局，斩断天道枷锁".to_string(),
                    fatal_flaw: "极度缺乏信任感，习惯独自行走于险境".to_string(),
                    catchphrases: vec!["事已至此，唯有拔剑。".to_string(), "天地为棋，我当执子。".to_string()],
                },
                background: "幼年目睹家族因怀璧之罪覆灭，隐忍多年，只为求取通天大道。".to_string(),
                created_at: Utc::now().to_rfc3339(),
            },
            Character {
                id: "char-ally".to_string(),
                novel_id: novel_id.clone(),
                name: "云霄子".to_string(),
                role_type: "SUPPORTING".to_string(),
                gender: "男".to_string(),
                profile: CharacterProfile {
                    identity: Some("游方残魂 / 隐世阵道大宗师".to_string()),
                    appearance: "白发青袍虚影，手握紫金拂尘".to_string(),
                    personality_traits: vec!["诙谐通透".to_string(), "老辣狡黠".to_string()],
                    voice_and_tone: "轻慢慵懒，实则字字切中要害".to_string(),
                    core_motivation: "寻觅古仙崩塌真相，重塑道统".to_string(),
                    fatal_flaw: "神魂残缺，受限于阴阳界限".to_string(),
                    catchphrases: vec!["小家伙，这修仙界的浑水可深得很呐。".to_string()],
                },
                background: "千年前天道大劫中的幸存者，寄宿于古铜佩中。".to_string(),
                created_at: Utc::now().to_rfc3339(),
            },
            Character {
                id: "char-antagonist".to_string(),
                novel_id: novel_id.clone(),
                name: "厉无涯".to_string(),
                role_type: "ANTAGONIST".to_string(),
                gender: "男".to_string(),
                profile: CharacterProfile {
                    identity: Some("血冥魔宗暗部首座 / 宗门长老".to_string()),
                    appearance: "面容阴鸷，黑袍绣金，右手常年缠绕幽冥血煞".to_string(),
                    personality_traits: vec!["贪婪残忍".to_string(), "权谋至上".to_string()],
                    voice_and_tone: "嘶哑森冷，压迫感十足".to_string(),
                    core_motivation: "攫取古修造化以突破天人寿元大限".to_string(),
                    fatal_flaw: "轻视底层蝼蚁，盲目自信于血煞魔功".to_string(),
                    catchphrases: vec!["螳臂当车，逆天者死！".to_string()],
                },
                background: "为延寿不择手段，布局多年欲夺取主角家族古宝。".to_string(),
                created_at: Utc::now().to_rfc3339(),
            },
        ];

        // 5. Cheat System
        let cheat_system = json!({
            "system_name": format!("{}·天道中枢架构", req.golden_finger_type),
            "tier_level": 1,
            "max_tier": 9,
            "core_ability": "破绽洞察、因果推演与机缘回溯",
            "activation_cost": "神念心力与天道气运点",
            "backlash_warning": "过度超前推演将诱发识海崩碎与古仙道化反噬",
            "upgrade_milestones": [
                {"tier": 1, "unlock": "看破微观功法漏洞与敌方出招前摇"},
                {"tier": 3, "unlock": "逆转三炷香时空因果线"},
                {"tier": 6, "unlock": "神念具现为太初法则熔炉"}
            ]
        });

        // 6. Tension Curve (30 chapters)
        let tension_curve_preview = vec![
            0.65, 0.78, 0.92, 0.50, 0.58, 0.72, 0.85, 0.94, 0.55, 0.62,
            0.75, 0.88, 0.95, 0.52, 0.60, 0.74, 0.86, 0.96, 0.58, 0.66,
            0.78, 0.89, 0.97, 0.60, 0.70, 0.82, 0.90, 0.95, 0.98, 0.70,
        ];

        Ok(IdeaGenesisResponse {
            novel_title: title,
            synopsis,
            golden_three_chapters,
            volumes,
            world_settings,
            main_characters,
            cheat_system,
            tension_curve_preview,
        })
    }

    pub fn generate_multiverse_branches(&self, _novel_id: &str, divergence_point: Option<&str>) -> Result<Vec<MultiverseBranch>, Box<dyn std::error::Error + Send + Sync>> {
        let dp = divergence_point.unwrap_or("主角在第三章面对绝杀之局时的抉择分水岭");

        let branches = vec![
            MultiverseBranch {
                branch_id: "branch-alpha".to_string(),
                title: "宇宙分支α：极道逆斩·以杀证道主线".to_string(),
                divergence_point: dp.to_string(),
                summary: "主角放弃遁走，当场引爆九重秘术极限反杀首领，逼退整支追兵并震动宗门高层。".to_string(),
                climax_outcome: "名声大噪，但自身神魂受创三个月，提早引来大能夺舍危机。".to_string(),
                pros: vec!["爽点密集爆发，读者期待值极速拉满".to_string(), "主角杀伐果断人设立体鲜明".to_string()],
                cons: vec!["后期战力膨胀速度过快，需加速扩展更高位面".to_string()],
            },
            MultiverseBranch {
                branch_id: "branch-beta".to_string(),
                title: "宇宙分支β：韬光养晦·暗度陈仓智斗线".to_string(),
                divergence_point: dp.to_string(),
                summary: "主角借假死脱身遁入暗流，化名潜入敌对宗门藏经阁，暗中蚕食对方气运与传承。".to_string(),
                climax_outcome: "半年后以幕后黑手姿态反向诛杀仇敌全族，底牌毫无泄露。".to_string(),
                pros: vec!["智斗悬念强烈，信息差戏剧张力极高".to_string(), "世界观展现细腻丰富".to_string()],
                cons: vec!["前中期即时爽点兑现稍有延迟，需精细控制节奏".to_string()],
            },
            MultiverseBranch {
                branch_id: "branch-gamma".to_string(),
                title: "宇宙分支γ：规则颠覆·以诡破劫奇幻线".to_string(),
                divergence_point: dp.to_string(),
                summary: "主角不遵传统修仙常理，利用金手指反向污染敌对阵法，引来未知古神眷族互相制衡。".to_string(),
                climax_outcome: "战场彻底异化为不可名状的荒诞秘境，主角借混乱规则火中取栗。".to_string(),
                pros: vec!["脑洞极其惊艳，克系与玄幻碰撞出极高辨识度".to_string(), "出人意料反套路".to_string()],
                cons: vec!["对文风驾驭与逻辑闭环能力要求极高".to_string()],
            },
        ];

        Ok(branches)
    }

    // ----------------- Reader Psychology & Information Asymmetry Repository -----------------

    pub fn get_reader_psychology_report(&self, novel_id: &str, chapter_id: Option<&str>) -> Result<ReaderPsychologyReport, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));

        // Query asymmetry items count to gauge dramatic irony
        let asym_count: i64 = {
            let conn = self.conn.lock().unwrap();
            conn.query_row("SELECT count(*) FROM information_asymmetry_items WHERE novel_id = ?", params![resolved], |r| r.get(0)).unwrap_or(3)
        };

        let anticipation_score = (0.75 + (asym_count as f32 * 0.04)).clamp(0.1, 0.96);
        let fatigue_risk = 0.24;
        let payoff_index = 0.86;
        let dopamine_intervals = vec![2200, 3100, 2800];

        let diagnostic_advice = vec![
            "【期待感指数优秀】读者掌握的信息优势与主角的未知险境构成强烈戏剧讽刺，极大激发追读欲望。".to_string(),
            "【疲劳风险受控】当前章节张弛有度，高潮交锋后留有充足的功法盘点与战利品结算呼吸间歇。".to_string(),
            "【爽点兑现律动】多巴胺高潮间歇稳定在 2500-3000 字区间，符合头部商业小说黄金留存标准。".to_string(),
            "【优化建议】第3章后段可适当加入1处场外各方震惊侧写，放大爽点的情绪涟漪。".to_string(),
        ];

        Ok(ReaderPsychologyReport {
            novel_id: resolved,
            chapter_id: chapter_id.map(|s| s.to_string()),
            anticipation_score,
            fatigue_risk,
            payoff_index,
            dopamine_intervals,
            diagnostic_advice,
        })
    }

    pub fn list_information_asymmetry(&self, novel_id: &str) -> Result<Vec<InformationAsymmetryItem>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, secret_title, reader_knows, protagonist_knows, antagonist_knows, dramatic_irony_score FROM information_asymmetry_items WHERE novel_id = ? ORDER BY dramatic_irony_score DESC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            let rk: i64 = row.get(3)?;
            let pk: i64 = row.get(4)?;
            let ak: i64 = row.get(5)?;
            let score: f64 = row.get(6)?;

            Ok(InformationAsymmetryItem {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                secret_title: row.get(2)?,
                reader_knows: rk != 0,
                protagonist_knows: pk != 0,
                antagonist_knows: ak != 0,
                dramatic_irony_score: score as f32,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_information_asymmetry(&self, mut item: InformationAsymmetryItem) -> Result<InformationAsymmetryItem, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&item.novel_id));
        item.novel_id = resolved;
        if item.id.is_empty() {
            item.id = format!("asym-{}", Utc::now().timestamp_millis());
        }
        let now = Utc::now().to_rfc3339();

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO information_asymmetry_items (id, novel_id, secret_title, reader_knows, protagonist_knows, antagonist_knows, dramatic_irony_score, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                item.id,
                item.novel_id,
                item.secret_title,
                if item.reader_knows { 1 } else { 0 },
                if item.protagonist_knows { 1 } else { 0 },
                if item.antagonist_knows { 1 } else { 0 },
                item.dramatic_irony_score as f64,
                now,
            ],
        )?;

        Ok(item)
    }

    pub fn list_offscreen_news_events(&self, novel_id: &str) -> Result<Vec<OffscreenNewsEvent>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, era, region, event_summary, faction_involved, tension_delta, timestamp FROM offscreen_news_events WHERE novel_id = ? ORDER BY timestamp DESC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            let t_delta: f64 = row.get(6)?;

            Ok(OffscreenNewsEvent {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                era: row.get(2)?,
                region: row.get(3)?,
                event_summary: row.get(4)?,
                faction_involved: row.get(5)?,
                tension_delta: t_delta as f32,
                timestamp: row.get(7)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn record_offscreen_news_event(&self, mut event: OffscreenNewsEvent) -> Result<OffscreenNewsEvent, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&event.novel_id));
        event.novel_id = resolved;
        if event.id.is_empty() {
            event.id = format!("news-{}", Utc::now().timestamp_millis());
        }
        if event.timestamp.is_empty() {
            event.timestamp = Utc::now().to_rfc3339();
        }

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO offscreen_news_events (id, novel_id, era, region, event_summary, faction_involved, tension_delta, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                event.id,
                event.novel_id,
                event.era,
                event.region,
                event.event_summary,
                event.faction_involved,
                event.tension_delta as f64,
                event.timestamp,
            ],
        )?;

        Ok(event)
    }

    // =========================================================================
    // Epiphany Sparks, Reader Discussions, Central Skill Vault & Autopilot
    // =========================================================================

    fn maybe_seed_sparks_and_skills_data(&self) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let novel_id = self.resolve_novel_id(None);
        let conn = self.conn.lock().unwrap();
        let now = Utc::now().to_rfc3339();

        let spark_count: i64 = conn.query_row("SELECT count(*) FROM epiphany_sparks", [], |r| r.get(0)).unwrap_or(0);
        if spark_count == 0 {
            let sparks = vec![
                (
                    "spark-seed-1",
                    novel_id.as_str(),
                    "藏经阁扫地盲僧实为上代自斩道果的剑祖",
                    "平时只用竹扫帚划地，其实每一道扫痕都是失传的太虚剑意残纹，主角某次雨夜悟道时偶然踩中两道扫痕触发共鸣。",
                    "PLOT_TWIST",
                    "AUTHOR_BRAINWAVE",
                    None::<&str>,
                    96,
                    "ANCHORED",
                    Some(3i64),
                    Some("第三章末尾主角雨夜踏入藏经阁外院时埋入"),
                    Some("先描写雨水顺着竹扫帚滴落却不溅起水花，侧面暗示重剑无锋的法则控制力。"),
                    json!(["扫地僧", "反转伏笔", "太虚剑意"]).to_string(),
                ),
                (
                    "spark-seed-2",
                    novel_id.as_str(),
                    "读者本章说高赞脑洞：反派给的毒丹其实是本命母蛊钥匙",
                    "起点书友@剑来熬夜王 评论：如果主角不吃下这枚蚀心丹反而打不开秘境第三层石门，把计就计用太虚古镜剥离毒素只留药引岂不是绝杀？",
                    "READER_SUGGESTION",
                    "READER_COMMENT",
                    Some("剑来熬夜王"),
                    94,
                    "INBOX",
                    Some(4i64),
                    Some("秘境石门开启前"),
                    Some("极佳的反套路将计就计桥段，让主角智商碾压反派。"),
                    json!(["读者听劝", "将计就计", "秘境破局"]).to_string(),
                ),
            ];

            for sp in sparks {
                let _ = conn.execute(
                    "INSERT INTO epiphany_sparks (id, novel_id, title, content, spark_type, source, reader_username, heat_score, status, target_chapter_index, target_scene_note, ai_weave_advice, tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![sp.0, sp.1, sp.2, sp.3, sp.4, sp.5, sp.6, sp.7, sp.8, sp.9, sp.10, sp.11, sp.12, now],
                );
            }
        }

        let disc_count: i64 = conn.query_row("SELECT count(*) FROM reader_discussions", [], |r| r.get(0)).unwrap_or(0);
        if disc_count == 0 {
            let discussions = vec![
                (
                    "disc-seed-1",
                    novel_id.as_str(),
                    2i64,
                    "黑袍执事冷笑一声，取出一枚血色丹丸掷在地上……",
                    "剑来熬夜王",
                    "起点本章说",
                    "卧槽！我猜这枚血丹根本不是普通毒药，而是打开青铜古门必须的血脉引子！主角千万别直接毁了，用古镜提纯反手坑死执事啊！",
                    1280i64,
                    "THEORY_CRAFTING",
                    Some("将毒丹改写为秘境钥匙引子，主角提纯药力反坑执事"),
                ),
                (
                    "disc-seed-2",
                    novel_id.as_str(),
                    2i64,
                    "林越沉默片刻，将断剑收入鞘中……",
                    "白金老书虫",
                    "番茄段评",
                    "这一段节奏稍微有点平，建议直接让断剑吸收一缕天雷震碎对方的传音玉简，别让这小喽啰把消息传回总坛！",
                    642i64,
                    "COMPLAINT_WARNING",
                    Some("立即斩断传音玉简防止过早引出元婴老怪，保持爽感闭环"),
                ),
            ];

            for d in discussions {
                let _ = conn.execute(
                    "INSERT INTO reader_discussions (id, novel_id, chapter_index, paragraph_snippet, reader_name, platform, comment_text, likes, sentiment, extracted_hook, converted_spark_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)",
                    params![d.0, d.1, d.2, d.3, d.4, d.5, d.6, d.7, d.8, d.9, now],
                );
            }
        }

        let skill_count: i64 = conn.query_row("SELECT count(*) FROM creation_skills", [], |r| r.get(0)).unwrap_or(0);
        if skill_count == 0 {
            let skills = vec![
                (
                    "skill-trope-001",
                    "【爽点套路】黑市低调捡漏 · 荒野尾随反杀连环局",
                    "TROPE",
                    "凡人修仙流黄金典范",
                    "主角在拍卖会以不起眼代价拍下蒙尘至宝，故意示弱引诱贪婪强敌出城尾随，在预设阵法中雷霆越阶反杀并反舔全套身家。",
                    "【技能挂载：黑市捡漏与荒野反杀】先抑后扬，拍卖时通过微表情暗示宝物不凡，出城后三息内动用底牌干脆利落灭口，严禁圣母放虎归山。",
                    "林越指尖在布满铜锈的残片上轻轻一划，神识深处的古镜骤然炽热，面上却不动声色地摇头叹息将其丢回木盘。",
                    json!(["黑市", "拍卖", "尾随", "反杀", "截胡", "荒林"]).to_string(),
                    1,
                    1,
                    38,
                    96,
                ),
                (
                    "skill-tier-001",
                    "【战力等级】太虚九阶道印与神魂污染代价体系",
                    "POWER_TIER",
                    "诡秘修真融合体系",
                    "淬骨→凝煞→筑基→金丹→元婴→化神。每次越阶动用高维力量必须承受定量的因果反噬或诡异低语，杜绝战力通货膨胀。",
                    "【技能挂载：代价型战力约束】描写越阶战斗时，必须同步展现主角经脉负荷与巧妙借力破局，禁止无脑数值碾压。",
                    "强行引动第三道金丹剑气后，林越左眼角渗出一缕淡金色血迹，耳畔仿佛有万千古神同时低语。",
                    json!(["突破", "境界", "筑基", "金丹", "越阶", "反噬"]).to_string(),
                    1,
                    1,
                    52,
                    95,
                ),
                (
                    "skill-arch-001",
                    "【章节架构】黄金断章钩子 · 三段式情绪心电图",
                    "ARCHITECTURE",
                    "起点万订追读架构",
                    "开篇300字承接上章悬念正面碰撞，中段1800字推进冲突与意外转折，末尾300字抛出更大危机或身份揭秘，强制拉满次日追读。",
                    "【技能挂载：万订三段式断章】章末最后一行必须停留在真相揭晓或强敌降临的最高张力瞬间。",
                    "然而就在他翻转令箭背面的一刹那，瞳孔骤然收缩——那上面镌刻的暗记，竟指向了三日前与他把酒言欢的故人！",
                    json!(["断章", "悬念", "钩子", "高潮", "反转"]).to_string(),
                    1,
                    1,
                    84,
                    98,
                ),
                (
                    "skill-style-001",
                    "【文风范式】冷冽电影感五感动作白描",
                    "STYLE",
                    "新派武侠与古典仙侠熔炉",
                    "摒弃形容词堆砌与AI感叹词，用环境声响、金属刮擦、气流冷暖与极简短句展现生死一线的快节奏搏杀。",
                    "【技能挂载：冷冽五感动作白描】多用动词与名词，长短句交替，战斗关键帧采用0.5倍速微距特写。",
                    "雨水悬停。刀锋擦过铁枪杆溅起一串刺目火星，顺着统领微缩的瞳孔倒影一寸寸没入咽喉。",
                    json!(["战斗", "厮杀", "剑气", "雨夜", "对决"]).to_string(),
                    1,
                    1,
                    41,
                    94,
                ),
            ];

            for sk in skills {
                let _ = conn.execute(
                    "INSERT INTO creation_skills (id, name, category, source_novel_title, description, prompt_directive, example_snippet, trigger_keywords_json, is_enabled, auto_match_eligible, reused_count, effectiveness_rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                    params![sk.0, sk.1, sk.2, sk.3, sk.4, sk.5, sk.6, sk.7, sk.8, sk.9, sk.10, sk.11, now],
                );
            }
        }

        Ok(())
    }

    pub fn list_epiphany_sparks(&self, novel_id: &str) -> Result<Vec<EpiphanySpark>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, title, content, spark_type, source, reader_username, heat_score, status, target_chapter_index, target_scene_note, ai_weave_advice, tags_json, created_at FROM epiphany_sparks WHERE novel_id = ? ORDER BY created_at DESC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            let tags_str: String = row.get(12)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            Ok(EpiphanySpark {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                title: row.get(2)?,
                content: row.get(3)?,
                spark_type: row.get(4)?,
                source: row.get(5)?,
                reader_username: row.get(6)?,
                heat_score: row.get(7)?,
                status: row.get(8)?,
                target_chapter_index: row.get(9)?,
                target_scene_note: row.get(10)?,
                ai_weave_advice: row.get(11)?,
                tags,
                created_at: row.get(13)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_epiphany_spark(&self, mut spark: EpiphanySpark) -> Result<EpiphanySpark, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&spark.novel_id));
        spark.novel_id = resolved;
        if spark.id.is_empty() {
            spark.id = format!("spark-{}", Utc::now().timestamp_millis());
        }
        if spark.created_at.is_empty() {
            spark.created_at = Utc::now().to_rfc3339();
        }
        if spark.status.is_empty() {
            spark.status = "INBOX".to_string();
        }
        if spark.spark_type.is_empty() {
            spark.spark_type = "PLOT_TWIST".to_string();
        }
        if spark.source.is_empty() {
            spark.source = "AUTHOR_BRAINWAVE".to_string();
        }

        let tags_json = serde_json::to_string(&spark.tags).unwrap_or_else(|_| "[]".to_string());
        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO epiphany_sparks (id, novel_id, title, content, spark_type, source, reader_username, heat_score, status, target_chapter_index, target_scene_note, ai_weave_advice, tags_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                spark.id,
                spark.novel_id,
                spark.title,
                spark.content,
                spark.spark_type,
                spark.source,
                spark.reader_username,
                spark.heat_score,
                spark.status,
                spark.target_chapter_index,
                spark.target_scene_note,
                spark.ai_weave_advice,
                tags_json,
                spark.created_at,
            ],
        )?;
        Ok(spark)
    }

    pub fn delete_epiphany_spark(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute("DELETE FROM epiphany_sparks WHERE id = ?", params![id])?;
        Ok(affected > 0)
    }

    pub fn list_reader_discussions(&self, novel_id: &str) -> Result<Vec<ReaderDiscussionComment>, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(novel_id));
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, novel_id, chapter_index, paragraph_snippet, reader_name, platform, comment_text, likes, sentiment, extracted_hook, converted_spark_id, created_at FROM reader_discussions WHERE novel_id = ? ORDER BY likes DESC"
        )?;

        let rows = stmt.query_map(params![resolved], |row| {
            Ok(ReaderDiscussionComment {
                id: row.get(0)?,
                novel_id: row.get(1)?,
                chapter_index: row.get(2)?,
                paragraph_snippet: row.get(3)?,
                reader_name: row.get(4)?,
                platform: row.get(5)?,
                comment_text: row.get(6)?,
                likes: row.get(7)?,
                sentiment: row.get(8)?,
                extracted_hook: row.get(9)?,
                converted_spark_id: row.get(10)?,
                created_at: row.get(11)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_reader_discussion(&self, mut comment: ReaderDiscussionComment) -> Result<ReaderDiscussionComment, rusqlite::Error> {
        let resolved = self.resolve_novel_id(Some(&comment.novel_id));
        comment.novel_id = resolved;
        if comment.id.is_empty() {
            comment.id = format!("disc-{}", Utc::now().timestamp_millis());
        }
        if comment.created_at.is_empty() {
            comment.created_at = Utc::now().to_rfc3339();
        }
        if comment.extracted_hook.is_none() {
            comment.extracted_hook = Some(format!("读者【{}】高赞衍生钩子：{}", comment.reader_name, comment.comment_text.chars().take(36).collect::<String>()));
        }

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO reader_discussions (id, novel_id, chapter_index, paragraph_snippet, reader_name, platform, comment_text, likes, sentiment, extracted_hook, converted_spark_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                comment.id,
                comment.novel_id,
                comment.chapter_index,
                comment.paragraph_snippet,
                comment.reader_name,
                comment.platform,
                comment.comment_text,
                comment.likes,
                comment.sentiment,
                comment.extracted_hook,
                comment.converted_spark_id,
                comment.created_at,
            ],
        )?;
        Ok(comment)
    }

    pub fn collide_sparks(&self, req: SparkCollideRequest) -> SparkCollisionResult {
        let title_a = req.spark_a_title.unwrap_or_else(|| "核心脑洞 A".to_string());
        let title_b = req.spark_b_title.unwrap_or_else(|| "读者热议 B".to_string());

        SparkCollisionResult {
            spark_a_id: req.spark_a_id,
            spark_b_id: req.spark_b_id,
            fusion_title: format!("【双灵感聚变】{} × {}", title_a, title_b),
            combined_plot_twist: format!(
                "将「{}」与「{}」进行因果交叉：原本看似独立的危机实则是同一幕后布局的正反两面，主角借力打力，在揭晓底牌的瞬间同时引爆双重反转！",
                title_a, title_b
            ),
            dramatic_tension_bonus: 28,
            recommended_chapter_placement: "建议埋入下一章中段转折点，并在章末最后三行完成回收爆发".to_string(),
            scene_beat_preview: "【节拍1】表面危机逼近 → 【节拍2】触发第一层灵感伏线 → 【节拍3】第二层读者脑洞逆转乾坤 → 【节拍4】全场死寂断章留钩".to_string(),
        }
    }

    pub fn list_creation_skills(&self) -> Result<Vec<CreationSkillItem>, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let mut stmt = conn.prepare(
            "SELECT id, name, category, source_novel_title, description, prompt_directive, example_snippet, trigger_keywords_json, is_enabled, auto_match_eligible, reused_count, effectiveness_rating, created_at FROM creation_skills ORDER BY effectiveness_rating DESC"
        )?;

        let rows = stmt.query_map([], |row| {
            let kw_str: String = row.get(7)?;
            let trigger_keywords: Vec<String> = serde_json::from_str(&kw_str).unwrap_or_default();
            let is_en: i64 = row.get(8)?;
            let auto_el: i64 = row.get(9)?;
            Ok(CreationSkillItem {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                source_novel_title: row.get(3)?,
                description: row.get(4)?,
                prompt_directive: row.get(5)?,
                example_snippet: row.get(6)?,
                trigger_keywords,
                is_enabled: is_en != 0,
                auto_match_eligible: auto_el != 0,
                reused_count: row.get(10)?,
                effectiveness_rating: row.get(11)?,
                created_at: row.get(12)?,
            })
        })?;

        let mut list = Vec::new();
        for r in rows {
            list.push(r?);
        }
        Ok(list)
    }

    pub fn save_creation_skill(&self, mut skill: CreationSkillItem) -> Result<CreationSkillItem, rusqlite::Error> {
        if skill.id.is_empty() {
            skill.id = format!("skill-{}", Utc::now().timestamp_millis());
        }
        if skill.created_at.is_empty() {
            skill.created_at = Utc::now().to_rfc3339();
        }
        let kw_json = serde_json::to_string(&skill.trigger_keywords).unwrap_or_else(|_| "[]".to_string());

        let conn = self.conn.lock().unwrap();
        conn.execute(
            "INSERT OR REPLACE INTO creation_skills (id, name, category, source_novel_title, description, prompt_directive, example_snippet, trigger_keywords_json, is_enabled, auto_match_eligible, reused_count, effectiveness_rating, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            params![
                skill.id,
                skill.name,
                skill.category,
                skill.source_novel_title,
                skill.description,
                skill.prompt_directive,
                skill.example_snippet,
                kw_json,
                if skill.is_enabled { 1 } else { 0 },
                if skill.auto_match_eligible { 1 } else { 0 },
                skill.reused_count,
                skill.effectiveness_rating,
                skill.created_at,
            ],
        )?;
        Ok(skill)
    }

    pub fn delete_creation_skill(&self, id: &str) -> Result<bool, rusqlite::Error> {
        let conn = self.conn.lock().unwrap();
        let affected = conn.execute("DELETE FROM creation_skills WHERE id = ?", params![id])?;
        Ok(affected > 0)
    }

    pub fn auto_match_skills(&self, req: SkillAutoMatchRequest) -> Result<SkillAutoMatchResult, rusqlite::Error> {
        let all_skills = self.list_creation_skills()?;
        let mut matched_ids = Vec::new();
        let mut reasons = std::collections::HashMap::new();

        for sk in &all_skills {
            if !sk.auto_match_eligible {
                continue;
            }
            let hits: Vec<String> = sk
                .trigger_keywords
                .iter()
                .filter(|kw| req.scene_context.contains(kw.as_str()))
                .cloned()
                .collect();
            if !hits.is_empty() || sk.category == "ARCHITECTURE" {
                matched_ids.push(sk.id.clone());
                let reason = if !hits.is_empty() {
                    format!("场景语义命中触发词【{}】，自动勾选挂载该技能", hits.join("、"))
                } else {
                    format!("长篇追读留存保障：自动挂载【{}】锁定章末钩子", sk.name)
                };
                reasons.insert(sk.id.clone(), reason);
            }
        }

        if matched_ids.len() < 2 {
            for sk in all_skills.iter().take(2) {
                if !matched_ids.contains(&sk.id) {
                    matched_ids.push(sk.id.clone());
                    reasons.insert(
                        sk.id.clone(),
                        format!("AI 叙事张力推荐：自动挂载【{}】提升本幕爽点密度", sk.name),
                    );
                }
            }
        }

        Ok(SkillAutoMatchResult {
            scene_context_summary: req.scene_context.chars().take(100).collect(),
            matched_skill_ids: matched_ids,
            match_reasons: reasons,
        })
    }

    pub fn extract_skill_from_manuscript(&self, req: ExtractSkillRequest) -> Result<CreationSkillItem, rusqlite::Error> {
        let cat = if req.preferred_category.is_empty() {
            "TROPE".to_string()
        } else {
            req.preferred_category
        };
        let snippet: String = req.manuscript_text.chars().take(160).collect();
        let name = req.custom_name.unwrap_or_else(|| {
            format!("【{}】从《{}》萃取的高光范式", cat, req.source_novel_title)
        });

        let item = CreationSkillItem {
            id: format!("skill-ext-{}", Utc::now().timestamp_millis()),
            name: name.clone(),
            category: cat,
            source_novel_title: req.source_novel_title,
            description: format!("从正文片段「{}...」逆向解构沉淀的可复用技能模块。", snippet.chars().take(40).collect::<String>()),
            prompt_directive: format!("【技能挂载：{}】复刻该段落的节奏控制、信息差铺垫与五感白描张力。", name),
            example_snippet: snippet,
            trigger_keywords: vec!["反杀".to_string(), "破局".to_string(), "悬念".to_string()],
            is_enabled: true,
            auto_match_eligible: true,
            reused_count: 1,
            effectiveness_rating: 93,
            created_at: Utc::now().to_rfc3339(),
        };

        self.save_creation_skill(item)
    }

    pub fn subvert_trope_skill(&self, req: SubvertSkillRequest) -> Vec<TropeSubversionVariant> {
        let skill_name = if req.skill_name.is_empty() {
            "经典网文爽点套路".to_string()
        } else {
            req.skill_name
        };

        vec![
            TropeSubversionVariant {
                id: format!("subv-{}-1", Utc::now().timestamp_millis()),
                original_skill_name: skill_name.clone(),
                subversion_title: "反套路变异 A：猎手与猎物的三重镜像伪装".to_string(),
                classic_expectation: "读者以为是主角单方面扮猪吃虎，敌人全是无脑贪婪的送宝童子。".to_string(),
                subverted_twist: "尾随者实为宿敌派来用苦肉计卧底的死士，而主角拍下的残宝早被种下因果追踪印；主角将计就计把追踪印嫁接到敌对宗门太上长老的灵舟上，引发两虎相争。".to_string(),
                dramatic_payoff: "智商博弈连升三级，彻底摆脱机械送快递套路！".to_string(),
            },
            TropeSubversionVariant {
                id: format!("subv-{}-2", Utc::now().timestamp_millis()),
                original_skill_name: skill_name,
                subversion_title: "反套路变异 B：场外第三方密探复盘视角".to_string(),
                classic_expectation: "正面平铺直叙描写主角如何出招秒杀对手。".to_string(),
                subverted_twist: "直接跳过正面交手，从半柱香后赶到现场的朝廷镇抚司密探视角切入，通过满地结霜的雷火残痕倒推刚才那场惊世骇俗的一剑，把主角脑补成隐世千年的绝巅老怪。".to_string(),
                dramatic_payoff: "侧面留白烘托逼格拉满，迪化与幕后爽感翻倍！".to_string(),
            },
        ]
    }

    pub fn generate_autopilot_segment(&self, req: AutopilotSegmentRequest) -> AutopilotGeneratedSegment {
        let skill_names: Vec<String> = req.active_skills.iter().map(|s| s.name.clone()).collect();
        let spark_titles: Vec<String> = req.anchored_sparks.iter().map(|sp| sp.title.clone()).collect();

        let ref_note = match req.reference_data_text {
            Some(ref t) if !t.trim().is_empty() && req.mode == "REFERENCE_GUIDED_AUTO" => {
                format!("\n（已融合投喂参考资料：「{}」）", t.chars().take(50).collect::<String>())
            }
            _ => String::new(),
        };

        let spark_paragraph = if let Some(first_spark) = spark_titles.first() {
            format!(
                "\n\n电光石火之间，林越心头掠过那道早已埋藏多时的灵光伏线——【{}】。长街尽头的雨幕仿佛凝固了一瞬，那名平日里毫不起眼的扫地盲僧竟缓缓抬起竹帚，在青石地上轻轻一划，整座护山大阵顿时发出万剑臣服般的铮鸣！",
                first_spark
            )
        } else {
            "\n\n暴雨如注，青铜古钟的余音在十丈之内荡开一圈肉眼可见的真空涟漪。林越左手袖中的破禁残符悄然燃尽，整个人借着雷光掩护掠入暗巷深处。".to_string()
        };

        let content = format!(
            "【第 {} 章 · 第 {} 幕：无人巡航推演 · 夜雨惊变】{}\n\n残烛在穿堂冷风中剧烈摇晃，将破庙四壁的斑驳神像拉扯出无数张牙舞爪的暗影。\n\n林越背靠着冰冷刺骨的青石断柱，指腹轻轻摩挲着怀中那面布满裂纹的太虚铜镜。铜镜背面的古老铭文正随着他急促的心跳微微发烫，每一道血色丝线都在预示着十步之外那三名九黎暗卫即将发动的合击死角。\n\n“事不可为，且退一步；既退无可退，便借尔等性命一用。”\n\n他左足猛然踏碎湿滑青砖，碎石激射封死左侧刀客视线，右手残剑则贴着铁枪杆一路刮擦出刺目火星，精准刺入统领气机交汇的半寸滞涩之处！{}\n\n当最后一具黑衣尸首重重栽倒在积水潭中时，林越俯身拾起对方腰间那枚尚带余温的玄铁令箭。然而就在他翻转令箭背面的一刹那，瞳孔骤然收缩——那上面镌刻的暗记，竟指向了三日前与他把酒言欢的故人！",
            req.chapter_index, req.scene_index, ref_note, spark_paragraph
        );

        let word_count = content.chars().count();

        AutopilotGeneratedSegment {
            id: format!("auto-seg-{}-{}", Utc::now().timestamp_millis(), req.scene_index),
            chapter_index: req.chapter_index,
            chapter_title: format!("第 {} 章：暗流涌动与宿命破局", req.chapter_index),
            scene_index: req.scene_index,
            scene_title: format!("第 {} 幕：雨夜推演与反杀留钩", req.scene_index),
            content,
            word_count,
            quality_score: 95,
            applied_skills: skill_names,
            incorporated_sparks: spark_titles,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}



