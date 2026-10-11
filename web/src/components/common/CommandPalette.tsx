// ==============================================================================
// 全局指挥官穿梭栏 (Cmd+K Global Command Palette & Omnibar)
// 毫秒级跳转全书章节、登场人物、世界观法则、伏笔追踪及快捷工具指令
// ==============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNovel } from '../../context/NovelContext';
import { useTheme, AppTheme } from '../../context/ThemeContext';
import { NovelSearchEngine, SearchResultItem } from '../../lib/searchIndex';
import {
  Search,
  BookOpen,
  Users,
  Sparkles,
  Radar,
  Palette,
  FileDown,
  Activity,
  X,
  Compass,
  ArrowRight,
  Flame,
} from 'lucide-react';
import type { NavTab } from '../Header';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onOpenZen?: () => void;
  onOpenExport?: () => void;
  onOpenGraph?: () => void;
  onOpenTension?: () => void;
  onOpenSelfIteration?: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
  onOpenZen,
  onOpenExport,
  onOpenGraph,
  onOpenTension,
  onOpenSelfIteration,
}) => {
  const { novel, volumes, characters, worldSettings, foreshadowings, setActiveChapterId, setActiveSceneIndex } = useNovel();
  const { settings, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // 快捷搜索结果
  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    return NovelSearchEngine.searchAll(query, volumes, characters, worldSettings, foreshadowings);
  }, [query, volumes, characters, worldSettings, foreshadowings]);

  // 内置快捷指令项
  const quickActions = useMemo(() => {
    return [
      {
        id: 'action-zen',
        title: '🧘 进入作家禅定专注模式 (Zen Mode)',
        category: '沉浸工具',
        icon: Sparkles,
        action: () => onOpenZen?.(),
      },
      {
        id: 'action-evolution',
        title: '🧠 智能体质量自评与反思进化舱 (Self-Iteration)',
        category: '自我迭代',
        icon: Activity,
        action: () => onOpenSelfIteration?.(),
      },
      {
        id: 'action-tension',
        title: '📈 剧情张力与节奏心电图分析 (Tension Curve)',
        category: '分析研判',
        icon: Activity,
        action: () => onOpenTension?.(),
      },
      {
        id: 'action-graph',
        title: '🕸️ 人物关系羁绊拓扑星图 (Relationship Graph)',
        category: '角色研判',
        icon: Users,
        action: () => onOpenGraph?.(),
      },
      {
        id: 'action-export',
        title: '📦 出版级排版导出工坊 (EPUB / PDF / TXT)',
        category: '发布出版',
        icon: FileDown,
        action: () => onOpenExport?.(),
      },
      {
        id: 'action-theme-ink',
        title: '📜 切换主题：古意宣纸 (Ink & Rice Paper)',
        category: '视觉美学',
        icon: Palette,
        action: () => setTheme('ink'),
      },
      {
        id: 'action-theme-obsidian',
        title: '🌌 切换主题：黑曜冷萃 (Obsidian Dark)',
        category: '视觉美学',
        icon: Palette,
        action: () => setTheme('obsidian'),
      },
      {
        id: 'action-theme-celadon',
        title: '🍵 切换主题：秘色青釉 (Celadon Mist)',
        category: '视觉美学',
        icon: Palette,
        action: () => setTheme('celadon'),
      },
      {
        id: 'action-theme-pure',
        title: '🏛️ 切换主题：北欧素雅 (Pure Alabaster)',
        category: '视觉美学',
        icon: Palette,
        action: () => setTheme('pure'),
      },
    ];
  }, [onOpenZen, onOpenSelfIteration, onOpenTension, onOpenGraph, onOpenExport, setTheme]);

  const filteredActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const q = query.toLowerCase();
    return quickActions.filter((a) => a.title.toLowerCase().includes(q) || a.category.toLowerCase().includes(q));
  }, [query, quickActions]);

  const handleSelectResult = (item: SearchResultItem) => {
    if (item.jumpTarget.tab) {
      onNavigateTab(item.jumpTarget.tab as NavTab);
    }
    if (item.jumpTarget.chapterId) {
      setActiveChapterId(item.jumpTarget.chapterId);
    }
    if (item.jumpTarget.sceneIndex) {
      setActiveSceneIndex(item.jumpTarget.sceneIndex);
    }
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[75vh]"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        {/* 输入框 */}
        <div className="flex items-center px-4 py-3.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <Search className="w-5 h-5 mr-3" style={{ color: 'var(--text-muted)' }} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="搜索章节正文、角色卡、设定、伏笔，或输入指令..."
            className="flex-1 bg-transparent border-none outline-none text-base font-literary-serif placeholder:font-literary-sans"
            style={{ color: 'var(--text-main)' }}
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:opacity-75 transition"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 搜索结果与快捷指令列表 */}
        <div className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* 全书检索结果 */}
          {searchResults.length > 0 && (
            <div>
              <div className="text-xs font-semibold px-3 py-1 font-literary-sans" style={{ color: 'var(--text-muted)' }}>
                全书检索结果 ({searchResults.length})
              </div>
              <div className="mt-1 space-y-1">
                {searchResults.map((res) => (
                  <div
                    key={res.id}
                    onClick={() => handleSelectResult(res)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition hover:scale-99.5"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="min-w-0 flex-1 mr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded font-literary-sans font-medium"
                          style={{
                            backgroundColor: 'var(--accent-surface)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          {res.badge}
                        </span>
                        <span className="font-semibold text-sm truncate font-literary-serif">
                          {res.title}
                        </span>
                      </div>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {res.snippet}
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--text-faint)' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 快捷指令 */}
          <div>
            <div className="text-xs font-semibold px-3 py-1 font-literary-sans" style={{ color: 'var(--text-muted)' }}>
              {searchResults.length > 0 ? '快捷动作' : '常用指令与工作台导航'}
            </div>
            <div className="mt-1 space-y-1">
              {filteredActions.map((act) => {
                const Icon = act.icon;
                return (
                  <div
                    key={act.id}
                    onClick={() => {
                      act.action();
                      onClose();
                    }}
                    className="flex items-center justify-between px-3 py-2 rounded-xl cursor-pointer transition hover:opacity-85"
                    style={{ backgroundColor: 'var(--bg-card)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                      <span className="text-sm font-literary-sans font-medium">{act.title}</span>
                    </div>
                    <span className="text-xs font-literary-sans" style={{ color: 'var(--text-faint)' }}>
                      {act.category}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部按键提示 */}
        <div
          className="px-4 py-2 text-xs flex items-center justify-between border-t font-literary-sans"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <span>ESC 退出 · 点击直接穿梭</span>
          <span>按 Cmd+K / Ctrl+K 随时唤出</span>
        </div>
      </div>
    </div>
  );
};
