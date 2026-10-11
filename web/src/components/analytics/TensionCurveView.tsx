// ==============================================================================
// 叙事节奏与情绪张力心电图分析 (Narrative Pacing & Tension Curve Analytics)
// 动态计算全书各幕戏剧冲突、高潮峰值与伏脉波谷，提供专业商业网文与文学节奏诊断
// ==============================================================================

import React, { useMemo, useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Activity, Flame, ShieldAlert, CheckCircle2, ChevronRight, Zap } from 'lucide-react';
import type { NavTab } from '../Header';

interface TensionPoint {
  chapterIndex: number;
  sceneIndex: number;
  chapterId: string;
  label: string;
  sceneGoal: string;
  tension: number; // 0 ~ 100
  wordCount: number;
}

interface TensionCurveViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const TensionCurveView: React.FC<TensionCurveViewProps> = ({ onNavigateTab }) => {
  const { novel, volumes, setActiveChapterId, setActiveSceneIndex } = useNovel();
  const [selectedPoint, setSelectedPoint] = useState<TensionPoint | null>(null);

  // 计算各幕张力点
  const tensionPoints: TensionPoint[] = useMemo(() => {
    const points: TensionPoint[] = [];
    const keywordsHigh = ['突变', '杀意', '剧痛', '死寂', '绝境', '轰鸣', '破空', '血光', '杀招', '断裂', '震颤'];
    const keywordsLow = ['茶香', '沉吟', '微风', '缓步', '思忖', '打坐', '闭目', '安详', '静室'];

    volumes.forEach((v) => {
      v.chapters.forEach((c) => {
        c.scenes.forEach((sc) => {
          const text = sc.draftContent || '';
          let score = 45;
          if (text) {
            const highHits = keywordsHigh.reduce((acc, kw) => acc + (text.split(kw).length - 1), 0);
            const lowHits = keywordsLow.reduce((acc, kw) => acc + (text.split(kw).length - 1), 0);
            score = Math.min(95, Math.max(25, 50 + highHits * 6 - lowHits * 3));
          }
          points.push({
            chapterIndex: c.chapterIndex,
            sceneIndex: sc.sceneIndex,
            chapterId: c.id,
            label: `第${c.chapterIndex}章·幕${sc.sceneIndex}`,
            sceneGoal: sc.sceneGoal || '暂未定义',
            tension: score,
            wordCount: text.length,
          });
        });
      });
    });

    return points;
  }, [volumes]);

  // 节奏诊断建议
  const diagnostics = useMemo(() => {
    const list: { type: 'success' | 'warning' | 'info'; title: string; advice: string }[] = [];
    if (tensionPoints.length === 0) return list;

    // 检查是否有持续 3 幕张力低于 40 的沉闷区间
    let lowCount = 0;
    tensionPoints.forEach((p) => {
      if (p.tension < 40) lowCount++;
      else lowCount = 0;
      if (lowCount >= 3) {
        list.push({
          type: 'warning',
          title: `连续铺垫过缓预警 (${p.label})`,
          advice: '检测到连续数幕剧情张力处于低谷，建议适度施加外力威胁或引入突发危机打破沉闷。',
        });
        lowCount = 0;
      }
    });

    // 检查是否有高于 85 的高潮爆点
    const climaxCount = tensionPoints.filter((p) => p.tension >= 80).length;
    if (climaxCount > 0) {
      list.push({
        type: 'success',
        title: `破局高潮节拍就绪 (共 ${climaxCount} 处大爆点)`,
        advice: '成功识别出强对抗与命运转折爆点，情绪推进弧度符合三幕剧张力递进规律。',
      });
    }

    return list;
  }, [tensionPoints]);

  const chartWidth = 900;
  const chartHeight = 280;
  const paddingX = 40;
  const paddingY = 40;

