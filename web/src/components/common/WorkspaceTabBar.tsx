// ==============================================================================
// 多标签工作区导航栏与上下文面包屑跳转中枢 (IDE-Grade Multi-Tab Workspace Dock & Breadcrumb Switcher)
// 涵盖：
// - F22/A22 跨视图携参穿梭返回横幅 (Stateful Cross-View Teleport Return Banner)
// - F23/A23 非创作台悬浮正文伴侣小窗 (Persistent PiP Manuscript Companion Drawer)
// - F24/A24 面包屑全站 28 模块平铺瞬移矩阵
// - F25/A25 下一步创作流智能引导芯片 (Markov Next-Best-Action Workflow Recommender)
// - F28/A28 四大工作区标签布局预设一键切换 (码字流/防幻觉流/世界观流/巡航流)
// ==============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavTab, DOMAIN_GROUPS, getNavItemMeta } from '../Header';
import { useNovel } from '../../context/NovelContext';
import {
  buildCompactGroundedContext,
  auditAndSanitizeHallucinations,
} from '../../lib/llmMemoryGuard';
import { CrossViewTeleportPayload, WorkspacePresetId } from '../../types/novel';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  ChevronDown,
  X,
  Pin,
  ShieldCheck,
  AlertTriangle,
  Feather,
  BookOpen,
  Sparkles,
  ExternalLink,
  LayoutGrid,
  CornerUpLeft,
  Compass,
} from 'lucide-react';

interface WorkspaceTabBarProps {
  activeTab: NavTab;
  openTabs: NavTab[];
  pinnedTabs: NavTab[];
  canGoBack: boolean;
  canGoForward: boolean;
  previousTabTitle?: string;
  nextTabTitle?: string;
  teleportContext?: CrossViewTeleportPayload | null;
  onClearTeleportContext?: () => void;
  onApplyPreset?: (presetId: WorkspacePresetId) => void;
  onSelectTab: (tab: NavTab, payload?: CrossViewTeleportPayload) => void;
  onCloseTab: (tab: NavTab, e: React.MouseEvent) => void;
  onTogglePinTab: (tab: NavTab, e: React.MouseEvent) => void;
  onGoBack: () => void;
  onGoForward: () => void;
}

export const WORKSPACE_PRESETS: Record<
  WorkspacePresetId,
  { label: string; icon: string; tabs: NavTab[]; defaultTab: NavTab }
