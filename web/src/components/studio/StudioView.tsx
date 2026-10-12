// ==============================================================================
// 创作工作台总视图 (Studio Workspace View)
// 组装：左侧结构上下文 + 中间正文编辑器与Diff + 右侧Agent协同舱
// 支持：左中右三区域平滑无级拖动调节宽度、双击重置默认、一键折叠与本地持久化
// ==============================================================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ContextDrawer } from './ContextDrawer';
import { ManuscriptEditor } from './ManuscriptEditor';
import { AgentDock } from './AgentDock';
import { PlotCanvasView } from '../canvas/PlotCanvasView';
import { FullOutlineModal } from './FullOutlineModal';
import { useNovel } from '../../context/NovelContext';
import { X, ChevronLeft, ChevronRight, Compass, Feather, GitFork } from 'lucide-react';
import type { NavTab } from '../Header';

const DEFAULT_LEFT_WIDTH = 320;
const DEFAULT_RIGHT_WIDTH = 384;
const MIN_LEFT_WIDTH = 220;
const MAX_LEFT_WIDTH = 520;
const MIN_RIGHT_WIDTH = 260;
const MAX_RIGHT_WIDTH = 640;
const MIN_CENTER_WIDTH = 380;

interface StudioViewProps {
  onNavigateTab?: (tab: NavTab) => void;
  defaultStudioTab?: 'editor' | 'canvas';
}

