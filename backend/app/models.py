# ==============================================================================
# NovManager 核心数据模型 (Pydantic Models)
# 对应结构化小说管理、状态机与 Agent 协同数据契约
# ==============================================================================

from typing import List, Optional, Dict, Any, Literal
from pydantic import BaseModel, Field
from datetime import datetime

RoleType = Literal['PROTAGONIST', 'ANTAGONIST', 'SUPPORTING', 'NPC']
ChapterStatus = Literal['PLANNED', 'SCENED', 'DRAFTED', 'REVIEWED', 'PUBLISHED']
ForeshadowingStatus = Literal['PLANTED', 'FERMENTING', 'RESOLVED', 'ABANDONED']
LoreCategory = Literal['POWER_SYSTEM', 'GEOGRAPHY', 'FACTION', 'ITEM', 'RULE']
HealthStatus = Literal['HEALTHY', 'INJURED', 'CRITICAL', 'DYING']

class StyleGuide(BaseModel):
    tone: str = "冷峻克制，重智斗博弈，重因果逻辑"
    pacing: str = "张弛有度，高潮利落"
    description_density: str = "适中"
    forbidden_phrases: List[str] = Field(default_factory=lambda: ["恐怖如斯", "倒吸一口凉气", "桀桀怪笑"])

class Novel(BaseModel):
    id: str
    title: str
    subtitle: Optional[str] = ""
    genre: str
    target_word_count: int = 1000000
    current_word_count: int = 0
    default_pov: str = "THIRD_LIMITED"
    style_guide: StyleGuide = Field(default_factory=StyleGuide)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class WorldSetting(BaseModel):
    id: str
    novel_id: str
    category: LoreCategory
    name: str
    aliases: List[str] = Field(default_factory=list)
    content: str
    priority: int = 50
    tags: List[str] = Field(default_factory=list)

class CharacterProfile(BaseModel):
    identity: Optional[str] = ""
    appearance: str = ""
    personality_traits: List[str] = Field(default_factory=list)
    voice_and_tone: str = ""
    core_motivation: str = ""
    fatal_flaw: str = ""
    catchphrases: List[str] = Field(default_factory=list)

class Character(BaseModel):
    id: str
    novel_id: str
    name: str
    role_type: RoleType
    gender: str = "男"
    profile: CharacterProfile = Field(default_factory=CharacterProfile)
    background: str = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class CharacterState(BaseModel):
    id: str
    character_id: str
    chapter_id: str
    chapter_index: int = 1
    location: str
    combat_power: str
    health_status: HealthStatus = "HEALTHY"
    status_tags: List[str] = Field(default_factory=list)
    state_summary: str
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class CharacterRelation(BaseModel):
    id: str
    novel_id: str
    from_character_id: str
    to_character_id: str
    relation_type: str
    affinity_score: int = 0
    description: str = ""

class Scene(BaseModel):
    id: str
    chapter_id: str
    scene_index: int
    scene_goal: str
    conflict: str
    turn_point: str
    outcome: str
    involved_character_ids: List[str] = Field(default_factory=list)
    location: str = ""
    draft_content: str = ""
    agent_notes: Optional[str] = ""

class Chapter(BaseModel):
    id: str
    volume_id: str
    novel_id: str
    chapter_index: int
    title: str
    outline: str
    pov_character_id: Optional[str] = None
    word_count_goal: int = 3000
    actual_word_count: int = 0
    status: ChapterStatus = "PLANNED"
    scenes: List[Scene] = Field(default_factory=list)

class Volume(BaseModel):
    id: str
    novel_id: str
    volume_index: int
    title: str
    summary: Optional[str] = ""
    main_conflict: str = ""
    target_climax: str = ""
    boundary_constraints: Optional[str] = ""
    chapters: List[Chapter] = Field(default_factory=list)

class Foreshadowing(BaseModel):
    id: str
    novel_id: str
    title: str
    clue_description: str
    planted_chapter_id: str
    planted_chapter_index: Optional[int] = None
    planned_resolve_chapter_id: Optional[str] = None
    planned_resolve_chapter_index: Optional[int] = None
    actual_resolved_chapter_id: Optional[str] = None
    status: ForeshadowingStatus = "PLANTED"
    notes: Optional[str] = ""

class InspectionIssue(BaseModel):
    id: str
    issue_type: Literal['SETTING_VIOLATION', 'OOC', 'PLOT_HOLE', 'TYPO']
    severity: Literal['CRITICAL', 'WARNING', 'SUGGESTION']
    location_snippet: str
    explanation: str
    fix_advice: str

class ManuscriptVersion(BaseModel):
    id: str
    chapter_id: str
    version_number: int
    full_text: str
    created_by: str
    change_summary: str = ""
    inspection_score: Optional[int] = 100
    inspection_report: List[InspectionIssue] = Field(default_factory=list)
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

# ----------------- 请求与响应模型 -----------------

class SaveSceneDraftRequest(BaseModel):
    novel_id: str
    chapter_id: str
    scene_index: int
    content: str
    agent_notes: Optional[str] = ""
    created_by: Optional[str] = "Agent:Writer"

