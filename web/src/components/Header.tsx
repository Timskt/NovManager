// ==============================================================================
// 企业商业级人文文学全局中控导航栏 (Executive Master Navigation Bar)
// 彻底去除同质化 AI 模版质感，采用【四大创作研判域】高阶分层架构、
// 典雅主题色盘切换器与聚合工程中枢
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNovel } from '../context/NovelContext';
import { useTheme, AppTheme, FontFamily } from '../context/ThemeContext';
import {
  BookOpen,
  Sparkles,
  Settings,
  Download,
  RefreshCw,
  Library,
  Feather,
  Users,
  Compass,
  Radar,
  Cable,
  CheckCircle2,
  GitFork,
  Sliders,
  Clock,
  Activity,
  Layers,
  Map,
  Flame,
  Award,
  Type,
  Video,
  Eye,
  ChevronDown,
  Palette,
  Check,
  Menu,
  X,
  SlidersHorizontal,
  Cpu,
} from 'lucide-react';

export type NavTab =
  | 'LIBRARY'
  | 'ARCHITECT'
  | 'STUDIO'
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

interface NavItem {
  id: NavTab;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  badge?: string;
}

interface DomainGroup {
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
    description: '核心文字执笔、AI 视频多镜头运镜与宏观架构',
    items: [
      {
        id: 'STUDIO',
        title: '创作台',
        subtitle: '沉浸正文撰写 · 分镜节拍 · 战力微调',
        icon: <Feather className="w-4 h-4 text-amber-500" />,
        badge: '核心',
      },
      {
        id: 'GENESIS',
        title: '灵感创世大纲',
        subtitle: '一句话脑洞 · 黄金三章 · 金手指五阶跃迁',
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
        badge: '创世',
      },
      {
        id: 'STYLE_DNA',
        title: '文风 DNA 仿生工坊',
        subtitle: '名家风格克隆 · 6维计量雷达 · 双流派熔炉',
        icon: <Feather className="w-4 h-4 text-rose-400" />,
        badge: '名家',
      },
      {
        id: 'VIDEO_STUDIO',
        title: 'AI 视频分镜工坊',
        subtitle: '影视运镜机位 · Sora/Kling 跨平台提示词',
        icon: <Video className="w-4 h-4 text-rose-500" />,
        badge: '企业级',
      },
      {
        id: 'ARCHITECT',
        title: '宏观世界架构师',
        subtitle: '纪元底层设定 · 主线大纲编排 · 黄金法则',
        icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      },
      {
        id: 'LIBRARY',
        title: '作品档案库',
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
        subtitle: '独立节点因果树 · 自由连线与多分支演变',
        icon: <GitFork className="w-4 h-4 text-amber-400" />,
        badge: '拓扑',
      },
      {
        id: 'WORKFLOW',
        title: '流程编排管线',
        subtitle: '多智能体自动化作业流 · 创制流水线',
        icon: <Cable className="w-4 h-4 text-blue-400" />,
      },
      {
        id: 'DUNGEONS',
        title: '副本演化沙盒',
        subtitle: '秘境危险评级 · 掠夺经济与里程碑关卡',
        icon: <Flame className="w-4 h-4 text-orange-500" />,
      },
      {
        id: 'SANDBOX',
        title: '平行时空沙盒',
        subtitle: 'What-If 假设推演 · 蝴蝶效应分支验证',
        icon: <Sliders className="w-4 h-4 text-teal-400" />,
      },
      {
        id: 'GODS_EYE_SANDBOX',
        title: '上帝视角宏观沙盘',
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
        subtitle: '人物小传 · 欲望弧光 · 动态战力境界',
        icon: <Users className="w-4 h-4 text-indigo-400" />,
      },
      {
        id: 'RELATIONS',
        title: '角色羁绊星图',
        subtitle: '复杂社会网与阵营因果动力学力导向图',
        icon: <Users className="w-4 h-4 text-purple-400" />,
      },
      {
        id: 'LORE',
        title: '纪元设定百科',
        subtitle: '宗门势力 · 战力体系 · 天材地宝百科宝典',
        icon: <BookOpen className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'MAP',
        title: '地理空间舆图',
        subtitle: '地貌区域 · 行军动线 · 宗门据点分布',
        icon: <Map className="w-4 h-4 text-emerald-400" />,
      },
      {
        id: 'FORESHADOWING',
        title: '伏笔脉络雷达',
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
        id: 'MODEL_HUB',
        title: '多模型矩阵与高可用路由',
        subtitle: '多Key轮换池 · 角色专精路由 · 429熔断接管',
        icon: <Cpu className="w-4 h-4 text-indigo-400" />,
        badge: '高可用',
      },
      {
        id: 'PROGRESS_PULSE',
        title: '创作进度大盘',
        subtitle: '产出心电图 · 卷章完备率 · 节点里程碑',
        icon: <Activity className="w-4 h-4 text-emerald-500" />,
        badge: '大盘',
      },
      {
        id: 'TENSION',
        title: '戏剧张力心电图',
        subtitle: '情绪曲线拟合 · 悬念高潮与低谷节奏审计',
        icon: <Activity className="w-4 h-4 text-rose-500" />,
      },
      {
        id: 'TIMELINE',
        title: '剧情编年时间线',
        subtitle: '多角色并行政线 · 纪元大事件编年矩阵',
        icon: <Clock className="w-4 h-4 text-blue-400" />,
      },
      {
        id: 'CLINIC',
        title: '黄金三章开篇诊所',
        subtitle: '网文商业化留存率 · 前三章吸睛度深度体检',
        icon: <Award className="w-4 h-4 text-amber-400" />,
      },
      {
        id: 'EVOLUTION',
        title: '5D 自我进化评测',
        subtitle: '连续性/文风/张力自主评测与参数调优',
        icon: <Sparkles className="w-4 h-4 text-purple-400" />,
      },
      {
        id: 'PRODUCTIVITY',
        title: '能量热力图',
        subtitle: '创作心流热力图 · 作家精力时段监控',
        icon: <Flame className="w-4 h-4 text-orange-400" />,
      },
      {
        id: 'PLUGINS',
        title: '配方工坊',
        subtitle: '文学提示词配方 · 创作流扩展插件',
        icon: <Layers className="w-4 h-4 text-teal-400" />,
      },
      {
        id: 'MCP',
        title: 'MCP 协议工具箱',
        subtitle: '模型上下文协议通信 · 外部工具集成',
        icon: <Cable className="w-4 h-4 text-cyan-400" />,
      },
    ],
  },
];

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  onOpenZen?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenExportStudio?: () => void;
  onOpenGodsEye?: () => void;
  onOpenInScene?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
  onOpenZen,
  onOpenCommandPalette,
  onOpenExportStudio,
  onOpenGodsEye,
  onOpenInScene,
}) => {
  const {
    novel,
    syncFromBackend,
    exportProjectJson,
    importProjectJson,
  } = useNovel();

  const {
    settings: themeSettings,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setParagraphIndent,
  } = useTheme();

  // 导航下拉菜单状态
  const [openDomainKey, setOpenDomainKey] = useState<string | null>(null);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isEngineeringMenuOpen, setIsEngineeringMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // 下拉容器 ref，用于全局外部点击闭合
  const navContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setOpenDomainKey(null);
        setIsThemeMenuOpen(false);
        setIsEngineeringMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // 判定当前激活 Tab 属于哪个域
  const activeDomain = DOMAIN_GROUPS.find((group) =>
    group.items.some((item) => item.id === activeTab)
  );

  const handleSyncBackend = async () => {
    setIsSyncing(true);
    setSyncStatusMsg('正在同步 SQLite/Rust 后端...');
    const ok = await syncFromBackend();
    setIsSyncing(false);
    if (ok) {
      setSyncStatusMsg('✅ 已同步后端最新快照！');
      setTimeout(() => setSyncStatusMsg(null), 3000);
    } else {
      setSyncStatusMsg('⚠️ 未连接本地端口8000，保持前端模式');
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  const themes: {
    key: AppTheme;
    label: string;
    english: string;
    icon: string;
    bgPreview: string;
    borderPreview: string;
    accentPreview: string;
    desc: string;
  }[] = [
    {
      key: 'obsidian',
      label: '玄曜冷萃',
      english: 'Obsidian',
      icon: '🌌',
      bgPreview: '#090a0f',
      borderPreview: '#2e3547',
      accentPreview: '#6366f1',
      desc: '深邃高阶暗色，专业极客沉浸',
    },
    {
      key: 'ink',
      label: '古意宣纸',
      english: 'Ink Paper',
      icon: '📜',
      bgPreview: '#fbf7ee',
      borderPreview: '#ded3bd',
      accentPreview: '#b83b26',
      desc: '温润古朴米黄，东方文人朱砂',
    },
    {
      key: 'celadon',
      label: '秘色青釉',
      english: 'Celadon',
      icon: '🍵',
      bgPreview: '#f2f7f4',
      borderPreview: '#c5d7cd',
      accentPreview: '#2d6a4f',
      desc: '烟雨江南青润，松柏黛绿护眼',
    },
    {
      key: 'pure',
      label: '北欧素雅',
      english: 'Pure',
      icon: '🏛️',
      bgPreview: '#ffffff',
      borderPreview: '#cbd5e1',
      accentPreview: '#4f46e5',
      desc: '极简通透素白，现代纯粹排版',
    },
  ];

  const currentThemeObj =
    themes.find((t) => t.key === themeSettings.theme) || themes[0];

  const progressPercent = Math.min(
    100,
    Math.round((novel.currentWordCount / (novel.targetWordCount || 1)) * 100)
  );

  return (
    <header
      ref={navContainerRef}
      className="border-b sticky top-0 z-40 px-3 sm:px-6 py-2 transition-colors select-none"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* ====================================================================
            1. 左侧：文人印章 Logo 与书名信息
        ==================================================================== */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            onClick={() => setActiveTab('LIBRARY')}
            className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition transform hover:scale-105 shadow-sm"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
            title="点击切换小说或查看作品库"
          >
            <BookOpen className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1
                onClick={() => setActiveTab('LIBRARY')}
                className="text-base font-bold tracking-wide cursor-pointer font-literary-serif hover:opacity-80 transition"
              >
                NovManager
              </h1>
              <span
                className="text-xs px-2 py-0.5 rounded-md font-literary-sans font-medium"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--accent-primary)',
                }}
              >
                {novel.genre || '仙侠修真'}
              </span>
            </div>

            <p
              className="text-xs flex items-center gap-2 font-literary-sans"
              style={{ color: 'var(--text-muted)' }}
            >
              <span
                onClick={() => setActiveTab('LIBRARY')}
                className="font-medium cursor-pointer hover:underline transition truncate max-w-[120px] sm:max-w-xs"
              >
                {novel.title}
              </span>
              <span className="opacity-40 hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                {novel.currentWordCount.toLocaleString()} /{' '}
                {novel.targetWordCount.toLocaleString()} 字
              </span>
              <span className="opacity-40">•</span>
              <span
                style={{ color: 'var(--accent-primary)' }}
                className="font-semibold font-mono"
              >
                {progressPercent}%
              </span>
            </p>
          </div>
        </div>

        {/* ====================================================================
            2. 中间：四大创作研判域主控导航 (Executive 4-Domain Master Nav)
        ==================================================================== */}
        <div className="hidden lg:flex items-center gap-2 font-literary-sans">
          <nav
            className="flex items-center p-1 rounded-xl border text-xs shadow-xs"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {DOMAIN_GROUPS.map((group) => {
              const isDomainActive = activeDomain?.key === group.key;
              const isOpen = openDomainKey === group.key;

              return (
                <div key={group.key} className="relative">
                  <button
                    onClick={() => {
                      if (isOpen) {
                        setOpenDomainKey(null);
                      } else {
                        setOpenDomainKey(group.key);
                        setIsThemeMenuOpen(false);
                        setIsEngineeringMenuOpen(false);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer ${
                      isDomainActive
                        ? 'font-semibold shadow-xs'
                        : 'hover:opacity-85'
                    }`}
                    style={
                      isDomainActive
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            color: '#ffffff',
                          }
                        : {
                            color: 'var(--text-muted)',
                          }
                    }
                  >
                    <span>{group.icon}</span>
                    <span>{group.title}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* 悬浮/展开的二级高阶功能面板 (MegaMenu Dropdown) */}
                  {isOpen && (
                    <div
                      className="absolute left-0 top-10 w-72 p-2 rounded-2xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-strong)',
                        boxShadow: 'var(--shadow-warm)',
                      }}
                    >
                      <div
                        className="px-2.5 py-1.5 mb-1.5 border-b"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          <span>{group.icon}</span>
                          <span>{group.title}</span>
                        </div>
                        <p
                          className="text-[11px] mt-0.5"
                          style={{ color: 'var(--text-faint)' }}
                        >
                          {group.description}
                        </p>
                      </div>

                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const isTabActive = activeTab === item.id;
                          return (
                            <button
                              key={item.id}
                              onClick={() => {
                                setActiveTab(item.id);
                                setOpenDomainKey(null);
                              }}
                              className={`w-full flex items-start gap-2.5 px-2.5 py-2 rounded-xl text-left transition cursor-pointer ${
                                isTabActive
                                  ? 'font-semibold shadow-xs'
                                  : 'hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                              style={
                                isTabActive
                                  ? {
                                      backgroundColor: 'var(--bg-card)',
                                      color: 'var(--accent-primary)',
                                      border: '1px solid var(--accent-primary)',
                                    }
                                  : {
                                      color: 'var(--text-main)',
                                      border: '1px solid transparent',
                                    }
                              }
                            >
                              <div className="p-1 rounded-lg shrink-0 mt-0.5">
                                {item.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold truncate">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span
                                      className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium"
                                      style={{
                                        backgroundColor: 'var(--accent-surface)',
                                        color: 'var(--accent-primary)',
                                      }}
                                    >
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="text-[11px] truncate mt-0.5"
                                  style={{ color: 'var(--text-muted)' }}
                                >
                                  {item.subtitle}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* 全局穿透 HUD 快捷触发器：上帝视角 + 登场人物 */}
          <div
            className="flex items-center gap-1.5 border-l pl-2"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {onOpenGodsEye && (
              <button
                onClick={onOpenGodsEye}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:border-amber-500/50 hover:bg-amber-500/10 transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                title="开启全景上帝视角 HUD (宏观危机倒计时与非视线势力)"
              >
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium hidden xl:inline">上帝视角</span>
              </button>
            )}

            {onOpenInScene && (
              <button
                onClick={onOpenInScene}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:border-indigo-500/50 hover:bg-indigo-500/10 transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                title="检视当前场次登场人物心理与暗线"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium hidden xl:inline">登场人物</span>
              </button>
            )}
          </div>
        </div>

        {/* ====================================================================
            3. 移动端/平板端响应式中枢触发器
        ==================================================================== */}
        <div className="flex lg:hidden items-center gap-1.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-literary-sans cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <Menu className="w-4 h-4 text-amber-500" />
            <span className="font-medium">
              {activeDomain?.title || '全景导航'}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>

          {onOpenGodsEye && (
            <button
              onClick={onOpenGodsEye}
              className="p-1.5 rounded-lg border text-amber-500"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
              title="上帝视角"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {onOpenInScene && (
            <button
              onClick={onOpenInScene}
              className="p-1.5 rounded-lg border text-indigo-400"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
              title="登场人物"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ====================================================================
            4. 右侧：全局搜索、典雅主题切换器与聚合工程中枢
        ==================================================================== */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 全局穿梭指挥官 (Cmd+K) */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="px-2.5 py-1.5 rounded-lg border hover:opacity-85 transition text-xs font-literary-sans flex items-center gap-1.5 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
              title="全局穿梭指挥官 (Cmd+K)"
            >
              <Compass className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              <span className="hidden sm:inline font-mono font-medium">⌘K</span>
            </button>
          )}

          {/* 典雅主题切换下拉面板 (Elegant Theme Dropdown Selector) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsThemeMenuOpen(!isThemeMenuOpen);
                setOpenDomainKey(null);
                setIsEngineeringMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="切换界面主题配色风格"
            >
              <span>{currentThemeObj.icon}</span>
              <span className="hidden sm:inline">{currentThemeObj.label}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isThemeMenuOpen && (
              <div
                className="absolute right-0 top-10 w-64 p-2 rounded-2xl border shadow-2xl z-50 space-y-1.5 font-literary-sans text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  boxShadow: 'var(--shadow-warm)',
                }}
              >
                <div
                  className="px-2 py-1 border-b text-[11px] font-bold"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                >
                  文学工作台色彩主题
                </div>

                {themes.map((t) => {
                  const isSelected = themeSettings.theme === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTheme(t.key);
                        setIsThemeMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left cursor-pointer ${
                        isSelected
                          ? 'border shadow-xs'
                          : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                      }`}
                      style={
                        isSelected
                          ? {
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--accent-primary)',
                            }
                          : {}
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 shadow-xs"
                          style={{
                            backgroundColor: t.bgPreview,
                            border: `1px solid ${t.borderPreview}`,
                          }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: t.accentPreview }}
                          />
                        </div>
                        <div>
                          <div className="font-semibold flex items-center gap-1.5">
                            <span>{t.icon}</span>
                            <span>{t.label}</span>
                          </div>
                          <p
                            className="text-[10px] mt-0.5"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {t.desc}
                          </p>
                        </div>
                      </div>

                      {isSelected && (
                        <Check
                          className="w-4 h-4 shrink-0"
                          style={{ color: 'var(--accent-primary)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 聚合工程中枢 (Executive Engineering & Tools Hub) */}
          <div className="relative">
            <button
              onClick={() => {
                setIsEngineeringMenuOpen(!isEngineeringMenuOpen);
                setOpenDomainKey(null);
                setIsThemeMenuOpen(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="排版微调、出版导出、数据同步与模型配置"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              <span className="hidden md:inline">工程中枢</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isEngineeringMenuOpen && (
              <div
                className="absolute right-0 top-10 w-72 p-3 rounded-2xl border shadow-2xl z-50 space-y-3 font-literary-sans text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                  boxShadow: 'var(--shadow-warm)',
                }}
              >
                <div
                  className="font-bold flex items-center justify-between pb-2 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                    <span>创制工程中枢</span>
                  </span>
                  <button
                    onClick={() => setIsEngineeringMenuOpen(false)}
                    className="hover:opacity-75 cursor-pointer text-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    关闭
                  </button>
                </div>

                {/* 1. 排版微调模块 */}
                <div className="space-y-2">
                  <div className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                    正文字体与微排版
                  </div>

                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFontFamily('serif')}
                      className={`flex-1 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        themeSettings.fontFamily === 'serif'
                          ? 'shadow-xs text-white'
                          : 'hover:opacity-80'
                      }`}
                      style={
                        themeSettings.fontFamily === 'serif'
                          ? { backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
                          : { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }
                      }
                    >
                      典雅宋体
                    </button>
                    <button
                      onClick={() => setFontFamily('sans')}
                      className={`flex-1 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                        themeSettings.fontFamily === 'sans'
                          ? 'shadow-xs text-white'
                          : 'hover:opacity-80'
                      }`}
                      style={
                        themeSettings.fontFamily === 'sans'
                          ? { backgroundColor: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }
                          : { borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }
                      }
                    >
                      人文黑体
                    </button>
                  </div>

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: 'var(--text-muted)' }}>字号大小</span>
                      <span className="font-mono font-medium">{themeSettings.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="14"
                      max="22"
                      value={themeSettings.fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span style={{ color: 'var(--text-muted)' }}>行高比例</span>
                      <span className="font-mono font-medium">{themeSettings.lineHeight}</span>
                    </div>
                    <input
                      type="range"
                      min="1.6"
                      max="2.4"
                      step="0.1"
                      value={themeSettings.lineHeight}
                      onChange={(e) => setLineHeight(Number(e.target.value))}
                      className="w-full accent-amber-600"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span style={{ color: 'var(--text-muted)' }}>段落首行缩进两字</span>
                    <input
                      type="checkbox"
                      checked={themeSettings.paragraphIndent}
                      onChange={(e) => setParagraphIndent(e.target.checked)}
                      className="accent-amber-600 w-4 h-4 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="border-t pt-2 space-y-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[11px] font-bold" style={{ color: 'var(--text-muted)' }}>
                    发布与系统工具
                  </div>

                  {/* 出版级排版导出 */}
                  {onOpenExportStudio && (
                    <button
                      onClick={() => {
                        onOpenExportStudio();
                        setIsEngineeringMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-amber-500" />
                        <span>出版级排版导出 (EPUB/TXT/MD)</span>
                      </div>
                    </button>
                  )}

                  {/* 禅定专注模式 */}
                  {onOpenZen && (
                    <button
                      onClick={() => {
                        onOpenZen();
                        setIsEngineeringMenuOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                        <span>作家禅定沉浸模式 (Zen)</span>
                      </div>
                    </button>
                  )}

                  {/* 后端同步 */}
                  <button
                    onClick={handleSyncBackend}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-emerald-500 ${
                          isSyncing ? 'animate-spin' : ''
                        }`}
                      />
                      <span>同步 SQLite/Rust 本地后端</span>
                    </div>
                  </button>

                  {syncStatusMsg && (
                    <div className="text-[10px] text-center text-amber-500 font-medium animate-in fade-in">
                      {syncStatusMsg}
                    </div>
                  )}

                  {/* 模型与系统设置 */}
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setIsEngineeringMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Settings className="w-3.5 h-3.5 text-blue-400" />
                      <span>大模型 API 与密钥配置</span>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ====================================================================
          5. 移动端全屏滑出导航抽屉 (Mobile Master Drawer)
      ==================================================================== */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex flex-col justify-end">
          <div
            className="w-full max-h-[85vh] overflow-y-auto rounded-t-3xl border-t p-5 space-y-4 animate-in slide-in-from-bottom duration-200"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 font-bold text-base">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>全景功能工作区</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-literary-sans">
              {DOMAIN_GROUPS.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
                    <span>{group.icon}</span>
                    <span>{group.title}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                            isActive
                              ? 'border-amber-500 font-bold shadow-xs'
                              : 'opacity-80'
                          }`}
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: isActive
                              ? 'var(--accent-primary)'
                              : 'var(--border-subtle)',
                          }}
                        >
                          <div className="shrink-0">{item.icon}</div>
                          <div className="min-w-0">
                            <div className="text-xs truncate">{item.title}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
