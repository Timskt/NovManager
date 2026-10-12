// ==============================================================================
// 作品库与多小说全屏管理视窗 (Novel Library View)
// 替代顶部弹窗，作为独立 Tab 提供完整作品书架、多书切换、空白新建与工程备份
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { NavTab } from '../Header';
import { BrandLogo, BrandSealBadge, useBrand } from '../BrandLogo';
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
  Award,
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
  const { brand, setIsBrandModalOpen } = useBrand();

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
    <div
      className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 space-y-6"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部专属品牌横幅概览 */}
        <div
          className="relative overflow-hidden rounded-2xl border p-6 sm:p-8 shadow-sm"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <BrandLogo size={46} />
                <div>
                  <div
                    className="flex items-center gap-2 font-bold text-xs tracking-wider uppercase"
                    style={{ color: 'var(--accent-primary)' }}
                  >
                    <Library className="w-3.5 h-3.5" />
                    <span>{brand.brandSubtitle}</span>
                    <BrandSealBadge />
                  </div>
                  <h2
                    className="text-2xl sm:text-3xl font-extrabold tracking-tight font-literary-serif mt-0.5"
                    style={{ color: 'var(--text-main)' }}
                  >
                    {brand.brandName} · 藏书阁与长篇企划总枢
                  </h2>
                </div>
              </div>
              <p
                className="text-xs sm:text-sm max-w-2xl leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {brand.brandSlogan}。每部作品均具备独立隔绝的世界观法则、L1-L4 防幻觉记忆锁、多模型接力路由与静默 Git 链上存证。
              </p>

              {/* 统计指标 + 品牌定制入口 */}
              <div className="flex flex-wrap items-center gap-3 pt-2 text-xs">
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <BookOpen className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                  <span>
                    已入库作品：<strong>{novelList.length}</strong> 部
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBrandModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 font-semibold transition cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>定制个人品牌 VI 与朱砂印 ({brand.brandAuthor})</span>
                </button>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>累计总创作：<strong>{totalLibraryWords.toLocaleString()}</strong> 字</span>
                </div>
                <div
                  className="flex items-center gap-1.5 px-3 py-1 rounded-lg border"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>当前激活：<strong style={{ color: 'var(--accent-primary)' }}>{novel.title}</strong></span>
                </div>
              </div>
            </div>

            {/* 核心快捷操作区 */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <button
                onClick={() => onNavigateTab('ARCHITECT')}
                className="px-4 py-2.5 rounded-xl text-white font-semibold text-xs shadow-md flex items-center gap-2 transition hover:scale-[1.02] active:scale-95"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>AI 创世构思新书</span>
              </button>

              <button
                onClick={() => setShowCreateBlank(!showCreateBlank)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition hover:scale-[1.02] active:scale-95 border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <Plus className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
                <span>新建空白作品</span>
              </button>

              <button
                onClick={() => setShowBackupPanel(!showBackupPanel)}
                className="px-3 py-2.5 rounded-xl text-xs transition border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
                title="数据备份与恢复"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* 新建空白小说展开卡片 */}
        {showCreateBlank && (
          <div
            className="rounded-2xl border p-6 shadow-lg animate-in fade-in slide-in-from-top-4 duration-200 space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>新建全新纯净小说</h3>
              </div>
              <button
                onClick={() => setShowCreateBlank(false)}
                className="text-xs hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                收起
              </button>
            </div>

            <form onSubmit={handleCreateBlankSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--text-main)' }}>
                    小说书名 <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="如：诡道求真录"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl p-2.5 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  />
                </div>

                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--text-main)' }}>作品题材 / 流派</label>
                  <select
                    value={newGenre}
                    onChange={(e) => setNewGenre(e.target.value)}
                    className="w-full rounded-xl p-2.5 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    {genres.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium mb-1" style={{ color: 'var(--text-main)' }}>目标总字数</label>
                  <select
                    value={newTargetWords}
                    onChange={(e) => setNewTargetWords(Number(e.target.value))}
                    className="w-full rounded-xl p-2.5 text-xs border outline-none focus:ring-1 focus:ring-indigo-500/50"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
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
                  className="px-4 py-2 rounded-xl text-xs transition border"
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
                  className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  创建并立即开始创作
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 备份与恢复展开卡片 */}
        {showBackupPanel && (
          <div
            className="rounded-2xl border p-6 shadow-lg space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>小说数据独立备份与 JSON 还原</h3>
              </div>
              <button
                onClick={() => setShowBackupPanel(false)}
                className="text-xs hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                收起
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium" style={{ color: 'var(--text-main)' }}>当前激活小说 JSON 导出：</span>
                  <button
                    onClick={handleCopyJson}
                    className="hover:underline flex items-center gap-1 font-medium"
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
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
              </div>

              <div className="space-y-2">
                <span className="font-medium block" style={{ color: 'var(--text-main)' }}>粘贴 JSON 进行还原覆盖：</span>
                <textarea
                  rows={5}
                  placeholder="在此粘贴导出的完整工程 JSON..."
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  className="w-full border rounded-xl p-3 font-mono text-[11px] focus:outline-none focus:ring-1"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
                <button
                  onClick={handleDoImport}
                  disabled={!importJsonText.trim()}
                  className="w-full py-2 disabled:opacity-40 text-white font-medium rounded-xl flex items-center justify-center gap-1.5 transition shadow-sm"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
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
            <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <BookOpen className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span>全部作品卡片 ({novelList.length})</span>
            </h3>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>点击任意作品即可直接切换并进入工作台</span>
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
                      ? 'shadow-md ring-1'
                      : 'hover:border-opacity-80'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    borderColor: isActive ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  {/* 顶部激活标签与流派 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
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
                        <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
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
                          className="p-1 transition hover:text-rose-500"
                          style={{ color: 'var(--text-faint)' }}
                          title="删除此小说"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* 标题 */}
                    <h4 className="text-base font-bold transition line-clamp-1 mb-1 font-serif" style={{ color: 'var(--text-main)' }}>
                      {item.title}
                    </h4>

                    {/* 统计指标 */}
                    <div className="flex items-center gap-3 text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                        <span>{item.currentWordCount.toLocaleString()} 字</span>
                      </span>
                      <span style={{ color: 'var(--border-strong)' }}>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" style={{ color: 'var(--text-faint)' }} />
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {/* 进度条 */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span>创作进度</span>
                        <span className="font-medium" style={{ color: 'var(--accent-primary)' }}>{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-card)' }}>
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${percent}%`,
                            backgroundColor: 'var(--accent-primary)',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* 底部快捷操作 */}
                  <div className="mt-5 pt-3 border-t flex items-center gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                    {isActive ? (
                      <>
                        <button
                          onClick={() => onNavigateTab('STUDIO')}
                          className="flex-1 py-1.5 px-2 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1 shadow-sm transition"
                          style={{ backgroundColor: 'var(--accent-primary)' }}
                        >
                          <Feather className="w-3.5 h-3.5" />
                          <span>写正文</span>
                        </button>
                        <button
                          onClick={() => onNavigateTab('STUDIO')}
                          className="flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1 transition border"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-main)',
                          }}
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
                        className="w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition border"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-main)',
                        }}
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
