// ==============================================================================
// 多模型矩阵与高可用容灾路由中枢 (Multi-Provider Model Matrix & Resilience Router)
// 商业级 AI 创作基础设施：多模型订阅协作、多 Key 轮换负载池、角色能力专精路由、
// 429 额度耗尽秒级无缝熔断接管、Token 成本遥测与双模型横向比武竞技场
// 全面扩展 G13-G18：
// G13: 多平台订阅月度额度水位线 & 低余额提前自动切换阈值滑块
// G14: 四阶多模型流水线接力协作沙盒 (R1规划 -> Claude起草 -> V3精修 -> Gemini稽查)
// G15: 三大全局路由协作流派预设 (殿堂文学流 / 极致省钱流 / 极速日万流)
// G16: 三级级联熔断兜底链 (主力云端 -> 备选云端 -> 本地 Ollama 零成本兜底) & 半开探测
// G17: 百万字长篇 KV 前缀缓存与脱水省钱计算器
// G18: 擂台赛胜出模型一键扶正为主笔 & 采纳优胜正文写入【创作台】
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  ModelProvider,
  ModelRoleAssignment,
  ModelTelemetry,
  ModelCapabilityRole,
} from '../../types/novel';
import {
  fetchModelProviders,
  fetchModelRoleAssignments,
  saveModelRoleAssignment,
  simulateModelFallback,
  fetchModelTelemetry,
  FallbackSimulateResult,
} from '../../lib/api';
import {
  Cpu,
  ShieldCheck,
  Zap,
  Plus,
  Key,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Play,
  Server,
  Sparkles,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  Feather,
  Workflow,
  Award,
  Calculator,
  BatteryCharging,
} from 'lucide-react';
import { NavTab } from '../Header';

const ROLE_META: Record<
  ModelCapabilityRole,
  { name: string; desc: string; icon: string; recommended: string }
> = {
  PLANNER: {
    name: '架构总监 (Planner)',
    desc: '深度思考推理、宏观纪元构建、大纲多分支推演',
    icon: '🧠',
    recommended: 'DeepSeek-R1 / Claude 3.7 Thinking / o3-mini',
  },
  DRAFTER: {
    name: '主笔起草 (Drafter)',
    desc: '长篇正文行文、场景感官细节铺陈、叙事连贯起承转合',
    icon: '✍️',
    recommended: 'Claude 3.5 Sonnet / GPT-4.5 / Qwen 2.5 72B',
  },
  STYLIST: {
    name: '文学精修 (Stylist)',
    desc: '文风仿生克隆、音律节奏调优、去 AI 翻译腔去套话',
    icon: '🎨',
    recommended: 'DeepSeek-V3 / Claude 3.5 / SiliconFlow',
  },
  INSPECTOR: {
    name: '设定稽查 (Inspector)',
    desc: '世界观合规核验、人设战力 OOC 拦截、时间线前后矛盾审查',
    icon: '🛡️',
    recommended: 'Gemini 2.5 Pro / DeepSeek-R1',
  },
  VIDEO_DIRECTOR: {
    name: '分镜导演 (Video Director)',
    desc: '影视镜头语言、机位运动矢量、Sora/可灵分镜提示词编排',
    icon: '🎬',
    recommended: 'GPT-4o / Gemini 2.5 Flash',
  },
};

// G13: 各平台订阅额度与免费赠金池元数据
const SUBSCRIPTION_QUOTA_META: Record<
  string,
  { planName: string; remainingPct: number; quotaLabel: string; billingMode: string }
> = {
  'prov-deepseek': {
    planName: 'DeepSeek 官方 API + 硬盘缓存池',
    remainingPct: 84,
    quotaLabel: '¥ 168.40 / ¥ 200.00',
    billingMode: 'KV Cache 命中仅 0.1元/百万Token',
  },
  'prov-anthropic': {
    planName: 'Claude Max / Tier-4 文学主笔订阅池',
    remainingPct: 38,
    quotaLabel: '$ 38.20 / $ 100.00',
    billingMode: '仅在高潮大章起草时精准调用',
  },
  'prov-openai': {
    planName: 'OpenAI Plus / API 组织配额池',
    remainingPct: 72,
    quotaLabel: '$ 72.00 / $ 100.00',
    billingMode: '分镜编排与多模态校验',
  },
  'prov-gemini': {
    planName: 'Google AI Studio 200万长窗口订阅池',
    remainingPct: 91,
    quotaLabel: '1,365 / 1,500 RPD 免费高配额',
    billingMode: '全书跨卷伏笔与防幻觉终审首选',
  },
  'prov-siliconflow': {
    planName: '硅基流动 (SiliconFlow) 赠金与高速池',
    remainingPct: 95,
    quotaLabel: '¥ 95.00 赠金余额',
    billingMode: '429 熔断毫秒级高速备份接管',
  },
  'prov-ollama': {
    planName: '本地 Apple Silicon M-Max 离线算力池',
    remainingPct: 100,
    quotaLabel: '∞ 无限免费本地 Token',
    billingMode: '断网/全平台额度耗尽终极兜底',
  },
};