> = {
  WRITING_FLOW: {
    label: '✍️ 沉浸码字流',
    icon: '✍️',
    tabs: ['STUDIO', 'SPARK_HUB', 'MEMORY_GUARD', 'CHARACTERS', 'STYLE_DNA'],
    defaultTab: 'STUDIO',
  },
  MEMORY_AUDIT: {
    label: '🛡️ 防幻觉精算流',
    icon: '🛡️',
    tabs: ['MEMORY_GUARD', 'GODS_EYE_SANDBOX', 'CHARACTERS', 'LORE', 'FORESHADOWING'],
    defaultTab: 'MEMORY_GUARD',
  },
  WORLD_BUILDING: {
    label: '🌍 世界观架构流',
    icon: '🌍',
    tabs: ['GENESIS', 'ARCHITECT', 'LORE', 'CHARACTERS', 'RELATIONS', 'MAP'],
    defaultTab: 'ARCHITECT',
  },
  LAZY_AUTOPILOT: {
    label: '🚀 懒人巡航流',
    icon: '🚀',
    tabs: ['AUTOPILOT', 'SKILL_VAULT', 'MODEL_HUB', 'MEMORY_GUARD', 'STUDIO'],
    defaultTab: 'AUTOPILOT',
  },
};

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  activeTab,
  openTabs,
  pinnedTabs,
  canGoBack,
  canGoForward,
  previousTabTitle,
  nextTabTitle,
  teleportContext,
  onClearTeleportContext,
  onApplyPreset,
  onSelectTab,
  onCloseTab,
  onTogglePinTab,
  onGoBack,
  onGoForward,
}) => {
  const {
    novel,
    volumes,
    activeChapter,
    activeScene,
    setActiveChapterId,
    setActiveSceneIndex,
    characters,
    characterStates,
    worldSettings,
    foreshadowings,
    editorContent,
    setEditorContent,
  } = useNovel();

  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);
  const [pipManuscriptOpen, setPipManuscriptOpen] = useState(false);

  const domainRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);
  const presetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (domainRef.current && !domainRef.current.contains(e.target as Node)) {
        setDomainMenuOpen(false);
      }
      if (chapterRef.current && !chapterRef.current.contains(e.target as Node)) {
        setChapterMenuOpen(false);
      }
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) {
        setPresetMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { item: activeItem, domain: activeDomain } = useMemo(
    () => getNavItemMeta(activeTab),
    [activeTab]
  );

  // Real-time token compression & anti-hallucination telemetry pill
  const memoryTelemetry = useMemo(() => {
    const packed = buildCompactGroundedContext({
      novel,
      volumes,
      activeChapter,
      activeScene,
      characters,
      characterStates,
      worldSettings,
      foreshadowings,
      recentDraftText: editorContent,
    });
    const audit = auditAndSanitizeHallucinations({
      draftText: editorContent || activeScene?.draftContent || '',
      factAnchors: packed.activeFactAnchors,
    });
    return {
      savingRatio: packed.compressionRatioPercent,
      savedTokens: packed.savedTokens,
      hallucinationCount: audit.findings.length,
      trustScore: audit.faithfulnessScore,
    };
  }, [
    novel,
    volumes,
    activeChapter,
    activeScene,
    characters,
    characterStates,
    worldSettings,
    foreshadowings,
    editorContent,
  ]);

  return (
    <>
      <div
        className="h-9 border-b flex items-center justify-between px-3 lg:px-4 gap-2 select-none shrink-0 z-30 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* Left: History Back/Forward + Teleport Return Pill */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div
            className="flex items-center rounded-lg border p-0.5"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              onClick={onGoBack}
              disabled={!canGoBack}
              title={
                canGoBack
                  ? `后退至：${previousTabTitle || '上一页'} (Alt+←)`
                  : '暂无可后退的历史视图'
              }
              className="p-0.5 rounded transition-colors disabled:opacity-30 hover:bg-indigo-500/10 cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onGoForward}
              disabled={!canGoForward}
              title={
                canGoForward
                  ? `前进至：${nextTabTitle || '下一页'} (Alt+→)`
                  : '暂无可前进的历史视图'
              }
              className="p-0.5 rounded transition-colors disabled:opacity-30 hover:bg-indigo-500/10 cursor-pointer"
              style={{ color: 'var(--text-main)' }}
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stateful Cross-View Teleport Return Pill */}
          {teleportContext?.sourceTab && teleportContext.sourceTab !== activeTab && (
            <button
              onClick={() => {
                const target = teleportContext.sourceTab as NavTab;
                onClearTeleportContext?.();
                onSelectTab(target);
              }}
              className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 border border-indigo-500/30 flex items-center gap-1 transition-colors whitespace-nowrap cursor-pointer"
              title="一键返回发起跨页跳转的源页面与焦点上下文"
            >
              <CornerUpLeft className="w-3 h-3" />
              <span className="truncate max-w-[110px]">
                返回：{teleportContext.sourceTitle || teleportContext.sourceTab}
              </span>
            </button>
          )}
        </div>

        {/* Center-Left: IDE-Style Multi-Tab Workspace Dock (with Alt+1..9 index hints) */}
        <div
          className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {openTabs.map((tabId, idx) => {
            const { item } = getNavItemMeta(tabId);
            if (!item) return null;
            const isCurrent = tabId === activeTab;
            const isPinned = pinnedTabs.includes(tabId);

            return (
              <div
                key={tabId}
                onClick={() => onSelectTab(tabId)}
                title={`${item.title} — ${item.subtitle} (快捷键 Alt+${idx + 1})`}
                className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all shrink-0 whitespace-nowrap border ${
                  isCurrent
                    ? 'font-bold shadow-2xs'
                    : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-75 hover:opacity-100'
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: 'var(--accent-surface)',
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                      }
                    : {
                        color: 'var(--text-muted)',
                      }
                }
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="whitespace-nowrap">{item.shortTitle || item.title}</span>

                {/* Pin/Unpin or Close Tab */}
                <div className="flex items-center gap-0.5 ml-0.5">
                  <button
                    onClick={(e) => onTogglePinTab(tabId, e)}
                    title={isPinned ? '取消固定此工作区标签' : '固定此标签到工作栏'}
                    className={`p-0.5 rounded transition-opacity ${
                      isPinned
                        ? 'opacity-65 hover:opacity-100'
                        : 'opacity-0 group-hover:opacity-60 hover:!opacity-100'
                    }`}
                  >
                    <Pin className="w-2.5 h-2.5" />
                  </button>
                  {!isPinned && openTabs.length > 1 && (
                    <button
                      onClick={(e) => onCloseTab(tabId, e)}
                      title="关闭此工作标签页"
                      className="p-0.5 rounded opacity-0 group-hover:opacity-70 hover:!opacity-100 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: Independent Scroll Lock Status + Quick Studio Return + Preset Switcher + Memory Guard */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 当处于创作台时显示三栏独立滚轮定住状态提示 */}
          {(activeTab === 'STUDIO' || activeTab === 'OUTLINES') && (
            <div
              className="hidden xl:flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium whitespace-nowrap"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="左栏(大纲树)、中栏(手稿正本)、右栏(全模态AI参谋)已独立定住：鼠标停留在哪一栏滑动滚轮，仅滚动对应区域，互不牵连"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>🔒 左/中/右三栏已定住 (独立滚轮)</span>
            </div>
          )}

          {/* 非创作台视图下的跨视图章节快切与悬浮伴侣 */}
          {activeTab !== 'STUDIO' && activeChapter && (
            <div className="relative hidden lg:flex items-center gap-1" ref={chapterRef}>
              <button
                onClick={() => setChapterMenuOpen((prev) => !prev)}
                className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] transition-colors border cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                title="跨视图快速切换当前焦点章节与分镜"
              >
                <BookOpen className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="truncate max-w-[110px] font-medium">
                  {activeChapter.title}
                </span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              <button
                onClick={() => setPipManuscriptOpen((prev) => !prev)}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors flex items-center gap-1 border cursor-pointer ${
                  pipManuscriptOpen
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-amber-500/10 text-amber-500 border-amber-500/25 hover:bg-amber-500/20'
                }`}
                title="在不离开当前页面的情况下打开【悬浮正文伴侣抽屉】对照或修改手稿"
              >
                <span>伴侣</span>
              </button>
            </div>
          )}
          {/* Quick Return to Studio when on another tab */}
          {activeTab !== 'STUDIO' && (
            <button
              onClick={() => onSelectTab('STUDIO')}
              className="hidden xl:flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/25 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              title="回到【创作台】继续撰写当前章节"
            >
              <Feather className="w-3 h-3 shrink-0" />
              <span>回创作台</span>
            </button>
          )}

          {/* Workspace Layout Preset Switcher (F28 / A28) */}
          <div className="relative shrink-0" ref={presetRef}>
            <button
              onClick={() => setPresetMenuOpen((prev) => !prev)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors hover:bg-indigo-500/10 whitespace-nowrap cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="一键切换四大场景化工作区标签组预设 (码字流 / 防幻觉流 / 世界观流 / 巡航流)"
            >
              <LayoutGrid className="w-3 h-3 text-indigo-400 shrink-0" />
              <span className="hidden lg:inline">流派预设</span>
              <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
            </button>

            {presetMenuOpen && (
              <div
                className="absolute right-0 top-full mt-1.5 w-60 rounded-xl border shadow-2xl p-2 z-50"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b mb-1"
                  style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
                >
                  一键切换角色化工作标签栈 (F28/A28)
                </div>
                {(Object.keys(WORKSPACE_PRESETS) as WorkspacePresetId[]).map((presetKey) => {
                  const p = WORKSPACE_PRESETS[presetKey];
                  return (
                    <button
                      key={presetKey}
                      onClick={() => {
                        onApplyPreset?.(presetKey);
                        setPresetMenuOpen(false);
                      }}
                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs hover:bg-indigo-500/10 transition-colors flex flex-col gap-0.5"
                      style={{ color: 'var(--text-main)' }}
                    >
                      <span className="font-bold">{p.label}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                        包含 {p.tabs.length} 个核心联动标签
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Token Compression & Anti-Hallucination Quick-Jump Pill */}
          <button
            onClick={() => onSelectTab('MEMORY_GUARD')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'MEMORY_GUARD'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-2xs'
                : memoryTelemetry.hallucinationCount > 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/20'
            }`}
            title="点击进入【四级记忆与防幻觉护栏】：查看 L4-L1 记忆裁剪明细、管理铁律事实锚点、一键熔断清洗大模型幻觉"
          >
            {memoryTelemetry.hallucinationCount > 0 ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                <span className="hidden lg:inline">
                  {memoryTelemetry.hallucinationCount}处幻觉 · 省{memoryTelemetry.savingRatio}%
                </span>
                <span className="lg:hidden">
                  {memoryTelemetry.hallucinationCount}幻觉
                </span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden lg:inline">
                  省Token {memoryTelemetry.savingRatio}% · 0幻觉
                </span>
                <span className="lg:hidden">-{memoryTelemetry.savingRatio}%</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating PiP Manuscript Companion Drawer for Non-Studio Views (F23 / A23) */}
      {pipManuscriptOpen && activeTab !== 'STUDIO' && (
        <div
          className="fixed bottom-16 right-6 w-[420px] max-w-[92vw] rounded-2xl border shadow-2xl z-50 flex flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div
            className="px-4 py-2.5 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                悬浮正文伴侣 · {activeChapter?.title || '当前章节'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setPipManuscriptOpen(false);
                  onSelectTab('STUDIO');
                }}
                className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25"
              >
                全屏创作台 ↗
              </button>
              <button
                onClick={() => setPipManuscriptOpen(false)}
                className="p-1 rounded hover:bg-rose-500/15 text-rose-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-3 flex flex-col gap-2">
            <textarea
              value={editorContent}
              onChange={(e) => setEditorContent(e.target.value)}
              rows={7}
              placeholder="在此随时对照或修改当前章节正文草稿，内容与【创作台】实时双向同步..."
              className="w-full rounded-xl border p-2.5 text-xs leading-relaxed focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
            <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <span>实时同步中 · 当前字数：{editorContent.length} 字</span>
              <button
                onClick={() => {
                  setPipManuscriptOpen(false);
                  onSelectTab('MEMORY_GUARD');
                }}
                className="text-emerald-500 font-semibold hover:underline flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>送入防幻觉护栏稽查 →</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
