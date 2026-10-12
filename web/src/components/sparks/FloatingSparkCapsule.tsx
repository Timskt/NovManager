import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Rocket,
  Layers,
  Anchor,
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

  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        bottom: '20px',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
      }}
    >
      {toast && (
        <div
          style={{
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--accent-primary)',
            color: 'var(--text-main)',
            fontSize: '12px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}
        >
          {toast}
        </div>
      )}

      {isOpen && (
        <div
          style={{
            width: '370px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: '0 16px 42px rgba(15, 23, 42, 0.25)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
              <Sparkles size={16} color="#d97706" />
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)' }}>
                随时补充：灵光一现 / 读者讨论速记
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Type Pills */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {QUICK_TYPES.map((t) => {
              const active = sparkType === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSparkType(t.id)}
                  style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '999px',
                    border: active ? '1px solid #d97706' : '1px solid var(--border-subtle)',
                    background: active ? 'rgba(217, 119, 6, 0.14)' : 'var(--bg-canvas)',
                    color: active ? '#d97706' : 'var(--text-muted)',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                  }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Title & Anchor Chapter */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 96px', gap: '8px' }}>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="灵感短标题（选填，可自动提炼）"
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
            <input
              type="number"
              min={1}
              value={targetChapter}
              onChange={(e) => setTargetChapter(e.target.value)}
              placeholder="锚定第几章"
              style={{
                padding: '7px 8px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
          </div>

          {sparkType === 'READER_SUGGESTION' && (
            <input
              type="text"
              value={readerSource}
              onChange={(e) => setReaderSource(e.target.value)}
              placeholder="来源：如 起点本章说热评 / 番茄段评 / 书友群讨论..."
              style={{
                padding: '7px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
              }}
            />
          )}

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            placeholder="随时记下脑海里突然冒出的金句、反转点子、或者读者在评论区讨论的精彩脑洞..."
            style={{
              width: '100%',
              padding: '9px 10px',
              borderRadius: '8px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-main)',
              fontSize: '12.5px',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleSave(false)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Anchor size={13} color="#d97706" />
              存入灵感库待用
            </button>
            <button
              onClick={() => handleSave(true)}
              style={{
                flex: 1,
                padding: '8px 10px',
                borderRadius: '8px',
                border: 'none',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
              }}
            >
              <Send size={13} />
              立即织入当前正文
            </button>
          </div>

          {/* Quick Jump Links */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingTop: '8px',
              borderTop: '1px solid var(--border-subtle)',
              fontSize: '11px',
            }}
          >
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('SPARK_HUB');
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: 'var(--accent-primary)',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              打开灵光与读者热议中枢 ({pendingCount}) →
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onNavigateTab('AUTOPILOT');
              }}
              style={{
                border: 'none',
                background: 'transparent',
                color: '#059669',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              全自动巡航码字 →
            </button>
          </div>
        </div>
      )}

      {/* Floating Capsule Trigger Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '999px',
          padding: '5px 7px',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.18)',
        }}
      >
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '7px 14px',
            borderRadius: '999px',
            border: 'none',
            background: 'linear-gradient(135deg, #d97706 0%, #ea580c 100%)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="随时记录突发灵感或读者本章说评论"
        >
          <Sparkles size={14} />
          <span>灵光速记 ({pendingCount})</span>
        </button>

        <button
          onClick={() => onNavigateTab('SKILL_VAULT')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 11px',
            borderRadius: '999px',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-canvas)',
            color: 'var(--text-main)',
            fontSize: '11.5px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="管理跨作品复用的套路、等级、文风、副本中心库"
        >
          <Layers size={13} color="var(--accent-primary)" />
          <span>技能库 ({checkedSkillsCount}勾选)</span>
        </button>

        <button
          onClick={() => onNavigateTab('AUTOPILOT')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '7px 11px',
            borderRadius: '999px',
            border: '1px solid rgba(5, 150, 105, 0.35)',
            background: 'rgba(5, 150, 105, 0.1)',
            color: '#059669',
            fontSize: '11.5px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
          title="进入全自动无人值守巡航码字舱（支持零输入码一整小时）"
        >
          <Rocket size={13} />
          <span>无人码字</span>
        </button>
      </div>
    </div>
  );
};