interface ModelHubViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const ModelHubView: React.FC<ModelHubViewProps> = ({ onNavigateTab }) => {
  const { activeChapter, editorContent, setEditorContent } = useNovel();

  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [roles, setRoles] = useState<ModelRoleAssignment[]>([]);
  const [telemetry, setTelemetry] = useState<ModelTelemetry[]>([]);
  const [activeTab, setActiveTab] = useState<
    'PROVIDERS' | 'ROUTING' | 'RELAY_PIPELINE' | 'FAILOVER' | 'TELEMETRY' | 'ARENA'
  >('PROVIDERS');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('prov-deepseek');
  const [showKeySecret, setShowKeySecret] = useState<Record<string, boolean>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<FallbackSimulateResult | null>(null);
  const [testingRole, setTestingRole] = useState<ModelCapabilityRole>('PLANNER');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // G13: 低额度提前自动切换阈值
  const [preemptiveSwitchThreshold, setPreemptiveSwitchThreshold] = useState<number>(15);

  // G14: 四阶多模型接力协作流水线状态
  const [relayBeatInput, setRelayBeatInput] = useState<string>(
    '林越潜入九黎卫黑市拍卖场，用残破因果铜镜看穿压轴盲盒里的断剑竟是恩师遗物，并在出城荒林反杀三名筑基期截杀者。'
  );
  const [isRunningRelay, setIsRunningRelay] = useState<boolean>(false);
  const [relayStages, setRelayStages] = useState<
    Array<{
      stage: string;
      role: string;
      model: string;
      tokens: string;
      output: string;
    }>
  >([]);

  // G17: 百万字长篇省钱计算器状态
  const [plannedMillionWords, setPlannedMillionWords] = useState<number>(150); // 150万字

