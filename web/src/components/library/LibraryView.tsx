// ==============================================================================
// 作品库与多小说全屏管理视窗 (Novel Library View)
// 替代顶部弹窗，作为独立 Tab 提供完整作品书架、多书切换、空白新建与工程备份
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { NavTab } from '../Header';
import {
  Library,
  BookOpen,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  ArrowRight,
  Download,
  Upload,
  Feather,
  Compass,
  Copy,
  FolderPlus,
  BarChart3,
} from 'lucide-react';

interface LibraryViewProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onNavigateTab }) => {
  const {
    novel,
    novelList,
    switchNovel,
    createBlankNovel,
    deleteNovel,
    exportProjectJson,
    importProjectJson,
  } = useNovel();

  const [showCreateBlank, setShowCreateBlank] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('玄幻仙侠');
  const [newTargetWords, setNewTargetWords] = useState(1000000);

  // 备份导入控制
  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCreateBlankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createBlankNovel(newTitle.trim(), newGenre, Number(newTargetWords));
    setShowCreateBlank(false);
    setNewTitle('');
    // 切换至写作台
    onNavigateTab('STUDIO');
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(exportProjectJson());
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleDoImport = () => {
    if (!importJsonText.trim()) return;
    if (importProjectJson(importJsonText)) {
      alert('项目数据导入成功！');
      setImportJsonText('');
      setShowBackupPanel(false);
    } else {
      alert('导入失败，请检查 JSON 格式是否完整有效。');
    }
  };

  const genres = [
    '玄幻仙侠',
    '赛博修真',
    '规则怪谈',
    '科幻未来',
    '都市异能',
    '历史架空',
    '西方奇幻',
    '悬疑惊悚',
    '游戏无限',
  ];

  // 计算全局总字数
  const totalLibraryWords = novelList.reduce((acc, curr) => acc + (curr.currentWordCount || 0), 0);