export const StudioView: React.FC<StudioViewProps> = ({
  onNavigateTab,
  defaultStudioTab,
}) => {
  const { activeChapter, setActiveChapterId, setActiveSceneIndex } = useNovel();
  const [mobileDrawer, setMobileDrawer] = useState<'none' | 'context' | 'agent'>('none');
  const [isFullOutlineModalOpen, setIsFullOutlineModalOpen] = useState(false);

  const [studioTab, setStudioTab] = useState<'editor' | 'canvas'>(() => {
    if (defaultStudioTab) return defaultStudioTab;
    try {
      return (
        (localStorage.getItem('studio_active_tab') as 'editor' | 'canvas') ||
        'editor'
      );
    } catch {
      return 'editor';
    }
  });

  const switchStudioTab = (tab: 'editor' | 'canvas') => {
    setStudioTab(tab);
    try {
      localStorage.setItem('studio_active_tab', tab);
    } catch {}
  };

  // 左侧面板宽度与折叠状态
  const [leftWidth, setLeftWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('studio_left_panel_width');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= MIN_LEFT_WIDTH && val <= MAX_LEFT_WIDTH) {
          return val;
        }
      }
    } catch {}
    return DEFAULT_LEFT_WIDTH;
  });
  const [isLeftCollapsed, setIsLeftCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studio_left_panel_collapsed') === 'true';
    } catch {}
    return false;
  });

  // 右侧面板宽度与折叠状态
  const [rightWidth, setRightWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('studio_right_panel_width');
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= MIN_RIGHT_WIDTH && val <= MAX_RIGHT_WIDTH) {
          return val;
        }
      }
    } catch {}
    return DEFAULT_RIGHT_WIDTH;
  });
  const [isRightCollapsed, setIsRightCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('studio_right_panel_collapsed') === 'true';
    } catch {}
    return false;
  });

  // 正在拖拽状态
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);

  const leftWidthRef = useRef(leftWidth);
  leftWidthRef.current = leftWidth;
  const rightWidthRef = useRef(rightWidth);
  rightWidthRef.current = rightWidth;

  // 切换左侧折叠
  const toggleLeftCollapse = useCallback(() => {
    setIsLeftCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('studio_left_panel_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // 切换右侧折叠
  const toggleRightCollapse = useCallback(() => {
    setIsRightCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('studio_right_panel_collapsed', String(next));
      } catch {}
      return next;
    });
  }, []);

  // 重置左侧面板宽度
  const resetLeftWidth = useCallback(() => {
    setLeftWidth(DEFAULT_LEFT_WIDTH);
    setIsLeftCollapsed(false);
    try {
      localStorage.setItem('studio_left_panel_width', String(DEFAULT_LEFT_WIDTH));
      localStorage.setItem('studio_left_panel_collapsed', 'false');
    } catch {}
  }, []);

  // 重置右侧面板宽度
  const resetRightWidth = useCallback(() => {
    setRightWidth(DEFAULT_RIGHT_WIDTH);
    setIsRightCollapsed(false);
    try {
      localStorage.setItem('studio_right_panel_width', String(DEFAULT_RIGHT_WIDTH));
      localStorage.setItem('studio_right_panel_collapsed', 'false');
    } catch {}
  }, []);

  // 拖动左侧分割条
  useEffect(() => {
    if (!isDraggingLeft) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentRight = isRightCollapsed ? 0 : rightWidthRef.current;
      const maxLeft = Math.max(MIN_LEFT_WIDTH, window.innerWidth - currentRight - MIN_CENTER_WIDTH);
      const clamped = Math.max(MIN_LEFT_WIDTH, Math.min(Math.min(MAX_LEFT_WIDTH, maxLeft), e.clientX));
      setLeftWidth(clamped);
      if (isLeftCollapsed && clamped >= MIN_LEFT_WIDTH) {
        setIsLeftCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingLeft(false);
      try {
        localStorage.setItem('studio_left_panel_width', String(leftWidthRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingLeft, isRightCollapsed, isLeftCollapsed]);

  // 拖动右侧分割条
  useEffect(() => {
    if (!isDraggingRight) return;

    const handleMouseMove = (e: MouseEvent) => {
      const currentLeft = isLeftCollapsed ? 0 : leftWidthRef.current;
      const maxRight = Math.max(MIN_RIGHT_WIDTH, window.innerWidth - currentLeft - MIN_CENTER_WIDTH);
      const calculated = window.innerWidth - e.clientX;
      const clamped = Math.max(MIN_RIGHT_WIDTH, Math.min(Math.min(MAX_RIGHT_WIDTH, maxRight), calculated));
      setRightWidth(clamped);
      if (isRightCollapsed && clamped >= MIN_RIGHT_WIDTH) {
        setIsRightCollapsed(false);
      }
    };

    const handleMouseUp = () => {
      setIsDraggingRight(false);
      try {
        localStorage.setItem('studio_right_panel_width', String(rightWidthRef.current));
      } catch {}
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingRight, isLeftCollapsed, isRightCollapsed]);

  return (
    <div className="flex-1 flex overflow-hidden relative select-auto">
      {/* 拖拽全局蒙层：防止在高速拖拽时光标越过 iframe 或选中编辑器文本 */}
      {(isDraggingLeft || isDraggingRight) && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none" />
      )}

      {/* 桌面端左侧抽屉（支持宽度拖动调节与收起） */}
      {!isLeftCollapsed && (
        <div
          className="hidden md:flex flex-shrink-0 relative"
          style={{ width: `${leftWidth}px` }}
        >
          <ContextDrawer
            onNavigateTab={onNavigateTab}
            onSwitchStudioTab={switchStudioTab}
            currentStudioTab={studioTab}
            onOpenFullOutlineModal={() => setIsFullOutlineModalOpen(true)}
          />
        </div>
      )}

      {/* 左侧面板拖动分割条 (Splitter) */}
      <div className="hidden md:flex items-center relative flex-shrink-0 group z-30">
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingLeft(true);
          }}
          onDoubleClick={resetLeftWidth}
          title="按住拖拽调节左侧宽度，双击恢复默认"
          className={`w-2.5 h-full -mx-1 flex items-center justify-center cursor-col-resize select-none transition-colors duration-150 ${
            isDraggingLeft
              ? 'bg-indigo-600/80 shadow-md shadow-indigo-600/40'
              : 'hover:bg-indigo-500/30'
          }`}
        >
          {/* 悬停微把手 */}
          <div
            className={`w-0.5 h-10 rounded-full transition-colors ${
              isDraggingLeft
                ? 'bg-white'
                : 'bg-slate-700/60 group-hover:bg-indigo-300'
            }`}
          />
        </div>

        {/* 快速折叠/展开按钮 */}
        <button
          onClick={toggleLeftCollapse}
          title={isLeftCollapsed ? '展开左侧大纲面板' : '折叠左侧面板'}
          className="absolute top-4 -right-2.5 w-5 h-7 rounded border flex items-center justify-center shadow-lg transition z-40 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-muted)',
          }}
        >
          {isLeftCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5" />
          ) : (
            <ChevronLeft className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* 当左侧完全折叠时展示的极简悬浮唤起条 */}
      {isLeftCollapsed && (
        <button
          onClick={toggleLeftCollapse}
          title="展开左侧大纲分镜与场景上下文"
          className="hidden md:flex flex-col items-center justify-center w-7 border-r transition-all z-20 py-4 gap-2 flex-shrink-0 cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <Compass className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-[10px] [writing-mode:vertical-rl] tracking-wider font-medium">
            大纲分镜
          </span>
        </button>
      )}

      {/* 中间主工作区：支持【✍️ 正文撰写】与【✨ 剧情推演幕布】Tab 切换 */}
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ backgroundColor: 'var(--bg-canvas)' }}>
        {/* 顶部工作台全局模式切换与导航条 */}
        <div
          className="border-b px-3 sm:px-5 py-2 flex items-center justify-between gap-3 shrink-0 z-20 transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {/* 手机端打开左侧抽屉按钮 */}
            <button
              onClick={() => setMobileDrawer('context')}
              className="md:hidden p-1.5 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
              title="打开大纲分镜目录"
            >
              <Compass className="w-4 h-4 text-indigo-400" />
            </button>

            {/* 架构定位指示 */}
            <div className="flex items-center gap-1.5 text-xs truncate">
              <button
                onClick={() => {
                  if (isLeftCollapsed) {
                    setIsLeftCollapsed(false);
                  }
                  setIsFullOutlineModalOpen(true);
                }}
                className="font-medium flex items-center gap-1 hover:underline shrink-0 cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
                title="打开全景大纲分镜架构总览"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>大纲架构</span>
              </button>
              <span style={{ color: 'var(--text-faint)' }}>/</span>
              <span className="font-semibold truncate" style={{ color: 'var(--text-main)' }}>
                第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title || '未命名'}
              </span>
              {activeChapter?.status && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-medium hidden sm:inline"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-muted)',
                  }}
                >
                  {activeChapter.status === 'PUBLISHED'
                    ? '已发布'
                    : activeChapter.status === 'REVIEWED'
                    ? '已精修'
                    : activeChapter.status === 'DRAFTED'
                    ? '草稿'
                    : activeChapter.status === 'SCENED'
                    ? '已定分镜'
                    : '构思中'}
                </span>
              )}
            </div>
          </div>

          {/* 核心双 Tab 切换：【✍️ 正文撰写】 vs 【✨ 剧情推演幕布】 */}
          <div
            className="flex items-center p-0.5 rounded-lg border shrink-0"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              onClick={() => switchStudioTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                studioTab === 'editor'
                  ? 'shadow-xs text-white'
                  : 'hover:opacity-80'
              }`}
              style={
                studioTab === 'editor'
                  ? { backgroundColor: 'var(--accent-primary)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <Feather className="w-3.5 h-3.5" />
              <span>正文撰写</span>
            </button>
            <button
              onClick={() => switchStudioTab('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                studioTab === 'canvas'
                  ? 'shadow-xs text-white'
                  : 'hover:opacity-80'
              }`}
              style={
                studioTab === 'canvas'
                  ? { backgroundColor: 'var(--accent-primary)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <GitFork className="w-3.5 h-3.5 text-amber-300" />
              <span>剧情推演幕布</span>
            </button>
          </div>
        </div>

        {/* 区域内容 */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          {studioTab === 'editor' ? (
            <ManuscriptEditor
              onNavigateTab={onNavigateTab}
              onOpenContext={() => setMobileDrawer('context')}
              onOpenAgent={() => setMobileDrawer('agent')}
              onSwitchToCanvas={() => switchStudioTab('canvas')}
            />
          ) : (
            <PlotCanvasView
              embeddedInStudio
              onSwitchToEditor={() => switchStudioTab('editor')}
              onJumpToStudio={(chapId, scIdx) => {
                if (chapId) setActiveChapterId(chapId);
                if (scIdx) setActiveSceneIndex(scIdx);
                switchStudioTab('editor');
              }}
              onJumpToOutline={() => {
                if (isLeftCollapsed) {
                  setIsLeftCollapsed(false);
                }
                setIsFullOutlineModalOpen(true);
              }}
            />
          )}
        </div>
      </div>

      {/* 当右侧完全折叠时展示的极简悬浮唤起条 */}
      {isRightCollapsed && (
        <button
          onClick={toggleRightCollapse}
          title="展开 AI 参谋与协同舱"
          className="hidden md:flex flex-col items-center justify-center w-6 border-l transition-all z-20 py-4 gap-2 flex-shrink-0 cursor-pointer hover:opacity-90"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
          }}
        >
          <ChevronLeft className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
          <span className="text-[10px] [writing-mode:vertical-rl] tracking-wider font-medium">
            AI 参谋
          </span>
        </button>
      )}

      {/* 右侧面板拖动分割条 (Splitter) */}
      <div className="hidden md:flex items-center relative flex-shrink-0 group z-30">
        {/* 快速折叠/展开按钮 */}
        <button
          onClick={toggleRightCollapse}
          title={isRightCollapsed ? '展开右侧 AI 参谋' : '折叠右侧面板'}
          className="absolute top-4 -left-2.5 w-5 h-7 rounded border flex items-center justify-center shadow-lg transition z-40 opacity-0 group-hover:opacity-100 focus:opacity-100 hover:opacity-100"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-muted)',
          }}
        >
          {isRightCollapsed ? (
            <ChevronLeft className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>

        <div
          onMouseDown={(e) => {
            e.preventDefault();
            setIsDraggingRight(true);
          }}
          onDoubleClick={resetRightWidth}
          title="按住拖拽调节右侧宽度，双击恢复默认"
          className={`w-2.5 h-full -mx-1 flex items-center justify-center cursor-col-resize select-none transition-colors duration-150 ${
            isDraggingRight
              ? 'bg-indigo-600/80 shadow-md shadow-indigo-600/40'
              : 'hover:bg-indigo-500/30'
          }`}
        >
          {/* 悬停微把手 */}
          <div
            className={`w-0.5 h-10 rounded-full transition-colors ${
              isDraggingRight
                ? 'bg-white'
                : 'bg-slate-700/60 group-hover:bg-indigo-300'
            }`}
          />
        </div>
      </div>

      {/* 桌面端常驻右侧 Agent 舱（支持宽度拖动调节与收起） */}
      {!isRightCollapsed && (
        <div
          className="hidden md:flex flex-shrink-0 relative"
          style={{ width: `${rightWidth}px` }}
        >
          <AgentDock />
        </div>
      )}

      {/* 移动端抽屉：场景结构上下文 */}
      {mobileDrawer === 'context' && (
        <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200">
          <div
            className="w-[88vw] max-w-sm h-full flex flex-col shadow-2xl border-r animate-in slide-in-from-left duration-200"
            style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                📋 场景大纲与角色状态
              </span>
              <button
                onClick={() => setMobileDrawer('none')}
                className="p-1 rounded-lg transition"
                style={{ color: 'var(--text-muted)' }}
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <ContextDrawer
                isMobile
                onNavigateTab={onNavigateTab}
                onSwitchStudioTab={switchStudioTab}
                currentStudioTab={studioTab}
                onOpenFullOutlineModal={() => setIsFullOutlineModalOpen(true)}
              />
            </div>
          </div>
          <div className="flex-1" onClick={() => setMobileDrawer('none')} />
        </div>
      )}

      {/* 移动端抽屉：Agent 专家舱 */}
      {mobileDrawer === 'agent' && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200">
          <div className="flex-1" onClick={() => setMobileDrawer('none')} />
          <div
            className="w-[90vw] max-w-md h-full flex flex-col shadow-2xl border-l animate-in slide-in-from-right duration-200"
            style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center justify-between px-4 py-3 border-b"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-sm font-bold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                🤖 Agent 协同舱与稽查
              </span>
              <button
                onClick={() => setMobileDrawer('none')}
                className="p-1 rounded-lg transition"
                style={{ color: 'var(--text-muted)' }}
                title="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AgentDock isMobile />
            </div>
          </div>
        </div>
      )}

      {/* 全局全景大纲架构总览弹窗 */}
      <FullOutlineModal
        isOpen={isFullOutlineModalOpen}
        onClose={() => setIsFullOutlineModalOpen(false)}
        onJumpToStudio={(chapId, scIdx) => {
          if (chapId) setActiveChapterId(chapId);
          if (scIdx) setActiveSceneIndex(scIdx);
          switchStudioTab('editor');
          setIsFullOutlineModalOpen(false);
        }}
        onJumpToCanvas={(chapId) => {
          if (chapId) setActiveChapterId(chapId);
          switchStudioTab('canvas');
          setIsFullOutlineModalOpen(false);
        }}
      />
    </div>
  );
};

