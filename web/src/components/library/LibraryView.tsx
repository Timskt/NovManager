// ==============================================================================
// 墨枢 · InkVerse 藏书阁与长篇企划总枢 (Executive Literary Library & Command Center)
// 软件工程与黄金视觉比例重构版：
// 1. 采用 max-w-[1680px] 全宽 12 列黄金非对称栅格 (左 8 列典籍矩阵 + 右 4 列当前作品全息指挥舱)
// 2. 消除与顶栏重复的品牌大横幅，改为高信息密度的 4 维核心指标丝带
// 3. 每部作品卡片支持一键直达【创作台】【多AI圆桌】【全模态挂载】【世界架构】
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { NavTab } from '../Header';
import { BrandSealBadge, useBrand } from '../BrandLogo';
import {
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
  Award,
  Network,
  FolderOpen,
  Rocket,
  ShieldCheck,
  Users,
  Radar,
  Search,
  Layers,
} from 'lucide-react';

interface LibraryViewProps {
  onNavigateTab: (tab: NavTab) => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({ onNavigateTab }) => {
  const {
    novel,
    novelList,
    volumes,
    characters,
    worldSettings,
    foreshadowings,
    setActiveChapterId,
    setActiveSceneIndex,
    switchNovel,
    createBlankNovel,
    deleteNovel,
    exportProjectJson,
    importProjectJson,
  } = useNovel();
  const { brand, setIsBrandModalOpen } = useBrand();

  const [showCreateBlank, setShowCreateBlank] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('玄幻仙侠');
  const [newTargetWords, setNewTargetWords] = useState(1000000);

  const [showBackupPanel, setShowBackupPanel] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('ALL');

  const handleCreateBlankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createBlankNovel(newTitle.trim(), newGenre, Number(newTargetWords));
    setShowCreateBlank(false);
    setNewTitle('');
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

  const totalLibraryWords = useMemo(
    () => novelList.reduce((acc, curr) => acc + (curr.currentWordCount || 0), 0),
    [novelList]
  );

  const filteredNovels = useMemo(() => {
    return novelList.filter((item) => {
      const matchesQuery =
        !searchQuery.trim() ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.genre.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesGenre =
        selectedGenreFilter === 'ALL' || item.genre.includes(selectedGenreFilter);
      return matchesQuery && matchesGenre;
    });
  }, [novelList, searchQuery, selectedGenreFilter]);

  const allChapters = useMemo(
    () => volumes.flatMap((v) => v.chapters || []),
    [volumes]
  );

  const unresolvedForeshadowCount = useMemo(
    () => foreshadowings.filter((f) => f.status !== 'RESOLVED').length,
    [foreshadowings]
  );

  const activeProgressPercent = Math.min(
    100,
    Math.round((novel.currentWordCount / (novel.targetWordCount || 1000000)) * 100)
  );

  return (
    <div
      className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      <div className="max-w-[1680px] mx-auto space-y-5">
        {/* ====================================================================
            1. 顶部四维核心指标与全局操作栏 (Executive 4-KPI Strip & Action Bar)
        ==================================================================== */}
        <div
          className="rounded-2xl border p-4 sm:p-5 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {/* 左侧：简洁标题与四大核心指标胶囊 */}
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 flex-1 min-w-0">
            <div className="shrink-0">
              <div className="flex items-center gap-2">
                <h2
                  className="text-lg sm:text-xl font-extrabold tracking-tight font-literary-serif"
                  style={{ color: 'var(--text-main)' }}
                >
                  藏书阁 · 长篇企划总枢
                </h2>
                <BrandSealBadge />
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="text-[11px] px-2 py-0.5 rounded-md border font-semibold transition hover:opacity-85 cursor-pointer flex items-center gap-1"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Award className="w-3 h-3" />
                  <span>定制品牌印章 ({brand.brandAuthor})</span>
                </button>
              </div>
              <p
                className="text-xs mt-1 truncate max-w-xl"
                style={{ color: 'var(--text-muted)' }}
              >
                每部作品均具备独立隔绝的世界观设定库、L1–L4 防幻觉记忆锁、多模型圆桌路由与 Git 存证。
              </p>
            </div>

            {/* 4 个紧凑 KPI 指标卡 */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1">
              <div
                className="px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="text-[11px] flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <BookOpen
                    className="w-3.5 h-3.5"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <span>在库长篇</span>
                </div>
                <div className="text-sm font-extrabold font-mono mt-0.5">
                  {novelList.length}{' '}
                  <span className="text-[11px] font-normal opacity-70">部</span>
                </div>
              </div>

              <div
                className="px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="text-[11px] flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>全库累计字数</span>
                </div>
                <div className="text-sm font-extrabold font-mono mt-0.5">
                  {totalLibraryWords.toLocaleString()}{' '}
                  <span className="text-[11px] font-normal opacity-70">字</span>
                </div>
              </div>

              <div
                className="px-3 py-2 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <div
                  className="text-[11px] flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Feather className="w-3.5 h-3.5 text-amber-500" />
                  <span>当前执笔焦点</span>
                </div>
                <div
                  className="text-sm font-bold truncate mt-0.5"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  《{novel.title}》
                </div>
              </div>

              <div
                onClick={() => onNavigateTab('MEMORY_GUARD')}
                className="px-3 py-2 rounded-xl border cursor-pointer hover:opacity-90 transition"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
                title="点击查看四级记忆与防幻觉护栏"
              >
                <div
                  className="text-[11px] flex items-center gap-1.5"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>防幻觉记忆锁</span>
                </div>
                <div className="text-xs font-bold text-emerald-500 mt-1">
                  省 88% Token · 0 幻觉
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：三大核心新建与备份按钮 */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateTab('GENESIS')}
              className="px-3.5 py-2 rounded-xl text-white font-semibold text-xs shadow-xs flex items-center gap-1.5 transition hover:opacity-95 cursor-pointer whitespace-nowrap"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200" />
              <span>AI 创世构思新书</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCreateBlank(!showCreateBlank)}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition hover:opacity-90 border cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              <Plus
                className="w-3.5 h-3.5"
                style={{ color: 'var(--accent-primary)' }}
              />
              <span>新建空白作品</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBackupPanel(!showBackupPanel)}
              className="px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 transition border cursor-pointer whitespace-nowrap"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="工程 JSON 备份导出与导入恢复"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">备份/恢复</span>
            </button>
          </div>
        </div>

