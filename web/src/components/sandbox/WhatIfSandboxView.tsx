// ==============================================================================
// 平行剧情推演沙盒 (Multi-Timeline "What-If" Story Sandbox)
// 允许作者从任意关键抉择节点分叉“如果当时”的平行宇宙，试错探索，绝不污染正文主线
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { GitBranch, Sparkles, Check, Play, Plus, Trash2, ArrowRight } from 'lucide-react';

interface WhatIfBranch {
  id: string;
  divergenceChapterIndex: number;
  hypothesis: string;
  summary: string;
  characterCasualties: string;
  newForeshadowing: string;
  previewProse: string;
}

export const WhatIfSandboxView: React.FC = () => {
  const { novel, volumes, activeChapter } = useNovel();
  const [branches, setBranches] = useState<WhatIfBranch[]>([
    {
      id: 'branch-1',
      divergenceChapterIndex: 13,
      hypothesis: '若林越在地渊古殿未曾拔出残剑，而是选择与苏青瑶封印洞口直接遁走',
      summary: '避开了与幽冥宗强敌的血战，但错失了太虚残经核心线索，导致第14章需潜入宗门藏经阁另寻他路。',
      characterCasualties: '无人重伤，但苏青瑶对林越的戒备心未曾彻底消除。',
      newForeshadowing: '古殿残阵因未被激活，将在数月后引发地脉更大规模异动。',
      previewProse: '林越止住脚步，深吸一口气，按住了腰间颤鸣的剑柄。“此地不宜久留，退！”他低喝一声，苏青瑶微怔，随即二人并肩自裂隙疾退。身后幽暗古殿深处，那一缕古老叹息悄然隐没。',
    },
    {
      id: 'branch-2',
      divergenceChapterIndex: 13,
      hypothesis: '若苏青瑶在古殿被魔煞侵蚀，当场暴走成为敌手',
      summary: '林越被迫在残剑反杀强敌的同时，施展禁术压制苏青瑶体内心魔，付出精血大损的惨重代价。',
      characterCasualties: '林越经脉微裂，战力跌落半阶；苏青瑶重度昏迷。',
      newForeshadowing: '苏青瑶身世隐藏的魔门血脉秘密提前揭开一角。',
      previewProse: '“青瑶，醒醒！”林越厉声喝道。然而那双素来清澈如秋水的眸子，此刻已尽染漆黑魔煞，秋泓剑锋带起刺骨森寒，已直逼林越咽喉！',
    },
  ]);

  const [newHypothesis, setNewHypothesis] = useState('');

  const handleCreateBranch = () => {
    if (!newHypothesis.trim()) return;
    const newBr: WhatIfBranch = {
      id: `branch-${Date.now()}`,
      divergenceChapterIndex: activeChapter?.chapterIndex || 13,
      hypothesis: newHypothesis,
      summary: '平行时间线展开：因果律扰动产生新的连锁反应，主角采取了完全不同的策略。',
      characterCasualties: '命运轨迹发生偏转，盟友关系重新洗牌。',
      newForeshadowing: '埋下平行暗线。',
      previewProse: '狂风骤起，命运的齿轮在这一瞬滑向了截然不同的轨迹……',
    };
    setBranches([newBr, ...branches]);
    setNewHypothesis('');
  };

  const handleDelete = (id: string) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
  };

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-500" />
            <span>平行剧情推演沙盒 (What-If Sandbox)</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              {branches.length} 条推演分支
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            推演是沙盒，主线是工程。在这里自由推演“如果当时”的蝴蝶效应，满意后再决定是否合入主线。
          </p>
        </div>
      </div>

      {/* 创建新推演假说栏 */}
      <div className="mt-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <label className="text-xs font-bold block mb-1 font-literary-sans">
          提出新的“如果当时”分叉剧情假设：
        </label>
        <div className="flex gap-3">
          <input
            type="text"
            value={newHypothesis}
            onChange={(e) => setNewHypothesis(e.target.value)}
            placeholder="例如：若主角在第13章未曾重创长老，而是与其达成了秘密交易..."
            className="flex-1 px-3 py-2 rounded-xl border text-xs outline-none"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
          />
          <button
            onClick={handleCreateBranch}
            disabled={!newHypothesis.trim()}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>创建平行推演沙盒</span>
          </button>
        </div>
      </div>

      {/* 平行时间线卡片阵列 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {branches.map((br) => (
          <div
            key={br.id}
            className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold bg-amber-500/10 text-amber-500">
                  自第 {br.divergenceChapterIndex} 章分叉
                </span>
                <button
                  onClick={() => handleDelete(br.id)}
                  className="p-1 text-slate-400 hover:text-rose-500 transition"
                  title="删除该推演分支"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <h4 className="font-bold text-sm font-literary-serif">{br.hypothesis}</h4>

              <div className="text-xs space-y-1.5 font-literary-sans">
                <p><span className="font-semibold text-indigo-400">走向推演：</span>{br.summary}</p>
                <p><span className="font-semibold text-rose-500">代价与命运：</span>{br.characterCasualties}</p>
                <p><span className="font-semibold text-amber-500">牵动暗线：</span>{br.newForeshadowing}</p>
              </div>

              {/* 工笔试览 */}
              <div
                className="p-3 rounded-xl border text-xs font-literary-serif leading-relaxed"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-[10px] block opacity-50 mb-1">沙盒试写正文片段：</span>
                {br.previewProse}
              </div>
            </div>

            <div className="pt-3 border-t flex justify-end" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] opacity-60">沙盒推演仅保留在本地草案中，不影响 Git 主线工程</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
