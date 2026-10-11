// ==============================================================================
// 作家字数冲刺与创作能量看板 (Daily Writing Velocity & Productivity Heatmap)
// 类似 GitHub 提交热力图，记录全年生机盎然的文字沉淀、创作速度 WPM 与专注里程碑
// ==============================================================================

import React, { useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Flame, Trophy, Zap, Calendar, TrendingUp } from 'lucide-react';

export const ProductivityHeatmap: React.FC = () => {
  const { novel } = useNovel();

  // 模拟过去 16 周的每日字数贡献热力数据
  const heatmapWeeks = useMemo(() => {
    const weeks: { date: string; words: number; level: number }[][] = [];
    const today = new Date();

    for (let w = 15; w >= 0; w--) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const past = new Date(today);
        past.setDate(today.getDate() - (w * 7 + (6 - d)));
        // 伪随机字数，但保证近期有高频产出
        const seed = (past.getDate() * 37 + past.getMonth() * 19) % 100;
        let words = 0;
        let level = 0;
        if (seed > 40) {
          words = 1200 + seed * 25;
          level = words > 3000 ? 4 : words > 2000 ? 3 : words > 1000 ? 2 : 1;
        }
        days.push({
          date: past.toISOString().split('T')[0],
          words,
          level,
        });
      }
      weeks.push(days);
    }
    return weeks;
  }, []);

  const totalWordsWritten = novel.currentWordCount;
  const currentStreak = 14; // 连续 14 天笔耕不辍
  const averageDailyWords = 2840;

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-500" />
            <span>作家字数冲刺与创作能量看板</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              连续创作 {currentStreak} 天
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            每一颗字皆是心血与世界的沉淀；可视化您的字数产出节律与持久专注力。
          </p>
        </div>
      </div>

      {/* 核心统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-xs opacity-75 font-literary-sans">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>全书累计字数</span>
          </div>
          <div className="text-2xl font-bold font-mono mt-1" style={{ color: 'var(--accent-primary)' }}>
            {totalWordsWritten.toLocaleString()} 字
          </div>
          <div className="text-[11px] opacity-60 mt-1">目标达成率 {Math.round((totalWordsWritten / novel.targetWordCount) * 100)}%</div>
        </div>

        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-xs opacity-75 font-literary-sans">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>当前连续写作连击</span>
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-rose-500">
            {currentStreak} 天
          </div>
          <div className="text-[11px] opacity-60 mt-1">日均码字约 {averageDailyWords} 字</div>
        </div>

        <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 text-xs opacity-75 font-literary-sans">
            <Zap className="w-4 h-4 text-indigo-500" />
            <span>心流写作速度</span>
          </div>
          <div className="text-2xl font-bold font-mono mt-1 text-indigo-500">
            48 字 / 分钟
          </div>
          <div className="text-[11px] opacity-60 mt-1">处于小说作家顶级心流区间</div>
        </div>
      </div>

      {/* GitHub 风格 16 周热力图 */}
      <div className="mt-6 p-5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <h3 className="text-sm font-bold font-literary-serif mb-3">近 16 周字数沉淀轨迹 (Writing Contribution Grid)</h3>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-1.5">
            {heatmapWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1.5">
                {week.map((day, dIdx) => {
                  const bg =
                    day.level === 4
                      ? 'bg-amber-600'
                      : day.level === 3
                      ? 'bg-amber-500'
                      : day.level === 2
                      ? 'bg-amber-400/70'
                      : day.level === 1
                      ? 'bg-amber-300/40'
                      : 'bg-black/5 dark:bg-white/5';
                  return (
                    <div
                      key={dIdx}
                      title={`${day.date}: 写了 ${day.words} 字`}
                      className={`w-3.5 h-3.5 rounded-xs transition-transform hover:scale-125 cursor-pointer ${bg}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs mt-3 opacity-60 font-literary-sans">
          <span>少</span>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-xs bg-black/5 dark:bg-white/5" />
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-300/40" />
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-400/70" />
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-500" />
            <span className="w-2.5 h-2.5 rounded-xs bg-amber-600" />
          </div>
          <span>多 (3000+ 字)</span>
        </div>
      </div>
    </div>
  );
};
