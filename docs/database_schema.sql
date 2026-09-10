-- ==============================================================================
-- NovManager 数据库结构定义 (PostgreSQL 16+ with pgvector)
-- 专为长篇小说结构化管理与 Multi-Agent 创作协同设计
-- ==============================================================================

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ------------------------------------------------------------------------------
-- 1. 小说主表 (Novels)
-- ------------------------------------------------------------------------------
CREATE TABLE novels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    genre VARCHAR(64) NOT NULL,                      -- 题材: 玄幻, 科幻, 悬疑, 都市等
    target_word_count INT DEFAULT 1000000,          -- 目标字数
    default_pov VARCHAR(32) DEFAULT 'THIRD_LIMITED',-- 默认叙事视角: FIRST, THIRD_LIMITED, THIRD_OMNISCIENT
    style_guide JSONB DEFAULT '{
        "tone": "严肃简练",
        "pacing": "快节奏",
        "description_density": "适中",
        "forbidden_phrases": []
    }'::jsonb,                                       -- 全书文风指南
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- 2. 世界观与法则设定库 (World Settings)
-- ------------------------------------------------------------------------------
CREATE TABLE world_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    category VARCHAR(64) NOT NULL,                   -- 分类: POWER_SYSTEM, GEOGRAPHY, FACTION, ITEM, RULE
    name VARCHAR(128) NOT NULL,                     -- 设定条目名称 (如: '九转金丹', '太虚剑宗')
    aliases TEXT[] DEFAULT '{}',                    -- 别名/简称
    content TEXT NOT NULL,                          -- 完整描述与运行法则
    priority INT DEFAULT 50,                        -- 优先级权重 (0-100)
    embedding vector(1536),                         -- 设定语义向量 (用于 RAG 检索)
    metadata JSONB DEFAULT '{}'::jsonb,             -- 扩展属性 (如: 境界层级, 宗门等级)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_world_settings_novel_category ON world_settings(novel_id, category);
CREATE INDEX idx_world_settings_embedding ON world_settings USING hnsw (embedding vector_cosine_ops);

-- ------------------------------------------------------------------------------
-- 3. 角色静态人设表 (Characters)
-- ------------------------------------------------------------------------------
CREATE TABLE characters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    role_type VARCHAR(32) NOT NULL,                 -- 角色定位: PROTAGONIST, ANTAGONIST, SUPPORTING, NPC
    gender VARCHAR(16),
    profile JSONB NOT NULL DEFAULT '{
        "appearance": "",
        "personality_traits": [],
        "voice_and_tone": "",
        "core_motivation": "",
        "fatal_flaw": "",
        "catchphrases": []
    }'::jsonb,                                      -- 静态人设 (外貌、口癖、致命缺陷等)
    background TEXT,                                -- 背景生平故事
    embedding vector(1536),                         -- 人物画像向量
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_characters_novel ON characters(novel_id);

-- ------------------------------------------------------------------------------
-- 4. 角色关系拓扑表 (Character Relations)
-- ------------------------------------------------------------------------------
CREATE TABLE character_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    from_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    to_character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    relation_type VARCHAR(64) NOT NULL,             -- 关系: 师徒, 宿敌, 恋人, 盟友, 仇人
    affinity_score INT DEFAULT 0,                   -- 好感度/羁绊值 (-100 到 100)
    description TEXT,                               -- 关系描述及动态变化注记
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_character_pair UNIQUE (novel_id, from_character_id, to_character_id)
);

-- ------------------------------------------------------------------------------
-- 5. 分卷与章节树 (Volumes & Chapters)
-- ------------------------------------------------------------------------------
CREATE TABLE volumes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    volume_index INT NOT NULL,                      -- 卷序号 (第 1 卷...)
    title VARCHAR(255) NOT NULL,
    main_conflict TEXT,                             -- 本卷核心冲突
    target_climax TEXT,                             -- 本卷预期高潮
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_volumes_novel_index ON volumes(novel_id, volume_index);

