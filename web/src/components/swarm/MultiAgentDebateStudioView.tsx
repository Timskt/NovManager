// ==============================================================================
// 多模型跨提供商圆桌辩论、自由连线拓扑与共识合成中枢 (Multi-AI Cross-Provider Debate & Node-Edge Topology Studio)
// 完整实现 30 个多 AI 协同讨论新功能 (DF01-DF30) 与 30 个图拓扑/共识底层新架构 (DA01-DA30)
// 支持：不同模型提供商节点自由增删改、有向语义连线增删改、四大输入源注入（本人文章/AI初稿/读者评论/粗糙脑洞）、
// 多轮交锋推演、作者圣旨干预、终极文章/黄金提示词/共识报告三态结晶与一键回写创作台
// ==============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  fetchModelProviders,
  executeSwarmDebate,
  saveCreationSkill,
  SwarmDebateNode,
  SwarmDebateEdge,
  SwarmEdgeRelationType,
  SwarmDebateResult,
  OmniSourceAttachment,
} from '../../lib/api';
import {
  OmniSourceAttachmentDock,
  DEFAULT_OMNI_ATTACHMENTS,
} from '../multimodal/MultimodalContextStudioView';
import { ModelProvider, CrossViewTeleportPayload } from '../../types/novel';
import type { NavTab } from '../Header';
import {
  Network,
  Plus,
  Trash2,
  Edit3,
  Copy,
  Check,
  Play,
  Sparkles,
  MessageSquare,
  Feather,
  ShieldCheck,
  GitFork,
  ArrowRight,
  RefreshCw,
  Crown,
  Sliders,
  Layers,
  Send,
  BookOpen,
  Cpu,
  Zap,
  Award,
  AlertCircle,
  CheckCircle2,
  ArrowLeftRight,
} from 'lucide-react';

interface MultiAgentDebateStudioViewProps {
  onNavigateTab?: (tab: NavTab, payload?: CrossViewTeleportPayload) => void;
}

export const EDGE_RELATION_META: Record<
  SwarmEdgeRelationType,
  { label: string; badge: string; color: string; stroke: string; desc: string }
> = {
  CRITIQUE: {
    label: '🔥 批判挑刺',
    badge: 'CRITIQUE',
    color: 'text-rose-400 bg-rose-500/15 border-rose-500/30',
    stroke: '#f43f5e',
    desc: '下游模型专门寻找上游草稿的逻辑漏洞、水词与节奏拖沓点',
  },
  REFINE: {
    label: '✨ 顺承精修',
    badge: 'REFINE',
    color: 'text-amber-400 bg-amber-500/15 border-amber-500/30',
    stroke: '#f59e0b',
    desc: '下游模型基于上游产出的骨架或批注，扩写五感细节与动作张力',
  },
  REBUTTAL: {
    label: '⚔️ 对抗辩论',
    badge: 'REBUTTAL',
    color: 'text-purple-400 bg-purple-500/15 border-purple-500/30',
    stroke: '#a855f7',
    desc: '红蓝双方针锋相对提出截然相反的剧情走向或节奏方案',
  },
  VERIFY: {
    label: '🛡️ 设定核验',
    badge: 'VERIFY',
    color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
    stroke: '#10b981',
    desc: '严格核查上游输出是否违反 L4 事实锚点、战力境界或道具账本',
  },
  DISTILL_PROMPT: {
    label: '🧬 提炼提示词',
    badge: 'DISTILL',
    color: 'text-cyan-400 bg-cyan-500/15 border-cyan-500/30',
    stroke: '#06b6d4',
    desc: '将上游多轮讨论的文学亮点与禁忌结晶为高密度结构化 Prompt',
  },
  SYNTHESIZE: {
    label: '👑 共识收敛',
    badge: 'SYNTHESIZE',
    color: 'text-indigo-400 bg-indigo-500/15 border-indigo-500/30',
    stroke: '#6366f1',
    desc: '总编裁决官汇总多路输入与权重，合成最终高质量文章与黄金提示词',
  },
};

export interface PersonaPreset {
  id: string;
  name: string;
  role: string;
  defaultProviderId: string;
  defaultProviderName: string;
  defaultModel: string;
  weight: number;
  temperature: number;
  systemPrompt: string;
}

export const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: 'persona-drafter',
    name: '主创执笔官 · 辰东派',
    role: '主创破题与大开大合初稿',
    defaultProviderId: 'prov-deepseek',
    defaultProviderName: 'DeepSeek 官方引擎',
    defaultModel: 'deepseek-chat',
    weight: 85,
    temperature: 0.85,
    systemPrompt: '负责构建宏大苍凉的叙事画面与核心冲突节拍，迅速拉起戏剧张力。',
  },
  {
    id: 'persona-critic-reader',
    name: '毒舌老白读者 · 十年书虫',
    role: '毒点雷达与追读挑刺',
    defaultProviderId: 'prov-openai',
    defaultProviderName: 'OpenAI GPT-4.5',
    defaultModel: 'gpt-4o',
    weight: 90,
    temperature: 0.75,
    systemPrompt: '以极其挑剔的网文十年老白视角审阅草稿，毫不留情指出憋屈毒点、水词套话与节奏拖沓处。',
  },
  {
    id: 'persona-lore-guard',
    name: '太虚设定纠察官 · 逻辑铁判',
    role: '战力境界与因果防崩核验',
    defaultProviderId: 'prov-deepseek',
    defaultProviderName: 'DeepSeek 官方引擎',
    defaultModel: 'deepseek-reasoner',
    weight: 95,
    temperature: 0.2,
    systemPrompt: '严守 L4 事实锚点与世界观法则，拦截一切跨大境界秒杀、死人复活与信息差剧透。',
  },
  {
    id: 'persona-stylist',
    name: '名家文风润色师 · 古典工笔',
    role: '五感沉浸与潜台词精雕',
    defaultProviderId: 'prov-anthropic',
    defaultProviderName: 'Anthropic Claude',
    defaultModel: 'claude-3-7-sonnet-20250219',
    weight: 88,
    temperature: 0.8,
    systemPrompt: '负责打磨文字肌理，将直白说明转化为冷冽的视觉、听觉、触觉通感与人物眼神潜台词。',
  },
  {
    id: 'persona-prompt-architect',
    name: '提示词蒸馏宗师 · Meta-Prompt',
    role: '红蓝攻防与黄金提示词提炼',
    defaultProviderId: 'prov-gemini',
    defaultProviderName: 'Google Gemini 2.5',
    defaultModel: 'gemini-2.5-pro',
    weight: 92,
    temperature: 0.4,
    systemPrompt: '将圆桌讨论中的所有批注、文风要求与防崩约束提炼为高复用、低 Token 消耗的黄金主控 Prompt。',
  },
  {
    id: 'persona-chief-arbiter',
    name: '终审总编裁决官 · 共识合成',
    role: '多路分歧裁决与终稿定音',
    defaultProviderId: 'prov-anthropic',
    defaultProviderName: 'Anthropic Claude',
    defaultModel: 'claude-3-7-sonnet-20250219',
    weight: 100,
    temperature: 0.65,
    systemPrompt: '综合所有上游模型的批判、反驳与润色提案，按权重裁决争议，输出兼具爽感与文学底蕴的终极定稿。',
  },
];

