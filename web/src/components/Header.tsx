// ==============================================================================
// 顶部全局导航栏 (Header Navigation)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../context/NovelContext';
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
} from 'lucide-react';

export type NavTab =
  | 'LIBRARY'
  | 'ARCHITECT'
  | 'STUDIO'
  | 'OUTLINES'
  | 'CANVAS'
  | 'CHARACTERS'
  | 'LORE'
  | 'FORESHADOWING'
  | 'MCP';

interface HeaderProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
}) => {
  const { novel, resetToSampleData, exportProjectJson, importProjectJson, syncFromBackend, settings } = useNovel();
  const [showExportModal, setShowExportModal] = useState(false);
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

  const handleExport = () => {
    setShowExportModal(true);
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
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* 左侧 Logo 与书名信息 */}
        <div className="flex items-center gap-3">
          <div 
            onClick={() => setActiveTab('LIBRARY')}
            className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-950/50 cursor-pointer hover:scale-105 transition"
            title="点击切换小说或查看作品库"
          >
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 
                onClick={() => setActiveTab('LIBRARY')}
                className="text-base font-bold text-slate-100 tracking-wide cursor-pointer hover:text-indigo-300 transition"
              >
                NovManager
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 font-medium">
                {novel.genre}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span 
                onClick={() => setActiveTab('LIBRARY')}
                className="text-slate-300 font-medium cursor-pointer hover:text-indigo-300 hover:underline transition"
                title="点击进入作品库切换"
              >
                {novel.title}
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="hidden sm:inline">已写 {novel.currentWordCount.toLocaleString()} / 目标 {novel.targetWordCount.toLocaleString()} 字</span>
              <span className="text-slate-600">•</span>
              <span className="text-indigo-400">{progressPercent}%</span>
            </p>
          </div>
        </div>

        {/* 中间主要功能 Tab 切换 (桌面端显示，移动端在底部) */}
        <nav className="hidden lg:flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80 text-xs xl:text-sm">
          <button
            onClick={() => setActiveTab('LIBRARY')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'LIBRARY'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Library className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            <span>作品库</span>
          </button>

          <button
            onClick={() => setActiveTab('ARCHITECT')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'ARCHITECT'
                ? 'bg-gradient-to-r from-amber-600 to-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                : 'text-amber-400/90 hover:text-amber-200 hover:bg-slate-800/60'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-amber-300" />
            <span>AI 创世</span>
          </button>

          <button
            onClick={() => setActiveTab('STUDIO')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'STUDIO'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Feather className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            <span>创作台</span>
          </button>

          <button
            onClick={() => setActiveTab('CHARACTERS')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'CHARACTERS'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            <span>人物档案</span>
          </button>

          <button
            onClick={() => setActiveTab('LORE')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'LORE'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            <span>世界观</span>
          </button>

          <button
            onClick={() => setActiveTab('FORESHADOWING')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'FORESHADOWING'
                ? 'bg-indigo-600 text-white font-medium shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Radar className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            <span>伏笔雷达</span>
          </button>

          <button
            onClick={() => setActiveTab('MCP')}
            className={`flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'MCP'
                ? 'bg-emerald-600 text-white font-medium shadow-md shadow-emerald-600/30'
                : 'text-emerald-400 hover:text-emerald-200 hover:bg-emerald-950/40'
            }`}
            title="查看标准 MCP 资源与工具接口"
          >
            <Cable className="w-3.5 h-3.5 xl:w-4 xl:h-4" />
            <span>MCP 接口</span>
          </button>
        </nav>

        {/* 右侧工具快捷项 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncBackend}
            disabled={isSyncing}
            className="p-2 text-slate-400 hover:text-indigo-300 hover:bg-slate-800 rounded-lg transition"
            title="从后端同步外部 Agent 最新写入的草稿与状态"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-indigo-400' : ''}`} />
          </button>

          <button
            onClick={handleExport}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
            title="导入/导出工程数据"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => {
              if (confirm('确定要将数据重置回预置演示小说《太虚纪元》吗？')) {
                resetToSampleData();
              }
            }}
            className="p-2 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition"
            title="重置回初始示范数据"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 rounded-lg transition"
            title="配置大模型 API Key 与供应商接口"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">模型设置</span>
            {settings.useMock ? (
              <span className="hidden xl:inline-block text-[10px] px-1.5 py-0.2 rounded bg-slate-900 text-slate-400 border border-slate-800">
                仿真
              </span>
            ) : (
              <span className="hidden xl:inline-flex items-center gap-1 text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  {settings.provider === 'deepseek'
                    ? 'DeepSeek'
                    : settings.provider === 'opencode'
                    ? 'OpenCode'
                    : 'API'}
                </span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 导入导出弹窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Download className="w-5 h-5 text-indigo-400" />
              <span>小说项目数据备份与导入</span>
            </h3>
            <p className="text-xs text-slate-400">
              包含完整的小说信息、世界观设定、人物卡与历史状态、卷章大纲和伏笔记录。
            </p>

            <div>
              <div className="flex justify-between items-center mb-1 text-xs">
                <span className="text-slate-300">当前项目完整 JSON 数据</span>
                <button
                  onClick={handleCopyJson}
                  className="text-indigo-400 hover:underline flex items-center gap-1"
                >
                  {copySuccess ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">复制成功！</span>
                    </>
                  ) : (
                    '复制到剪贴板'
                  )}
                </button>
              </div>
              <textarea
                readOnly
                value={exportProjectJson()}
                rows={6}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-300 focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="block text-xs font-medium text-slate-300 mb-1">
                粘贴 JSON 进行还原导入：
              </span>
              <textarea
                placeholder="在此粘贴导出的项目 JSON 字符串..."
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg"
              >
                关闭
              </button>
              <button
                onClick={handleDoImport}
                disabled={!importText.trim()}
                className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>立即导入并覆盖</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
