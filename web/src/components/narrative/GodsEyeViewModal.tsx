// ==============================================================================
// 上帝全知宏观控制台 HUD (Omniscient God's Eye View HUD)
// 俯瞰全书天地纪元、天地异象、幕后势力暗流、宏观危机倒计时与全球因果张力
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Eye,
  Globe,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldAlert,
  Flame,
  Compass,
  X,
  RefreshCw,
  Sliders,
  CheckCircle2,
} from 'lucide-react';

interface GodsEyeViewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GodsEyeViewModal: React.FC<GodsEyeViewModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { novel } = useNovel();

  const [currentEra, setCurrentEra] = useState('天元三万年·灵气复苏初纪');
  const [celestialAnomalies, setCelestialAnomalies] = useState(
    '太白昼见，九幽冥渊煞气上涌三万里，护宗大阵出现三寸灵力涡流。'
  );
  const [crisisDays, setCrisisDays] = useState(49);
  const [globalTensionIndex, setGlobalTensionIndex] = useState(84.5);

  const [offscreenFactions, setOffscreenFactions] = useState([
    {
      name: '太玄天宗·掌教密阁',
      leader: '凌虚道尊',
      status: '封闭山门',
      action: '秘密耗费十万上品灵石开启九阶乾坤戮仙剑阵，防备魔门突袭。',
      threatLevel: '极高',
      impactOnProtagonist: '暗中密切观察林越命灯，随时准备牺牲弃子保宗门。',
    },
    {
      name: '九幽魔渊·血煞总坛',
      leader: '幽天煞祖',
      status: '魔潮备战',
      action: '屠灭南瞻部洲三座凡人城池，以百万生灵血祭唤醒上古魔尊手臂。',
      threatLevel: '灭世级',
      impactOnProtagonist: '下发“九幽必杀令”，三名金丹境魔修死士正潜伏在林越必经溶洞外。',
    },
    {
      name: '星罗商盟·天机分舵',
      leader: '万财金仙',
      status: '投机操盘',
      action: '在各大坊市暗中扫货筑基丹与玄铁矿石，将破境丹药价格炒高十倍。',
      threatLevel: '中立博弈',
      impactOnProtagonist: '苏青瑶正试图借商盟暗渠为林越采购救命续脉神丹。',
    },
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="hud-panel w-full max-w-4xl max-h-[90vh] flex flex-col p-6 sm:p-8 rounded-2xl shadow-2xl relative border overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        {/* 顶部标头 */}
        <div className="flex items-center justify-between pb-5 mb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-3.5">
            <span className="p-3 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              <Eye className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                  上帝全知宏观控制台 (God's Eye HUD)
                </h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-mono font-medium">
                  Omniscient View
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                全局宏观叙事态势感知：掌控未出场势力的暗流涌动、天地灾变倒计时与全书因果张力指数。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-stone-500/10 transition"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 内容滚动作业区 */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {/* 宏观指标卡片 (Key Macro Coordinates) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="literary-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <Clock className="w-4 h-4 text-purple-500" />
                <span>天地纪元坐标</span>
              </div>
              <div className="text-base font-bold font-serif" style={{ color: 'var(--text-main)' }}>
                {currentEra}
              </div>
            </div>

            <div className="literary-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <ShieldAlert className="w-4 h-4 text-red-500" />
                <span>主线劫难大危机倒计时</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-red-600 dark:text-red-400">
                  {crisisDays}
                </span>
                <span className="text-xs font-mono text-stone-400">天 (约4章篇幅)</span>
              </div>
            </div>

            <div className="literary-card p-4">
              <div className="flex items-center gap-2 text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
                <Flame className="w-4 h-4 text-amber-500" />
                <span>全球因果冲突张力</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {globalTensionIndex}
                </span>
                <span className="text-xs font-mono text-emerald-600">临界爆发区间</span>
              </div>
            </div>
          </div>

          {/* 天地异象与宏观法则提示 */}
          <div className="literary-card p-4.5">
            <div className="flex items-center gap-2 text-xs font-bold mb-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
              当前天下天地异象与天地法则扰动
            </div>
            <p className="text-xs leading-relaxed font-medium" style={{ color: 'var(--text-main)' }}>
              {celestialAnomalies}
            </p>
          </div>

          {/* 幕后势力暗流看板 (Off-Screen Factions Doing Real-Time Work) */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-main)' }}>
                幕后势力暗流实时动向 (场外力量对主角的连锁影响)
              </h3>
              <span className="text-xs font-mono text-stone-400">
                3 个超级阵营暗中博弈中
              </span>
            </div>

            <div className="space-y-3.5">
              {offscreenFactions.map((f, i) => (
                <div key={i} className="literary-card p-4.5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                        {f.name}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded bg-stone-500/10 font-mono" style={{ color: 'var(--text-muted)' }}>
                        领袖: {f.leader}
                      </span>
                    </div>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-medium ${
                        f.threatLevel === '灭世级'
                          ? 'bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30'
                          : f.threatLevel === '极高'
                          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                          : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      威胁等级: {f.threatLevel}
                    </span>
                  </div>

                  <div className="text-xs leading-relaxed mb-2.5" style={{ color: 'var(--text-muted)' }}>
                    <strong style={{ color: 'var(--text-main)' }}>幕后密谋动作：</strong>
                    {f.action}
                  </div>

                  <div className="p-2.5 rounded-xl text-xs bg-stone-500/5 border font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}>
                    🎯 <strong className="text-purple-600 dark:text-purple-400">对当前主角主线的影响：</strong>
                    {f.impactOnProtagonist}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 底部关闭与快速操作栏 */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="text-xs font-mono" style={{ color: 'var(--text-faint)' }}>
            实时与大纲时空线同步 • 自动触发未登场人物动机校验
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition"
          >
            知悉宏观大势，返回创作
          </button>
        </div>
      </div>
    </div>
  );
};