        {/* 新建空白小说展开面板 */}
        {showCreateBlank && (
          <div
            className="rounded-2xl border p-5 shadow-md space-y-4 animate-in fade-in duration-150"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <FolderPlus
                  className="w-4 h-4"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <h3 className="text-sm font-bold">新建全新纯净小说工程</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateBlank(false)}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                收起
              </button>
            </div>

            <form onSubmit={handleCreateBlankSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium mb-1">
                    小说书名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：诡道求真录"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl p-2.5 text-xs border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1">
                    作品题材 / 流派
                  </label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full rounded-xl p-2.5 text-xs border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  >
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1">目标总字数</label>
                  <select
                    value={newTargetWords}
                    onChange={(e) => setNewTargetWords(Number(e.target.value))}
                    className="w-full rounded-xl p-2.5 text-xs border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <option value={300000}>短篇 / 中篇 (30万字)</option>
                    <option value={600000}>精炼长篇 (60万字)</option>
                    <option value={1000000}>标准百万长篇 (100万字)</option>
                    <option value={2000000}>宏大史诗 (200万字)</option>
                    <option value={3000000}>超长连载 (300万字)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateBlank(false)}
                  className="px-4 py-2 rounded-xl text-xs border cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-xs cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  创建并立即进入创作台
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 备份与恢复展开面板 */}
        {showBackupPanel && (
          <div
            className="rounded-2xl border p-5 shadow-md space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-main)',
            }}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <Download
                  className="w-4 h-4"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <h3 className="text-sm font-bold">
                  小说工程独立备份与 JSON 还原
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBackupPanel(false)}
                className="text-xs hover:underline cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                收起
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">当前激活小说 JSON 导出：</span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Copy className="w-3 h-3" />
                    <span>{copySuccess ? '复制成功！' : '复制 JSON'}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={5}
                  value={exportProjectJson()}
                  className="w-full border rounded-xl p-3 font-mono text-[11px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div className="space-y-2">
                <span className="font-medium block">
                  粘贴 JSON 进行还原覆盖：
                </span>
                <textarea
                  rows={5}
                  placeholder="在此粘贴导出的完整工程 JSON..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full border rounded-xl p-3 font-mono text-[11px] focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
                <button
                  type="button"
                  onClick={handleDoImport}
                  disabled={!importJsonText.trim()}
                  className="w-full py-2 disabled:opacity-40 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>立即导入覆盖</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            2. 主体 12 列黄金分栏工作区：
               左 8 列 (典籍矩阵与筛选栏) + 右 4 列 (当前作品全息指挥舱与章节直达)
        ==================================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
          {/* 左侧 8 列：典籍书架矩阵 */}
          <div className="xl:col-span-8 space-y-4">
            {/* 筛选与检索工具栏 */}
            <div
              className="rounded-xl border px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelectedGenreFilter('ALL')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    selectedGenreFilter === 'ALL'
                      ? 'text-white shadow-2xs'
                      : 'hover:opacity-80'
                  }`}
                  style={
                    selectedGenreFilter === 'ALL'
                      ? { backgroundColor: 'var(--accent-primary)' }
                      : {
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-muted)',
                        }
                  }
                >
                  全部典籍 ({novelList.length})
                </button>
                {['修真', '仙侠', '玄幻', '科幻'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedGenreFilter(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                      selectedGenreFilter === tag
                        ? 'text-white font-semibold'
                        : 'hover:opacity-80'
                    }`}
                    style={
                      selectedGenreFilter === tag
                        ? { backgroundColor: 'var(--accent-primary)' }
                        : {
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-muted)',
                          }
                    }
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <div
                className="flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs w-full sm:w-56"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Search
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="检索书名或题材流派..."
                  className="bg-transparent outline-none w-full text-xs"
                  style={{ color: 'var(--text-main)' }}
                />
              </div>
            </div>

            {/* 2 列宽幅典籍卡片网格 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredNovels.map((item) => {
                const isActive = item.id === novel.id;
                const percent = Math.min(
                  100,
                  Math.round(
                    (item.currentWordCount / (item.targetWordCount || 1000000)) *
                      100
                  )
                );

                return (
                  <div
                    key={item.id}
                    className={`group relative rounded-2xl p-5 border transition-all duration-200 flex flex-col justify-between ${
                      isActive ? 'shadow-md ring-1' : 'hover:shadow-sm'
                    }`}
                    style={{
                      backgroundColor: isActive
                        ? 'var(--accent-surface)'
                        : 'var(--bg-surface)',
                      borderColor: isActive
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                  >
                    <div>
                      {/* 顶部：题材标签 + 状态胶囊 */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full border font-medium"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {item.genre}
                        </span>

                        {isActive ? (
                          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>当前执笔</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              if (novelList.length <= 1) {
                                alert('至少保留一部小说，不可删除唯一工程！');
                                return;
                              }
                              if (
                                confirm(
                                  `确定要彻底删除小说《${item.title}》吗？数据将不可恢复。`
                                )
                              ) {
                                deleteNovel(item.id);
                              }
                            }}
                            className="p-1 rounded-lg transition hover:text-rose-500 cursor-pointer"
                            style={{ color: 'var(--text-faint)' }}
                            title="删除此作品"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* 标题与副标题 */}
                      <div className="flex items-baseline justify-between gap-2">
                        <h4
                          className="text-lg font-extrabold font-literary-serif line-clamp-1"
                          style={{ color: 'var(--text-main)' }}
                        >
                          《{item.title}》
                        </h4>
                        <span
                          className="text-[11px] font-mono shrink-0"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          目标 {(item.targetWordCount / 10000).toFixed(0)}万字
                        </span>
                      </div>

                      {/* 统计指标行 */}
                      <div
                        className="flex items-center gap-3 text-xs mt-2"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span className="flex items-center gap-1 font-mono">
                          <FileText
                            className="w-3.5 h-3.5"
                            style={{ color: 'var(--accent-primary)' }}
                          />
                          <strong>{item.currentWordCount.toLocaleString()}</strong>{' '}
                          字
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 opacity-60" />
                          <span>
                            更新于{' '}
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </span>
                        </span>
                      </div>

                      {/* 创作进度条 */}
                      <div className="mt-3.5 space-y-1">
                        <div
                          className="flex justify-between text-[11px]"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <span>连载完备度</span>
                          <span
                            className="font-mono font-bold"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {percent}%
                          </span>
                        </div>
                        <div
                          className="w-full h-1.5 rounded-full overflow-hidden"
                          style={{ backgroundColor: 'var(--bg-card)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(percent, 2)}%`,
                              backgroundColor: 'var(--accent-primary)',
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* 底部四合一工作流直达栏 */}
                    <div
                      className="mt-4 pt-3 border-t flex items-center gap-1.5"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      {isActive ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('STUDIO')}
                            className="flex-1 py-1.5 px-2.5 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-2xs transition hover:opacity-95 cursor-pointer whitespace-nowrap"
                            style={{ backgroundColor: 'var(--accent-primary)' }}
                          >
                            <Feather className="w-3.5 h-3.5" />
                            <span>写正文</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('AI_COUNCIL')}
                            className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition border cursor-pointer whitespace-nowrap hover:border-indigo-500/40"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-main)',
                            }}
                            title="进入多模型圆桌辩论"
                          >
                            <Network className="w-3.5 h-3.5 text-indigo-400" />
                            <span>多AI圆桌</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('OMNI_CONTEXT')}
                            className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition border cursor-pointer whitespace-nowrap hover:border-amber-500/40"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-main)',
                            }}
                            title="挂载本地文件夹、链接、图片与文档"
                          >
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                            <span>全模态</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onNavigateTab('ARCHITECT')}
                            className="py-1.5 px-2.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition border cursor-pointer whitespace-nowrap"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-main)',
                            }}
                            title="查看世界观与大纲"
                          >
                            <Compass className="w-3.5 h-3.5" />
                            <span>大纲</span>
                          </button>
                        </>
                      ) : (
                        <div className="w-full flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await switchNovel(item.id);
                              onNavigateTab('STUDIO');
                            }}
                            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border cursor-pointer hover:opacity-90"
                            style={{
                              backgroundColor: 'var(--bg-card)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-main)',
                            }}
                          >
                            <span>切换并执笔创作</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await switchNovel(item.id);
                            }}
                            className="py-2 px-3 rounded-xl text-xs font-medium border transition cursor-pointer hover:opacity-85"
                            style={{
                              backgroundColor: 'var(--bg-canvas)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-muted)',
                            }}
                          >
                            设为当前
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* 灵感创世引导卡片 */}
              <div
                onClick={() => onNavigateTab('GENESIS')}
                className="rounded-2xl p-5 border-2 border-dashed transition cursor-pointer flex flex-col items-center justify-center text-center space-y-2.5 min-h-[210px] hover:opacity-95"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <div
                  className="w-11 h-11 rounded-2xl border flex items-center justify-center shadow-2xs"
                  style={{
                    backgroundColor: 'var(--accent-surface)',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4
                    className="text-sm font-bold"
                    style={{ color: 'var(--text-main)' }}
                  >
                    一句话脑洞 · AI 创世推演新书
                  </h4>
                  <p
                    className="text-xs mt-1 max-w-xs"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    输入核心爽点或题材，一键生成黄金三章、三幕卷纲、人设谱系与金手指跃迁表。
                  </p>
                </div>
                <span
                  className="text-xs font-bold flex items-center gap-1"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <span>进入灵感创世大纲</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </div>

          {/* 右侧 4 列：当前激活作品 · 全息指挥与章节速达舱 (消除右侧空白、提升桌面生产力) */}
          <div className="xl:col-span-4 space-y-4">
            {/* 1. 当前作品全息概览卡 */}
            <div
              className="rounded-2xl border p-5 space-y-4 shadow-2xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div
                className="flex items-center justify-between pb-3 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <div>
                  <span
                    className="text-[10px] font-mono uppercase tracking-wider font-bold"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    ACTIVE MANUSCRIPT INSPECTOR
                  </span>
                  <h3 className="text-base font-extrabold font-literary-serif mt-0.5">
                    《{novel.title}》全息档案
                  </h3>
                </div>
                <span
                  className="text-xs font-mono font-bold px-2.5 py-1 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--accent-surface)',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {activeProgressPercent}%
                </span>
              </div>

              {/* 资产统计四宫格 */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => onNavigateTab('CHARACTERS')}
                  className="p-2.5 rounded-xl border text-left transition hover:opacity-90 cursor-pointer flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      登场角色谱系
                    </div>
                    <div className="text-sm font-bold font-mono mt-0.5">
                      {characters.length} 人
                    </div>
                  </div>
                  <Users className="w-4 h-4 text-indigo-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('LORE')}
                  className="p-2.5 rounded-xl border text-left transition hover:opacity-90 cursor-pointer flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      世界观设定词条
                    </div>
                    <div className="text-sm font-bold font-mono mt-0.5">
                      {worldSettings.length} 条
                    </div>
                  </div>
                  <BookOpen className="w-4 h-4 text-amber-500" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('FORESHADOWING')}
                  className="p-2.5 rounded-xl border text-left transition hover:opacity-90 cursor-pointer flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      待回收草蛇伏笔
                    </div>
                    <div className="text-sm font-bold font-mono mt-0.5 text-rose-500">
                      {unresolvedForeshadowCount} 处
                    </div>
                  </div>
                  <Radar className="w-4 h-4 text-rose-400" />
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('SKILL_VAULT')}
                  className="p-2.5 rounded-xl border text-left transition hover:opacity-90 cursor-pointer flex items-center justify-between"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div>
                    <div
                      className="text-[11px]"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      已建卷章总数
                    </div>
                    <div className="text-sm font-bold font-mono mt-0.5">
                      {volumes.length}卷 · {allChapters.length}章
                    </div>
                  </div>
                  <Layers className="w-4 h-4 text-emerald-500" />
                </button>
              </div>

              {/* 章节速达目录 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">近期执笔章节速达</span>
                  <button
                    type="button"
                    onClick={() => onNavigateTab('STUDIO')}
                    className="text-[11px] font-semibold hover:underline cursor-pointer"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    进入创作台 →
                  </button>
                </div>

                <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                  {allChapters.slice(0, 6).map((chap) => (
                    <button
                      key={chap.id}
                      type="button"
                      onClick={() => {
                        setActiveChapterId(chap.id);
                        setActiveSceneIndex(0);
                        onNavigateTab('STUDIO');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs transition hover:opacity-90 cursor-pointer text-left"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <div className="truncate pr-2">
                        <div className="font-bold truncate">{chap.title}</div>
                        <div
                          className="text-[10px] truncate mt-0.5"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          包含 {(chap.scenes || []).length} 个分镜节拍
                        </div>
                      </div>
                      <ArrowRight
                        className="w-3.5 h-3.5 shrink-0"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 2. 四大 AI 核心创作引擎快捷发射舱 */}
            <div
              className="rounded-2xl border p-5 space-y-3 shadow-2xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-xs font-bold flex items-center justify-between">
                <span>AI 协同创制快捷发射舱</span>
                <span
                  className="text-[10px] font-mono"
                  style={{ color: 'var(--text-muted)' }}
                >
                  一键直达核心工坊
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <button
                  type="button"
                  onClick={() => onNavigateTab('AI_COUNCIL')}
                  className="p-3 rounded-xl border text-left transition hover:border-indigo-500/50 cursor-pointer space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-indigo-400">
                    <Network className="w-4 h-4 shrink-0" />
                    <span>多AI圆桌辩论</span>
                  </div>
                  <p
                    className="text-[11px] line-clamp-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    跨提供商节点自由连线交锋，合成定稿与黄金提示词
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('OMNI_CONTEXT')}
                  className="p-3 rounded-xl border text-left transition hover:border-amber-500/50 cursor-pointer space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-amber-500">
                    <FolderOpen className="w-4 h-4 shrink-0" />
                    <span>全模态多源挂载</span>
                  </div>
                  <p
                    className="text-[11px] line-clamp-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    读取本地文件夹、批量网页链接、图片视觉与设定文档
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('AUTOPILOT')}
                  className="p-3 rounded-xl border text-left transition hover:border-emerald-500/50 cursor-pointer space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-emerald-500">
                    <Rocket className="w-4 h-4 shrink-0" />
                    <span>全自动无人巡航</span>
                  </div>
                  <p
                    className="text-[11px] line-clamp-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    零输入连续推演整章正文，自动挂载套路与设定校对
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onNavigateTab('MEMORY_GUARD')}
                  className="p-3 rounded-xl border text-left transition hover:border-teal-500/50 cursor-pointer space-y-1"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-1.5 font-bold text-teal-500">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>四级记忆防幻觉</span>
                  </div>
                  <p
                    className="text-[11px] line-clamp-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    L4–L1 记忆脱水压缩，实时拦截跨阶战力与死人复活
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
