// ==============================================================================
// 副本与主线战役演进趋势看板 (Dungeon & Arc Progression Trajectory)
// 面向商业类型网文的大比、秘境、遗迹、斩魔战役演进跟踪：五阶段节拍、生还战损率与机缘掉落经济学
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Compass,
  MapPin,
  ShieldAlert,
  Flame,
  Award,
  ChevronRight,
  Sparkles,
  Zap,
  TrendingUp,
  Coins,
  Skull,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export interface DungeonArcItem {
  id: string;
  name: string;
  location: string;
  stage: 'ENTRANCE' | 'EXPLORATION' | 'MID_CHAMBER' | 'BOSS_BATTLE' | 'EXTRACTION';
  dangerLevel: number; // 1-10
  survivalRate: number; // 0.0 - 1.0
  milestones: { name: string; status: 'DONE' | 'CURRENT' | 'PENDING' }[];
  lootEconomy: {
    gained: string[];
    foreshadowed: string[];
  };
  narrativeTension: number;
}

export const DungeonArcTrajectoryView: React.FC = () => {
  const { novel } = useNovel();

  const [dungeons, setDungeons] = useState<DungeonArcItem[]>([
    {
      id: 'arc-1',
      name: '万妖天窟·九层浮屠试炼',
      location: '十万大山深处·天窟绝境',
      stage: 'MID_CHAMBER',
      dangerLevel: 8,
      survivalRate: 0.35,
      narrativeTension: 88,
      milestones: [
        { name: '进入天窟外围瘴气沼泽，斩杀巡山蛇妖', status: 'DONE' },
        { name: '破译浮屠古石碑禁制，触发地动陷阱', status: 'DONE' },
        { name: '内殿遭遇金甲天尸与魔宗伏击（当前章节）', status: 'CURRENT' },
        { name: '夺取天道真灵残卷，逼退夜枭魔刃', status: 'PENDING' },
        { name: '绝命逃离天窟坍塌，重创突破筑基', status: 'PENDING' },
      ],
      lootEconomy: {
        gained: ['三千灵石', '玄阴幽水一瓶', '万年菩提子'],
        foreshadowed: ['天道真灵残卷（核心金手指进阶）', '金甲天尸古纳戒'],
      },
    },
    {
      id: 'arc-2',
      name: '九霄封神台·天骄问鼎之战',
      location: '天穹之巅·上古仙庭遗址',
      stage: 'ENTRANCE',
      dangerLevel: 9,
      survivalRate: 0.15,
      narrativeTension: 75,
      milestones: [
        { name: '九大仙宗首席天骄聚首，立生死血契', status: 'CURRENT' },
        { name: '登天九万九千级问心石阶试炼', status: 'PENDING' },
        { name: '太虚幻境斩杀前世心魔劫', status: 'PENDING' },
        { name: '天命法相决战巅峰，问鼎天榜第一', status: 'PENDING' },
        { name: '引动九霄雷劫，天地变色', status: 'PENDING' },
      ],
      lootEconomy: {
        gained: [],
        foreshadowed: ['仙庭封神榜残页', '太苍真龙精血', '纯阳悟道蒲团'],
      },
    },
  ]);

  const [activeDungeonId, setActiveDungeonId] = useState<string>('arc-1');
  const activeDungeon = dungeons.find((d) => d.id === activeDungeonId) || dungeons[0];

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="studio-container">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                <Compass className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                副本与主线战役演进趋势仪
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full border border-orange-500/30 text-orange-700 dark:text-orange-300 bg-orange-500/5 font-mono font-medium">
                Dungeon & Arc Trajectory
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              商业类型小说必不可少的“秘境/遗迹/试炼”节拍与博弈推演：五阶段节奏门槛、战损率与机缘掉落经济学监控。
            </p>
          </div>

          <div className="flex items-center gap-2">
            {dungeons.map((d) => (
              <button
                key={d.id}
                onClick={() => setActiveDungeonId(d.id)}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
                  d.id === activeDungeonId
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'border hover:bg-stone-500/10'
                }`}
                style={{
                  borderColor: d.id === activeDungeonId ? 'transparent' : 'var(--border-subtle)',
                  color: d.id === activeDungeonId ? '#ffffff' : 'var(--text-main)',
                }}
              >
                {d.name.split('·')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 副本核心状态面板 (Banner Card) */}
        <div className="literary-card p-6 sm:p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-orange-600 dark:text-orange-400 mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>{activeDungeon.location}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif" style={{ color: 'var(--text-main)' }}>
                {activeDungeon.name}
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 font-mono font-bold border border-red-500/30">
                危险等级: ★{activeDungeon.dangerLevel}/10
              </span>
              <span className="text-xs px-3 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-400 font-mono font-bold border border-amber-500/30">
                修真者生还率: {Math.round(activeDungeon.survivalRate * 100)}%
              </span>
            </div>
          </div>

          {/* 阶段五步时序条 (5-Stage Visual Stepper) */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {[
              { id: 'ENTRANCE', label: '1. 入场试探', desc: '瘴气外围与斥候交锋' },
              { id: 'EXPLORATION', label: '2. 深入博弈', desc: '机关陷阱与同门勾心' },
              { id: 'MID_CHAMBER', label: '3. 内殿夺宝', desc: '核心遭遇战与负伤逆境' },
              { id: 'BOSS_BATTLE', label: '4. 绝境决战', desc: 'Boss底牌尽出与斩杀' },
              { id: 'EXTRACTION', label: '5. 坍塌撤离', desc: '战利品清点与余波' },
            ].map((step, idx) => {
              const isCurrent = activeDungeon.stage === step.id;
              return (
                <div
                  key={step.id}
                  className={`p-3.5 rounded-xl border text-center transition ${
                    isCurrent
                      ? 'border-orange-500 bg-orange-500/10 shadow-sm'
                      : 'border-transparent bg-stone-500/5'
                  }`}
                >
                  <div className={`text-xs font-bold mb-1 ${isCurrent ? 'text-orange-600 dark:text-orange-400' : 'text-stone-500'}`}>
                    {step.label}
                  </div>
                  <div className="text-[11px] text-stone-400">
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 下半部分：左侧里程碑推进 + 右侧机缘掉落经济学 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧：里程碑推进流水 (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="literary-card p-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
                    战役里程碑节拍推进表
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  当前处于核心冲突高潮
                </span>
              </div>

              <div className="space-y-3.5">
                {activeDungeon.milestones.map((m, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border flex items-center justify-between ${
                      m.status === 'CURRENT'
                        ? 'border-orange-500/50 bg-orange-500/5'
                        : 'border-stone-500/15 bg-stone-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold bg-stone-500/10">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-main)' }}>
                        {m.name}
                      </span>
                    </div>

                    <div>
                      {m.status === 'DONE' && (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 className="w-4 h-4" /> 已破局
                        </span>
                      )}
                      {m.status === 'CURRENT' && (
                        <span className="flex items-center gap-1 text-xs text-orange-600 font-bold animate-pulse">
                          <Zap className="w-4 h-4" /> 当前章节焦点
                        </span>
                      )}
                      {m.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-xs text-stone-400 font-mono">
                          <Clock className="w-3.5 h-3.5" /> 待触发
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 右侧：机缘掉落经济学与战利品清单 (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="literary-card p-6">
              <div className="flex items-center justify-between pb-3 mb-5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
                    战役收益与机缘掉落经济学
                  </h3>
                </div>
              </div>

              {/* 已获取战利品 */}
              <div className="mb-5">
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" /> 已收入囊中机缘 (Gained)
                </div>
                <div className="space-y-2">
                  {activeDungeon.lootEconomy.gained.length > 0 ? (
                    activeDungeon.lootEconomy.gained.map((g, i) => (
                      <div key={i} className="p-2.5 rounded-lg border bg-stone-500/5 text-xs font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}>
                        💎 {g}
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-stone-400 italic">尚无掉落</div>
                  )}
                </div>
              </div>

              {/* 待解封伏笔机缘 */}
              <div>
                <div className="text-xs font-bold text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> 即将解封重磅奇遇 (Foreshadowed)
                </div>
                <div className="space-y-2">
                  {activeDungeon.lootEconomy.foreshadowed.map((f, i) => (
                    <div key={i} className="p-2.5 rounded-lg border border-purple-500/25 bg-purple-500/5 text-xs font-mono text-purple-950 dark:text-purple-200 font-medium">
                      ✨ {f}
                    </div>
                  ))}
                </div>
              </div>

              {/* 商业防崩警报 */}
              <div className="mt-6 p-4 rounded-xl border border-stone-500/20 bg-stone-500/5 text-xs">
                <div className="font-bold text-amber-600 mb-1">
                  ⚖️ 机缘战力平衡法则
                </div>
                <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  本次天道真灵残卷出世后，林越战力将突破至筑基巅峰，需同步提高魔渊反派追杀等级，避免过早数值膨胀导致剧情战力崩坏。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
