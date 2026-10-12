// ==============================================================================
// 墨枢 · InkVerse 全站路由与四大研判域导航注册表 (Central Navigation & Domain Registry)
// 单一数据源 (SSOT)：提供完整标题、工作区紧凑短标签 (shortTitle) 与图标元数据
// ==============================================================================

import React from 'react';
import {
  BookOpen,
  Sparkles,
  Library,
  Feather,
  Users,
  Radar,
  Cable,
  GitFork,
  Sliders,
  Clock,
  Activity,
  Layers,
  Map,
  Flame,
  Award,
  Video,
  Eye,
  Cpu,
  Rocket,
  MessageSquare,
  ShieldCheck,
  Network,
  FolderOpen,
} from 'lucide-react';

export type NavTab =
  | 'LIBRARY'
  | 'ARCHITECT'
  | 'STUDIO'
  | 'AI_COUNCIL'
  | 'OMNI_CONTEXT'
  | 'AUTOPILOT'
  | 'SPARK_HUB'
  | 'SKILL_VAULT'
  | 'MEMORY_GUARD'
  | 'OUTLINES'
  | 'CANVAS'
  | 'GENESIS'
  | 'STYLE_DNA'
  | 'MODEL_HUB'
  | 'GODS_EYE_SANDBOX'
  | 'VIDEO_STUDIO'
  | 'WORKFLOW'
  | 'PROGRESS_PULSE'
  | 'DUNGEONS'
  | 'CHARACTERS'
  | 'RELATIONS'
  | 'TIMELINE'
  | 'TENSION'
  | 'FORESHADOWING'
  | 'LORE'
  | 'MAP'
  | 'SANDBOX'
  | 'EVOLUTION'
  | 'PRODUCTIVITY'
  | 'CLINIC'
  | 'PLUGINS'
  | 'MCP';

export interface NavItem {
  id: NavTab;
  title: string;
  shortTitle: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
}

export interface DomainGroup {
  key: string;
  title: string;
  icon: string;
  description: string;
  items: NavItem[];
}

