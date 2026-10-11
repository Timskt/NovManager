// ==============================================================================
// 扩展插件与自制工作流模板工坊 (Workflow Plugin Hub & Recipe Studio)
// 允许作者自定义、分享并一键装配专业写作 Agent 提示词管线与流派专属创作配方
// ==============================================================================

import React, { useState } from 'react';
import { Layers, Plus, Check, Download, Upload, Zap, BookOpen, Star } from 'lucide-react';

interface WorkflowPlugin {
  id: string;
  name: string;
  author: string;
  genre: string;
  description: string;
  downloads: number;
  isInstalled: boolean;
  steps: string[];
}

export const WorkflowPluginHub: React.FC = () => {
  const [plugins, setPlugins] = useState<WorkflowPlugin[]>([
    {
      id: 'plugin-1',
      name: '古典修真突破与九重天劫编排器',
      author: '太虚道人',
      genre: '仙侠修真',
      description: '专为大境界破关与天劫对抗设计的专家管线：真元凝练 ➔ 心魔幻境 ➔ 劫雷锻体 ➔ 异象天成。',
      downloads: 1420,
      isInstalled: true,
      steps: ['环境雷云蓄势', '心魔问心折磨', '肉身雷霆洗礼', '破关神华绽放'],
    },
    {
      id: 'plugin-2',
      name: '悬疑反转与高维智斗推演流',
      author: '莫里亚蒂',
      genre: '悬疑推理',
      description: '运用本格推理逻辑，在每幕植入“障眼法伪线索”并在幕末实现三级认知颠覆。',
      downloads: 980,
      isInstalled: false,
      steps: ['伏线暗藏', '伪解释引导', '逻辑裂痕暴露', '真相惊天逆转'],
    },
    {
      id: 'plugin-3',
      name: '赛博朋克雨夜与义体过载动作配方',
      author: '狂暴技工',
      genre: '科幻赛博',
      description: '强化霓虹光影、酸雨、机械机油与神经超频的通感白描，适合高速巷战与黑客骇入。',
      downloads: 830,
      isInstalled: false,
      steps: ['霓虹冷光铺陈', '神经协议超频', '机械断裂火花', '暴雨残响收束'],
    },
  ]);

  const toggleInstall = (id: string) => {
    setPlugins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, isInstalled: !p.isInstalled } : p))
    );
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
            <Layers className="w-5 h-5 text-amber-500" />
            <span>自制工作流与流派配方工坊</span>
            <span className="text-xs px-2 py-0.5 rounded font-literary-sans" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}>
              已载入 {plugins.filter((p) => p.isInstalled).length} 套专属工作流
            </span>
          </h2>
          <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
            自由插拔特定题材的高级创作流水线；可将自己的独家小说大纲配方打包导出。
          </p>
        </div>
      </div>

      {/* 插件卡片网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
        {plugins.map((pl) => (
          <div
            key={pl.id}
            className="p-5 rounded-2xl border flex flex-col justify-between space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs px-2 py-0.5 rounded font-literary-sans bg-amber-500/10 text-amber-500 font-bold">
                  {pl.genre}
                </span>
                <span className="text-xs opacity-60 font-literary-sans">创作者: {pl.author}</span>
              </div>

              <h4 className="font-bold text-base font-literary-serif">{pl.name}</h4>
              <p className="text-xs opacity-80 leading-relaxed font-literary-sans">{pl.description}</p>

              <div className="pt-2">
                <span className="text-[11px] font-bold block mb-1 opacity-70">流水线阶段工序：</span>
                <div className="flex flex-wrap gap-1.5">
                  {pl.steps.map((s, idx) => (
                    <span key={idx} className="text-[10px] px-2 py-0.5 rounded border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                      {idx + 1}. {s}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs opacity-50 font-mono">热度 {pl.downloads}</span>
              <button
                onClick={() => toggleInstall(pl.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  pl.isInstalled
                    ? 'bg-emerald-600 text-white'
                    : 'border hover:opacity-85'
                }`}
                style={!pl.isInstalled ? { borderColor: 'var(--border-strong)', color: 'var(--text-main)' } : undefined}
              >
                {pl.isInstalled ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                <span>{pl.isInstalled ? '已装配到工作台' : '一键装配配方'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
