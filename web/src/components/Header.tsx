// ==============================================================================
// 墨枢 · InkVerse 全局主控顶栏 (Executive Master Navigation Bar)
// 软件工程化重构版：
// 1. 路由配置解耦至 src/config/navigation.tsx (SSOT)
// 2. 全宽对齐布局 (w-full px-4 lg:px-6 h-14)，彻底消除居中挤压与两侧留白断层
// 3. 严格单行防折行约束 (whitespace-nowrap shrink-0)，杜绝按钮文字断成两行
// 4. 双列宽幅域级 MegaMenu 面板，一目了然直达 31 项专业模块
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNovel } from '../context/NovelContext';
import { useTheme, AppTheme } from '../context/ThemeContext';
import { BrandLogo, BrandSealBadge, useBrand } from './BrandLogo';
import {
  NavTab,
  NavItem,
  DomainGroup,
  DOMAIN_GROUPS,
  getNavItemMeta,
} from '../config/navigation';
import {
  BookOpen,
  Sparkles,
  Settings,
  Download,
  RefreshCw,
  Users,
  Compass,
  Video,
  Eye,
  ChevronDown,
  Check,
  Menu,
  X,
  SlidersHorizontal,
  Network,
  Keyboard,
  FolderOpen,
  Award,
} from 'lucide-react';

