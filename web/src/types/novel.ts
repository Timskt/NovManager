// ==============================================================================
// NovManager 核心数据类型定义 (TypeScript Domain Models)
// 支撑结构化小说管理、状态机演进与 Multi-Agent 创作协同
// ==============================================================================

export type RoleType = 'PROTAGONIST' | 'ANTAGONIST' | 'SUPPORTING' | 'NPC';

export type ChapterStatus = 'PLANNED' | 'SCENED' | 'DRAFTED' | 'REVIEWED' | 'PUBLISHED';

export type ForeshadowingStatus = 'PLANTED' | 'FERMENTING' | 'RESOLVED' | 'ABANDONED';

export type LoreCategory = 'POWER_SYSTEM' | 'GEOGRAPHY' | 'FACTION' | 'ITEM' | 'RULE';

export type AgentRole = 'DIRECTOR' | 'DRAFTER' | 'INSPECTOR' | 'STYLIST';

export interface StyleGuide {
  tone: string;
  pacing: string;
  descriptionDensity: string;
  forbiddenPhrases: string[];
}

export interface Novel {
  id: string;
  title: string;
  subtitle: string;
  genre: string;
  targetWordCount: number;
  currentWordCount: number;
  defaultPov: string;
  styleGuide: StyleGuide;
  createdAt: string;
  updatedAt: string;
}

export interface WorldSetting {
  id: string;
  novelId: string;
  category: LoreCategory;
  name: string;
  aliases: string[];
  content: string;
  priority: number; // 0 - 100
  tags: string[];
}

export interface CharacterProfile {
  identity?: string;
  appearance: string;
  personalityTraits: string[];
  voiceAndTone: string;
  coreMotivation: string;
  fatalFlaw: string;
  catchphrases: string[];
}

export interface Character {
  id: string;
  novelId: string;
  name: string;
  roleType: RoleType;
  gender: string;
  profile: CharacterProfile;
  background: string;
  createdAt: string;
}

export interface CharacterState {
  id: string;
  characterId: string;
  chapterId: string;
  chapterIndex: number;
  location: string;
  combatPower: string;
  healthStatus: 'HEALTHY' | 'INJURED' | 'CRITICAL' | 'DYING';
  statusTags: string[];
  stateSummary: string;
  updatedAt: string;
}

/**
 * 核心逻辑：沿故事线章节检索角色的即时快照状态（Time-aware Snapshot）
 * 规则：沿章节时间线回溯，检索 <= targetChapterIndex 且最贴近目标章节的那次状态跃迁
 */
export function getCharacterStateAtChapter(
  states: CharacterState[],
  characterId: string,
  targetChapterIndex?: number
): CharacterState | undefined {
  const charStates = states.filter((s) => s.characterId === characterId);
  if (!charStates.length) return undefined;

  if (targetChapterIndex !== undefined && targetChapterIndex > 0) {
    const validStates = charStates
      .filter((s) => (s.chapterIndex || 1) <= targetChapterIndex)
      .sort((a, b) => (b.chapterIndex || 1) - (a.chapterIndex || 1));
    if (validStates.length > 0) {
      return validStates[0];
    }
    // 目标章节早于该角色首次状态记录（说明截至当前章节尚未登场或未跃迁）
    return undefined;
  }

  // 若未指定章节，默认返回最新的一条
  return [...charStates].sort((a, b) => (b.chapterIndex || 1) - (a.chapterIndex || 1))[0];
}

export interface CharacterRelation {
  id: string;
  novelId: string;
  fromCharacterId: string;
  toCharacterId: string;
  relationType: string;
  affinityScore: number; // -100 to 100
  description: string;
}

export interface Scene {
  id: string;
  chapterId: string;
  sceneIndex: number;
  sceneGoal: string;
  conflict: string;
  turnPoint: string;
  outcome: string;
  involvedCharacterIds: string[];
  location: string;
  draftContent: string;
  agentNotes?: string;
}