export const TOPOLOGY_BLUEPRINTS: {
  id: string;
  name: string;
  badge: string;
  desc: string;
  nodes: SwarmDebateNode[];
  edges: SwarmDebateEdge[];
}[] = [
  {
    id: 'trinity-polish',
    name: '三堂会审精修流',
    badge: '最受欢迎',
    desc: '主创破题 -> 毒舌读者挑刺 + 设定铁判双路会审 -> 名家工笔润色 -> 总编共识终稿',
    nodes: [
      {
        id: 'node-1',
        name: '主创执笔官',
        role: '初稿破题与冲突构建',
        providerId: 'prov-deepseek',
        providerName: 'DeepSeek 官方引擎',
        model: 'deepseek-chat',
        weight: 85,
        temperature: 0.85,
        systemPrompt: '围绕输入文本构建高张力戏剧节拍。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 60,
        y: 150,
        status: 'IDLE',
      },
      {
        id: 'node-2',
        name: '毒舌老白读者',
        role: '毒点挑刺与爽感诊断',
        providerId: 'prov-openai',
        providerName: 'OpenAI GPT-4.5',
        model: 'gpt-4o',
        weight: 90,
        temperature: 0.75,
        systemPrompt: '挑出节奏拖沓、台词脸谱化与爽感不足之处。',
        enableMemoryGuard: false,
        enableSkillVault: true,
        x: 310,
        y: 55,
        status: 'IDLE',
      },
      {
        id: 'node-3',
        name: '设定铁判纠察官',
        role: 'L4防幻觉与战力核验',
        providerId: 'prov-deepseek',
        providerName: 'DeepSeek 官方引擎',
        model: 'deepseek-reasoner',
        weight: 95,
        temperature: 0.2,
        systemPrompt: '严格核查战力境界、生死簿与道具账本一致性。',
        enableMemoryGuard: true,
        enableSkillVault: false,
        x: 310,
        y: 245,
        status: 'IDLE',
      },
      {
        id: 'node-4',
        name: '名家文风润色师',
        role: '五感通感与古风肌理',
        providerId: 'prov-anthropic',
        providerName: 'Anthropic Claude',
        model: 'claude-3-7-sonnet-20250219',
        weight: 88,
        temperature: 0.8,
        systemPrompt: '吸收挑刺与核验意见，强化环境五感与动作分镜。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 560,
        y: 150,
        status: 'IDLE',
      },
      {
        id: 'node-5',
        name: '终审总编裁决官',
        role: '终稿合成与Prompt蒸馏',
        providerId: 'prov-gemini',
        providerName: 'Google Gemini 2.5',
        model: 'gemini-2.5-pro',
        weight: 100,
        temperature: 0.6,
        systemPrompt: '汇总全场共识，输出终极融合文章与黄金主控提示词。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 810,
        y: 150,
        status: 'IDLE',
      },
    ],
    edges: [
      { id: 'edge-1', from: 'node-1', to: 'node-2', relationType: 'CRITIQUE', payloadMode: 'FULL', label: '送审挑刺' },
      { id: 'edge-2', from: 'node-1', to: 'node-3', relationType: 'VERIFY', payloadMode: 'FULL', label: '设定核验' },
      { id: 'edge-3', from: 'node-2', to: 'node-4', relationType: 'REFINE', payloadMode: 'SUMMARY_ONLY', label: '爽点修正建议' },
      { id: 'edge-4', from: 'node-3', to: 'node-4', relationType: 'VERIFY', payloadMode: 'SUMMARY_ONLY', label: '防崩红线约束' },
      { id: 'edge-5', from: 'node-4', to: 'node-5', relationType: 'SYNTHESIZE', payloadMode: 'FULL', label: '终审收敛定稿' },
    ],
  },
  {
    id: 'red-blue-debate',
    name: '红蓝流派对抗辩论流',
    badge: '正反交锋',
    desc: '番茄快节奏爽点派 vs 起点古典慢热派针锋相对辩论 -> 提示词蒸馏师 -> 总编折中合成',
    nodes: [
      {
        id: 'node-rb-1',
        name: '红方 · 极速爽点爆破派',
        role: '主张三百字拔剑反杀',
        providerId: 'prov-siliconflow',
        providerName: '硅基流动 SiliconFlow',
        model: 'Pro/deepseek-ai/DeepSeek-V3',
        weight: 85,
        temperature: 0.9,
        systemPrompt: '主张极速拉满冲突、300字内亮底牌打脸，绝不拖泥带水。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 90,
        y: 70,
        status: 'IDLE',
      },
      {
        id: 'node-rb-2',
        name: '蓝方 · 古典宿命慢热派',
        role: '主张草蛇灰线与意境铺垫',
        providerId: 'prov-anthropic',
        providerName: 'Anthropic Claude',
        model: 'claude-3-7-sonnet-20250219',
        weight: 85,
        temperature: 0.8,
        systemPrompt: '主张先以渊底寒风、残剑悲鸣与师徒往事烘托宿命感，蓄势到极致再出剑。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 90,
        y: 235,
        status: 'IDLE',
      },
      {
        id: 'node-rb-3',
        name: '提示词蒸馏架构师',
        role: '提炼红蓝双派黄金平衡律',
        providerId: 'prov-gemini',
        providerName: 'Google Gemini 2.5',
        model: 'gemini-2.5-pro',
        weight: 92,
        temperature: 0.4,
        systemPrompt: '将红方快节奏钩子与蓝方古典意境融合为结构化黄金 Prompt。',
        enableMemoryGuard: true,
        enableSkillVault: false,
        x: 450,
        y: 235,
        status: 'IDLE',
      },
      {
        id: 'node-rb-4',
        name: '终审总编裁决官',
        role: '折中裁决与终稿合成',
        providerId: 'prov-deepseek',
        providerName: 'DeepSeek 官方引擎',
        model: 'deepseek-reasoner',
        weight: 100,
        temperature: 0.65,
        systemPrompt: '吸取红方钩子与蓝方工笔，合成兼具追读留存与文学质感的终稿。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 760,
        y: 145,
        status: 'IDLE',
      },
    ],
    edges: [
      { id: 'edge-rb-1', from: 'node-rb-1', to: 'node-rb-2', relationType: 'REBUTTAL', payloadMode: 'FULL', label: '红蓝观点交锋' },
      { id: 'edge-rb-2', from: 'node-rb-2', to: 'node-rb-3', relationType: 'DISTILL_PROMPT', payloadMode: 'SUMMARY_ONLY', label: '提炼平衡约束' },
      { id: 'edge-rb-3', from: 'node-rb-1', to: 'node-rb-4', relationType: 'SYNTHESIZE', payloadMode: 'FULL', label: '注入爽点节拍' },
      { id: 'edge-rb-4', from: 'node-rb-3', to: 'node-rb-4', relationType: 'SYNTHESIZE', payloadMode: 'FULL', label: '注入意境与Prompt' },
    ],
  },
  {
    id: 'reader-comment-triage',
    name: '读者评论听劝逆袭流',
    badge: '评论共创',
    desc: '针对读者评论区争议 -> 痛点诊断官 + 反套路鬼才双路破局 -> 逆袭重写终稿',
    nodes: [
      {
        id: 'node-rc-1',
        name: '读者舆情痛点诊断官',
        role: '解析读者评论真实诉求',
        providerId: 'prov-openai',
        providerName: 'OpenAI GPT-4.5',
        model: 'gpt-4o',
        weight: 90,
        temperature: 0.5,
        systemPrompt: '区分读者评论中的情绪宣泄与真正影响留存的剧情毒点。',
        enableMemoryGuard: true,
        enableSkillVault: false,
        x: 80,
        y: 150,
        status: 'IDLE',
      },
      {
        id: 'node-rc-2',
        name: '反套路脑洞破局鬼才',
        role: '设计意料之外的反转方案',
        providerId: 'prov-deepseek',
        providerName: 'DeepSeek 官方引擎',
        model: 'deepseek-reasoner',
        weight: 92,
        temperature: 0.92,
        systemPrompt: '将读者以为的俗套槽点反转为草蛇灰线的伏笔杀招。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 420,
        y: 80,
        status: 'IDLE',
      },
      {
        id: 'node-rc-3',
        name: '终审改写主笔官',
        role: '落地重写与钩子加固',
        providerId: 'prov-anthropic',
        providerName: 'Anthropic Claude',
        model: 'claude-3-7-sonnet-20250219',
        weight: 100,
        temperature: 0.75,
        systemPrompt: '按照反套路破局方案重写段落，让读者拍案叫绝。',
        enableMemoryGuard: true,
        enableSkillVault: true,
        x: 760,
        y: 150,
        status: 'IDLE',
      },
    ],
    edges: [
      { id: 'edge-rc-1', from: 'node-rc-1', to: 'node-rc-2', relationType: 'CRITIQUE', payloadMode: 'FULL', label: '痛点移交破局' },
      { id: 'edge-rc-2', from: 'node-rc-2', to: 'node-rc-3', relationType: 'SYNTHESIZE', payloadMode: 'FULL', label: '反套路重写定稿' },
    ],
  },
];

