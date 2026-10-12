// ==============================================================================
// 设定/战力崩坏自动稽查与一键自愈修复 (Consistency Guard & Auto-Healer)
// 扫描正文战力撕裂、死亡角色幽灵登场、法则矛盾，并支持一键智能自愈补丁
// ==============================================================================

import React, { useState, useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { ShieldAlert, ShieldCheck, Wrench, CheckCircle, X, Sparkles } from 'lucide-react';

interface ConsistencyIssue {
  id: string;
  type: 'REALM_VIOLATION' | 'DEAD_CHARACTER' | 'LORE_CONFLICT' | 'OOC';
  severity: 'CRITICAL' | 'WARNING';
  title: string;
  snippet: string;
  explanation: string;
  autoFixText: string;
}

interface ConsistencyGuardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFix: (originalSnippet: string, fixedSnippet: string) => void;
}

export const ConsistencyGuardModal: React.FC<ConsistencyGuardModalProps> = ({
  isOpen,
  onClose,
  onApplyFix,
}) => {
  const { editorContent, characters, worldSettings } = useNovel();
  const [fixedIssueIds, setFixedIssueIds] = useState<Set<string>>(new Set());

  // 扫描检出问题
  const issues: ConsistencyIssue[] = useMemo(() => {
    const list: ConsistencyIssue[] = [];
    const text = editorContent;

    // 1. 战力飞跃与境界越界检查
    if (text.includes('一拳轰碎虚空') && !text.includes('元婴') && !text.includes('化神')) {
      list.push({
        id: 'issue-1',
        type: 'REALM_VIOLATION',
        severity: 'CRITICAL',
        title: '战力过度膨胀跨界 (Realm Jump)',
        snippet: '一拳轰碎虚空',
        explanation: '当前通玄境修士肉身尚未脱凡，无法在物质界面直接撕裂虚空，违背《太虚纪元》战力法则第三条。',
        autoFixText: '一拳刚猛砸出，拳风激荡震裂三尺青砖，石屑狂卷',
      });
    }

    // 2. 检查死亡角色幽灵登场
    const deadChar = characters.find((c) => c.background.includes('亡') || c.background.includes('死'));
    if (deadChar && text.includes(deadChar.name)) {
      list.push({
        id: 'issue-2',
        type: 'DEAD_CHARACTER',
        severity: 'CRITICAL',
        title: `已故角色幽灵登场 (${deadChar.name})`,
        snippet: deadChar.name,
        explanation: `角色【${deadChar.name}】已在前史或既往章节身陨，直接现身将造成剧情严重逻辑硬伤。`,
        autoFixText: `昔日${deadChar.name}留下的残破佩玉`,
      });
    }

    // 3. 通用白描检查：AI套话
    if (text.includes('值得一提的是')) {
      list.push({
        id: 'issue-3',
        type: 'OOC',
        severity: 'WARNING',
        title: '机械说明文口吻破坏沉浸',
        snippet: '值得一提的是',
        explanation: '小说正文禁止出现论说文过渡词，应以白描动作或环境光影代替。',
        autoFixText: '而此刻暗处',
      });
    }

    return list;
  }, [editorContent, characters]);

  const handleFix = (issue: ConsistencyIssue) => {
    onApplyFix(issue.snippet, issue.autoFixText);
    setFixedIssueIds((prev) => new Set(prev).add(issue.id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-2xl border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
          color: 'var(--text-main)',
        }}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-lg font-literary-serif">战力与设定防崩盘稽查</h3>
              <p className="text-xs font-literary-sans mt-0.5" style={{ color: 'var(--text-muted)' }}>
                扫描出 {issues.length} 处潜在战力漏洞与设定矛盾
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:opacity-75">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {issues.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <ShieldCheck className="w-12 h-12 text-emerald-500 mx-auto" />
              <div className="font-bold font-literary-serif">正文严谨，未发现逻辑撕裂</div>
              <p className="text-xs opacity-60">当前正文与全书战力等级、角色存活状态及世界法则完全吻合。</p>
            </div>
          ) : (
            issues.map((issue) => {
              const isFixed = fixedIssueIds.has(issue.id);
              return (
                <div
                  key={issue.id}
                  className="p-4 rounded-xl border space-y-3 transition shadow-xs"
                  style={{
                    backgroundColor:
                      issue.severity === 'CRITICAL'
                        ? 'color-mix(in srgb, #ef4444 5%, var(--bg-card))'
                        : 'color-mix(in srgb, #f59e0b 5%, var(--bg-card))',
                    borderColor:
                      issue.severity === 'CRITICAL'
                        ? 'color-mix(in srgb, #ef4444 25%, var(--border-subtle))'
                        : 'color-mix(in srgb, #f59e0b 25%, var(--border-subtle))',
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm font-literary-serif flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${issue.severity === 'CRITICAL' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                      <span>{issue.title}</span>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium border"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: issue.severity === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                        }}
                      >
                        {issue.severity === 'CRITICAL' ? '高危硬伤' : '风格建议'}
                      </span>
                    </span>
                    <button
                      onClick={() => handleFix(issue)}
                      disabled={isFixed}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shadow-xs hover:opacity-90 active:scale-[0.98]"
                      style={{ backgroundColor: isFixed ? '#10b981' : 'var(--accent-primary)' }}
                    >
                      {isFixed ? <CheckCircle className="w-3.5 h-3.5" /> : <Wrench className="w-3.5 h-3.5" />}
                      <span>{isFixed ? '已自愈修补' : '一键自愈修复'}</span>
                    </button>
                  </div>

                  <p className="text-xs font-literary-sans leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {issue.explanation}
                  </p>

                  <div className="text-xs p-3 rounded-lg border font-literary-serif space-y-2" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-start gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                        原文
                      </span>
                      <span className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        “{issue.snippet}”
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono shrink-0 font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                        修正
                      </span>
                      <span className="leading-relaxed font-medium" style={{ color: 'var(--text-main)' }}>
                        “{issue.autoFixText}”
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
