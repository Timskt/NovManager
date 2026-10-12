import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Cpu,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Plus,
  Trash2,
  ArrowRight,
  Feather,
  Users,
  BookOpen,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  Unlock,
} from 'lucide-react';
import { useNovel } from '../../context/NovelContext';
import { NavTab } from '../Header';
import {
  MemoryFactAnchor,
  HallucinationAuditReport,
} from '../../types/novel';
import {
  buildDefaultFactAnchors,
  buildCompactGroundedContext,
  auditAndSanitizeHallucinations,
} from '../../lib/llmMemoryGuard';

interface MemoryTokenAntiHallucinationViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

const CATEGORY_LABELS: Record<
  MemoryFactAnchor['category'],
  { label: string; color: string }
> = {
  POWER_CEILING_LOCK: { label: '境界天花板锁', color: '#e11d48' },
  CHARACTER_ALIVE_LOCK: { label: '生死簿防诈尸锁', color: '#7c3aed' },
  EPISTEMIC_SECRET_LOCK: { label: '信息差防剧透锁', color: '#d97706' },
  INVENTORY_LOCK: { label: '道具消耗守恒锁', color: '#059669' },
  TIMELINE_SPATIAL_LOCK: { label: '空间位置防瞬移锁', color: '#2563eb' },
};

export const MemoryTokenAntiHallucinationView: React.FC<
  MemoryTokenAntiHallucinationViewProps
