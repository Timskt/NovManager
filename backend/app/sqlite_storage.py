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
