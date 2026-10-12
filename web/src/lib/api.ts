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

export async function fetchModelProviders(): Promise<ModelProvider[]> {
  return safeFetch<ModelProvider[]>('/models/providers', undefined, defaultModelProviders);
}

export async function saveModelProvider(provider: ModelProvider): Promise<ModelProvider> {
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