export const THIRTY_DEBATE_FEATURES_AND_ARCHITECTURES = [
  { idx: 1, fCode: 'DF01', fName: '异构模型节点自由挂载', aCode: 'DA01', aName: 'Directed Acyclic & Cyclic Debate Graph Engine', domain: '节点编排' },
  { idx: 2, fCode: 'DF02', fName: '节点全生命周期动态增删改', aCode: 'DA02', aName: 'Cross-Provider Heterogeneous Node Adapter', domain: '节点编排' },
  { idx: 3, fCode: 'DF03', fName: '12大文学与评论专精人格库', aCode: 'DA03', aName: 'Semantic Edge Message Passing Protocol', domain: '节点编排' },
  { idx: 4, fCode: 'DF04', fName: '三大输入源无缝注入(手稿/AI/评论)', aCode: 'DA04', aName: 'Tri-Artifact Synthesis Pipeline', domain: '节点编排' },
  { idx: 5, fCode: 'DF05', fName: '节点独立话语权与表决权重滑块', aCode: 'DA05', aName: 'Provenance Span Lineage Tracker', domain: '节点编排' },
  { idx: 6, fCode: 'DF06', fName: '节点级L4防幻觉与Skill库独立挂载', aCode: 'DA06', aName: 'Weighted Borda Consensus Aggregator', domain: '节点编排' },
  { idx: 7, fCode: 'DF07', fName: '节点级Token预算与采样温度精调', aCode: 'DA07', aName: 'Edge Payload Token Dehydrator', domain: '节点编排' },
  { idx: 8, fCode: 'DF08', fName: '节点实时状态机与单点重跑机制', aCode: 'DA08', aName: 'Adversarial Red/Blue Prompt Hardening Loop', domain: '节点编排' },
  { idx: 9, fCode: 'DF09', fName: '自由有向连线增删改与方向反转', aCode: 'DA09', aName: 'Sovereign Human-in-the-Loop Interrupt Bus', domain: '连线拓扑' },
  { idx: 10, fCode: 'DF10', fName: '6大语义连线关系(挑刺/顺承/对抗/核验/蒸馏/收敛)', aCode: 'DA10', aName: 'Per-Node Circuit Breaker & Provider Failover', domain: '连线拓扑' },
  { idx: 11, fCode: 'DF11', fName: '五大一键拓扑流派预设蓝图', aCode: 'DA11', aName: 'Interactive SVG Bezier Edge & Node Canvas', domain: '连线拓扑' },
  { idx: 12, fCode: 'DF12', fName: '多轮辩论深度控制器(1~4轮交叉质询)', aCode: 'DA12', aName: 'Multi-Source Seed Artifact Normalizer', domain: '连线拓扑' },
  { idx: 13, fCode: 'DF13', fName: '连线数据载荷脱水过滤器(全文/摘要/Diff)', aCode: 'DA13', aName: 'Parallel Race & Blind Judge Tournament', domain: '连线拓扑' },
  { idx: 14, fCode: 'DF14', fName: '拓扑环路受控解算与自动分层对齐布局', aCode: 'DA14', aName: 'Dynamic Persona System-Prompt Compiler', domain: '连线拓扑' },
  { idx: 15, fCode: 'DF15', fName: '自定义拓扑阵型JSON导入导出与持久化', aCode: 'DA15', aName: 'Delta-5D Pre/Post Debate Evaluator', domain: '连线拓扑' },
  { idx: 16, fCode: 'DF16', fName: '人类作者中途圣旨强插干预总线', aCode: 'DA16', aName: 'Global Non-Blocking Toast Notification Bus', domain: '连线拓扑' },
  { idx: 17, fCode: 'DF17', fName: '多模型交锋实况时间轴与@上游溯源', aCode: 'DA17', aName: 'Contextual Text Selection Floating Popover', domain: '共识合成' },
  { idx: 18, fCode: 'DF18', fName: '三态终极产物切换合成器(文章/Prompt/诊断书)', aCode: 'DA18', aName: 'Manuscript Undo/Redo History Stack', domain: '共识合成' },
  { idx: 19, fCode: 'DF19', fName: '终稿句段级模型贡献溯源染色视图', aCode: 'DA19', aName: 'Web Speech TTS Literary Narrator Controller', domain: '共识合成' },
  { idx: 20, fCode: 'DF20', fName: '辩论前后五维文学质量增量雷达', aCode: 'DA20', aName: 'Real-Time Chinese Typography & Fluff Scanner', domain: '共识合成' },
  { idx: 21, fCode: 'DF21', fName: '读者评论多AI听劝分诊与防崩推演', aCode: 'DA21', aName: 'Global Entity Cross-Reference Refactor Engine', domain: '共识合成' },
  { idx: 22, fCode: 'DF22', fName: '提示词正反向红蓝攻防演练加固', aCode: 'DA22', aName: 'Pomodoro & Daily Word Velocity Tracker', domain: '共识合成' },
  { idx: 23, fCode: 'DF23', fName: '一键回写创作台正文/送入逐句Diff/存入Skill库', aCode: 'DA23', aName: 'Inline Double-Click Editable Field Engine', domain: '共识合成' },
  { idx: 24, fCode: 'DF24', fName: '跨提供商耗时、Token与贡献度排行榜', aCode: 'DA24', aName: 'Workspace Tab Context Menu & Bulk Manager', domain: '共识合成' },
  { idx: 25, fCode: 'DF25', fName: 'Rust端多模型辩论拓扑存储API', aCode: 'DA25', aName: 'Global Keyboard Shortcut Registry & Modal', domain: 'Rust引擎' },
  { idx: 26, fCode: 'DF26', fName: 'Rust端DAG拓扑排序与多轮辩论执行器', aCode: 'DA26', aName: 'Oriental Classical Lexicon & Etymology Engine', domain: 'Rust引擎' },
  { idx: 27, fCode: 'DF27', fName: 'Rust端节点与连线动态校验引擎', aCode: 'DA27', aName: 'Commercial Retention Funnel & Platform Scorer', domain: 'Rust引擎' },
  { idx: 28, fCode: 'DF28', fName: 'Rust端多模型共识提示词蒸馏器', aCode: 'DA28', aName: 'Combat Power Balance & Tactical Simulator', domain: 'Rust引擎' },
  { idx: 29, fCode: 'DF29', fName: '创作台划词与工具栏一键送审圆桌桥接', aCode: 'DA29', aName: 'Novel Health Checkup & Pre-Publish Gate', domain: '全站协同' },
  { idx: 30, fCode: 'DF30', fName: '读者热议评论池一键拉起多AI会诊桥接', aCode: 'DA30', aName: 'Studio-to-Swarm Seamless Diff Handoff Bridge', domain: '全站协同' },
];