export interface Chapter {
  id: string;
  volumeId: string;
  novelId: string;
  chapterIndex: number;
  title: string;
  outline: string;
  povCharacterId?: string;
  wordCountGoal: number;
  actualWordCount: number;
  status: ChapterStatus;
  scenes: Scene[];
}

export interface Volume {
  id: string;
  novelId: string;
  volumeIndex: number;
  title: string;
  summary?: string; // 全卷总体故事梗概与主线走向
  mainConflict: string; // 核心矛盾冲突
  targetClimax: string; // 终局高潮破局
  boundaryConstraints?: string; // 出场边界与防早现约束（严格限制人、物、事、战力天花板）
  chapters: Chapter[];
}

export interface Foreshadowing {
  id: string;
  novelId: string;
  title: string;
  clueDescription: string;
  plantedChapterId?: string;
  plantedChapterIndex?: number;
  plannedResolveChapterId?: string;
  plannedResolveChapterIndex?: number;
  actualResolvedChapterId?: string;
  status: ForeshadowingStatus;
  notes?: string;
}

export interface InspectionIssue {
  id: string;
  issueType: 'SETTING_VIOLATION' | 'OOC' | 'PLOT_HOLE' | 'TYPO';
  severity: 'CRITICAL' | 'WARNING' | 'SUGGESTION';
  locationSnippet: string;
  explanation: string;
  fixAdvice: string;
}

export interface ManuscriptVersion {
  id: string;
  chapterId: string;
  versionNumber: number;
  fullText: string;
  createdBy: string;
  changeSummary: string;
  inspectionScore?: number;
  inspectionReport?: InspectionIssue[];
  createdAt: string;
}

export type LLMProviderType = 'deepseek' | 'opencode' | 'openai_custom' | 'ollama_local';

export interface LLMProviderPreset {
  id: LLMProviderType;
  name: string;
  tag: string;
  endpoint: string;
  defaultModel: string;
  models: string[];
  description: string;
  keyPlaceholder: string;
  docUrl?: string;
}

export interface UserSettings {
  provider: LLMProviderType;
  apiEndpoint: string;
  apiKey: string;
  model: string;
  useMock: boolean;
  temperature: number;
  useBackendProxy?: boolean;
}

export interface NovelSummary {
  id: string;
  title: string;
  genre: string;
  targetWordCount: number;
  currentWordCount: number;
  updatedAt: string;
}

export interface NovelFrameworkData {
  title: string;
  subtitle?: string;
  genre: string;
  logline: string;
  targetWordCount: number;
  styleGuide: StyleGuide;
  worldSettings: Omit<WorldSetting, 'id' | 'novelId'>[];
  characters: {
    character: Omit<Character, 'id' | 'novelId' | 'createdAt'>;
    initialState: Omit<CharacterState, 'id' | 'characterId' | 'updatedAt'>;
  }[];
  volumes: {
    volume: Omit<Volume, 'id' | 'novelId' | 'chapters'>;
    chapters: {
      chapter: Omit<Chapter, 'id' | 'volumeId' | 'novelId' | 'scenes'>;
      scenes: Omit<Scene, 'id' | 'chapterId'>[];
    }[];
  }[];
  foreshadowings: Omit<Foreshadowing, 'id' | 'novelId'>[];
}

export interface PlotBranchOption {
  id: string;
  branchType: 'BLOOD_BATTLE' | 'OUTWIT_STEALTH' | 'UNEXPECTED_TWIST' | 'LORE_OPPORTUNITY' | 'BETRAYAL_CRISIS';
  branchLabel: string; // 标签，如 "绝境血战·斩杀破局"
  title: string; // 拟定的下一章或下一幕标题
  summary: string; // 剧情走向梗概
  conflict: string; // 核心冲突与阻碍
  turnPoint: string; // 关键转折点（出人意料的抉择或事件）
  outcome: string; // 结局与后续悬念钩子
  characterImpact: string; // 角色状态演进与付出的代价
  foreshadowingHint?: string; // 触动的伏笔或新埋设的暗线
  divergenceLevel?: 'LOW' | 'MEDIUM' | 'HIGH'; // 剧情偏离/激进程度
  source?: 'REAL_AI' | 'HEURISTIC'; // 生成源：真实大模型还是本地启发式合成
  modelName?: string; // 若为真实 AI，记录所使用的具体模型名称
}

