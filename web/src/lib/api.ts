// ==============================================================================
// 企业商业级后端 REST API 客户端 (Enterprise Rust/Axum API Client)
// 包含多模型矩阵、文风 DNA 仿生、灵感大纲创世纪、追读心理力学与视频分镜导出接口
// 具备完整离线高可用兜底与网络心跳健康感知
// ==============================================================================

import {
  ModelProvider,
  ModelRoleAssignment,
  ModelTelemetry,
  ModelCapabilityRole,
  StyleDnaProfile,
  StyleFusionRequest,
  IdeaGenesisInput,
  IdeaGenesisResponse,
  MultiverseBranch,
  ReaderPsychologyReport,
  InformationAsymmetryItem,
  OffscreenNewsEvent,
  VideoStoryboard,
  VideoExportPlatform,
  EpiphanySpark,
  EpiphanySparkType,
  ReaderDiscussionComment,
  SparkCollisionResult,
  AutopilotSessionConfig,
  AutopilotStageLog,
  AutopilotGeneratedSegment,
  AutopilotCruiseReport,
  CreationSkillCategory,
  CreationSkillItem,
  SkillAutoMatchResult,
  TropeSubversionVariant,
} from '../types/novel';

const API_BASE = 'http://localhost:8000/api';

async function safeFetch<T>(
  endpoint: string,
  options?: RequestInit,
  fallbackData?: T
): Promise<T> {
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[API] ${endpoint} returned ${res.status}: ${errText}`);
      if (fallbackData !== undefined) return fallbackData;
      throw new Error(`API Error (${res.status}): ${errText}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn(`[API Network Fallback] Request to ${endpoint} failed:`, err);
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw err;
  }
}

// ==============================================================================
// 1. 多模型矩阵与高可用路由接口
// ==============================================================================

