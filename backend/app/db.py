# ==============================================================================
# NovManager PostgreSQL 数据库连接与 ORM 实体映射 (Database & SQLAlchemy Models)
# 支持生产级 PostgreSQL 16+ 与 pgvector 向量检索扩展，支持与 JSON 仓储双向同步
# ==============================================================================

import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime

from sqlalchemy import (
    create_engine,
    Column,
    String,
    Integer,
    Text,
    ForeignKey,
    DateTime,
    text,
    inspect,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, scoped_session

logger = logging.getLogger(__name__)

DEFAULT_DATABASE_URL = "postgresql+psycopg://novadmin:novpassword123@127.0.0.1:5432/novmanager"
DATABASE_URL = os.environ.get("DATABASE_URL", DEFAULT_DATABASE_URL)

Base = declarative_base()

# ------------------------------------------------------------------------------
# 1. SQLAlchemy 实体模型 (1:1 映射系统架构设计文档中的 10 大核心实体)
# ------------------------------------------------------------------------------

class NovelDB(Base):
    __tablename__ = "novels"

    id = Column(String(64), primary_key=True)
    title = Column(String(255), nullable=False)
    subtitle = Column(String(255), default="")
    genre = Column(String(128), default="")
    target_word_count = Column(Integer, default=1000000)
    current_word_count = Column(Integer, default=0)
    default_pov = Column(String(64), default="THIRD_LIMITED")
    style_guide = Column(JSONB, default=dict)
    created_at = Column(String(64), default=lambda: datetime.utcnow().isoformat())
    updated_at = Column(String(64), default=lambda: datetime.utcnow().isoformat())

    # 关系映射
    volumes = relationship("VolumeDB", back_populates="novel", cascade="all, delete-orphan")
    characters = relationship("CharacterDB", back_populates="novel", cascade="all, delete-orphan")
    world_settings = relationship("WorldSettingDB", back_populates="novel", cascade="all, delete-orphan")
    foreshadowings = relationship("ForeshadowingDB", back_populates="novel", cascade="all, delete-orphan")
    character_relations = relationship("CharacterRelationDB", back_populates="novel", cascade="all, delete-orphan")


class WorldSettingDB(Base):
    __tablename__ = "world_settings"

    id = Column(String(64), primary_key=True)
    novel_id = Column(String(64), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(64), nullable=False)
    name = Column(String(255), nullable=False)
    aliases = Column(JSONB, default=list)
    content = Column(Text, nullable=False)
    priority = Column(Integer, default=50)
    tags = Column(JSONB, default=list)

    novel = relationship("NovelDB", back_populates="world_settings")


class CharacterDB(Base):
    __tablename__ = "characters"

    id = Column(String(64), primary_key=True)
    novel_id = Column(String(64), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(128), nullable=False)
    role_type = Column(String(64), default="SUPPORTING")
    gender = Column(String(32), default="男")
    profile = Column(JSONB, default=dict)
    background = Column(Text, default="")
    created_at = Column(String(64), default=lambda: datetime.utcnow().isoformat())

    novel = relationship("NovelDB", back_populates="characters")
    states = relationship("CharacterStateDB", back_populates="character", cascade="all, delete-orphan")


class CharacterStateDB(Base):
    __tablename__ = "character_states"

    id = Column(String(64), primary_key=True)
    character_id = Column(String(64), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    chapter_id = Column(String(64), default="")
    chapter_index = Column(Integer, default=1)
    location = Column(String(255), default="")
    combat_power = Column(String(128), default="")
    health_status = Column(String(64), default="HEALTHY")
    status_tags = Column(JSONB, default=list)
    state_summary = Column(Text, default="")
    updated_at = Column(String(64), default=lambda: datetime.utcnow().isoformat())

    character = relationship("CharacterDB", back_populates="states")


class CharacterRelationDB(Base):
    __tablename__ = "character_relations"

    id = Column(String(64), primary_key=True)
    novel_id = Column(String(64), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    from_character_id = Column(String(64), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    to_character_id = Column(String(64), ForeignKey("characters.id", ondelete="CASCADE"), nullable=False)
    relation_type = Column(String(64), default="")
    affinity_score = Column(Integer, default=0)
    description = Column(Text, default="")

    novel = relationship("NovelDB", back_populates="character_relations")


class VolumeDB(Base):
    __tablename__ = "volumes"

    id = Column(String(64), primary_key=True)
    novel_id = Column(String(64), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    volume_index = Column(Integer, default=1)
    title = Column(String(255), default="")
    summary = Column(Text, default="")
    main_conflict = Column(Text, default="")
    target_climax = Column(Text, default="")
    boundary_constraints = Column(Text, default="")

    novel = relationship("NovelDB", back_populates="volumes")
    chapters = relationship("ChapterDB", back_populates="volume", cascade="all, delete-orphan", order_by="ChapterDB.chapter_index")


class ChapterDB(Base):
    __tablename__ = "chapters"

    id = Column(String(64), primary_key=True)
    volume_id = Column(String(64), ForeignKey("volumes.id", ondelete="CASCADE"), nullable=False)
    novel_id = Column(String(64), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    chapter_index = Column(Integer, nullable=False)
    title = Column(String(255), default="")
    outline = Column(Text, default="")
    pov_character_id = Column(String(64), nullable=True)
    word_count_goal = Column(Integer, default=3000)
    actual_word_count = Column(Integer, default=0)
    status = Column(String(64), default="PLANNED")

    volume = relationship("VolumeDB", back_populates="chapters")
    scenes = relationship("SceneDB", back_populates="chapter", cascade="all, delete-orphan", order_by="SceneDB.scene_index")


class SceneDB(Base):
    __tablename__ = "scenes"

    id = Column(String(64), primary_key=True)
    chapter_id = Column(String(64), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    scene_index = Column(Integer, nullable=False)
    scene_goal = Column(Text, default="")
    conflict = Column(Text, default="")
    turn_point = Column(Text, default="")
    outcome = Column(Text, default="")
    involved_character_ids = Column(JSONB, default=list)
    location = Column(String(255), default="")
    draft_content = Column(Text, default="")
    agent_notes = Column(Text, default="")

    chapter = relationship("ChapterDB", back_populates="scenes")


class ForeshadowingDB(Base):
    __tablename__ = "foreshadowings"

    id = Column(String(64), primary_key=True)
    novel_id = Column(String(64), ForeignKey("novels.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), default="")
    clue_description = Column(Text, default="")
    planted_chapter_id = Column(String(64), default="")
    planted_chapter_index = Column(Integer, default=1)
    planned_resolve_chapter_index = Column(Integer, default=10)
    resolved_chapter_id = Column(String(64), nullable=True)
    status = Column(String(64), default="PLANTED")

    novel = relationship("NovelDB", back_populates="foreshadowings")


class ManuscriptVersionDB(Base):
    __tablename__ = "manuscript_versions"

    id = Column(String(64), primary_key=True)
    chapter_id = Column(String(64), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False)
    scene_id = Column(String(64), nullable=True)
    version_number = Column(Integer, default=1)
    full_text = Column(Text, default="")
    created_by = Column(String(64), default="Human")
    diff_summary = Column(JSONB, default=dict)
    created_at = Column(String(64), default=lambda: datetime.utcnow().isoformat())


# ------------------------------------------------------------------------------
# 2. 数据库连接管理与会话工厂
# ------------------------------------------------------------------------------

class DatabaseManager:
    _engine = None
    _session_factory = None

    @classmethod
    def get_engine(cls, url: Optional[str] = None):
        if cls._engine is None:
            target_url = url or DATABASE_URL
            try:
                cls._engine = create_engine(
                    target_url,
                    pool_size=10,
                    max_overflow=20,
                    pool_pre_ping=True,
                    echo=False,
                )
            except Exception as e:
                logger.error(f"PostgreSQL 引擎创建失败: {e}")
                return None
        return cls._engine

    @classmethod
    def get_session(cls):
        if cls._session_factory is None:
            engine = cls.get_engine()
            if engine is None:
                return None
            cls._session_factory = scoped_session(sessionmaker(bind=engine))
        return cls._session_factory()

    @classmethod
    def check_health(cls) -> Dict[str, Any]:
        """检查数据库连通性及 pgvector 扩展就绪情况"""
        try:
            engine = cls.get_engine()
            if engine is None:
                return {"connected": False, "error": "Engine initialization failed"}
            with engine.connect() as conn:
                res = conn.execute(text("SELECT version();")).scalar()
                vec_res = conn.execute(
                    text("SELECT count(*) FROM pg_extension WHERE extname = 'vector';")
                ).scalar()
                has_vector = bool(vec_res and vec_res > 0)
                
                # 统计已存作品数
                has_table = inspect(engine).has_table("novels")
                novels_count = 0
                if has_table:
                    novels_count = conn.execute(text("SELECT count(*) FROM novels;")).scalar() or 0

                return {
                    "connected": True,
                    "version": res.split(",")[0] if res else "PostgreSQL",
                    "pgvector_enabled": has_vector,
                    "tables_initialized": has_table,
                    "novels_count": novels_count,
                }
        except Exception as e:
            return {"connected": False, "error": str(e)}

    @classmethod
    def init_schema(cls) -> bool:
        """初始化数据表结构，自动创建 pgvector 扩展及所有关系表"""
        try:
            engine = cls.get_engine()
            if engine is None:
                return False
            with engine.connect() as conn:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
                conn.commit()

            Base.metadata.create_all(bind=engine)
            logger.info("PostgreSQL 所有领域实体数据表已成功就绪！")
            return True
        except Exception as e:
            logger.error(f"初始化 PostgreSQL 表结构失败: {e}")
            return False

    @classmethod
    def sync_from_json(cls, json_data: Dict[str, Any]) -> bool:
        """将 JSON 仓储中的全量小说、设定、角色、大纲及正文无缝同步写入 PostgreSQL"""
        session = cls.get_session()
        if session is None:
            return False

        try:
            cls.init_schema()

            def to_items_list(obj):
                if isinstance(obj, dict):
                    return list(obj.values())
                if isinstance(obj, list):
                    return obj
                return []

            # 1. 同步作品主表
            for n in to_items_list(json_data.get("novels")):
                nid = n.get("id")
                if not nid:
                    continue
                existing = session.query(NovelDB).filter_by(id=nid).first()
                if not existing:
                    existing = NovelDB(id=nid)
                    session.add(existing)
                existing.title = n.get("title", "")
                existing.subtitle = n.get("subtitle", "")
                existing.genre = n.get("genre", "")
                existing.target_word_count = n.get("target_word_count", 1000000)
                existing.current_word_count = n.get("current_word_count", 0)
                existing.default_pov = n.get("default_pov", "THIRD_LIMITED")
                existing.style_guide = n.get("style_guide", {})
                existing.created_at = n.get("created_at", datetime.utcnow().isoformat())
                existing.updated_at = n.get("updated_at", datetime.utcnow().isoformat())

            session.flush()

            # 2. 同步世界观设定
            for w in to_items_list(json_data.get("world_settings")):
                wid = w.get("id")
                if not wid:
                    continue
                existing_w = session.query(WorldSettingDB).filter_by(id=wid).first()
                if not existing_w:
                    existing_w = WorldSettingDB(id=wid)
                    session.add(existing_w)
                existing_w.novel_id = w.get("novel_id", "nov-001")
                existing_w.category = w.get("category", "RULE")
                existing_w.name = w.get("name", "")
                existing_w.aliases = w.get("aliases", [])
                existing_w.content = w.get("content", "")
                existing_w.priority = w.get("priority", 50)
                existing_w.tags = w.get("tags", [])

            # 3. 同步角色档案与动态状态
            for c in to_items_list(json_data.get("characters")):
                cid = c.get("id")
                if not cid:
                    continue
                existing_c = session.query(CharacterDB).filter_by(id=cid).first()
                if not existing_c:
                    existing_c = CharacterDB(id=cid)
                    session.add(existing_c)
                existing_c.novel_id = c.get("novel_id", "nov-001")
                existing_c.name = c.get("name", "")
                existing_c.role_type = c.get("role_type", "SUPPORTING")
                existing_c.gender = c.get("gender", "男")
                existing_c.profile = c.get("profile", {})
                existing_c.background = c.get("background", "")
                existing_c.created_at = c.get("created_at", datetime.utcnow().isoformat())

            session.flush()

            # 4. 同步人物状态演进
            for cs in to_items_list(json_data.get("character_states")):
                csid = cs.get("id")
                char_id = cs.get("character_id")
                if not csid or not char_id or not session.query(CharacterDB).filter_by(id=char_id).first():
                    continue
                existing_cs = session.query(CharacterStateDB).filter_by(id=csid).first()
                if not existing_cs:
                    existing_cs = CharacterStateDB(id=csid)
                    session.add(existing_cs)
                existing_cs.character_id = char_id
                existing_cs.chapter_id = cs.get("chapter_id", "")
                existing_cs.chapter_index = cs.get("chapter_index", 1)
                existing_cs.location = cs.get("location", "")
                existing_cs.combat_power = cs.get("combat_power", "")
                existing_cs.health_status = cs.get("health_status", "HEALTHY")
                existing_cs.status_tags = cs.get("status_tags", [])
                existing_cs.state_summary = cs.get("state_summary", "")
                existing_cs.updated_at = cs.get("updated_at", datetime.utcnow().isoformat())

            # 5. 同步大纲分卷、章节、分镜幕
            for v in to_items_list(json_data.get("volumes")):
                vid = v.get("id")
                nid = v.get("novel_id")
                if not vid or not nid or not session.query(NovelDB).filter_by(id=nid).first():
                    continue
                existing_v = session.query(VolumeDB).filter_by(id=vid).first()
                if not existing_v:
                    existing_v = VolumeDB(id=vid)
                    session.add(existing_v)
                existing_v.novel_id = nid
                existing_v.volume_index = v.get("volume_index", 1)
                existing_v.title = v.get("title", "")
                existing_v.summary = v.get("summary", "")
                existing_v.main_conflict = v.get("main_conflict", "")
                existing_v.target_climax = v.get("target_climax", "")
                existing_v.boundary_constraints = v.get("boundary_constraints") or v.get("boundaryConstraints", "")
                session.flush()

                # 章节
                chapters = v.get("chapters", [])
                for chap in to_items_list(chapters):
                    chap_id = chap.get("id")
                    if not chap_id:
                        continue
                    existing_chap = session.query(ChapterDB).filter_by(id=chap_id).first()
                    if not existing_chap:
                        existing_chap = ChapterDB(id=chap_id)
                        session.add(existing_chap)
                    existing_chap.volume_id = vid
                    existing_chap.novel_id = nid
                    existing_chap.chapter_index = chap.get("chapter_index", 1)
                    existing_chap.title = chap.get("title", "")
                    existing_chap.outline = chap.get("outline", "")
                    existing_chap.pov_character_id = chap.get("pov_character_id")
                    existing_chap.word_count_goal = chap.get("word_count_goal", 3000)
                    existing_chap.actual_word_count = chap.get("actual_word_count", 0)
                    existing_chap.status = chap.get("status", "PLANNED")
                    session.flush()

                    # 分镜场景幕
                    scenes = chap.get("scenes", [])
                    for sc in to_items_list(scenes):
                        sc_id = sc.get("id")
                        if not sc_id:
                            continue
                        existing_sc = session.query(SceneDB).filter_by(id=sc_id).first()
                        if not existing_sc:
                            existing_sc = SceneDB(id=sc_id)
                            session.add(existing_sc)
                        existing_sc.chapter_id = chap_id
                        existing_sc.scene_index = sc.get("scene_index", 1)
                        existing_sc.scene_goal = sc.get("scene_goal", "")
                        existing_sc.conflict = sc.get("conflict", "")
                        existing_sc.turn_point = sc.get("turn_point", "")
                        existing_sc.outcome = sc.get("outcome", "")
                        existing_sc.involved_character_ids = sc.get("involved_character_ids", [])
                        existing_sc.location = sc.get("location", "")
                        existing_sc.draft_content = sc.get("draft_content", "")
                        existing_sc.agent_notes = sc.get("agent_notes", "")

            # 6. 同步伏笔
            for f in to_items_list(json_data.get("foreshadowings")):
                fid = f.get("id")
                nid = f.get("novel_id")
                if not fid or not nid or not session.query(NovelDB).filter_by(id=nid).first():
                    continue
                existing_f = session.query(ForeshadowingDB).filter_by(id=fid).first()
                if not existing_f:
                    existing_f = ForeshadowingDB(id=fid)
                    session.add(existing_f)
                existing_f.novel_id = nid
                existing_f.title = f.get("title", "")
                existing_f.clue_description = f.get("clue_description", "")
                existing_f.planted_chapter_id = f.get("planted_chapter_id", "")
                existing_f.planted_chapter_index = f.get("planted_chapter_index", 1)
                existing_f.planned_resolve_chapter_index = f.get("planned_resolve_chapter_index", 10)
                existing_f.resolved_chapter_id = f.get("resolved_chapter_id")
                existing_f.status = f.get("status", "PLANTED")

            # 7. 同步版本分支历史
            versions_data = json_data.get("versions") or json_data.get("manuscript_versions", [])
            for ver in to_items_list(versions_data):
                ver_id = ver.get("id")
                chap_id = ver.get("chapter_id")
                if not ver_id or not chap_id or not session.query(ChapterDB).filter_by(id=chap_id).first():
                    continue
                existing_ver = session.query(ManuscriptVersionDB).filter_by(id=ver_id).first()
                if not existing_ver:
                    existing_ver = ManuscriptVersionDB(id=ver_id)
                    session.add(existing_ver)
                existing_ver.chapter_id = chap_id
                existing_ver.scene_id = ver.get("scene_id")
                existing_ver.version_number = ver.get("version_number", 1)
                existing_ver.full_text = ver.get("full_text", "")
                existing_ver.created_by = ver.get("created_by", "Human")
                existing_ver.diff_summary = ver.get("change_summary") or ver.get("diff_summary", {})
                existing_ver.created_at = ver.get("created_at", datetime.utcnow().isoformat())

            # 8. 同步人物羁绊关系网络
            for cr in to_items_list(json_data.get("character_relations")):
                crid = cr.get("id")
                nid = cr.get("novel_id")
                from_id = cr.get("from_character_id")
                to_id = cr.get("to_character_id")
                if not crid or not nid or not from_id or not to_id:
                    continue
                if not session.query(NovelDB).filter_by(id=nid).first():
                    continue
                if not session.query(CharacterDB).filter_by(id=from_id).first() or not session.query(CharacterDB).filter_by(id=to_id).first():
                    continue
                existing_cr = session.query(CharacterRelationDB).filter_by(id=crid).first()
                if not existing_cr:
                    existing_cr = CharacterRelationDB(id=crid)
                    session.add(existing_cr)
                existing_cr.novel_id = nid
                existing_cr.from_character_id = from_id
                existing_cr.to_character_id = to_id
                existing_cr.relation_type = cr.get("relation_type", "")
                existing_cr.affinity_score = cr.get("affinity_score", 0)
                existing_cr.description = cr.get("description", "")

            session.commit()
            logger.info("JSON 数据到 PostgreSQL 全量同步成功！")
            return True
        except Exception as e:
            session.rollback()
            logger.error(f"同步 JSON 到 PostgreSQL 出现异常: {e}")
            return False
        finally:
            session.close()
