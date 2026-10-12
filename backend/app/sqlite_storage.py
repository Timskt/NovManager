# ==============================================================================
# NovManager 嵌入式 SQLite 持久化引擎 (Embedded SQLite Storage Engine)
# 本地优先 (Local-First)，零配置、开箱即用，自动支持 WAL 并发模式与全文检索
# 当 PostgreSQL 未启动时自动激活本引擎作为主持久化层
# ==============================================================================

import sqlite3
import json
import os
import threading
from typing import List, Optional, Dict, Any
from datetime import datetime

class SQLiteNovelRepository:
    """嵌入式 SQLite 仓储引擎，提供关系模型存储、JSON 快照与事务一致性保证"""

    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
            os.makedirs(data_dir, exist_ok=True)
            db_path = os.path.join(data_dir, "novmanager_local.db")
        self.db_path = db_path
        self._lock = threading.RLock()
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        # 开启高性能 WAL 模式与外键约束
        conn.execute("PRAGMA journal_mode = WAL;")
        conn.execute("PRAGMA synchronous = NORMAL;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        with self._lock, self._get_connection() as conn:
            conn.executescript("""
            CREATE TABLE IF NOT EXISTS novels (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                subtitle TEXT DEFAULT '',
                genre TEXT DEFAULT '仙侠修真',
                target_word_count INTEGER DEFAULT 1000000,
                current_word_count INTEGER DEFAULT 0,
                default_pov TEXT DEFAULT '第三人称限制视角',
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
                gender TEXT DEFAULT '未知',
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
                word_count_goal INTEGER DEFAULT 4000,
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

            CREATE TABLE IF NOT EXISTS what_if_branches (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                base_chapter_id TEXT NOT NULL,
                branch_title TEXT NOT NULL,
                divergence_point TEXT NOT NULL,
                summary TEXT NOT NULL,
                draft_preview TEXT DEFAULT '',
                created_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS video_storyboards (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                chapter_id TEXT,
                scene_id TEXT,
                title TEXT NOT NULL,
                aspect_ratio TEXT DEFAULT '16:9',
                target_platform TEXT DEFAULT 'KLING',
                total_duration_seconds INTEGER DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS video_shots (
                id TEXT PRIMARY KEY,
                storyboard_id TEXT NOT NULL,
                scene_id TEXT,
                shot_number INTEGER NOT NULL,
                duration_seconds INTEGER DEFAULT 5,
                shot_type TEXT DEFAULT 'MEDIUM',
                camera_movement TEXT DEFAULT 'DOLLY_IN',
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
                nodes_json TEXT DEFAULT '[]',
                active_node_id TEXT,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS gods_eye_states (
                novel_id TEXT PRIMARY KEY,
                current_era TEXT NOT NULL,
                celestial_anomalies TEXT NOT NULL,
                macro_crisis_countdown_days INTEGER DEFAULT 49,
                offscreen_factions_json TEXT DEFAULT '[]',
                global_tension_index REAL DEFAULT 78.5
            );

            CREATE TABLE IF NOT EXISTS dungeon_arcs (
                id TEXT PRIMARY KEY,
                novel_id TEXT NOT NULL,
                arc_name TEXT NOT NULL,
                location TEXT NOT NULL,
                stage TEXT DEFAULT 'EXPLORATION',
                danger_level INTEGER DEFAULT 7,
                milestone_gates_json TEXT DEFAULT '[]',
                loot_economy_json TEXT DEFAULT '{}',
                survival_rate REAL DEFAULT 0.45
            );
            """)

    def get_database_status(self) -> Dict[str, Any]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT count(*) FROM novels")
            novels_count = cursor.fetchone()[0]
            return {
                "connected": True,
                "engine": "SQLite3 (Embedded Local-First)",
                "db_path": self.db_path,
                "wal_enabled": True,
                "novels_count": novels_count
            }

    def save_evaluation(self, eval_data: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now().isoformat()
        eval_id = eval_data.get("id") or f"eval-{int(datetime.now().timestamp() * 1000)}"
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO self_evaluations (
                id, novel_id, chapter_id, scene_index, overall_score,
                scores_json, strengths_json, weaknesses_json, refinements_json, iteration_count, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                eval_id,
                eval_data.get("novel_id", ""),
                eval_data.get("chapter_id", ""),
                eval_data.get("scene_index", 1),
                eval_data.get("overall_score", 85),
                json.dumps(eval_data.get("scores", {})),
                json.dumps(eval_data.get("strengths", [])),
                json.dumps(eval_data.get("weaknesses", [])),
                json.dumps(eval_data.get("refinements", [])),
                eval_data.get("iteration_count", 1),
                now_iso
            ))
            return {**eval_data, "id": eval_id, "created_at": now_iso}

    def list_evaluations(self, novel_id: Optional[str] = None, chapter_id: Optional[str] = None) -> List[Dict[str, Any]]:
        with self._lock, self._get_connection() as conn:
            sql = "SELECT * FROM self_evaluations WHERE 1=1"
            params = []
            if novel_id:
                sql += " AND novel_id = ?"
                params.append(novel_id)
            if chapter_id:
                sql += " AND chapter_id = ?"
                params.append(chapter_id)
            sql += " ORDER BY created_at DESC LIMIT 50"
            cursor = conn.cursor()
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            results = []
            for r in rows:
                results.append({
                    "id": r["id"],
                    "novel_id": r["novel_id"],
                    "chapter_id": r["chapter_id"],
                    "scene_index": r["scene_index"],
                    "overall_score": r["overall_score"],
                    "scores": json.loads(r["scores_json"]),
                    "strengths": json.loads(r["strengths_json"]),
                    "weaknesses": json.loads(r["weaknesses_json"]),
                    "refinements": json.loads(r["refinements_json"]),
                    "iteration_count": r["iteration_count"],
                    "created_at": r["created_at"]
                })
            return results

    # ==================== 影视级 AI 视频分镜管理 ====================

    def list_storyboards(self, novel_id: str) -> List[Dict[str, Any]]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM video_storyboards WHERE novel_id = ? ORDER BY created_at DESC", (novel_id,))
            rows = cursor.fetchall()
            results = []
            for r in rows:
                sb_id = r["id"]
                cursor.execute("SELECT * FROM video_shots WHERE storyboard_id = ? ORDER BY shot_number ASC", (sb_id,))
                shot_rows = cursor.fetchall()
                shots = []
                for s in shot_rows:
                    shots.append({
                        "id": s["id"],
                        "scene_id": s["scene_id"],
                        "shot_number": s["shot_number"],
                        "duration_seconds": s["duration_seconds"],
                        "shot_type": s["shot_type"],
                        "camera_movement": s["camera_movement"],
                        "visual_prompt": s["visual_prompt"],
                        "motion_prompt": s["motion_prompt"],
                        "negative_prompt": s["negative_prompt"],
                        "lighting": s["lighting"],
                        "character_references": json.loads(s["character_references_json"]),
                        "sound_cue": s["sound_cue"],
                        "dialogue_cue": s["dialogue_cue"],
                        "created_at": s["created_at"]
                    })
                results.append({
                    "id": r["id"],
                    "novel_id": r["novel_id"],
                    "chapter_id": r["chapter_id"],
                    "scene_id": r["scene_id"],
                    "title": r["title"],
                    "aspect_ratio": r["aspect_ratio"],
                    "target_platform": r["target_platform"],
                    "total_duration_seconds": sum(s["duration_seconds"] for s in shots),
                    "shots": shots,
                    "created_at": r["created_at"],
                    "updated_at": r["updated_at"]
                })
            return results

    def save_storyboard(self, sb_data: Dict[str, Any]) -> Dict[str, Any]:
        now_iso = datetime.now().isoformat()
        sb_id = sb_data.get("id") or f"sb-{int(datetime.now().timestamp() * 1000)}"
        with self._lock, self._get_connection() as conn:
            conn.execute("""
            INSERT OR REPLACE INTO video_storyboards (
                id, novel_id, chapter_id, scene_id, title, aspect_ratio, target_platform,
                total_duration_seconds, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                sb_id,
                sb_data["novel_id"],
                sb_data.get("chapter_id"),
                sb_data.get("scene_id"),
                sb_data.get("title", "未命名分镜"),
                sb_data.get("aspect_ratio", "16:9"),
                sb_data.get("target_platform", "KLING"),
                sb_data.get("total_duration_seconds", 0),
                sb_data.get("created_at", now_iso),
                now_iso
            ))
            # 保存关联 shots
            if "shots" in sb_data and isinstance(sb_data["shots"], list):
                conn.execute("DELETE FROM video_shots WHERE storyboard_id = ?", (sb_id,))
                for idx, s in enumerate(sb_data["shots"]):
                    shot_id = s.get("id") or f"shot-{int(datetime.now().timestamp() * 1000)}-{idx}"
                    conn.execute("""
                    INSERT INTO video_shots (
                        id, storyboard_id, scene_id, shot_number, duration_seconds, shot_type,
                        camera_movement, visual_prompt, motion_prompt, negative_prompt, lighting,
                        character_references_json, sound_cue, dialogue_cue, created_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        shot_id,
                        sb_id,
                        s.get("scene_id"),
                        s.get("shot_number", idx + 1),
                        s.get("duration_seconds", 5),
                        s.get("shot_type", "MEDIUM"),
                        s.get("camera_movement", "DOLLY_IN"),
                        s.get("visual_prompt", ""),
                        s.get("motion_prompt", ""),
                        s.get("negative_prompt", "distorted limbs, blurry, bad anatomy"),
                        s.get("lighting", "Cinematic dramatic lighting"),
                        json.dumps(s.get("character_references", [])),
                        s.get("sound_cue", ""),
                        s.get("dialogue_cue", ""),
                        s.get("created_at", now_iso)
                    ))
            return {**sb_data, "id": sb_id, "updated_at": now_iso}

    def export_video_prompts(
        self,
        storyboard_id: str,
        platform: str = "KLING",
        include_camera_brackets: bool = True,
        include_negative: bool = True
    ) -> Dict[str, Any]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM video_storyboards WHERE id = ?", (storyboard_id,))
            sb = cursor.fetchone()
            if not sb:
                return {"error": "分镜工程不存在"}
            cursor.execute("SELECT * FROM video_shots WHERE storyboard_id = ? ORDER BY shot_number ASC", (storyboard_id,))
            shot_rows = cursor.fetchall()
            
            shots = []
            for s in shot_rows:
                shots.append({
                    "shot_number": s["shot_number"],
                    "duration": s["duration_seconds"],
                    "shot_type": s["shot_type"],
                    "camera": s["camera_movement"],
                    "visual": s["visual_prompt"],
                    "motion": s["motion_prompt"],
                    "negative": s["negative_prompt"],
                    "lighting": s["lighting"],
                    "sound": s["sound_cue"],
                    "dialogue": s["dialogue_cue"]
                })

            total_dur = sum(s["duration"] for s in shots)

            if platform.upper() == "KLING":
                # 快手可灵标准 JSON 批处理格式
                payload = {
                    "generator": "NovManager-Cinematic-Engine",
                    "model_target": "Kling-v1.5-Pro",
                    "aspect_ratio": sb["aspect_ratio"],
                    "shots_sequence": [
                        {
                            "shot_index": s["shot_number"],
                            "duration_sec": s["duration"],
                            "camera_movement": s["camera"].lower(),
                            "prompt": f"{s['visual']} | {s['motion']} | {s['lighting']}",
                            "negative_prompt": s["negative"] if include_negative else ""
                        }
                        for s in shots
                    ]
                }
                formatted = json.dumps(payload, ensure_ascii=False, indent=2)

            elif platform.upper() == "SORA":
                # OpenAI Sora 电影序列表格与时间轴格式
                seq = []
                cum_time = 0
                for s in shots:
                    start_t = f"{cum_time // 60:02d}:{cum_time % 60:02d}"
                    cum_time += s["duration"]
                    end_t = f"{cum_time // 60:02d}:{cum_time % 60:02d}"
                    seq.append({
                        "shot_id": f"Shot-{s['shot_number']:02d}",
                        "timestamp": f"{start_t} - {end_t}",
                        "visual_description": s["visual"],
                        "camera_direction": s["camera"],
                        "cinematography_lighting": s["lighting"],
                        "audio_sfx_cue": s["sound"],
                        "dialogue": s["dialogue"]
                    })
                formatted = json.dumps({"project": sb["title"], "sequence": seq}, ensure_ascii=False, indent=2)

            elif platform.upper() == "RUNWAY_GEN3":
                # Runway Gen-3 Alpha Bracket 语法
                lines = []
                for s in shots:
                    cam_bracket = f"[Camera: {s['camera'].replace('_', ' ').title()}] " if include_camera_brackets else ""
                    line = f"Shot {s['shot_number']} ({s['duration']}s): {cam_bracket}{s['visual']}. {s['motion']}. Lighting: {s['lighting']} --ar {sb['aspect_ratio']}"
                    lines.append(line)
                formatted = "\n\n".join(lines)

            elif platform.upper() == "MIDJOURNEY":
                # Midjourney / FLUX 关键帧原画提示词列表
                lines = []
                for s in shots:
                    line = f"/imagine prompt: cinematic keyframe, shot {s['shot_number']}, {s['visual']}, {s['lighting']}, shot type: {s['shot_type'].lower()} --ar {sb['aspect_ratio']} --style raw --v 6.1 --s 250"
                    lines.append(line)
                formatted = "\n\n".join(lines)

            else:
                # 默认通用多模态批处理格式
                lines = [f"【{sb['title']} - 影视分镜生成指令集】\n"]
                for s in shots:
                    lines.append(f"--- 镜头 {s['shot_number']} [{s['duration']}秒 | {s['shot_type']} | {s['camera']}] ---")
                    lines.append(f"画面描述: {s['visual']}")
                    if s['motion']:
                        lines.append(f"动态演变: {s['motion']}")
                    lines.append(f"光影视效: {s['lighting']}")
                    if s['dialogue']:
                        lines.append(f"对白台词: {s['dialogue']}")
                    if s['sound']:
                        lines.append(f"环境音效: {s['sound']}\n")
                formatted = "\n".join(lines)

            return {
                "platform": platform,
                "formatted_content": formatted,
                "shots_count": len(shots),
                "total_duration": total_dur,
                "metadata": {
                    "title": sb["title"],
                    "aspect_ratio": sb["aspect_ratio"]
                }
            }

    # ==================== 工作流编排、上帝全知视角与副本演进 ====================

    def get_workflow_pipeline(self, novel_id: str) -> Dict[str, Any]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM workflow_pipelines WHERE novel_id = ?", (novel_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "novel_id": row["novel_id"],
                    "title": row["title"],
                    "nodes": json.loads(row["nodes_json"]),
                    "active_node_id": row["active_node_id"],
                    "updated_at": row["updated_at"]
                }
            # 默认企业级节点流水线
            default_nodes = [
                {"id": "node-1", "name": "天地初辟·世界观创生", "stage": "WORLD_GENESIS", "status": "COMPLETED", "agent_role": "WorldArchitect", "output_summary": "已构筑天元神域法则与三千秘境设定"},
                {"id": "node-2", "name": "命运网络·人设图谱编织", "stage": "OUTLINE", "status": "COMPLETED", "agent_role": "Dramaturg", "output_summary": "16名核心主配角状态机与亲疏羁绊成型"},
                {"id": "node-3", "name": "因果宏纲·卷章大纲解构", "stage": "OUTLINE", "status": "COMPLETED", "agent_role": "Director", "output_summary": "第一卷全13章三幕式戏剧节奏拟合完成"},
                {"id": "node-4", "name": "视肉生香·正文逐幕执笔", "stage": "DRAFT", "status": "RUNNING", "agent_role": "LeadAuthor", "output_summary": "第13章决战幕草稿实时推演中"},
                {"id": "node-5", "name": "道心鉴真·战力因果稽查", "stage": "CONSISTENCY_AUDIT", "status": "PENDING", "agent_role": "ContinuityGuard", "output_summary": "待正文完成后自动启动全量扫描"},
                {"id": "node-6", "name": "光影造化·影视分镜生成", "stage": "VIDEO_STORYBOARD", "status": "PENDING", "agent_role": "Cinematographer", "output_summary": "生成可灵/Sora/Midjourney跨模型提示词"}
            ]
            pipe_id = f"wf-{novel_id}"
            now_iso = datetime.now().isoformat()
            conn.execute("""
            INSERT INTO workflow_pipelines (id, novel_id, title, nodes_json, active_node_id, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (pipe_id, novel_id, "长篇创作全链路流水线", json.dumps(default_nodes), "node-4", now_iso))
            return {
                "id": pipe_id,
                "novel_id": novel_id,
                "title": "长篇创作全链路流水线",
                "nodes": default_nodes,
                "active_node_id": "node-4",
                "updated_at": now_iso
            }

    def get_gods_eye_state(self, novel_id: str) -> Dict[str, Any]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM gods_eye_states WHERE novel_id = ?", (novel_id,))
            row = cursor.fetchone()
            if row:
                return {
                    "novel_id": row["novel_id"],
                    "current_era": row["current_era"],
                    "celestial_anomalies": row["celestial_anomalies"],
                    "macro_crisis_countdown_days": row["macro_crisis_countdown_days"],
                    "offscreen_factions": json.loads(row["offscreen_factions_json"]),
                    "global_tension_index": row["global_tension_index"]
                }
            # 默认宏观上帝视角状态
            default_factions = [
                {"name": "太玄天宗", "leader": "凌虚道尊", "action": "闭宗封锁山门，暗中炼制九阶乾坤戮仙剑阵", "threat_level": "极高"},
                {"name": "九幽魔渊", "leader": "幽天煞祖", "action": "魔潮浸染南瞻部洲三万里，倒逼正道结盟", "threat_level": "灭世级"},
                {"name": "星罗商盟", "leader": "万财金仙", "action": "暗中哄抬破境灵丹物价，囤积万年寒晶", "threat_level": "中立博弈"}
            ]
            conn.execute("""
            INSERT INTO gods_eye_states (novel_id, current_era, celestial_anomalies, macro_crisis_countdown_days, offscreen_factions_json, global_tension_index)
            VALUES (?, ?, ?, ?, ?, ?)
            """, (novel_id, "天元三万年·灵气复苏初纪", "太白昼见，九幽冥渊煞气上涌三万里", 49, json.dumps(default_factions), 84.5))
            return {
                "novel_id": novel_id,
                "current_era": "天元三万年·灵气复苏初纪",
                "celestial_anomalies": "太白昼见，九幽冥渊煞气上涌三万里",
                "macro_crisis_countdown_days": 49,
                "offscreen_factions": default_factions,
                "global_tension_index": 84.5
            }

    def list_dungeon_arcs(self, novel_id: str) -> List[Dict[str, Any]]:
        with self._lock, self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM dungeon_arcs WHERE novel_id = ?", (novel_id,))
            rows = cursor.fetchall()
            if rows:
                return [{
                    "id": r["id"],
                    "novel_id": r["novel_id"],
                    "arc_name": r["arc_name"],
                    "location": r["location"],
                    "stage": r["stage"],
                    "danger_level": r["danger_level"],
                    "milestone_gates": json.loads(r["milestone_gates_json"]),
                    "loot_economy": json.loads(r["loot_economy_json"]),
                    "survival_rate": r["survival_rate"]
                } for r in rows]
            # 默认样本副本演进
            sample_arcs = [
                {
                    "id": f"arc-{novel_id}-1",
                    "novel_id": novel_id,
                    "arc_name": "万妖天窟·九层浮屠试炼",
                    "location": "十万大山深处·天窟绝境",
                    "stage": "MID_CHAMBER",
                    "danger_level": 8,
                    "milestone_gates": ["进入天窟外围瘴气沼泽", "破译浮屠古石碑禁制", "击溃镇魂金甲天尸", "夺取天道真灵残卷", "绝命逃离天窟坍塌"],
                    "loot_economy": {"gained": ["玄阴幽水", "万年菩提子"], "pending": ["天道真灵残卷"]},
                    "survival_rate": 0.35
                },
                {
                    "id": f"arc-{novel_id}-2",
                    "novel_id": novel_id,
                    "arc_name": "九霄封神台·问鼎之战",
                    "location": "天穹之巅·上古仙庭遗址",
                    "stage": "ENTRANCE",
                    "danger_level": 9,
                    "milestone_gates": ["九大仙宗天骄聚首", "登天九万九千阶试炼", "太虚幻境斩心魔", "天命法相决战巅峰"],
                    "loot_economy": {"gained": [], "pending": ["仙庭封神榜残页", "太苍真龙精血"]},
                    "survival_rate": 0.15
                }
            ]
            for a in sample_arcs:
                conn.execute("""
                INSERT INTO dungeon_arcs (id, novel_id, arc_name, location, stage, danger_level, milestone_gates_json, loot_economy_json, survival_rate)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    a["id"], novel_id, a["arc_name"], a["location"], a["stage"], a["danger_level"],
                    json.dumps(a["milestone_gates"]), json.dumps(a["loot_economy"]), a["survival_rate"]
                ))
            return sample_arcs
