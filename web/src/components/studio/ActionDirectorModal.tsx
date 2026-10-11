// ==============================================================================
// 高燃战斗与动作场面分镜编排器 (Combat & Action Choreography Director)
// 专为玄幻修真、科幻斗法与冷兵器对抗定制，把控战力边界、攻防博弈与动态感官声色
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Swords, Shield, Zap, Sparkles, X, ChevronRight } from 'lucide-react';

interface ActionDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertToEditor: (text: string) => void;
}

export const ActionDirectorModal: React.FC<ActionDirectorModalProps> = ({
  isOpen,
  onClose,
  onInsertToEditor,
}) => {
  const { characters } = useNovel();
  const [combatantA, setCombatantA] = useState(characters[0]?.name || '林越');
  const [realmA, setRealmA] = useState('通玄境巅峰');
  const [combatantB, setCombatantB] = useState('幽冥宗长老');
  const [realmB, setRealmB] = useState('元婴境初期 (压制性强敌)');
  const [terrain, setTerrain] = useState('坍塌的地渊幽冥古殿 · 碎石与残破阵柱');
  const [coreClimax, setCoreClimax] = useState('绝境诱敌，以身为饵贴地滑步反杀');

  const [choreography, setChoreography] = useState<{
    tacticalSetup: string;
    beats: { beat: number; phase: string; detail: string }[];
    sensoryElements: string[];
    generatedProse: string;
  } | null>(null);

  const handleGenerateChoreography = () => {
    setChoreography({
      tacticalSetup: `在【${terrain}】狭窄受限的环境下，境界存在差距（${realmA} 对垒 ${realmB}），不可正面对撼真元，必须以身法灵动与地形遮蔽诱敌深入。`,
      beats: [
        {
          beat: 1,
          phase: '威压试探与空间压迫',
          detail: `${combatantB}拂袖引动狂暴气浪，整座古殿残砖轰鸣飞卷，封死${combatantA}所有闪避退路。`,
        },
        {
          beat: 2,
          phase: '受创诱敌与真元伪溃',
          detail: `${combatantA}假意真气不继，硬受半记掌风余威，嘴角溢出黑红血丝，身躯顺势撞上残破阵柱。`,
        },
        {
          beat: 3,
          phase: '破空逆转与致命一击',
          detail: `借扬尘与石柱坍塌死角，${coreClimax}！残剑出鞘声如龙吟裂帛，直贯敌手真元死穴！`,
        },
      ],
      sensoryElements: [
        '碎石在真元撕扯下化为齑粉的刺鼻焦味',
        '剑锋破空带起的森冷寒芒与音爆呼啸',
        '跌落尘土时骨骼不堪重负的细密脆响',
      ],
      generatedProse: `轰——！\n\n殿堂倾颓，狂暴的气浪如重锤般当胸砸落。林越喉头微甜，整个人重重砸在残破石柱之上，碎石如雨溅落。那长老冷笑逼近，掌风凌厉如钩，已直扣林越面门！\n\n就在这一瞬，林越眼眸深处寒芒骤亮。他并未抵挡，反而借着倒撞之势贴地疾滑，腰间锈迹斑驳的残剑不知何时已悄然递出。那是自绝境死角刺出的惊艳一剑，剑尖带起凄厉凄绝的龙吟，迎着漫天尘埃，直贯长老真元薄弱之穴！`,
    });
  };

  const handleApply = () => {
    if (choreography) {
      onInsertToEditor(`\n\n${choreography.generatedProse}\n\n`);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-rose-500" />
            <div>
              <h3 className="font-bold text-lg font-literary-serif">高燃战斗与动作场面分镜编排器</h3>
              <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                拒绝无脑战力互轰，构建有地形利用、战术反转与动作节奏的电影级分镜
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold block mb-1 font-literary-sans">主角/攻方与境界</label>
              <input
                type="text"
                value={`${combatantA} (${realmA})`}
                onChange={(e) => setCombatantA(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>
            <div>
              <label className="text-xs font-bold block mb-1 font-literary-sans">敌手与战力境界</label>
              <input
                type="text"
                value={`${combatantB} (${realmB})`}
                onChange={(e) => setCombatantB(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold block mb-1 font-literary-sans">战场地形与环境阻碍</label>
            <input
              type="text"
              value={terrain}
              onChange={(e) => setTerrain(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
            />
          </div>

          <div>
            <label className="text-xs font-bold block mb-1 font-literary-sans">破局杀招 / 逆转动作</label>
            <input
              type="text"
              value={coreClimax}
              onChange={(e) => setCoreClimax(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border text-xs outline-none"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
            />
          </div>

          <div className="text-right">
            <button
              onClick={handleGenerateChoreography}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white transition hover:opacity-90"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              编排动作攻防三段分镜
            </button>
          </div>

          {choreography && (
            <div className="p-4 rounded-xl border space-y-3 mt-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}>
              <div>
                <span className="text-xs font-bold block text-amber-500 mb-1">战术布局机制：</span>
                <p className="text-xs opacity-80 font-literary-sans leading-relaxed">{choreography.tacticalSetup}</p>
              </div>

              <div>
                <span className="text-xs font-bold block mb-1">动作分镜攻防节拍：</span>
                <div className="space-y-1.5 font-literary-sans">
                  {choreography.beats.map((b) => (
                    <div key={b.beat} className="p-2 rounded-lg border text-xs" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                      <span className="font-bold text-rose-500 mr-2">第 {b.beat} 节拍 [{b.phase}]:</span>
                      <span>{b.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <span className="text-xs font-bold block mb-1 text-emerald-600">工笔正文成稿试览：</span>
                <p className="text-xs font-literary-serif leading-relaxed p-2.5 rounded-lg border whitespace-pre-line" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                  {choreography.generatedProse}
                </p>
              </div>

              <div className="text-right pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  onClick={handleApply}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white transition hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  合入战斗工笔正文至当前幕
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