export const DOMAIN_GROUPS: DomainGroup[] = [
  {
    key: 'STUDIO_DOMAIN',
    title: '创制工坊',
    icon: '✍️',
    description: '核心文字执笔、多模型圆桌辩论、全模态多源上下文、无人巡航码字、灵光听劝与分镜架构',
    items: [
      {
        id: 'STUDIO',
        title: '创作台',
        shortTitle: '创作台',
        subtitle: '沉浸正文撰写 · 分镜节拍 · 战力微调',
        icon: <Feather className="w-4 h-4 text-amber-500" />,
        badge: '核心',
      },
      {
        id: 'AI_COUNCIL',
        title: '多模型圆桌辩论与连线拓扑',
        shortTitle: '多AI圆桌',
        subtitle: '跨提供商AI节点增删改 · 自由连线交锋 · 终稿/提示词合成',
        icon: <Network className="w-4 h-4 text-indigo-400" />,
        badge: '多AI圆桌',
      },
      {
        id: 'OMNI_CONTEXT',
        title: '全模态多源上下文中枢',
        shortTitle: '全模态上下文',
        subtitle: '读取本地文件夹 · 多段链接抓取 · 图片视觉锁定 · 文档切片挂载',
        icon: <FolderOpen className="w-4 h-4 text-amber-400" />,
        badge: '120项全模态',
      },
      {
        id: 'AUTOPILOT',
        title: '全自动无人巡航码字舱',
        shortTitle: '无人巡航',
        subtitle: '零输入码满整小时 · 资料投喂 · 技能自动挂载',
        icon: <Rocket className="w-4 h-4 text-emerald-500" />,
        badge: '全托管',
      },
      {
        id: 'SPARK_HUB',
        title: '灵光一现与读者热议中枢',
        shortTitle: '灵光听劝',
        subtitle: '随时补充灵感 · 本章说听劝池 · 双灵感对撞',
        icon: <MessageSquare className="w-4 h-4 text-amber-500" />,
        badge: '共创',
      },
      {
        id: 'SKILL_VAULT',
        title: '跨作品技能与套路中心库',
        shortTitle: '技能套路库',
        subtitle: '套路/等级/文风/副本勾选 · 智能匹配 · 反套路',
        icon: <Layers className="w-4 h-4 text-indigo-500" />,
        badge: 'Skill库',
      },
      {
        id: 'GENESIS',
        title: '灵感创世大纲',
        shortTitle: '创世大纲',
        subtitle: '一句话脑洞 · 黄金三章 · 金手指五阶跃迁',
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
        badge: '创世',
      },
      {
        id: 'STYLE_DNA',
        title: '文风 DNA 仿生工坊',
        shortTitle: '文风DNA',
        subtitle: '名家风格克隆 · 6维计量雷达 · 双流派熔炉',
        icon: <Feather className="w-4 h-4 text-rose-400" />,
        badge: '名家',
      },
      {
        id: 'VIDEO_STUDIO',
        title: 'AI 视频分镜工坊',
        shortTitle: '视频分镜',
        subtitle: '影视运镜机位 · Sora/Kling 跨平台提示词',
        icon: <Video className="w-4 h-4 text-rose-500" />,
        badge: '企业级',
      },
      {
        id: 'ARCHITECT',
        title: '宏观世界架构师',
        shortTitle: '世界架构',
        subtitle: '纪元底层设定 · 主线大纲编排 · 黄金法则',
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      },
      {
        id: 'LIBRARY',
        title: '作品档案库',
        shortTitle: '作品库',
        subtitle: '多小说典籍管理 · 卷章结构总览',
        icon: <Library className="w-4 h-4 text-emerald-500" />,
      },
    ],
  },
  {
    key: 'SIMULATION_DOMAIN',
    title: '因果演化',
    icon: '🌿',
    description: '剧情拓扑推演、流水线编排与副本推演沙盒',
    items: [
      {
        id: 'CANVAS',
        title: '剧情因果幕布',
        shortTitle: '因果幕布',
        subtitle: '独立节点因果树 · 自由连线与多分支演变',
        icon: <GitFork className="w-4 h-4 text-amber-400" />,
        badge: '拓扑',
      },
      {
        id: 'WORKFLOW',
        title: '流程编排管线',
        shortTitle: '流程管线',
        subtitle: '多智能体自动化作业流 · 创制流水线',
        icon: <Cable className="w-4 h-4 text-blue-400" />,
      },
      {
        id: 'DUNGEONS',
        title: '副本演化沙盒',
        shortTitle: '副本沙盒',
        subtitle: '秘境危险评级 · 掠夺经济与里程碑关卡',
        icon: <Flame className="w-4 h-4 text-orange-500" />,
      },
      {
        id: 'SANDBOX',
        title: '平行时空沙盒',
        shortTitle: '平行时空',
        subtitle: 'What-If 假设推演 · 蝴蝶效应分支验证',
        icon: <Sliders className="w-4 h-4 text-teal-400" />,
      },
      {
        id: 'GODS_EYE_SANDBOX',
        title: '上帝视角宏观沙盘',
        shortTitle: '宏观沙盘',
        subtitle: '疲劳弃书预警 · 信息差矩阵 · 场外大势电报',
        icon: <Eye className="w-4 h-4 text-emerald-400" />,
        badge: '控场',
      },
    ],
  },
  {
    key: 'ASSETS_DOMAIN',
    title: '要素资产',
    icon: '👥',
    description: '人物档案、羁绊星图、世界观百科与地理舆图',
    items: [
      {
        id: 'CHARACTERS',
        title: '角色档案谱系',
        shortTitle: '角色谱系',
        subtitle: '人物小传 · 欲望弧光 · 动态战力境界',
        icon: <Users className="w-4 h-4 text-indigo-400" />,
      },
      {
        id: 'RELATIONS',
        title: '角色羁绊星图',
        shortTitle: '羁绊星图',
        subtitle: '复杂社会网与阵营因果动力学力导向图',
        icon: <Users className="w-4 h-4 text-purple-400" />,
      },
      {
        id: 'LORE',
        title: '纪元设定百科',
        shortTitle: '设定百科',
        subtitle: '宗门势力 · 战力体系 · 天材地宝百科宝典',
        icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'MAP',
        title: '地理空间舆图',
        shortTitle: '地理舆图',
        subtitle: '地貌区域 · 行军动线 · 宗门据点分布',
        icon: <Map className="w-4 h-4 text-emerald-400" />,
      },
      {
        id: 'FORESHADOWING',
        title: '伏笔脉络雷达',
        shortTitle: '伏笔雷达',
        subtitle: '草蛇灰线埋设 · 闭环回收追踪预警',
        icon: <Radar className="w-4 h-4 text-rose-400" />,
      },
    ],
  },
  {
    key: 'INTELLIGENCE_DOMAIN',
    title: '研判进化',
    icon: '📈',
    description: '戏剧张力、黄金三章、自我进化与效能分析',
    items: [
      {
        id: 'MEMORY_GUARD',
        title: '四级记忆与防幻觉护栏',
        shortTitle: '防幻觉护栏',
        subtitle: 'L4-L1分层记忆压缩 · 节省68% Token · 战力/生死幻觉熔断',
        icon: <ShieldCheck className="w-4 h-4 text-emerald-500" />,
        badge: '省Token',
      },
      {
        id: 'MODEL_HUB',
        title: '多模型矩阵与高可用路由',
        shortTitle: '模型路由',
        subtitle: '多Key轮换池 · 角色专精路由 · 429熔断接管',
        icon: <Cpu className="w-4 h-4 text-indigo-400" />,
        badge: '高可用',
      },
      {
        id: 'PROGRESS_PULSE',
        title: '创作进度大盘',
        shortTitle: '进度大盘',
        subtitle: '产出心电图 · 卷章完备率 · 节点里程碑',
        icon: <Activity className="w-4 h-4 text-emerald-500" />,
        badge: '大盘',
      },
      {
        id: 'TENSION',
        title: '戏剧张力心电图',
        shortTitle: '张力曲线',
        subtitle: '情绪曲线拟合 · 悬念高潮与低谷节奏审计',
        icon: <Activity className="w-4 h-4 text-rose-500" />,
      },
      {
        id: 'TIMELINE',
        title: '剧情编年时间线',
        shortTitle: '编年时间线',
        subtitle: '多角色并行政线 · 纪元大事件编年矩阵',
        icon: <Clock className="w-4 h-4 text-blue-400" />,
      },
      {
        id: 'CLINIC',
        title: '黄金三章开篇诊所',
        shortTitle: '黄金三章',
        subtitle: '网文商业化留存率 · 前三章吸睛度深度体检',
        icon: <Award className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'EVOLUTION',
        title: '5D 自我进化评测',
        shortTitle: '自我进化',
        subtitle: '连续性/文风/张力自主评测与参数调优',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      },
      {
        id: 'PRODUCTIVITY',
        title: '能量热力图',
        shortTitle: '能量热力',
        subtitle: '创作心流热力图 · 作家精力时段监控',
        icon: <Flame className="w-4 h-4 text-orange-400" />,
      },
      {
        id: 'PLUGINS',
        title: '配方工坊',
        shortTitle: '配方工坊',
        subtitle: '文学提示词配方 · 创作流扩展插件',
        icon: <Layers className="w-4 h-4 text-teal-400" />,
      },
      {
        id: 'MCP',
        title: 'MCP 协议工具箱',
        shortTitle: 'MCP工具箱',
        subtitle: '模型上下文协议通信 · 外部工具集成',
        icon: <Cable className="w-4 h-4 text-cyan-400" />,
      },
    ],
  },
];

export function getNavItemMeta(tab: NavTab): { item?: NavItem; domain?: DomainGroup } {
  for (const domain of DOMAIN_GROUPS) {
    const found = domain.items.find((i) => i.id === tab);
    if (found) {
      return { item: found, domain };
    }
  }
  return {};
}
