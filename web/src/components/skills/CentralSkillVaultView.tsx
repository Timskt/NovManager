// ==============================================================================
// 跨作品创作技能与套路中心库 (Central Skill & Reusable Asset Vault)
// 类似 Agent SKILL.md 的模块化小说知识工程：涵盖脑洞、套路、等级、架构、文风、副本、冲突、人设八大域
// 支持【手动自由勾选/取消勾选】、【AI 根据当前场景语义自动勾选匹配】、【从正文一键萃取沉淀为技能】与【反套路变异】
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  CreationSkillCategory,
  CreationSkillItem,
  SkillAutoMatchResult,
  TropeSubversionVariant,
} from '../../types/novel';
import {
  fetchCreationSkills,
  saveCreationSkill,
  deleteCreationSkill,
  autoMatchSkillsForScene,
  extractSkillFromManuscript,
  subvertTropeSkill,
} from '../../lib/api';
import {
  Boxes,
  CheckSquare,
  Square,
  Sparkles,
  Wand2,
  Plus,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  Sliders,
  Flame,
  Shield,
  BookOpen,
  Layers,
  GitBranch,
  Zap,
  Award,
  Search,
} from 'lucide-react';

const CATEGORY_META: Record<
  CreationSkillCategory,
  { label: string; icon: string; badgeClass: string }
