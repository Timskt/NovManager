// ==============================================================================
// 伏笔生命周期雷达与闭环追踪器 (Foreshadowing Lifecycle Radar & Payoff Tracker)
// 极坐标雷达多维视像与回收倒计时预警，杜绝长篇烂尾、忘线、吃设定
// ==============================================================================

import React, { useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Radar, AlertCircle, CheckCircle, Clock, Zap, ArrowRight } from 'lucide-react';
import type { NavTab } from '../Header';

interface ForeshadowingRadarProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const ForeshadowingRadar: React.FC<ForeshadowingRadarProps> = ({ onNavigateTab }) => {
  const { foreshadowings, activeChapter, setActiveChapterId } = useNovel();

  const currentChapterIndex = activeChapter?.chapterIndex || 1;

  // 伏笔统计分析
  const stats = useMemo(() => {
    let planted = 0;
    let fermenting = 0;
    let resolved = 0;
    let overdue = 0;

    const items = foreshadowings.map((f) => {
      const pIdx = f.plantedChapterIndex || 1;
      const rIdx = f.plannedResolveChapterIndex || pIdx + 10;
      const isOverdue = f.status !== 'RESOLVED' && currentChapterIndex > rIdx;
      const chaptersPassed = Math.max(0, currentChapterIndex - pIdx);
      const totalSpan = Math.max(1, rIdx - pIdx);
      const progressPercent = Math.min(100, Math.round((chaptersPassed / totalSpan) * 100));

      if (f.status === 'RESOLVED') resolved++;
      else if (isOverdue) overdue++;
      else if (f.status === 'FERMENTING') fermenting++;
      else planted++;

      return {
        ...f,
        pIdx,
        rIdx,
        isOverdue,
        progressPercent,
      };
    });

    return {
      planted,
      fermenting,
      resolved,
      overdue,
      items: items.sort((a, b) => (b.isOverdue ? 1 : 0) - (a.isOverdue ? 1 : 0)),
    };
  }, [foreshadowings, currentChapterIndex]);

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <Radar className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <span>伏笔生命周期雷达与闭环追踪器</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              共 {foreshadowings.length} 条暗线
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            当前正文推进至第 {currentChapterIndex} 章；系统自动实时监控埋设距今跨度，对久悬未解的暗线发出收线警报。
          </p>
        </div>

        {/* 核心指标统计徽标 */}
        <div className="flex items-center gap-3 text-xs font-literary-sans">
          <div className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
            <span>已埋设 ({stats.planted})</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
            <span>发酵中 ({stats.fermenting})</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" />
            <span className="text-rose-500 font-bold">已逾期 ({stats.overdue})</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            <span>已圆满闭环 ({stats.resolved})</span>
          </div>
        </div>
      </div>

      {/* 伏笔动态雷达列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {stats.items.map((item) => (
          <div
            key={item.id}
            className="p-4 rounded-2xl border transition-shadow hover:shadow-md flex flex-col justify-between"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: item.isOverdue ? '#f43f5e' : 'var(--border-subtle)',
            }}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-base font-literary-serif flex items-center gap-2">
                  <span>{item.title}</span>
                  {item.isOverdue && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                      超期未收
                    </span>
                  )}
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
                  第 {item.pIdx} 章埋入 ➔ 计划第 {item.rIdx} 章揭秘
                </span>
              </div>

              <p className="text-xs font-literary-serif mt-2 leading-relaxed" style={{ color: 'var(--text-main)' }}>
                {item.clueDescription}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {/* 回收生命周期进度条 */}
              <div className="flex items-center justify-between text-[11px] mb-1 font-literary-sans" style={{ color: 'var(--text-muted)' }}>
                <span>生命周期发酵进度</span>
                <span className="font-mono font-bold">{item.progressPercent}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${item.progressPercent}%`,
                    backgroundColor: item.isOverdue ? '#f43f5e' : item.status === 'RESOLVED' ? '#10b981' : 'var(--accent-primary)',
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