export interface PlotTreeNode {
  id: string;
  chapterId: string;
  actLevel: number; // 幕次级别：1 (第1幕), 2 (第2幕), 3 (第3幕), 4 (第4幕)...
  parentId: string | null; // 父节点 ID，第 1 幕根节点为 null
  title: string; // 走向或分镜标题
  summary: string; // 剧情走向核心梗概（预览实体卡片默认呈现）
  conflict?: string; // 核心冲突与阻碍
  turnPoint?: string; // 戏剧转折
  outcome?: string; // 最终结局与代价
  characterImpact?: string; // 角色代价与状态演进
  branchType?: 'BLOOD_BATTLE' | 'OUTWIT_STEALTH' | 'UNEXPECTED_TWIST' | 'LORE_OPPORTUNITY' | 'BETRAYAL_CRISIS' | 'DEFAULT';
  branchLabel?: string; // 标签，如 "绝境血战"
  location?: string; // 发生地点
  involvedCharacterIds?: string[]; // 在场登场角色
  draftContent?: string; // 本幕已生成的工笔正文
  wordCount?: number;
  createdAt: number;
}

export type PolishTechniqueCategory = 
  | 'PACING'          // 节奏张力
  | 'ATMOSPHERE'      // 环境意境
  | 'SHOW_DONT_TELL'  // 白描隐喻 / 白描入微
  | 'DIALOGUE'        // 潜台词交锋
  | 'SENSORY'         // 五感通感
  | 'RHETORIC'        // 修辞对偶
  | 'SUSPENSE';       // 悬念钩子

export interface PolishTechnique {
  id?: string;
  novelId?: string;
  chapterId?: string;
  name: string; // 技巧名称，如 "短句卡点强化动作张力"
  category: string; // 英文分类
  categoryLabel: string; // 中文分类标签，如 "节奏张力"
  description: string; // 技巧详细说明
  beforeSnippet?: string; // 改写前代表性片段
  afterSnippet?: string; // 改写后对应片段
  applicableScene?: string; // 适用场景（打斗、对话、悬疑等）
  appliedCount?: number; // 累计采纳合入次数
  createdAt?: string;
  updatedAt?: string;
}

export interface PolishResult {
  polishedText: string;
  techniques: PolishTechnique[];
  summary?: string; // 润色综述
}

export interface PolishTechniqueStats {
  total_techniques: number;
  total_applied_count: number;
  category_distribution: Record<string, number>;
  top_techniques: PolishTechnique[];
}

// ==============================================================================
// 1. 多模型矩阵与高可用容灾路由 (Multi-Model Hub & Resilience Router)
// ==============================================================================

export type ModelProviderType =
  | 'OPENAI'
  | 'ANTHROPIC'
  | 'GEMINI'
  | 'DEEPSEEK'
  | 'SILICONFLOW'
  | 'OLLAMA'
  | 'CUSTOM';

export type ModelCapabilityRole =
  | 'PLANNER'        // 架构总监 / 大纲推演 (DeepSeek-R1 / Claude 3.7 Thinking)
  | 'DRAFTER'        // 执笔起草 (Claude 3.5 Sonnet / GPT-4.5)
  | 'STYLIST'        // 文学精修 / 文风融汇 (Claude 3.5 / DeepSeek V3)
  | 'INSPECTOR'      // 设定稽查 / 战力合规 (Gemini 2.5 Pro)
  | 'VIDEO_DIRECTOR';// 电影级分镜导演 (GPT-4o / Gemini Flash)

export interface ModelProvider {
  id: string;
  name: string;
  providerType: ModelProviderType;
  baseUrl: string;
  apiKeys: string[];
  activeKeyIndex: number;
  supportedModels: string[];
  rpmLimit?: number;
  tpmLimit?: number;
  isEnabled: boolean;
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'QUOTA_EXHAUSTED' | 'OFFLINE';
  latencyMs: number;
  lastCheckedAt: string;
}

