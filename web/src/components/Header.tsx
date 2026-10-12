// ==============================================================================
// 人文文学顶部全局导航栏 (Header Navigation & Typography Hub)
// 彻底去除同质化 AI 模版科技感，融入古雅文墨印章、多主题色彩切换与排版微调控台
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../context/NovelContext';
import { useTheme, AppTheme, FontFamily, ReaderWidth } from '../context/ThemeContext';
import {
  BookOpen,
  Sparkles,
  Settings,
  Download,
  Upload,
  RotateCcw,
  Feather,
  Users,
  Compass,
  Radar,
  Cable,
  CheckCircle2,
  RefreshCw,
  Library,
  Wand2,
  GitFork,
  Palette,
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
} from 'lucide-react';

export type NavTab =
  | 'LIBRARY'
  | 'ARCHITECT'
  | 'STUDIO'
  | 'OUTLINES'
  | 'CANVAS'
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
  const { novel, resetToSampleData, exportProjectJson, importProjectJson, syncFromBackend, settings: modelSettings } = useNovel();
  const {
    settings: themeSettings,
    setTheme,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setParagraphIndent,
    setReaderWidth,
  } = useTheme();

  const [showExportModal, setShowExportModal] = useState(false);
  const [showTypographyPopover, setShowTypographyPopover] = useState(false);
  const [showMoreNav, setShowMoreNav] = useState(false);
  const [importText, setImportText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncBackend = async () => {
    setIsSyncing(true);
    const ok = await syncFromBackend();
    setIsSyncing(false);
    if (ok) {
      alert('已成功同步后端最新数据（包含外部 Agent 提交的草稿与状态）！');
    } else {
      alert('未连接到本地后端 (http://localhost:8000)，保持前端独立运行。');
    }
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportProjectJson());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDoImport = () => {
    if (importProjectJson(importText)) {
      alert('项目数据成功导入！');
      setShowExportModal(false);
      setImportText('');
    } else {
      alert('数据解析失败，请检查 JSON 格式是否正确。');
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round((novel.currentWordCount / novel.targetWordCount) * 100)
  );

  return (
    <header
      className="border-b sticky top-0 z-40 px-3 sm:px-6 py-2.5 transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* 左侧：文人印章 Logo 与书名信息 */}
        <div className="flex items-center gap-3">
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
                {novel.genre}
              </span>
            </div>

            <p className="text-xs flex items-center gap-2 font-literary-sans" style={{ color: 'var(--text-muted)' }}>
              <span
                onClick={() => setActiveTab('LIBRARY')}
                className="font-medium cursor-pointer hover:underline transition truncate max-w-[120px] sm:max-w-xs"
              >
                {novel.title}
              </span>
              <span className="opacity-40 hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                {novel.currentWordCount.toLocaleString()} / {novel.targetWordCount.toLocaleString()} 字
              </span>
              <span className="opacity-40">•</span>
              <span style={{ color: 'var(--accent-primary)' }} className="font-semibold font-mono">
                {progressPercent}%
              </span>
            </p>
          </div>
        </div>

        {/* 中间主要功能 Tab 切换：分层次优雅排列，彻底告别平铺拥挤 */}
        <div className="hidden lg:flex items-center gap-2 font-literary-sans">
          {/* 核心视界工作区 */}
          <nav
            className="flex items-center p-1 rounded-xl border text-xs shadow-xs"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <button
              onClick={() => setActiveTab('STUDIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'STUDIO'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'hover:opacity-80'
              }`}
            >
              <Feather className="w-3.5 h-3.5" />
              <span>创作台</span>
            </button>

            <button
              onClick={() => setActiveTab('VIDEO_STUDIO')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'VIDEO_STUDIO'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'hover:opacity-80'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>分镜工坊</span>
            </button>

            <button
              onClick={() => setActiveTab('WORKFLOW')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'WORKFLOW'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'hover:opacity-80'
              }`}
            >
              <Cable className="w-3.5 h-3.5" />
              <span>流程编排</span>
            </button>

            <button
              onClick={() => setActiveTab('PROGRESS_PULSE')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'PROGRESS_PULSE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'hover:opacity-80'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>进度大盘</span>
            </button>

            <button
              onClick={() => setActiveTab('DUNGEONS')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'DUNGEONS'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'hover:opacity-80'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>副本推演</span>
            </button>

            {/* 构筑与研判下拉菜单 */}
            <div className="relative">
              <button
                onClick={() => setShowMoreNav(!showMoreNav)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg transition font-medium ${
                  [
                    'RELATIONS',
                    'TIMELINE',
                    'TENSION',
                    'FORESHADOWING',
                    'MAP',
                    'SANDBOX',
                    'EVOLUTION',
                    'PRODUCTIVITY',
                    'CLINIC',
                    'PLUGINS',
                  ].includes(activeTab)
                    ? 'bg-amber-600/20 text-amber-600 border border-amber-500/30 font-semibold'
                    : 'hover:opacity-80'
                }`}
              >
                <span>构筑研判</span>
                <ChevronDown className="w-3 h-3" />
              </button>

              {showMoreNav && (
                <div
                  className="absolute left-0 top-9 w-48 p-1.5 rounded-xl border shadow-xl z-50 space-y-1 font-literary-sans text-xs animate-in fade-in duration-100"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                  }}
                >
                  <button
                    onClick={() => {
                      setActiveTab('RELATIONS');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-500" />
                    <span>人物星图</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('TIMELINE');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <span>剧情编年</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('TENSION');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Activity className="w-3.5 h-3.5 text-rose-500" />
                    <span>张力心电图</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('FORESHADOWING');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Radar className="w-3.5 h-3.5 text-purple-500" />
                    <span>伏笔雷达</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('MAP');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Compass className="w-3.5 h-3.5 text-emerald-500" />
                    <span>地理舆图</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('SANDBOX');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <GitFork className="w-3.5 h-3.5 text-indigo-500" />
                    <span>平行沙盒</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('EVOLUTION');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>自我进化</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('PRODUCTIVITY');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span>能量看板</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('CLINIC');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Award className="w-3.5 h-3.5 text-yellow-500" />
                    <span>黄金三章</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('PLUGINS');
                      setShowMoreNav(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition"
                  >
                    <Layers className="w-3.5 h-3.5 text-teal-500" />
                    <span>配方工坊</span>
                  </button>
                </div>
              )}
            </div>
          </nav>

          {/* 全局实时 HUD 穿透快捷键：上帝视角 + 登场人物 */}
          <div className="flex items-center gap-1.5 border-l pl-2" style={{ borderColor: 'var(--border-subtle)' }}>
            {onOpenGodsEye && (
              <button
                onClick={onOpenGodsEye}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:border-amber-500/50 hover:bg-amber-500/10 transition"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                title="开启全景上帝视角 HUD (宏观危机倒计时与非视线势力)"
              >
                <Eye className="w-3.5 h-3.5 text-amber-500" />
                <span className="font-medium hidden xl:inline">上帝视角</span>
              </button>
            )}

            {onOpenInScene && (
              <button
                onClick={onOpenInScene}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs hover:border-indigo-500/50 hover:bg-indigo-500/10 transition"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                title="检视当前场次登场人物心理与暗线"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-medium hidden xl:inline">登场人物</span>
              </button>
            )}
          </div>
        </div>

        {/* 移动/平板端响应式工作区切换器 */}
        <div className="flex lg:hidden items-center gap-1.5">
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value as NavTab)}
            className="text-xs px-2.5 py-1.5 rounded-lg border font-literary-sans focus:outline-hidden"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <optgroup label="核心视界">
              <option value="STUDIO">✍️ 创作台</option>
              <option value="VIDEO_STUDIO">🎬 分镜工坊</option>
              <option value="WORKFLOW">⚡ 流程编排</option>
              <option value="PROGRESS_PULSE">📊 进度大盘</option>
              <option value="DUNGEONS">⚔️ 副本推演</option>
            </optgroup>
            <optgroup label="世界构筑">
              <option value="RELATIONS">🕸️ 人物星图</option>
              <option value="TIMELINE">⏳ 剧情编年</option>
              <option value="TENSION">📈 张力心电图</option>
              <option value="FORESHADOWING">🎯 伏笔雷达</option>
              <option value="MAP">🗺️ 地理舆图</option>
            </optgroup>
            <optgroup label="智能进化">
              <option value="SANDBOX">🔀 平行沙盒</option>
              <option value="EVOLUTION">🧬 自我进化</option>
              <option value="PRODUCTIVITY">🔥 能量看板</option>
              <option value="CLINIC">🏆 黄金三章</option>
              <option value="PLUGINS">🧩 配方工坊</option>
            </optgroup>
          </select>

          {onOpenGodsEye && (
            <button
              onClick={onOpenGodsEye}
              className="p-1.5 rounded-lg border text-amber-500"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="上帝视角"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}

          {onOpenInScene && (
            <button
              onClick={onOpenInScene}
              className="p-1.5 rounded-lg border text-indigo-400"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="登场人物"
            >
              <Users className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* 右侧工具快捷项 */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* 主题选择切换 */}
          <div className="flex items-center rounded-lg border p-0.5" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setTheme('ink')}
              title="古意宣纸 (Ink)"
              className={`p-1.5 rounded-md transition text-xs ${themeSettings.theme === 'ink' ? 'bg-amber-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
            >
              📜
            </button>
            <button
              onClick={() => setTheme('obsidian')}
              title="黑曜冷萃 (Obsidian)"
              className={`p-1.5 rounded-md transition text-xs ${themeSettings.theme === 'obsidian' ? 'bg-amber-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
            >
              🌌
            </button>
            <button
              onClick={() => setTheme('celadon')}
              title="秘色青釉 (Celadon)"
              className={`p-1.5 rounded-md transition text-xs ${themeSettings.theme === 'celadon' ? 'bg-amber-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
            >
              🍵
            </button>
            <button
              onClick={() => setTheme('pure')}
              title="北欧素雅 (Pure Alabaster)"
              className={`p-1.5 rounded-md transition text-xs ${themeSettings.theme === 'pure' ? 'bg-amber-600 text-white shadow-xs' : 'opacity-60 hover:opacity-100'}`}
            >
              🏛️
            </button>
          </div>

          {/* 排版微调弹出面板按钮 */}
          <div className="relative">
            <button
              onClick={() => setShowTypographyPopover(!showTypographyPopover)}
              className="p-2 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="文学排版与字体调节"
            >
              <Type className="w-4 h-4" />
            </button>

            {showTypographyPopover && (
              <div
                className="absolute right-0 top-11 w-64 p-4 rounded-2xl border shadow-xl z-50 space-y-3 font-literary-sans text-xs animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <div className="font-bold flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span>正文字体与排版微调</span>
                  <button onClick={() => setShowTypographyPopover(false)} className="hover:opacity-75">
                    关闭
                  </button>
                </div>

                <div>
                  <label className="block opacity-75 mb-1 font-semibold">字体家族</label>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setFontFamily('serif')}
                      className={`flex-1 py-1 rounded border ${themeSettings.fontFamily === 'serif' ? 'bg-amber-600 text-white' : ''}`}
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      典雅宋体
                    </button>
                    <button
                      onClick={() => setFontFamily('sans')}
                      className={`flex-1 py-1 rounded border ${themeSettings.fontFamily === 'sans' ? 'bg-amber-600 text-white' : ''}`}
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      人文黑体
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="opacity-75 font-semibold">字号大小</span>
                    <span className="font-mono">{themeSettings.fontSize}px</span>
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

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="opacity-75 font-semibold">行高行间距</span>
                    <span className="font-mono">{themeSettings.lineHeight}</span>
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
                  <span className="opacity-75 font-semibold">首行缩进两个字符</span>
                  <input
                    type="checkbox"
                    checked={themeSettings.paragraphIndent}
                    onChange={(e) => setParagraphIndent(e.target.checked)}
                    className="accent-amber-600 w-4 h-4 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 禅定模式 */}
          {onOpenZen && (
            <button
              onClick={onOpenZen}
              className="p-2 rounded-lg border hover:opacity-80 transition text-amber-500"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="进入作家禅定沉浸模式 (Zen Focus Mode)"
            >
              <Sparkles className="w-4 h-4" />
            </button>
          )}

          {/* 全局穿梭 (Cmd+K) */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              className="px-2.5 py-1.5 rounded-lg border hover:opacity-80 transition text-xs font-literary-sans flex items-center gap-1.5"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="全局穿梭指挥官 (Cmd+K)"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline font-mono">⌘K</span>
            </button>
          )}

          {/* 出版导出工坊 */}
          {onOpenExportStudio && (
            <button
              onClick={onOpenExportStudio}
              className="p-2 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="出版级排版导出工坊 (TXT / EPUB / Markdown)"
            >
              <Download className="w-4 h-4" />
            </button>
          )}

          {/* 同步后端 */}
          <button
            onClick={handleSyncBackend}
            disabled={isSyncing}
            className="p-2 rounded-lg border hover:opacity-80 transition"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            title="从后端同步数据"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>

          {/* 设置 */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg border hover:opacity-80 transition"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            title="模型与接口配置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
