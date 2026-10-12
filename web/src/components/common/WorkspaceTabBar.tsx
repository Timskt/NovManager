// ==============================================================================
// 多标签工作区导航栏与上下文面包屑跳转中枢 (IDE-Grade Multi-Tab Workspace Dock & Breadcrumb Switcher)
// 彻底解决跨页面切换繁琐、浏览器前进后退丢失、深层功能需多次下拉、非创作台无法快速切章节等跳转痛点
// ==============================================================================

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavTab, DOMAIN_GROUPS, getNavItemMeta } from '../Header';
import { useNovel } from '../../context/NovelContext';
import { buildCompactGroundedContext, auditAndSanitizeHallucinations } from '../../lib/llmMemoryGuard';
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
  Layers,
} from 'lucide-react';

interface WorkspaceTabBarProps {
  activeTab: NavTab;
  openTabs: NavTab[];
  pinnedTabs: NavTab[];
  canGoBack: boolean;
  canGoForward: boolean;
  previousTabTitle?: string;
  nextTabTitle?: string;
  onSelectTab: (tab: NavTab) => void;
  onCloseTab: (tab: NavTab, e: React.MouseEvent) => void;
  onTogglePinTab: (tab: NavTab, e: React.MouseEvent) => void;
  onGoBack: () => void;
  onGoForward: () => void;
}

