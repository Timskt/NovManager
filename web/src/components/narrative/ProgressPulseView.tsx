// ==============================================================================
// 全书宏观脉搏与当前进度总结看板 (Progress Executive Pulse Board)
// 卷章宏观字数推进速率、戏剧节拍密度分布、读者付费留存风险预测、下一里程碑阻碍诊断
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Activity,
  TrendingUp,
  Target,
  BarChart3,
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  ArrowRight,
  Flame,
  Zap,
} from 'lucide-react';

interface ProgressPulseViewProps {
  onNavigateTab?: (tab: any) => void;
}

export const ProgressPulseView: React.FC<ProgressPulseViewProps> = ({ onNavigateTab }) => {
  const { novel } = useNovel();

  const totalWords = novel.currentWordCount || 68420;
  const targetWords = novel.targetWordCount || 1000000;
  const percentage = Math.min(100, Math.round((totalWords / targetWords) * 100));

  // 戏剧节拍完成度
  const dramaticBeats = [
    { name: '引子与世界观锚定 (Hook & Anchor)', progress: 100, status: 'DONE', note: '灭门惨剧与青铜残片现世' },
    { name: '初露锋芒·宗门试炼 (Inciting Incident)', progress: 100, status: 'DONE', note: '拜入太虚剑宗，外门大比夺魁' },
    { name: '暗流涌动·魔宗伏击 (Rising Action)', progress: 85, status: 'IN_PROGRESS', note: '坠星崖遭魔修死士透骨钉穿肩' },
    { name: '绝地求生·古殿破境 (Climax Crisis)', progress: 50, status: 'IN_PROGRESS', note: '溶洞参悟逆向古篆，绝境突破筑基' },
    { name: '名震南瞻·卷末余波 (Resolution & Cliffhanger)', progress: 15, status: 'PENDING', note: '斩杀夜枭，苏青瑶暗送秋波，魔潮初现' },
  ];

  // 商业付费留存健康度
  const retentionRiskSignals = [
    {
      metric: '黄金前三章紧凑度',
      score: 94,
      level: 'HEALTHY',
      desc: '前三章即抛出核心生死危机与金手指残片，无冗余水文。',
    },
    {
      metric: '第3000字至第1万字破局速度',
      score: 88,
      level: 'HEALTHY',
      desc: '主角外门大比反打耳光节拍精准，爽点释放及时。',
    },
    {
      metric: '第10章后压抑度警报 (Depression Index)',
      score: 72,
      level: 'ATTENTION',
      desc: '第11-12章主角重伤逃亡篇幅略长，需在第13章立即释放大高潮与收获战利品。',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="studio-container">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Activity className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                创作全书宏观脉搏与进度执行摘要
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full border border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/5 font-mono font-medium">
                Pulse Board
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              商业级长篇小说宏观健康度诊断：字数产出节律、戏剧三幕演进、读者弃读风险预测与下一里程碑阻碍拆解。
            </p>
          </div>
        </div>

        {/* 核心字数与体量推进大卡片 */}
        <div className="literary-card p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                全书目标完结字数推进
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-mono" style={{ color: 'var(--text-main)' }}>
                  {totalWords.toLocaleString()}
                </span>
                <span className="text-sm font-mono text-stone-400">
                  / {targetWords.toLocaleString()} 字 ({percentage}%)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-mono font-bold">
                当前节奏：每天 4,500 字稳定推进
              </div>
            </div>
          </div>

          {/* 大进度条 */}
          <div className="w-full h-3 rounded-full bg-stone-500/15 overflow-hidden relative">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-amber-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.max(4, percentage)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs font-mono text-stone-400 mt-2.5">
            <span>第一卷：潜龙出渊 (已完成 85%)</span>
            <span>预计全卷完结剩余字数: 12,000 字</span>
          </div>
        </div>

        {/* 两列布局：左侧核心戏剧节拍分布 + 右侧读者留存与商业体检 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          {/* 左侧：戏剧节拍推进 (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="literary-card p-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
                    第一卷关键戏剧节拍完成度 (Dramatic Beat Milestones)
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  三幕式闭环
                </span>
              </div>

              <div className="space-y-4">
                {dramaticBeats.map((beat, i) => (
                  <div key={i} className="p-4 rounded-xl border bg-stone-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold bg-blue-500/10 text-blue-600">
                          {i + 1}
                        </span>
                        <h4 className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                          {beat.name}
                        </h4>
                      </div>
                      <span className="text-xs font-mono font-bold" style={{ color: beat.progress === 100 ? '#10b981' : '#f59e0b' }}>
                        {beat.progress}%
                      </span>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-stone-500/15 overflow-hidden mb-2">
                      <div
                        className={`h-full transition-all duration-300 ${
                          beat.progress === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                        }`}
                        style={{ width: `${beat.progress}%` }}
                      />
                    </div>

                    <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      💡 核心事件概要：{beat.note}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：商业留存与读者心理预警 (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="literary-card p-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
                    读者心理心流与付费留存体检
                  </h3>
                </div>
              </div>

              <div className="space-y-4">
                {retentionRiskSignals.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border bg-stone-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                        {item.metric}
                      </span>
                      <span
                        className={`text-xs font-mono px-2 py-0.5 rounded-full font-bold ${
                          item.level === 'HEALTHY'
                            ? 'bg-emerald-500/15 text-emerald-600'
                            : 'bg-amber-500/15 text-amber-600'
                        }`}
                      >
                        {item.score} 分
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {item.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* 下一步写作指导 */}
              <div className="mt-6 p-4.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-300 mb-1.5">
                  <Flame className="w-4 h-4" />
                  当前正文执笔最高优先级建议
                </div>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                  第13章决战幕必须在 1500 字内结束林越与夜枭的缠斗，以青铜残片逆行古篆斩破血海大阵，完成战利品收缴，立即进入卷末大收尾！
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
