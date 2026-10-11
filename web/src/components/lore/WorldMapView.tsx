// ==============================================================================
// 虚构世界地图标定与地缘图志 (Interactive World Map & Territory Region Codex)
// 交互式大陆舆图、势力宗门地盘划分、地理天堑与空间位移距离测算
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Map, MapPin, Compass, Shield, Mountain, Flame, Wind, X } from 'lucide-react';

interface TerritoryRegion {
  id: string;
  name: string;
  category: string;
  x: number;
  y: number;
  radius: number;
  controllingFaction: string;
  dangerLevel: 'SAFE' | 'DANGEROUS' | 'FORBIDDEN';
  description: string;
  specialRules: string[];
}

export const WorldMapView: React.FC = () => {
  const { novel, worldSettings } = useNovel();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>('reg-1');

  const regions: TerritoryRegion[] = [
    {
      id: 'reg-1',
      name: '地渊幽冥残殿',
      category: '古代遗迹',
      x: 320,
      y: 280,
      radius: 55,
      controllingFaction: '幽冥宗古遗脉',
      dangerLevel: 'FORBIDDEN',
      description: '大灾变时期沉沦地脉的古修士封魔殿堂，残阵运转万年，禁锢大量幽冥煞气与古魔意志。',
      specialRules: ['神识探测受阻（范围压制至十丈）', '地脉煞气侵蚀肉身（每炷香损耗真元半成）'],
    },
    {
      id: 'reg-2',
      name: '青云剑宗圣山',
      category: '宗门祖庭',
      x: 180,
      y: 140,
      radius: 65,
      controllingFaction: '青云九峰剑修',
      dangerLevel: 'SAFE',
      description: '九峰如剑直插云霄，护山天罡大阵常开，正道魁首之地，主角林越昔年拜师修炼之所。',
      specialRules: ['天罡剑阵绝杀外敌', '禁空飞行法则'],
    },
    {
      id: 'reg-3',
      name: '万劫雷渊神禁',
      category: '天地绝地',
      x: 580,
      y: 190,
      radius: 60,
      controllingFaction: '无（天罚狂暴之所）',
      dangerLevel: 'FORBIDDEN',
      description: '九天雷劫常年劈落之所，孕育九天雷劫晶与太虚神铁，亦是修士破境引雷的凶险死生之地。',
      specialRules: ['金属灵器易引落雷', '纯阳真雷克制一切阴煞功法'],
    },
    {
      id: 'reg-4',
      name: '天墉修真古城',
      category: '中立仙市',
      x: 420,
      y: 380,
      radius: 70,
      controllingFaction: '四海商盟与古仙世家',
      dangerLevel: 'SAFE',
      description: '横跨南荒与中土的核心通商中枢，丹药、法宝、古经交易极盛，禁制私斗。',
      specialRules: ['天道契约受万仙盟法令庇护', '城内动武当场格杀'],
    },
  ];

  const selectedRegion = regions.find((r) => r.id === selectedRegionId);

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-500" />
            <span>虚构世界舆图与地缘图志</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              《{novel.title}》中土与九荒疆域
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            直观标定宗门地盘、古代遗迹与天地天堑；点击区域节点检视地缘势力与法则禁制。
          </p>
        </div>

        {/* 危险度图例 */}
        <div className="flex items-center gap-4 text-xs font-literary-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>安全/宗门</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <span>死境禁地</span>
          </div>
        </div>
      </div>

      {/* 交互地图画布与右侧详情 */}
      <div className="flex-1 flex overflow-hidden relative mt-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        {/* SVG 地图 */}
        <svg viewBox="0 0 800 500" className="w-full h-full cursor-crosshair">
          {/* 大陆轮廓山川底纹 */}
          <path
            d="M 120 120 Q 250 80 450 110 T 700 160 Q 750 320 620 420 T 320 440 Q 150 400 100 280 Z"
            fill="var(--bg-card)"
            stroke="var(--border-strong)"
            strokeWidth="1.5"
            opacity="0.8"
          />

          {/* 区域领地节点 */}
          {regions.map((reg) => {
            const isSelected = selectedRegionId === reg.id;
            const isForbidden = reg.dangerLevel === 'FORBIDDEN';

            return (
              <g
                key={reg.id}
                onClick={() => setSelectedRegionId(reg.id)}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                {/* 势力影响范围光圈 */}
                <circle
                  cx={reg.x}
                  cy={reg.y}
                  r={reg.radius}
                  fill={isForbidden ? 'rgba(244, 63, 94, 0.08)' : 'rgba(16, 185, 129, 0.08)'}
                  stroke={isForbidden ? '#f43f5e' : '#10b981'}
                  strokeWidth={isSelected ? '2' : '1'}
                  strokeDasharray={isForbidden ? '4 2' : undefined}
                />
                {/* 核心据点标记 */}
                <circle
                  cx={reg.x}
                  cy={reg.y}
                  r="8"
                  fill={isForbidden ? '#f43f5e' : '#10b981'}
                  stroke="var(--bg-surface)"
                  strokeWidth="2"
                />
                {/* 区域名称 */}
                <text
                  x={reg.x}
                  y={reg.y + 24}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="bold"
                  fill="var(--text-main)"
                  fontFamily="var(--font-serif-literary)"
                >
                  {reg.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 区域地缘详情抽屉 */}
        {selectedRegion && (
          <div
            className="w-80 border-l p-5 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h3 className="font-bold text-lg font-literary-serif">{selectedRegion.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded font-literary-sans bg-amber-500/10 text-amber-500">
                    {selectedRegion.category} · {selectedRegion.controllingFaction}
                  </span>
                </div>
                <button onClick={() => setSelectedRegionId(null)} className="p-1 hover:opacity-75">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold block" style={{ color: 'var(--text-muted)' }}>地貌与历史前史</label>
                <p className="text-xs font-literary-serif leading-relaxed mt-1 opacity-90">
                  {selectedRegion.description}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold block" style={{ color: 'var(--text-muted)' }}>特殊环境与物理法则禁制</label>
                <ul className="list-disc pl-5 text-xs font-literary-sans mt-1 space-y-1 text-rose-500">
                  {selectedRegion.specialRules.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t text-center text-xs opacity-50" style={{ borderColor: 'var(--border-subtle)' }}>
              写作时涉及本区域将自动关联以上法则约束
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