export const WorkspaceTabBar: React.FC<WorkspaceTabBarProps> = ({
  activeTab,
  openTabs,
  pinnedTabs,
  canGoBack,
  canGoForward,
  previousTabTitle,
  nextTabTitle,
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
  } = useNovel();

  const [domainMenuOpen, setDomainMenuOpen] = useState(false);
  const [chapterMenuOpen, setChapterMenuOpen] = useState(false);
  const domainRef = useRef<HTMLDivElement>(null);
  const chapterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (domainRef.current && !domainRef.current.contains(e.target as Node)) {
        setDomainMenuOpen(false);
      }
      if (chapterRef.current && !chapterRef.current.contains(e.target as Node)) {
        setChapterMenuOpen(false);
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
    <div
      className="h-9 border-b flex items-center justify-between px-3 gap-2 select-none shrink-0 z-30 transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* Left: History Back/Forward + Interactive Contextual Breadcrumb */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Back / Forward Navigation */}
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
            className="p-1 rounded transition-colors disabled:opacity-30 hover:bg-indigo-500/10"
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
            className="p-1 rounded transition-colors disabled:opacity-30 hover:bg-indigo-500/10"
            style={{ color: 'var(--text-main)' }}
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Interactive Domain & View Breadcrumb */}
        <div className="relative" ref={domainRef}>
          <button
            onClick={() => setDomainMenuOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-indigo-500/10 border border-transparent hover:border-indigo-500/20"
            style={{ color: 'var(--text-muted)' }}
            title="点击快速切换同域或其他工作模块"
          >
            <span>{activeDomain?.icon || '🧭'}</span>
            <span className="hidden sm:inline">{activeDomain?.title || '工作区'}</span>
            <ChevronRight className="w-3 h-3 opacity-50" />
            <span className="font-bold flex items-center gap-1" style={{ color: 'var(--text-main)' }}>
              {activeItem?.icon}
              <span>{activeItem?.title || activeTab}</span>
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {domainMenuOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 w-72 rounded-xl border shadow-2xl p-2 z-50 max-h-[75vh] overflow-y-auto"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b mb-1.5"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)' }}
              >
                全站模块一跳直达 ({DOMAIN_GROUPS.reduce((acc, g) => acc + g.items.length, 0)} 个工作台)
              </div>
              {DOMAIN_GROUPS.map((group) => (
                <div key={group.key} className="mb-2 last:mb-0">
                  <div
                    className="px-2 py-1 text-[11px] font-bold flex items-center gap-1.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <span>{group.icon}</span>
                    <span>{group.title}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-0.5">
                    {group.items.map((item) => {
                      const isCurrent = item.id === activeTab;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab(item.id);
                            setDomainMenuOpen(false);
                          }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                            isCurrent
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'hover:bg-indigo-500/10'
                          }`}
                          style={!isCurrent ? { color: 'var(--text-main)' } : undefined}
                        >
                          <span className="flex items-center gap-2 truncate">
                            {item.icon}
                            <span className="truncate">{item.title}</span>
                          </span>
                          {item.badge && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                isCurrent
                                  ? 'bg-white/20 text-white'
                                  : 'bg-indigo-500/10 text-indigo-400'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Active Chapter & Scene Quick Switcher in Breadcrumb */}
        {activeChapter && (
          <div className="relative hidden md:block" ref={chapterRef}>
            <div className="flex items-center gap-1">
              <ChevronRight className="w-3 h-3 opacity-40" style={{ color: 'var(--text-muted)' }} />
              <button
                onClick={() => setChapterMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-colors hover:bg-amber-500/10 border border-transparent hover:border-amber-500/30"
                style={{ color: 'var(--text-main)' }}
                title="跨视图快速切换当前焦点章节与分镜，无需先回创作台"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span className="truncate max-w-[160px] font-medium">
                  {activeChapter.title}
                </span>
                {activeScene && (
                  <span
                    className="text-[11px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-500 truncate max-w-[110px]"
                  >
                    第{activeScene.sceneIndex}场 · {activeScene.sceneGoal}
                  </span>
                )}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {activeTab !== 'STUDIO' && (
                <button
                  onClick={() => onSelectTab('STUDIO')}
                  className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-500 hover:bg-amber-500/25 transition-colors flex items-center gap-1"
                  title="立即返回创作台编辑当前焦点章节"
                >
                  <Feather className="w-3 h-3" />
                  <span>执笔此章</span>
                </button>
              )}
            </div>

            {chapterMenuOpen && (
              <div
                className="absolute left-0 top-full mt-1.5 w-80 rounded-xl border shadow-2xl p-2.5 z-50 max-h-96 overflow-y-auto"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between pb-2 mb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-xs font-bold" style={{ color: 'var(--text-main)' }}>
                    跨视图快速切换焦点章节与分镜
                  </span>
                  <button
                    onClick={() => {
                      onSelectTab('STUDIO');
                      setChapterMenuOpen(false);
                    }}
                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>打开创作台</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>

                {volumes.map((vol) => {
                  const volChapters = vol.chapters || [];
                  return (
                    <div key={vol.id} className="mb-2.5 last:mb-0">
                      <div className="text-[11px] font-bold px-2 py-1 opacity-75" style={{ color: 'var(--text-muted)' }}>
                        📚 {vol.title}
                      </div>
                      <div className="space-y-1">
                        {volChapters.map((chap) => {
                          const chapScenes = chap.scenes || [];
                          const isCurrentChap = chap.id === activeChapter?.id;
                          return (
                            <div
                              key={chap.id}
                              className={`rounded-lg p-1.5 border transition-colors ${
                                isCurrentChap
                                  ? 'border-amber-500/40 bg-amber-500/5'
                                  : 'border-transparent hover:bg-indigo-500/5'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <button
                                  onClick={() => {
                                    setActiveChapterId(chap.id);
                                    setActiveSceneIndex(0);
                                    setChapterMenuOpen(false);
                                  }}
                                  className="text-left text-xs font-semibold truncate flex-1"
                                  style={{ color: 'var(--text-main)' }}
                                >
                                  {chap.title}
                                </button>
                                <button
                                  onClick={() => {
                                    setActiveChapterId(chap.id);
                                    setActiveSceneIndex(0);
                                    onSelectTab('STUDIO');
                                    setChapterMenuOpen(false);
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 shrink-0"
                                >
                                  去码字 →
                                </button>
                              </div>
                              {chapScenes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {chapScenes.map((sc, scIdx) => {
                                    const isCurrentScene =
                                      isCurrentChap && sc.id === activeScene?.id;
                                    return (
                                      <button
                                        key={sc.id}
                                        onClick={() => {
                                          setActiveChapterId(chap.id);
                                          setActiveSceneIndex(scIdx);
                                          setChapterMenuOpen(false);
                                        }}
                                        className={`text-[10px] px-1.5 py-0.5 rounded transition-colors ${
                                          isCurrentScene
                                            ? 'bg-amber-500 text-white font-semibold'
                                            : 'bg-black/10 hover:bg-amber-500/15'
                                        }`}
                                        style={!isCurrentScene ? { color: 'var(--text-muted)' } : undefined}
                                      >
                                        🎬 第{sc.sceneIndex}场: {sc.sceneGoal.slice(0, 10)}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Center: IDE-Style Multi-Tab Workspace Dock */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 px-1">
        {openTabs.map((tabId) => {
          const { item } = getNavItemMeta(tabId);
          if (!item) return null;
          const isCurrent = tabId === activeTab;
          const isPinned = pinnedTabs.includes(tabId);

          return (
            <div
              key={tabId}
              onClick={() => onSelectTab(tabId)}
              className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs cursor-pointer transition-all shrink-0 border ${
                isCurrent
                  ? 'bg-indigo-600/15 border-indigo-500/40 font-bold shadow-xs'
                  : 'border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
              style={{
                color: isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
              }}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate max-w-[120px]">{item.title}</span>

              {/* Pin/Unpin or Close Tab */}
              <div className="flex items-center gap-0.5 ml-0.5">
                <button
                  onClick={(e) => onTogglePinTab(tabId, e)}
                  title={isPinned ? '取消固定此工作区标签' : '固定此标签到工作栏'}
                  className={`p-0.5 rounded transition-opacity ${
                    isPinned
                      ? 'opacity-70 hover:opacity-100 text-indigo-400'
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

      {/* Right: Live Token Compression & Anti-Hallucination Quick-Jump Pill */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onSelectTab('MEMORY_GUARD')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
            activeTab === 'MEMORY_GUARD'
              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
              : memoryTelemetry.hallucinationCount > 0
              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25 hover:bg-emerald-500/20'
          }`}
          title="点击进入【四级记忆与防幻觉护栏】：查看 L4-L1 记忆裁剪明细、管理铁律事实锚点、一键熔断清洗大模型幻觉"
        >
          {memoryTelemetry.hallucinationCount > 0 ? (
            <>
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 animate-pulse" />
              <span className="hidden lg:inline">
                拦截 {memoryTelemetry.hallucinationCount} 处幻觉 · 省 {memoryTelemetry.savingRatio}% Token
              </span>
              <span className="lg:hidden">
                {memoryTelemetry.hallucinationCount} 幻觉 · -{memoryTelemetry.savingRatio}%
              </span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden lg:inline">
                记忆压缩 -{memoryTelemetry.savingRatio}% ({memoryTelemetry.savedTokens}t) · 0幻觉
              </span>
              <span className="lg:hidden">-{memoryTelemetry.savingRatio}% Token</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
