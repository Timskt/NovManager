// ==============================================================================
// 文风 DNA 解析与名家仿生克隆工坊 (Style DNA Studio & Mimicry Engine)
// 商业级文学风格工程：6 维文学计量雷达、名家经典基因库预设 (金庸/乌贼/忘语/猫腻/辰东)、
// 双流派文风智合熔炉、反 AI 翻译腔与套话黑名单拦截器、高光典范段落库
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { StyleDnaProfile, StyleFusionRequest } from '../../types/novel';
import {
  fetchStyleProfiles,
  extractStyleDna,
  blendStyles,
  defaultStyleProfiles,
} from '../../lib/api';
import {
  Feather,
  Sparkles,
  Sliders,
  Layers,
  ShieldAlert,
  BookOpen,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Flame,
  ArrowRight,
  Compass,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

export const StyleDnaStudioView: React.FC = () => {
  const [profiles, setProfiles] = useState<StyleDnaProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('dna-wujie');
  const [activeTab, setActiveTab] = useState<'LIBRARY' | 'EXTRACTOR' | 'BLENDER' | 'BLACKLIST'>('LIBRARY');

  // 萃取表单状态
  const [sourceType, setSourceType] = useState<'TEXT' | 'URL' | 'NOVEL_TITLE'>('TEXT');
  const [sourcePayload, setSourcePayload] = useState<string>('');
  const [targetName, setTargetName] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // 融合表单状态
  const [blendPrimaryId, setBlendPrimaryId] = useState<string>('dna-wujie');
  const [blendSecondaryId, setBlendSecondaryId] = useState<string>('dna-wangyu');
  const [blendRatio, setBlendRatio] = useState<number>(0.6); // 60% A, 40% B
  const [fusedName, setFusedName] = useState<string>('克苏鲁克制修仙风 (乌贼 60% + 忘语 40%)');
  const [isBlending, setIsBlending] = useState<boolean>(false);

  // 黑名单状态
  const [customBlacklist, setCustomBlacklist] = useState<string[]>([
    '恐怖如斯',
    '倒吸一口凉气',
    '嘴角勾起一抹残忍的微笑',
    '桀桀桀怪笑',
    '此子断不可留',
    '系统叮的一声',
    '震惊！竟然是',
    '简直不知死活',
    '眼中闪过一丝不易察觉的慌乱',
  ]);
  const [newCliche, setNewCliche] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const list = await fetchStyleProfiles();
    setProfiles(list);
  };

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) || defaultStyleProfiles[0];

  const handleExtract = async () => {
    if (!sourcePayload.trim()) return;
    setIsExtracting(true);
    try {
      const created = await extractStyleDna({
        sourceType,
        sourcePayload,
        targetName: targetName || '自定义萃取文学基因',
      });
      setProfiles((prev) => [created, ...prev]);
      setSelectedProfileId(created.id);
      setActiveTab('LIBRARY');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleBlend = async () => {
    setIsBlending(true);
    try {
      const blended = await blendStyles({
        primaryDnaId: blendPrimaryId,
        secondaryDnaId: blendSecondaryId,
        blendRatio,
        fusedName: fusedName || '双流派智合文风',
      });
      setProfiles((prev) => [blended, ...prev]);
      setSelectedProfileId(blended.id);
      setActiveTab('LIBRARY');
    } finally {
      setIsBlending(false);
    }
  };

  const handleAddCliche = () => {
    if (newCliche.trim() && !customBlacklist.includes(newCliche.trim())) {
      setCustomBlacklist((prev) => [...prev, newCliche.trim()]);
      setNewCliche('');
    }
  };

  const handleRemoveCliche = (word: string) => {
    setCustomBlacklist((prev) => prev.filter((w) => w !== word));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 6 维文学计量雷达 SVG 绘制
  const renderRadarChart = (p: StyleDnaProfile) => {
    const size = 260;
    const center = size / 2;
    const radius = 90;

    const metrics = [
      { label: '五感浓度', value: p.sensoryDensity },
      { label: '对白留白', value: p.dialogueRatio },
      { label: '句式方差', value: p.sentenceVariance },
      { label: '隐喻频率', value: p.metaphorFrequency },
      { label: '推进推重', value: p.pacingVelocity },
      { label: '词汇典雅', value: p.vocabularyRichness },
    ];

    const count = metrics.length;
    const angleStep = (Math.PI * 2) / count;

    // 绘制多边形轮廓坐标
    const points = metrics
      .map((m, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = radius * Math.max(0.2, Math.min(1.0, m.value));
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="flex flex-col items-center justify-center p-4">
        <svg width={size} height={size} className="overflow-visible">
          {/* 背景同心多边形网格 */}
          {[0.25, 0.5, 0.75, 1.0].map((level, lvlIdx) => {
            const gridPts = Array.from({ length: count })
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const r = radius * level;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(' ');
            return (
              <polygon
                key={lvlIdx}
                points={gridPts}
                fill="none"
                stroke="var(--border-subtle)"
                strokeDasharray={level === 1 ? 'none' : '2,2'}
                strokeWidth="1"
              />
            );
          })}

          {/* 轴线 */}
          {Array.from({ length: count }).map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
            );
          })}

          {/* 数据多边形 */}
          <polygon
            points={points}
            fill="rgba(99, 102, 241, 0.25)"
            stroke="#6366f1"
            strokeWidth="2"
            className="transition-all duration-500 ease-out"
          />

          {/* 数据点与标签 */}
          {metrics.map((m, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = radius * Math.max(0.2, Math.min(1.0, m.value));
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);

            const labelR = radius + 22;
            const lx = center + labelR * Math.cos(angle);
            const ly = center + labelR * Math.sin(angle);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3.5" fill="#818cf8" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fill="var(--text-muted)"
                  className="font-medium"
                >
                  {m.label} ({(m.value * 100).toFixed(0)}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部标题栏 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                文风 DNA 解析与名家仿生克隆工坊
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                名家基因预设就绪
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              6 维文学计量雷达 · 名家风格克隆 · 双流派文风智合熔炉 · 禁忌 AI 翻译腔黑名单拦截
            </p>
          </div>
        </div>

        {/* 顶部标签页 */}
        <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('LIBRARY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'LIBRARY'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            名家 DNA 库 ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('EXTRACTOR')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'EXTRACTOR'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            样本 DNA 萃取器
          </button>
          <button
            onClick={() => setActiveTab('BLENDER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'BLENDER'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            双流派智合熔炉
          </button>
          <button
            onClick={() => setActiveTab('BLACKLIST')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'BLACKLIST'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            去 AI 翻译腔黑名单
          </button>
        </div>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ========================================================================= */}
        {/* TAB 1: 名家 DNA 基因库与 6 维雷达剖析 */}
        {/* ========================================================================= */}
        {activeTab === 'LIBRARY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* 左侧卡片列表 */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-1">
                经典名家文风矩阵 ({profiles.length})
              </div>

              {profiles.map((p) => {
                const isSelected = p.id === selectedProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                          {p.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          代表作: {p.sourceTitle} · 作者: {p.author}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                        综合纯度 {((p.vocabularyRichness + p.sensoryDensity) * 50).toFixed(0)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] rounded bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 右侧选中文风剖析详情 */}
            <div className="lg:col-span-7 space-y-6">
              {selectedProfile && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
                  {/* 头部标题与操作 */}
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-4">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-main)] font-serif">
                        {selectedProfile.name}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        底座作者: {selectedProfile.author} · 语料源泉: {selectedProfile.sourceTitle}
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(selectedProfile.promptDirective, 'promptDirective')
                      }
                      className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'promptDirective' ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          已复制指令
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          复制仿生提示词
                        </>
                      )}
                    </button>
                  </div>

                  {/* 6 维雷达图与指标概览 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                      {renderRadarChart(selectedProfile)}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1.5">
                        文学计量特征解析:
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">五感通感密度:</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {(selectedProfile.sensoryDensity * 100).toFixed(0)}% (触觉/听觉强化)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">对白与留白比:</span>
                        <span className="font-mono font-bold text-purple-400">
                          {(selectedProfile.dialogueRatio * 100).toFixed(0)}% (克制冷峻)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">句式长短方差:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {(selectedProfile.sentenceVariance * 100).toFixed(0)}% (节奏韵律多变)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">隐喻/修辞频率:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {(selectedProfile.metaphorFrequency * 100).toFixed(0)}% (多用意象)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">叙事推进推重比:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {(selectedProfile.pacingVelocity * 100).toFixed(0)}% (紧凑高频)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">词汇纯度典雅度:</span>
                        <span className="font-mono font-bold text-teal-400">
                          {(selectedProfile.vocabularyRichness * 100).toFixed(0)}% (极少水词)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 核心仿生系统提示词指令 */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      提炼合成的系统仿生微调指令 (System Directive)
                    </label>
                    <div className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-mono">
                      {selectedProfile.promptDirective}
                    </div>
                  </div>

                  {/* 黄金高光典范段落 */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      黄金高光典范段落 (Few-Shot Exemplars)
                    </label>
                    <div className="space-y-2">
                      {selectedProfile.goldenExemplars.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-serif italic"
                        >
                          “{ex}”
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: 样本文风 DNA 萃取器 */}
        {/* ========================================================================= */}
        {activeTab === 'EXTRACTOR' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
              <h2 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                任意小说或典范文章文风逆向工程
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                粘贴您喜欢的网络小说章节、名家散文、或输入书名与链接。引擎将自动对其进行词频、句法、修辞、通感多层解构，提炼出可被大模型即插即用的文风
                DNA 配置。
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                    输入样本来源形式
                  </label>
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  >
                    <option value="TEXT">粘贴正文章节代表性文本</option>
                    <option value="NOVEL_TITLE">输入名家小说书名 / 作者</option>
                    <option value="URL">在线章节 URL 网页链接</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                    生成的基因配置命名
                  </label>
                  <input
                    value={targetName}
                    onChange={(e) => setTargetName(e.target.value)}
                    placeholder="例如：王小波黑色幽默文风"
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                  样本内容或定位标识
                </label>
                <textarea
                  rows={8}
                  value={sourcePayload}
                  onChange={(e) => setSourcePayload(e.target.value)}
                  placeholder="在此粘贴至少 300 字以上的代表性段落，包含对白、环境白描或打斗交锋..."
                  className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-serif"
                />
              </div>

              <button
                onClick={handleExtract}
                disabled={isExtracting || !sourcePayload.trim()}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {isExtracting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在逆向解构五感与句式特征...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    开始萃取文风 DNA 并收录至基因库
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: 双流派文风智合熔炉 (Style Fusion Blender) */}
        {/* ========================================================================= */}
        {activeTab === 'BLENDER' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
              <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                <Layers className="w-4 h-4" />
                双核文风智合熔炉：开创独一无二的文学质感
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                例如：将【爱潜水的乌贼】的维多利亚诡秘克苏鲁冷峻悬疑，与【忘语】的凡人沉稳修真法宝推演按
                6:4 权重进行线性融汇，诞生全新的修仙克苏鲁美学。
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-main)]">
                    流派 A (主导底色)
                  </label>
                  <select
                    value={blendPrimaryId}
                    onChange={(e) => setBlendPrimaryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-main)]">
                    流派 B (浸染底色)
                  </label>
                  <select
                    value={blendSecondaryId}
                    onChange={(e) => setBlendSecondaryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 融合比例滑块 */}
              <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-400">
                    流派 A 占比: {(blendRatio * 100).toFixed(0)}%
                  </span>
                  <span className="font-semibold text-purple-400">
                    流派 B 占比: {((1 - blendRatio) * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={blendRatio}
                  onChange={(e) => setBlendRatio(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                  智合新文风命名
                </label>
                <input
                  value={fusedName}
                  onChange={(e) => setFusedName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                />
              </div>

              <button
                onClick={handleBlend}
                disabled={isBlending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all"
              >
                {isBlending ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    正在执行文学基因合成计算...
                  </>
                ) : (
                  <>
                    <Layers className="w-4 h-4" />
                    融汇双流派生成全新定制文风
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 去 AI 翻译腔与油腻套话黑名单 */}
        {/* ========================================================================= */}
        {activeTab === 'BLACKLIST' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="p-5 rounded-xl border border-rose-500/20 bg-rose-500/5 space-y-2">
              <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                全局写作防油腻 · 禁用 AI 翻译腔与套话拦截器
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                大语言模型在生成网文时极易落入“倒吸一口凉气”、“恐怖如斯”、“嘴角勾起弧度”等模式化行文陷阱。
                凡在此处收录的词汇，在起草与精修环节均会被严格置入负向约束（Negative Prompt），并在生成后由审查 Agent 强制拦截。
              </p>
            </div>

            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
              <div className="flex items-center gap-3">
                <input
                  value={newCliche}
                  onChange={(e) => setNewCliche(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddCliche()}
                  placeholder="输入需封杀的套话或口头禅（如：桀桀桀、眼神一凛）"
                  className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                />
                <button
                  onClick={handleAddCliche}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  加入封禁黑名单
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-[var(--text-muted)]">
                  当前处于生效状态的拦截词库 ({customBlacklist.length} 个)
                </label>
                <div className="flex flex-wrap gap-2">
                  {customBlacklist.map((word, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 group"
                    >
                      {word}
                      <button
                        onClick={() => handleRemoveCliche(word)}
                        className="text-rose-400/60 hover:text-rose-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