export interface ModelRoleAssignment {
  role: ModelCapabilityRole;
  primaryProviderId: string;
  primaryModel: string;
  fallbackProviderId: string;
  fallbackModel: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  timeoutMs: number;
  retryCount: number;
}

export interface ModelTelemetry {
  id: string;
  providerId: string;
  model: string;
  role: ModelCapabilityRole;
  requestType: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  statusCode: number;
  errorMessage?: string;
  timestamp: string;
}

// ==============================================================================
// 2. 文风 DNA 解析与仿生克隆 (Style DNA Extraction & Mimicry)
// ==============================================================================

export interface StyleDnaProfile {
  id: string;
  name: string;
  author: string;
  sourceTitle: string;
  sourceUrl?: string;
  tags: string[];
  sensoryDensity: number;      // 五感通感浓度 (0.0 - 1.0)
  dialogueRatio: number;       // 对白/动作/白描占比 (0.0 - 1.0)
  sentenceVariance: number;    // 句式长短节律方差 (0.0 - 1.0)
  metaphorFrequency: number;   // 隐喻/修辞密度 (0.0 - 1.0)
  pacingVelocity: number;      // 叙事推进推重比 (0.0 - 1.0)
  vocabularyRichness: number;  // 词汇纯度与典雅度 (0.0 - 1.0)
  forbiddenCliches: string[];  // 禁用翻译腔与AI套话
  goldenExemplars: string[];   // 黄金高光典范段落
  promptDirective: string;     // 提炼合成的系统提示指令
  createdAt: string;
}

export interface StyleFusionRequest {
  primaryDnaId: string;
  secondaryDnaId: string;
  blendRatio: number; // 0.0 - 1.0 (例如 0.6 表示 60% 风格 A, 40% 风格 B)
  fusedName: string;
}

// ==============================================================================
// 3. 灵感创世纪大纲生成系统 (Idea-to-Universe Genesis Engine)
// ==============================================================================

export interface IdeaGenesisInput {
  logline: string;
  genre: string;
  targetWordCount: number;
  tone: string;
  coreHook: string;
  tropes: string[];
  goldenFingerType: string;
}

export interface CheatEvolutionNode {
  tier: number;
  name: string;
  unlockCondition: string;
  powerDescription: string;
  sideEffectOrCost: string;
}

export interface MultiverseBranch {
  branchId: string;
  title: string;
  divergencePoint: string;
  summary: string;
  climaxOutcome: string;
  pros: string;
  cons: string;
}

export interface IdeaGenesisResponse {
  novelTitle: string;
  synopsis: string;
  goldenThreeChapters: Array<{
    chapterIndex: number;
    title: string;
    hook: string;
    conflict: string;
    climaxPayoff: string;
    cliffhanger: string;
  }>;
  volumes: Array<{
    volumeIndex: number;
    title: string;
    summary: string;
    mainConflict: string;
    targetClimax: string;
    boundaryConstraints: string;
  }>;
  worldSettings: Array<{
    name: string;
    category: LoreCategory;
    content: string;
  }>;
  mainCharacters: Array<{
    name: string;
    roleType: RoleType;
    appearance: string;
    fatalFlaw: string;
    catchphrases: string[];
    background: string;
  }>;
  cheatSystem: {
    systemName: string;
    coreMechanism: string;
    progressionNodes: CheatEvolutionNode[];
  };
  tensionCurvePreview: number[];
}

// ==============================================================================
// 4. 上帝视角沙盘与追读心理力学 (God's Eye Sandbox & Reader Psychology)
// ==============================================================================

export interface ReaderPsychologyReport {
  novelId: string;
  chapterId?: string;
  anticipationScore: number;     // 期待感/悬念张力值 (0 - 100)
  fatigueRisk: number;           // 疲劳弃书预警度 (0 - 100)
  payoffIndex: number;           // 爽点兑现比 (0 - 100)
  dopamineIntervals: number[];   // 追读快感节拍间歇点 (字数或行数)
  diagnosticAdvice: string[];    // 心理动力学干预建议
}

