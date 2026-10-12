// ==============================================================================
// 上帝视角宏观沙盘与追读心理力学 (God's Eye Macro Sandbox & Reader Psychology)
// 商业级网络小说追读控制中枢：疲劳弃书预警雷达、爽点兑现比、多巴胺快感间歇心电图、
// 读者-主角-反派三级信息不对称矩阵、场外暗流阵营天下大势模拟电报、副本探险轨迹
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  ReaderPsychologyReport,
  InformationAsymmetryItem,
  OffscreenNewsEvent,
} from '../../types/novel';
import {
  fetchReaderPsychology,
  fetchInformationAsymmetry,
  fetchOffscreenNews,
} from '../../lib/api';
import {
  Eye,
  Activity,
  AlertTriangle,
  HeartPulse,
  Radio,
  Flame,
  Key,
  ShieldAlert,
  Zap,
  TrendingUp,
  Clock,
  Compass,
  CheckCircle,
  Plus,
  RefreshCw,
  Sliders,
  Sparkles,
} from 'lucide-react';

export const GodsEyeSandboxView: React.FC = () => {
  const { novel, activeChapter } = useNovel();

  const [psychology, setPsychology] = useState<ReaderPsychologyReport | null>(null);
  const [asymmetryItems, setAsymmetryItems] = useState<InformationAsymmetryItem[]>([]);
  const [offscreenNews, setOffscreenNews] = useState<OffscreenNewsEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'PSYCHOLOGY' | 'ASYMMETRY' | 'OFFSCREEN' | 'DUNGEON'>('PSYCHOLOGY');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 新增信息差模态
  const [newSecretTitle, setNewSecretTitle] = useState<string>('');
  const [newReaderKnows, setNewReaderKnows] = useState<boolean>(true);
  const [newProtagonistKnows, setNewProtagonistKnows] = useState<boolean>(false);
  const [newAntagonistKnows, setNewAntagonistKnows] = useState<boolean>(true);
  const [newPlanChapter, setNewPlanChapter] = useState<number>(10);

  useEffect(() => {
    loadSandboxData();
  }, [novel.id, activeChapter?.id]);

  const loadSandboxData = async () => {
    setIsLoading(true);
    try {
      const [psy, asym, news] = await Promise.all([
        fetchReaderPsychology(novel.id, activeChapter?.id),
        fetchInformationAsymmetry(novel.id),
        fetchOffscreenNews(novel.id),
      ]);
      setPsychology(psy);
      setAsymmetryItems(asym);
      setOffscreenNews(news);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAsymmetry = () => {
    if (!newSecretTitle.trim()) return;
    const item: InformationAsymmetryItem = {
      id: `asym-${Date.now()}`,
      novelId: novel.id,
      secretTitle: newSecretTitle.trim(),
      readerKnows: newReaderKnows,
      protagonistKnows: newProtagonistKnows,
      antagonistKnows: newAntagonistKnows,
      dramaticIronyScore: newReaderKnows && !newProtagonistKnows ? 0.92 : 0.65,
      revelationPlanChapter: newPlanChapter,
    };
    setAsymmetryItems((prev) => [item, ...prev]);
    setNewSecretTitle('');
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部标题栏 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                上帝视角宏观沙盘与追读心理力学
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                控场级监视仪
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              追读疲劳弃书预警 · 戏剧讽刺信息不对称矩阵 · 场外暗流大势电报 · 爽点多巴胺间歇心电图
            </p>
          </div>
        </div>

        {/* 顶部选项卡 */}
        <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('PSYCHOLOGY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'PSYCHOLOGY'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
            追读心理动力学
          </button>
          <button
            onClick={() => setActiveTab('ASYMMETRY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'ASYMMETRY'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            信息不对称矩阵 ({asymmetryItems.length})
          </button>
          <button
            onClick={() => setActiveTab('OFFSCREEN')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'OFFSCREEN'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-indigo-400" />
            场外势力大势电报 ({offscreenNews.length})
          </button>
        </div>
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: 追读心理力学与疲劳预警 */}
          {/* ========================================================================= */}
          {activeTab === 'PSYCHOLOGY' && psychology && (
            <div className="space-y-6">
              {/* 核心力学三大关键指标 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* 期待感 / 悬念张力 */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      期待感 / 悬念张力指数
                    </span>
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-emerald-400">
                      {psychology.anticipationScore}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--bg-canvas)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${psychology.anticipationScore}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    断章悬念强韧，读者对下章主角反杀与解密具有极高好奇驱动力。
                  </p>
                </div>

                {/* 疲劳弃书预警度 */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      疲劳弃书预警风险 (Fatigue Risk)
                    </span>
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-amber-400">
                      {psychology.fatigueRisk}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">/ 100 (低风险)</span>
                  </div>
                  <div className="w-full bg-[var(--bg-canvas)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${psychology.fatigueRisk}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    信息密度控制合理，未出现长达三千字无对白的枯燥说明文。
                  </p>
                </div>

                {/* 爽点兑现比 */}
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[var(--text-muted)]">
                      爽点兑现比 (Payoff Index)
                    </span>
                    <Zap className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-indigo-400">
                      {psychology.payoffIndex}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] font-mono">/ 100</span>
                  </div>
                  <div className="w-full bg-[var(--bg-canvas)] h-2 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                    <div
                      className="bg-indigo-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${psychology.payoffIndex}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    压抑伏笔与反杀高潮兑现迅速，无恶性压制读者情绪的虐主隐患。
                  </p>
                </div>
              </div>

              {/* 多巴胺快感间歇心电图 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-rose-500" />
                      全章多巴胺高潮快感节拍分布心电轴
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      黄金网文规律：每隔 1500 - 2500 字必须出现一次微型信息反转或装逼打脸小爽点
                    </p>
                  </div>
                  <span className="text-xs font-mono text-indigo-400">
                    当前章节累计 7,800 字
                  </span>
                </div>

                {/* 心电图轨道 */}
                <div className="relative py-6">
                  <div className="w-full h-1 bg-[var(--border-medium)] rounded-full" />
                  <div className="flex justify-between items-center relative -top-3.5">
                    {psychology.dopamineIntervals.map((pos, idx) => {
                      const pct = (pos / 8000) * 100;
                      return (
                        <div
                          key={idx}
                          style={{ left: `${pct}%` }}
                          className="absolute -translate-x-1/2 flex flex-col items-center group cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center text-rose-400 text-[10px] font-mono font-bold shadow-lg group-hover:scale-125 transition-transform">
                            #{idx + 1}
                          </div>
                          <div className="text-[11px] font-mono text-[var(--text-muted)] mt-2">
                            {pos} 字
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            {idx === 0
                              ? '第一章初露锋芒'
                              : idx === 1
                              ? '黑市识破毒丹'
                              : idx === 2
                              ? '反杀夺宝'
                              : '终末大转折'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 心理动力学干预建议 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  AI 追读心理力学干预与节奏优化建议
                </h3>
                <div className="space-y-2">
                  {psychology.diagnosticAdvice.map((adv, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] flex items-start gap-2.5"
                    >
                      <span className="w-5 h-5 rounded-full bg-indigo-500/10 text-indigo-400 font-mono text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <p className="leading-relaxed">{adv}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 读者-主角-反派三级信息不对称矩阵 */}
          {/* ========================================================================= */}
          {activeTab === 'ASYMMETRY' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <h3 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Key className="w-4 h-4" />
                  戏剧讽刺机制：为什么【读者知晓而主角不知】最让人欲罢不能？
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  希区柯克炸弹理论在网络小说中的实践：若主角和读者都不知道桌下有炸弹，爆炸只是五秒的惊吓；
                  若读者早已知晓炸弹的存在与倒计时，但主角却在桌前悠闲饮茶，这便是长达数十分钟的极致焦虑与心理抓力。
                </p>
              </div>

              {/* 新增信息秘密 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
                <div className="text-xs font-bold text-[var(--text-main)]">
                  注册新的叙事秘密或阴谋暗线
                </div>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  <div className="md:col-span-5">
                    <input
                      value={newSecretTitle}
                      onChange={(e) => setNewSecretTitle(e.target.value)}
                      placeholder="秘密梗概（如：主角救下的小乞丐其实是敌对皇朝太子）"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                    />
                  </div>
                  <div className="md:col-span-4 flex items-center justify-around bg-[var(--bg-canvas)] px-3 py-1.5 rounded-lg border border-[var(--border-subtle)]">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newReaderKnows}
                        onChange={(e) => setNewReaderKnows(e.target.checked)}
                        className="accent-indigo-500"
                      />
                      <span>读者已知</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newProtagonistKnows}
                        onChange={(e) => setNewProtagonistKnows(e.target.checked)}
                        className="accent-indigo-500"
                      />
                      <span>主角已知</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newAntagonistKnows}
                        onChange={(e) => setNewAntagonistKnows(e.target.checked)}
                        className="accent-indigo-500"
                      />
                      <span>反派已知</span>
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <input
                      type="number"
                      value={newPlanChapter}
                      onChange={(e) => setNewPlanChapter(parseInt(e.target.value) || 1)}
                      placeholder="揭晓预定章"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] font-mono"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <button
                      onClick={handleAddAsymmetry}
                      className="w-full h-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* 信息差矩阵卡片 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asymmetryItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-sm text-[var(--text-main)] font-serif">
                        {item.secretTitle}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 shrink-0">
                        讽刺张力 {(item.dramaticIronyScore * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs pt-2">
                      <div
                        className={`p-2 rounded-lg border ${
                          item.readerKnows
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                            : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        📖 读者: {item.readerKnows ? '已知悉' : '被蒙蔽'}
                      </div>
                      <div
                        className={`p-2 rounded-lg border ${
                          item.protagonistKnows
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold'
                        }`}
                      >
                        ⚔️ 主角: {item.protagonistKnows ? '已察觉' : '蒙在鼓里'}
                      </div>
                      <div
                        className={`p-2 rounded-lg border ${
                          item.antagonistKnows
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 font-bold'
                            : 'bg-[var(--bg-canvas)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                        }`}
                      >
                        🦹 反派: {item.antagonistKnows ? '全盘掌控' : '毫不知情'}
                      </div>
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
                      <span>预定反转引爆点: 第 {item.revelationPlanChapter} 章</span>
                      <span className="text-teal-400 font-medium">状态：蓄势引信待燃</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 场外暗流阵营天下大势模拟电报 */}
          {/* ========================================================================= */}
          {activeTab === 'OFFSCREEN' && (
            <div className="space-y-6">
              <div className="p-5 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-2">
                <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Radio className="w-4 h-4" />
                  活生生的宏观修真世界 · 场外势力自主演化简报
                </h3>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  在主角于小山村闭关或探索秘境时，外面的九大皇朝与隐世古族绝非静止不动的 NPC。
                  上帝视角沙盘每隔特定章节周期，自主推演各方势力的行军、联姻、暗杀与秘境异变，为后续主角回归中州制造滚滚时代洪流。
                </p>
              </div>

              <div className="space-y-4">
                {offscreenNews.map((news) => (
                  <div
                    key={news.id}
                    className="p-5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] flex flex-wrap md:flex-nowrap items-start gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                      <Radio className="w-5 h-5 animate-pulse" />
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-indigo-400 font-mono">
                            【{news.era}】
                          </span>
                          <span className="text-xs font-semibold text-[var(--text-main)]">
                            {news.region}
                          </span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)] font-mono">
                          {new Date(news.timestamp).toLocaleTimeString()}
                        </span>
                      </div>

                      <p className="text-xs text-[var(--text-main)] leading-relaxed font-serif">
                        {news.eventSummary}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1">
                        <span>牵涉核心势力: {news.factionInvolved}</span>
                        <span className="text-rose-400 font-mono font-medium">
                          天下大势张力扰动 Δ +{(news.tensionDelta * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