  return (
    <div className="flex-1 overflow-y-auto bg-slate-950 p-4 sm:p-6 md:p-8 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部横幅概览 */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-medium text-xs tracking-wider uppercase">
                <Library className="w-4 h-4" />
                <span>作品库中心 / Novel Studio Hub</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight">
                我的小说作品书架
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
                管理您的所有长篇企划。每部小说拥有独立隔绝的世界观法则、人物卡与动态状态机、卷章大纲与伏笔线索。
              </p>

              {/* 统计指标 */}
              <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                  <span>已入库作品：<strong className="text-white">{novelList.length}</strong> 部</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>累计总创作：<strong className="text-white">{totalLibraryWords.toLocaleString()}</strong> 字</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800/80 border border-slate-700/60">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>当前激活：<strong className="text-indigo-300">{novel.title}</strong></span>
                </div>
              </div>
            </div>

            {/* 核心快捷操作区 */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <button
                onClick={() => onNavigateTab('ARCHITECT')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-950 flex items-center gap-2 transition hover:scale-[1.02] active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>AI 创世构思新书</span>
              </button>

              <button
                onClick={() => setShowCreateBlank(!showCreateBlank)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs flex items-center gap-2 transition hover:scale-[1.02] active:scale-95"
              >
                <Plus className="w-4 h-4 text-indigo-400" />
                <span>新建空白作品</span>
              </button>

              <button
                onClick={() => setShowBackupPanel(!showBackupPanel)}
                className="px-3 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition"
                title="数据备份与恢复"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 新建空白小说展开卡片 */}
        {showCreateBlank && (
          <div className="rounded-2xl bg-slate-900 border border-indigo-700/40 p-6 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">新建全新纯净小说</h3>
              </div>
              <button
                onClick={() => setShowCreateBlank(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                收起
              </button>
            </div>

            <form onSubmit={handleCreateBlankSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    小说书名 <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：诡道求真录"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">作品题材 / 流派</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">目标总字数</label>
                  <select
                    value={newTargetWords}
                    onChange={(e) => setNewTargetWords(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value={300000}>短篇 / 中篇 (30万字)</option>
                    <option value={600000}>精炼长篇 (60万字)</option>
                    <option value={1000000}>标准百万长篇 (100万字)</option>
                    <option value={2000000}>宏大史诗 (200万字)</option>
                    <option value={3000000}>超长连载 (300万字)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateBlank(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white transition"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-900 transition"
                >
                  创建并立即开始创作
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 备份与恢复展开卡片 */}
        {showBackupPanel && (
          <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">小说数据独立备份与 JSON 还原</h3>
              </div>
              <button
                onClick={() => setShowBackupPanel(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                收起
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">当前激活小说 JSON 导出：</span>
                  <button
                    onClick={handleCopyJson}
                    className="text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copySuccess ? '复制成功！' : '复制 JSON'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={5}
                  value={exportProjectJson()}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-slate-300 text-[11px] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <span className="text-slate-300 font-medium block">粘贴 JSON 进行还原覆盖：</span>
                <textarea
                  rows={5}
                  placeholder="在此粘贴导出的完整工程 JSON..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-slate-200 text-[11px] placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  onClick={handleDoImport}
                  disabled={!importJsonText.trim()}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>立即导入覆盖</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 小说卡片网格列表 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>全部作品卡片 ({novelList.length})</span>
            </h3>
            <span className="text-xs text-slate-500">点击任意作品即可直接切换并进入工作台</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {novelList.map((item) => {
              const isActive = item.id === novel.id;
              const percent = Math.min(
                100,
                Math.round((item.currentWordCount / (item.targetWordCount || 1000000)) * 100)
              );

              return (
                <div
                  key={item.id}
                  className={`group relative rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                    isActive
                      ? 'bg-slate-900/90 border-indigo-500/80 shadow-lg shadow-indigo-950/40 ring-1 ring-indigo-500/50'
                      : 'bg-slate-900/50 hover:bg-slate-900 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* 顶部激活标签与流派 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                        {item.genre}
                      </span>
                      {isActive ? (
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>正在创作</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (novelList.length <= 1) {
                              alert('至少保留一部小说，不可删除唯一工程！');
                              return;
                            }
                            if (confirm(`确定要彻底删除小说《${item.title}》吗？数据将不可恢复。`)) {
                              deleteNovel(item.id);
                            }
                          }}
                          className="p-1 text-slate-600 hover:text-rose-400 transition"
                          title="删除此小说"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 标题 */}
                    <h4 className="text-base font-bold text-slate-100 group-hover:text-indigo-300 transition line-clamp-1 mb-1">
                      {item.title}
                    </h4>

                    {/* 统计指标 */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-2">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-500" />
                        <span>{item.currentWordCount.toLocaleString()} 字</span>
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[11px] text-slate-400">
                        <span>创作进度</span>
                        <span className="text-indigo-400 font-medium">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full transition-all duration-300"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 底部快捷操作 */}
                  <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                    {isActive ? (
                      <>
                        <button
                          onClick={() => onNavigateTab('STUDIO')}
                          className="flex-1 py-1.5 px-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition"
                        >
                          <Feather className="w-3.5 h-3.5" />
                          <span>写正文</span>
                        </button>
                        <button
                          onClick={() => onNavigateTab('STUDIO')}
                          className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition"
                          title="进入工作台查看大纲目录与分镜"
                        >
                          <Compass className="w-3.5 h-3.5" />
                          <span>看大纲</span>
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={async () => {
                          await switchNovel(item.id);
                          onNavigateTab('STUDIO');
                        }}
                        className="w-full py-2 px-3 bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                      >
                        <span>切换并进入创作</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* 快速新建引导卡片 */}
            <div
              onClick={() => onNavigateTab('ARCHITECT')}
              className="rounded-2xl p-6 border-2 border-dashed border-indigo-900/50 hover:border-amber-500/50 bg-indigo-950/10 hover:bg-amber-950/10 transition cursor-pointer flex flex-col items-center justify-center text-center space-y-3 min-h-[220px]"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-inner">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">没有头绪？呼叫 AI 架构师</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                  与大模型深入脑暴探讨，一键推演全书世界观、角色与三幕大纲。
                </p>
              </div>
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <span>进入创世工坊</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