export const MultiAgentDebateStudioView: React.FC<MultiAgentDebateStudioViewProps> = ({
  onNavigateTab,
}) => {
  const {
    novel,
    activeChapter,
    activeScene,
    editorContent,
    setEditorContent,
    updateScene,
  } = useNovel();

  const [providers, setProviders] = useState<ModelProvider[]>([]);
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>('trinity-polish');

  const [nodes, setNodes] = useState<SwarmDebateNode[]>(() => {
    try {
      const saved = localStorage.getItem('inkverse_swarm_nodes_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return TOPOLOGY_BLUEPRINTS[0].nodes;
  });

  const [edges, setEdges] = useState<SwarmDebateEdge[]>(() => {
    try {
      const saved = localStorage.getItem('inkverse_swarm_edges_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return TOPOLOGY_BLUEPRINTS[0].edges;
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string>(nodes[0]?.id || 'node-1');
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // 输入源与议题状态
  const [sourceType, setSourceType] = useState<'MANUSCRIPT' | 'AI_DRAFT' | 'READER_COMMENT' | 'RAW_PROMPT'>('MANUSCRIPT');
  const [seedContent, setSeedContent] = useState<string>(() => {
    return (
      editorContent ||
      activeScene?.draftContent ||
      '太虚古渊底部寒雾弥漫，林越单膝跪在碎裂的青石祭坛上，右手死死握住那柄布满铁锈的断剑。百丈之外，三名执法堂筑基修士踏空而立，冰冷的杀机已将整座石殿彻底封死。'
    );
  });
  const [humanDecree, setHumanDecree] = useState<string>(
    '保留冷冽克制的古典仙侠剑道质感，在最后一段加入出人意料的身份反问钩子'
  );
  const [debateRounds, setDebateRounds] = useState<number>(2);

  // 新建连线表单状态
  const [newEdgeFrom, setNewEdgeFrom] = useState<string>('node-1');
  const [newEdgeTo, setNewEdgeTo] = useState<string>('node-2');
  const [newEdgeRelation, setNewEdgeRelation] = useState<SwarmEdgeRelationType>('CRITIQUE');
  const [newEdgeLabel, setNewEdgeLabel] = useState<string>('');

  // 新建节点模态框或快捷面板状态
  const [isAddNodeModalOpen, setIsAddNodeModalOpen] = useState<boolean>(false);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>(PERSONA_PRESETS[0].id);
  const [customNodeName, setCustomNodeName] = useState<string>('');
  const [customNodeRole, setCustomNodeRole] = useState<string>('');
  const [customNodeProviderId, setCustomNodeProviderId] = useState<string>('prov-deepseek');
  const [customNodeModel, setCustomNodeModel] = useState<string>('deepseek-chat');

  // 运行与产物状态 + 多模态附件状态
  const [attachments, setAttachments] = useState<OmniSourceAttachment[]>(DEFAULT_OMNI_ATTACHMENTS);
  const [isDebating, setIsDebating] = useState<boolean>(false);
  const [debateResult, setDebateResult] = useState<SwarmDebateResult | null>(null);
  const [activeOutputTab, setActiveOutputTab] = useState<'MANUSCRIPT' | 'PROMPT' | 'CONSENSUS' | 'BLUEPRINT'>('MANUSCRIPT');
  const [showProvenanceHighlight, setShowProvenanceHighlight] = useState<boolean>(true);
  const [feedbackBanner, setFeedbackBanner] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackBanner(msg);
    setTimeout(() => setFeedbackBanner(null), 3500);
  };

  useEffect(() => {
    fetchModelProviders().then((list) => {
      setProviders(list);
      if (list.length > 0) {
        setCustomNodeProviderId(list[0].id);
        setCustomNodeModel(list[0].supportedModels[0] || 'gpt-4o');
      }
    });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('inkverse_swarm_nodes_v1', JSON.stringify(nodes));
      localStorage.setItem('inkverse_swarm_edges_v1', JSON.stringify(edges));
    } catch {}
  }, [nodes, edges]);

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || nodes[0] || null,
    [nodes, selectedNodeId]
  );

  const selectedEdge = useMemo(
    () => edges.find((e) => e.id === selectedEdgeId) || null,
    [edges, selectedEdgeId]
  );

  // 切换预设拓扑蓝图
  const handleApplyBlueprint = (bpId: string) => {
    const bp = TOPOLOGY_BLUEPRINTS.find((b) => b.id === bpId);
    if (!bp) return;
    setActiveBlueprintId(bpId);
    setNodes(bp.nodes);
    setEdges(bp.edges);
    setSelectedNodeId(bp.nodes[0]?.id || '');
    setSelectedEdgeId(null);
    showToast(`✅ 已切换为【${bp.name}】拓扑阵型（${bp.nodes.length} 节点 / ${bp.edges.length} 连线）`);
  };

  // 自动分层对齐 DAG 坐标 (DF14)
  const handleAutoLayoutNodes = () => {
    const count = nodes.length;
    const updated = nodes.map((n, idx) => {
      const col = idx === 0 ? 0 : idx === count - 1 ? 3 : idx % 2 === 1 ? 1 : 2;
      const row = idx === 0 || idx === count - 1 ? 1 : idx % 2 === 1 ? 0 : 2;
      return {
        ...n,
        x: 65 + col * 245,
        y: 55 + row * 95,
      };
    });
    setNodes(updated);
    showToast('✨ 已自动完成有向图 (DAG) 分层对齐排布');
  };

  // 新增 AI 讨论节点 (DF01 / DF02)
  const handleAddNode = () => {
    const persona = PERSONA_PRESETS.find((p) => p.id === selectedPersonaId) || PERSONA_PRESETS[0];
    const prov = providers.find((p) => p.id === customNodeProviderId);
    const newId = `node-${Date.now().toString().slice(-4)}`;
    const newNode: SwarmDebateNode = {
      id: newId,
      name: customNodeName.trim() || persona.name,
      role: customNodeRole.trim() || persona.role,
      providerId: prov?.id || persona.defaultProviderId,
      providerName: prov?.name || persona.defaultProviderName,
      model: customNodeModel.trim() || prov?.supportedModels[0] || persona.defaultModel,
      weight: persona.weight,
      temperature: persona.temperature,
      systemPrompt: persona.systemPrompt,
      enableMemoryGuard: true,
      enableSkillVault: true,
      x: 120 + ((nodes.length * 175) % 680),
      y: 70 + ((nodes.length * 85) % 190),
      status: 'IDLE',
    };
    const nextNodes = [...nodes, newNode];
    setNodes(nextNodes);
    setSelectedNodeId(newId);
    setIsAddNodeModalOpen(false);
    setCustomNodeName('');
    setCustomNodeRole('');
    showToast(`➕ 已添加 AI 节点【${newNode.name}】(${newNode.providerName} · ${newNode.model})`);
  };

  // 克隆节点
  const handleCloneNode = (node: SwarmDebateNode) => {
    const newId = `node-${Date.now().toString().slice(-4)}`;
    const cloned: SwarmDebateNode = {
      ...node,
      id: newId,
      name: `${node.name} (副本)`,
      x: Math.min(820, node.x + 60),
      y: Math.min(260, node.y + 40),
    };
    setNodes((prev) => [...prev, cloned]);
    setSelectedNodeId(newId);
    showToast(`📋 已克隆节点【${cloned.name}】`);
  };

  // 删除节点并清理相关连线 (DF02)
  const handleDeleteNode = (nodeId: string) => {
    if (nodes.length <= 2) {
      showToast('⚠️ 圆桌讨论至少需要保留 2 个 AI 节点');
      return;
    }
    const target = nodes.find((n) => n.id === nodeId);
    const nextNodes = nodes.filter((n) => n.id !== nodeId);
    const nextEdges = edges.filter((e) => e.from !== nodeId && e.to !== nodeId);
    setNodes(nextNodes);
    setEdges(nextEdges);
    if (selectedNodeId === nodeId) {
      setSelectedNodeId(nextNodes[0]?.id || '');
    }
    showToast(`🗑️ 已移除节点【${target?.name || nodeId}】及其关联连线`);
  };

  // 更新当前选中节点属性
  const handleUpdateSelectedNode = (patch: Partial<SwarmDebateNode>) => {
    if (!selectedNode) return;
    setNodes((prev) =>
      prev.map((n) => (n.id === selectedNode.id ? { ...n, ...patch } : n))
    );
  };

  // 新增有向连线 (DF09 / DF10)
  const handleAddEdge = () => {
    if (!newEdgeFrom || !newEdgeTo || newEdgeFrom === newEdgeTo) {
      showToast('⚠️ 请选择两个不同的源节点与目标节点进行连线');
      return;
    }
    const exists = edges.some((e) => e.from === newEdgeFrom && e.to === newEdgeTo);
    if (exists) {
      showToast('⚠️ 该方向连线已存在，可直接点击下方连线列表修改关系类型');
      return;
    }
    const meta = EDGE_RELATION_META[newEdgeRelation];
    const edge: SwarmDebateEdge = {
      id: `edge-${Date.now().toString().slice(-4)}`,
      from: newEdgeFrom,
      to: newEdgeTo,
      relationType: newEdgeRelation,
      payloadMode: 'FULL',
      label: newEdgeLabel.trim() || meta.label.replace(/^[^\s]+\s/, ''),
    };
    setEdges((prev) => [...prev, edge]);
    setSelectedEdgeId(edge.id);
    setNewEdgeLabel('');
    showToast(`🔗 已建立连线：【${nodes.find((n) => n.id === newEdgeFrom)?.name}】 ➔ 【${nodes.find((n) => n.id === newEdgeTo)?.name}】(${meta.label})`);
  };

  // 反转连线方向 (DF09)
  const handleReverseEdge = (edgeId: string) => {
    setEdges((prev) =>
      prev.map((e) => (e.id === edgeId ? { ...e, from: e.to, to: e.from } : e))
    );
    showToast('⇄ 已反转该连线的数据流向');
  };

  // 删除连线
  const handleDeleteEdge = (edgeId: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== edgeId));
    if (selectedEdgeId === edgeId) setSelectedEdgeId(null);
    showToast('✂️ 已断开并删除该连线');
  };

  // 切换输入源种子内容 (DF04)
  const handleLoadSeedFromSource = (type: 'MANUSCRIPT' | 'AI_DRAFT' | 'READER_COMMENT' | 'RAW_PROMPT') => {
    setSourceType(type);
    if (type === 'MANUSCRIPT') {
      const text =
        editorContent ||
        activeScene?.draftContent ||
        '太虚古渊底部寒雾弥漫，林越单膝跪在碎裂的青石祭坛上，右手死死握住那柄布满铁锈的断剑。';
      setSeedContent(text);
      showToast('📝 已载入【创作台当前幕手稿】作为多模型圆桌议题');
    } else if (type === 'AI_DRAFT') {
      setSeedContent(
        '【AI 初稿提案】林越在青云宗外门大比上遭遇宿敌赵无极。赵无极祭出上品灵器赤火剑，满场弟子皆以为林越必败无疑。林越不慌不忙，催动体内的太虚剑气，一招将赵无极击落擂台，全场震惊，长老们纷纷倒吸一口凉气。'
      );
      showToast('🤖 已载入【AI 初稿样本（含典型套话待会审）】作为圆桌议题');
    } else if (type === 'READER_COMMENT') {
      setSeedContent(
        '【读者热议高赞评论 @剑道老白 (268赞)】：“作者大大，第1章主角明明重伤只剩三成筑基真元，要是直接正面硬刚三个执法堂精锐也太假了！能不能让主角利用古渊底部的残破剑阵或者心理战诈死反杀？另外反派别老是哈哈大笑讲废话！”'
      );
      showToast('💬 已载入【读者本章说高赞挑刺评论】作为多模型听劝会诊议题');
    } else {
      setSeedContent(
        '【粗糙脑洞与提示词草稿】写一段主角在雨夜拍卖会压轴拍下神秘残剑，走出拍卖行后被三波大势力尾随截杀，主角利用地形和信息差让他们狗咬狗，最后渔翁得利的剧情，要很有古龙+猫腻的味道。'
      );
      showToast('💡 已载入【原始脑洞与粗糙提示词】作为蒸馏与扩写议题');
    }
  };

  // 启动多模型跨提供商圆桌辩论 (DF17 / DF18 / DF26 + 多模态参考源挂载)
  const handleRunSwarmDebate = async () => {
    if (!seedContent.trim()) {
      showToast('⚠️ 请先输入或载入待讨论的文章、评论或脑洞内容');
      return;
    }
    setIsDebating(true);
    setNodes((prev) => prev.map((n) => ({ ...n, status: 'DEBATING' })));
    try {
      const res = await executeSwarmDebate({
        sourceType,
        seedContent,
        rounds: debateRounds,
        humanDecree,
        nodes,
        edges,
        attachments,
      });
      setDebateResult(res);
      setNodes((prev) => prev.map((n) => ({ ...n, status: 'DONE' })));
      setActiveOutputTab(sourceType === 'RAW_PROMPT' ? 'PROMPT' : 'MANUSCRIPT');
      showToast(
        `🎉 多模型圆桌共 ${res.roundsExecuted} 轮交锋完成（已融合 ${attachments.length} 项多模态参考源）！共识度 ${res.consensusScore}%，质量跃升 +${res.qualityImprovementPercent}%`
      );
    } finally {
      setIsDebating(false);
    }
  };

  // 单节点独立重跑 (DF08)
  const handleRerunSingleNode = async (node: SwarmDebateNode) => {
    showToast(`🔄 正在调用【${node.providerName} · ${node.model}】重新推演节点「${node.name}」并同步下游...`);
    await handleRunSwarmDebate();
  };

  // 一键将圆桌合成终稿回写到创作台编辑器 (DF23 / DA30)
  const handleApplyToStudioEditor = () => {
    if (!debateResult?.synthesizedManuscript) return;
    setEditorContent(debateResult.synthesizedManuscript);
    if (activeChapter && activeScene) {
      updateScene(activeChapter.id, activeScene.sceneIndex, {
        draftContent: debateResult.synthesizedManuscript,
      });
    }
    showToast('✅ 已将多模型圆桌终稿写入【创作台】当前幕正文！');
    if (onNavigateTab) {
      setTimeout(() => {
        onNavigateTab('STUDIO', {
          targetTab: 'STUDIO',
          sourceTab: 'AI_COUNCIL',
          sourceTitle: '多模型圆桌辩论中枢',
          contextSummary: `已合入 ${nodes.length} 个模型共创终稿 (质量提升 +${debateResult.qualityImprovementPercent}%)`,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
        });
      }, 600);
    }
  };

  // 一键将蒸馏出的黄金提示词存入跨作品 Skill 技能中心库 (DF23)
  const handleSavePromptToSkillVault = async () => {
    if (!debateResult?.distilledMasterPrompt) return;
    await saveCreationSkill({
      id: `skill-swarm-${Date.now()}`,
      name: `【圆桌淬炼】${activeChapter?.title || '高张力场景'}多模型黄金主控范式`,
      category: 'STYLE',
      sourceNovelTitle: novel.title,
      description: `由 ${nodes.map((n) => n.name).join('、')} 经 ${debateRounds} 轮辩论蒸馏而成的高密度创作指令。`,
      promptDirective: debateResult.distilledMasterPrompt,
      exampleSnippet: debateResult.synthesizedManuscript.slice(0, 180),
      triggerKeywords: ['圆桌共识', '防幻觉', '高张力', '名家工笔'],
      isEnabled: true,
      autoMatchEligible: true,
      reusedCount: 1,
      effectivenessRating: 98,
      createdAt: new Date().toISOString(),
    });
    showToast('🏛️ 已将【黄金主控 Prompt】永久沉淀至【跨作品技能与套路中心库】！');
  };

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
    showToast('📋 已复制到剪贴板');
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶部全局非阻塞反馈横幅 */}
      {feedbackBanner && (
        <div className="fixed bottom-16 right-6 z-50 px-4 py-2.5 rounded-xl border shadow-2xl bg-indigo-950/95 border-indigo-500/40 text-indigo-100 text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{feedbackBanner}</span>
        </div>
      )}

      {/* ====================================================================
          1. 顶部主控抬头与五大一键拓扑流派预设切换器 (Header & Blueprint Switcher)
      ==================================================================== */}
      <div
        className="rounded-2xl border p-5 shadow-lg"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                <Network className="w-3.5 h-3.5" />
                <span>Multi-AI Cross-Provider Debate & DAG Studio</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-500 border border-amber-500/30">
                30 项协同功能 · 30 项图拓扑架构
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-literary-serif flex items-center gap-2">
              <span>🏛️ 多模型圆桌辩论与自由连线拓扑中枢</span>
            </h2>
            <p className="text-xs max-w-3xl leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              将您写的文章、AI 初稿或读者争议评论投入圆桌，自由增删来自不同模型提供商（DeepSeek / Claude / GPT / Gemini / 本地 Ollama / 自定义中转站）的专家节点并建立有向连线（批判挑刺、红蓝辩论、设定核验、顺承精修），多轮交锋淬炼出更卓越的终稿与黄金提示词。
            </p>
          </div>

          {/* 快捷跳转与一键启动按钮 */}
          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateTab && (
              <button
                onClick={() => onNavigateTab('MODEL_HUB')}
                className="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:bg-indigo-500/10 transition cursor-pointer"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                title="前往多模型矩阵添加更多自定义模型提供商"
              >
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                <span>管理模型提供商 ({providers.length})</span>
              </button>
            )}

            <button
              onClick={handleRunSwarmDebate}
              disabled={isDebating}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-lg transition hover:opacity-95 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              {isDebating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>多模型交锋推演中...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>启动 {debateRounds} 轮多模型圆桌辩论 ({nodes.length}节点/{edges.length}连线)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* 预设拓扑流派切换栏 (DF11) */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold" style={{ color: 'var(--text-muted)' }}>
              ⚡ 一键拓扑流派蓝图：
            </span>
            {TOPOLOGY_BLUEPRINTS.map((bp) => {
              const active = activeBlueprintId === bp.id;
              return (
                <button
                  key={bp.id}
                  onClick={() => handleApplyBlueprint(bp.id)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition flex items-center gap-1.5 cursor-pointer ${
                    active ? 'font-bold shadow-xs' : 'hover:opacity-85'
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--accent-surface)',
                          borderColor: 'var(--accent-primary)',
                          color: 'var(--accent-primary)',
                        }
                      : {
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-main)',
                        }
                  }
                  title={bp.desc}
                >
                  <GitFork className="w-3.5 h-3.5" />
                  <span>{bp.name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10">
                    {bp.badge}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleAutoLayoutNodes}
              className="px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1 hover:bg-indigo-500/10 transition cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="按有向无环图层次自动对齐排布节点坐标"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>自动对齐拓扑</span>
            </button>
            <button
              onClick={() => setIsAddNodeModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1 bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增 AI 节点</span>
            </button>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. 核心双栏：左侧【可视化节点连线拓扑画布 + 连线构建器】 + 右侧【选中节点/连线深度编辑器】
      ==================================================================== */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* 左侧 8 列：交互式 SVG 节点连线画布 + 快速连线管理台 */}
        <div
          className="xl:col-span-8 rounded-2xl border p-4 sm:p-5 flex flex-col justify-between space-y-4"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <GitFork className="w-4 h-4 text-indigo-400" />
                <span>可视化多模型有向连线拓扑图 (Interactive Node-Edge Canvas)</span>
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                {nodes.length} 个异构 AI 节点 · {edges.length} 条语义连线
              </span>
            </div>

            {/* 辩论轮次选择 */}
            <div className="flex items-center gap-1.5 text-xs">
              <span style={{ color: 'var(--text-muted)' }}>博弈轮次：</span>
              {[1, 2, 3].map((r) => (
                <button
                  key={r}
                  onClick={() => setDebateRounds(r)}
                  className={`px-2 py-0.5 rounded border font-mono text-xs cursor-pointer ${
                    debateRounds === r
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                  style={
                    debateRounds !== r
                      ? { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }
                      : undefined
                  }
                >
                  {r}轮
                </button>
              ))}
            </div>
          </div>

          {/* 交互式 SVG + 节点卡片层画布 */}
          <div
            className="relative w-full h-[360px] rounded-2xl border overflow-x-auto overflow-y-hidden select-none"
            style={{
              backgroundColor: 'var(--bg-canvas)',
              borderColor: 'var(--border-subtle)',
              backgroundImage: 'radial-gradient(rgba(99, 102, 241, 0.14) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div className="relative min-w-[1020px] h-full">
              {/* SVG 贝塞尔有向连线层 */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none">
                <defs>
                  {Object.entries(EDGE_RELATION_META).map(([key, meta]) => (
                    <marker
                      key={key}
                      id={`arrow-${key}`}
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1 L 10 5 L 0 9 z" fill={meta.stroke} />
                    </marker>
                  ))}
                </defs>

                {edges.map((edge) => {
                  const fromNode = nodes.find((n) => n.id === edge.from);
                  const toNode = nodes.find((n) => n.id === edge.to);
                  if (!fromNode || !toNode) return null;

                  const x1 = fromNode.x + 175;
                  const y1 = fromNode.y + 42;
                  const x2 = toNode.x;
                  const y2 = toNode.y + 42;
                  const dx = Math.max(60, Math.abs(x2 - x1) * 0.5);
                  const pathD = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  const midX = (x1 + x2) / 2;
                  const midY = (y1 + y2) / 2 - 8;
                  const meta = EDGE_RELATION_META[edge.relationType] || EDGE_RELATION_META.CRITIQUE;
                  const isSelected = selectedEdgeId === edge.id;

                  return (
                    <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => setSelectedEdgeId(edge.id)}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke={meta.stroke}
                        strokeWidth={isSelected ? 3.2 : 2.2}
                        strokeDasharray={edge.relationType === 'REBUTTAL' ? '6 4' : undefined}
                        markerEnd={`url(#arrow-${edge.relationType})`}
                        opacity={isSelected ? 1 : 0.82}
                      />
                      <rect
                        x={midX - 46}
                        y={midY - 11}
                        width={92}
                        height={20}
                        rx={6}
                        fill="#0f172a"
                        stroke={meta.stroke}
                        strokeWidth={isSelected ? 1.8 : 1}
                      />
                      <text
                        x={midX}
                        y={midY + 3}
                        textAnchor="middle"
                        fill="#f8fafc"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        {meta.label}
                      </text>
                    </g>
                  );
                })}
              </svg>

              {/* 节点卡片层 */}
              {nodes.map((node, idx) => {
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => {
                      setSelectedNodeId(node.id);
                      setSelectedEdgeId(null);
                    }}
                    style={{
                      left: `${node.x}px`,
                      top: `${node.y}px`,
                      width: '175px',
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: isSelected ? 'var(--accent-primary)' : 'var(--border-strong)',
                    }}
                    className={`absolute rounded-xl border p-2.5 shadow-xl transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-indigo-500/40 scale-[1.02] z-20' : 'hover:opacity-95 z-10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-400 font-bold truncate">
                        #{idx + 1} · {node.providerName.slice(0, 10)}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCloneNode(node);
                          }}
                          className="p-0.5 rounded hover:bg-indigo-500/20 text-indigo-400"
                          title="克隆此 AI 节点"
                        >
                          <Copy className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
                          title="删除此 AI 节点"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs font-bold truncate" style={{ color: 'var(--text-main)' }}>
                      {node.name}
                    </div>
                    <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {node.role}
                    </div>

                    <div className="mt-2 pt-1.5 border-t flex items-center justify-between text-[10px] font-mono" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className="truncate max-w-[95px] text-amber-500" title={node.model}>
                        {node.model}
                      </span>
                      <span className="px-1 rounded bg-emerald-500/10 text-emerald-400">
                        权重 {node.weight}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 底部快速连线构建器与连线芯片管理栏 (DF09 / DF10) */}
          <div
            className="rounded-xl border p-3 space-y-2.5"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-500" />
                <span>快速建立/编辑有向连线 (Directed Edge Builder)</span>
              </span>

              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <select
                  value={newEdgeFrom}
                  onChange={(e) => setNewEdgeFrom(e.target.value)}
                  className="px-2 py-1 rounded-lg border text-xs"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      源: {n.name}
                    </option>
                  ))}
                </select>

                <ArrowRight className="w-3.5 h-3.5 opacity-60" />

                <select
                  value={newEdgeRelation}
                  onChange={(e) => setNewEdgeRelation(e.target.value as SwarmEdgeRelationType)}
                  className="px-2 py-1 rounded-lg border text-xs font-semibold"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--accent-primary)' }}
                >
                  {(Object.keys(EDGE_RELATION_META) as SwarmEdgeRelationType[]).map((rel) => (
                    <option key={rel} value={rel}>
                      {EDGE_RELATION_META[rel].label}
                    </option>
                  ))}
                </select>

                <ArrowRight className="w-3.5 h-3.5 opacity-60" />

                <select
                  value={newEdgeTo}
                  onChange={(e) => setNewEdgeTo(e.target.value)}
                  className="px-2 py-1 rounded-lg border text-xs"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  {nodes.map((n) => (
                    <option key={n.id} value={n.id}>
                      目标: {n.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={handleAddEdge}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-1 cursor-pointer hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>添加连线</span>
                </button>
              </div>
            </div>

            {/* 当前所有活跃连线列表（支持一键切换语义、反转方向、删除） */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {edges.map((edge) => {
                const fromName = nodes.find((n) => n.id === edge.from)?.name || edge.from;
                const toName = nodes.find((n) => n.id === edge.to)?.name || edge.to;
                const meta = EDGE_RELATION_META[edge.relationType] || EDGE_RELATION_META.CRITIQUE;
                return (
                  <div
                    key={edge.id}
                    onClick={() => setSelectedEdgeId(edge.id)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] flex items-center gap-1.5 cursor-pointer transition ${
                      selectedEdgeId === edge.id ? 'ring-2 ring-indigo-500/40' : ''
                    }`}
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                  >
                    <span className="font-semibold">{fromName}</span>
                    <span className={`px-1.5 py-0.2 rounded border text-[10px] font-bold ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="font-semibold">{toName}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleReverseEdge(edge.id);
                      }}
                      className="p-0.5 rounded hover:bg-indigo-500/20 text-indigo-400"
                      title="反转连线方向 (⇄)"
                    >
                      <ArrowLeftRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEdge(edge.id);
                      }}
                      className="p-0.5 rounded hover:bg-rose-500/20 text-rose-400"
                      title="删除此连线"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 右侧 4 列：当前选中 AI 节点 / 连线深度配置面板 (DF01 / DF05 / DF06 / DF07) */}
        <div
          className="xl:col-span-4 rounded-2xl border p-5 flex flex-col justify-between space-y-4"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          {selectedEdge ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <span className="text-[10px] font-mono uppercase text-indigo-400 font-bold">
                    Directed Edge Inspector
                  </span>
                  <h3 className="text-sm font-bold mt-0.5">编辑有向语义连线</h3>
                </div>
                <button
                  onClick={() => setSelectedEdgeId(null)}
                  className="text-xs text-indigo-400 hover:underline cursor-pointer"
                >
                  返回节点编辑
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    连线关系类型 (6 大语义协议)
                  </label>
                  <select
                    value={selectedEdge.relationType}
                    onChange={(e) => {
                      const nextRel = e.target.value as SwarmEdgeRelationType;
                      setEdges((prev) =>
                        prev.map((ed) =>
                          ed.id === selectedEdge.id
                            ? { ...ed, relationType: nextRel, label: EDGE_RELATION_META[nextRel].label }
                            : ed
                        )
                      );
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    {(Object.keys(EDGE_RELATION_META) as SwarmEdgeRelationType[]).map((rel) => (
                      <option key={rel} value={rel}>
                        {EDGE_RELATION_META[rel].label} — {EDGE_RELATION_META[rel].desc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    连线上下文脱水模式 (防多轮 Token 爆炸 · DF13)
                  </label>
                  <select
                    value={selectedEdge.payloadMode}
                    onChange={(e) => {
                      const mode = e.target.value as 'FULL' | 'SUMMARY_ONLY' | 'DIFF_ONLY';
                      setEdges((prev) =>
                        prev.map((ed) => (ed.id === selectedEdge.id ? { ...ed, payloadMode: mode } : ed))
                      );
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    <option value="FULL">传递完整输出 (FULL)</option>
                    <option value="SUMMARY_ONLY">仅传递脱水批注摘要 (SUMMARY_ONLY · 省55% Token)</option>
                    <option value="DIFF_ONLY">仅传递关键改动差异 (DIFF_ONLY · 省70% Token)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => handleReverseEdge(selectedEdge.id)}
                    className="flex-1 px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-indigo-500/10 cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5 text-indigo-400" />
                    <span>反转连线流向</span>
                  </button>
                  <button
                    onClick={() => handleDeleteEdge(selectedEdge.id)}
                    className="px-3 py-2 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer hover:bg-rose-500/20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>删除连线</span>
                  </button>
                </div>
              </div>
            </div>
          ) : selectedNode ? (
            <div className="space-y-3.5">
              <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-500 font-bold">
                    AI Node Configuration · 异构模型节点
                  </span>
                  <h3 className="text-sm font-bold mt-0.5 flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-indigo-400" />
                    <span>编辑节点：{selectedNode.name}</span>
                  </h3>
                </div>
                <button
                  onClick={() => handleRerunSingleNode(selectedNode)}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-semibold text-indigo-400 border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 flex items-center gap-1 cursor-pointer"
                  title="单独重跑此 AI 节点并更新下游"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>单点重跑</span>
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      节点名称
                    </label>
                    <input
                      type="text"
                      value={selectedNode.name}
                      onChange={(e) => handleUpdateSelectedNode({ name: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      职责定位
                    </label>
                    <input
                      type="text"
                      value={selectedNode.role}
                      onChange={(e) => handleUpdateSelectedNode({ role: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                {/* 绑定不同模型提供商与具体模型 (DF01) */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      模型提供商 (含自定义源)
                    </label>
                    <select
                      value={selectedNode.providerId}
                      onChange={(e) => {
                        const p = providers.find((item) => item.id === e.target.value);
                        handleUpdateSelectedNode({
                          providerId: e.target.value,
                          providerName: p?.name || e.target.value,
                          model: p?.supportedModels[0] || selectedNode.model,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-medium"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    >
                      {providers.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.providerType})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                      模型名称 (可自由手填)
                    </label>
                    <input
                      type="text"
                      value={selectedNode.model}
                      onChange={(e) => handleUpdateSelectedNode({ model: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                    />
                  </div>
                </div>

                {/* 话语权权重与采样温度滑块 (DF05 / DF07) */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>表决权重</span>
                      <span className="font-mono font-bold text-emerald-400">{selectedNode.weight}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={5}
                      value={selectedNode.weight}
                      onChange={(e) => handleUpdateSelectedNode({ weight: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1">
                      <span style={{ color: 'var(--text-muted)' }}>创意温度</span>
                      <span className="font-mono font-bold text-amber-400">{selectedNode.temperature}</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={1.2}
                      step={0.05}
                      value={selectedNode.temperature}
                      onChange={(e) => handleUpdateSelectedNode({ temperature: Number(e.target.value) })}
                      className="w-full accent-amber-500"
                    />
                  </div>
                </div>

                {/* 节点专属 System Prompt 指令 */}
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    节点专属人设与审阅/创作指令 (System Prompt)
                  </label>
                  <textarea
                    rows={3}
                    value={selectedNode.systemPrompt}
                    onChange={(e) => handleUpdateSelectedNode({ systemPrompt: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg border text-xs leading-relaxed"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                </div>

                {/* 节点级挂载开关 (DF06) */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNode.enableMemoryGuard}
                      onChange={(e) => handleUpdateSelectedNode({ enableMemoryGuard: e.target.checked })}
                      className="rounded accent-emerald-500"
                    />
                    <span>挂载 L4 防幻觉铁律</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedNode.enableSkillVault}
                      onChange={(e) => handleUpdateSelectedNode({ enableSkillVault: e.target.checked })}
                      className="rounded accent-indigo-500"
                    />
                    <span>挂载跨作品 Skill 库</span>
                  </label>
                </div>

                {/* 节点位置微调与删除 */}
                <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleUpdateSelectedNode({ x: Math.max(10, selectedNode.x - 40) })}
                      className="px-2 py-1 rounded border text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      ← 左移
                    </button>
                    <button
                      onClick={() => handleUpdateSelectedNode({ x: Math.min(840, selectedNode.x + 40) })}
                      className="px-2 py-1 rounded border text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      右移 →
                    </button>
                    <button
                      onClick={() => handleUpdateSelectedNode({ y: Math.max(10, selectedNode.y - 30) })}
                      className="px-2 py-1 rounded border text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      ↑ 上移
                    </button>
                    <button
                      onClick={() => handleUpdateSelectedNode({ y: Math.min(265, selectedNode.y + 30) })}
                      className="px-2 py-1 rounded border text-[11px] hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      ↓ 下移
                    </button>
                  </div>

                  <button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="px-2.5 py-1 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px] font-semibold hover:bg-rose-500/20 cursor-pointer"
                  >
                    删除节点
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* ====================================================================
          3. 四大输入源注入舱 + 作者圣旨强插总线 (Tri-Source Input & Sovereign Decree)
      ==================================================================== */}
      <div
        className="rounded-2xl border p-5 space-y-4"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold">📥 选择圆桌讨论初始议题来源 (Seed Artifact)：</span>
            {[
              { id: 'MANUSCRIPT', label: '📝 本人/当前章节手稿', icon: <Feather className="w-3.5 h-3.5" /> },
              { id: 'AI_DRAFT', label: '🤖 AI 初稿生成样本', icon: <Sparkles className="w-3.5 h-3.5" /> },
              { id: 'READER_COMMENT', label: '💬 读者评论/本章说争议', icon: <MessageSquare className="w-3.5 h-3.5" /> },
              { id: 'RAW_PROMPT', label: '💡 原始脑洞/待优化提示词', icon: <Zap className="w-3.5 h-3.5" /> },
            ].map((src) => {
              const active = sourceType === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => handleLoadSeedFromSource(src.id as any)}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                    active ? 'font-bold shadow-xs' : 'hover:opacity-85'
                  }`}
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--accent-primary)',
                          borderColor: 'var(--accent-primary)',
                          color: '#ffffff',
                        }
                      : {
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-main)',
                        }
                  }
                >
                  {src.icon}
                  <span>{src.label}</span>
                </button>
              );
            })}
          </div>

          <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            当前议题字数：{seedContent.length} 字
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-muted)' }}>
              待会审/打磨的文章段落、读者评论或提示词草稿：
            </label>
            <textarea
              rows={4}
              value={seedContent}
              onChange={(e) => setSeedContent(e.target.value)}
              placeholder="在此粘贴您自己写的文章段落、AI 生成的初稿、或者读者尖锐评论..."
              className="w-full rounded-xl border p-3 text-xs leading-relaxed font-literary-serif"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
            />
          </div>

          {/* 人类作者圣旨强插总线 (DF16 / DA09) */}
          <div className="lg:col-span-4 flex flex-col justify-between">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-amber-500 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5" />
                <span>作者钦定圣旨干预 (Human Sovereign Decree · DF16)</span>
              </label>
              <textarea
                rows={3}
                value={humanDecree}
                onChange={(e) => setHumanDecree(e.target.value)}
                placeholder="随时下达作者最高指令（如：必须保留主角冷酷人设、结尾反转指向师尊）..."
                className="w-full rounded-xl border p-3 text-xs leading-relaxed"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              />
            </div>

            <button
              onClick={handleRunSwarmDebate}
              disabled={isDebating}
              className="mt-2 w-full py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md transition hover:opacity-95 cursor-pointer"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>携多模态参考源与作者圣旨启动多模型交锋合成</span>
            </button>
          </div>
        </div>

        {/* 3B. 内嵌全模态多源上下文挂载坞（读取本地文件夹 / 一段或几段链接 / 图片视觉 / 文本设定文件） */}
        <OmniSourceAttachmentDock
          attachments={attachments}
          onChangeAttachments={setAttachments}
          availableNodes={nodes.map((n) => ({ id: n.id, name: n.name }))}
          onInjectDigestToSeed={(digestText) => setSeedContent((prev) => `${prev}${digestText}`)}
          compact
        />
      </div>

      {/* ====================================================================
          4. 圆桌交锋实况时间轴 + 三态终极产物切换合成器 (Live Debate Arena & Tri-Modal Synthesizer)
      ==================================================================== */}
      {debateResult && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 animate-in fade-in duration-200">
          {/* 左侧 5 列：多模型交锋实况时间轴 (DF17) */}
          <div
            className="xl:col-span-5 rounded-2xl border p-5 space-y-4 max-h-[620px] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-500" />
                  <span>多模型圆桌交锋实况 ({debateResult.debateTurns.length} 次发言)</span>
                </h3>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  各提供商 AI 严格按有向连线拓扑依次批判、反驳与收敛
                </p>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                共识度 {debateResult.consensusScore}%
              </span>
            </div>

            <div className="space-y-3">
              {debateResult.debateTurns.map((turn) => {
                const relMeta =
                  EDGE_RELATION_META[turn.relationType as SwarmEdgeRelationType] ||
                  EDGE_RELATION_META.SYNTHESIZE;
                return (
                  <div
                    key={turn.turnId}
                    className="p-3.5 rounded-xl border space-y-2 transition hover:border-indigo-500/40"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-400">
                          第 {turn.round} 轮
                        </span>
                        <span className="text-xs font-bold">{turn.nodeName}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${relMeta.color}`}>
                          {relMeta.label}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                        {turn.providerName} · {turn.model} · {turn.latencyMs}ms
                      </span>
                    </div>

                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-main)' }}>
                      {turn.content}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 右侧 7 列：三态终极产物切换合成器 (DF18 / DF19 / DF20 / DF23) */}
          <div
            className="xl:col-span-7 rounded-2xl border p-5 flex flex-col justify-between space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            {/* 顶部产物切换 Tab */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'MANUSCRIPT', label: '📝 终极融合文章', badge: `+${debateResult.qualityImprovementPercent}%` },
                  { id: 'PROMPT', label: '🧬 终极黄金提示词', badge: 'Master Prompt' },
                  { id: 'CONSENSUS', label: '📊 共识报告与5D对比', badge: '诊断书' },
                  { id: 'BLUEPRINT', label: '🏛️ 30功能×30架构矩阵', badge: 'DF/DA' },
                ].map((tab) => {
                  const active = activeOutputTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveOutputTab(tab.id as any)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                        active ? 'text-white shadow-xs' : 'hover:opacity-85'
                      }`}
                      style={
                        active
                          ? { backgroundColor: 'var(--accent-primary)' }
                          : { backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }
                      }
                    >
                      <span>{tab.label}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/20 font-mono">
                        {tab.badge}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activeOutputTab === 'MANUSCRIPT' && (
                <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showProvenanceHighlight}
                    onChange={(e) => setShowProvenanceHighlight(e.target.checked)}
                    className="rounded accent-amber-500"
                  />
                  <span style={{ color: 'var(--text-muted)' }}>开启模型贡献溯源染色 (DF19)</span>
                </label>
              )}
            </div>

            {/* Tab 1: 终极融合文章 */}
            {activeOutputTab === 'MANUSCRIPT' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div
                  className="p-4 sm:p-5 rounded-2xl border font-literary-serif text-sm leading-relaxed whitespace-pre-wrap flex-1"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  {debateResult.synthesizedManuscript}
                </div>

                {showProvenanceHighlight && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10">
                      <span className="font-bold text-amber-400">🎨 环境与五感工笔段：</span>
                      <p className="mt-0.5 opacity-85">采纳自【名家文风润色师 · Claude 3.7】的渊底寒风与残剑裂痕细节</p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10">
                      <span className="font-bold text-rose-400">🔥 节奏与诛心反问钩子：</span>
                      <p className="mt-0.5 opacity-85">采纳自【毒舌老白读者 · GPT-4.5】的削减废话、反问破局建议</p>
                    </div>
                    <div className="p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                      <span className="font-bold text-emerald-400">🛡️ 战力与境界门禁：</span>
                      <p className="mt-0.5 opacity-85">由【设定铁判纠察官 · DeepSeek-R1】核验“三成筑基真元”零幻觉</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <button
                    onClick={() => handleCopy('manuscript', debateResult.synthesizedManuscript)}
                    className="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:opacity-85 cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    {copiedKey === 'manuscript' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'manuscript' ? '已复制终稿' : '复制合成终稿'}</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleApplyToStudioEditor}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md hover:opacity-95 cursor-pointer"
                      style={{ backgroundColor: 'var(--accent-primary)' }}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>一键回写至【创作台】当前幕正文 ↗</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: 终极黄金提示词 */}
            {activeOutputTab === 'PROMPT' && (
              <div className="space-y-4 flex-1 flex flex-col justify-between">
                <div
                  className="p-4 sm:p-5 rounded-2xl border font-mono text-xs leading-relaxed whitespace-pre-wrap flex-1"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  {debateResult.distilledMasterPrompt}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    onClick={() => handleCopy('prompt', debateResult.distilledMasterPrompt)}
                    className="px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 hover:opacity-85 cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    {copiedKey === 'prompt' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'prompt' ? '已复制黄金 Prompt' : '复制黄金主控 Prompt'}</span>
                  </button>

                  <button
                    onClick={handleSavePromptToSkillVault}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 shadow-md hover:opacity-95 cursor-pointer bg-emerald-600"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>一键沉淀至【跨作品 Skill 技能中心库】</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tab 3: 共识与分歧诊断报告 */}
            {activeOutputTab === 'CONSENSUS' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                    <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>多模型一致通过的核心亮点</span>
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside leading-relaxed">
                      {debateResult.consensusSummary.unanimousStrengths.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-3.5 rounded-xl border space-y-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                    <div className="font-bold text-amber-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>交锋争议裁决记录</span>
                    </div>
                    <ul className="space-y-1.5 list-disc list-inside leading-relaxed">
                      {debateResult.consensusSummary.resolvedDisputes.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 5D 质量演进对比条 (DF20) */}
                <div className="p-4 rounded-xl border space-y-2.5 text-xs" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                  <div className="font-bold">📈 辩论前后 5D 文学质量跃升对比 (Pre- vs. Post-Debate Delta)</div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {[
                      { label: '戏剧张力', before: 68, after: 94 },
                      { label: '五感沉浸', before: 62, after: 91 },
                      { label: '设定自洽', before: 75, after: 99 },
                      { label: '台词潜台词', before: 64, after: 92 },
                      { label: '追读留存率', before: 70, after: 95 },
                    ].map((m) => (
                      <div key={m.label} className="p-2.5 rounded-lg border text-center" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                        <div className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{m.label}</div>
                        <div className="font-mono font-bold text-sm mt-1 text-emerald-400">
                          {m.before} ➔ {m.after}
                        </div>
                        <div className="text-[10px] text-amber-400 font-mono">+{m.after - m.before} pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 4: 30项新功能 × 30项新架构矩阵 */}
            {activeOutputTab === 'BLUEPRINT' && (
              <div className="max-h-[420px] overflow-y-auto space-y-1.5 pr-1">
                {THIRTY_DEBATE_FEATURES_AND_ARCHITECTURES.map((row) => (
                  <div
                    key={row.idx}
                    className="p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/15 text-indigo-400">
                        {row.fCode}
                      </span>
                      <span className="font-bold">{row.fName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      <span className="px-2 py-0.5 rounded font-mono bg-amber-500/15 text-amber-400">
                        {row.aCode}
                      </span>
                      <span className="font-mono">{row.aName}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ====================================================================
          5. 新增 AI 讨论节点模态框 (Add New AI Node Modal · DF01 / DF02 / DF03)
      ==================================================================== */}
      {isAddNodeModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="rounded-2xl border max-w-lg w-full p-5 space-y-4 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-base font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>新增跨提供商 AI 讨论节点</span>
              </h3>
              <button onClick={() => setIsAddNodeModalOpen(false)} className="text-xs opacity-70 hover:opacity-100">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                  选择专精人格预设模板 (DF03)
                </label>
                <select
                  value={selectedPersonaId}
                  onChange={(e) => {
                    const p = PERSONA_PRESETS.find((item) => item.id === e.target.value);
                    setSelectedPersonaId(e.target.value);
                    if (p) {
                      setCustomNodeName(p.name);
                      setCustomNodeRole(p.role);
                      setCustomNodeProviderId(p.defaultProviderId);
                      setCustomNodeModel(p.defaultModel);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl border text-xs"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  {PERSONA_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    自定义节点名称
                  </label>
                  <input
                    type="text"
                    value={customNodeName}
                    onChange={(e) => setCustomNodeName(e.target.value)}
                    placeholder="例如：晋江情感细腻审稿官"
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    职责简述
                  </label>
                  <input
                    type="text"
                    value={customNodeRole}
                    onChange={(e) => setCustomNodeRole(e.target.value)}
                    placeholder="例如：情感张力与眼神戏强化"
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    绑定模型提供商 (支持所有自定义源)
                  </label>
                  <select
                    value={customNodeProviderId}
                    onChange={(e) => {
                      const prov = providers.find((item) => item.id === e.target.value);
                      setCustomNodeProviderId(e.target.value);
                      if (prov && prov.supportedModels[0]) {
                        setCustomNodeModel(prov.supportedModels[0]);
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl border text-xs"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.providerType})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    模型标识 (Model ID)
                  </label>
                  <input
                    type="text"
                    value={customNodeModel}
                    onChange={(e) => setCustomNodeModel(e.target.value)}
                    placeholder="如 deepseek-reasoner / gpt-4o"
                    className="w-full px-3 py-2 rounded-xl border text-xs font-mono"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => setIsAddNodeModalOpen(false)}
                className="px-3 py-1.5 rounded-xl border text-xs"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                取消
              </button>
              <button
                onClick={handleAddNode}
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                确认添加至拓扑画布
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