export interface InformationAsymmetryItem {
  id: string;
  novelId: string;
  secretTitle: string;
  readerKnows: boolean;
  protagonistKnows: boolean;
  antagonistKnows: boolean;
  dramaticIronyScore: number; // 戏剧性讽刺系数 (0.0 - 1.0)
  revelationPlanChapter?: number;
}

export interface OffscreenNewsEvent {
  id: string;
  novelId: string;
  era: string;
  region: string;
  eventSummary: string;
  factionInvolved: string;
  tensionDelta: number;
  timestamp: string;
}

// ==============================================================================
// 5. 商业级 AI 视频分镜故事板 (Commercial AI Video Storyboard)
// ==============================================================================

export type VideoShotType =
  | 'CLOSE_UP'
  | 'MEDIUM'
  | 'WIDE'
  | 'EXTREME_CLOSE_UP'
  | 'AERIAL'
  | 'OVER_THE_SHOULDER';

export type CameraMovement =
  | 'DOLLY_IN'
  | 'DOLLY_OUT'
  | 'PAN_LEFT'
  | 'PAN_RIGHT'
  | 'TRACKING'
  | 'ORBIT'
  | 'VERTIGO_ZOOM'
  | 'STATIC';

export type VideoExportPlatform =
  | 'SORA'
  | 'KLING'
  | 'RUNWAY_GEN3'
  | 'HAILUO_MINIMAX'
  | 'MIDJOURNEY'
  | 'COMFYUI_JSON';

export interface VideoShot {
  id: string;
  sceneId: string;
  shotNumber: number;
  durationSeconds: number;
  shotType: VideoShotType;
  cameraMovement: CameraMovement;
  visualPrompt: string;
  motionPrompt: string;
  negativePrompt: string;
  lighting: string;
  characterReferences: string[];
  soundCue?: string;
  dialogueCue?: string;
  createdAt: string;
}

export interface VideoStoryboard {
  id: string;
  novelId: string;
  chapterId: string;
  sceneId: string;
  title: string;
  aspectRatio: '16:9' | '9:16' | '2.39:1';
  targetPlatform: VideoExportPlatform;
  shots: VideoShot[];
  totalDurationSeconds: number;
  createdAt: string;
  updatedAt: string;
}

// ==============================================================================
// 6. 灵光一现与读者热议共创中枢 (Epiphany Spark Vault & Reader Co-Creation Hub)
// ==============================================================================

export type EpiphanySparkType =
  | 'PLOT_TWIST'         // 神转折脑洞
  | 'DIALOGUE_GOLD'      // 金句台词
  | 'CHARACTER_QUIRK'    // 人设闪光点/反差萌
  | 'LORE_FRAGMENT'      // 世界观设定碎片
  | 'SCENE_IMAGE'        // 极具画面感名场面
  | 'READER_SUGGESTION'; // 读者神评论/听劝脑洞

export type SparkStatus = 'INBOX' | 'ANCHORED' | 'WOVEN' | 'ARCHIVED';

export interface EpiphanySpark {
  id: string;
  novelId: string;
  title: string;
  content: string;
  sparkType: EpiphanySparkType;
  source: 'AUTHOR_BRAINWAVE' | 'READER_COMMENT' | 'AI_COLLISION';
  readerUsername?: string;
  heatScore: number; // 热度/惊艳值 0 - 100
  status: SparkStatus;
  targetChapterIndex?: number;
  targetSceneNote?: string;
  aiWeaveAdvice?: string;
  tags: string[];
  createdAt: string;
}

export interface ReaderDiscussionComment {
  id: string;
  novelId: string;
  chapterIndex: number;
  paragraphSnippet: string;
  readerName: string;
  platform: '起点本章说' | '番茄段评' | '贴吧热议' | '书友群' | 'B站漫评';
  commentText: string;
  likes: number;
  sentiment: 'EXCITED' | 'THEORY_CRAFTING' | 'COMPLAINT_WARNING' | 'MEME_JOKE';
  extractedHook?: string;
  convertedSparkId?: string;
  createdAt: string;
}