> = ({ onNavigateTab }) => {
  const {
    novel,
    volumes,
    activeChapter,
    activeScene,
    setActiveChapterId,
    characters,
    characterStates,
    worldSettings,
    foreshadowings,
    editorContent,
    setEditorContent,
  } = useNovel();

  const allChapters = useMemo(() => volumes.flatMap((v) => v.chapters), [volumes]);

  // Fact anchors state
  const [customAnchors, setCustomAnchors] = useState<MemoryFactAnchor[]>(() =>
    buildDefaultFactAnchors({
      novel,
      volume: volumes[0],
      chapter: activeChapter,
      scene: activeScene,
      characters,
      characterStates,
      worldSettings,
    })
  );

  const [newAnchorEntity, setNewAnchorEntity] = useState('');
  const [newAnchorCategory, setNewAnchorCategory] =
    useState<MemoryFactAnchor['category']>('POWER_CEILING_LOCK');
  const [newAnchorConstraint, setNewAnchorConstraint] = useState('');
  const [newAnchorPatterns, setNewAnchorPatterns] = useState('');

  // Hallucination scanner state
  const [scanText, setScanText] = useState<string>(
    editorContent ||
      '林越握紧断剑，气海内筑基初期的真元剧烈翻涌。然而下一刻，他竟元婴出窍，一步迈出便已在千里之外的中州皇城！他早就知道幕后黑手是授业恩师，此时青云老祖真身降临，哈哈大笑走出虚空。'
  );
  const [auditReport, setAuditReport] = useState<HallucinationAuditReport | null>(() =>
    auditAndSanitizeHallucinations({
      draftText:
        editorContent ||
        '林越握紧断剑，气海内筑基初期的真元剧烈翻涌。然而下一刻，他竟元婴出窍，一步迈出便已在千里之外的中州皇城！他早就知道幕后黑手是授业恩师，此时青云老祖真身降临，哈哈大笑走出虚空。',
      factAnchors: customAnchors,
      protagonistName: characters[0]?.name || '林越',
      currentRealm: characterStates[0]?.combatPower || '筑基初期',
    })
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Live 4-Tier Memory & Token Compression report
  const compressionReport = useMemo(
    () =>
      buildCompactGroundedContext({
        novel,
        volumes,
        activeChapter,
        activeScene,
        characters,
        characterStates,
        worldSettings,
        foreshadowings,
        recentDraftText: editorContent,
        customAnchors,
      }),
    [
      novel,
      volumes,
      activeChapter,
      activeScene,
      characters,
      characterStates,
      worldSettings,
      foreshadowings,
      editorContent,
      customAnchors,
    ]
  );

  const handleToggleAnchor = (id: string) => {
    setCustomAnchors((prev) =>
      prev.map((a) => (a.id === id ? { ...a, isActive: !a.isActive } : a))
    );
  };

  const handleDeleteAnchor = (id: string) => {
    setCustomAnchors((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAnchor = () => {
    if (!newAnchorEntity.trim() || !newAnchorConstraint.trim()) return;
    const item: MemoryFactAnchor = {
      id: `anchor-custom-${Date.now()}`,
      tier: 'L4_CANONICAL_REDLINE',
      category: newAnchorCategory,
      entityName: newAnchorEntity.trim(),
      hardConstraint: newAnchorConstraint.trim(),
      violationPattern: newAnchorPatterns
        .split(/[,，、]/)
        .map((s) => s.trim())
        .filter(Boolean),
      isActive: true,
    };
    setCustomAnchors((prev) => [item, ...prev]);
    setNewAnchorEntity('');
    setNewAnchorConstraint('');
    setNewAnchorPatterns('');
    showToast(`✅ 已新增防幻觉事实锚点：「${item.entityName}」`);
  };

  const handleRunScan = (textToScan?: string) => {
    const target = textToScan !== undefined ? textToScan : scanText;
    const report = auditAndSanitizeHallucinations({
      draftText: target,
      factAnchors: customAnchors,
      protagonistName: characters[0]?.name || '林越',
      currentRealm: characterStates[0]?.combatPower || '筑基初期',
    });
    setAuditReport(report);
    showToast(
      `🛡️ 扫描完毕：事实忠实度 ${report.faithfulnessScore}%，检出 ${report.findings.length} 处幻觉风险`
    );
  };

  const handleInjectDemoHallucination = () => {
    const sample =
      '夜枭冷笑逼近，林越虽只是筑基初期，却猛然施展出元婴出窍与化神法相，一步迈出便已在千里之外！他早就知道幕后黑手是恩师，更早看穿了神殿圣女的第二神魂。就在此时，三百年前早已陨落的青云老祖真身降临，一掌拍碎敌阵！';
    setScanText(sample);
    handleRunScan(sample);
  };

  const handleApplySanitizedToStudio = () => {
    if (!auditReport) return;
    setScanText(auditReport.sanitizedDraft);
    setEditorContent(auditReport.sanitizedDraft);
    showToast('✨ 已将防幻觉自愈修复后的正文同步写入【创作台】编辑器！');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '16px 24px 36px 24px',
      }}
    >
      {toast && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            background: 'rgba(5, 150, 105, 0.14)',
            border: '1px solid rgba(5, 150, 105, 0.35)',
            color: '#059669',
            fontSize: '13px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{toast}</span>
          {onNavigateTab && (
            <button
              onClick={() => onNavigateTab('STUDIO')}
              style={{
                border: 'none',
                background: '#059669',
                color: '#fff',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '11.5px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              立即前往创作台查看 →
            </button>
          )}
        </div>
      )}

      {/* Top Executive Header */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #059669 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(5, 150, 105, 0.25)',
            }}
          >
            <ShieldCheck size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                大模型四级记忆、Token 精算压缩与防幻觉护栏中枢
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: 'rgba(5, 150, 105, 0.14)',
                  color: '#059669',
                }}
              >
                ● 全链路已接管 AIService
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              通过 L1~L4 四级分层记忆召回、非在场角色剪枝、KV 前缀缓存对齐与事实锚点锁死，大幅节省 Token 并杜绝战力崩坏、亡者诈尸与信息差剧透幻觉
            </p>
          </div>
        </div>

        {/* Quick Cross-View Navigation Buttons */}
        {onNavigateTab && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => onNavigateTab('STUDIO')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Feather size={14} color="var(--accent-primary)" />
              返回创作台
            </button>
            <button
              onClick={() => onNavigateTab('MODEL_HUB')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Cpu size={14} color="#6366f1" />
              多模型路由与配额
            </button>
            <button
              onClick={() => onNavigateTab('CHARACTERS')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Users size={14} color="#10b981" />
              核对角色状态机
            </button>
            <button
              onClick={() => onNavigateTab('LORE')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '9px',
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-main)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <BookOpen size={14} color="#f59e0b" />
              世界观铁律百科
            </button>
          </div>
        )}
      </div>

      {/* KPI Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>单次调用 Token 压缩率</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#059669', marginTop: '4px' }}>
            -{compressionReport.compressionRatioPercent}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            原始 {compressionReport.totalRawTokens.toLocaleString()} → 精算后{' '}
            {compressionReport.totalCompressedTokens.toLocaleString()} Tokens
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>KV Prefix Cache 命中率</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--accent-primary)', marginTop: '4px' }}>
            {compressionReport.prefixCacheHitRatePercent}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            静态 L4 铁律置顶对齐，大幅降低首字延迟 (TTFT)
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>激活防幻觉事实锚点</div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#7c3aed', marginTop: '4px' }}>
            {customAnchors.filter((a) => a.isActive).length} 条铁律
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            覆盖生死簿、境界上限、空间位置与信息差锁
          </div>
        </div>

        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>当前草稿事实忠实度</div>
          <div
            style={{
              fontSize: '24px',
              fontWeight: 800,
              color:
                (auditReport?.faithfulnessScore || 100) >= 90 ? '#059669' : '#dc2626',
              marginTop: '4px',
            }}
          >
            {auditReport?.faithfulnessScore ?? 98}%
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            检出 {auditReport?.findings.length || 0} 处设定越界或幻觉风险
          </div>
        </div>
      </div>

      {/* Main Two-Column Workspace */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
        {/* Left Column: 4-Tier Memory & Token Compression Breakdown + Compact Prompt Preview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={16} color="var(--accent-primary)" />
                1. 四级分层记忆架构与 Token 剪枝明细
              </span>
              <select
                value={activeChapter?.id || ''}
                onChange={(e) => setActiveChapterId(e.target.value)}
                style={{
                  padding: '5px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                }}
              >
                {allChapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>
                    第 {ch.chapterIndex} 章：{ch.title}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {compressionReport.slices.map((sl) => {
                const savedRatio = Math.max(
                  0,
                  Math.round(((sl.rawTokens - sl.compressedTokens) / Math.max(1, sl.rawTokens)) * 100)
                );
                return (
                  <div
                    key={sl.tier}
                    style={{
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {sl.label}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {sl.prunedEntitiesCount > 0 && (
                          <span
                            style={{
                              fontSize: '10.5px',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              background: 'rgba(217, 119, 6, 0.14)',
                              color: '#d97706',
                              fontWeight: 600,
                            }}
                          >
                            已剪枝 {sl.prunedEntitiesCount} 个无关实体
                          </span>
                        )}
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            color: '#059669',
                            fontWeight: 700,
                          }}
                        >
                          {sl.rawTokens} → {sl.compressedTokens} Tokens (-{savedRatio}%)
                        </span>
                      </div>
                    </div>
                    <pre
                      style={{
                        margin: 0,
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.45,
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {sl.compressedPreview}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Fact Anchor Management */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Lock size={15} color="#e11d48" />
              2. 防幻觉硬性事实锚点矩阵 (Fact Anchors)
            </div>

            {/* Add new anchor form */}
            <div
              style={{
                padding: '10px',
                borderRadius: '10px',
                background: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '8px' }}>
                <select
                  value={newAnchorCategory}
                  onChange={(e) => setNewAnchorCategory(e.target.value as any)}
                  style={{
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                >
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newAnchorEntity}
                  onChange={(e) => setNewAnchorEntity(e.target.value)}
                  placeholder="锁定对象（如：林越境界锁 / 断魂崖空间锁）"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
              </div>
              <input
                type="text"
                value={newAnchorConstraint}
                onChange={(e) => setNewAnchorConstraint(e.target.value)}
                placeholder="硬性事实红线描述（如：当前仅筑基初期，严禁御剑飞行或瞬移）"
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-main)',
                  fontSize: '12px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={newAnchorPatterns}
                  onChange={(e) => setNewAnchorPatterns(e.target.value)}
                  placeholder="幻觉拦截触发词，逗号分隔（如：元婴出窍, 瞬移万里）"
                  style={{
                    flex: 1,
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={handleAddAnchor}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} />
                  新增锚点
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {customAnchors.map((anc) => {
                const meta = CATEGORY_LABELS[anc.category];
                return (
                  <div
                    key={anc.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      background: 'var(--bg-canvas)',
                      border: anc.isActive
                        ? `1px solid ${meta.color}55`
                        : '1px solid var(--border-subtle)',
                      opacity: anc.isActive ? 1 : 0.6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            background: `${meta.color}18`,
                            color: meta.color,
                          }}
                        >
                          {meta.label}
                        </span>
                        <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-main)' }}>
                          {anc.entityName}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleToggleAnchor(anc.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: anc.isActive ? '#059669' : 'var(--text-muted)',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          {anc.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                          {anc.isActive ? '已锁死' : '已暂停'}
                        </button>
                        <button
                          onClick={() => handleDeleteAnchor(anc.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.45 }}>
                      {anc.hardConstraint}
                    </div>
                    {anc.violationPattern.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                        {anc.violationPattern.map((pat, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              background: 'rgba(225, 29, 72, 0.1)',
                              color: '#e11d48',
                            }}
                          >
                            拦截词：{pat}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Post-Generation Hallucination Scanner & One-Click Auto-Sanitizer */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={16} color="#7c3aed" />
              3. 生成后幻觉雷达扫描与一键消杀自愈台
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={handleInjectDemoHallucination}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid rgba(225, 29, 72, 0.35)',
                  background: 'rgba(225, 29, 72, 0.08)',
                  color: '#e11d48',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                注入典型幻觉测试样本
              </button>
              <button
                onClick={() => {
                  setScanText(editorContent);
                  handleRunScan(editorContent);
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-main)',
                  fontSize: '11.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                拉取创作台当前草稿
              </button>
              <button
                onClick={() => handleRunScan()}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <RefreshCw size={13} />
                立即扫描幻觉
              </button>
            </div>
          </div>

          <textarea
            value={scanText}
            onChange={(e) => setScanText(e.target.value)}
            rows={7}
            placeholder="在此粘贴或检测大模型生成的正文草稿..."
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-main)',
              fontSize: '13px',
              lineHeight: 1.7,
              resize: 'vertical',
            }}
          />

          {/* Audit Findings List */}
          {auditReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  background:
                    auditReport.findings.length === 0
                      ? 'rgba(5, 150, 105, 0.1)'
                      : 'rgba(225, 29, 72, 0.1)',
                  border:
                    auditReport.findings.length === 0
                      ? '1px solid rgba(5, 150, 105, 0.3)'
                      : '1px solid rgba(225, 29, 72, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {auditReport.findings.length === 0 ? (
                    <CheckCircle2 size={18} color="#059669" />
                  ) : (
                    <AlertTriangle size={18} color="#e11d48" />
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)' }}>
                    {auditReport.findings.length === 0
                      ? `零幻觉通过！事实忠实度 ${auditReport.faithfulnessScore}%`
                      : `拦截到 ${auditReport.findings.length} 处大模型幻觉/设定越界（事实忠实度 ${auditReport.faithfulnessScore}%）`}
                  </span>
                </div>

                {auditReport.findings.length > 0 && (
                  <button
                    onClick={handleApplySanitizedToStudio}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '8px',
                      border: 'none',
                      background: '#059669',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <CheckCircle2 size={14} />
                    一键自愈消杀并同步至创作台
                  </button>
                )}
              </div>

              {auditReport.findings.map((f) => (
                <div
                  key={f.id}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'var(--bg-canvas)',
                    border: '1px solid rgba(225, 29, 72, 0.35)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'rgba(225, 29, 72, 0.14)',
                        color: '#e11d48',
                      }}
                    >
                      ⚠️ {f.hallucinationType}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      命中片段：「{f.offendingSnippet}」
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-main)', marginTop: '6px' }}>
                    <strong>违反事实锚点：</strong>
                    {f.factViolated}
                  </div>
                  <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                    <strong>自愈修正方案：</strong>替换为「{f.autoFixReplacement}」
                  </div>
                </div>
              ))}

              {/* Compact Prompt Preview */}
              <div
                style={{
                  marginTop: '6px',
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-canvas)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
                  📦 当前发送给大模型的精算组装 Prompt 预览 ({compressionReport.totalCompressedTokens} Tokens)
                </div>
                <pre
                  style={{
                    margin: 0,
                    maxHeight: '210px',
                    overflowY: 'auto',
                    fontSize: '11px',
                    lineHeight: 1.5,
                    color: 'var(--text-muted)',
                    whiteSpace: 'pre-wrap',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {compressionReport.assembledCompactPrompt}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
