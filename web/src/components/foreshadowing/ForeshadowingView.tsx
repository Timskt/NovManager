// ==============================================================================
// 伏笔与暗线雷达视图 (Foreshadowing & Plot Clue Radar)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Foreshadowing, ForeshadowingStatus } from '../../types/novel';
import {
  Radar,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Archive,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export const ForeshadowingView: React.FC = () => {
  const { foreshadowings, addForeshadowing, updateForeshadowingStatus, activeChapter } = useNovel();
  const [showAddModal, setShowAddModal] = useState(false);

  // 表单状态
  const [title, setTitle] = useState('');
  const [clueDescription, setClueDescription] = useState('');
  const [plannedChapter, setPlannedChapter] = useState(15);
  const [notes, setNotes] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clueDescription.trim()) return;
    addForeshadowing({
      title,
      clueDescription,
      plantedChapterId: activeChapter?.id || 'chap-012',
      plantedChapterIndex: activeChapter?.chapterIndex || 12,
      plannedResolveChapterIndex: Number(plannedChapter),
      status: 'PLANTED',
      notes,
    });
    setShowAddModal(false);
    setTitle('');
    setClueDescription('');
    setNotes('');
  };

  const columns: { status: ForeshadowingStatus; label: string; color: string }[] = [
    { status: 'PLANTED', label: '已埋设 (Planted)', color: 'text-indigo-400 border-indigo-800/60' },
    { status: 'FERMENTING', label: '发酵中 (Fermenting)', color: 'text-amber-400 border-amber-800/60' },
    { status: 'RESOLVED', label: '已回收/已揭示 (Resolved)', color: 'text-emerald-400 border-emerald-800/60' },
    { status: 'ABANDONED', label: '已废弃 (Abandoned)', color: 'text-slate-500 border-slate-800' },
  ];

  return (
    <div
      className="flex-1 p-6 overflow-y-auto transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* 顶部标题与操作 */}
        <div
          className="flex items-center justify-between pb-4 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Radar className="w-5 h-5 text-indigo-400" />
              <span>全书伏笔与暗线雷达 (Foreshadowing Tracker)</span>
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              追踪所有长线线索的生命周期。当章节推进至计划回收章节时，Agent 将自动提醒呼应，防止烂尾与遗忘。
            </p>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-2 text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <Plus className="w-4 h-4" />
            <span>登记新伏笔</span>
          </button>
        </div>

        {/* 四态看板 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {columns.map((col) => {
            const list = foreshadowings.filter((f) => f.status === col.status);
            return (
              <div
                key={col.status}
                className="border rounded-2xl p-4 space-y-3 min-h-[500px]"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <div
                  className="flex items-center justify-between pb-2 border-b"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <span className={`text-xs font-bold ${col.color}`}>
                    {col.label}
                  </span>
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded border"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-muted)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    {list.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {list.length === 0 ? (
                    <p className="text-xs italic py-6 text-center" style={{ color: 'var(--text-muted)' }}>
                      暂无对应伏笔
                    </p>
                  ) : (
                    list.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-xl p-3 text-xs space-y-2 transition"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                        }}
                      >
                        <div className="font-bold" style={{ color: 'var(--text-main)' }}>
                          {item.title}
                        </div>

                        <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          {item.clueDescription}
                        </p>

                        <div
                          className="flex items-center justify-between text-[10px] pt-1 border-t"
                          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                        >
                          <span>埋于 第 {item.plantedChapterIndex || '?'} 章</span>
                          <span className="flex items-center gap-1 text-indigo-400">
                            计划 ➔ 第 {item.plannedResolveChapterIndex || '?'} 章
                          </span>
                        </div>

                        {item.notes && (
                          <p
                            className="text-[10px] p-1.5 rounded border"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--accent-primary)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            备忘：{item.notes}
                          </p>
                        )}

                        {/* 状态流转快捷按钮 */}
                        <div className="flex items-center justify-end gap-1.5 pt-1">
                          {item.status === 'PLANTED' && (
                            <button
                              onClick={() => updateForeshadowingStatus(item.id, 'FERMENTING')}
                              className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 hover:bg-amber-900 text-[10px]"
                            >
                              推进至发酵
                            </button>
                          )}
                          {item.status === 'FERMENTING' && (
                            <button
                              onClick={() => updateForeshadowingStatus(item.id, 'RESOLVED')}
                              className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 hover:bg-emerald-900 text-[10px]"
                            >
                              标记已回收
                            </button>
                          )}
                          {item.status !== 'ABANDONED' && item.status !== 'RESOLVED' && (
                            <button
                              onClick={() => updateForeshadowingStatus(item.id, 'ABANDONED')}
                              className="px-1.5 py-0.5 rounded hover:text-red-400 text-[10px]"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              废弃
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 登记伏笔弹窗 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form
            onSubmit={handleCreate}
            className="border rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <h3 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
              <Radar className="w-4 h-4 text-indigo-400" />
              <span>登记新的伏笔或暗线</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>伏笔简短命名</label>
                <input
                  type="text"
                  required
                  placeholder="例如：师尊密室中的引魂香"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>伏笔具体线索与细节</label>
                <textarea
                  rows={3}
                  required
                  placeholder="记录在哪个场景中埋下了什么看似不起眼的细节或异样举动..."
                  value={clueDescription}
                  onChange={(e) => setClueDescription(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>预期揭开/回收的章节号</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={plannedChapter}
                  onChange={(e) => setPlannedChapter(Number(e.target.value))}
                  className="w-full border rounded-lg p-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>

              <div>
                <label className="block mb-1" style={{ color: 'var(--text-muted)' }}>作者备忘与回收思路</label>
                <input
                  type="text"
                  placeholder="用于后续提醒自己或为 Agent 注入揭晓提示"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border rounded-lg p-2 focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 text-xs rounded-lg transition border"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white rounded-lg shadow-md transition"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                保存伏笔
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