export interface SparkCollisionResult {
  sparkAId: string;
  sparkBId: string;
  fusionTitle: string;
  combinedPlotTwist: string;
  dramaticTensionBonus: number;
  recommendedChapterPlacement: string;
  sceneBeatPreview: string;
}

// ==============================================================================
// 7. 全自动无人值守巡航码字机 (Autonomous Marathon Autopilot & Cruise Engine)
// ==============================================================================

export type AutopilotMode =
  | 'ZERO_INPUT_PURE_AUTO'   // 零输入全托管懒人巡航（完全由 AI 根据现有大纲与状态自主续写）
  | 'REFERENCE_GUIDED_AUTO'; // 参考数据投喂半托管巡航（根据作者随手丢入的参考资料/数据自动扩写）

export type AutopilotPacingStrategy =
  | 'HIGH_OCTANE_PAYOFF' // 爽点密集快节奏
  | 'IMMERSIVE_SLOW_BURN'// 细腻铺陈稳健流
  | 'CLIMAX_SHOWDOWN';   // 高潮决战爆发流

export interface AutopilotSessionConfig {
  id: string;
  novelId: string;
  mode: AutopilotMode;
  targetDurationMinutes: number; // 例如 15, 60, 120, 180 分钟
  targetWordCount: number;       // 例如 3000, 10000, 20000 字
  targetChaptersCount: number;   // 连续推演生成章数
  pacingStrategy: AutopilotPacingStrategy;
  referenceDataText?: string;    // 作者提供的参考数据、资料片段或随手提纲（可为空）
  autoUseSkillVault: boolean;    // 自动从技能中心库勾选匹配套路与设定
  autoWeaveSparks: boolean;      // 自动将灵光一现收件箱中的点子织入正文
  autoGitSnapshot: boolean;      // 每完成一幕自动创建 Git 快照
  minQualityThreshold: number;   // 5D 自检最低放行分数 (如 82 分，低于则自动重写)
}

export interface AutopilotStageLog {
  id: string;
  timestamp: string;
  stage: 'CONTEXT_SCAN' | 'SKILL_MATCH' | 'BEAT_PLAN' | 'PROSE_DRAFT' | 'SELF_AUDIT' | 'POLISH_COMMIT';
  title: string;
  detail: string;
  wordsGenerated: number;
  qualityScore?: number;
  matchedSkills?: string[];
  wovenSparks?: string[];
}

export interface AutopilotGeneratedSegment {
  id: string;
  chapterIndex: number;
  chapterTitle: string;
  sceneIndex: number;
  sceneTitle: string;
  content: string;
  wordCount: number;
  qualityScore: number;
  appliedSkills: string[];
  incorporatedSparks: string[];
  createdAt: string;
}

export interface AutopilotCruiseReport {
  sessionId: string;
  novelId: string;
  mode: AutopilotMode;
  elapsedSeconds: number;
  totalWordsWritten: number;
  chaptersCompleted: number;
  scenesCompleted: number;
  averageQualityScore: number;
  autoActivatedSkills: string[];
  wovenSparksCount: number;
  segments: AutopilotGeneratedSegment[];
  morningBriefingSummary: string;
}

// ==============================================================================
// 8. 跨作品创作技能与套路中心库 (Central Skill & Reusable Asset Vault)
// ==============================================================================

export type CreationSkillCategory =
  | 'IDEA'                // 核心脑洞与高概念
  | 'TROPE'               // 爽点套路与经典桥段
  | 'POWER_TIER'          // 战力等级与晋升代价体系
  | 'ARCHITECTURE'        // 叙事结构与黄金章节框架
  | 'STYLE'               // 文风修辞与名家遣词范式
  | 'DUNGEON'             // 秘境副本机制与规则怪谈
  | 'CONFLICT'            // 戏剧冲突与两难反转公式
  | 'CHARACTER_ARCHETYPE';// 立体人设与魅力反派原型

