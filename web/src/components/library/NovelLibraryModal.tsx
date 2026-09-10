// ==============================================================================
// 作品库与多小说管理弹窗 (Novel Library & Project Switcher Modal)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Library,
  BookOpen,
  Plus,
  Sparkles,
  Trash2,
  CheckCircle2,
  Clock,
  FileText,
  X,
  ArrowRight,
} from 'lucide-react';

interface NovelLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenArchitect: () => void;
}

export const NovelLibraryModal: React.FC<NovelLibraryModalProps> = ({
  isOpen,
  onClose,
  onOpenArchitect,
}) => {
  const { novel, novelList, switchNovel, createBlankNovel, deleteNovel } = useNovel();

  const [showCreateBlank, setShowCreateBlank] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newGenre, setNewGenre] = useState('玄幻仙侠');
  const [newTargetWords, setNewTargetWords] = useState(1000000);

  if (!isOpen) return null;

  const handleCreateBlankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await createBlankNovel(newTitle.trim(), newGenre, Number(newTargetWords));
    setShowCreateBlank(false);
    setNewTitle('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl flex flex-col max-h-[85vh] space-y-4">
        {/* 顶部标题与关闭 */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
              <Library className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>小说作品库与多书管理</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-normal">
                  共 {novelList.length} 部作品
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                可随时在不同小说项目间无缝切换，每部作品独立维护完整大纲、人物状态机与世界观法则。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 快捷新建动作条 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateBlank(!showCreateBlank)}
            className="flex-1 py-2.5 px-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>新建空白作品</span>
          </button>

          <button
            onClick={() => {
              onClose();
              onOpenArchitect();
            }}
            className="flex-1 py-2.5 px-3 bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-950 flex items-center justify-center gap-1.5 transition"
          >
            <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
            <span>AI 灵感探讨与创世向导</span>
          </button>
        </div>

        {/* 新建空白小说内联表单 */}
        {showCreateBlank && (
          <form
            onSubmit={handleCreateBlankSubmit}
            className="bg-slate-950 border border-indigo-500/40 rounded-xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200 text-xs"
          >
            <div className="font-semibold text-indigo-300 flex items-center justify-between">
              <span>填写新小说基本信息</span>
              <button
                type="button"
                onClick={() => setShowCreateBlank(false)}
                className="text-slate-500 hover:text-slate-300 text-[11px]"
              >
                收起
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">作品书名</label>
                <input
                  type="text"
                  required
                  placeholder="例如：剑破九天"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">题材品类</label>
                <input
                  type="text"
                  placeholder="例如：玄幻仙侠 / 都市异能"
                  value={newGenre}
                  onChange={(e) => setNewGenre(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">目标字数</label>
                <input
                  type="number"
                  step={100000}
                  value={newTargetWords}
                  onChange={(e) => setNewTargetWords(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowCreateBlank(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium"
              >
                确认创建并开始创作
              </button>
            </div>
          </form>
        )}

        {/* 作品清单卡片列表 */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {novelList.map((item) => {
            const isActive = item.id === novel.id;
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-indigo-950/40 border-indigo-500/80 shadow-md'
                    : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    <BookOpen className="w-5 h-5" />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-100">
                        {item.title}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-indigo-300 font-medium">
                        {item.genre}
                      </span>
                      {isActive && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          当前创作中
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          {item.currentWordCount?.toLocaleString() || 0} /{' '}
                          {item.targetWordCount?.toLocaleString() || 0} 字
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        <span>最近更新: {new Date(item.updatedAt || Date.now()).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive ? (
                    <button
                      onClick={async () => {
                        await switchNovel(item.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                    >
                      <span>切换至本书</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <span className="text-xs text-indigo-400 font-medium px-2 py-1">
                      活跃中
                    </span>
                  )}

                  {novelList.length > 1 && (
                    <button
                      onClick={() => {
                        if (confirm(`确定要删除小说《${item.title}》吗？删除后该书的所有大纲与人物数据将无法恢复。`)) {
                          deleteNovel(item.id);
                        }
                      }}
                      className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition"
                      title="删除作品"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
