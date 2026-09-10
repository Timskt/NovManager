// ==============================================================================
// 文风润色技法资产库与复用中心模态框 (Technique Repository & Reuse Modal)
// 沉淀全书采纳合入的高光修辞与文学技法，提供分类统计热度，并支持勾选复用至后续润色
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { PolishTechnique } from '../../types/novel';
import {
  Sparkles,
  X,
  Flame,
  CheckSquare,
  Square,
  Search,
  Check,
  Zap,
  Tag,
  BarChart3,
  BookmarkCheck,
  RefreshCw,
} from 'lucide-react';

interface TechniqueRepositoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerPolishWithSelected?: (techniques: PolishTechnique[]) => void;
}

export const TechniqueRepositoryModal: React.FC<TechniqueRepositoryModalProps> = ({
  isOpen,
  onClose,
  onTriggerPolishWithSelected,
}) => {
  const {
    novel,
    savedPolishTechniques,
    techniqueStats,
    selectedTechniquesForReuse,
    toggleReuseTechnique,
    clearReuseTechniques,
    fetchPolishTechniques,
    fetchTechniqueStats,
    runStylistPolish,
  } = useNovel();

  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 刷新技法数据
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchPolishTechniques(novel.id);
      await fetchTechniqueStats(novel.id);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 全量分类列表
  const categories = useMemo(() => {
    const set = new Set<string>();
    savedPolishTechniques.forEach((t) => {
      if (t.categoryLabel) set.add(t.categoryLabel);
    });
    return ['ALL', ...Array.from(set)];
  }, [savedPolishTechniques]);

  // 过滤后的技法列表
  const filteredTechniques = useMemo(() => {
    return savedPolishTechniques.filter((t) => {
      const matchCat =
        selectedCategory === 'ALL' || t.categoryLabel === selectedCategory;
      const matchSearch =
        !searchKeyword ||
        t.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        t.description.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        (t.applicableScene &&
          t.applicableScene.toLowerCase().includes(searchKeyword.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [savedPolishTechniques, selectedCategory, searchKeyword]);

  // 获取当前被勾选复用的完整对象
  const activeSelectedObjects = useMemo(() => {
    return savedPolishTechniques.filter((t) =>
      selectedTechniquesForReuse.includes(t.name)
    );
  }, [savedPolishTechniques, selectedTechniquesForReuse]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-indigo-500/40 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* 顶栏 Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/70 to-slate-900 border-b border-indigo-900/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>文风技法资产库与复用中心</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-900/80 text-indigo-300 font-normal border border-indigo-700/60">
                  《{novel.title}》
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                沉淀润色时采纳的高光文学修辞与结构技法，勾选后可在后续润色中指定 AI 精准复用
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition border border-slate-700/60"
              title="刷新资产库与统计"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 rounded-lg transition border border-slate-700/60"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 统计指标看板 */}
        <div className="bg-slate-950/70 border-b border-slate-800/80 px-6 py-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center text-indigo-400">
              <BookmarkCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">已沉淀技法</div>
              <div className="text-base font-bold text-slate-100 font-mono">
                {techniqueStats?.total_techniques ?? savedPolishTechniques.length} <span className="text-xs font-normal text-slate-400">种</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400">
              <Flame className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">全书累计应用</div>
              <div className="text-base font-bold text-emerald-400 font-mono">
                {techniqueStats?.total_applied_count ?? savedPolishTechniques.reduce((sum, t) => sum + (t.appliedCount || 1), 0)} <span className="text-xs font-normal text-slate-400">次</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-950 flex items-center justify-center text-purple-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">当前待复用</div>
              <div className="text-base font-bold text-purple-300 font-mono">
                {selectedTechniquesForReuse.length} <span className="text-xs font-normal text-slate-400">项已选</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-2.5 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-slate-500 uppercase tracking-wider">覆盖文学维度</div>
              <div className="text-base font-bold text-amber-300 font-mono">
                {categories.length > 1 ? categories.length - 1 : 1} <span className="text-xs font-normal text-slate-400">类</span>
              </div>
            </div>
          </div>
        </div>

        {/* 搜索与分类 Tab 筛选 */}
        <div className="px-6 py-3 bg-slate-900 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* 分类 Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 text-xs rounded-lg transition whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white font-medium shadow-sm'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' ? '全部技法' : cat}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="搜索技法名称或描写特征..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* 技法卡片网格列表 */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-950">
          {filteredTechniques.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <BookmarkCheck className="w-12 h-12 mx-auto mb-3 text-slate-700" />
              <p className="text-sm font-medium text-slate-400">暂无符合条件的文风技巧</p>
              <p className="text-xs mt-1 text-slate-600">
                在编辑器中点击「🎨 文风润色」并采纳合入后，所运用的精妙文学技法将自动沉淀到此处
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredTechniques.map((tech) => {
                const isSelected = selectedTechniquesForReuse.includes(tech.name);

                return (
                  <div
                    key={tech.id || tech.name}
                    onClick={() => toggleReuseTechnique(tech.name)}
                    className={`p-4 rounded-xl border transition cursor-pointer select-none flex flex-col justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/70 shadow-lg shadow-indigo-950/30 ring-1 ring-indigo-500/30'
                        : 'bg-slate-900/70 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-indigo-900/60 text-indigo-300 border border-indigo-700/50">
                            {tech.categoryLabel || '文学技法'}
                          </span>
                          <span className="text-sm font-semibold text-slate-100">
                            {tech.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/50 flex items-center gap-1">
                            <Flame className="w-3 h-3 text-emerald-400" />
                            <span>已合入 {tech.appliedCount || 1} 次</span>
                          </span>

                          <div className="text-indigo-400">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-600" />
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">
                        {tech.description}
                      </p>
                    </div>

                    {/* 改写前后片段对照 */}
                    {(tech.beforeSnippet || tech.afterSnippet) && (
                      <div className="text-xs font-mono space-y-1.5 bg-slate-950/90 p-3 rounded-lg border border-slate-800/80">
                        {tech.beforeSnippet && (
                          <div className="text-rose-400/90 leading-normal">
                            <span className="text-slate-500 mr-2 font-sans text-[11px]">【改写前】</span>
                            <span className="line-through decoration-rose-500/70">{tech.beforeSnippet}</span>
                          </div>
                        )}
                        {tech.afterSnippet && (
                          <div className="text-emerald-300 leading-normal font-medium">
                            <span className="text-emerald-500 mr-2 font-sans text-[11px]">【改写后】</span>
                            <span>{tech.afterSnippet}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-800/60">
                      <span>{tech.applicableScene ? `适用场景: ${tech.applicableScene}` : '全篇通用风格'}</span>
                      <span className={`text-[11px] font-medium ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {isSelected ? '✓ 已加入复用队列' : '点击勾选复用'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部确认与执行操作栏 */}
        <div className="bg-slate-900 border-t border-slate-800 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>
              已勾选 <strong className="text-emerald-400 font-mono">{selectedTechniquesForReuse.length}</strong> 项技法注入后续润色 Prompt
            </span>
            {selectedTechniquesForReuse.length > 0 && (
              <button
                onClick={clearReuseTechniques}
                className="text-indigo-400 hover:text-indigo-300 underline ml-2"
              >
                清空勾选
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition"
            >
              完成保存
            </button>

            {onTriggerPolishWithSelected && (
              <button
                onClick={() => {
                  onTriggerPolishWithSelected(activeSelectedObjects);
                  onClose();
                }}
                disabled={activeSelectedObjects.length === 0}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:pointer-events-none rounded-lg transition shadow-md shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>使用勾选技巧立即润色</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
