// ==============================================================================
// 句段级差异精细审阅与按句采纳合入舱 (Granular Sentence Selective Diff Merger)
// 支持作者逐句打勾采纳或否决 AI 起草/润色建议，拒绝全有全无式的粗暴覆盖
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { computeSentenceDiffList, SentenceDiffItem } from '../../lib/diffEngine';
import { GitFork, Check, X, CheckSquare, Square, ArrowRight } from 'lucide-react';

interface GranularDiffMergerProps {
  originalText: string;
  proposedText: string;
  agentName: string;
  onAcceptMerged: (mergedResult: string) => void;
  onDismiss: () => void;
}

export const GranularDiffMerger: React.FC<GranularDiffMergerProps> = ({
  originalText,
  proposedText,
  agentName,
  onAcceptMerged,
  onDismiss,
}) => {
  const initialDiffs = useMemo(() => {
    return computeSentenceDiffList(originalText, proposedText);
  }, [originalText, proposedText]);

  const [diffItems, setDiffItems] = useState<SentenceDiffItem[]>(initialDiffs);

  const toggleItem = (id: string) => {
    setDiffItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isAccepted: !it.isAccepted } : it))
    );
  };

  const selectAll = (accepted: boolean) => {
    setDiffItems((prev) => prev.map((it) => ({ ...it, isAccepted: accepted })));
  };

  // 根据作者打勾项动态拼装最终正文
  const handleConfirmMerge = () => {
    const finalSentences = diffItems.map((item) => {
      if (item.isModified) {
        return item.isAccepted ? item.proposedSentence : item.originalSentence;
      }
      return item.originalSentence;
    });
    const assembled = finalSentences.filter(Boolean).join('\n\n');
    onAcceptMerged(assembled);
  };

  return (
    <div
      className="p-4 rounded-2xl border my-4 space-y-4 animate-in fade-in duration-200"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
        color: 'var(--text-main)',
      }}
    >
      {/* 顶栏控制 */}
      <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <GitFork className="w-5 h-5 text-amber-500" />
          <div>
            <h4 className="font-bold text-sm font-literary-serif">
              {agentName} 候选中草案 · 句级精细审阅与按句采纳
            </h4>
            <p className="text-xs font-literary-sans opacity-70">
              请勾选您认可的修改句段；未勾选项将保留您的原文字句。
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-literary-sans">
          <button
            onClick={() => selectAll(true)}
            className="px-2.5 py-1 rounded border hover:opacity-85"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            全选采纳
          </button>
          <button
            onClick={() => selectAll(false)}
            className="px-2.5 py-1 rounded border hover:opacity-85"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            全不采纳
          </button>
        </div>
      </div>

      {/* 逐句对比列表 */}
      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {diffItems.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => toggleItem(item.id)}
            className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
              item.isAccepted ? 'ring-1 ring-emerald-500/30' : 'opacity-65'
            }`}
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="mt-0.5 shrink-0">
              {item.isAccepted ? (
                <CheckSquare className="w-4 h-4 text-emerald-500" />
              ) : (
                <Square className="w-4 h-4 opacity-40" />
              )}
            </div>

            <div className="flex-1 text-xs font-literary-serif leading-relaxed min-w-0">
              {/* 原文对照 */}
              {item.isModified && item.originalSentence && (
                <div className="line-through text-rose-500/80 mb-1">
                  原文：{item.originalSentence}
                </div>
              )}

              {/* 建议修改后的字句（高亮展示） */}
              <div className="text-emerald-700 dark:text-emerald-400 font-medium">
                {item.diffParts.map((part, pIdx) => (
                  <span
                    key={pIdx}
                    className={
                      part.type === 'added'
                        ? 'bg-emerald-500/20 px-0.5 rounded underline decoration-emerald-500'
                        : part.type === 'removed'
                        ? 'hidden'
                        : ''
                    }
                  >
                    {part.value}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部确认操作栏 */}
      <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={onDismiss}
          className="px-3 py-1.5 rounded-lg border text-xs hover:opacity-75 transition"
          style={{ borderColor: 'var(--border-strong)' }}
        >
          全盘放弃本次草稿
        </button>

        <button
          onClick={handleConfirmMerge}
          className="px-4 py-1.5 rounded-lg text-xs font-bold text-white flex items-center gap-1.5 transition hover:opacity-90"
          style={{ backgroundColor: 'var(--accent-primary)' }}
        >
          <Check className="w-4 h-4" />
          <span>合入勾选字句至正文</span>
        </button>
      </div>
    </div>
  );
};