export interface CreationSkillItem {
  id: string;
  name: string;
  category: CreationSkillCategory;
  sourceNovelTitle: string;
  description: string;
  promptDirective: string;       // 注入给 Agent 的结构化技能执行指令 (类似 SKILL.md 核心规则)
  exampleSnippet: string;        // 黄金示范片段或结构模板
  triggerKeywords: string[];     // AI 自动勾选匹配的语义触发词
  isEnabled: boolean;            // 当前是否被手动/自动勾选用于创作参考
  autoMatchEligible: boolean;    // 是否允许 AI 根据当前场景自动感知勾选
  reusedCount: number;           // 累计跨章节/跨书复用次数
  effectivenessRating: number;   // 效果评分 (0 - 100)
  structuredMeta?: Record<string, any>; // 扩展结构（如等级表、副本阶段、冲突双方等）
  createdAt: string;
}

export interface SkillAutoMatchResult {
  sceneContextSummary: string;
  matchedSkillIds: string[];
  matchReasons: Record<string, string>; // skillId -> 为什么 AI 自动勾选了该技能
}

export interface TropeSubversionVariant {
  id: string;
  originalSkillName: string;
  subversionTitle: string;
  classicExpectation: string; // 读者以为的常规套路走向
  subvertedTwist: string;     // 反套路神转折走向
  dramaticPayoff: string;     // 带来的新鲜爽感与戏剧张力
}

// ==============================================================================
// 9. 大模型四级记忆、Token 精算压缩与防幻觉护栏 (LLM Memory, Token & Anti-Hallucination)
// ==============================================================================

export type MemoryTierLevel =
  | 'L1_WORKING_MEMORY'    // 瞬时工作记忆：当前分镜节拍、上一幕末尾300字精准接龙锚点
  | 'L2_EPISODIC_SUMMARY'  // 滚动章节摘要：前序章节浓缩为 80 字/章的因果骨架，替代全文灌入
  | 'L3_SEMANTIC_RECALL'   // 语义按需召回：仅召回当前场景实际出场/提及的角色、道具与伏笔
  | 'L4_CANONICAL_REDLINE';// 不可变铁律红线：境界天花板、生死簿、信息差保密锁与禁止幻觉清单

export interface MemoryFactAnchor {
  id: string;
  tier: MemoryTierLevel;
  category: 'CHARACTER_ALIVE_LOCK' | 'POWER_CEILING_LOCK' | 'INVENTORY_LOCK' | 'EPISTEMIC_SECRET_LOCK' | 'TIMELINE_SPATIAL_LOCK';
  entityName: string;
  hardConstraint: string;      // 硬性事实约束（如：林越当前为筑基初期，严禁出现金丹瞬移）
  violationPattern: string[];  // 幻觉违规触发词（如：['金丹神识', '御剑万里', '元婴出窍']）
  isActive: boolean;
}

export interface TokenCompressionSlice {
  tier: MemoryTierLevel;
  label: string;
  rawTokens: number;
  compressedTokens: number;
  prunedEntitiesCount: number;
  compressedPreview: string;
}

export interface TokenCompressionReport {
  novelId: string;
  chapterId?: string;
  totalRawTokens: number;
  totalCompressedTokens: number;
  savedTokens: number;
  compressionRatioPercent: number;  // 节省比例，例如 68%
  prefixCacheHitRatePercent: number;// KV Prefix Cache 命中率，例如 84%
  estimatedCostSavedUsd: number;
  slices: TokenCompressionSlice[];
  assembledCompactPrompt: string;
  activeFactAnchors: MemoryFactAnchor[];
}

export type HallucinationSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface HallucinationFinding {
  id: string;
  severity: HallucinationSeverity;
  hallucinationType:
    | 'DEAD_CHARACTER_RESURRECTION' // 已故/退场角色诈尸出场
    | 'REALM_POWER_INFLATION'       // 战力跨阶/未解锁技能幻觉
    | 'UNOWNED_ITEM_USAGE'          // 凭空捏造或已消耗道具复现
    | 'EPISTEMIC_SPOILER_LEAK'      // 视角越界：主角提前知道了只有读者知道的秘密
    | 'SPATIAL_TELEPORT_GLITCH'     // 空间瞬移：地理距离与时间不匹配
    | 'WORLD_LORE_CONTRADICTION';   // 违背世界观底层法则
  offendingSnippet: string;
  factViolated: string;
  autoFixReplacement: string;
}