> = {
  IDEA: {
    label: '核心脑洞',
    icon: '💡',
    badgeClass: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  TROPE: {
    label: '爽点套路',
    icon: '🔥',
    badgeClass: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  },
  POWER_TIER: {
    label: '战力等级',
    icon: '⚡',
    badgeClass: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  },
  ARCHITECTURE: {
    label: '章节架构',
    icon: '🏛️',
    badgeClass: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  STYLE: {
    label: '文风范式',
    icon: '✒️',
    badgeClass: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  },
  DUNGEON: {
    label: '秘境副本',
    icon: '🗝️',
    badgeClass: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
  },
  CONFLICT: {
    label: '冲突公式',
    icon: '⚔️',
    badgeClass: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  CHARACTER_ARCHETYPE: {
    label: '人设原型',
    icon: '🎭',
    badgeClass: 'bg-pink-500/10 border-pink-500/30 text-pink-400',
  },
};

export const CentralSkillVaultView: React.FC = () => {
  const { novel, activeChapter, activeScene, editorContent } = useNovel();

  const [skills, setSkills] = useState<CreationSkillItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CreationSkillCategory | 'ALL'>('ALL');
  const [activeTab, setActiveTab] = useState<'VAULT' | 'EXTRACTOR' | 'SUBVERTER'>('VAULT');
  const [searchQuery, setSearchQuery] = useState('');

  // AI 智能自动勾选状态
  const [autoMatchContext, setAutoMatchContext] = useState<string>('');
  const [isAutoMatching, setIsAutoMatching] = useState(false);
  const [lastMatchResult, setLastMatchResult] = useState<SkillAutoMatchResult | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // 从正文逆向萃取状态
  const [extractText, setExtractText] = useState<string>('');
  const [extractCategory, setExtractCategory] = useState<CreationSkillCategory>('TROPE');
  const [extractName, setExtractName] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  // 反套路变异状态
  const [subvertTargetId, setSubvertTargetId] = useState<string>('skill-trope-001');
  const [isSubverting, setIsSubverting] = useState(false);
  const [subversionVariants, setSubversionVariants] = useState<TropeSubversionVariant[]>([]);

  useEffect(() => {
    loadSkills();
  }, []);

  useEffect(() => {
    const defaultCtx = `${activeChapter?.title || '第二章：黑市潜影'} — ${
      activeScene?.sceneGoal || '主角在黑市拍卖会低调截胡蒙尘残宝，并在出城荒林遭遇金丹期强敌追杀伏击，需越阶反杀并在章末留下断章悬念'
    }`;
    setAutoMatchContext(defaultCtx);
    if (editorContent && !extractText) {
      setExtractText(editorContent.slice(0, 500));
    }
  }, [activeChapter?.id, activeScene?.id]);

  const loadSkills = async () => {
    const list = await fetchCreationSkills();
    setSkills(list);
    if (list.length > 0) {
      setSubvertTargetId(list[0].id);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleToggleSkill = async (skillId: string) => {
    setSkills((prev) =>
      prev.map((sk) => {
        if (sk.id === skillId) {
          const updated = { ...sk, isEnabled: !sk.isEnabled };
          saveCreationSkill(updated);
          return updated;
        }
        return sk;
      })
    );
  };

  const handleToggleAutoMatchEligible = (skillId: string) => {
    setSkills((prev) =>
      prev.map((sk) =>
        sk.id === skillId ? { ...sk, autoMatchEligible: !sk.autoMatchEligible } : sk
      )
    );
  };

  const handleBatchSelect = (enableAll: boolean) => {
    setSkills((prev) => prev.map((sk) => ({ ...sk, isEnabled: enableAll })));
    showToast(enableAll ? '✅ 已全部勾选挂载参考' : '⚪ 已清空全部技能勾选（纯自由发挥模式）');
  };

  const handleRunSmartAutoMatch = async () => {
    setIsAutoMatching(true);
    try {
      const res = await autoMatchSkillsForScene(autoMatchContext, skills);
      setLastMatchResult(res);
      setSkills((prev) =>
        prev.map((sk) => ({
          ...sk,
          isEnabled: res.matchedSkillIds.includes(sk.id),
        }))
      );
      showToast(
        `🤖 AI 智能场景感知完成：已根据当前剧情自动勾选 ${res.matchedSkillIds.length} 项最匹配的套路与技能！`
      );
    } finally {
      setIsAutoMatching(false);
    }
  };

  const handleExtractFromManuscript = async () => {
    if (!extractText.trim()) return;
    setIsExtracting(true);
    try {
      const created = await extractSkillFromManuscript({
        manuscriptText: extractText,
        preferredCategory: extractCategory,
        sourceNovelTitle: novel.title,
        customName: extractName || undefined,
      });
      setSkills((prev) => [created, ...prev]);
      setExtractName('');
      setActiveTab('VAULT');
      showToast(`🎉 已从正文中成功提炼新技能：“${created.name}”并自动勾选挂载！`);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleRunSubversion = async () => {
    const target = skills.find((s) => s.id === subvertTargetId);
    if (!target) return;
    setIsSubverting(true);
    try {
      const variants = await subvertTropeSkill(target);
      setSubversionVariants(variants);
    } finally {
      setIsSubverting(false);
    }
  };

  const handleSaveVariantAsSkill = async (v: TropeSubversionVariant) => {
    const newSkill: CreationSkillItem = {
      id: `skill-subv-${Date.now()}`,
      name: `【反套路】${v.subversionTitle}`,
      category: 'CONFLICT',
      sourceNovelTitle: `${novel.title} · 变异工坊`,
      description: v.subvertedTwist,
      promptDirective: `【反套路指令】打破“${v.classicExpectation}”的陈旧预期，强制执行反转：“${v.subvertedTwist}”。`,
      exampleSnippet: v.dramaticPayoff,
      triggerKeywords: ['反转', '反套路', '算计', '破局'],
      isEnabled: true,
      autoMatchEligible: true,
      reusedCount: 1,
      effectivenessRating: 96,
      createdAt: new Date().toISOString(),
    };
    const saved = await saveCreationSkill(newSkill);
    setSkills((prev) => [saved, ...prev]);
    setActiveTab('VAULT');
    showToast(`✨ 已将反套路方案“${saved.name}”收录至技能中心库！`);
  };

  const enabledCount = skills.filter((s) => s.isEnabled).length;

  const filteredSkills = skills.filter((sk) => {
    const matchCat = selectedCategory === 'ALL' || sk.category === selectedCategory;
    const matchQuery =
      !searchQuery.trim() ||
      sk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sk.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sk.triggerKeywords.some((k) => k.includes(searchQuery));
    return matchCat && matchQuery;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部标题栏 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Boxes className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                跨作品创作技能与套路中心库 (Novel Skill Hub)
              </h1>
              <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                当前已勾选参考: {enabledCount} / {skills.length} 项
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              八大创作资产域（脑洞/套路/等级/架构/文风/副本/冲突/人设） · 支持手动勾选或 AI 按场景智能勾选挂载
            </p>
          </div>
        </div>

        {/* 选项卡 */}
        <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('VAULT')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'VAULT'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-emerald-400" />
            技能与套路中心库 ({skills.length})
          </button>
          <button
            onClick={() => setActiveTab('EXTRACTOR')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'EXTRACTOR'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-amber-400" />
            从正文萃取沉淀 Skill
          </button>
          <button
            onClick={() => setActiveTab('SUBVERTER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'SUBVERTER'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5 text-purple-400" />
            反套路变异引擎
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="bg-indigo-500/15 border-b border-indigo-500/30 px-6 py-2.5 text-xs text-indigo-300 flex items-center gap-2 font-medium">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          {toastMessage}
        </div>
      )}

      {/* 主体区域 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: 技能与套路中心库（手动勾选 + AI 智能场景勾选） */}
          {/* ========================================================================= */}
          {activeTab === 'VAULT' && (
            <div className="space-y-6">
              {/* AI 智能语义匹配勾选控制台 */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      AI 智能场景感知勾选器 (Smart Skill Auto-Selector)
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      不仅支持您在下方随时手动勾选/取消勾选，还可让 AI 根据当前章节的目标冲突自动为您勾选最合适的等级、套路与文风 Skill
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleBatchSelect(true)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      全选参考
                    </button>
                    <button
                      onClick={() => handleBatchSelect(false)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] hover:text-[var(--text-main)]"
                    >
                      全部不勾选
                    </button>
                    <button
                      onClick={handleRunSmartAutoMatch}
                      disabled={isAutoMatching}
                      className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white text-xs font-medium shadow-sm flex items-center gap-1.5 transition-all"
                    >
                      {isAutoMatching ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          正在扫描场景语义...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3.5 h-3.5" />
                          AI 按当前剧情自动勾选最佳技能
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    当前场景上下文锚点:
                  </span>
                  <input
                    value={autoMatchContext}
                    onChange={(e) => setAutoMatchContext(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  />
                </div>
              </div>

              {/* 分类筛选与搜索栏 */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setSelectedCategory('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selectedCategory === 'ALL'
                        ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    全部域 ({skills.length})
                  </button>
                  {(Object.keys(CATEGORY_META) as CreationSkillCategory[]).map((cat) => {
                    const meta = CATEGORY_META[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                          selectedCategory === cat
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        <span>{meta.icon}</span>
                        <span>{meta.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="relative w-64">
                  <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜索套路、等级、副本关键词..."
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  />
                </div>
              </div>

              {/* 技能卡片矩阵 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {filteredSkills.map((sk) => {
                  const meta = CATEGORY_META[sk.category];
                  const matchReason = lastMatchResult?.matchReasons?.[sk.id];
                  return (
                    <div
                      key={sk.id}
                      className={`rounded-xl border p-5 space-y-3.5 transition-all ${
                        sk.isEnabled
                          ? 'bg-[var(--bg-surface)] border-emerald-500/40 ring-1 ring-emerald-500/15'
                          : 'bg-[var(--bg-surface)]/70 border-[var(--border-subtle)] opacity-80 hover:opacity-100'
                      }`}
                    >
                      {/* 顶部勾选框与元信息 */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => handleToggleSkill(sk.id)}
                            className={`mt-0.5 p-1 rounded-md transition-colors ${
                              sk.isEnabled
                                ? 'text-emerald-400 hover:text-emerald-300'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                            }`}
                            title={sk.isEnabled ? '点击取消勾选参考' : '点击勾选挂载参考'}
                          >
                            {sk.isEnabled ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${meta.badgeClass}`}
                              >
                                {meta.icon} {meta.label}
                              </span>
                              <span className="text-[11px] text-[var(--text-muted)]">
                                源自: {sk.sourceNovelTitle}
                              </span>
                            </div>
                            <h3
                              onClick={() => handleToggleSkill(sk.id)}
                              className="text-sm font-bold text-[var(--text-main)] font-serif mt-1 cursor-pointer"
                            >
                              {sk.name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                              sk.isEnabled
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-subtle)]'
                            }`}
                          >
                            {sk.isEnabled ? '✓ 已勾选挂载' : '未勾选'}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)]">
                            复用 {sk.reusedCount} 次 · 评分 {sk.effectivenessRating}
                          </span>
                        </div>
                      </div>

                      {/* AI 自动勾选命中理由提示 */}
                      {sk.isEnabled && matchReason && (
                        <div className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-300 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{matchReason}</span>
                        </div>
                      )}

                      <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                        {sk.description}
                      </p>

                      {/* 核心执行指令 */}
                      <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-main)] font-mono leading-relaxed">
                        {sk.promptDirective}
                      </div>

                      {/* 黄金范例 */}
                      <div className="p-3 rounded-lg bg-[var(--bg-canvas)]/60 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-serif italic leading-relaxed">
                        “{sk.exampleSnippet}”
                      </div>

                      {/* 底部触发词与自动感知开关 */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)] text-[11px]">
                        <div className="flex flex-wrap gap-1">
                          {sk.triggerKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)]"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>

                        <label className="flex items-center gap-1.5 text-[var(--text-muted)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={sk.autoMatchEligible}
                            onChange={() => handleToggleAutoMatchEligible(sk.id)}
                            className="accent-indigo-500"
                          />
                          <span>允许 AI 自动勾选</span>
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 从当前小说正文中一键萃取沉淀为复用 Skill */}
          {/* ========================================================================= */}
          {activeTab === 'EXTRACTOR' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-5 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-2">
                <h2 className="text-sm font-bold text-amber-400 flex items-center gap-2">
                  <Wand2 className="w-4 h-4" />
                  正文高光资产逆向萃取器：将好想法、好套路、好设定一键沉淀为可复用 Skill
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  当您在创作过程中发现某一段打斗动作、某个战力等级设定、某个副本机制或某个装逼反转写得极为惊艳时，将其粘贴于此，引擎将自动剥离具体人名地名，提炼为跨章节、跨书籍通用的标准
                  Creation Skill 模块！
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-[var(--text-main)] block mb-1.5">
                      沉淀技能所属分类域
                    </label>
                    <select
                      value={extractCategory}
                      onChange={(e) => setExtractCategory(e.target.value as CreationSkillCategory)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                    >
                      <option value="TROPE">🔥 爽点套路与装逼桥段 (TROPE)</option>
                      <option value="IDEA">💡 核心脑洞与高概念 (IDEA)</option>
                      <option value="POWER_TIER">⚡ 战力等级与代价体系 (POWER_TIER)</option>
                      <option value="ARCHITECTURE">🏛️ 章节结构与断章架构 (ARCHITECTURE)</option>
                      <option value="STYLE">✒️ 文风修辞与动作白描 (STYLE)</option>
                      <option value="DUNGEON">🗝️ 秘境副本与规则机制 (DUNGEON)</option>
                      <option value="CONFLICT">⚔️ 戏剧冲突与反转公式 (CONFLICT)</option>
                      <option value="CHARACTER_ARCHETYPE">🎭 立体人设原型 (CHARACTER_ARCHETYPE)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[var(--text-main)] block mb-1.5">
                      自定义技能命名 (可选)
                    </label>
                    <input
                      value={extractName}
                      onChange={(e) => setExtractName(e.target.value)}
                      placeholder="如：【冲突公式】师徒博弈·假传死讯试探忠心"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <div className="text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-semibold text-[var(--text-main)]">
                      待提炼的小说正文段落 / 设定原稿
                    </label>
                    <button
                      onClick={() => setExtractText(editorContent || '')}
                      className="text-indigo-400 hover:text-indigo-300"
                    >
                      载入当前创作台正文
                    </button>
                  </div>
                  <textarea
                    rows={7}
                    value={extractText}
                    onChange={(e) => setExtractText(e.target.value)}
                    placeholder="在此粘贴您觉得写得非常出彩的正文片段、等级划分、副本规则或冲突桥段..."
                    className="w-full p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] leading-relaxed font-serif"
                  />
                </div>

                <button
                  onClick={handleExtractFromManuscript}
                  disabled={isExtracting || !extractText.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      正在剥离专有名词并提炼通用 Skill 模版...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      一键逆向提炼并收录至中心库
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 反套路变异实验室 */}
          {/* ========================================================================= */}
          {activeTab === 'SUBVERTER' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-purple-400" />
                      经典套路反套路变异器 (Trope Subversion Mutator)
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      老书虫对传统套路早已了如指掌。选择任意一项现有套路 Skill，一键推演出 3 种令读者意想不到的反套路神转折！
                    </p>
                  </div>

                  <button
                    onClick={handleRunSubversion}
                    disabled={isSubverting}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md transition-colors"
                  >
                    {isSubverting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        正在推演反套路变异...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        生成 3 种反套路变异方案
                      </>
                    )}
                  </button>
                </div>

                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1.5">
                    选择要进行反套路解构的母本 Skill
                  </label>
                  <select
                    value={subvertTargetId}
                    onChange={(e) => setSubvertTargetId(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  >
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.description.slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {subversionVariants.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {subversionVariants.map((v) => (
                    <div
                      key={v.id}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <h3 className="text-sm font-bold text-purple-300 font-serif">
                          {v.subversionTitle}
                        </h3>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs">
                          <span className="text-[var(--text-muted)] block font-semibold mb-1">
                            ❌ 读者常规套路预期：
                          </span>
                          <span className="text-[var(--text-muted)]">{v.classicExpectation}</span>
                        </div>
                        <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20 text-xs">
                          <span className="text-purple-400 block font-semibold mb-1">
                            ⚡ 反套路神转折设计：
                          </span>
                          <span className="text-[var(--text-main)] leading-relaxed">
                            {v.subvertedTwist}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
                        <div className="text-[11px] text-emerald-400">{v.dramaticPayoff}</div>
                        <button
                          onClick={() => handleSaveVariantAsSkill(v)}
                          className="w-full py-2 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-medium transition-colors"
                        >
                          + 保存为独立反套路 Skill
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
