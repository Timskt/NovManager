// ==============================================================================
// 细粒度字句级 Diff 与差异合入引擎 (Sentence & Word Level Myers Diff Engine)
// 提供段落拆解、逐句 LCS 相似度比对、红绿微观差异标记及选择性合并支持
// ==============================================================================

export interface DiffPart {
  type: 'added' | 'removed' | 'unchanged';
  value: string;
}

export interface SentenceDiffItem {
  id: string;
  originalSentence: string;
  proposedSentence: string;
  diffParts: DiffPart[];
  isModified: boolean;
  isAccepted: boolean;
}

/**
 * 字符级最长公共子序列 (LCS) 差异算法
 */
export function computeCharDiff(oldText: string, newText: string): DiffPart[] {
  if (oldText === newText) {
    return [{ type: 'unchanged', value: oldText }];
  }
  if (!oldText) {
    return [{ type: 'added', value: newText }];
  }
  if (!newText) {
    return [{ type: 'removed', value: oldText }];
  }

  const m = oldText.length;
  const n = newText.length;
  // 构建 LCS 动态规划表
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldText[i - 1] === newText[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // 回溯构建差异分块
  const parts: DiffPart[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldText[i - 1] === newText[j - 1]) {
      parts.unshift({ type: 'unchanged', value: oldText[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      parts.unshift({ type: 'added', value: newText[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      parts.unshift({ type: 'removed', value: oldText[i - 1] });
      i--;
    }
  }

  // 合并相同类型的连续微元
  const merged: DiffPart[] = [];
  for (const part of parts) {
    const last = merged[merged.length - 1];
    if (last && last.type === part.type) {
      last.value += part.value;
    } else {
      merged.push({ ...part });
    }
  }

  return merged;
}

/**
 * 将长正文按中文标点切割为自然句
 */
export function splitIntoSentences(text: string): string[] {
  if (!text) return [];
  // 匹配句号、问号、感叹号、省略号及分段
  const raw = text.split(/([。！？…\n]+)/);
  const result: string[] = [];
  for (let i = 0; i < raw.length; i += 2) {
    const sent = raw[i];
    const punct = raw[i + 1] || '';
    const full = (sent + punct).trim();
    if (full) {
      result.push(full);
    }
  }
  return result;
}

/**
 * 计算句对句粒度的可合并条目列表
 */
export function computeSentenceDiffList(original: string, proposed: string): SentenceDiffItem[] {
  const origSentences = splitIntoSentences(original);
  const propSentences = splitIntoSentences(proposed);
  const maxLen = Math.max(origSentences.length, propSentences.length);

  const items: SentenceDiffItem[] = [];

  for (let idx = 0; idx < maxLen; idx++) {
    const orig = origSentences[idx] || '';
    const prop = propSentences[idx] || '';
    const isModified = orig !== prop;
    const diffParts = computeCharDiff(orig, prop);

    items.push({
      id: `diff-sent-${idx}-${Date.now()}`,
      originalSentence: orig,
      proposedSentence: prop,
      diffParts,
      isModified,
      isAccepted: true, // 默认推荐采纳
    });
  }

  return items;
}