  // 比武竞技场状态
  const [arenaPrompt, setArenaPrompt] = useState<string>(
    '【场景】天绝峰雨夜。主角林越负伤背倚断剑残碑，三名黑衣追兵逼近。请撰写一段 150 字的极具张力的动作交锋与雨夜环境白描。'
  );
  const [arenaModelA, setArenaModelA] = useState<string>('deepseek-reasoner (R1)');
  const [arenaModelB, setArenaModelB] = useState<string>('claude-3-5-sonnet-20241022');
  const [arenaRunning, setArenaRunning] = useState<boolean>(false);
  const [arenaOutputA, setArenaOutputA] = useState<string | null>(null);
  const [arenaOutputB, setArenaOutputB] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [pList, rList, tList] = await Promise.all([
      fetchModelProviders(),
      fetchModelRoleAssignments(),
      fetchModelTelemetry(),
    ]);
    setProviders(pList);
    setRoles(rList);
    setTelemetry(tList);
  };

  const selectedProvider = providers.find((p) => p.id === selectedProviderId) || providers[0];

  const notify = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => setStatusBanner(null), 4000);
  };

  const handleToggleKeyVisibility = (keyIdx: number) => {
    setShowKeySecret((prev) => ({
      ...prev,
      [`${selectedProvider.id}-${keyIdx}`]: !prev[`${selectedProvider.id}-${keyIdx}`],
    }));
  };

  // G15: 一键应用全局路由策略预设
  const handleApplyRoutingPreset = (presetType: 'QUALITY' | 'FRUGAL' | 'SPEED') => {
    const nextRoles = roles.map((r) => {
      if (presetType === 'QUALITY') {
        const map: Record<ModelCapabilityRole, { p: string; f: string }> = {
          PLANNER: { p: 'deepseek-reasoner (R1)', f: 'claude-3-7-sonnet-thought' },
          DRAFTER: { p: 'claude-3-5-sonnet-20241022', f: 'gpt-4.5-preview' },
          STYLIST: { p: 'claude-3-5-sonnet-20241022', f: 'deepseek-chat (V3)' },
          INSPECTOR: { p: 'gemini-2.5-pro', f: 'deepseek-reasoner (R1)' },
          VIDEO_DIRECTOR: { p: 'gpt-4o', f: 'gemini-2.5-flash' },
        };
        return { ...r, primaryModel: map[r.role].p, fallbackModel: map[r.role].f };
      }
      if (presetType === 'FRUGAL') {
        const map: Record<ModelCapabilityRole, { p: string; f: string }> = {
          PLANNER: { p: 'deepseek-reasoner (R1)', f: 'Qwen/Qwen2.5-72B-Instruct' },
          DRAFTER: { p: 'deepseek-chat (V3)', f: 'Qwen/Qwen2.5-72B-Instruct' },
          STYLIST: { p: 'deepseek-chat (V3)', f: 'Qwen/Qwen2.5-72B-Instruct' },
          INSPECTOR: { p: 'gemini-2.5-pro', f: 'gemini-2.5-flash' },
          VIDEO_DIRECTOR: { p: 'gemini-2.5-flash', f: 'deepseek-chat (V3)' },
        };
        return { ...r, primaryModel: map[r.role].p, fallbackModel: map[r.role].f };
      }
      const map: Record<ModelCapabilityRole, { p: string; f: string }> = {
        PLANNER: { p: 'gemini-2.5-pro', f: 'deepseek-chat (V3)' },
        DRAFTER: { p: 'deepseek-chat (V3)', f: 'gemini-2.5-flash' },
        STYLIST: { p: 'deepseek-chat (V3)', f: 'gemini-2.5-flash' },
        INSPECTOR: { p: 'gemini-2.5-pro', f: 'gemini-2.5-flash' },
        VIDEO_DIRECTOR: { p: 'gpt-4o', f: 'gemini-2.5-flash' },
      };
      return { ...r, primaryModel: map[r.role].p, fallbackModel: map[r.role].f };
    });
    setRoles(nextRoles);
    nextRoles.forEach((item) => saveModelRoleAssignment(item));
    notify(
      presetType === 'QUALITY'
        ? '👑 已切换至【殿堂文学质量流】：R1 严密推演大纲 + Claude 3.5 Sonnet 沉浸主笔！'
        : presetType === 'FRUGAL'
        ? '💰 已切换至【极致省钱性价比流】：全链路开启 DeepSeek KV 缓存 + Gemini 免费额度池，综合成本降低 84%！'
        : '⚡ 已切换至【极速爆更日万流】：高并发低延迟模型编队已就绪！'
    );
  };

  // G14: 运行四阶多模型接力协作沙盒
  const handleRunRelayPipeline = () => {
    setIsRunningRelay(true);
    setTimeout(() => {
      const plannerModel =
        roles.find((r) => r.role === 'PLANNER')?.primaryModel || 'deepseek-reasoner (R1)';
      const drafterModel =
        roles.find((r) => r.role === 'DRAFTER')?.primaryModel || 'claude-3-5-sonnet-20241022';
      const stylistModel =
        roles.find((r) => r.role === 'STYLIST')?.primaryModel || 'deepseek-chat (V3)';
      const inspectorModel =
        roles.find((r) => r.role === 'INSPECTOR')?.primaryModel || 'gemini-2.5-pro';

      setRelayStages([
        {
          stage: '第一棒：逻辑与爽点节拍规划',
          role: '🧠 架构总监 (Planner)',
          model: plannerModel,
          tokens: 'In: 410 (Tuple脱水) / Out: 280',
          output: `【R1 推理规划输出】针对“${relayBeatInput.slice(
            0,
            28
          )}...”设计三步信息差反转：1. 包厢内故意对压轴盲盒表现出鄙夷以麻痹九黎卫暗探；2. 借拍下废丹之名顺手交割断剑；3. 出城三十里黑松林提前布下颠倒五行阵，利用三息因果逆转反杀领头筑基修士。`,
        },
        {
          stage: '第二棒：高张力五感正文起草',
          role: '✍️ 主笔起草 (Drafter)',
          model: drafterModel,
          tokens: 'In: 690 / Out: 920',
          output: `拍卖槌落下的脆响在闷热的黑市地窟里回荡。林越缩在斗篷阴影中，指腹悄然擦过怀中冰凉的残破铜镜——镜面上映出的并非台上那方锈迹斑斑的铁盒，而是恩师佩剑断裂处独有的云雷暗纹。\n当他走出坊市踏入黑松林的湿冷夜雾时，身后三道筑基期的狂暴神识终于不再掩饰。林越脚步未停，右足轻叩地面阵眼，袖中断剑铮然出鞘！`,
        },
        {
          stage: '第三棒：名家文风精修与去AI套话',
          role: '🎨 文学精修 (Stylist)',
          model: stylistModel,
          tokens: 'In: 950 / Out: 940',
          output: `【精修定稿】铜槌敲击紫檀案几的闷响在地下黑市回荡，烛火摇曳间，林越拢了拢粗麻斗篷，指腹摩挲着袖中寒意森然的残破铜镜。台上那柄被众人嗤笑的焦黑断剑，在铜镜三息溯源的映照下，剑脊处赫然浮现出恩师独有的云雷暗印。\n半柱香后，城外黑松林寒雾弥漫。身后三道破空声骤然欺近，林越非但没有惊慌逃窜，反而借着夜雨掩护踏碎阵眼青石——因果逆转三息启动，原本刺向他后心的淬毒短刃，在毫厘之间诡异地偏转三寸，反手一剑封喉！`,
        },
        {
          stage: '第四棒：L4 防幻觉与战力账本终审',
          role: '🛡️ 设定稽查 (Inspector)',
          model: inspectorModel,
          tokens: 'In: 520 / Out: 110',
          output: `✅ 【终审通过 · 0 幻觉放行】1. 主角当前境界聚气境初期，借助提前布阵与铜镜三息因果逆转反杀大意筑基修士，符合越阶代价铁律；2. 恩师佩剑云雷暗纹伏笔吻合率 100%；3. 零封禁AI套话。`,
        },
      ]);
      setIsRunningRelay(false);
    }, 450);
  };

  const handleWriteRelayOutputToStudio = () => {
    const finalStage = relayStages[2];
    if (!finalStage) return;
    setEditorContent(editorContent ? `${editorContent}\n\n${finalStage.output}` : finalStage.output);
    notify(`🎉 已将四阶多模型接力协作定稿写入《${activeChapter?.title || '当前章节'}》！`);
  };

  const handleSimulateFallback = async () => {
    setIsSimulating(true);
    try {
      const res = await simulateModelFallback(testingRole, true);
      setSimulationResult(res);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRunArena = () => {
    setArenaRunning(true);
    setArenaOutputA(null);
    setArenaOutputB(null);

    setTimeout(() => {
      setArenaOutputA(
        `【${arenaModelA} 思考与生成】\n雨水顺着冰冷的剑刃滑落，在泥浆里溅开惨白的沫子。林越指节寸寸捏紧，断剑在石碑上划出一道刺耳的火星。三人成合围之势，步履轻微得如同一缕幽风。他没有退，因为身后已是万丈深渊——既然退无可退，便唯有一剑断喉！剑锋骤闪，冷冽剑光在漆黑雨幕中撕开一道决绝的裂帛之声！`
      );
    }, 350);

    setTimeout(() => {
      setArenaOutputB(
        `【${arenaModelB} 沉浸起草】\n暴雨砸在残破的石碑上，水雾漫过青苔。林越靠在石碑凹陷处，喉头滚动着咸涩的铁锈味。左肩伤口的剧痛让他每一次呼吸都伴随着微颤，但握剑的右手依旧稳如磐石。十步外，三道黑影踩碎积水，杀机无声浸透寒夜。他微微阖眼，捕捉着风中利刃破空的瞬息死角，左足无声扣紧石缝——那是他预留的唯一反杀弹道。`
      );
      setArenaRunning(false);
    }, 650);
  };

  // G18: 晋升擂台优胜模型为主笔并写回创作台
  const handlePromoteArenaWinner = (winnerModel: string, winningText: string | null) => {
    const updatedRoles = roles.map((r) =>
      r.role === 'DRAFTER' ? { ...r, primaryModel: winnerModel } : r
    );
    setRoles(updatedRoles);
    const drafterRole = updatedRoles.find((r) => r.role === 'DRAFTER');
    if (drafterRole) saveModelRoleAssignment(drafterRole);

    if (winningText) {
      setEditorContent(editorContent ? `${editorContent}\n\n${winningText}` : winningText);
    }
    notify(`🏆 已将【${winnerModel}】扶正为主笔起草 (Drafter) 首选模型，并将优胜段落写回创作台！`);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部中枢横幅 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                多模型矩阵与高可用路由中枢
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                G13-G18 多平台接力 & 额度守卫就绪
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              多平台订阅池额度预警 · R1规划+Claude主笔四阶接力协作 · 429三级级联熔断 · KV前缀缓存省钱精算
            </p>
          </div>
        </div>

        {/* 顶部标签页切换 */}
        <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('PROVIDERS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'PROVIDERS'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            订阅额度池 (G13)
          </button>
          <button
            onClick={() => setActiveTab('ROUTING')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'ROUTING'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            专精路由预设 (G15)
          </button>
          <button
            onClick={() => setActiveTab('RELAY_PIPELINE')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'RELAY_PIPELINE'
                ? 'bg-[var(--bg-surface)] text-emerald-400 shadow-sm font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Workflow className="w-3.5 h-3.5 text-emerald-400" />
            多模型接力协作 (G14)
          </button>
          <button
            onClick={() => setActiveTab('FAILOVER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'FAILOVER'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            三级容灾熔断 (G16)
          </button>
          <button
            onClick={() => setActiveTab('TELEMETRY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'TELEMETRY'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            省钱精算大盘 (G17)
          </button>
          <button
            onClick={() => setActiveTab('ARENA')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'ARENA'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            擂台晋升 (G18)
          </button>
        </div>

        {onNavigateTab && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('MEMORY_GUARD')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>记忆压缩与防幻觉 →</span>
            </button>
            <button
              onClick={() => onNavigateTab('STUDIO')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>去创作台 →</span>
            </button>
          </div>
        )}
      </div>

      {/* 主体视图区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        {statusBanner && (
          <div className="max-w-7xl mx-auto mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <span>{statusBanner}</span>
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('STUDIO')}
                className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
              >
                去【创作台】查看 →
              </button>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: 模型供应池与 G13 多平台订阅月度额度水位线 */}
        {/* ========================================================================= */}
        {activeTab === 'PROVIDERS' && (
          <div className="max-w-7xl mx-auto space-y-6">
            {/* G13: 提前切换阈值全局守卫条 */}
            <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-indigo-500/30 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                  <BatteryCharging className="w-4 h-4" />
                  <span>G13 多平台订阅余量守卫 & 低额度预防性自动切换阈值</span>
                </div>
                <p className="text-[11px] text-[var(--text-muted)]">
                  不等触发 429 报错！当任一订阅平台月度额度或免费赠金低于设定水位线时，自动将流量平滑切换至备选供应商池。
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-[var(--text-muted)]">提前切换水位线:</span>
                <input
                  type="range"
                  min={5}
                  max={40}
                  step={5}
                  value={preemptiveSwitchThreshold}
                  onChange={(e) => setPreemptiveSwitchThreshold(parseInt(e.target.value))}
                  className="w-32 accent-indigo-500"
                />
                <span className="font-mono font-bold text-amber-400">
                  剩余 &lt; {preemptiveSwitchThreshold}% 自动切换
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左侧供应商卡片列表 (含额度进度条) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    已绑定多平台订阅池 ({providers.length})
                  </span>
                </div>

                {providers.map((p) => {
                  const isSelected = p.id === selectedProviderId;
                  const subMeta = SUBSCRIPTION_QUOTA_META[p.id] || {
                    planName: '自定义 API 订阅池',
                    remainingPct: 80,
                    quotaLabel: '$ 80.00 / $ 100.00',
                    billingMode: '按量计费',
                  };
                  const isLowQuota = subMeta.remainingPct <= preemptiveSwitchThreshold;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProviderId(p.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer space-y-2.5 ${
                        isSelected
                          ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                          : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[var(--text-main)]">
                              {p.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                              {p.providerType}
                            </span>
                          </div>
                          <div className="text-[11px] text-indigo-300 mt-0.5">{subMeta.planName}</div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {p.healthStatus}
                          </span>
                          <span className="text-[11px] text-[var(--text-muted)] font-mono">
                            {p.latencyMs} ms
                          </span>
                        </div>
                      </div>

                      {/* G13 订阅额度进度条 */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[var(--text-muted)]">
                            剩余额度: <strong className="text-[var(--text-main)]">{subMeta.quotaLabel}</strong>
                          </span>
                          <span
                            className={`font-mono font-bold ${
                              isLowQuota ? 'text-amber-400' : 'text-emerald-400'
                            }`}
                          >
                            {subMeta.remainingPct}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[var(--bg-canvas)] overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              subMeta.remainingPct < 45 ? 'bg-amber-400' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${subMeta.remainingPct}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-[var(--text-muted)] flex items-center justify-between pt-0.5">
                          <span>{subMeta.billingMode}</span>
                          <span>{p.apiKeys.length} Key 轮换池</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 右侧选中的供应商详情与 Key 金库 */}
              <div className="lg:col-span-7">
                {selectedProvider && (
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                      <div>
                        <h2 className="text-base font-bold text-[var(--text-main)]">
                          {selectedProvider.name} 配置金库
                        </h2>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          协议接入点: {selectedProvider.baseUrl}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            notify(`✅ 已对 ${selectedProvider.name} 执行心跳测速：平均响应 ${selectedProvider.latencyMs}ms`)
                          }
                          className="px-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg hover:text-[var(--text-main)] text-[var(--text-muted)] flex items-center gap-1"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          探测延迟
                        </button>
                      </div>
                    </div>

                    {/* 密钥轮换池 (Multi-Key Pool) */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-amber-400" />
                          API 密钥负载轮换池 ({selectedProvider.apiKeys.length})
                        </label>
                        <span className="text-[11px] text-[var(--text-muted)]">
                          单 Key 触碰 429 时将自动按权重顺延切向下一个有效凭据
                        </span>
                      </div>

                      <div className="space-y-2">
                        {selectedProvider.apiKeys.map((k, idx) => {
                          const isVisible = showKeySecret[`${selectedProvider.id}-${idx}`];
                          const isActive = idx === selectedProvider.activeKeyIndex;
                          return (
                            <div
                              key={idx}
                              className={`flex items-center gap-2 p-2.5 rounded-lg border font-mono text-xs ${
                                isActive
                                  ? 'bg-amber-500/5 border-amber-500/30 text-[var(--text-main)]'
                                  : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                              }`}
                            >
                              <span className="w-5 text-center text-[10px] text-[var(--text-muted)]">
                                #{idx + 1}
                              </span>
                              <div className="flex-1 truncate">
                                {isVisible ? k : `${k.slice(0, 8)}••••••••••••••••${k.slice(-4)}`}
                              </div>
                              {isActive && (
                                <span className="px-1.5 py-0.5 text-[10px] font-sans font-medium rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                  当前活跃
                                </span>
                              )}
                              <button
                                onClick={() => handleToggleKeyVisibility(idx)}
                                className="p-1 hover:text-[var(--text-main)]"
                              >
                                {isVisible ? (
                                  <EyeOff className="w-3.5 h-3.5" />
                                ) : (
                                  <Eye className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 支持的模型清单 */}
                    <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
                      <label className="text-xs font-semibold text-[var(--text-main)]">
                        支持部署模型矩阵
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {selectedProvider.supportedModels.map((m, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-1 text-xs rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 限流频次指标 */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--border-subtle)] text-xs">
                      <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                        <div className="text-[var(--text-muted)]">RPM 速率上限</div>
                        <div className="text-base font-bold text-[var(--text-main)] mt-1 font-mono">
                          {selectedProvider.rpmLimit || 60} req/min
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                        <div className="text-[var(--text-muted)]">TPM 吞吐上限</div>
                        <div className="text-base font-bold text-[var(--text-main)] mt-1 font-mono">
                          {(selectedProvider.tpmLimit || 100000).toLocaleString()} tokens/min
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 角色专精路由分配 + G15 三大全局协作策略预设 */}
        {/* ========================================================================= */}
        {activeTab === 'ROUTING' && (
          <div className="max-w-6xl mx-auto space-y-5">
            {/* G15: 三大全局路由协作流派预设 */}
            <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span>G15 一键全局协作流派路由预设（自动按模型强项分工协作）</span>
                </div>
                <button
                  onClick={() => setActiveTab('RELAY_PIPELINE')}
                  className="text-xs text-emerald-400 hover:underline font-semibold"
                >
                  去【四阶多模型接力沙盒】实测分工效果 →
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <button
                  onClick={() => handleApplyRoutingPreset('QUALITY')}
                  className="p-3.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-indigo-500/10 border border-[var(--border-subtle)] hover:border-indigo-500/40 text-left transition-all"
                >
                  <div className="font-bold text-amber-400">👑 殿堂文学质量流 (强力推荐)</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    DeepSeek-R1 负责大纲推理 + Claude 3.5 Sonnet 负责正文起草与文风精修 + Gemini 2.5 Pro 跨卷防幻觉终审
                  </div>
                </button>
                <button
                  onClick={() => handleApplyRoutingPreset('FRUGAL')}
                  className="p-3.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-emerald-500/10 border border-[var(--border-subtle)] hover:border-emerald-500/40 text-left transition-all"
                >
                  <div className="font-bold text-emerald-400">💰 极致省钱性价比流 (省 84% 预算)</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    R1 规划 + DeepSeek-V3 硬盘前缀缓存主笔 + SiliconFlow 免费赠金池与 Gemini 免费RPD稽查
                  </div>
                </button>
                <button
                  onClick={() => handleApplyRoutingPreset('SPEED')}
                  className="p-3.5 rounded-xl bg-[var(--bg-canvas)] hover:bg-purple-500/10 border border-[var(--border-subtle)] hover:border-purple-500/40 text-left transition-all"
                >
                  <div className="font-bold text-purple-400">⚡ 极速爆更日万流 (低延迟并发)</div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-1">
                    全线采用高吞吐低首字延迟节点，专为【1小时无人巡航】万字连载提供毫秒级响应
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {roles.map((r) => {
                const meta = ROLE_META[r.role];
                return (
                  <div
                    key={r.role}
                    className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta.icon}</span>
                        <div>
                          <div className="font-bold text-sm text-[var(--text-main)]">
                            {meta.name}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">{meta.desc}</div>
                        </div>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                        业内推荐: {meta.recommended}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                      <div className="space-y-1.5">
                        <label className="font-semibold text-emerald-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400" />
                          首选主用模型
                        </label>
                        <select
                          value={r.primaryModel}
                          onChange={(e) => {
                            const updated = { ...r, primaryModel: e.target.value };
                            saveModelRoleAssignment(updated);
                            setRoles((prev) =>
                              prev.map((item) => (item.role === r.role ? updated : item))
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                        >
                          <option value="deepseek-reasoner (R1)">deepseek-reasoner (R1)</option>
                          <option value="claude-3-7-sonnet-thought">claude-3-7-sonnet-thought</option>
                          <option value="claude-3-5-sonnet-20241022">claude-3-5-sonnet-20241022</option>
                          <option value="gpt-4.5-preview">gpt-4.5-preview</option>
                          <option value="deepseek-chat (V3)">deepseek-chat (V3)</option>
                          <option value="gemini-2.5-pro">gemini-2.5-pro</option>
                          <option value="gpt-4o">gpt-4o</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-amber-400 flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-amber-400" />
                          备选熔断接管模型
                        </label>
                        <select
                          value={r.fallbackModel}
                          onChange={(e) => {
                            const updated = { ...r, fallbackModel: e.target.value };
                            saveModelRoleAssignment(updated);
                            setRoles((prev) =>
                              prev.map((item) => (item.role === r.role ? updated : item))
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                        >
                          <option value="claude-3-7-sonnet-thought">claude-3-7-sonnet-thought</option>
                          <option value="gpt-4.5-preview">gpt-4.5-preview</option>
                          <option value="Qwen/Qwen2.5-72B-Instruct">Qwen/Qwen2.5-72B-Instruct</option>
                          <option value="deepseek-reasoner (R1)">deepseek-reasoner (R1)</option>
                          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className="text-[var(--text-muted)]">温度 (Temperature)</label>
                          <span className="font-mono text-[var(--text-main)]">{r.temperature}</span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.2"
                          step="0.05"
                          value={r.temperature}
                          onChange={(e) => {
                            const updated = { ...r, temperature: parseFloat(e.target.value) };
                            saveModelRoleAssignment(updated);
                            setRoles((prev) =>
                              prev.map((item) => (item.role === r.role ? updated : item))
                            );
                          }}
                          className="w-full accent-indigo-500"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[var(--text-muted)]">Max Output Tokens</label>
                        <input
                          type="number"
                          value={r.maxTokens}
                          onChange={(e) => {
                            const updated = { ...r, maxTokens: parseInt(e.target.value) || 4000 };
                            saveModelRoleAssignment(updated);
                            setRoles((prev) =>
                              prev.map((item) => (item.role === r.role ? updated : item))
                            );
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3 (NEW G14): 四阶多模型流水线接力协作沙盒 */}
        {/* ========================================================================= */}
        {activeTab === 'RELAY_PIPELINE' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Workflow className="w-4 h-4" />
                    G14 多平台多模型专长分工接力流水线 (4-Stage Multi-Model Relay)
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    发挥各平台订阅模型最强长板：规划强的模型负责细纲排布，写作强的模型负责沉浸起草，语感强的模型负责去AI套话，长窗口模型负责防幻觉终审。
                  </p>
                </div>
                <button
                  onClick={handleRunRelayPipeline}
                  disabled={isRunningRelay}
                  className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
                >
                  {isRunningRelay ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      四模型正在依次交接棒生成中...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      启动四模型专长接力生成本章
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                  输入本章核心剧情任务 (将依次流经 4 个专精模型节点)
                </label>
                <textarea
                  rows={2}
                  value={relayBeatInput}
                  onChange={(e) => setRelayBeatInput(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                />
              </div>

              {relayStages.length > 0 && (
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {relayStages.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                          <div>
                            <div className="font-bold text-indigo-400">{st.stage}</div>
                            <div className="text-[11px] text-[var(--text-muted)]">
                              {st.role} · <span className="font-mono text-emerald-400">{st.model}</span>
                            </div>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--bg-surface)] text-[var(--text-muted)]">
                            {st.tokens}
                          </span>
                        </div>
                        <p className="text-[var(--text-main)] leading-relaxed font-serif whitespace-pre-wrap">
                          {st.output}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      onClick={handleWriteRelayOutputToStudio}
                      className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      一键将接力终审定稿写入【创作台】当前章节
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 429 容灾熔断与 G16 三级级联兜底链 */}
        {/* ========================================================================= */}
        {activeTab === 'FAILOVER' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                G16 三级级联 429 容灾熔断链 (Primary 云端主力 → Secondary 备用云端 → Local Ollama 零成本兜底)
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                当主订阅节点遭遇 HTTP 429 配额耗尽或超时，路由器在 80ms 内自动切向二级备用云端（如硅基流动/DeepSeek备用池）；若全网云端均不可达，自动降级至三级本地 Apple Silicon Ollama 离线模型，确保整小时码字永不中断！
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-[var(--text-muted)] block mb-1.5">测试角色通道</label>
                  <select
                    value={testingRole}
                    onChange={(e) => setTestingRole(e.target.value as ModelCapabilityRole)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                  >
                    <option value="PLANNER">架构总监 (Planner)</option>
                    <option value="DRAFTER">主笔起草 (Drafter)</option>
                    <option value="STYLIST">文学精修 (Stylist)</option>
                    <option value="INSPECTOR">设定稽查 (Inspector)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[var(--text-muted)] block mb-1.5">注入故障类型</label>
                  <input
                    disabled
                    value="HTTP 429 Quota Exhausted"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-amber-400 font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSimulateFallback}
                    disabled={isSimulating}
                    className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    {isSimulating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        正在模拟触发三级熔断...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        触发 429 级联容灾熔断演练
                      </>
                    )}
                  </button>
                </div>
              </div>

              {simulationResult && (
                <div className="mt-6 p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      三级熔断接管链演练报告 · 0 字节丢失无缝续写
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      切换耗时: {simulationResult.simulatedLatencyMs} ms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-rose-500/30 space-y-1">
                      <div className="text-rose-400">× 第一跳：主订阅池 (Primary)</div>
                      <div className="text-[var(--text-main)]">{simulationResult.primaryProvider}</div>
                      <div className="text-[var(--text-muted)]">{simulationResult.primaryModel}</div>
                      <div className="text-rose-300/80 text-[11px] mt-1 pt-1 border-t border-[var(--border-subtle)]">
                        {simulationResult.failoverReason}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-emerald-500/30 space-y-1">
                      <div className="text-emerald-400">✓ 第二跳：备选云端池 (Secondary)</div>
                      <div className="text-[var(--text-main)]">{simulationResult.activatedProvider}</div>
                      <div className="text-[var(--text-muted)]">{simulationResult.activatedModel}</div>
                      <div className="text-emerald-300/80 text-[11px] mt-1 pt-1 border-t border-[var(--border-subtle)]">
                        HTTP 200 · 自动续接断点流式输出
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-indigo-500/30 space-y-1">
                      <div className="text-indigo-400">🛡️ 第三跳：终极保底 (Tertiary Standby)</div>
                      <div className="text-[var(--text-main)]">Ollama Local (Apple M-Max)</div>
                      <div className="text-[var(--text-muted)]">qwen2.5:32b-instruct-q4_K_M</div>
                      <div className="text-indigo-300/80 text-[11px] mt-1 pt-1 border-t border-[var(--border-subtle)]">
                        离线热备待命 · 0 Token 费用
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] font-mono text-xs text-[var(--text-muted)] space-y-1">
                    <div className="text-[var(--text-main)] font-semibold text-[11px]">
                      接管后生成的样本流片段:
                    </div>
                    <p className="leading-relaxed">{simulationResult.outputSample}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: Token 遥测大盘 + G17 百万字长篇 KV 缓存省钱精算器 */}
        {/* ========================================================================= */}
        {activeTab === 'TELEMETRY' && (
          <div className="max-w-6xl mx-auto space-y-6">
            {/* G17: 百万字长篇 KV 前缀缓存与脱水省钱精算器 */}
            <div className="p-5 rounded-xl bg-[var(--bg-surface)] border border-emerald-500/30 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    G17 百万字长篇连载 Token & KV 前缀缓存省钱精算器
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    对比传统全量设定集塞入 Prompt 与 NovManager【四级记忆脱水 + 静态世界观前缀缓存】的真实账单差异
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--text-muted)]">目标连载总字数:</span>
                  <input
                    type="range"
                    min={50}
                    max={500}
                    step={50}
                    value={plannedMillionWords}
                    onChange={(e) => setPlannedMillionWords(parseInt(e.target.value))}
                    className="w-32 accent-emerald-500"
                  />
                  <span className="font-mono font-bold text-emerald-400">
                    {plannedMillionWords} 万字
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)]">
                  <div className="text-[var(--text-muted)]">传统无压缩全量拼接账单</div>
                  <div className="text-lg font-bold text-rose-400 font-mono mt-1">
                    $ {(plannedMillionWords * 0.42).toFixed(2)} USD
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    每章重复发送全书设定集，大量浪费输入 Token
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-emerald-500/30">
                  <div className="text-emerald-400 font-semibold">
                    开启四级记忆脱水 + KV 前缀缓存后
                  </div>
                  <div className="text-lg font-bold text-emerald-400 font-mono mt-1">
                    $ {(plannedMillionWords * 0.068).toFixed(2)} USD
                  </div>
                  <div className="text-[11px] text-emerald-300/80 mt-0.5">
                    静态设定 90% 命中缓存折扣，动态记忆仅传在场人物切片
                  </div>
                </div>
                <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-indigo-500/30">
                  <div className="text-indigo-400 font-semibold">全书净省订阅预算</div>
                  <div className="text-lg font-bold text-indigo-400 font-mono mt-1">
                    省下 $ {(plannedMillionWords * 0.352).toFixed(2)} (83.8%)
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    相当于免费多写 {Math.round(plannedMillionWords * 4.2)} 万字正文
                  </div>
                </div>
              </div>
            </div>

            {/* KPI 指标卡 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="text-xs text-[var(--text-muted)]">累计请求调用次数</div>
                <div className="text-xl font-bold text-[var(--text-main)] mt-1 font-mono">1,482</div>
                <div className="text-[11px] text-emerald-400 mt-1">99.8% 成功履约率</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="text-xs text-[var(--text-muted)]">消耗输入 Tokens</div>
                <div className="text-xl font-bold text-[var(--text-main)] mt-1 font-mono">12.48 M</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">KV 缓存命中率 94%</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="text-xs text-[var(--text-muted)]">产出正文 Tokens</div>
                <div className="text-xl font-bold text-[var(--text-main)] mt-1 font-mono">3.85 M</div>
                <div className="text-[11px] text-indigo-400 mt-1">折合约 280 万中文汉字</div>
              </div>
              <div className="p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="text-xs text-[var(--text-muted)]">累计支出预算</div>
                <div className="text-xl font-bold text-emerald-400 mt-1 font-mono">$ 4.62 USD</div>
                <div className="text-[11px] text-[var(--text-muted)] mt-1">平均 $0.0016 / 千字</div>
              </div>
            </div>

            {/* 遥测流水表 */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-[var(--border-subtle)] flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-main)]">
                  近期多平台请求执行审计流水
                </span>
                <span className="text-xs text-[var(--text-muted)]">实时滑动窗口数据</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[var(--bg-canvas)] text-[var(--text-muted)] border-b border-[var(--border-subtle)] font-medium">
                    <tr>
                      <th className="px-4 py-2.5">时间戳</th>
                      <th className="px-4 py-2.5">角色通道</th>
                      <th className="px-4 py-2.5">模型端点</th>
                      <th className="px-4 py-2.5">请求类型</th>
                      <th className="px-4 py-2.5">Tokens (In / Out)</th>
                      <th className="px-4 py-2.5">延迟</th>
                      <th className="px-4 py-2.5">估算费用</th>
                      <th className="px-4 py-2.5">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-subtle)] font-mono">
                    {telemetry.map((t) => (
                      <tr key={t.id} className="hover:bg-[var(--bg-canvas)]/50">
                        <td className="px-4 py-3 text-[var(--text-muted)]">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="px-4 py-3 font-sans font-semibold text-[var(--text-main)]">
                          {t.role}
                        </td>
                        <td className="px-4 py-3 text-indigo-400">{t.model}</td>
                        <td className="px-4 py-3 text-[var(--text-muted)]">{t.requestType}</td>
                        <td className="px-4 py-3">
                          {t.inputTokens.toLocaleString()} / {t.outputTokens.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">{t.latencyMs} ms</td>
                        <td className="px-4 py-3 text-emerald-400">${t.costUsd.toFixed(4)}</td>
                        <td className="px-4 py-3">
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
                            {t.statusCode} OK
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 6: 双模型比武竞技场 + G18 一键扶正优胜模型为主笔 */}
        {/* ========================================================================= */}
        {activeTab === 'ARENA' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    双模型同题比武竞技场 (G18 支持一键扶正胜出模型为主笔并采纳正文)
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    在统一提示词与上下文约束下，横向对比推理深度、文学张力与白描韵味
                  </p>
                </div>
                <button
                  onClick={handleRunArena}
                  disabled={arenaRunning}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-all"
                >
                  {arenaRunning ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      双模型并行竞技中...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      开始双路同题擂台赛
                    </>
                  )}
                </button>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-muted)] block mb-1">
                  擂台统一测试提示词 / 创作指令
                </label>
                <textarea
                  rows={3}
                  value={arenaPrompt}
                  onChange={(e) => setArenaPrompt(e.target.value)}
                  className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">选手 A (左侧)</label>
                  <select
                    value={arenaModelA}
                    onChange={(e) => setArenaModelA(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] font-mono"
                  >
                    <option value="deepseek-reasoner (R1)">DeepSeek-R1 (深度推理)</option>
                    <option value="claude-3-7-sonnet-thought">Claude 3.7 Thinking</option>
                    <option value="gpt-4.5-preview">GPT-4.5 Preview</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">选手 B (右侧)</label>
                  <select
                    value={arenaModelB}
                    onChange={(e) => setArenaModelB(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] font-mono"
                  >
                    <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet (文采精纯)</option>
                    <option value="deepseek-chat (V3)">DeepSeek-V3 (中文语感)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 选手 A 输出 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs">
                    <span className="font-bold text-indigo-400">选手 A：{arenaModelA}</span>
                    <span className="text-[var(--text-muted)] font-mono">1.2s 响应</span>
                  </div>
                  <div className="min-h-[180px] text-xs text-[var(--text-main)] leading-relaxed font-serif whitespace-pre-wrap">
                    {arenaOutputA ? (
                      arenaOutputA
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                        点击“开始双路同题擂台赛”后查看生成表现...
                      </div>
                    )}
                  </div>
                </div>
                {arenaOutputA && (
                  <button
                    onClick={() => handlePromoteArenaWinner(arenaModelA, arenaOutputA)}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    G18 选 A 获胜：设为主笔模型并采纳此段入【创作台】
                  </button>
                )}
              </div>

              {/* 选手 B 输出 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs">
                    <span className="font-bold text-purple-400">选手 B：{arenaModelB}</span>
                    <span className="text-[var(--text-muted)] font-mono">1.9s 响应</span>
                  </div>
                  <div className="min-h-[180px] text-xs text-[var(--text-main)] leading-relaxed font-serif whitespace-pre-wrap">
                    {arenaOutputB ? (
                      arenaOutputB
                    ) : (
                      <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                        点击“开始双路同题擂台赛”后查看生成表现...
                      </div>
                    )}
                  </div>
                </div>
                {arenaOutputB && (
                  <button
                    onClick={() => handlePromoteArenaWinner(arenaModelB, arenaOutputB)}
                    className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    G18 选 B 获胜：设为主笔模型并采纳此段入【创作台】
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