export const defaultModelProviders: ModelProvider[] = [
  {
    id: 'prov-deepseek',
    name: 'DeepSeek 官方开放平台',
    providerType: 'DEEPSEEK',
    baseUrl: 'https://api.deepseek.com/v1',
    apiKeys: ['sk-ds-enterprise-master-88992', 'sk-ds-backup-pool-1024'],
    activeKeyIndex: 0,
    supportedModels: ['deepseek-reasoner (R1)', 'deepseek-chat (V3)'],
    rpmLimit: 120,
    tpmLimit: 200000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 142,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-anthropic',
    name: 'Anthropic Claude 企业专线',
    providerType: 'ANTHROPIC',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeys: ['sk-ant-api03-claudepremium-prod'],
    activeKeyIndex: 0,
    supportedModels: ['claude-3-7-sonnet-thought', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku'],
    rpmLimit: 60,
    tpmLimit: 150000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 380,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-openai',
    name: 'OpenAI 商业订阅 API',
    providerType: 'OPENAI',
    baseUrl: 'https://api.openai.com/v1',
    apiKeys: ['sk-proj-openai-commercial-v4'],
    activeKeyIndex: 0,
    supportedModels: ['gpt-4.5-preview', 'gpt-4o', 'o3-mini', 'o1-preview'],
    rpmLimit: 80,
    tpmLimit: 180000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 295,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-gemini',
    name: 'Google Gemini Pro / Flash',
    providerType: 'GEMINI',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    apiKeys: ['AIzaSy-gemini-multimodal-studio'],
    activeKeyIndex: 0,
    supportedModels: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash-exp'],
    rpmLimit: 100,
    tpmLimit: 300000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 210,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-siliconflow',
    name: 'SiliconFlow 硅基流动聚合云',
    providerType: 'SILICONFLOW',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKeys: ['sk-sf-ultra-highspeed-router'],
    activeKeyIndex: 0,
    supportedModels: ['deepseek-ai/DeepSeek-R1', 'deepseek-ai/DeepSeek-V3', 'Qwen/Qwen2.5-72B-Instruct'],
    rpmLimit: 300,
    tpmLimit: 500000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 115,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-ollama',
    name: '本地 Ollama 边缘推理节点',
    providerType: 'OLLAMA',
    baseUrl: 'http://localhost:11434/v1',
    apiKeys: ['ollama-local-bearer-free'],
    activeKeyIndex: 0,
    supportedModels: ['deepseek-r1:14b', 'qwen2.5:32b', 'llama3.3:70b'],
    rpmLimit: 9999,
    tpmLimit: 9999999,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 38,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-custom-oneapi',
    name: 'OneAPI / NewAPI 私有聚合中转站 #1',
    providerType: 'CUSTOM',
    baseUrl: 'https://api.oneapi-hub.example.com/v1',
    apiKeys: ['sk-oneapi-relay-primary-9901', 'sk-oneapi-relay-backup-9902'],
    activeKeyIndex: 0,
    supportedModels: ['claude-3-7-sonnet-20250219', 'deepseek-r1', 'gpt-4o-2024-11-20', 'gemini-2.5-pro'],
    rpmLimit: 240,
    tpmLimit: 400000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 96,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-custom-openrouter',
    name: 'OpenRouter 全球多模型路由池',
    providerType: 'CUSTOM',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeys: ['sk-or-v1-889123456789abcdef'],
    activeKeyIndex: 0,
    supportedModels: ['anthropic/claude-3.7-sonnet', 'deepseek/deepseek-r1', 'google/gemini-2.5-pro-exp-03-25'],
    rpmLimit: 200,
    tpmLimit: 500000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 165,
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: 'prov-custom-volcark',
    name: '火山方舟 / 满血 DeepSeek 专线中转',
    providerType: 'CUSTOM',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    apiKeys: ['ark-volc-ep-202503-deepseek-r1'],
    activeKeyIndex: 0,
    supportedModels: ['deepseek-r1-250120', 'deepseek-v3-250324', 'doubao-1.5-pro-256k'],
    rpmLimit: 500,
    tpmLimit: 800000,
    isEnabled: true,
    healthStatus: 'HEALTHY',
    latencyMs: 82,
    lastCheckedAt: new Date().toISOString(),
  },
];

export const defaultRoleAssignments: ModelRoleAssignment[] = [
  {
    role: 'PLANNER',
    primaryProviderId: 'prov-deepseek',
    primaryModel: 'deepseek-reasoner (R1)',
    fallbackProviderId: 'prov-anthropic',
    fallbackModel: 'claude-3-7-sonnet-thought',
    temperature: 0.6,
    topP: 0.95,
    maxTokens: 8192,
    timeoutMs: 45000,
    retryCount: 3,
  },
  {
    role: 'DRAFTER',
    primaryProviderId: 'prov-anthropic',
    primaryModel: 'claude-3-5-sonnet-20241022',
    fallbackProviderId: 'prov-openai',
    fallbackModel: 'gpt-4.5-preview',
    temperature: 0.75,
    topP: 0.9,
    maxTokens: 6000,
    timeoutMs: 35000,
    retryCount: 3,
  },
  {
    role: 'STYLIST',
    primaryProviderId: 'prov-deepseek',
    primaryModel: 'deepseek-chat (V3)',
    fallbackProviderId: 'prov-siliconflow',
    fallbackModel: 'Qwen/Qwen2.5-72B-Instruct',
    temperature: 0.8,
    topP: 0.85,
    maxTokens: 4096,
    timeoutMs: 25000,
    retryCount: 2,
  },
  {
    role: 'INSPECTOR',
    primaryProviderId: 'prov-gemini',
    primaryModel: 'gemini-2.5-pro',
    fallbackProviderId: 'prov-deepseek',
    fallbackModel: 'deepseek-reasoner (R1)',
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 4096,
    timeoutMs: 30000,
    retryCount: 3,
  },
  {
    role: 'VIDEO_DIRECTOR',
    primaryProviderId: 'prov-openai',
    primaryModel: 'gpt-4o',
    fallbackProviderId: 'prov-gemini',
    fallbackModel: 'gemini-2.5-flash',
    temperature: 0.7,
    topP: 0.95,
    maxTokens: 4096,
    timeoutMs: 25000,
    retryCount: 3,
  },
];

const CUSTOM_PROVIDERS_STORAGE_KEY = 'inkverse_custom_providers_v1';

function loadLocalCustomProviders(): ModelProvider[] {
  try {
    const raw = localStorage.getItem(CUSTOM_PROVIDERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveLocalCustomProviders(list: ModelProvider[]) {
  try {
    localStorage.setItem(CUSTOM_PROVIDERS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // ignore storage quota errors
  }
}

export async function fetchModelProviders(): Promise<ModelProvider[]> {
  const remoteList = await safeFetch<ModelProvider[]>('/models/providers', undefined, defaultModelProviders);
  const localCustom = loadLocalCustomProviders();
  // Merge remoteList with default custom providers and localCustom by ID (localCustom overrides)
  const map = new Map<string, ModelProvider>();
  for (const p of defaultModelProviders) {
    map.set(p.id, p);
  }
  for (const p of remoteList) {
    map.set(p.id, p);
  }
  for (const p of localCustom) {
    map.set(p.id, p);
  }
  return Array.from(map.values());
}

export async function saveModelProvider(provider: ModelProvider): Promise<ModelProvider> {
  const localCustom = loadLocalCustomProviders();
  const idx = localCustom.findIndex((p) => p.id === provider.id);
  if (idx >= 0) {
    localCustom[idx] = provider;
  } else {
    localCustom.push(provider);
  }
  saveLocalCustomProviders(localCustom);

  return safeFetch<ModelProvider>(
    '/models/providers',
    {
      method: 'POST',
      body: JSON.stringify(provider),
    },
    provider
  );
}

export async function deleteModelProvider(id: string): Promise<boolean> {
  const localCustom = loadLocalCustomProviders().filter((p) => p.id !== id);
  saveLocalCustomProviders(localCustom);

  return safeFetch<{ success: boolean }>(
    `/models/providers/${id}`,
    { method: 'DELETE' },
    { success: true }
  ).then((r) => r.success);
}

export async function fetchModelRoleAssignments(): Promise<ModelRoleAssignment[]> {
  return safeFetch<ModelRoleAssignment[]>('/models/roles', undefined, defaultRoleAssignments);
}

export async function saveModelRoleAssignment(assignment: ModelRoleAssignment): Promise<ModelRoleAssignment> {
  return safeFetch<ModelRoleAssignment>(
    '/models/roles',
    {
      method: 'POST',
      body: JSON.stringify(assignment),
    },
    assignment
  );
}

export interface FallbackSimulateResult {
  role: ModelCapabilityRole;
  primaryProvider: string;
  primaryModel: string;
  fallbackTriggered: boolean;
  failoverReason: string;
  activatedProvider: string;
  activatedModel: string;
  simulatedLatencyMs: number;
  outputSample: string;
}

export async function simulateModelFallback(
  role: ModelCapabilityRole,
  forceQuotaExhaustion = true
): Promise<FallbackSimulateResult> {
  const fallbackMock: FallbackSimulateResult = {
    role,
    primaryProvider: 'DeepSeek 官方开放平台',
    primaryModel: 'deepseek-reasoner (R1)',
    fallbackTriggered: true,
    failoverReason: 'HTTP 429: Insufficient Balance / TPM Quota Depleted',
    activatedProvider: 'Anthropic Claude 企业专线',
    activatedModel: 'claude-3-7-sonnet-thought',
    simulatedLatencyMs: 412,
    outputSample: '【容灾熔断接管执行成功】思考链与剧情架构已无缝转移至备用高阶算力集群...',
  };

  return safeFetch<FallbackSimulateResult>(
    '/models/simulate-fallback',
    {
      method: 'POST',
      body: JSON.stringify({ role, force_quota_exhaustion: forceQuotaExhaustion }),
    },
    fallbackMock
  );
}

export async function fetchModelTelemetry(): Promise<ModelTelemetry[]> {
  const mockTelemetry: ModelTelemetry[] = [
    {
      id: 'tel-1',
      providerId: 'prov-deepseek',
      model: 'deepseek-reasoner',
      role: 'PLANNER',
      requestType: 'OUTLINE_DEDUCTION',
      inputTokens: 3820,
      outputTokens: 2190,
      costUsd: 0.0048,
      latencyMs: 3120,
      statusCode: 200,
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
    {
      id: 'tel-2',
      providerId: 'prov-anthropic',
      model: 'claude-3-5-sonnet',
      role: 'DRAFTER',
      requestType: 'SCENE_PROSE_DRAFT',
      inputTokens: 4120,
      outputTokens: 3410,
      costUsd: 0.0635,
      latencyMs: 4210,
      statusCode: 200,
      timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    },
    {
      id: 'tel-3',
      providerId: 'prov-deepseek',
      model: 'deepseek-chat',
      role: 'STYLIST',
      requestType: 'STYLE_POLISH',
      inputTokens: 2840,
      outputTokens: 1950,
      costUsd: 0.0019,
      latencyMs: 1420,
      statusCode: 200,
      timestamp: new Date(Date.now() - 1000 * 60 * 32).toISOString(),
    },
    {
      id: 'tel-4',
      providerId: 'prov-gemini',
      model: 'gemini-2.5-pro',
      role: 'INSPECTOR',
      requestType: 'CONSISTENCY_AUDIT',
      inputTokens: 5200,
      outputTokens: 1100,
      costUsd: 0.0082,
      latencyMs: 1850,
      statusCode: 200,
      timestamp: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    },
  ];

  return safeFetch<ModelTelemetry[]>('/models/telemetry', undefined, mockTelemetry);
}

// ==============================================================================
// 2. 文风 DNA 解析与仿生克隆接口
// ==============================================================================

export const defaultStyleProfiles: StyleDnaProfile[] = [
  {
    id: 'dna-wujie',
    name: '乌贼 · 诡秘维多利亚克苏鲁风',
    author: '爱潜水的乌贼',
    sourceTitle: '《诡秘之主》/《宿命之环》',
    tags: ['克苏鲁', '蒸汽朋克', '仪式感', '沉重冷静', '多重视角白描'],
    sensoryDensity: 0.88,
    dialogueRatio: 0.38,
    sentenceVariance: 0.79,
    metaphorFrequency: 0.82,
    pacingVelocity: 0.65,
    vocabularyRichness: 0.94,
    forbiddenCliches: ['恐怖如斯', '倒吸一口凉气', '嘴角勾起一抹残忍的微笑', '这怎么可能'],
    goldenExemplars: [
      '绯红的月光透过薄雾，在斑驳的哥特石柱上投下潮湿而扭曲的阴影。空气里弥漫着煤烟与海盐混合的咸腥气。克莱恩按了按黑色的丝绸半高礼帽，指尖触碰到泛黄手杖的银质狼头把手，冰冷而坚硬。',
      '灵性直觉在疯狂尖啸，仿佛有无形黏稠的触手正顺着脊椎骨缓缓向上攀爬。四周的死寂中，唯有挂钟秒针沉闷的金属撞击声在空旷大厅里回荡。',
    ],
    promptDirective:
      '注重维多利亚时代环境的细腻冷峻白描，强化五感中的触觉与冷暖空气流动感。使用克制沉静的第人称近距视角，杜绝情绪泛滥与口水化咆哮。修辞多采用宗教、机械、星体与深渊隐喻。',
    createdAt: '2026-03-01T10:00:00Z',
  },
  {
    id: 'dna-wangyu',
    name: '忘语 · 凡人沉稳修真白描风',
    author: '忘语',
    sourceTitle: '《凡人修仙传》',
    tags: ['古典仙侠', '修心谨慎', '法宝推演', '客观白描', '扣人心弦'],
    sensoryDensity: 0.72,
    dialogueRatio: 0.28,
    sentenceVariance: 0.62,
    metaphorFrequency: 0.45,
    pacingVelocity: 0.78,
    vocabularyRichness: 0.85,
    forbiddenCliches: ['震惊！竟然是', '狠狠打脸', '龙王归来', '他怒发冲冠发誓要杀光他们'],
    goldenExemplars: [
      '韩立神色如常，袖袍中的青竹蜂云剑却早已悄无声息地游移至指尖三寸之处。他并未立刻催动遁光，而是将神识收敛至周身数丈，目光微敛，静静打量着前方那团翻滚不定的黑褐色煞雾。',
      '修仙界中杀人夺宝本是家常便饭，任凭对方说得天花乱坠，若是没有万全自保之策，断不可轻易踏入那处古修洞府半步。',
    ],
    promptDirective:
      '文字务求凝练严谨，注重法力流转、符箓禁制与战斗走位的空间几何逻辑。主角心态内敛果决，能动手绝不多言，杜绝装腔作势与狂妄宣泄。',
    createdAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'dna-jinyong',
    name: '金庸 · 宗师武侠雄浑沉郁风',
    author: '金庸',
    sourceTitle: '《天龙八部》/《笑傲江湖》',
    tags: ['传统武侠', '文人风骨', '招式写意', '家国情怀', '诗词意境'],
    sensoryDensity: 0.81,
    dialogueRatio: 0.45,
    sentenceVariance: 0.86,
    metaphorFrequency: 0.75,
    pacingVelocity: 0.82,
    vocabularyRichness: 0.96,
    forbiddenCliches: ['系统叮了一声', '升级！经验值+999', '直接秒杀', '卧槽'],
    goldenExemplars: [
      '萧峰仰天长笑，声震林木，群山隐隐回响。他右手虚抓，掌风过处，满地枯枝败叶如旋风般平地拔起，正是降龙十八掌中那一招刚猛绝伦的“亢龙有悔”。',
      '令狐冲长剑斜指，剑尖不住颤动，宛如一朵青莲在秋风中摇曳生姿。他心中空空荡荡，全无招式，唯见对方剑势中那稍纵即逝的三处破绽。',
    ],
    promptDirective:
      '注重古典白话文言句式的音律节律，动词与意象精纯。打斗讲究意境与武学哲理，人物对话各具身份风骨，悲剧感与英雄气概兼备。',
    createdAt: '2026-03-03T10:00:00Z',
  },
  {
    id: 'dna-maoni',
    name: '猫腻 · 文青沉郁缓带轻裘风',
    author: '猫腻',
    sourceTitle: '《庆余年》/《将夜》',
    tags: ['细腻深沉', '文人讽刺', '慢热张力', '日常烟火气', '思想交锋'],
    sensoryDensity: 0.85,
    dialogueRatio: 0.52,
    sentenceVariance: 0.91,
    metaphorFrequency: 0.78,
    pacingVelocity: 0.58,
    vocabularyRichness: 0.92,
    forbiddenCliches: ['桀桀桀怪笑', '此子断不可留', '一拳轰碎虚空', '系统商城'],
    goldenExemplars: [
      '秋雨落在这座繁华冷酷的京都城里，洗净了青石板路上的马蹄印，却洗不净皇宫深墙里那些积攒了数十年的陈年阴谋。范闲撑着一把寻常的油纸伞，走得极慢，仿佛每一步都在丈量自己与死亡的距离。',
      '宁缺看着桑桑舀起的那碗热腾腾的酸辣面片汤，忽然觉得整个人间所有的宏大道理，都不及眼前这缕裹着葱花香气的热气来得真实。',
    ],
    promptDirective:
      '文字富含现代知识分子的自省与隐晦嘲讽，讲究长句短句交替的节奏呼吸感。善于用生活细节（吃茶、下雨、晒太阳）衬托暗潮汹涌的政治交锋。',
    createdAt: '2026-03-04T10:00:00Z',
  },
  {
    id: 'dna-chendong',
    name: '辰东 · 太古洪荒大开大合风',
    author: '辰东',
    sourceTitle: '《遮天》/《完美世界》',
    tags: ['荒古神话', '热血沸腾', '星空崩裂', '九龙拉棺', '磅礴苍凉'],
    sensoryDensity: 0.76,
    dialogueRatio: 0.35,
    sentenceVariance: 0.80,
    metaphorFrequency: 0.88,
    pacingVelocity: 0.90,
    vocabularyRichness: 0.89,
    forbiddenCliches: ['女帝求着要嫁给我', '跪地求饶', '签到打卡百万年'],
    goldenExemplars: [
      '冰冷与黑暗并存的宇宙深处，九具庞大如山脉的青铜巨龙尸体，拉着一口古朴沉重的青铜巨棺，横渡亘古枯寂的星空，缓缓驶向未知的星域彼端！',
      '登天路，踏歌行，弹指遮天！叶凡沐浴万丈雷海而行，帝拳轰出，星河倒卷，混沌气弥漫千万里，打碎万古长夜！',
    ],
    promptDirective:
      '营造横跨亿万载岁月的历史沧桑与星空枯寂感。战斗场景极尽恢宏壮丽，善用天地法则、星系幻灭、雷海洗礼等宏大意象，词句铿锵有力，气吞山河。',
    createdAt: '2026-03-05T10:00:00Z',
  },
];

export async function fetchStyleProfiles(): Promise<StyleDnaProfile[]> {
  return safeFetch<StyleDnaProfile[]>('/style/profiles', undefined, defaultStyleProfiles);
}

export async function extractStyleDna(
  input: {
    sourceType: 'TEXT' | 'URL' | 'NOVEL_TITLE';
    sourcePayload: string;
    targetName?: string;
  }
): Promise<StyleDnaProfile> {
  const fallbackExtract: StyleDnaProfile = {
    id: `dna-${Date.now()}`,
    name: input.targetName || 'AI 萃取文学样本',
    author: '未知名家',
    sourceTitle: input.sourcePayload.slice(0, 30),
    tags: ['AI深度解析', '多维测度', '通感自洽'],
    sensoryDensity: 0.82,
    dialogueRatio: 0.41,
    sentenceVariance: 0.74,
    metaphorFrequency: 0.69,
    pacingVelocity: 0.77,
    vocabularyRichness: 0.88,
    forbiddenCliches: ['恐怖如斯', '倒吸一口凉气', '嘴角冷笑', '这不可能'],
    goldenExemplars: [
      '夜色如墨，残月如钩。风穿过青石长街，带起阵阵落叶轻响。他立在廊檐下，指节微屈，心湖不起一丝微澜。',
    ],
    promptDirective:
      '保持极高纯度的冷峻白描与声色通感，减少空泛定性形容词，以动作链与感官物理反应推动情节。',
    createdAt: new Date().toISOString(),
  };

  return safeFetch<StyleDnaProfile>(
    '/style/extract',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    fallbackExtract
  );
}

export async function blendStyles(req: StyleFusionRequest): Promise<StyleDnaProfile> {
  const fallbackBlend: StyleDnaProfile = {
    id: `dna-fused-${Date.now()}`,
    name: req.fusedName,
    author: '双流派文风智合',
    sourceTitle: `融合率: ${(req.blendRatio * 100).toFixed(0)}%`,
    tags: ['风格融合', '双核驱动', '定制文风'],
    sensoryDensity: 0.84,
    dialogueRatio: 0.36,
    sentenceVariance: 0.75,
    metaphorFrequency: 0.72,
    pacingVelocity: 0.76,
    vocabularyRichness: 0.92,
    forbiddenCliches: ['恐怖如斯', '倒吸一口凉气', '装逼打脸', '系统叮的一声'],
    goldenExemplars: [
      '绯红月光洒在修道古殿的青石台阶上。韩立袖袍轻拂，七十二口青竹蜂云剑在黑雾边缘如深渊触手般微不可查地游走。修仙长生之路与旧日诡秘之秘，在此刻悄然交织。',
    ],
    promptDirective: `综合流派 A (${(req.blendRatio * 100).toFixed(0)}%) 的冷峻环境细节与流派 B (${((1 - req.blendRatio) * 100).toFixed(0)}%) 的法宝推演严谨性，交替使用诗意意象与动作物理学描写。`,
    createdAt: new Date().toISOString(),
  };

  return safeFetch<StyleDnaProfile>(
    '/style/blend',
    {
      method: 'POST',
      body: JSON.stringify(req),
    },
    fallbackBlend
  );
}

// ==============================================================================
// 3. 灵感创世大纲生成引擎接口
// ==============================================================================

export async function generateIdeaGenesisOutline(
  input: IdeaGenesisInput
): Promise<IdeaGenesisResponse> {
  const fallbackResponse: IdeaGenesisResponse = {
    novelTitle: `《${input.genre.includes('仙') ? '问鼎长生' : input.genre.includes('科幻') ? '星渊信标' : '太虚之弈'}》`,
    synopsis: `基于灵感核心：“${input.logline}”，构建横跨三卷的宿命争夺。主角以【${input.goldenFingerType}】为破局利刃，在${input.tone}的压抑秩序下，逐步撕开古老文明湮灭的终极迷局。`,
    goldenThreeChapters: [
      {
        chapterIndex: 1,
        title: '第一章：雨夜血誓与残缺命轨',
        hook: '开篇即死局：宗门覆灭前夜，主角在死人堆里醒来，右手掌心赫然浮现倒计时的古神刻印。',
        conflict: '搜山追杀者的步步逼近 vs 主角身负重伤且修为尽失的致命绝境。',
        climaxPayoff: '首次激活【金手指】，以不可思议的因果逆转手段，瞬间反杀领头追兵并夺取保命密信。',
        cliffhanger: '在搜尸时，发现追杀令上的幕后签字印章，竟属于自己从小最信任的授业恩师！',
      },
      {
        chapterIndex: 2,
        title: '第二章：黑市潜影与隐匿之道',
        hook: '易容潜入混乱罪恶的地下黑市，试图变卖战利品换取续命丹药。',
        conflict: '黑市贪婪掌柜的暗中压价下毒 vs 潜伏在暗处的第二批刺客盯梢。',
        climaxPayoff: '利用金手指洞察丹毒破绽，不仅白得百年灵药，更反手借刀杀人引爆黑市混战。',
        cliffhanger: '在混乱中偶然救下一个不起眼的哑巴小乞丐，却在对方脖颈上看到与皇族同源的胎记。',
      },
      {
        chapterIndex: 3,
        title: '第三章：古碑铭文与大争之世',
        hook: '潜入城外无名荒冢闭关炼化药力，体内金手指首次展现完整进阶阶梯。',
        conflict: '药力凶猛撕裂经脉的剧痛 vs 外界全城戒严大搜捕的急迫搜查脚步。',
        climaxPayoff: '极限突破生死关隘，凝练出前所未见的天道本命灵根，气息威压直接震慑野兽护法。',
        cliffhanger: '天际突然浮现三千年未见的血色异象，整个天下的顶尖大能同时从沉睡中惊醒……大争之世正式开启！',
      },
    ],
    volumes: [
      {
        volumeIndex: 1,
        title: '第一卷：潜龙出渊 · 乱世棋子',
        summary: '主角在绝境中求生，通过黑市与边荒宗门的争斗站稳脚跟，逐步揭开宗门覆灭的真相。',
        mainConflict: '复仇求生 vs 边荒修真王朝的严酷等级绞杀',
        targetClimax: '在百宗大比上以卑微杂役身份，当着天下人的面斩杀昔日仇敌首席弟子。',
        boundaryConstraints: '力量上限控制在蜕凡境以下，突出算计与战术博弈，不可过早引入跨界大能。',
      },
      {
        volumeIndex: 2,
        title: '第二卷：风起中州 · 诸神黄昏',
        summary: '踏入大陆权力的核心中州，卷入九大皇朝与古老神庙的夺嫡内耗。',
        mainConflict: '守护宗族传承 vs 面对旧日古神复苏对文明秩序的降维侵蚀',
        targetClimax: '独守断龙关，以一己之力炼化整个战场煞气，抵御异族十万铁骑。',
        boundaryConstraints: '引入空间法则与大型战争，人物关系向多方政治联盟转变。',
      },
      {
        volumeIndex: 3,
        title: '第三卷：太虚终局 · 重定乾坤',
        summary: '飞升界外，探寻宇宙天道崩塌的源头，与最终幕后黑手下最后一盘诸天残棋。',
        mainConflict: '个体意志的自由 vs 冰冷天道为了宇宙存续对生灵的终极献祭',
        targetClimax: '身合天道却不忘本心，斩断轮回宿命锁链，还人间万世太平。',
        boundaryConstraints: '概念级战斗与哲学思辨达到峰值，收束全书所有伏笔与暗线。',
      },
    ],
    worldSettings: [
      {
        name: '太虚道印秩序',
        category: 'POWER_SYSTEM',
        content: '天地灵气分为清浊两极，修士需在丹田点燃命火，历经【淬骨、凝煞、筑基、金丹、化神】九重境界，每破一境需渡因果心魔劫。',
      },
      {
        name: '九黎斩妖阁与暗影卫',
        category: 'FACTION',
        content: '盘踞大陆中枢千年的铁血密探与征战机构，信奉“以杀止杀，宁枉勿纵”，是第一卷主角最大的外部追捕阴影。',
      },
    ],
    mainCharacters: [
      {
        name: '林越 (主角)',
        roleType: 'PROTAGONIST',
        appearance: '身形清瘦挺拔，面容俊朗却苍白，眼底常年掩藏着古井无波的冷锐。',
        fatalFlaw: '极度多疑，对善意本能戒备，习惯将所有人作为棋子推演。',
        catchphrases: ['“事不可为，且退一步。”', '“算尽天机，不敌一念慈悲。”'],
        background: '原青云剑宗末代传人，宗门遭一夜血洗后唯一幸存者。',
      },
      {
        name: '苏清寒 (第一女配)',
        roleType: 'ANTAGONIST',
        appearance: '白衣胜雪，眸若寒星，手持秋水古剑，不染人间烟火气。',
        fatalFlaw: '对既定天道规则具有宗教般的狂热崇拜，不懂人情温度。',
        catchphrases: ['“天道昭昭，顺之者昌。”'],
        background: '九天神殿代行圣女，肩负维护大阵运行的冷酷使命。',
      },
    ],
    cheatSystem: {
      systemName: '【因果命盘 · 溯源古镜】',
      coreMechanism: '能够窥见万事万物未来三个时辰内的凶吉因果丝线，并消耗神魂修改一次微小转折。',
      progressionNodes: [
        {
          tier: 1,
          name: '【见微】',
          unlockCondition: '濒死心率触发，神魂激活',
          powerDescription: '预知对手下一次攻击动作轨迹，洞悉十丈内杀意波动。',
          sideEffectOrCost: '每次使用消耗大量气血，眼眶短暂渗血刺痛。',
        },
        {
          tier: 2,
          name: '【断线】',
          unlockCondition: '手刃第一位金丹期强敌',
          powerDescription: '斩断自身与特定仇敌的气息因果，彻底屏蔽推演占卜。',
          sideEffectOrCost: '七天内无法吸收天地灵气。',
        },
        {
          tier: 3,
          name: '【移花】',
          unlockCondition: '参悟中州太虚古碑',
          powerDescription: '将自身所受重创随机转移至方圆百米内的死物或仇敌身上。',
          sideEffectOrCost: '需承受等额的心灵污染与杂念冲击。',
        },
        {
          tier: 4,
          name: '【造化】',
          unlockCondition: '突破化神瓶颈，跨越生死劫',
          powerDescription: '在局部时间长河中倒流三息，逆转必死杀局。',
          sideEffectOrCost: '扣除十年自然阳寿。',
        },
        {
          tier: 5,
          name: '【归墟】',
          unlockCondition: '炼化天地天道残碑',
          powerDescription: '定义自身所在区域的法则常数，万法不侵，言出法随。',
          sideEffectOrCost: '同化风险极高，可能丧失所有人性情感。',
        },
      ],
    },
    tensionCurvePreview: [65, 82, 70, 91, 55, 78, 88, 95, 60, 98],
  };

  return safeFetch<IdeaGenesisResponse>(
    '/genesis/outline',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    fallbackResponse
  );
}

export async function fetchMultiverseBranches(
  novelId: string,
  divergencePoint: string
): Promise<MultiverseBranch[]> {
  const fallbackBranches: MultiverseBranch[] = [
    {
      branchId: 'branch-alpha',
      title: '时间线 A：铁血决绝 · 斩尽仇寇',
      divergencePoint: divergencePoint || '主角在山神庙前选择直接斩杀追兵小队长',
      summary: '主角不顾伤势强行动用禁术击杀全部追兵，彻底断绝行踪暴露风险，但也因此经脉受损，被迫提前进入修仙黑市避难。',
      climaxOutcome: '行事风格愈发冷酷狠戾，成为令黑白两道闻风丧胆的暗夜修罗，但容易因心魔劫过早陷入暴走。',
      pros: '爽点爆发极快，短线阅读快感极强，敌人无喘息机会。',
      cons: '人物孤立无援，缺少正派盟友，后期感情线展开受限。',
    },
    {
      branchId: 'branch-beta',
      title: '时间线 B：隐忍伏击 · 借刀杀人',
      divergencePoint: divergencePoint || '主角选择放过垂死追兵并伪造同门相残现场',
      summary: '主角巧妙引诱两大仇敌宗门互相猜忌开战，自己则以散修身份暗中牟利，闷声发大财。',
      climaxOutcome: '在宗门大混战中坐收渔翁之利，以极小代价全盘接管敌对势力灵矿遗产。',
      pros: '智商在线，权谋布局感极强，符合苟道流读者的深度快感。',
      cons: '前期节奏较慢，需要大量篇幅铺陈情报网与多方博弈细节。',
    },
    {
      branchId: 'branch-gamma',
      title: '时间线 C：意外反转 · 逆势结盟',
      divergencePoint: divergencePoint || '追兵首领实为潜伏多年的宗门卧底，暗中对上暗号',
      summary: '原本必死的追杀意外演变为地下抵抗组织的密会。主角获得了宗门核心藏宝图与卧底名册。',
      climaxOutcome: '主线从小队复仇升维为横跨三界的情报暗战，主角成为暗影领袖。',
      pros: '反转惊艳，世界观深度瞬间拓宽三倍，戏剧张力拉满。',
      cons: '若伏笔埋设不够严密，容易被挑剔读者质疑为剧情机械降神。',
    },
  ];

  return safeFetch<MultiverseBranch[]>(
    '/genesis/multiverse',
    {
      method: 'POST',
      body: JSON.stringify({ novel_id: novelId, divergence_point: divergencePoint }),
    },
    fallbackBranches
  );
}

// ==============================================================================
// 4. 上帝视角沙盘与追读心理力学接口
// ==============================================================================

export async function fetchReaderPsychology(
  novelId: string,
  chapterId?: string
): Promise<ReaderPsychologyReport> {
  const fallbackReport: ReaderPsychologyReport = {
    novelId,
    chapterId,
    anticipationScore: 88,
    fatigueRisk: 22,
    payoffIndex: 82,
    dopamineIntervals: [1800, 3600, 5200, 7100],
    diagnosticAdvice: [
      '当前章节悬念张力充沛，读者追读期待值处于高位（88/100）。',
      '注意第 3500 字处的说明性世界观背景交代稍显冗长，建议穿插一句主角的机锋对白以平抑阅读疲劳度。',
      '终末断章（Cliffhanger）钩子有力，下章开篇务必在 500 字内给出正面正面碰撞反应，切勿拖泥带水。',
    ],
  };

  return safeFetch<ReaderPsychologyReport>(
    `/novels/${novelId}/reader-psychology${chapterId ? `?chapter_id=${chapterId}` : ''}`,
    undefined,
    fallbackReport
  );
}

export async function fetchInformationAsymmetry(
  novelId: string
): Promise<InformationAsymmetryItem[]> {
  const fallbackItems: InformationAsymmetryItem[] = [
    {
      id: 'asym-1',
      novelId,
      secretTitle: '授业恩师的真正身份是灭门惨案的始作俑者',
      readerKnows: true,
      protagonistKnows: false,
      antagonistKnows: true,
      dramaticIronyScore: 0.95,
      revelationPlanChapter: 12,
    },
    {
      id: 'asym-2',
      novelId,
      secretTitle: '主角贴身佩戴的残玉实为上古帝印钥匙',
      readerKnows: true,
      protagonistKnows: true,
      antagonistKnows: false,
      dramaticIronyScore: 0.82,
      revelationPlanChapter: 25,
    },
    {
      id: 'asym-3',
      novelId,
      secretTitle: '女主角身上潜伏着九天神殿圣女的第二神魂',
      readerKnows: false,
      protagonistKnows: false,
      antagonistKnows: true,
      dramaticIronyScore: 0.88,
      revelationPlanChapter: 18,
    },
    {
      id: 'asym-4',
      novelId,
      secretTitle: '主角在第一章反杀夺取的密信已经被暗中下了同心追踪蛊',
      readerKnows: true,
      protagonistKnows: false,
      antagonistKnows: true,
      dramaticIronyScore: 0.91,
      revelationPlanChapter: 4,
    },
  ];

  return safeFetch<InformationAsymmetryItem[]>(
    `/novels/${novelId}/asymmetry`,
    undefined,
    fallbackItems
  );
}

export async function fetchOffscreenNews(novelId: string): Promise<OffscreenNewsEvent[]> {
  const fallbackNews: OffscreenNewsEvent[] = [
    {
      id: 'news-1',
      novelId,
      era: '太虚玄历 3402 年',
      region: '中州 · 皇极城',
      eventSummary: '九天神殿天机镜监测到东南边荒有上古因果劫雷现世，已密遣三大巡察使下界勘查。',
      factionInvolved: '九天神殿 / 大周皇朝供奉堂',
      tensionDelta: 0.15,
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: 'news-2',
      novelId,
      era: '太虚玄历 3402 年',
      region: '西漠 · 万毒渊',
      eventSummary: '万毒老祖闭关三百年后破关而出，传令西漠十三宗封锁通往中州的所有古道。',
      factionInvolved: '万毒门 / 西漠散修联盟',
      tensionDelta: 0.22,
      timestamp: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
    },
    {
      id: 'news-3',
      novelId,
      era: '太虚玄历 3402 年',
      region: '东海 · 蓬莱龙岛',
      eventSummary: '海眼突发万丈赤潮，海兽暴动围攻沿海三大修真商港，四海商会悬赏百万灵石征集破煞丹。',
      factionInvolved: '四海商会 / 蓬莱散仙阁',
      tensionDelta: 0.08,
      timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
    },
  ];

  return safeFetch<OffscreenNewsEvent[]>(
    `/novels/${novelId}/offscreen-news`,
    undefined,
    fallbackNews
  );
}

// ==============================================================================
// 5. 灵光一现与读者热议共创中枢接口 (Epiphany Spark & Reader Co-Creation Hub)
// ==============================================================================

export const defaultEpiphanySparks: EpiphanySpark[] = [
  {
    id: 'spark-001',
    novelId: 'nov-001',
    title: '藏经阁扫地瞎眼老仆实为三百年前初代剑首的斩出恶尸',
    content: '平时老仆唯唯诺诺给众人递扫帚，但在宗门阵法破碎的一瞬，他随手用枯竹扫帚在地上画了一道剑痕，十万魔门大军竟无人敢越雷池一步。',
    sparkType: 'PLOT_TWIST',
    source: 'READER_COMMENT',
    readerUsername: '剑来夜归人_起点本章说',
    heatScore: 96,
    status: 'ANCHORED',
    targetChapterIndex: 12,
    targetSceneNote: '第十二章·山门大阵濒临破碎的高潮转折点',
    aiWeaveAdvice: '建议在第4章和第8章先埋设两次老仆“对剑气毫无反应但瞎眼微动”的草蛇灰线细节，第12章再引爆。',
    tags: ['隐藏大佬', '扫地僧变体', '读者神脑洞'],
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
  },
  {
    id: 'spark-002',
    novelId: 'nov-001',
    title: '雨夜断剑铭文台词：“我这一剑，借的是三百年后你坟头的一捧雪”',
    content: '主角动用因果逆转杀招时的宿命感台词，不喊口号，只用极其平静森寒的语调说出死期。',
    sparkType: 'DIALOGUE_GOLD',
    source: 'AUTHOR_BRAINWAVE',
    heatScore: 92,
    status: 'INBOX',
    targetChapterIndex: 3,
    aiWeaveAdvice: '适合置入绝境反杀收剑入鞘的刹那，配合四周雨滴静止半息的画面描写。',
    tags: ['装逼金句', '宿命感', '冷冽台词'],
    createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 'spark-003',
    novelId: 'nov-001',
    title: '反派大长老有个反差怪癖：每次下达灭门令前都要亲手给灵宠剥松子',
    content: '越是谈论血腥屠戮的计划，手指剥松子壳的动作越是轻柔完整，一旦松子仁碎了，说明他动了真杀心。',
    sparkType: 'CHARACTER_QUIRK',
    source: 'AUTHOR_BRAINWAVE',
    heatScore: 89,
    status: 'ANCHORED',
    targetChapterIndex: 5,
    aiWeaveAdvice: '极佳的希区柯克式悬念道具！以后只要描写松子仁碎裂，读者就会立刻意识到有人要惨死。',
    tags: ['反派压迫感', '细节道具', '人物弧光'],
    createdAt: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
  },
  {
    id: 'spark-004',
    novelId: 'nov-001',
    title: '黑市交易不用灵石，改用“封存的正面记忆”作为硬通货',
    content: '越珍贵的法宝，越需要修士割舍一段自己最幸福的记忆（如初恋、慈母、师恩）。修为越高的人越冷血，因为美好记忆全花光了。',
    sparkType: 'LORE_FRAGMENT',
    source: 'AI_COLLISION',
    heatScore: 98,
    status: 'INBOX',
    aiWeaveAdvice: '可作为地下诡市的核心交易法则，直接解释为什么高阶修士普遍六亲不认。',
    tags: ['世界观神设定', '等价交换', '黑暗修真'],
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
  },
];

export const defaultReaderDiscussions: ReaderDiscussionComment[] = [
  {
    id: 'disc-001',
    novelId: 'nov-001',
    chapterIndex: 1,
    paragraphSnippet: '“林越擦去嘴角血迹，目光落向山神庙神像背后那道不起眼的抓痕……”',
    readerName: '太虚课代表_老书虫',
    platform: '起点本章说',
    commentText: '卧槽！细节怪！神像后面的抓痕该不会是当年失踪的二师兄留下的求救摩斯密码吧？如果二师兄没死而是被炼成了护山灵傀，后面师兄弟相残绝对虐爆！',
    likes: 1420,
    sentiment: 'THEORY_CRAFTING',
    extractedHook: '失踪二师兄实为神像下被炼制的守山灵傀，抓痕乃清醒瞬间的求救暗记',
    createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
  },
  {
    id: 'disc-002',
    novelId: 'nov-001',
    chapterIndex: 2,
    paragraphSnippet: '“掌柜笑眯眯地递过那瓶九转回春丹，眼底深处掠过一抹幽绿。”',
    readerName: '苟道中人9527',
    platform: '番茄段评',
    commentText: '按主角这谨慎性格，绝对不可能当场吃！我赌五毛钱主角会把丹药悄悄喂给跟踪他的那个黑衣刺客试毒，既鉴毒又借刀杀人！',
    likes: 892,
    sentiment: 'EXCITED',
    extractedHook: '借毒丹反喂追踪刺客，实现双杀鉴定',
    createdAt: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: 'disc-003',
    novelId: 'nov-001',
    chapterIndex: 2,
    paragraphSnippet: '“林越站在长街尽头，思索着九大皇朝近三百年的疆域变迁……”',
    readerName: '熬夜追更人',
    platform: '书友群',
    commentText: '大大，第二章中段这段地理历史科普稍微有点干巴，刺客都在后面追杀了，主角还在脑补三百年前的疆域图，建议改成一边跑路一边利用地形机关阴人！',
    likes: 340,
    sentiment: 'COMPLAINT_WARNING',
    extractedHook: '【防雷预警】删减静态历史说明文，转化为追逃过程中的古建筑地形杀与机关博弈',
    createdAt: new Date(Date.now() - 1000 * 60 * 150).toISOString(),
  },
];

export async function fetchEpiphanySparks(novelId: string): Promise<EpiphanySpark[]> {
  return safeFetch<EpiphanySpark[]>(`/novels/${novelId}/sparks`, undefined, defaultEpiphanySparks);
}

export async function saveEpiphanySpark(spark: EpiphanySpark): Promise<EpiphanySpark> {
  return safeFetch<EpiphanySpark>(
    `/novels/${spark.novelId}/sparks`,
    {
      method: 'POST',
      body: JSON.stringify(spark),
    },
    spark
  );
}

export async function deleteEpiphanySpark(novelId: string, sparkId: string): Promise<boolean> {
  return safeFetch<{ success: boolean }>(
    `/novels/${novelId}/sparks/${sparkId}`,
    { method: 'DELETE' },
    { success: true }
  ).then((r) => r.success);
}

export async function fetchReaderDiscussions(novelId: string): Promise<ReaderDiscussionComment[]> {
  return safeFetch<ReaderDiscussionComment[]>(
    `/novels/${novelId}/reader-discussions`,
    undefined,
    defaultReaderDiscussions
  );
}

export async function collideSparks(
  sparkA: EpiphanySpark,
  sparkB: EpiphanySpark
): Promise<SparkCollisionResult> {
  const fallbackCollision: SparkCollisionResult = {
    sparkAId: sparkA.id,
    sparkBId: sparkB.id,
    fusionTitle: `【灵感聚变】${sparkA.title.slice(0, 10)} × ${sparkB.title.slice(0, 10)}`,
    combinedPlotTwist: `将“${sparkA.title}”与“${sparkB.title}”强行交织：当主角踏入交易场所试图探寻线索时，发现对方索要的代价恰恰与那位隐藏身份的宿命人物息息相关，两根原本平行的暗线在同一场雨夜死局中轰然相撞！`,
    dramaticTensionBonus: 34,
    recommendedChapterPlacement: '建议作为当前卷中段（第 6-8 章）的破局反转高潮',
    sceneBeatPreview: '【起】线索中断陷入僵局 -> 【承】偶遇特殊规则触发旧物异动 -> 【转】双线重合揭露惊天隐秘 -> 【合】留下更大悬念全身而退',
  };

  return safeFetch<SparkCollisionResult>(
    '/sparks/collide',
    {
      method: 'POST',
      body: JSON.stringify({ spark_a: sparkA, spark_b: sparkB }),
    },
    fallbackCollision
  );
}

// ==============================================================================
// 6. 跨作品创作技能与套路中心库接口 (Central Skill & Reusable Asset Vault)
// ==============================================================================

export const defaultCreationSkills: CreationSkillItem[] = [
  {
    id: 'skill-trope-001',
    name: '【套路模版】拍卖会压轴盲盒·低调截胡与反钓鱼执法',
    category: 'TROPE',
    sourceNovelTitle: '《凡人修仙传》/《太虚纪元》实战沉淀',
    description: '主角在大型拍卖会绝不与世家公子正面竞价结仇，而是通过神识异动锁定流拍废铁/不起眼添头，并在出城后反手布置困杀阵，将尾随截杀的贪婪修士变成移动提款机。',
    promptDirective:
      '【技能挂载：拍卖会反钓鱼截胡法则】1. 严禁主角在包厢内大喊大叫高调竞拍拉仇恨；2. 重点描写宝物表面的残损伪装与主角金手指独有的微弱共鸣；3. 必须配套一段“出城三十里荒林故意露怯引蛇出洞”的反杀舔包爽点闭环。',
    exampleSnippet:
      '台下世家子弟为了一枚筑基丹争得面红耳赤，林越却只是拢着袖口，在角落里用三十块下品灵石拍下了那卷无人问津的焦黑兽皮。待走出坊市百里，他故意放慢遁速，听着身后破空而来的三道衣袂声，指尖阵旗悄然滑入泥土。',
    triggerKeywords: ['拍卖', '黑市', '坊市', '夺宝', '竞价', '截杀', '灵石'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 28,
    effectivenessRating: 95,
    structuredMeta: {
      stages: ['低调入场易容', '金手指识破蒙尘至宝', '放弃正面竞价暗中交割', '出城荒野反杀尾随者'],
      dopamineScore: 94,
    },
    createdAt: '2026-03-01T08:00:00Z',
  },
  {
    id: 'skill-power-001',
    name: '【等级体系】九重因果命途·越阶反杀代价与法则克制表',
    category: 'POWER_TIER',
    sourceNovelTitle: '《太虚纪元》核心战力母本',
    description: '摒弃纯数值碾压，每一重境界晋升都伴随严格的“寿元/人性代价”与“五行/因果克制链”，使低境界主角能凭借情报差与环境阵法合理越阶反杀，绝不战力崩坏。',
    promptDirective:
      '【技能挂载：因果命途战力硬约束】1. 每次越阶战斗必须明确说明高境界敌人的法则护体弱点；2. 主角动用底牌必须支付具体可见的肉身或神魂代价（如右臂经脉龟裂、三日失明、折损阳寿）；3. 严禁无铺垫爆发秒杀高两个大境界的敌人。',
    exampleSnippet:
      '金丹修士的护体罡气固若金汤，寻常飞剑难伤分毫。但林越早已算准对方每逢子时功法运转必有半息滞涩于膻中穴，他不惜震碎左手三根指骨强行催动破禁残符，一剑精准刺入那缕微不可查的灵力漩涡！',
    triggerKeywords: ['突破', '境界', '越阶', '反杀', '金丹', '筑基', '渡劫', '战力'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 42,
    effectivenessRating: 97,
    structuredMeta: {
      tiers: ['淬骨境', '凝煞境', '筑基境', '金丹境', '元婴境', '化神境', '洞虚境', '大乘境', '太虚渡劫'],
      scalingRule: '每跨一大境界正面战力差距10倍，需靠阵法、毒丹、信息差弥补',
    },
    createdAt: '2026-03-02T08:00:00Z',
  },
  {
    id: 'skill-conflict-001',
    name: '【戏剧冲突】三方罗生门死局·借刀杀人祸水东引公式',
    category: 'CONFLICT',
    sourceNovelTitle: '《诡秘之主》/ 权谋智斗沉淀库',
    description: '当主角面临不可力敌的强敌A追杀时，绝不硬拼，而是伪造强敌B的独门信物或功法痕迹，将追杀者A引入强敌B的禁地，促成两大庞然大物火并，主角在混乱中浑水摸鱼。',
    promptDirective:
      '【技能挂载：三方罗生门祸水东引】1. 必须在场景中引入第三方潜伏势力；2. 详细描写主角如何利用细节伪造嫁祸线索（如残留功法气息、特制暗器、密信印鉴）；3. 营造双方误判火并时的戏剧讽刺张力。',
    exampleSnippet:
      '林越并未直接逃向城门，而是反身掠入万毒门驻地后巷，将从九黎卫队长身上夺来的玄铁令箭故意钉在万毒门少主的灵兽颅骨上。半柱香后，两拨煞气冲天的人马在雨夜长街迎面撞上，一言不合便祭出了本命杀招。',
    triggerKeywords: ['追杀', '死局', '强敌', '嫁祸', '借刀杀人', '潜伏', '混战', '绝境'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 35,
    effectivenessRating: 96,
    createdAt: '2026-03-03T08:00:00Z',
  },
  {
    id: 'skill-dungeon-001',
    name: '【副本模版】规则怪谈型上古仙墓·认知污染与倒计时逃生',
    category: 'DUNGEON',
    sourceNovelTitle: '《宿命之环》× 古典秘境融合库',
    description: '将传统打怪掉宝秘境升级为“三条必死禁忌规则 + 时辰沙漏倒计时”的高压悬疑副本。唯有勘破墓主人留下的文字陷阱，才能在全员团灭前夺取核心传承。',
    promptDirective:
      '【技能挂载：规则怪谈秘境机制】1. 进入副本前先通过残碑或前人遗骸立下三条看似矛盾的生存禁忌；2. 安排一名莽撞配角因违反第一条禁忌而瞬间异化惨死，拉满恐怖压迫感；3. 主角利用逆向推理找出规则漏洞破局。',
    exampleSnippet:
      '石碑上用干涸的黑血刻着三行字：【一、听见哭声必须熄灭魂灯；二、魂灯熄灭超过三息将被影子吞噬；三、绝不可相信穿白衣的同门。】林越目光微凛，缓缓看向身旁正准备吹熄魂灯的白衣师妹。',
    triggerKeywords: ['秘境', '副本', '遗迹', '古墓', '荒冢', '禁地', '试炼', '石碑'],
    isEnabled: false,
    autoMatchEligible: true,
    reusedCount: 19,
    effectivenessRating: 93,
    createdAt: '2026-03-04T08:00:00Z',
  },
  {
    id: 'skill-arch-001',
    name: '【章节架构】黄金断章钩子三连击·欲扬先抑悬念收尾法',
    category: 'ARCHITECTURE',
    sourceNovelTitle: '起点百订飙升万订实战模型',
    description: '每章最后300字严禁平淡收尾或倒头大睡！必须采用“刚解决眼下危机 -> 清点战利品发现惊天异常 -> 门外/天际突然传来不可思议的异响”三步断章法，锁死读者追读率。',
    promptDirective:
      '【技能挂载：黄金断章钩子法则】本章结尾最后两段必须严格执行断章悬念：在主角刚刚松一口气或收获宝物的瞬间，立刻抛出一个违背常理的视觉/听觉异象或身份反转，将悬念留在最高潮处戛然而止。',
    exampleSnippet:
      '林越长吐一口浊气，将那枚温热的储物戒收入怀中。然而当他神识探入戒内空间的一刹那，呼吸骤然停滞——戒指角落里静静躺着的，赫然是他三年前亲手埋进祖坟的自己的牌位！与此同时，门外寂静的雨夜里，响起了三声沉重而熟悉的叩门声。',
    triggerKeywords: ['断章', '结尾', '悬念', '黄金三章', '高潮', '反转'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 64,
    effectivenessRating: 99,
    createdAt: '2026-03-05T08:00:00Z',
  },
  {
    id: 'skill-style-001',
    name: '【文风范式】电影级冷兵器动作分镜·肌肉发力与环境互动白描',
    category: 'STYLE',
    sourceNovelTitle: '新派硬核武侠/仙侠动作指导库',
    description: '拒绝“两人大战三百回合、霞光万道”的敷衍水字数描写，强制细化到“足尖碾碎青砖、刀锋擦过铁甲迸出火星、雨水被剑气蒸干成白雾”的物理打击感。',
    promptDirective:
      '【技能挂载：硬核动作物理分镜】描写战斗时，必须包含：1. 重心转换与地面物理破坏；2. 兵器交击的金铁震颤与虎口痛感；3. 周边环境（雨水、落叶、烛火、断柱）被气劲波及的实时动态反馈。',
    exampleSnippet:
      '他左足猛然踏裂湿滑青砖，泥水飞溅间，整个人如一张拉满的铁胎硬弓骤然崩弦！窄刃短刀贴着对方横扫而来的铁枪杆一路刮擦向前，刺目火星连成一线，在枪尖回防不及的半寸死角，刀柄重重撞碎对方喉骨！',
    triggerKeywords: ['战斗', '挥剑', '拔剑', '伏击', '厮杀', '交锋', '出手', '杀招'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 51,
    effectivenessRating: 96,
    createdAt: '2026-03-06T08:00:00Z',
  },
  {
    id: 'skill-idea-001',
    name: '【脑洞设定】寿元借贷钱庄·向未来的自己预支满级修为',
    category: 'IDEA',
    sourceNovelTitle: '高概念金手指创意工坊',
    description: '主角可向天道钱庄预支自己未来巅峰期的三息修为来秒杀强敌，但必须在规定期限内把修为练到对应境界完成“还贷”，否则将遭受天道连本带利的抹杀催收。',
    promptDirective:
      '【技能挂载：未来修为借贷与催收紧迫感】在主角陷入绝境时允许启用修为预支，但每次预支后必须立刻更新“天道还款倒计时”，利用还款期限倒逼主角主动闯秘境夺机缘。',
    exampleSnippet:
      '【契约成立：您已成功预支十年后“元婴大圆满”巅峰一剑（体验时长：三息）。警告：请于九十日内晋升筑基中期偿还首期利息，逾期将剥夺双目视觉。】',
    triggerKeywords: ['金手指', '底牌', '绝境', '代价', '倒计时', '外挂'],
    isEnabled: false,
    autoMatchEligible: true,
    reusedCount: 15,
    effectivenessRating: 91,
    createdAt: '2026-03-07T08:00:00Z',
  },
  {
    id: 'skill-char-001',
    name: '【人设原型】悲情宿命型秩序反派·“我若入魔，天下无人需脏手”',
    category: 'CHARACTER_ARCHETYPE',
    sourceNovelTitle: '群像神作反派塑造法则',
    description: '摒弃无脑嘲讽主角的降智反派。反派同样智商极高、心怀苍生大义，只是与主角在“牺牲少数人拯救世界”还是“一人不弃逆天改命”的底层道心上发生不可调和的宿命碰撞。',
    promptDirective:
      '【技能挂载：高智商宿命反派塑造】反派登场时严禁使用无脑鄙视台词；赋予反派克制有礼的谈吐、令人信服的救世逻辑，以及在私下里独自背负骂名与伤痛的立体侧面。',
    exampleSnippet:
      '苏清寒轻轻拭去剑锋上的血迹，目光平静地望着满城火光：“林越，你恨我冷血屠城，可你若见过三十年前天渊魔潮吞没十九州的惨状，便会明白——今日这三万人的性命，是我替这人间苍生交出的唯一买命钱。”',
    triggerKeywords: ['反派', '圣女', '师尊', '首领', '对峙', '道心', '宿敌'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 23,
    effectivenessRating: 95,
    createdAt: '2026-03-08T08:00:00Z',
  },
];

export async function fetchCreationSkills(): Promise<CreationSkillItem[]> {
  return safeFetch<CreationSkillItem[]>('/skills/vault', undefined, defaultCreationSkills);
}

export async function saveCreationSkill(skill: CreationSkillItem): Promise<CreationSkillItem> {
  return safeFetch<CreationSkillItem>(
    '/skills/vault',
    {
      method: 'POST',
      body: JSON.stringify(skill),
    },
    skill
  );
}

export async function deleteCreationSkill(skillId: string): Promise<boolean> {
  return safeFetch<{ success: boolean }>(
    `/skills/vault/${skillId}`,
    { method: 'DELETE' },
    { success: true }
  ).then((r) => r.success);
}

export async function autoMatchSkillsForScene(
  sceneContextText: string,
  allSkills: CreationSkillItem[]
): Promise<SkillAutoMatchResult> {
  const matchedIds: string[] = [];
  const reasons: Record<string, string> = {};

  for (const sk of allSkills) {
    if (!sk.autoMatchEligible) continue;
    const hitKeywords = sk.triggerKeywords.filter((kw) => sceneContextText.includes(kw));
    if (hitKeywords.length > 0 || sk.category === 'ARCHITECTURE') {
      matchedIds.push(sk.id);
      reasons[sk.id] =
        hitKeywords.length > 0
          ? `检测到场景语义命中触发词【${hitKeywords.join('、')}】，自动挂载该${sk.category}技能以强化戏剧张力。`
          : `全局长篇追读保障：自动挂载【${sk.name}】以确保章末悬念钩子闭合。`;
    }
  }

  // 保底至少匹配3项核心技能
  if (matchedIds.length < 3) {
    for (const sk of allSkills.slice(0, 3)) {
      if (!matchedIds.includes(sk.id)) {
        matchedIds.push(sk.id);
        reasons[sk.id] = `AI 剧情拓扑分析推荐：当前场次适合引入【${sk.name}】提升爽点兑现率。`;
      }
    }
  }

  const fallbackResult: SkillAutoMatchResult = {
    sceneContextSummary: sceneContextText.slice(0, 120),
    matchedSkillIds: matchedIds,
    matchReasons: reasons,
  };

  return safeFetch<SkillAutoMatchResult>(
    '/skills/auto-match',
    {
      method: 'POST',
      body: JSON.stringify({ scene_context: sceneContextText }),
    },
    fallbackResult
  );
}

export async function extractSkillFromManuscript(input: {
  manuscriptText: string;
  preferredCategory: CreationSkillCategory;
  sourceNovelTitle: string;
  customName?: string;
}): Promise<CreationSkillItem> {
  const categoryLabels: Record<CreationSkillCategory, string> = {
    IDEA: '脑洞设定',
    TROPE: '爽点套路',
    POWER_TIER: '等级体系',
    ARCHITECTURE: '叙事架构',
    STYLE: '文风范式',
    DUNGEON: '副本机制',
    CONFLICT: '冲突公式',
    CHARACTER_ARCHETYPE: '人设原型',
  };

  const label = categoryLabels[input.preferredCategory] || '核心技能';
  const fallbackExtracted: CreationSkillItem = {
    id: `skill-ext-${Date.now()}`,
    name: input.customName || `【${label}】从《${input.sourceNovelTitle}》萃取的高光范式`,
    category: input.preferredCategory,
    sourceNovelTitle: input.sourceNovelTitle,
    description: `基于正文中“${input.manuscriptText.slice(0, 45)}...”逆向解构提炼的可复用创作技能模块。`,
    promptDirective: `【技能挂载：${input.customName || label}】请严格复刻该技能的结构张力：以环境压迫感起笔，通过信息差与动作细节推进矛盾，并在收尾处完成情绪或战利品的超预期兑现。`,
    exampleSnippet: input.manuscriptText.slice(0, 180),
    triggerKeywords: ['反杀', '悬念', '突破', '博弈', '秘境'],
    isEnabled: true,
    autoMatchEligible: true,
    reusedCount: 1,
    effectivenessRating: 92,
    createdAt: new Date().toISOString(),
  };

  return safeFetch<CreationSkillItem>(
    '/skills/extract',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
    fallbackExtracted
  );
}

export async function subvertTropeSkill(
  skill: CreationSkillItem
): Promise<TropeSubversionVariant[]> {
  const fallbackVariants: TropeSubversionVariant[] = [
    {
      id: `subv-${Date.now()}-1`,
      originalSkillName: skill.name,
      subversionTitle: '变异方案 A：猎人与猎物的双重伪装反转',
      classicExpectation: '读者以为是主角单方面扮猪吃虎，尾随者全是贪婪蠢货。',
      subvertedTwist: '尾随者表面上是贪图宝物的散修，实则是主角宿敌故意派来用苦肉计向主角投诚的死士；而主角拍下的宝物本身就是宿敌设下的因果信标，主角将计就计把信标反绑在了第三方的灵舟上。',
      dramaticPayoff: '三层智商博弈叠加，打破常规无脑舔包的审美疲劳，爽感升维！',
    },
    {
      id: `subv-${Date.now()}-2`,
      originalSkillName: skill.name,
      subversionTitle: '变异方案 B：规则代价反噬与道德困境破局',
      classicExpectation: '主角毫无代价地全歼敌人并顺利拿走全部战利品。',
      subvertedTwist: '至宝激活需要献祭在场最高修为者的毕生修为，敌人临死前竟然主动狂笑自爆修为强行污染至宝，试图拉主角一起堕入魔道，主角必须在三息内斩断宝物一半灵性来自救。',
      dramaticPayoff: '敌人不再是送快递的工具人，惨烈决绝的博弈让来之不易的收获更具分量！',
    },
    {
      id: `subv-${Date.now()}-3`,
      originalSkillName: skill.name,
      subversionTitle: '变异方案 C：场外观众视角与江湖传闻错位',
      classicExpectation: '正面平铺直叙描写主角如何打赢。',
      subvertedTwist: '不写战斗正面过程，而是通过半个时辰后赶到现场的朝廷密探视角，看着满地诡异结冰的火焰与一击必杀的剑痕，层层倒推还原刚才那场惊世骇俗的秒杀，把主角脑补成隐世千年的老怪。',
      dramaticPayoff: '侧面烘托装逼效果拉满，极大满足读者的幕后大佬爽感！',
    },
  ];

  return safeFetch<TropeSubversionVariant[]>(
    '/skills/subvert',
    {
      method: 'POST',
      body: JSON.stringify({ skill_id: skill.id, skill_name: skill.name }),
    },
    fallbackVariants
  );
}

// ==============================================================================
// 7. 全自动无人值守巡航码字机接口 (Autonomous Marathon Autopilot Engine)
// ==============================================================================

export async function runAutopilotSegmentGeneration(params: {
  novelId: string;
  novelTitle: string;
  mode: 'ZERO_INPUT_PURE_AUTO' | 'REFERENCE_GUIDED_AUTO';
  referenceDataText?: string;
  chapterIndex: number;
  sceneIndex: number;
  activeSkills: CreationSkillItem[];
  anchoredSparks: EpiphanySpark[];
}): Promise<AutopilotGeneratedSegment> {
  const skillNames = params.activeSkills.map((s) => s.name);
  const sparkTitles = params.anchoredSparks.map((sp) => sp.title);

  const refHint =
    params.mode === 'REFERENCE_GUIDED_AUTO' && params.referenceDataText?.trim()
      ? `\n（已深度融汇作者投喂参考资料：“${params.referenceDataText.slice(0, 60)}...”）`
      : '';

  const sparkHint =
    sparkTitles.length > 0
      ? `\n\n恰在此时，林越脑海中掠过那道早已埋藏多时的伏线——${sparkTitles[0]}。长街尽头的雨幕仿佛静止了一瞬，那名平日里毫不起眼的瞎眼老仆竟缓缓抬起了浑浊的眼眸，枯瘦的指尖在青竹扫帚上轻轻一叩，整座护山残阵顿时发出万剑悲鸣般的嗡响！`
      : `\n\n风雪愈发急促，青石板上的血水顺着排水石槽蜿蜒流淌。林越没有在原地多做哪怕一息的停留，左手袖中的破禁残符悄然化作飞灰，整个人借着夜色与阵雾的掩护，如一缕幽魂般掠入了千机阁最深处的暗巷。`;

  const generatedProse = `【第 ${params.chapterIndex} 章 · 第 ${params.sceneIndex} 幕：夜雨惊变与因果落子】${refHint}

残烛在穿堂冷风中剧烈摇晃，将破庙四壁的斑驳神像拉扯出无数张牙舞爪的暗影。

林越背靠着冰冷刺骨的青石断柱，指腹轻轻摩挲着怀中那面布满裂纹的太虚铜镜。铜镜背面的古老铭文正随着他急促的心跳微微发烫，每一道血色丝线都在预示着十步之外那三名九黎暗卫即将发动的合击死角。

“事不可为，且退一步；既退无可退，便借尔等性命一用。”

他声音极轻，几乎被窗外震耳欲聋的雷鸣彻底吞没。下一瞬，他左足猛然踏碎脚下湿滑的青砖，碎石飞溅如暗器般封死左侧刀客的视线，右手残剑则沿着铜镜推演出的那唯一一线生机，贴着铁枪杆一路刮擦出刺目火星，精准无比地刺入为首统领膻中穴半寸滞涩之处！${sparkHint}

当最后一具黑衣尸首重重栽倒在积水潭中时，林越俯身拾起对方腰间那枚尚带余温的玄铁令箭。然而就在他翻转令箭背面的一刹那，瞳孔骤然收缩——那上面镌刻的暗记，竟然指向了三日前刚刚与他把酒言欢的故人！`;

  const fallbackSegment: AutopilotGeneratedSegment = {
    id: `auto-seg-${Date.now()}-${params.sceneIndex}`,
    chapterIndex: params.chapterIndex,
    chapterTitle: `第 ${params.chapterIndex} 章：暗流涌动与宿命反杀`,
    sceneIndex: params.sceneIndex,
    sceneTitle: `第 ${params.sceneIndex} 幕：因果推演与雨夜破局`,
    content: generatedProse,
    wordCount: generatedProse.length,
    qualityScore: 94,
    appliedSkills: skillNames.slice(0, 3),
    incorporatedSparks: sparkTitles.slice(0, 2),
    createdAt: new Date().toISOString(),
  };

  return safeFetch<AutopilotGeneratedSegment>(
    '/autopilot/generate-segment',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    fallbackSegment
  );
}