export type { NavTab, NavItem, DomainGroup };
export { DOMAIN_GROUPS, getNavItemMeta };

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
  onOpenZen?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenExportStudio?: () => void;
  onOpenGodsEye?: () => void;
  onOpenInScene?: () => void;
  onOpenFriendlyHub?: () => void;
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
  onOpenFriendlyHub,
}) => {
  const { novel, syncFromBackend } = useNovel();

  const {
    settings: themeSettings,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setParagraphIndent,
  } = useTheme();

  const [openDomainKey, setOpenDomainKey] = useState<string | null>(null);
  const [isSceneHudMenuOpen, setIsSceneHudMenuOpen] = useState(false);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const [isEngineeringMenuOpen, setIsEngineeringMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  const navContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      if (
        navContainerRef.current &&
        !navContainerRef.current.contains(event.target as Node)
      ) {
        setOpenDomainKey(null);
        setIsSceneHudMenuOpen(false);
        setIsThemeMenuOpen(false);
        setIsEngineeringMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  const activeDomain = DOMAIN_GROUPS.find((group) =>
    group.items.some((item) => item.id === activeTab)
  );

  const closeAllMenus = () => {
    setOpenDomainKey(null);
    setIsSceneHudMenuOpen(false);
    setIsThemeMenuOpen(false);
    setIsEngineeringMenuOpen(false);
  };

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
    shortLabel: string;
    icon: string;
    bgPreview: string;
    borderPreview: string;
    accentPreview: string;
    desc: string;
  }[] = [
    {
      key: 'obsidian',
      label: '玄曜冷萃',
      shortLabel: '玄曜',
      icon: '🌌',
      bgPreview: '#090a0f',
      borderPreview: '#2e3547',
      accentPreview: '#6366f1',
      desc: '深邃高阶暗色，专业极客沉浸',
    },
    {
      key: 'ink',
      label: '古意宣纸',
      shortLabel: '宣纸',
      icon: '📜',
      bgPreview: '#fbf7ee',
      borderPreview: '#ded3bd',
      accentPreview: '#b83b26',
      desc: '温润古朴米黄，东方文人朱砂',
    },
    {
      key: 'celadon',
      label: '秘色青釉',
      shortLabel: '青釉',
      icon: '🍵',
      bgPreview: '#f2f7f4',
      borderPreview: '#c5d7cd',
      accentPreview: '#2d6a4f',
      desc: '烟雨江南青润，松柏黛绿护眼',
    },
    {
      key: 'pure',
      label: '北欧素雅',
      shortLabel: '素雅',
      icon: '🏛️',
      bgPreview: '#ffffff',
      borderPreview: '#cbd5e1',
      accentPreview: '#4f46e5',
      desc: '极简通透素白，现代纯粹排版',
    },
  ];

  const currentThemeObj =
    themes.find((t) => t.key === themeSettings.theme) || themes[0];

  const { brand, setIsBrandModalOpen } = useBrand();

  const progressPercent = Math.min(
    100,
    Math.round((novel.currentWordCount / (novel.targetWordCount || 1)) * 100)
  );

  const formattedWordCount =
    novel.currentWordCount >= 10000
      ? `${(novel.currentWordCount / 10000).toFixed(1)}万字`
      : `${novel.currentWordCount.toLocaleString()}字`;

  return (
    <header
      ref={navContainerRef}
      className="border-b sticky top-0 z-40 w-full h-14 px-3.5 lg:px-5 flex items-center justify-between gap-3 transition-colors select-none shrink-0"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* ====================================================================
          1. 左侧区：品牌徽标 + 作品切换胶囊 (严格单行、紧凑清晰)
      ==================================================================== */}
      <div className="flex items-center gap-2.5 shrink-0 min-w-0">
        <div
          onClick={() => setActiveTab('LIBRARY')}
          onContextMenu={(e) => {
            e.preventDefault();
            setIsBrandModalOpen(true);
          }}
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition transform hover:scale-105 shadow-xs shrink-0"
          title="左键返回【作品库】 | 右键打开【品牌视觉 VI 定制中心】"
        >
          <BrandLogo size={34} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <h1
            onClick={() => setActiveTab('LIBRARY')}
            className="text-sm sm:text-base font-extrabold tracking-wide cursor-pointer font-literary-serif hover:opacity-80 transition whitespace-nowrap"
            title="点击查看作品档案库"
          >
            {brand.brandName}
          </h1>
          <BrandSealBadge />
        </div>

        {/* 竖向分隔符 */}
        <div
          className="hidden sm:block h-4 w-px mx-0.5 shrink-0"
          style={{ backgroundColor: 'var(--border-subtle)' }}
        />

        {/* 当前激活作品胶囊 (点击直接切换/管理作品) */}
        <button
          type="button"
          onClick={() => setActiveTab('LIBRARY')}
          className={`hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === 'LIBRARY'
              ? 'font-bold shadow-2xs'
              : 'hover:opacity-90'
          }`}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor:
              activeTab === 'LIBRARY'
                ? 'var(--accent-primary)'
                : 'var(--border-subtle)',
          }}
          title={`当前执笔作品：《${novel.title}》 (${novel.currentWordCount.toLocaleString()} / ${novel.targetWordCount.toLocaleString()} 字) · 点击进入藏书阁切换作品`}
        >
          <span
            className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"
            aria-hidden="true"
          />
          <span className="font-bold max-w-[110px] xl:max-w-[160px] truncate">
            《{novel.title}》
          </span>
          <span
            className="text-[11px] font-mono hidden md:inline"
            style={{ color: 'var(--text-muted)' }}
          >
            {formattedWordCount}
          </span>
          <span
            className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded"
            style={{
              backgroundColor: 'var(--accent-surface)',
              color: 'var(--accent-primary)',
            }}
          >
            {progressPercent}%
          </span>
        </button>
      </div>

      {/* ====================================================================
          2. 中间区：四大创作研判域分段主控导航 (严格单行 + 双列宽幅下拉面板)
      ==================================================================== */}
      <div className="hidden lg:flex items-center justify-center gap-2 font-literary-sans shrink-0">
        <nav
          className="flex items-center p-1 rounded-xl border text-xs shadow-2xs shrink-0"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {DOMAIN_GROUPS.map((group) => {
            const isDomainActive = activeDomain?.key === group.key;
            const isOpen = openDomainKey === group.key;

            return (
              <div key={group.key} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (isOpen) {
                      setOpenDomainKey(null);
                    } else {
                      closeAllMenus();
                      setOpenDomainKey(group.key);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer whitespace-nowrap shrink-0 ${
                    isDomainActive
                      ? 'font-bold shadow-2xs'
                      : 'hover:opacity-85'
                  }`}
                  style={
                    isDomainActive
                      ? {
                          backgroundColor: 'var(--accent-primary)',
                          color: '#ffffff',
                        }
                      : {
                          color: 'var(--text-main)',
                        }
                  }
                >
                  <span className="text-xs leading-none">{group.icon}</span>
                  <span className="whitespace-nowrap">{group.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180' : 'opacity-65'
                    }`}
                  />
                </button>

                {/* 双列宽幅域级功能矩阵 (2-Column Wide MegaMenu) */}
                {isOpen && (
                  <div
                    className="absolute left-1/2 -translate-x-1/2 top-11 w-[540px] p-3 rounded-2xl border shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-strong)',
                      boxShadow: 'var(--shadow-warm)',
                    }}
                  >
                    <div
                      className="flex items-center justify-between px-2 pb-2 mb-2 border-b"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{group.icon}</span>
                        <div>
                          <div className="text-xs font-bold">{group.title}</div>
                          <p
                            className="text-[11px]"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {group.description}
                          </p>
                        </div>
                      </div>
                      <span
                        className="text-[10px] font-mono px-2 py-0.5 rounded-full border whitespace-nowrap"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {group.items.length} 个子工坊
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      {group.items.map((item) => {
                        const isTabActive = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id);
                              setOpenDomainKey(null);
                            }}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl text-left transition cursor-pointer ${
                              isTabActive
                                ? 'font-semibold shadow-2xs'
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
                            <div
                              className="p-1.5 rounded-lg shrink-0 mt-0.5 border"
                              style={{
                                backgroundColor: 'var(--bg-canvas)',
                                borderColor: 'var(--border-subtle)',
                              }}
                            >
                              {item.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-bold truncate">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span
                                    className="text-[10px] px-1.5 py-0.2 rounded font-mono font-medium whitespace-nowrap shrink-0"
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

        {/* 核心双引擎快捷直达胶囊：多AI圆桌 + 全模态上下文 */}
        <div
          className="hidden xl:flex items-center gap-1.5 pl-2 border-l shrink-0"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('AI_COUNCIL')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'AI_COUNCIL'
                ? 'border-indigo-500 bg-indigo-500/15 font-bold text-indigo-400'
                : 'hover:border-indigo-500/40 hover:bg-indigo-500/10'
            }`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor:
                activeTab === 'AI_COUNCIL' ? undefined : 'var(--border-subtle)',
            }}
            title="多模型圆桌辩论与自由连线拓扑中枢"
          >
            <Network className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="whitespace-nowrap">多AI圆桌</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('OMNI_CONTEXT')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === 'OMNI_CONTEXT'
                ? 'border-amber-500 bg-amber-500/15 font-bold text-amber-500'
                : 'hover:border-amber-500/40 hover:bg-amber-500/10'
            }`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor:
                activeTab === 'OMNI_CONTEXT'
                  ? undefined
                  : 'var(--border-subtle)',
            }}
            title="全模态多源上下文中枢 (读取本地文件夹/多段链接/图片/文档)"
          >
            <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="whitespace-nowrap">全模态挂载</span>
          </button>
        </div>
      </div>

      {/* ====================================================================
          3. 移动端/平板端响应式中枢触发器
      ==================================================================== */}
      <div className="flex lg:hidden items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-literary-sans cursor-pointer whitespace-nowrap"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          <Menu className="w-4 h-4 text-amber-500 shrink-0" />
          <span className="font-medium whitespace-nowrap">
            {activeDomain?.title || '全景导航'}
          </span>
          <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
        </button>
      </div>

      {/* ====================================================================
          4. 右侧区：全局穿梭 (⌘K) + 场次百宝箱 + 主题色盘 + 工程中枢 (全部严格单行)
      ==================================================================== */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* 全局穿梭指挥官 (Cmd+K) */}
        {onOpenCommandPalette && (
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="px-2.5 py-1.5 rounded-lg border hover:opacity-85 transition text-xs font-literary-sans flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
            title="全局穿梭指挥官 (Cmd+K)"
          >
            <Compass
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--accent-primary)' }}
            />
            <span className="hidden md:inline whitespace-nowrap">穿梭</span>
            <kbd
              className="text-[10px] font-mono px-1 py-0.2 rounded border"
              style={{
                backgroundColor: 'var(--bg-canvas)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              ⌘K
            </kbd>
          </button>
        )}

        {/* 聚合【场次百宝箱】下拉菜单 (收纳上帝视角 / 登场人物 / 东方取名·快捷键 / 禅定模式，彻底解决顶栏拥挤) */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !isSceneHudMenuOpen;
              closeAllMenus();
              setIsSceneHudMenuOpen(next);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            title="场次实时辅助：上帝视角 HUD · 登场人物暗线 · 东方取名与快捷键"
          >
            <Eye className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">场次辅助</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>

          {isSceneHudMenuOpen && (
            <div
              className="absolute right-0 top-11 w-64 p-2 rounded-2xl border shadow-2xl z-50 space-y-1 font-literary-sans text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-warm)',
              }}
            >
              <div
                className="px-2.5 py-1 border-b text-[11px] font-bold"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                场次实时洞察与百宝箱
              </div>

              {onOpenGodsEye && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenGodsEye();
                    setIsSceneHudMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <div className="font-bold">全景上帝视角 HUD</div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      宏观危机倒计时与场外势力异动
                    </div>
                  </div>
                </button>
              )}

              {onOpenInScene && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenInScene();
                    setIsSceneHudMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <Users className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <div className="font-bold">本场登场人物与潜台词</div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      实时检视在场角色心境、筹码与暗线
                    </div>
                  </div>
                </button>
              )}

              {onOpenFriendlyHub && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenFriendlyHub();
                    setIsSceneHudMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <Keyboard className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <div className="font-bold">东方取名矩阵 · 快捷键 (?)</div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      宗门/功法/灵宝取名与商业化体检
                    </div>
                  </div>
                </button>
              )}

              {onOpenZen && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenZen();
                    setIsSceneHudMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition text-left cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <div className="font-bold">作家禅定沉浸模式 (Zen)</div>
                    <div
                      className="text-[10px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      全屏无干扰纯享文字推演
                    </div>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>

        {/* 典雅主题切换下拉面板 */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !isThemeMenuOpen;
              closeAllMenus();
              setIsThemeMenuOpen(next);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            title="切换界面主题配色风格"
          >
            <span className="leading-none">{currentThemeObj.icon}</span>
            <span className="hidden sm:inline whitespace-nowrap">
              {currentThemeObj.shortLabel}
            </span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>

          {isThemeMenuOpen && (
            <div
              className="absolute right-0 top-11 w-64 p-2 rounded-2xl border shadow-2xl z-50 space-y-1.5 font-literary-sans text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-strong)',
                boxShadow: 'var(--shadow-warm)',
              }}
            >
              <div
                className="px-2 py-1 border-b text-[11px] font-bold"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                文学工作台色彩主题
              </div>

              {themes.map((t) => {
                const isSelected = themeSettings.theme === t.key;
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => {
                      setTheme(t.key);
                      setIsThemeMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition text-left cursor-pointer ${
                      isSelected
                        ? 'border shadow-2xs'
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
                        className="w-5 h-5 rounded-md flex items-center justify-center text-xs shrink-0 shadow-2xs"
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

        {/* 聚合工程中枢 */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => {
              const next = !isEngineeringMenuOpen;
              closeAllMenus();
              setIsEngineeringMenuOpen(next);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition cursor-pointer hover:opacity-90 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
            title="排版微调、出版导出、品牌定制、数据同步与模型配置"
          >
            <SlidersHorizontal
              className="w-3.5 h-3.5 shrink-0"
              style={{ color: 'var(--accent-primary)' }}
            />
            <span className="hidden md:inline whitespace-nowrap">工程中枢</span>
            <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
          </button>

          {isEngineeringMenuOpen && (
            <div
              className="absolute right-0 top-11 w-72 p-3 rounded-2xl border shadow-2xl z-50 space-y-3 font-literary-sans text-xs animate-in fade-in zoom-in-95 duration-150 backdrop-blur-xl"
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
                  <SlidersHorizontal
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <span>创制工程与系统设置</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsEngineeringMenuOpen(false)}
                  className="hover:opacity-75 cursor-pointer text-xs"
                  style={{ color: 'var(--text-muted)' }}
                >
                  关闭
                </button>
              </div>

              {/* 1. 排版微调模块 */}
              <div className="space-y-2">
                <div
                  className="text-[11px] font-bold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  正文字体与微排版
                </div>

                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFontFamily('serif')}
                    className={`flex-1 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      themeSettings.fontFamily === 'serif'
                        ? 'shadow-2xs text-white'
                        : 'hover:opacity-80'
                    }`}
                    style={
                      themeSettings.fontFamily === 'serif'
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)',
                          }
                        : {
                            borderColor: 'var(--border-subtle)',
                            backgroundColor: 'var(--bg-card)',
                          }
                    }
                  >
                    典雅宋体
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontFamily('sans')}
                    className={`flex-1 py-1 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      themeSettings.fontFamily === 'sans'
                        ? 'shadow-2xs text-white'
                        : 'hover:opacity-80'
                    }`}
                    style={
                      themeSettings.fontFamily === 'sans'
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)',
                          }
                        : {
                            borderColor: 'var(--border-subtle)',
                            backgroundColor: 'var(--bg-card)',
                          }
                    }
                  >
                    人文黑体
                  </button>
                </div>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: 'var(--text-muted)' }}>字号大小</span>
                    <span className="font-mono font-medium">
                      {themeSettings.fontSize}px
                    </span>
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
                    <span className="font-mono font-medium">
                      {themeSettings.lineHeight}
                    </span>
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
                  <span style={{ color: 'var(--text-muted)' }}>
                    段落首行缩进两字
                  </span>
                  <input
                    type="checkbox"
                    checked={themeSettings.paragraphIndent}
                    onChange={(e) => setParagraphIndent(e.target.checked)}
                    className="accent-amber-600 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>

              <div
                className="border-t pt-2 space-y-1.5"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div
                  className="text-[11px] font-bold"
                  style={{ color: 'var(--text-muted)' }}
                >
                  发布、品牌与系统工具
                </div>

                {onOpenExportStudio && (
                  <button
                    type="button"
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

                <button
                  type="button"
                  onClick={() => {
                    setIsBrandModalOpen(true);
                    setIsEngineeringMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-3.5 h-3.5 text-rose-500" />
                    <span>品牌视觉 VI 与朱砂印定制 ({brand.brandAuthor})</span>
                  </div>
                </button>

                <button
                  type="button"
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

                <button
                  type="button"
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
            <div
              className="flex items-center justify-between pb-3 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2 font-bold text-base">
                <BookOpen className="w-5 h-5 text-amber-500" />
                <span>全景功能工作区</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 font-literary-sans">
              {DOMAIN_GROUPS.map((group) => (
                <div key={group.key} className="space-y-2">
                  <div
                    className="flex items-center gap-1.5 text-xs font-bold"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <span>{group.icon}</span>
                    <span>{group.title}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {group.items.map((item) => {
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setActiveTab(item.id);
                            setIsMobileMenuOpen(false);
                          }}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition ${
                            isActive
                              ? 'border-amber-500 font-bold shadow-2xs'
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
                            <div className="text-xs truncate">
                              {item.shortTitle || item.title}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="pt-3 border-t grid grid-cols-3 gap-2 font-literary-sans text-xs"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveTab('VIDEO_STUDIO');
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-medium"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Video className="w-4 h-4 text-rose-500" />
                <span>分镜工坊</span>
              </button>

              {onOpenCommandPalette && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenCommandPalette();
                    setIsMobileMenuOpen(false);
                  }}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-medium"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>全局穿梭</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  onOpenSettings();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl border font-medium"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Settings className="w-4 h-4 text-blue-400" />
                <span>模型设置</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