  // 生成 SVG 折线路径
  const svgPath = useMemo(() => {
    if (tensionPoints.length < 2) return '';
    const stepX = (chartWidth - paddingX * 2) / (tensionPoints.length - 1);
    const scaleY = (chartHeight - paddingY * 2) / 100;

    return tensionPoints
      .map((p, idx) => {
        const x = paddingX + idx * stepX;
        const y = chartHeight - paddingY - p.tension * scaleY;
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [tensionPoints, chartWidth, chartHeight, paddingX, paddingY]);

  const handleJumpToScene = (p: TensionPoint) => {
    setActiveChapterId(p.chapterId);
    setActiveSceneIndex(p.sceneIndex);
    onNavigateTab?.('STUDIO');
  };

  return (
    <div
      className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto select-none"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶栏 */}
      <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <h2 className="text-xl font-bold font-literary-serif flex items-center gap-2">
            <Activity className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
            <span>剧情张力与节奏心电图分析</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              全书 {tensionPoints.length} 幕节拍监测
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            实时拟合全书铺垫、冲突升级与高潮破局的情绪心电图；点击节拍点可直接穿梭入卷。
          </p>
        </div>
      </div>

      {/* 心电图折线图表 */}
      <div className="mt-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between mb-2 text-xs font-literary-sans" style={{ color: 'var(--text-muted)' }}>
          <span>戏剧张力心电曲线 (Tension Curve 0~100)</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> 爆发高潮 (&gt;80)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> 冲突升级 (50~80)</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> 蓄力铺垫 (&lt;50)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-64">
            {/* 网格参考线 */}
            <line x1={paddingX} y1={paddingY} x2={chartWidth - paddingX} y2={paddingY} stroke="currentColor" strokeDasharray="4 2" opacity="0.1" />
            <line x1={paddingX} y1={chartHeight / 2} x2={chartWidth - paddingX} y2={chartHeight / 2} stroke="currentColor" strokeDasharray="4 2" opacity="0.1" />
            <line x1={paddingX} y1={chartHeight - paddingY} x2={chartWidth - paddingX} y2={chartHeight - paddingY} stroke="currentColor" strokeDasharray="4 2" opacity="0.1" />

            <text x={10} y={paddingY + 4} fontSize="10" fill="currentColor" opacity="0.4">100</text>
            <text x={10} y={chartHeight / 2 + 4} fontSize="10" fill="currentColor" opacity="0.4">50</text>
            <text x={10} y={chartHeight - paddingY + 4} fontSize="10" fill="currentColor" opacity="0.4">0</text>

            {/* 渐变填充区 */}
            {svgPath && (
              <path
                d={svgPath}
                fill="none"
                stroke="var(--accent-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* 各幕节拍打点 */}
            {tensionPoints.map((p, idx) => {
              const stepX = (chartWidth - paddingX * 2) / Math.max(1, tensionPoints.length - 1);
              const scaleY = (chartHeight - paddingY * 2) / 100;
              const x = paddingX + idx * stepX;
              const y = chartHeight - paddingY - p.tension * scaleY;
              const isSelected = selectedPoint?.label === p.label;

              return (
                <g
                  key={idx}
                  onClick={() => setSelectedPoint(p)}
                  className="cursor-pointer transition-transform hover:scale-125"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 6 : 4}
                    fill={p.tension >= 80 ? '#f59e0b' : p.tension >= 50 ? '#6366f1' : '#94a3b8'}
                    stroke="var(--bg-surface)"
                    strokeWidth="2"
                  />
                  {isSelected && (
                    <circle cx={x} cy={y} r="10" fill="none" stroke="var(--accent-primary)" strokeWidth="1.5" className="animate-ping" />
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 节拍卡片点击详情与跳转 */}
      {selectedPoint && (
        <div
          className="mt-4 p-4 rounded-xl border flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base font-literary-serif">{selectedPoint.label}</span>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: 'var(--accent-surface)', color: 'var(--accent-primary)' }}>
                张力评分: {selectedPoint.tension}
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                已写 {selectedPoint.wordCount} 字
              </span>
            </div>
            <p className="text-xs mt-1 font-literary-sans" style={{ color: 'var(--text-main)' }}>
              本幕目标：{selectedPoint.sceneGoal}
            </p>
          </div>
          <button
            onClick={() => handleJumpToScene(selectedPoint)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition"
            style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
          >
            <span>直接跳转写作台</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 节奏诊断报告 */}
      <div className="mt-4 space-y-2">
        <h3 className="text-sm font-bold font-literary-serif">智能叙事节奏诊断建议</h3>
        {diagnostics.map((diag, idx) => (
          <div
            key={idx}
            className="p-3 rounded-xl border text-xs flex items-start gap-2.5 font-literary-sans"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            {diag.type === 'warning' ? (
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold">{diag.title}</div>
              <div className="mt-0.5 opacity-80">{diag.advice}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
