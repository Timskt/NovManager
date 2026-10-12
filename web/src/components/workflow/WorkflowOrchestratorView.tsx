// ==============================================================================
// 全流程创作工作流编排画布 (Agent Workflow & Pipeline Orchestrator)
// 节点式可视化全流程创作流水线：世界观 -> 人物 -> 大纲 -> 副本 -> 正文 -> 战力审查 -> 影视分镜
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Layers,
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Bot,
  UserCheck,
  ShieldCheck,
  Film,
  Sparkles,
  Cpu,
  Zap,
  Sliders,
  Settings,
  ChevronDown,
} from 'lucide-react';

export interface WorkflowStageNode {
  id: string;
  name: string;
  stageCode: string;
  agentRole: string;
  status: 'COMPLETED' | 'RUNNING' | 'PENDING' | 'WAITING_HUMAN';
  description: string;
  outputArtifact: string;
  tokenCost: number;
  confidenceScore: number;
}

export const WorkflowOrchestratorView: React.FC = () => {
  const { novel } = useNovel();

  const [nodes, setNodes] = useState<WorkflowStageNode[]>([
    {
      id: 'node-1',
      name: '天地创生·世界观与因果律',
      stageCode: 'WORLD_GENESIS',
      agentRole: 'WorldArchitect',
      status: 'COMPLETED',
      description: '构筑天道境界等级（练气至大乘）、天地灵气流向、宗门势力地缘分布及三千秘境禁制。',
      outputArtifact: '世界观法则库 (12条物理铁律，3处空间壁垒)',
      tokenCost: 3420,
      confidenceScore: 98,
    },
    {
      id: 'node-2',
      name: '命运交织·人物谱系与心性状态机',
      stageCode: 'CHARACTERS',
      agentRole: 'Dramaturg',
      status: 'COMPLETED',
      description: '设定林越、苏青瑶、夜枭等核心人物卡，确立动机、缺陷、声线风格与引力社会关系网。',
      outputArtifact: '人物状态机契约 (16名主配角，24条亲疏羁绊)',
      tokenCost: 4890,
      confidenceScore: 95,
    },
    {
      id: 'node-3',
      name: '三幕起伏·卷章宏观大纲编排',
      stageCode: 'MACRO_OUTLINE',
      agentRole: 'OutlineDirector',
      status: 'COMPLETED',
      description: '拟合第一卷“潜龙出渊”全13章戏剧张力波形，标注三处关键危机转折点与高潮决战。',
      outputArtifact: '第一卷全章分镜大纲树 (13章，36幕)',
      tokenCost: 6120,
      confidenceScore: 94,
    },
    {
      id: 'node-4',
      name: '生死试炼·秘境副本演进蓝图',
      stageCode: 'DUNGEON_ARC',
      agentRole: 'CampaignMaster',
      status: 'COMPLETED',
      description: '规划“万妖天窟”五幕副本节奏，衡量Boss战损率、机缘掉落经济与读者心理疲劳曲线。',
      outputArtifact: '万妖天窟副本轨迹图谱 (危险等级 8，5级里程碑)',
      tokenCost: 2850,
      confidenceScore: 92,
    },
    {
      id: 'node-5',
      name: '视肉生香·正文分镜场景逐幕执笔',
      stageCode: 'SCENE_DRAFT',
      agentRole: 'LeadAuthor',
      status: 'RUNNING',
      description: '针对第13章决战幕展开细节化执笔：环境动静、剑气交锋、潜台词心理博弈与绝地逆转。',
      outputArtifact: '第13章第三幕正文手稿实时起草中 (已完成 2,450 字)',
      tokenCost: 8200,
      confidenceScore: 88,
    },
    {
      id: 'node-6',
      name: '道心鉴真·战力因果与设定稽查',
      stageCode: 'CONTINUITY_GUARD',
      agentRole: 'ContinuityGuard',
      status: 'WAITING_HUMAN',
      description: '全量扫描手稿：核验林越左肩伤势对拔剑出鞘的影响、境界跨越合理性，杜绝吃设定。',
      outputArtifact: '设定体检处方单 (0严重违规，1条轻微提示)',
      tokenCost: 1980,
      confidenceScore: 99,
    },
    {
      id: 'node-7',
      name: '光影造化·影视视频分镜解构',
      stageCode: 'VIDEO_STORYBOARD',
      agentRole: 'Cinematographer',
      status: 'PENDING',
      description: '将手稿动作场景拆解为电影镜头，生成可灵(Kling)、Sora、Runway专用的运镜与提示词。',
      outputArtifact: '影视分镜脚本 (预估 12 镜头，60 秒成片)',
      tokenCost: 0,
      confidenceScore: 0,
    },
    {
      id: 'node-8',
      name: '文德载道·全平台多模态发布',
      stageCode: 'PUBLISHING',
      agentRole: 'PublishingAgent',
      status: 'PENDING',
      description: '全角缩进 TXT 出版排版、标准 Markdown、影视分镜包与商业白皮书打包封存。',
      outputArtifact: '多格式分发工程包',
      tokenCost: 0,
      confidenceScore: 0,
    },
  ]);

  const [activeNodeId, setActiveNodeId] = useState<string>('node-5');
  const activeNode = nodes.find((n) => n.id === activeNodeId) || nodes[0];

  const handleApproveHumanGate = (nodeId: string) => {
    setNodes(
      nodes.map((n) =>
        n.id === nodeId ? { ...n, status: 'COMPLETED' } : n
      )
    );
  };

  const handleRerunNode = (nodeId: string) => {
    setNodes(
      nodes.map((n) =>
        n.id === nodeId ? { ...n, status: 'RUNNING' } : n
      )
    );
  };

  const completedCount = nodes.filter((n) => n.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / nodes.length) * 100);

  return (
    <div className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--bg-canvas)' }}>
      <div className="studio-container">
        {/* 顶部流水线标题与全局遥测指标 */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Layers className="w-5 h-5" />
              </span>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" style={{ color: 'var(--text-main)' }}>
                创作工作流智能编排流水线
              </h1>
              <span className="text-xs px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 bg-emerald-500/5 font-mono font-medium">
                Multi-Agent Pipeline
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              全链路节点式创作调度中心。支持人在回路审批、Agent 角色动态派工、质量置信度监控与影视分镜自动触发。
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleRerunNode(activeNodeId)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium border hover:bg-stone-500/5 transition"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              重跑当前节点
            </button>
            <button
              onClick={() => handleApproveHumanGate('node-6')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
            >
              <ShieldCheck className="w-4 h-4" />
              人在回路一键放行
            </button>
          </div>
        </div>

        {/* 宏观流水线遥测概览卡片 (Telemetry Metrics) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="literary-card p-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              流水线总进度
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                {progressPercent}%
              </span>
              <span className="text-xs font-mono text-emerald-600">
                {completedCount} / {nodes.length} 节点
              </span>
            </div>
          </div>

          <div className="literary-card p-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              累计消耗 Token
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
                27,460
              </span>
              <span className="text-xs font-mono text-stone-400">Tokens</span>
            </div>
          </div>

          <div className="literary-card p-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              活跃执行智能体
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" style={{ color: 'var(--text-main)' }}>
                LeadAuthor
              </span>
              <span className="text-xs text-blue-500 font-mono">执笔主控</span>
            </div>
          </div>

          <div className="literary-card p-4">
            <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
              综合置信度评级
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-600">
                94.8%
              </span>
              <span className="text-xs text-stone-400">高拟合度</span>
            </div>
          </div>
        </div>

        {/* 流水线主视窗：左侧节点流水线轨迹 + 右侧节点详情与产物监控 */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* 左侧：节点序列纵览 (7 cols) */}
          <div className="lg:col-span-7 flex flex-col gap-3.5">
            <h3 className="text-sm font-semibold tracking-wide mb-1" style={{ color: 'var(--text-main)' }}>
              全流程编排阶段节点
            </h3>

            {nodes.map((node, index) => {
              const isSelected = node.id === activeNodeId;
              return (
                <div
                  key={node.id}
                  onClick={() => setActiveNodeId(node.id)}
                  className={`literary-card p-4.5 cursor-pointer relative transition group ${
                    isSelected ? 'ring-2 ring-emerald-500 shadow-md' : 'opacity-90 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold bg-stone-500/10" style={{ color: 'var(--text-muted)' }}>
                        {index + 1}
                      </span>
                      <h4 className="font-bold text-sm tracking-tight" style={{ color: 'var(--text-main)' }}>
                        {node.name}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      {node.status === 'COMPLETED' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 已定稿
                        </span>
                      )}
                      {node.status === 'RUNNING' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full bg-blue-500/10 animate-pulse">
                          <Zap className="w-3.5 h-3.5" /> 推演中
                        </span>
                      )}
                      {node.status === 'WAITING_HUMAN' && (
                        <span className="flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full bg-amber-500/10">
                          <UserCheck className="w-3.5 h-3.5" /> 待审批
                        </span>
                      )}
                      {node.status === 'PENDING' && (
                        <span className="flex items-center gap-1 text-xs text-stone-400 px-2 py-0.5 rounded-full bg-stone-500/10 font-mono">
                          <Clock className="w-3 h-3" /> 待就绪
                        </span>
                      )}
                    </div>
                  </div>

                  <p className="text-xs leading-relaxed mb-3 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                    {node.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t text-[11px] font-mono" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-faint)' }}>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1">
                        <Bot className="w-3 h-3 text-stone-400" />
                        {node.agentRole}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>Token: {node.tokenCost}</span>
                      {node.confidenceScore > 0 && (
                        <span className="text-emerald-600">置信: {node.confidenceScore}%</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 右侧：单节点全息产物与审查面板 (5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="literary-card sticky top-20">
              <div className="flex items-center justify-between pb-3 mb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-600" />
                  <h3 className="font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                    节点审查控台：{activeNode.name}
                  </h3>
                </div>
                <span className="text-xs font-mono font-medium px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                  {activeNode.agentRole}
                </span>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    节点定位与任务目标
                  </label>
                  <p className="p-3 rounded-xl border leading-relaxed bg-stone-500/5" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}>
                    {activeNode.description}
                  </p>
                </div>

                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--text-muted)' }}>
                    当前阶段输出产物
                  </label>
                  <div className="p-3.5 rounded-xl border bg-stone-500/5 font-mono text-emerald-600 dark:text-emerald-400 font-medium" style={{ borderColor: 'var(--border-subtle)' }}>
                    📦 {activeNode.outputArtifact}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="text-stone-400 mb-1">消耗 Token</div>
                    <div className="text-lg font-bold font-mono" style={{ color: 'var(--text-main)' }}>
                      {activeNode.tokenCost}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border text-center" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="text-stone-400 mb-1">因果置信度</div>
                    <div className="text-lg font-bold font-mono text-emerald-600">
                      {activeNode.confidenceScore}%
                    </div>
                  </div>
                </div>

                {/* 人在回路交互按钮 */}
                <div className="pt-4 flex flex-col gap-2">
                  {activeNode.status === 'WAITING_HUMAN' ? (
                    <button
                      onClick={() => handleApproveHumanGate(activeNode.id)}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      作者审查通过，解锁下一阶段
                    </button>
                  ) : (
                    <button
                      onClick={() => handleRerunNode(activeNode.id)}
                      className="w-full py-2.5 rounded-xl border hover:bg-stone-500/10 font-medium text-xs transition flex items-center justify-center gap-2"
                      style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      重新调度生成此节点
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
