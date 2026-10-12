// ==============================================================================
// 当前在场相关人物全息透视抽屉 (In-Scene Dramatis Personae Inspector)
// 实时检视当前章节/场景中登场人物的生理负伤、心理博弈、隐藏动机、对主角好感度与底牌装备
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Users,
  Shield,
  Heart,
  Sword,
  Sparkles,
  Key,
  X,
  Smile,
  Frown,
  ChevronRight,
  Eye,
  Crosshair,
  BadgeAlert,
} from 'lucide-react';

interface InSceneCharactersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InSceneCharactersDrawer: React.FC<InSceneCharactersDrawerProps> = ({
  isOpen,
  onClose,
}) => {
  const { novel, activeChapter, activeScene, characters } = useNovel();

  // 默认模拟当前出场角色数据
  const [inSceneCharacters, setInSceneCharacters] = useState([
    {
      id: 'char-001',
      name: '林越 (主角 POV)',
      role: 'PROTAGONIST',
      health: '左肩透骨钉洞穿（重伤中）',
      healthStatus: 'INJURED',
      combatPower: '筑基后期（战力损耗四成）',
      emotion: '冷酷隐忍、高度警觉、蓄力反击',
      relationshipWithPov: '本人（视角主控）',
      agendaInScene: '依托古溶洞狭窄地形周旋，利用青铜残片反杀夜枭，夺取其储物袋中的续脉丹。',
      hiddenSecrets: '怀中的青铜残片正在发烫吸收血气，第二道古篆即将觉醒。',
      inventory: ['裂纹青钢剑', '青铜残片', '三枚回春散残渣'],
    },
    {
      id: 'char-003',
      name: '夜枭 (魔门宿敌)',
      role: 'ANTAGONIST',
      health: '气血翻涌，轻微真元反噬',
      healthStatus: 'HEALTHY',
      combatPower: '筑基巅峰半步金丹',
      emotion: '残忍嗜血、轻蔑戏谑、贪婪急躁',
      relationshipWithPov: '生死宿敌 (杀意值: 100/100)',
      agendaInScene: '折磨林越逼问青铜残片秘密，封锁洞口防止苏青瑶增援赶到。',
      hiddenSecrets: '背后魔门大长老许诺，只要带回残片即可赐予凝婴造化丹。',
      inventory: ['嗜血白骨飞刃×3', '万毒噬心幡 (残破)', '三阶遁地符'],
    },
    {
      id: 'char-002',
      name: '苏青瑶 (暗中策应)',
      role: 'SUPPORTING',
      health: '全盛无伤，疾驰赶路消耗真元',
      healthStatus: 'HEALTHY',
      combatPower: '筑基中期（太虚天灵剑体）',
      emotion: '心急如焚、果决决绝',
      relationshipWithPov: '同门知己，暗生情愫 (亲密度: 85/100)',
      agendaInScene: '正在峡谷外御剑破除魔宗迷魂血阵，预计一刻钟后杀入溶洞驰援。',
      hiddenSecrets: '私自从父亲掌教密室偷出了一枚九转保命符箓。',
      inventory: ['青霜灵剑', '太虚传讯灵玉', '九转保命符'],
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md sm:max-w-lg p-4 sm:p-6 shadow-2xl flex flex-col border-l animate-in slide-in-from-right duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      {/* 顶部标题与关闭 */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5">
          <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
            <Users className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-bold text-base" style={{ color: 'var(--text-main)' }}>
              当前在场人物全息透视仪
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              检视在场人物即时状态、生理伤势、心理博弈与秘密动机
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-stone-500/10 transition"
          style={{ color: 'var(--text-muted)' }}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* 角色卡列表 */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {inSceneCharacters.map((c) => (
          <div key={c.id} className="literary-card p-4.5">
            {/* 名字与角色标签 */}
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                  {c.name}
                </span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    c.role === 'PROTAGONIST'
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                      : c.role === 'ANTAGONIST'
                      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
                      : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {c.role}
                </span>
              </div>

              <span className="text-xs font-mono font-medium text-stone-500">
                {c.combatPower}
              </span>
            </div>

            {/* 生理与情绪 */}
            <div className="space-y-2 text-xs mb-3">
              <div className="flex items-start gap-2">
                <Heart className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-main)' }}>生理伤情：</strong> {c.health}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <Smile className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" />
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-main)' }}>心理博弈：</strong> {c.emotion}
                </span>
              </div>

              <div className="flex items-start gap-2">
                <Eye className="w-3.5 h-3.5 text-purple-500 mt-0.5 shrink-0" />
                <span style={{ color: 'var(--text-muted)' }}>
                  <strong style={{ color: 'var(--text-main)' }}>对主角关系：</strong> {c.relationshipWithPov}
                </span>
              </div>
            </div>

            {/* 房间/场景即时动机 */}
            <div className="p-2.5 rounded-xl bg-stone-500/5 border text-xs mb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="font-bold text-[11px] text-amber-600 dark:text-amber-400 mb-0.5">
                🎯 场景即时战术动机
              </div>
              <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                {c.agendaInScene}
              </p>
            </div>

            {/* 暗藏底牌与秘密 */}
            <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs">
              <div className="font-bold text-[11px] text-purple-600 dark:text-purple-400 mb-0.5">
                🗝️ 暗藏秘密与法宝底牌
              </div>
              <p className="leading-relaxed text-purple-950 dark:text-purple-200">
                {c.hiddenSecrets}
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.inventory.map((item, idx) => (
                  <span key={idx} className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-700 dark:text-purple-300">
                    🎒 {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部信息 */}
      <div className="pt-3 border-t text-xs font-mono text-center" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        切换章节分镜时自动按登场表动态刷新
      </div>
    </div>
  );
};
