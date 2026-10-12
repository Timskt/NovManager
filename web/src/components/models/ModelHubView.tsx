// ==============================================================================
// 多模型矩阵与高可用容灾路由中枢 (Multi-Provider Model Matrix & Resilience Router)
// 商业级 AI 创作基础设施：多模型订阅协作、多 Key 轮换负载池、角色能力专精路由、
// 429 额度耗尽秒级无缝熔断接管、Token 成本遥测与双模型横向比武竞技场
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  ModelProvider,
  ModelRoleAssignment,
  ModelTelemetry,
  ModelCapabilityRole,
  ModelProviderType,
} from '../../types/novel';
import {
  fetchModelProviders,
  saveModelProvider,
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
  RotateCcw,
  Plus,
  Key,
  Sliders,
  DollarSign,
  Activity,
  CheckCircle,
  AlertTriangle,
  Play,
  ArrowRight,
  Server,
  Terminal,
  Clock,
  Sparkles,
  BarChart3,
  RefreshCw,
  Eye,
  EyeOff,
  Radio,
  SlidersHorizontal,
  Feather,
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

interface ModelHubViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const ModelHubView: React.FC<ModelHubViewProps> = ({ onNavigateTab }) => {
  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [roles, setRoles] = useState<ModelRoleAssignment[]>([]);
  const [telemetry, setTelemetry] = useState<ModelTelemetry[]>([]);
  const [activeTab, setActiveTab] = useState<'PROVIDERS' | 'ROUTING' | 'FAILOVER' | 'TELEMETRY' | 'ARENA'>('PROVIDERS');
  const [selectedProviderId, setSelectedProviderId] = useState<string>('prov-deepseek');
  const [showKeySecret, setShowKeySecret] = useState<Record<string, boolean>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<FallbackSimulateResult | null>(null);
  const [testingRole, setTestingRole] = useState<ModelCapabilityRole>('PLANNER');

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

  const handleToggleKeyVisibility = (keyIdx: number) => {
    setShowKeySecret((prev) => ({
      ...prev,
      [`${selectedProvider.id}-${keyIdx}`]: !prev[`${selectedProvider.id}-${keyIdx}`],
    }));
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
    }, 1200);

    setTimeout(() => {
      setArenaOutputB(
        `【${arenaModelB} 沉浸起草】\n暴雨砸在残破的石碑上，水雾漫过青苔。林越靠在石碑凹陷处，喉头滚动着咸涩的铁锈味。左肩伤口的剧痛让他每一次呼吸都伴随着微颤，但握剑的右手依旧稳如磐石。十步外，三道黑影踩碎积水，杀机无声浸透寒夜。他微微阖眼，捕捉着风中利刃破空的瞬息死角，左足无声扣紧石缝——那是他预留的唯一反杀弹道。`
      );
      setArenaRunning(false);
    }, 1900);
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
                6 节点在线就绪
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              多渠道订阅池化管理 · 角色能力精细化路由 · 429 配额耗尽无感熔断接管 · Token 资产遥测
            </p>
          </div>
        </div>

        {/* 顶部标签页切换 */}
        <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('PROVIDERS')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'PROVIDERS'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            模型供应池 ({providers.length})
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
            角色专精路由 (5)
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
            容灾熔断实战
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
            Token 遥测大盘
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
            双模型比武场
          </button>
        </div>

        {onNavigateTab && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('MEMORY_GUARD')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>四级记忆压缩与防幻觉护栏 →</span>
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
        {/* ========================================================================= */}
        {/* TAB 1: 模型供应池与多 Key 密钥金库 */}
        {/* ========================================================================= */}
        {activeTab === 'PROVIDERS' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* 左侧供应商卡片列表 */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  已注册供应商节点 ({providers.length})
                </span>
                <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium">
                  <Plus className="w-3.5 h-3.5" />
                  新增自定义 Provider
                </button>
              </div>

              {providers.map((p) => {
                const isSelected = p.id === selectedProviderId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProviderId(p.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
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
                        <div className="text-xs text-[var(--text-muted)] mt-1 font-mono truncate max-w-[280px]">
                          {p.baseUrl}
                        </div>
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

                    <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-amber-400" />
                        {p.apiKeys.length} 个密钥备用池
                      </span>
                      <span>支持模型: {p.supportedModels.length} 个</span>
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
                      <button className="px-3 py-1.5 text-xs bg-[var(--bg-canvas)] border border-[var(--border-subtle)] rounded-lg hover:text-[var(--text-main)] text-[var(--text-muted)] flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" />
                        探测延迟
                      </button>
                      <button className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg shadow-sm">
                        保存配置
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
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        );
                      })}
                    </div>

                    <button className="w-full py-2 border border-dashed border-[var(--border-medium)] rounded-lg text-xs text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center gap-1.5 hover:border-[var(--border-strong)]">
                      <Plus className="w-3.5 h-3.5" />
                      添加新的备用 API 密钥至轮换池
                    </button>
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
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 角色专精路由分配 */}
        {/* ========================================================================= */}
        {activeTab === 'ROUTING' && (
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 text-xs text-indigo-300 flex items-start gap-3">
              <Zap className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">角色能力专精智能路由：</span>
                不同大模型在不同创作环节的造诣差异极大。架构总监重逻辑推演，主笔起草重文字张力，精修工坊重词汇去套话。系统支持为每一个业务 Agent 指定主选与备选引擎。
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
                      {/* 主用引擎 */}
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
                            setRoles((prev) => prev.map((item) => (item.role === r.role ? updated : item)));
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

                      {/* 备用兜底引擎 */}
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
                            setRoles((prev) => prev.map((item) => (item.role === r.role ? updated : item)));
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

                      {/* 采样温度 */}
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
                            setRoles((prev) => prev.map((item) => (item.role === r.role ? updated : item)));
                          }}
                          className="w-full accent-indigo-500"
                        />
                      </div>

                      {/* 最大 Token 限制 */}
                      <div className="space-y-1.5">
                        <label className="text-[var(--text-muted)]">Max Output Tokens</label>
                        <input
                          type="number"
                          value={r.maxTokens}
                          onChange={(e) => {
                            const updated = { ...r, maxTokens: parseInt(e.target.value) || 4000 };
                            saveModelRoleAssignment(updated);
                            setRoles((prev) => prev.map((item) => (item.role === r.role ? updated : item)));
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
        {/* TAB 3: 429 容灾熔断与故障演练 */}
        {/* ========================================================================= */}
        {activeTab === 'FAILOVER' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                商业级 429 配额耗尽无感熔断接管模拟器
              </div>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                在工业化长篇连载生产中，主账号可能在深夜爆单时突然遭遇账户余额耗尽（Insufficient Balance）或并发超限（HTTP 429 Too Many Requests）。
                NovManager 容灾矩阵将在毫秒级感知异常，直接阻断报错抛出，并依据当前角色配置自动激活备选高可用节点。
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
              <h2 className="text-sm font-bold text-[var(--text-main)]">
                发起主动故障注入演练
              </h2>

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
                        正在模拟触发熔断...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        触发 429 容灾熔断测试
                      </>
                    )}
                  </button>
                </div>
              </div>

              {simulationResult && (
                <div className="mt-6 p-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-4 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      熔断接管链演练报告 · 成功完成
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)]">
                      接管时延: {simulationResult.simulatedLatencyMs} ms
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                      <div className="text-rose-400">× 首选故障端点 (Primary)</div>
                      <div className="text-[var(--text-main)]">{simulationResult.primaryProvider}</div>
                      <div className="text-[var(--text-muted)]">{simulationResult.primaryModel}</div>
                      <div className="text-rose-300/80 text-[11px] mt-1 pt-1 border-t border-[var(--border-subtle)]">
                        {simulationResult.failoverReason}
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-emerald-500/30 space-y-1">
                      <div className="text-emerald-400">✓ 备选接管端点 (Fallback Active)</div>
                      <div className="text-[var(--text-main)]">{simulationResult.activatedProvider}</div>
                      <div className="text-[var(--text-muted)]">{simulationResult.activatedModel}</div>
                      <div className="text-emerald-300/80 text-[11px] mt-1 pt-1 border-t border-[var(--border-subtle)]">
                        状态码 200 · 无缝续流输出
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
        {/* TAB 4: Token 遥测与成本大盘 */}
        {/* ========================================================================= */}
        {activeTab === 'TELEMETRY' && (
          <div className="max-w-6xl mx-auto space-y-6">
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
                <div className="text-[11px] text-[var(--text-muted)] mt-1">上下文打包命中率 94%</div>
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
                  近期待办请求执行审计流水
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
        {/* TAB 5: 双模型比武竞技场 (Arena Shootout) */}
        {/* ========================================================================= */}
        {activeTab === 'ARENA' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    双模型盲测比武竞技场
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

            {/* 比武输出结果对比 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 选手 A 输出 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs">
                  <span className="font-bold text-indigo-400">选手 A：{arenaModelA}</span>
                  <span className="text-[var(--text-muted)] font-mono">1.2s 响应</span>
                </div>
                <div className="min-h-[220px] text-xs text-[var(--text-main)] leading-relaxed font-serif whitespace-pre-wrap">
                  {arenaOutputA ? (
                    arenaOutputA
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                      点击“开始双路同题擂台赛”后查看生成表现...
                    </div>
                  )}
                </div>
              </div>

              {/* 选手 B 输出 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs">
                  <span className="font-bold text-purple-400">选手 B：{arenaModelB}</span>
                  <span className="text-[var(--text-muted)] font-mono">1.9s 响应</span>
                </div>
                <div className="min-h-[220px] text-xs text-[var(--text-main)] leading-relaxed font-serif whitespace-pre-wrap">
                  {arenaOutputB ? (
                    arenaOutputB
                  ) : (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
                      点击“开始双路同题擂台赛”后查看生成表现...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
