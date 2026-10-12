// ==============================================================================
// 响应式防遮挡灵光速记悬浮胶囊 (Auto-Avoiding Collapsible Spark Capsule)
// 解决窗口缩小时遮挡底部 Tab 的问题：
// 1. 窄屏 (<1024px) 自动上移避让底部导航栏 (bottom-20)，宽屏位于右下角安全区
// 2. 支持一键【贴边最小化 (Minimize to Edge)】收敛为 28px 侧边微标，零遮挡
// 3. 默认采用单胶囊紧凑形态，按需展开快捷入口，支持顶部/底部位置一键切换
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Rocket,
  Layers,
  Anchor,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Minimize2,
} from 'lucide-react';
import { useNovel } from '../../context/NovelContext';
import { EpiphanySpark, EpiphanySparkType } from '../../types/novel';
import {
  fetchEpiphanySparks,
  saveEpiphanySpark,
  fetchCreationSkills,
} from '../../lib/api';
import { NavTab } from '../Header';

interface FloatingSparkCapsuleProps {
  onNavigateTab: (tab: NavTab) => void;
}

const QUICK_TYPES: { id: EpiphanySparkType; label: string }[] = [
  { id: 'PLOT_TWIST', label: '剧情反转' },
  { id: 'DIALOGUE_GOLD', label: '神仙台词' },
  { id: 'READER_SUGGESTION', label: '读者热议/听劝' },
  { id: 'CHARACTER_QUIRK', label: '人设细节' },
  { id: 'LORE_FRAGMENT', label: '世界观碎片' },
  { id: 'SCENE_IMAGE', label: '名场面画面' },
];

