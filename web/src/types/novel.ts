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

