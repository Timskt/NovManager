// ==============================================================================
// 交互式人物关系羁绊拓扑星图 (Interactive Character Relation Force Graph)
// 纯 SVG 算法力导向节点渲染，呈现主角、反派、盟友间的好感度与多维人际网
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Character, CharacterRelation } from '../../types/novel';
import { Users, Heart, Shield, Swords, Info, X } from 'lucide-react';

interface NodePosition {
  id: string;
  name: string;
  roleType: string;
  x: number;
  y: number;
  gender: string;
}

export const CharacterRelationGraph: React.FC = () => {
  const { characters, characterRelations, novel } = useNovel();
  const [selectedCharId, setSelectedCharId] = useState<string | null>(null);
  const [hoveredRel, setHoveredRel] = useState<CharacterRelation | null>(null);

  const width = 800;
  const height = 520;
  const centerX = width / 2;
  const centerY = height / 2;

  // 将角色节点布置在椭圆拓扑网络上，主角居中，其余角色环绕
  const nodes = useMemo(() => {
    const list: NodePosition[] = [];
    const protagonists = characters.filter((c) => c.roleType === 'PROTAGONIST');
    const others = characters.filter((c) => c.roleType !== 'PROTAGONIST');

    // 主角置于中央偏左或偏右
    protagonists.forEach((p, idx) => {
      const offsetX = (idx - (protagonists.length - 1) / 2) * 120;
      list.push({
        id: p.id,
        name: p.name,
        roleType: p.roleType,
        gender: p.gender,
        x: centerX + offsetX,
        y: centerY,
      });
    });

    // 其余角色按环状均布
    const radiusX = 280;
    const radiusY = 190;
    const count = others.length;
    others.forEach((o, idx) => {
      const angle = (idx / Math.max(1, count)) * 2 * Math.PI - Math.PI / 2;
      list.push({
        id: o.id,
        name: o.name,
        roleType: o.roleType,
        gender: o.gender,
        x: centerX + Math.cos(angle) * radiusX,
        y: centerY + Math.sin(angle) * radiusY,
      });
    });

    return list;
  }, [characters, centerX, centerY]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, NodePosition>();
    nodes.forEach((n) => map.set(n.id, n));
    return map;
  }, [nodes]);

  const selectedChar = characters.find((c) => c.id === selectedCharId);

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <span>人物羁绊拓扑星图</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              {characters.length} 位角色 · {characterRelations.length} 条关系线
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            点击任意角色节点可查看其档案前史与人际网络；连线色彩与粗细指示亲疏敌友。
          </p>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-4 text-xs font-literary-sans">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-600 inline-block" />
            <span>主角</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-600 inline-block" />
            <span>敌对</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
            <span>盟友</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-500 inline-block" />
            <span>中立/配角</span>
          </div>
        </div>
      </div>

      {/* 主视图画布与详情抽屉 */}
      <div className="flex-1 flex overflow-hidden relative mt-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full cursor-grab active:cursor-grabbing"
        >
          {/* 背景装饰经纬网格 */}
          <defs>
            <pattern id="graph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.08" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#graph-grid)" />

          {/* 关系连线 */}
          {characterRelations.map((rel) => {
            const source = nodeMap.get(rel.fromCharacterId);
            const target = nodeMap.get(rel.toCharacterId);
            if (!source || !target) return null;

            const isHighlighted =
              selectedCharId === rel.fromCharacterId || selectedCharId === rel.toCharacterId;
            const isAffectionate = rel.affinityScore > 0;
            const isHostile = rel.affinityScore < 0;

            const strokeColor = isHostile ? '#e11d48' : isAffectionate ? '#10b981' : '#94a3b8';
            const strokeWidth = isHighlighted ? 3 : Math.max(1.2, Math.abs(rel.affinityScore) / 25);
            const strokeOpacity = isHighlighted ? 0.95 : 0.45;

            const midX = (source.x + target.x) / 2;
            const midY = (source.y + target.y) / 2;

            return (
              <g key={rel.id} onMouseEnter={() => setHoveredRel(rel)} onMouseLeave={() => setHoveredRel(null)} className="cursor-pointer">
                <line
                  x1={source.x}
                  y1={source.y}
                  x2={target.x}
                  y2={target.y}
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  strokeDasharray={isHostile ? '4 2' : undefined}
                />
                {/* 连线关系文字标签 */}
                <rect
                  x={midX - 28}
                  y={midY - 10}
                  width="56"
                  height="20"
                  rx="4"
                  fill="var(--bg-card)"
                  stroke="var(--border-subtle)"
                  strokeWidth="0.8"
                />
                <text
                  x={midX}
                  y={midY + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--text-main)"
                  fontFamily="var(--font-sans-humanist)"
                >
                  {rel.relationType}
                </text>
              </g>
            );
          })}

          {/* 角色节点 */}
          {nodes.map((node) => {
            const isSelected = selectedCharId === node.id;
            const isPro = node.roleType === 'PROTAGONIST';
            const isAnta = node.roleType === 'ANTAGONIST';

            const fillBg = isPro ? '#d97706' : isAnta ? '#dc2626' : '#475569';
            const nodeRadius = isPro ? 28 : 22;

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => setSelectedCharId(isSelected ? null : node.id)}
                className="cursor-pointer transition-transform hover:scale-105"
              >
                {/* 选中高亮光环 */}
                {isSelected && (
                  <circle
                    r={nodeRadius + 8}
                    fill="none"
                    stroke="var(--accent-primary)"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    className="animate-spin"
                    style={{ animationDuration: '8s' }}
                  />
                )}
                <circle
                  r={nodeRadius}
                  fill={fillBg}
                  stroke="var(--bg-canvas)"
                  strokeWidth="2.5"
                  className="shadow-lg"
                />
                <text
                  textAnchor="middle"
                  dy="4"
                  fill="#ffffff"
                  fontSize={isPro ? "12" : "11"}
                  fontWeight="bold"
                  fontFamily="var(--font-serif-literary)"
                >
                  {node.name.slice(0, 3)}
                </text>
                <text
                  textAnchor="middle"
                  y={nodeRadius + 14}
                  fill="var(--text-main)"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="var(--font-serif-literary)"
                >
                  {node.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* 悬停关系标签浮层 */}
        {hoveredRel && (
          <div
            className="absolute bottom-4 left-4 p-3 rounded-xl border shadow-xl max-w-sm pointer-events-none"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>{nodeMap.get(hoveredRel.fromCharacterId)?.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500">
                {hoveredRel.relationType}
              </span>
              <span>{nodeMap.get(hoveredRel.toCharacterId)?.name}</span>
            </div>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              {hoveredRel.description || '暂无详细描述'}
            </p>
            <div className="mt-1 text-[11px] font-mono">
              好感度指数: {hoveredRel.affinityScore > 0 ? `+${hoveredRel.affinityScore}` : hoveredRel.affinityScore}
            </div>
          </div>
        )}

        {/* 右侧角色档案详情抽屉 */}
        {selectedChar && (
          <div
            className="w-80 border-l p-4 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h3 className="font-bold text-lg font-literary-serif">{selectedChar.name}</h3>
                  <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--accent-surface)', color: 'var(--accent-primary)' }}>
                    {selectedChar.roleType === 'PROTAGONIST' ? '核心主角' : selectedChar.roleType === 'ANTAGONIST' ? '重要宿敌' : '同道配角'}
                  </span>
                </div>
                <button onClick={() => setSelectedCharId(null)} className="p-1 hover:opacity-75">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="text-xs font-bold block" style={{ color: 'var(--text-muted)' }}>生平前史</label>
                <p className="text-xs font-literary-serif leading-relaxed mt-1" style={{ color: 'var(--text-main)' }}>
                  {selectedChar.background || '暂无前史介绍'}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold block" style={{ color: 'var(--text-muted)' }}>核心动机与命格缺陷</label>
                <div className="text-xs mt-1 space-y-1">
                  <p><span className="font-semibold">核心动机：</span>{selectedChar.profile.coreMotivation || '未定义'}</p>
                  <p><span className="font-semibold text-rose-500">致命缺陷：</span>{selectedChar.profile.fatalFlaw || '未定义'}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block" style={{ color: 'var(--text-muted)' }}>声线与神态特征</label>
                <p className="text-xs font-literary-serif mt-1" style={{ color: 'var(--text-main)' }}>
                  {selectedChar.profile.voiceAndTone || '常态'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t text-center text-xs" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
              可前往【人物档案】标签页编辑完整心智跃迁
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