export interface HallucinationAuditReport {
  draftLength: number;
  faithfulnessScore: number;        // 事实忠实度 (0 - 100)
  hallucinationRiskPercent: number; // 幻觉风险率 (0 - 100)
  findings: HallucinationFinding[];
  sanitizedDraft: string;
  checkedAnchorsCount: number;
  timestamp: string;
}

// ==============================================================================
// 10. 进阶省 Token 记忆归档、道具守恒账本与全站智能超链穿梭 (30x30 Expansion Types)
// ==============================================================================

export type MemoryConsolidationTemperature = 'HOT_ACTIVE' | 'WARM_DIGEST' | 'COLD_ARCHIVE';

export interface ChapterMemoryConsolidationItem {
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  temperature: MemoryConsolidationTemperature;
  rawWordCount: number;
  rawTokens: number;
  consolidatedTokens: number;
  savingPercent: number;
  consolidatedPayload: string;
  causalKeyEvents: string[];
}

export type EntityPruningDecision =
  | 'RECALLED_IN_SCENE'
  | 'PRUNED_IRRELEVANT'
  | 'PINNED_BY_AUTHOR'
  | 'MUTED_BY_AUTHOR';

export interface EntityPruningRecord {
  entityId: string;
  entityName: string;
  entityType: 'CHARACTER' | 'LORE' | 'FORESHADOWING' | 'SKILL';
  targetTab: string;
  decision: EntityPruningDecision;
  relevanceScore: number;
  reason: string;
  rawTokens: number;
  tupleTokens: number;
  tupleDslPreview: string;
  stateDeltaPreview?: string;
}

export interface InventoryLedgerItem {
  id: string;
  itemName: string;
  holderName: string;
  category: 'ARTIFACT' | 'CONSUMABLE_PILL' | 'TALISMAN' | 'KEY_CLUE';
  status: 'HELD_INTACT' | 'DAMAGED' | 'CONSUMED_DESTROYED' | 'LOST_STOLEN';
  lastUpdatedChapter: number;
  conservationConstraint: string;
  forbiddenReusePhrases: string[];
}

export interface UnregisteredEntityCandidate {
  id: string;
  name: string;
  inferredCategory: 'CHARACTER' | 'LORE' | 'ITEM' | 'LOCATION';
  contextSnippet: string;
  riskNote: string;
  status: 'PENDING' | 'WHITELISTED' | 'BLOCKED';
}

export interface SmartEntityLinkMatch {
  id: string;
  entityName: string;
  category: 'CHARACTER' | 'LORE' | 'FORESHADOWING' | 'SKILL';
  targetTab: string;
  occurrencesCount: number;
  summary: string;
  backlinkChapters: { chapterId: string; chapterIndex: number; chapterTitle: string }[];
}

export interface CrossViewTeleportPayload {
  sourceTab: string;
  sourceTitle: string;
  targetTab: string;
  entityName?: string;
  chapterId?: string;
  sceneIndex?: number;
  contextSummary: string;
  timestamp: string;
}

export type WorkspacePresetId =
  | 'WRITING_FLOW'
  | 'MEMORY_AUDIT'
  | 'WORLD_BUILDING'
  | 'LAZY_AUTOPILOT';

export interface Architecture30BlueprintItem {
  index: number;
  pillar: 'MEMORY_TOKEN' | 'ANTI_HALLUCINATION' | 'HYPER_NAVIGATION';
  featureCode: string;
  featureTitle: string;
  architectureCode: string;
  architectureTitle: string;
  architectureMechanism: string;
  tokenSavingOrUxImpact: string;
  jumpTargetTab: string;
}
