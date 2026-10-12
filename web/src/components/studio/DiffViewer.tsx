// ==============================================================================
// 正文变更 Gerrit 风格 Diff 审阅与文学技法沉淀组件 (Diff Viewer)
// 支持：
// 1. Side-by-Side (双栏并排) 与 Unified (单栏内联) 自由切换
// 2. 句子与词级高精度红绿增删高亮 (Gerrit / Code Review 质感)
// 3. 润色技法提炼展示卡片 (改写前后对照、场景分类)
// 4. 采纳合入时支持选择性沉淀入库，建立专属作者技法资产
// ==============================================================================

import React, { useState, useMemo } from 'react';
import {
  Check,
  X,
  Sparkles,
  Columns2,
  AlignJustify,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  CheckSquare,
  Square,
  Info,
} from 'lucide-react';
import { PolishTechnique } from '../../types/novel';

export interface DiffViewerProps {
  originalText: string;
  newDraft: string;
  agentName: string;
  techniques?: PolishTechnique[];
  summary?: string;
  onAccept: (selectedTechniques?: PolishTechnique[]) => void;
  onDismiss: () => void;
  onPolishAgain?: () => void;
}

// 词法拆分：切分中文标点、空格、换行或字符
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let current = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (/[\s，。！？；：、“”‘’（）《》—…\n\r]/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      tokens.push(char);
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

interface TokenDiff {
  text: string;
  type: 'unchanged' | 'added' | 'deleted';
}

// LCS 字符/词元级差异比对
function diffTokens(
  oldTokens: string[],
  newTokens: string[]
): { oldDiff: TokenDiff[]; newDiff: TokenDiff[] } {
  const m = oldTokens.length;
  const n = newTokens.length;

  // 保护性上限，防止异常大文本导致计算卡顿
  if (m * n > 160000) {
    return {
      oldDiff: [{ text: oldTokens.join(''), type: 'deleted' }],
      newDiff: [{ text: newTokens.join(''), type: 'added' }],
    };
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const oldStack: TokenDiff[] = [];
  const newStack: TokenDiff[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      oldStack.push({ text: oldTokens[i - 1], type: 'unchanged' });
      newStack.push({ text: newTokens[j - 1], type: 'unchanged' });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newStack.push({ text: newTokens[j - 1], type: 'added' });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      oldStack.push({ text: oldTokens[i - 1], type: 'deleted' });
      i--;
    }
  }

  return {
    oldDiff: oldStack.reverse(),
    newDiff: newStack.reverse(),
  };
}

interface DiffRow {
  type: 'unchanged' | 'modified' | 'added' | 'deleted';
  oldLineNumber?: number;
  newLineNumber?: number;
  oldTokens?: TokenDiff[];
  newTokens?: TokenDiff[];
  rawOld?: string;
  rawNew?: string;
}

// 基于段落/行的对齐比对
function computeLineDiff(original: string, modified: string): DiffRow[] {
  const oldLines = original.split('\n');
  const newLines = modified.split('\n');

  const m = oldLines.length;
  const n = newLines.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  let i = m;
  let j = n;
  const reverseRows: DiffRow[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      const line = oldLines[i - 1];
      reverseRows.push({
        type: 'unchanged',
        oldLineNumber: i,
        newLineNumber: j,
        rawOld: line,
        rawNew: line,
        oldTokens: [{ text: line, type: 'unchanged' }],
        newTokens: [{ text: line, type: 'unchanged' }],
      });
      i--;
      j--;
    } else if (
      i > 0 &&
      j > 0 &&
      oldLines[i - 1] !== newLines[j - 1] &&
      (i === 1 || j === 1 || dp[i - 1][j - 1] >= Math.max(dp[i - 1][j], dp[i][j - 1]) - 1)
    ) {
      // 改写/编辑行配对
      const oldLine = oldLines[i - 1];
      const newLine = newLines[j - 1];
      const { oldDiff, newDiff } = diffTokens(
        tokenize(oldLine),
        tokenize(newLine)
      );
      reverseRows.push({
        type: 'modified',
        oldLineNumber: i,
        newLineNumber: j,
        rawOld: oldLine,
        rawNew: newLine,
        oldTokens: oldDiff,
        newTokens: newDiff,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // 新增行
      const line = newLines[j - 1];
      reverseRows.push({
        type: 'added',
        newLineNumber: j,
        rawNew: line,
        newTokens: [{ text: line, type: 'added' }],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      // 删除行
      const line = oldLines[i - 1];
      reverseRows.push({
        type: 'deleted',
        oldLineNumber: i,
        rawOld: line,
        oldTokens: [{ text: line, type: 'deleted' }],
      });
      i--;
    }
  }

  return reverseRows.reverse();
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalText,
  newDraft,
  agentName,
  techniques = [],
  summary,
  onAccept,
  onDismiss,
  onPolishAgain,
}) => {
  const [diffMode, setDiffMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [isTechniquesExpanded, setIsTechniquesExpanded] = useState<boolean>(true);
  const [selectedTechniqueIds, setSelectedTechniqueIds] = useState<Record<string, boolean>>(() => {
    // 默认全部选中采纳
    const initial: Record<string, boolean> = {};
    techniques.forEach((t, idx) => {
      initial[t.id || `tech-${idx}`] = true;
    });
    return initial;
  });

  // 计算行级与词级对齐 Diff
  const diffRows = useMemo(() => {
    return computeLineDiff(originalText || '', newDraft || '');
  }, [originalText, newDraft]);

  // 统计字数与修改点
  const stats = useMemo(() => {
    const origLen = originalText?.length || 0;
    const newLen = newDraft?.length || 0;
    const delta = newLen - origLen;

    let addedTokensCount = 0;
    let deletedTokensCount = 0;

    diffRows.forEach((r) => {
      if (r.type === 'added') addedTokensCount++;
      if (r.type === 'deleted') deletedTokensCount++;
      if (r.type === 'modified') {
        addedTokensCount += r.newTokens?.filter((t) => t.type === 'added').length || 0;
        deletedTokensCount += r.oldTokens?.filter((t) => t.type === 'deleted').length || 0;
      }
    });

    return {
      origLen,
      newLen,
      delta,
      addedTokensCount,
      deletedTokensCount,
    };
  }, [originalText, newDraft, diffRows]);

  const toggleTechnique = (id: string) => {
    setSelectedTechniqueIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleConfirmAccept = () => {
    const chosenTechniques = techniques.filter(
      (t, idx) => selectedTechniqueIds[t.id || `tech-${idx}`]
    );
    onAccept(chosenTechniques);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl my-4 animate-in fade-in duration-300 border"
      style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
    >
      {/* 1. Gerrit 风格审查控制顶栏 */}
      <div
        className="border-b px-4 py-3 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* 左侧状态与字数增减统计 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold"
            style={{
              backgroundColor: 'var(--accent-surface)',
              borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--border-subtle))',
              color: 'var(--accent-primary)',
            }}
          >
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--accent-primary)' }} />
            <span>{agentName} 差异审查</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono px-2.5 py-1 rounded-md border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}>
            <span>原 {stats.origLen} 字</span>
            <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
            <span>新 {stats.newLen} 字</span>
            <span
              className={`font-semibold px-1.5 py-0.5 rounded text-[11px] border ${
                stats.delta >= 0
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30'
              }`}
            >
              {stats.delta >= 0 ? `+${stats.delta}` : stats.delta}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono">+{stats.addedTokensCount} 增润</span>
            <span className="text-rose-600 dark:text-rose-400 font-mono">-{stats.deletedTokensCount} 删简</span>
          </div>
        </div>

        {/* 右侧：视图模式切换与操作按钮 */}
        <div className="flex items-center flex-wrap gap-2 w-full lg:w-auto justify-end">
          {/* Gerrit 视图切换 (Side-by-Side vs Unified) */}
          <div className="flex items-center p-0.5 rounded-lg border" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setDiffMode('side-by-side')}
              className={`px-2.5 py-1 text-xs rounded-md transition flex items-center gap-1 cursor-pointer ${
                diffMode === 'side-by-side'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'hover:opacity-80'
              }`}
              style={diffMode !== 'side-by-side' ? { color: 'var(--text-muted)' } : undefined}
              title="双栏并排比对 (Side-by-Side)"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">双栏对比</span>
            </button>
            <button
              onClick={() => setDiffMode('unified')}
              className={`px-2.5 py-1 text-xs rounded-md transition flex items-center gap-1 cursor-pointer ${
                diffMode === 'unified'
                  ? 'bg-indigo-600 text-white font-medium shadow-sm'
                  : 'hover:opacity-80'
              }`}
              style={diffMode !== 'unified' ? { color: 'var(--text-muted)' } : undefined}
              title="单栏内联比对 (Unified)"
            >
              <AlignJustify className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">单栏内联</span>
            </button>
          </div>

          {onPolishAgain && (
            <button
              onClick={onPolishAgain}
              className="px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 border hover:opacity-80 cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--accent-primary)' }}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>微调</span>
            </button>
          )}

          <button
            onClick={onDismiss}
            className="px-2.5 py-1 text-xs rounded-lg transition flex items-center gap-1 border hover:opacity-80 cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <X className="w-3.5 h-3.5" />
            <span>放弃</span>
          </button>

          <button
            onClick={handleConfirmAccept}
            className="px-3.5 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md rounded-lg transition flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>采纳合入</span>
          </button>
        </div>
      </div>

      {/* 2. 文学润色技法提炼展示与入库勾选面板 */}
      {techniques && techniques.length > 0 && (
        <div className="border-b px-4 py-3" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
                ✨ 本次润色运用的文学技法 ({techniques.length} 项)
              </span>
              {summary && (
                <span className="text-[11px] hidden md:inline truncate max-w-md" style={{ color: 'var(--text-muted)' }}>
                  · {summary}
                </span>
              )}
            </div>
            <button
              onClick={() => setIsTechniquesExpanded(!isTechniquesExpanded)}
              className="text-xs flex items-center gap-1 transition font-medium hover:underline cursor-pointer"
              style={{ color: 'var(--accent-primary)' }}
            >
              <span>{isTechniquesExpanded ? '收起技法卡片' : '展开技法卡片'}</span>
              {isTechniquesExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {isTechniquesExpanded && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {techniques.map((tech, idx) => {
                const techKey = tech.id || `tech-${idx}`;
                const isChecked = !!selectedTechniqueIds[techKey];

                return (
                  <div
                    key={techKey}
                    onClick={() => toggleTechnique(techKey)}
                    className={`p-2.5 rounded-xl border transition cursor-pointer select-none flex flex-col justify-between gap-2 ${
                      isChecked
                        ? 'shadow-sm ring-1'
                        : 'hover:opacity-90'
                    }`}
                    style={
                      isChecked
                        ? {
                            backgroundColor: 'var(--accent-surface)',
                            borderColor: 'var(--accent-primary)',
                          }
                        : {
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-muted)',
                          }
                    }
                  >
                    <div>
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className="text-[10px] font-medium px-1.5 py-0.5 rounded border"
                            style={
                              isChecked
                                ? { backgroundColor: 'var(--accent-primary)', color: '#fff', borderColor: 'var(--accent-primary)' }
                                : { backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }
                            }
                          >
                            {tech.categoryLabel || '文学技法'}
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              isChecked ? 'text-slate-100' : ''
                            }`}
                            style={!isChecked ? { color: 'var(--text-main)' } : undefined}
                          >
                            {tech.name}
                          </span>
                        </div>

                        <div className="flex-shrink-0 text-indigo-400 pt-0.5">
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 opacity-40" />
                          )}
                        </div>
                      </div>

                      <p
                        className={`text-[11px] leading-relaxed line-clamp-2 ${
                          isChecked ? 'text-slate-300' : ''
                        }`}
                        style={!isChecked ? { color: 'var(--text-muted)' } : undefined}
                      >
                        {tech.description}
                      </p>
                    </div>

                    {/* 改写前后片段对照 */}
                    {(tech.beforeSnippet || tech.afterSnippet) && (
                      <div
                        className="text-[10px] font-mono space-y-1 p-2 rounded-lg border"
                        style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
                      >
                        {tech.beforeSnippet && (
                          <div className="text-rose-400/90 line-clamp-1">
                            <span className="mr-1" style={{ color: 'var(--text-muted)' }}>原:</span>
                            <span className="line-through">{tech.beforeSnippet}</span>
                          </div>
                        )}
                        {tech.afterSnippet && (
                          <div className="text-emerald-400/90 line-clamp-1 font-medium">
                            <span className="mr-1" style={{ color: 'var(--text-muted)' }}>改:</span>
                            <span>{tech.afterSnippet}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-[10px] pt-1 border-t" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <span>{tech.applicableScene ? `场景: ${tech.applicableScene}` : '通用技法'}</span>
                      <span className={isChecked ? 'text-emerald-400' : ''}>
                        {isChecked ? '合入时沉淀入库' : '暂不入库'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Gerrit 风格正文 Diff 内容比对展示区 */}
      <div
        className="max-h-[65vh] overflow-y-auto font-mono text-xs select-text"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        {diffMode === 'side-by-side' ? (
          /* ================= 双栏并排 (Side-by-Side) ================= */
          <div className="grid grid-cols-2 divide-x divide-slate-800 min-w-[700px]">
            {/* 左侧栏：原正文 (Base) */}
            <div>
              <div className="sticky top-0 z-10 backdrop-blur px-3 py-1.5 border-b text-[11px] font-semibold flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  原正文版本 (Base)
                </span>
                <span className="text-[10px] font-normal text-slate-500">
                  共 {originalText.split('\n').length} 行
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {diffRows.map((row, idx) => {
                  const isDeleted = row.type === 'deleted';
                  const isModified = row.type === 'modified';
                  const isAdded = row.type === 'added';

                  return (
                    <div
                      key={`left-${idx}`}
                      className={`flex items-start transition-colors ${
                        isDeleted
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : isModified
                          ? 'bg-rose-500/10 text-rose-700 dark:text-rose-300'
                          : isAdded
                          ? 'opacity-40'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      style={!isDeleted && !isModified && !isAdded ? { color: 'var(--text-main)' } : undefined}
                    >
                      {/* 行号 Gutter */}
                      <span className="w-10 flex-shrink-0 text-right pr-2 py-1 text-[10px] select-none border-r" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                        {row.oldLineNumber ?? ''}
                      </span>
                      {/* 标记指示符 */}
                      <span className="w-5 flex-shrink-0 text-center py-1 text-rose-500 select-none font-bold">
                        {isDeleted || isModified ? '-' : ''}
                      </span>
                      {/* 内容 */}
                      <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words">
                        {isAdded ? (
                          <span className="opacity-40 italic select-none">···</span>
                        ) : isModified && row.oldTokens ? (
                          row.oldTokens.map((tok, tIdx) => (
                            <span
                              key={tIdx}
                              className={
                                tok.type === 'deleted'
                                  ? 'bg-rose-500/25 text-rose-800 dark:text-rose-200 line-through px-0.5 rounded font-semibold'
                                  : ''
                              }
                            >
                              {tok.text}
                            </span>
                          ))
                        ) : (
                          row.rawOld || (
                            <span className="opacity-40 italic select-none">（空行）</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 右侧栏：润色后新候选正文 (Proposed Patchset) */}
            <div>
              <div className="sticky top-0 z-10 backdrop-blur px-3 py-1.5 border-b text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  润色候选新文 (Proposed)
                </span>
                <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>
                  共 {newDraft.split('\n').length} 行
                </span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {diffRows.map((row, idx) => {
                  const isDeleted = row.type === 'deleted';
                  const isModified = row.type === 'modified';
                  const isAdded = row.type === 'added';

                  return (
                    <div
                      key={`right-${idx}`}
                      className={`flex items-start transition-colors ${
                        isAdded
                          ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                          : isModified
                          ? 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                          : isDeleted
                          ? 'opacity-40'
                          : 'hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      style={!isAdded && !isModified && !isDeleted ? { color: 'var(--text-main)' } : undefined}
                    >
                      {/* 行号 Gutter */}
                      <span className="w-10 flex-shrink-0 text-right pr-2 py-1 text-[10px] select-none border-r" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                        {row.newLineNumber ?? ''}
                      </span>
                      {/* 标记指示符 */}
                      <span className="w-5 flex-shrink-0 text-center py-1 text-emerald-500 select-none font-bold">
                        {isAdded || isModified ? '+' : ''}
                      </span>
                      {/* 内容 */}
                      <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words">
                        {isDeleted ? (
                          <span className="text-slate-800 italic select-none">···</span>
                        ) : isModified && row.newTokens ? (
                          row.newTokens.map((tok, tIdx) => (
                            <span
                              key={tIdx}
                              className={
                                tok.type === 'added'
                                  ? 'bg-emerald-800/80 text-emerald-50 font-bold px-0.5 rounded shadow-sm'
                                  : ''
                              }
                            >
                              {tok.text}
                            </span>
                          ))
                        ) : (
                          row.rawNew || (
                            <span className="text-slate-700 italic select-none">（空行）</span>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ================= 单栏内联 (Unified) ================= */
          <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="sticky top-0 z-10 backdrop-blur px-3 py-1.5 border-b text-[11px] font-semibold flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
              <span>单栏综合差异流 (Unified Diff)</span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                红色为移除/精简，绿色为新增/润色
              </span>
            </div>
            {diffRows.map((row, idx) => {
              if (row.type === 'unchanged') {
                return (
                  <div
                    key={`unified-${idx}`}
                    className="flex items-start hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] select-none" style={{ color: 'var(--text-muted)' }}>
                      {row.oldLineNumber}
                    </span>
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] select-none border-r" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      {row.newLineNumber}
                    </span>
                    <span className="w-6 text-center py-1 select-none opacity-40"> </span>
                    <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words">
                      {row.rawOld}
                    </div>
                  </div>
                );
              }

              if (row.type === 'deleted') {
                return (
                  <div
                    key={`unified-${idx}-del`}
                    className="flex items-start bg-rose-500/10 text-rose-700 dark:text-rose-300"
                  >
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] text-rose-500 select-none">
                      {row.oldLineNumber}
                    </span>
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] select-none border-r" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      -
                    </span>
                    <span className="w-6 text-center py-1 text-rose-500 select-none font-bold">
                      -
                    </span>
                    <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words line-through decoration-rose-500/60">
                      {row.rawOld}
                    </div>
                  </div>
                );
              }

              if (row.type === 'added') {
                return (
                  <div
                    key={`unified-${idx}-add`}
                    className="flex items-start bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                  >
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] select-none" style={{ color: 'var(--text-muted)' }}>
                      +
                    </span>
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] text-emerald-600 dark:text-emerald-400 select-none border-r" style={{ borderColor: 'var(--border-subtle)' }}>
                      {row.newLineNumber}
                    </span>
                    <span className="w-6 text-center py-1 text-emerald-600 dark:text-emerald-400 select-none font-bold">
                      +
                    </span>
                    <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words font-medium">
                      {row.rawNew}
                    </div>
                  </div>
                );
              }

              // modified: 输出旧行 (带高亮删除) 与 新行 (带高亮新增)
              return (
                <React.Fragment key={`unified-${idx}-mod`}>
                  <div className="flex items-start bg-rose-500/10 text-rose-700 dark:text-rose-300">
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] text-rose-500 select-none">
                      {row.oldLineNumber}
                    </span>
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] select-none border-r" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      -
                    </span>
                    <span className="w-6 text-center py-1 text-rose-500 select-none font-bold">
                      -
                    </span>
                    <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words">
                      {row.oldTokens?.map((tok, tIdx) => (
                        <span
                          key={tIdx}
                          className={
                            tok.type === 'deleted'
                              ? 'bg-rose-500/25 text-rose-800 dark:text-rose-200 line-through px-0.5 rounded font-semibold'
                              : ''
                          }
                        >
                          {tok.text}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] select-none" style={{ color: 'var(--text-muted)' }}>
                      +
                    </span>
                    <span className="w-9 text-right pr-1.5 py-1 text-[10px] text-emerald-600 dark:text-emerald-400 select-none border-r" style={{ borderColor: 'var(--border-subtle)' }}>
                      {row.newLineNumber}
                    </span>
                    <span className="w-6 text-center py-1 text-emerald-600 dark:text-emerald-400 select-none font-bold">
                      +
                    </span>
                    <div className="flex-1 py-1 pr-3 leading-relaxed whitespace-pre-wrap break-words">
                      {row.newTokens?.map((tok, tIdx) => (
                        <span
                          key={tIdx}
                          className={
                            tok.type === 'added'
                              ? 'bg-emerald-500/25 text-emerald-800 dark:text-emerald-200 px-0.5 rounded font-semibold'
                              : ''
                          }
                        >
                          {tok.text}
                        </span>
                      ))}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        )}
      </div>

      {/* 底部审阅提示 */}
      <div className="border-t px-4 py-2 flex items-center justify-between text-[11px]" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        <span className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          采纳合入将自动保存为新版本快照，并把已勾选的润色技法存入作品数据库。
        </span>
        <span className="font-mono" style={{ color: 'var(--text-muted)' }}>Gerrit-Style Visual Diff Engine</span>
      </div>
    </div>
  );
};