export const FloatingSparkCapsule: React.FC<FloatingSparkCapsuleProps> = ({
  onNavigateTab,
}) => {
  const { novel, editorContent, setEditorContent } = useNovel();
  const [isOpen, setIsOpen] = useState(false);
  // 默认折叠快捷外挂按钮，避免三个按钮平铺挡住底部内容
  const [showQuickLinks, setShowQuickLinks] = useState(false);
  // 默认贴边收起为侧边小书签，彻底避免遮挡右侧 AI 参谋底部发送框
  const [isMinimizedToEdge, setIsMinimizedToEdge] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('spark_capsule_minimized');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });

  const [sparkType, setSparkType] = useState<EpiphanySparkType>('PLOT_TWIST');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetChapter, setTargetChapter] = useState<string>('');
  const [readerSource, setReaderSource] = useState('');
  const [pendingCount, setPendingCount] = useState(4);
  const [checkedSkillsCount, setCheckedSkillsCount] = useState(6);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    refreshCounts();
  }, [novel.id, isOpen]);

  const toggleMinimizeToEdge = (val: boolean) => {
    setIsMinimizedToEdge(val);
    if (val) setIsOpen(false);
    try {
      localStorage.setItem('spark_capsule_minimized', String(val));
    } catch {
      // ignore
    }
  };

  const refreshCounts = async () => {
    const [spList, skList] = await Promise.all([
      fetchEpiphanySparks(novel.id),
      fetchCreationSkills(),
    ]);
    setPendingCount(spList.filter((s) => s.status !== 'ARCHIVED').length);
    setCheckedSkillsCount(skList.filter((s) => s.isEnabled).length);
  };

  const handleSave = async (weaveNow: boolean) => {
    if (!content.trim() && !title.trim()) return;
    const finalTitle =
      title.trim() ||
      `${QUICK_TYPES.find((t) => t.id === sparkType)?.label || '灵感'} · ${content.trim().slice(0, 12)}`;

    const newSpark: EpiphanySpark = {
      id: `spark-quick-${Date.now()}`,
      novelId: novel.id,
      title: finalTitle,
      content: content.trim(),
      sparkType,
      source: sparkType === 'READER_SUGGESTION' ? 'READER_COMMENT' : 'AUTHOR_BRAINWAVE',
      readerUsername: readerSource.trim() || undefined,
      heatScore: 92,
      status: weaveNow ? 'WOVEN' : targetChapter ? 'ANCHORED' : 'INBOX',
      targetChapterIndex: targetChapter ? Number(targetChapter) : undefined,
      tags: [QUICK_TYPES.find((t) => t.id === sparkType)?.label || '灵光一现'],
      createdAt: new Date().toISOString(),
    };

    await saveEpiphanySpark(newSpark);
    if (weaveNow) {
      const appended = `${editorContent}\n\n【✨ 灵光一现即时织入 · ${finalTitle}】\n${newSpark.content}\n`;
      setEditorContent(appended);
      setToast(`⚡ 已将「${finalTitle}」织入当前创作台正文！`);
    } else {
      setToast(`📌 已将「${finalTitle}」存入灵光一现收件箱！`);
    }
    setTimeout(() => setToast(null), 3200);

    setTitle('');
    setContent('');
    setTargetChapter('');
    setReaderSource('');
    setIsOpen(false);
    refreshCounts();
  };

  // 贴边最小化状态：仅在右侧垂直居中显示一个极窄的 26px 书签耳，绝不遮挡底部任何发送框或 Tab
  if (isMinimizedToEdge) {
    return (
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex items-center">
        <button
          onClick={() => {
            toggleMinimizeToEdge(false);
            setIsOpen(true);
          }}
          title="展开【灵光速记】悬浮窗"
          className="px-1.5 py-2.5 rounded-l-xl border border-r-0 shadow-lg flex flex-col items-center gap-1 transition-all hover:pr-2.5 cursor-pointer opacity-80 hover:opacity-100"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--accent-primary)',
          }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold [writing-mode:vertical-rl] tracking-widest">
            灵光({pendingCount})
          </span>
          <ChevronLeft className="w-3 h-3 opacity-70" />
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed right-3 sm:right-5 bottom-24 lg:bottom-28 z-40 flex flex-col items-end gap-2.5 pointer-events-none"
    >
      {toast && (
        <div
          className="pointer-events-auto px-3.5 py-2 rounded-xl border text-xs font-semibold shadow-xl"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--accent-primary)',
            color: 'var(--text-main)',
          }}
        >
          {toast}
        </div>
      )}

      {isOpen && (
        <div
          className="pointer-events-auto w-[350px] max-w-[92vw] rounded-2xl border p-4 shadow-2xl flex flex-col gap-2.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-strong)',
            color: 'var(--text-main)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-xs font-bold">随时补充：灵光一现 / 读者讨论速记</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleMinimizeToEdge(true)}
                title="贴边收起，避免遮挡任何底部区域"
                className="p-1 rounded hover:bg-[var(--bg-card)] text-[11px] flex items-center gap-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                <Minimize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-[var(--bg-card)]"
                style={{ color: 'var(--text-muted)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Type Pills */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TYPES.map((t) => {
              const active = sparkType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSparkType(t.id)}
                  className="text-[11px] px-2.5 py-1 rounded-full border transition cursor-pointer"
                  style={{
                    borderColor: active ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    backgroundColor: active ? 'var(--accent-surface)' : 'var(--bg-canvas)',
                    color: active ? 'var(--accent-primary)' : 'var(--text-muted)',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Title & Anchor Chapter */}
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="灵感短标题（选填）"
              className="col-span-2 px-2.5 py-1.5 rounded-lg border text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-main)',
              }}
            />
            <input
              type="number"
              min={1}
              value={targetChapter}
              onChange={(e) => setTargetChapter(e.target.value)}
              placeholder="锚定章号"
              className="px-2 py-1.5 rounded-lg border text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-main)',
              }}
            />
          </div>

          {sparkType === 'READER_SUGGESTION' && (
            <input
              type="text"
              value={readerSource}
              onChange={(e) => setReaderSource(e.target.value)}
              placeholder="来源：如 起点本章说热评 / 番茄段评 / 书友群讨论..."
              className="px-2.5 py-1.5 rounded-lg border text-xs"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-main)',
              }}
            />
          )}

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            placeholder="随时记下脑海里突然冒出的金句、反转点子、或者读者在评论区讨论的精彩脑洞..."
            className="w-full p-2.5 rounded-lg border text-xs leading-relaxed resize-y"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-canvas)',
              color: 'var(--text-main)',
            }}
          />

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleSave(false)}
              className="flex-1 py-2 px-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-main)',
              }}
            >
              <Anchor className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              存入灵感库
            </button>
            <button
              onClick={() => handleSave(true)}
              className="flex-1 py-2 px-2.5 rounded-lg text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: 'var(--accent-primary)' }}
            >
              <Send className="w-3.5 h-3.5" />
              立即织入正文
            </button>
          </div>

          {/* Quick Jump Links */}
          <div
            className="flex items-center justify-between pt-2 border-t text-[11px]"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('SPARK_HUB');
              }}
              className="font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
              style={{ color: 'var(--accent-primary)' }}
            >
              <span>打开灵感与读者中枢 ({pendingCount})</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('AUTOPILOT');
              }}
              className="font-semibold hover:underline cursor-pointer flex items-center gap-0.5"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>全自动巡航码字</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* 紧凑防遮挡触发胶囊栏：默认仅显示单个紧凑主胶囊 + 展开/贴边收起按钮 */}
      <div
        className="pointer-events-auto flex items-center gap-1 rounded-full border p-1 shadow-lg backdrop-blur-md transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        {showQuickLinks && (
          <div className="hidden sm:flex items-center gap-1 pl-1 animate-fadeIn">
            <button
              onClick={() => onNavigateTab('SKILL_VAULT')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition hover:opacity-90 cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-main)',
              }}
              title="管理跨作品复用的套路、等级、文风、副本中心库"
            >
              <Layers className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
              <span>技能库 ({checkedSkillsCount})</span>
            </button>

            <button
              onClick={() => onNavigateTab('AUTOPILOT')}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition hover:opacity-90 cursor-pointer"
              style={{
                borderColor: 'var(--border-subtle)',
                backgroundColor: 'var(--bg-canvas)',
                color: 'var(--text-main)',
              }}
              title="进入全自动无人值守巡航码字舱"
            >
              <Rocket className="w-3 h-3" style={{ color: 'var(--accent-primary)' }} />
              <span>巡航码字</span>
            </button>
          </div>
        )}

        <button
          onClick={() => setShowQuickLinks((prev) => !prev)}
          className="hidden sm:flex p-1.5 rounded-full hover:bg-[var(--bg-card)] transition cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title={showQuickLinks ? '收起旁边快捷按钮' : '展开技能库与巡航快捷入口'}
        >
          {showQuickLinks ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold transition hover:opacity-95 cursor-pointer shadow-xs"
          style={{ backgroundColor: 'var(--accent-primary)' }}
          title="随时记录突发灵感或读者本章说评论"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">灵光速记</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-[10px] font-mono">
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => toggleMinimizeToEdge(true)}
          className="p-1.5 rounded-full hover:bg-[var(--bg-card)] transition cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          title="贴边最小化（彻底不挡右下角任何区域）"
        >
          <Minimize2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