class UpdateCharacterStateRequest(BaseModel):
    character_id: str
    chapter_id: str
    chapter_index: Optional[int] = None
    location: Optional[str] = None
    combat_power: Optional[str] = None
    health_status: Optional[HealthStatus] = None
    status_tags: Optional[List[str]] = None
    state_summary: str

class CheckConsistencyRequest(BaseModel):
    novel_id: str
    draft_text: str
    involved_character_ids: Optional[List[str]] = Field(default_factory=list)

class RecordForeshadowingRequest(BaseModel):
    novel_id: str
    title: str
    clue_description: str
    planted_chapter_id: str
    planned_resolve_chapter_id: Optional[str] = None
    planned_resolve_chapter_index: Optional[int] = None
    notes: Optional[str] = ""

class PolishTechnique(BaseModel):
    id: Optional[str] = None
    novel_id: Optional[str] = None
    chapter_id: Optional[str] = None
    name: str
    category: str = "PACING"
    category_label: str = "节奏张力"
    description: str = ""
    before_snippet: Optional[str] = ""
    after_snippet: Optional[str] = ""
    applicable_scene: Optional[str] = ""
    applied_count: int = 1
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class SaveTechniquesRequest(BaseModel):
    novel_id: str
    chapter_id: Optional[str] = None
    techniques: List[PolishTechnique]

# ==================== 影视级 AI 视频分镜与跨模型工业级导出 ====================

ShotType = Literal['EXTREME_CLOSE_UP', 'CLOSE_UP', 'MEDIUM', 'WIDE', 'AERIAL']
CameraMovement = Literal['DOLLY_IN', 'DOLLY_OUT', 'PAN_LEFT', 'PAN_RIGHT', 'TRACKING', 'ORBIT', 'VERTIGO_ZOOM', 'STATIC']
VideoPlatform = Literal['SORA', 'KLING', 'RUNWAY_GEN3', 'HAILUO_MINIMAX', 'MIDJOURNEY', 'COMFYUI_JSON']

class VideoShot(BaseModel):
    id: str = Field(default_factory=lambda: f"shot-{int(datetime.utcnow().timestamp() * 1000)}")
    scene_id: Optional[str] = None
    shot_number: int = 1
    duration_seconds: int = 5
    shot_type: ShotType = 'MEDIUM'
    camera_movement: CameraMovement = 'DOLLY_IN'
    visual_prompt: str
    motion_prompt: str = ""
    negative_prompt: str = "distorted limbs, blurry, low resolution, bad hands, artifacts, flickering, unnatural anatomy"
    lighting: str = "Cinematic volumetric lighting, dramatic shadow contrast"
    character_references: List[str] = Field(default_factory=list)
    sound_cue: Optional[str] = ""
    dialogue_cue: Optional[str] = ""
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class VideoStoryboard(BaseModel):
    id: str = Field(default_factory=lambda: f"sb-{int(datetime.utcnow().timestamp() * 1000)}")
    novel_id: str
    chapter_id: Optional[str] = None
    scene_id: Optional[str] = None
    title: str
    aspect_ratio: str = "16:9"
    target_platform: VideoPlatform = "KLING"
    shots: List[VideoShot] = Field(default_factory=list)
    total_duration_seconds: int = 0
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class ExportVideoPromptRequest(BaseModel):
    storyboard_id: str
    platform: VideoPlatform = "KLING"
    include_camera_brackets: bool = True
    include_negative: bool = True

class ExportVideoPromptResponse(BaseModel):
    platform: str
    formatted_content: str
    shots_count: int
    total_duration: int
    metadata: Dict[str, Any] = Field(default_factory=dict)

# ==================== 全流程创作流水线编排与上帝全知视角 ====================

WorkflowStage = Literal['WORLD_GENESIS', 'OUTLINE', 'BEATS', 'DRAFT', 'CONSISTENCY_AUDIT', 'VIDEO_STORYBOARD']
WorkflowNodeStatus = Literal['PENDING', 'RUNNING', 'COMPLETED', 'FAILED']

class WorkflowNode(BaseModel):
    id: str
    name: str
    stage: WorkflowStage
    status: WorkflowNodeStatus = 'PENDING'
    agent_role: str
    output_summary: Optional[str] = ""

class WorkflowPipeline(BaseModel):
    id: str = Field(default_factory=lambda: f"wf-{int(datetime.utcnow().timestamp() * 1000)}")
    novel_id: str
    title: str
    nodes: List[WorkflowNode] = Field(default_factory=list)
    active_node_id: Optional[str] = None
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())

class GodsEyeState(BaseModel):
    novel_id: str
    current_era: str = "天元三万年·灵气复苏初纪"
    celestial_anomalies: str = "太白昼见，九幽冥渊煞气上涌三万里"
    macro_crisis_countdown_days: int = 49
    offscreen_factions: List[Dict[str, Any]] = Field(default_factory=list)
    global_tension_index: float = 78.5

class DungeonArc(BaseModel):
    id: str = Field(default_factory=lambda: f"arc-{int(datetime.utcnow().timestamp() * 1000)}")
    novel_id: str
    arc_name: str
    location: str
    stage: str = "EXPLORATION"
    danger_level: int = 7
    milestone_gates: List[str] = Field(default_factory=list)
    loot_economy: Dict[str, Any] = Field(default_factory=dict)
    survival_rate: float = 0.45