CREATE TABLE chapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    volume_id UUID NOT NULL REFERENCES volumes(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    chapter_index INT NOT NULL,                     -- 章节序号
    title VARCHAR(255) NOT NULL,
    outline TEXT NOT NULL,                          -- 本章剧情梗概
    pov_character_id UUID REFERENCES characters(id),-- 本章主叙事视角人物
    word_count_goal INT DEFAULT 3000,
    actual_word_count INT DEFAULT 0,
    status VARCHAR(32) DEFAULT 'PLANNED',           -- PLANNED, SCENED, DRAFTED, REVIEWED, PUBLISHED
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chapters_volume ON chapters(volume_id, chapter_index);
CREATE INDEX idx_chapters_novel ON chapters(novel_id);

-- ------------------------------------------------------------------------------
-- 6. 细粒度分镜场景表 (Scenes)
-- ------------------------------------------------------------------------------
CREATE TABLE scenes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    scene_index INT NOT NULL,                       -- 场次序号 (1, 2, 3...)
    scene_goal TEXT NOT NULL,                       -- 场景目标 (角色想要什么)
    conflict TEXT NOT NULL,                         -- 遭遇阻碍 (戏剧冲突)
    turn_point TEXT,                                -- 转折事件
    outcome TEXT,                                   -- 场景结局 (导致什么新局面)
    involved_character_ids UUID[] DEFAULT '{}',     -- 在场角色 ID 数组
    location VARCHAR(128),                          -- 发生地点
    draft_content TEXT,                             -- 场景正文草稿
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_scenes_chapter ON scenes(chapter_id, scene_index);

-- ------------------------------------------------------------------------------
-- 7. 角色动态状态演进机 (Character States Timeline)
-- ------------------------------------------------------------------------------
CREATE TABLE character_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    character_id UUID NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    location VARCHAR(128),                          -- 当前角色所在地点
    combat_power VARCHAR(64),                       -- 当前战力境界/阶段
    health_status VARCHAR(64) DEFAULT 'HEALTHY',    -- 健康度: HEALTHY, INJURED, CRITICAL, DYING
    status_tags TEXT[] DEFAULT '{}',                -- 标签: ['中毒', '道心破损', '获得斩仙剑']
    state_summary TEXT NOT NULL,                    -- 状态演化摘要
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_char_states_timeline ON character_states(character_id, created_at DESC);

-- ------------------------------------------------------------------------------
-- 8. 伏笔与暗线雷达表 (Foreshadowings)
-- ------------------------------------------------------------------------------
CREATE TABLE foreshadowings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    title VARCHAR(128) NOT NULL,                    -- 伏笔名称 (如: '青铜残片的秘密')
    clue_description TEXT NOT NULL,                 -- 线索细节
    planted_chapter_id UUID REFERENCES chapters(id),-- 埋设章节
    planned_resolve_chapter_id UUID REFERENCES chapters(id), -- 计划揭晓章节
    actual_resolved_chapter_id UUID REFERENCES chapters(id),  -- 实际揭示章节
    status VARCHAR(32) DEFAULT 'PLANTED',           -- PLANTED, FERMENTING, RESOLVED, ABANDONED
    notes TEXT,                                     -- 作者或 Agent 构思批注
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_foreshadowing_status ON foreshadowings(novel_id, status);

-- ------------------------------------------------------------------------------
-- 9. 正文快照与版本控制表 (Manuscript Versions - Git-like VCS)
-- ------------------------------------------------------------------------------
CREATE TABLE manuscript_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    version_number INT NOT NULL,                    -- 递增版本号
    full_text TEXT NOT NULL,                        -- 完整正文内容
    created_by VARCHAR(64) NOT NULL,                -- HUMAN, AGENT:Drafter, AGENT:Stylist
    diff_patch JSONB,                               -- 与上一版本的 Diff 数据
    change_summary TEXT,                            -- 本次变更说明
    inspection_score INT,                           -- 一致性与合规评分 (0-100)
    inspection_report JSONB DEFAULT '[]'::jsonb,    -- 稽查问题详情
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_manuscript_versions ON manuscript_versions(chapter_id, version_number DESC);

-- ------------------------------------------------------------------------------
-- 10. 章节剧情向量摘要库 (Chapter Vector Embeddings - for RAG)
-- ------------------------------------------------------------------------------
CREATE TABLE chapter_embeddings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chapter_id UUID NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
    novel_id UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
    summary_text TEXT NOT NULL,                     -- 章节精简摘要
    embedding vector(1536),                         -- 摘要向量
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chapter_embeddings ON chapter_embeddings USING hnsw (embedding vector_cosine_ops);
