import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  Cpu,
  Zap,
  CheckCircle2,
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
  Pin,
  VolumeX,
  Package,
  Flame,
  Link2,
  Compass,
  UserPlus,
  BookmarkPlus,
  Search,
} from 'lucide-react';
import { useNovel } from '../../context/NovelContext';
import { NavTab } from '../Header';
import {
  MemoryFactAnchor,
  HallucinationAuditReport,
  InventoryLedgerItem,
  CrossViewTeleportPayload,
} from '../../types/novel';
import {
  buildDefaultFactAnchors,
  buildCompactGroundedContext,
  auditAndSanitizeHallucinations,
  buildChapterMemoryConsolidation,
  computeSceneEntityPruning,
  dehydratePromptText,
  buildDefaultInventoryLedger,
  detectUnregisteredEntities,
  extractSmartEntityLinks,
  ARCHITECTURE_30_CATALOG,
} from '../../lib/llmMemoryGuard';

interface MemoryTokenAntiHallucinationViewProps {
  onNavigateTab?: (tab: NavTab, payload?: CrossViewTeleportPayload) => void;
}

type GuardSubTab =
  | 'MEMORY_BUDGET'
  | 'ENTITY_PRUNING'
  | 'FACT_LEDGER'
  | 'HALLUCINATION_REDTEAM'
  | 'SMART_HYPERLINKS'
  | 'BLUEPRINT_30X30';

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

function makeTeleportPayload(
  targetTab: NavTab,
  sourceTitle: string,
  contextSummary: string,
  extra?: { entityName?: string; chapterId?: string; sceneIndex?: number }
): CrossViewTeleportPayload {
  return {
    sourceTab: 'MEMORY_GUARD',
    sourceTitle,
    targetTab,
    contextSummary,
    timestamp: new Date().toLocaleTimeString('zh-CN', { hour12: false }),
    ...extra,
  };
}

export const MemoryTokenAntiHallucinationView: React.FC<
  MemoryTokenAntiHallucinationViewProps
> = ({ onNavigateTab }) => {
  const {
    novel,
    volumes,
    activeChapter,
    activeScene,
    setActiveChapterId,
    setActiveSceneIndex,
    characters,
    characterStates,
    worldSettings,
    foreshadowings,
    editorContent,
    setEditorContent,
    addCharacter,
    addWorldSetting,
  } = useNovel();

  const [activeSubTab, setActiveSubTab] = useState<GuardSubTab>('MEMORY_BUDGET');
  const [tokenBudget, setTokenBudget] = useState<number>(1600);
  const [pinnedEntityIds, setPinnedEntityIds] = useState<string[]>([]);
  const [mutedEntityIds, setMutedEntityIds] = useState<string[]>([]);

  // Prompt Dehydration State (F07 / A07)
  const [rawPromptInput, setRawPromptInput] = useState<string>(
    `请你作为一名经验丰富的网文大神作家，一定要特别注意千万不要忘记以下设定：\n====================\n[主角：林越 | 当前境界：筑基初期 | 位置：太虚古渊底部]\n务必要严格遵守以下非常重要的铁律：绝对不能越阶使用元婴神通，青云老祖已死不能复活。\n====================\n非常感谢你的配合，请开始吧！`
  );

  // Inventory Conservation Ledger State (F15 / A15)
  const [inventoryItems, setInventoryItems] = useState<InventoryLedgerItem[]>(() =>
    buildDefaultInventoryLedger(characters)
  );
  const [newItemName, setNewItemName] = useState('');
  const [newItemOwner, setNewItemOwner] = useState(characters[0]?.name || '林越');
  const [newItemStatus, setNewItemStatus] =
    useState<InventoryLedgerItem['status']>('CONSUMED_DESTROYED');

  // Blueprint 30x30 Filter State
  const [blueprintPillarFilter, setBlueprintPillarFilter] = useState<
    'ALL' | 'MEMORY_TOKEN' | 'ANTI_HALLUCINATION' | 'HYPER_NAVIGATION'
  >('ALL');
  const [blueprintSearch, setBlueprintSearch] = useState('');

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
      '林越握紧断剑，气海内筑基初期的真元剧烈翻涌。然而下一刻，他竟元婴出窍，一步迈出便已在千里之外的中州皇城！他再次捏碎那枚血遁千里符，早就知道幕后黑手是授业恩师，此时青云老祖真身降临，阴影中传来黑煞鬼母森然的冷笑。'
  );

  // Combine custom fact anchors with consumed/destroyed inventory locks
  const effectiveFactAnchors = useMemo(() => {
    const invAnchors: MemoryFactAnchor[] = inventoryItems
      .filter(
        (item) =>
          item.status === 'CONSUMED_DESTROYED' || item.status === 'DAMAGED'
      )
      .map((item) => ({
        id: `anchor-inv-${item.id}`,
        tier: 'L4_CANONICAL_REDLINE',
        category: 'INVENTORY_LOCK',
        entityName: item.itemName,
        hardConstraint: item.conservationConstraint,
        violationPattern: item.forbiddenReusePhrases,
        isActive: true,
      }));
    return [...customAnchors, ...invAnchors];
  }, [customAnchors, inventoryItems]);

  const [auditReport, setAuditReport] = useState<HallucinationAuditReport | null>(() =>
    auditAndSanitizeHallucinations({
      draftText: scanText,
      factAnchors: effectiveFactAnchors,
      protagonistName: characters[0]?.name || '林越',
      currentRealm: characterStates[0]?.combatPower || '筑基初期',
    })
  );
  const [toast, setToast] = useState<{
    message: string;
    actionLabel?: string;
    actionTab?: NavTab;
  } | null>(null);

  const showToast = (
    message: string,
    actionLabel?: string,
    actionTab?: NavTab
  ) => {
    setToast({ message, actionLabel, actionTab });
    setTimeout(() => setToast(null), 4500);
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
        customAnchors: effectiveFactAnchors,
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
      effectiveFactAnchors,
    ]
  );

  // Hot / Warm / Cold Chapter Consolidation (F01 / A01)
  const chapterConsolidation = useMemo(
    () => buildChapterMemoryConsolidation(volumes, activeChapter?.id),
    [volumes, activeChapter?.id]
  );

  // Scene Entity Pruning with Pin/Mute overrides (F03 / A03)
  const pruningRecords = useMemo(
    () =>
      computeSceneEntityPruning({
        activeChapter,
        activeScene,
        characters,
        characterStates,
        worldSettings,
        foreshadowings,
        pinnedEntityIds,
        mutedEntityIds,
      }),
    [
      activeChapter,
      activeScene,
      characters,
      characterStates,
      worldSettings,
      foreshadowings,
      pinnedEntityIds,
      mutedEntityIds,
    ]
  );

  const pruningStats = useMemo(() => {
    const activeItems = pruningRecords.filter(
      (r) =>
        r.decision === 'PINNED_BY_AUTHOR' || r.decision === 'RECALLED_IN_SCENE'
    );
    const prunedItems = pruningRecords.filter(
      (r) =>
        r.decision === 'MUTED_BY_AUTHOR' || r.decision === 'PRUNED_IRRELEVANT'
    );
    const activeTokens = activeItems.reduce((acc, r) => acc + r.tupleTokens, 0);
    const savedTokensByPruning = prunedItems.reduce(
      (acc, r) => acc + r.rawTokens,
      0
    );
    return {
      activeCount: activeItems.length,
      prunedCount: prunedItems.length,
      activeTokens,
      savedTokensByPruning,
    };
  }, [pruningRecords]);

  // Prompt Dehydration Result (F07 / A07)
  const dehydrationResult = useMemo(
    () => dehydratePromptText(rawPromptInput),
    [rawPromptInput]
  );

  // Unregistered Entity NER Detection (F20 / A20)
  const unregisteredEntities = useMemo(
    () => detectUnregisteredEntities(scanText, characters, worldSettings),
    [scanText, characters, worldSettings]
  );

  // Smart Entity Links in Draft (F21 / A21)
  const smartEntityLinks = useMemo(
    () =>
      extractSmartEntityLinks({
        draftText: scanText,
        volumes,
        characters,
        worldSettings,
        foreshadowings,
      }),
    [scanText, volumes, characters, worldSettings, foreshadowings]
  );

  // Filtered 30x30 Blueprint Catalog
  const filteredBlueprints = useMemo(() => {
    return ARCHITECTURE_30_CATALOG.filter((item) => {
      if (blueprintPillarFilter !== 'ALL' && item.pillar !== blueprintPillarFilter) {
        return false;
      }
      if (!blueprintSearch.trim()) return true;
      const q = blueprintSearch.toLowerCase();
      return (
        item.featureTitle.toLowerCase().includes(q) ||
        item.architectureTitle.toLowerCase().includes(q) ||
        item.architectureMechanism.toLowerCase().includes(q) ||
        item.featureCode.toLowerCase().includes(q) ||
        item.architectureCode.toLowerCase().includes(q)
      );
    });
  }, [blueprintPillarFilter, blueprintSearch]);

  const handleTogglePinEntity = (entityId: string) => {
    setMutedEntityIds((prev) => prev.filter((id) => id !== entityId));
    setPinnedEntityIds((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  };

  const handleToggleMuteEntity = (entityId: string) => {
    setPinnedEntityIds((prev) => prev.filter((id) => id !== entityId));
    setMutedEntityIds((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId]
    );
  };

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

  const handleAddInventoryItem = () => {
    if (!newItemName.trim()) return;
    const item: InventoryLedgerItem = {
      id: `inv-${Date.now()}`,
      itemName: newItemName.trim(),
      holderName: newItemOwner.trim() || '林越',
      category: 'CONSUMABLE_PILL',
      status: newItemStatus,
      lastUpdatedChapter: activeChapter?.chapterIndex || 1,
      conservationConstraint: `${newItemOwner.trim() || '林越'}的「${newItemName.trim()}」状态为 ${newItemStatus}，严禁在后续章节违规重复使用`,
      forbiddenReusePhrases: [
        `服用${newItemName.trim()}`,
        `祭出${newItemName.trim()}`,
        `掏出${newItemName.trim()}`,
        newItemName.trim(),
      ],
    };
    setInventoryItems((prev) => [item, ...prev]);
    setNewItemName('');
    showToast(
      `📦 已登记道具账本：「${item.itemName}」(${item.status})，消耗品守恒锁已生效`
    );
  };

  const handleCycleInventoryStatus = (id: string) => {
    const order: InventoryLedgerItem['status'][] = [
      'HELD_INTACT',
      'CONSUMED_DESTROYED',
      'DAMAGED',
      'LOST_STOLEN',
    ];
    setInventoryItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextStatus =
          order[(order.indexOf(item.status) + 1) % order.length];
        return {
          ...item,
          status: nextStatus,
        };
      })
    );
  };

  const handleRunScan = (textToScan?: string) => {
    const target = textToScan !== undefined ? textToScan : scanText;
    const report = auditAndSanitizeHallucinations({
      draftText: target,
      factAnchors: effectiveFactAnchors,
      protagonistName: characters[0]?.name || '林越',
      currentRealm: characterStates[0]?.combatPower || '筑基初期',
    });
    setAuditReport(report);
    showToast(
      `🛡️ 扫描完毕：事实忠实度 ${report.faithfulnessScore}%，检出 ${report.findings.length} 处幻觉风险`
    );
  };

  const handleInjectChaosPreset = (
    type: 'REALM' | 'DEAD' | 'SPOILER' | 'ITEM' | 'ALL'
  ) => {
    const presets: Record<typeof type, string> = {
      REALM:
        '林越虽只是筑基初期修为，此刻却猛然元婴出窍，抬手施展化神法相与法则崩碎，一剑撕裂万古苍穹！',
      DEAD:
        '就在危急关头，三百年前早已陨落坐化的青云老祖竟真身降临，哈哈大笑走出虚空，亲自出手镇压强敌！',
      SPOILER:
        '林越冷笑一声，他早就知道幕后黑手是授业恩师，他早已看穿自己体内的第二神魂底牌！',
      ITEM:
        '林越神色一凝，再次捏碎那枚血遁千里符，又倒出一粒九转筑基血丹吞下，挥动完好无损的玄牝大印直接轰开秘境大门！',
      ALL: '夜枭冷笑逼近，林越虽只是筑基初期，却猛然施展出元婴出窍与化神法相，一步迈出便已在千里之外！他再次捏碎那枚血遁千里符，又倒出一粒九转筑基血丹吞下，他早就知道幕后黑手是恩师。就在此时，三百年前早已陨落的青云老祖真身降临，阴影中传来黑煞鬼母森然的冷笑！',
    };
    const nextText = presets[type];
    setScanText(nextText);
    handleRunScan(nextText);
  };

  const handleApplySanitizedToStudio = () => {
    if (!auditReport) return;
    setScanText(auditReport.sanitizedDraft);
    setEditorContent(auditReport.sanitizedDraft);
    showToast(
      '✨ 已将防幻觉自愈修复后的正文同步写入【创作台】编辑器！',
      '立即去创作台查看 →',
      'STUDIO'
    );
  };

  const handlePromoteUnregisteredToCharacter = (name: string) => {
    addCharacter({
      name,
      roleType: 'SUPPORTING',
      gender: '未知',
      background: '从正文草稿自动捕获并转正的登场人物',
      profile: {
        identity: '待归档身份',
        appearance: '待补充外貌特征',
        personalityTraits: ['果决', '神秘'],
        coreMotivation: '待补充核心动机',
        voiceAndTone: '沉稳简练',
        fatalFlaw: '待补充性格缺陷',
        catchphrases: ['且慢！'],
      },
    });
    showToast(
      `👤 已将新角色「${name}」正式转正入库【人物谱】！`,
      '去人物谱完善档案 →',
      'CHARACTERS'
    );
  };

  const handlePromoteUnregisteredToLore = (name: string) => {
    addWorldSetting({
      category: 'GEOGRAPHY',
      name,
      priority: 80,
      aliases: [name],
      tags: ['自动捕获', '正文转正'],
      content: `从正文草稿自动捕获并转正的世界观设定词条：${name}`,
    });
    showToast(
      `🌍 已将新设定「${name}」正式转正入库【设定集】！`,
      '去设定集查看 →',
      'LORE'
    );
  };

  const handleBlockUnregisteredEntity = (name: string) => {
    const item: MemoryFactAnchor = {
      id: `anchor-block-${Date.now()}`,
      tier: 'L4_CANONICAL_REDLINE',
      category: 'CHARACTER_ALIVE_LOCK',
      entityName: name,
      hardConstraint: `严禁凭空编造未在设定库登记的野生实体「${name}」`,
      violationPattern: [name],
      isActive: true,
    };
    setCustomAnchors((prev) => [item, ...prev]);
    handleRunScan(scanText);
    showToast(`🚫 已将「${name}」加入未登记实体拦截黑名单！`);
  };

  const hallucinationTargetTab = (
    t: HallucinationAuditReport['findings'][number]['hallucinationType']
  ): NavTab => {
    switch (t) {
      case 'DEAD_CHARACTER_RESURRECTION':
        return 'CHARACTERS';
      case 'EPISTEMIC_SPOILER_LEAK':
        return 'GODS_EYE_SANDBOX';
      case 'SPATIAL_TELEPORT_GLITCH':
        return 'MAP';
      default:
        return 'LORE';
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflowY: 'auto',
        padding: '20px 24px 48px',
        gap: '18px',
      }}
    >
      {/* Top Actionable Deep-Link Toast (F30 / A30) */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            padding: '12px 18px',
            borderRadius: '12px',
            backgroundColor: '#059669',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '13px',
            boxShadow: '0 10px 30px rgba(5, 150, 105, 0.35)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <CheckCircle2 size={16} />
          <span>{toast.message}</span>
          {toast.actionLabel && toast.actionTab && (
            <button
              onClick={() => {
                onNavigateTab?.(
                  toast.actionTab!,
                  makeTeleportPayload(
                    toast.actionTab!,
                    '四级记忆与防幻觉护栏',
                    toast.message
                  )
                );
                setToast(null);
              }}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.35)',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      )}

      {/* Top Hero Banner + Cross-View Quick Jump Hub */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          padding: '18px 22px',
          borderRadius: '16px',
          background:
            'linear-gradient(135deg, rgba(16, 185, 129, 0.14) 0%, rgba(99, 102, 241, 0.12) 55%, rgba(244, 63, 94, 0.10) 100%)',
          border: '1px solid var(--border-color)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              <ShieldCheck size={14} />
              L4-L1 四级记忆精算 · 零幻觉因果护栏 · 全站超链穿梭 (30功能×30架构)
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              当前焦点：{activeChapter?.title || '第 1 章'} ·{' '}
              {activeScene ? `第 ${activeScene.sceneIndex} 场` : '主场景'}
            </span>
          </div>
          <h1 style={{ fontSize: '21px', fontWeight: 800, margin: 0 }}>
            大模型记忆精算、省 Token 脱水编译与防幻觉因果核验中心
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            通过「冷热三温章节蒸馏 + 场景实体动态剪枝 + Tuple-DSL 极简序列化 + 五维事实红线锁 + 双式道具守恒账本 + 全实体超链回链」彻底解决长篇失忆、Token 爆炸与战力/生死/剧透幻觉。
          </p>
        </div>

        {/* One-Click Jump Bar to Core Workspaces */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          <button
            onClick={() =>
              onNavigateTab?.(
                'STUDIO',
                makeTeleportPayload(
                  'STUDIO',
                  '四级记忆与防幻觉护栏',
                  '带精简上下文返回创作台执笔'
                )
              )
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 13px',
              borderRadius: '10px',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              border: 'none',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <Feather size={14} />
            返回创作台执笔
            <ArrowRight size={13} />
          </button>
          <button
            onClick={() =>
              onNavigateTab?.(
                'AUTOPILOT',
                makeTeleportPayload(
                  'AUTOPILOT',
                  '四级记忆与防幻觉护栏',
                  '带防幻觉锁启动全自动巡航码字'
                )
              )
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 13px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Zap size={14} />
            去全自动码字机
          </button>
          <button
            onClick={() =>
              onNavigateTab?.(
                'CHARACTERS',
                makeTeleportPayload(
                  'CHARACTERS',
                  '四级记忆与防幻觉护栏',
                  '核对人物生死簿与实时战力状态'
                )
              )
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 13px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Users size={14} />
            人物谱状态校验
          </button>
          <button
            onClick={() =>
              onNavigateTab?.(
                'LORE',
                makeTeleportPayload(
                  'LORE',
                  '四级记忆与防幻觉护栏',
                  '核对世界观底层法则与境界上限'
                )
              )
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 13px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <BookOpen size={14} />
            世界观设定集
          </button>
          <button
            onClick={() =>
              onNavigateTab?.(
                'MODEL_HUB',
                makeTeleportPayload(
                  'MODEL_HUB',
                  '四级记忆与防幻觉护栏',
                  '配置 Flash 摘要小模型与 Pro 执笔旗舰模型协同'
                )
              )
            }
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 13px',
              borderRadius: '10px',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Cpu size={14} />
            多模型算力路由
          </button>
        </div>
      </div>

      {/* 4 Telemetry Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px',
        }}
      >
        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            全量未压缩设定体积 (Raw Context)
          </div>
          <div style={{ fontSize: '22px', fontWeight: 800, marginTop: '4px' }}>
            {compressionReport.totalRawTokens.toLocaleString()}{' '}
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Tokens</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            含全卷大纲、全员 JSON 档案与离场词条
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#10b981', fontWeight: 600 }}>
            L4-L1 精算蒸馏后体积 (Grounded Pack)
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#10b981',
              marginTop: '4px',
            }}
          >
            {compressionReport.totalCompressedTokens.toLocaleString()}{' '}
            <span style={{ fontSize: '12px', fontWeight: 600 }}>
              Tokens (省 {compressionReport.compressionRatioPercent}%)
            </span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            单次净省 {compressionReport.savedTokens}t · KV缓存命中{' '}
            {compressionReport.prefixCacheHitRatePercent}%
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
          }}
        >
          <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>
            生效防幻觉锚点 & 道具守恒锁
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color: '#6366f1',
              marginTop: '4px',
            }}
          >
            {effectiveFactAnchors.filter((a) => a.isActive).length}{' '}
            <span style={{ fontSize: '12px', fontWeight: 600 }}>条硬性因果锁</span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            覆盖境界上限、生死簿、信息差与消耗品账本
          </div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: '14px',
            backgroundColor: 'var(--bg-secondary)',
            border: `1px solid ${
              (auditReport?.findings.length || 0) > 0
                ? 'rgba(244, 63, 94, 0.4)'
                : 'rgba(16, 185, 129, 0.4)'
            }`,
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color:
                (auditReport?.findings.length || 0) > 0 ? '#f43f5e' : '#10b981',
              fontWeight: 600,
            }}
          >
            当前草稿事实忠实度 (Faithfulness)
          </div>
          <div
            style={{
              fontSize: '22px',
              fontWeight: 800,
              color:
                (auditReport?.findings.length || 0) > 0 ? '#f43f5e' : '#10b981',
              marginTop: '4px',
            }}
          >
            {auditReport?.faithfulnessScore ?? 100}%{' '}
            <span style={{ fontSize: '12px', fontWeight: 600 }}>
              ({auditReport?.findings.length || 0} 处幻觉告警)
            </span>
          </div>
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-secondary)',
              marginTop: '4px',
            }}
          >
            识别到 {smartEntityLinks.length} 处正文实体超链 ·{' '}
            {unregisteredEntities.length} 个未登记新名
          </div>
        </div>
      </div>

      {/* 6-Pillar Interactive Navigation Sub-Tabs */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px',
          padding: '6px',
          borderRadius: '14px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
        }}
      >
        {[
          {
            id: 'MEMORY_BUDGET' as GuardSubTab,
            label: '① 四级记忆 & 冷热归档 & 提示词脱水',
            badge: `-${compressionReport.compressionRatioPercent}% Token`,
            icon: <Layers size={14} />,
          },
          {
            id: 'ENTITY_PRUNING' as GuardSubTab,
            label: '② 场景实体剪枝对比器 & Tuple-DSL',
            badge: `剪枝 ${pruningStats.prunedCount} 实体`,
            icon: <Pin size={14} />,
          },
          {
            id: 'FACT_LEDGER' as GuardSubTab,
            label: '③ 五维防幻觉锁 & 道具守恒双式账本',
            badge: `${effectiveFactAnchors.filter((a) => a.isActive).length} 锚点`,
            icon: <Package size={14} />,
          },
          {
            id: 'HALLUCINATION_REDTEAM' as GuardSubTab,
            label: '④ 幻觉自愈 & 红队混沌演练 & 野生实体转正',
            badge: `${auditReport?.findings.length || 0} 拦截`,
            icon: <Flame size={14} />,
          },
          {
            id: 'SMART_HYPERLINKS' as GuardSubTab,
            label: '⑤ 正文智能超链渲染 & 双向章节回链矩阵',
            badge: `${smartEntityLinks.length} 超链`,
            icon: <Link2 size={14} />,
          },
          {
            id: 'BLUEPRINT_30X30' as GuardSubTab,
            label: '⑥ 30个新功能 × 30个新架构全景蓝图',
            badge: '30×30 满配',
            icon: <Compass size={14} />,
          },
        ].map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 13px',
                borderRadius: '10px',
                border: active
                  ? '1px solid rgba(99, 102, 241, 0.5)'
                  : '1px solid transparent',
                backgroundColor: active
                  ? 'rgba(99, 102, 241, 0.16)'
                  : 'transparent',
                color: active ? '#818cf8' : 'var(--text-secondary)',
                fontSize: '12px',
                fontWeight: active ? 700 : 600,
                cursor: 'pointer',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                style={{
                  padding: '1px 6px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  backgroundColor: active
                    ? 'rgba(99, 102, 241, 0.25)'
                    : 'var(--bg-primary)',
                  color: active ? '#c7d2fe' : 'var(--text-secondary)',
                }}
              >
                {tab.badge}
              </span>
            </button>
          );
        })}
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: L4-L1 Memory Tiering + Hot/Warm/Cold Chapter Consolidation + Dehydrator */}
      {/* ===================================================================== */}
      {activeSubTab === 'MEMORY_BUDGET' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Interactive Token Budget Simulator Slider (F06 / A06) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  🎚️ 飞行前 Token 预算水位线精算器 (Pre-Flight Token Watermark Simulator · F06/A06)
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '4px 0 0',
                  }}
                >
                  拖动滑块动态调节单次请求上下文 Token 上限，系统按 L4（永不裁剪）→ L3（在场实体）→ L2（温冷区摘要）→ L1（滑窗锚点）优先级自动分配。
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  设定上限：
                </span>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    fontWeight: 800,
                    fontSize: '14px',
                  }}
                >
                  {tokenBudget} Tokens
                </span>
              </div>
            </div>

            <input
              type="range"
              min={600}
              max={4000}
              step={100}
              value={tokenBudget}
              onChange={(e) => setTokenBudget(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#10b981', cursor: 'pointer' }}
            />

            {/* L4-L1 4-Tier Breakdown Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '10px',
              }}
            >
              {compressionReport.slices.map((slice) => (
                <div
                  key={slice.tier}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: '12px' }}>
                      {slice.label}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 7px',
                        borderRadius: '999px',
                        backgroundColor: 'rgba(16, 185, 129, 0.14)',
                        color: '#10b981',
                        fontWeight: 700,
                      }}
                    >
                      {slice.compressedTokens}t (原 {slice.rawTokens}t)
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.5,
                    }}
                  >
                    {slice.compressedPreview.slice(0, 95)}...
                  </div>
                  {slice.prunedEntitiesCount > 0 && (
                    <div style={{ fontSize: '11px', color: '#f59e0b' }}>
                      已自动剪枝 {slice.prunedEntitiesCount} 个无关词条
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Hot / Warm / Cold Chapter Consolidation Matrix (F01 / A01) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                🌡️ 章节记忆冷热三温分层归档台 (Hot / Warm / Cold Episodic Consolidation · F01/A01)
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                远期章节自动折叠为 25 字里程碑锚点（Cold），近期 2~5 章浓缩为 75 字因果骨架（Warm），仅当前章保留末尾原文接龙锚点（Hot），实现百万字长篇 O(1) 恒定上下文开销。
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))',
                gap: '10px',
              }}
            >
              {chapterConsolidation.map((ch) => {
                const tempBadge =
                  ch.temperature === 'HOT_ACTIVE'
                    ? { label: '🔥 HOT 热区原文滑窗', color: '#ef4444' }
                    : ch.temperature === 'WARM_DIGEST'
                    ? { label: '🌤️ WARM 温区因果骨架', color: '#f59e0b' }
                    : { label: '❄️ COLD 冷区里程碑归档', color: '#3b82f6' };
                return (
                  <div
                    key={ch.chapterId}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1px solid ${tempBadge.color}44`,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: `${tempBadge.color}20`,
                            color: tempBadge.color,
                          }}
                        >
                          {tempBadge.label}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#10b981',
                            fontWeight: 700,
                          }}
                        >
                          {ch.consolidatedTokens}t / 原 {ch.rawTokens}t (省{' '}
                          {ch.savingPercent}%)
                        </span>
                      </div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          marginBottom: '4px',
                        }}
                      >
                        {ch.chapterTitle}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                        }}
                      >
                        {ch.consolidatedPayload}
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingTop: '6px',
                        borderTop: '1px dashed var(--border-color)',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {ch.causalKeyEvents[0]}
                      </span>
                      <button
                        onClick={() => {
                          setActiveChapterId(ch.chapterId);
                          setActiveSceneIndex(0);
                          onNavigateTab?.(
                            'STUDIO',
                            makeTeleportPayload(
                              'STUDIO',
                              '冷热记忆归档台',
                              `定位至章节：${ch.chapterTitle}`,
                              { chapterId: ch.chapterId }
                            )
                          );
                        }}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(99, 102, 241, 0.14)',
                          color: '#818cf8',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        穿梭执笔此章 ↗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Prompt Dehydration & Boilerplate Stripper (F07 / A07) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  💧 提示词脱水与废话剥离器 (Prompt Dehydrator · F07/A07) — 原始输入
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  原始体积：{dehydrationResult.rawTokens} Tokens
                </span>
              </div>
              <textarea
                value={rawPromptInput}
                onChange={(e) => setRawPromptInput(e.target.value)}
                rows={6}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  resize: 'vertical',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                  ⚡ AST 脱水编译后极简指令 (净省 {dehydrationResult.savedPercent}% · 已剥离：
                  {dehydrationResult.strippedPatterns.join('、')})
                </span>
                <span
                  style={{ fontSize: '11px', color: '#10b981', fontWeight: 700 }}
                >
                  脱水后：{dehydrationResult.dehydratedTokens} Tokens
                </span>
              </div>
              <pre
                style={{
                  margin: 0,
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  minHeight: '132px',
                }}
              >
                {dehydrationResult.dehydratedPrompt}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: Scene Entity Pruning Diff (Pin/Mute) + Tuple-DSL + STATE_DELTA */}
      {/* ===================================================================== */}
      {activeSubTab === 'ENTITY_PRUNING' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '18px',
          }}
        >
          {/* Left: Scene Entity Pruning Interactive Table (F03 / A03) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  ✂️ 场景实体动态剪枝对比器 (Pin 常驻 / Mute 静默 · F03/A03)
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '4px 0 0',
                  }}
                >
                  自动检测当前场次在场人物与关联设定，未出场实体自动剪枝省 Token；支持作者手动点击「📌常驻」或「🔇静默」覆写。
                </p>
              </div>
              <span
                style={{
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#10b981',
                  fontSize: '11px',
                  fontWeight: 700,
                }}
              >
                入选 {pruningStats.activeCount} · 剪枝省{' '}
                {pruningStats.savedTokensByPruning}t
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '460px',
                overflowY: 'auto',
              }}
            >
              {pruningRecords.map((rec) => {
                const isIncluded =
                  rec.decision === 'PINNED_BY_AUTHOR' ||
                  rec.decision === 'RECALLED_IN_SCENE';
                const isPinned = pinnedEntityIds.includes(rec.entityId);
                const isMuted = mutedEntityIds.includes(rec.entityId);

                return (
                  <div
                    key={rec.entityId}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1px solid ${
                        isIncluded
                          ? 'rgba(16, 185, 129, 0.35)'
                          : 'var(--border-color)'
                      }`,
                      opacity: isIncluded ? 1 : 0.72,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '3px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: isIncluded
                              ? 'rgba(16, 185, 129, 0.16)'
                              : 'rgba(148, 163, 184, 0.16)',
                            color: isIncluded
                              ? '#10b981'
                              : 'var(--text-secondary)',
                            fontWeight: 700,
                          }}
                        >
                          {rec.entityType}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>
                          {rec.entityName}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          (
                          {isIncluded
                            ? `Tuple ${rec.tupleTokens}t`
                            : `已省 ${rec.rawTokens}t`}
                          )
                        </span>
                      </div>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {rec.reason}
                      </span>
                      {rec.stateDeltaPreview && (
                        <span
                          style={{
                            fontSize: '10px',
                            color: '#818cf8',
                            fontFamily: 'monospace',
                          }}
                        >
                          {rec.stateDeltaPreview}
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                      }}
                    >
                      <button
                        onClick={() => handleTogglePinEntity(rec.entityId)}
                        title="强制常驻注入 Prompt"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: isPinned
                            ? '#10b981'
                            : 'var(--bg-secondary)',
                          color: isPinned ? '#fff' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Pin size={11} />
                        常驻
                      </button>
                      <button
                        onClick={() => handleToggleMuteEntity(rec.entityId)}
                        title="强制静默裁剪以节省 Token"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: isMuted
                            ? '#f43f5e'
                            : 'var(--bg-secondary)',
                          color: isMuted ? '#fff' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <VolumeX size={11} />
                        静默
                      </button>
                      <button
                        onClick={() =>
                          onNavigateTab?.(
                            rec.targetTab as NavTab,
                            makeTeleportPayload(
                              rec.targetTab as NavTab,
                              '场景实体剪枝台',
                              `查看实体档案：${rec.entityName}`,
                              { entityName: rec.entityName }
                            )
                          )
                        }
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(99, 102, 241, 0.14)',
                          color: '#818cf8',
                          border: 'none',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        档案 ↗
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Tuple-DSL & [STATE_DELTA] Compiled Context Preview (F04/A04 & F05/A05) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                🧬 极简语义元组 Tuple-DSL 与 [STATE_DELTA] 编译器 (F04/A04 · F05/A05)
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                摒弃冗长 JSON 键名括号，将人物、世界观与铁律编译为高密度管道符元组，静态前缀对齐以最大化命中 KV Cache。
              </p>
            </div>

            <pre
              style={{
                margin: 0,
                padding: '14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
                fontSize: '12px',
                lineHeight: 1.55,
                fontFamily: 'JetBrains Mono, Menlo, monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: '460px',
                overflowY: 'auto',
                color: 'var(--text-primary)',
              }}
            >
              {compressionReport.assembledCompactPrompt}
            </pre>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: 5D Anti-Hallucination Fact Locks + Double-Entry Inventory Conservation Ledger */}
      {/* ===================================================================== */}
      {activeSubTab === 'FACT_LEDGER' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '18px',
          }}
        >
          {/* Left: 5D Canonical Fact Anchors (F11-F14 / A11-A14) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
              🔒 L4 五维防幻觉事实锚点锁 (境界上限/生死簿/视角认知障/时空物理锁)
            </h2>

            {/* Add new anchor form */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <input
                value={newAnchorEntity}
                onChange={(e) => setNewAnchorEntity(e.target.value)}
                placeholder="锁定实体名（如：林越 / 青云老祖）"
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
              <select
                value={newAnchorCategory}
                onChange={(e) =>
                  setNewAnchorCategory(
                    e.target.value as MemoryFactAnchor['category']
                  )
                }
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="POWER_CEILING_LOCK">境界天花板锁</option>
                <option value="CHARACTER_ALIVE_LOCK">生死簿防诈尸锁</option>
                <option value="EPISTEMIC_SECRET_LOCK">信息差防剧透锁</option>
                <option value="INVENTORY_LOCK">道具消耗守恒锁</option>
                <option value="TIMELINE_SPATIAL_LOCK">空间位置防瞬移锁</option>
              </select>
              <input
                value={newAnchorConstraint}
                onChange={(e) => setNewAnchorConstraint(e.target.value)}
                placeholder="硬性事实红线描述（如：当前仅筑基初期，严禁元婴出窍）"
                style={{
                  gridColumn: '1 / -1',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
              <div
                style={{
                  gridColumn: '1 / -1',
                  display: 'flex',
                  gap: '8px',
                }}
              >
                <input
                  value={newAnchorPatterns}
                  onChange={(e) => setNewAnchorPatterns(e.target.value)}
                  placeholder="违禁触发词（逗号分隔，如：元婴出窍, 化神法相）"
                  style={{
                    flex: 1,
                    padding: '7px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                  }}
                />
                <button
                  onClick={handleAddAnchor}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent-primary)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Plus size={14} />
                  添加锚点锁
                </button>
              </div>
            </div>

            {/* Anchor list */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '380px',
                overflowY: 'auto',
              }}
            >
              {customAnchors.map((anchor) => {
                const cat = CATEGORY_LABELS[anchor.category];
                return (
                  <div
                    key={anchor.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)',
                      opacity: anchor.isActive ? 1 : 0.55,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '10px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: `${cat.color}20`,
                            color: cat.color,
                            fontWeight: 700,
                          }}
                        >
                          {cat.label}
                        </span>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>
                          {anchor.entityName}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {anchor.hardConstraint}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={() => handleToggleAnchor(anchor.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-secondary)',
                          color: anchor.isActive
                            ? '#10b981'
                            : 'var(--text-secondary)',
                          cursor: 'pointer',
                        }}
                      >
                        {anchor.isActive ? <Lock size={13} /> : <Unlock size={13} />}
                      </button>
                      <button
                        onClick={() => handleDeleteAnchor(anchor.id)}
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-secondary)',
                          color: '#f43f5e',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Double-Entry Inventory & Consumable Conservation Ledger (F15 / A15) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                🎒 空间戒指与消耗品守恒双式记账本 (Inventory Conservation Ledger · F15/A15)
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                自动追踪丹药、法宝、灵石的「完好持有 / 已消耗燃尽 / 已受损」状态。标记为「已消耗」或「已受损」的物品自动写入 L4 禁词锁，杜绝前文吃掉的丹药后文再次掏出！
              </p>
            </div>

            {/* Add inventory item */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="新增道具/丹药名称（如：九转还魂丹）"
                style={{
                  flex: 2,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
              <input
                value={newItemOwner}
                onChange={(e) => setNewItemOwner(e.target.value)}
                placeholder="持有者"
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              />
              <select
                value={newItemStatus}
                onChange={(e) =>
                  setNewItemStatus(e.target.value as InventoryLedgerItem['status'])
                }
                style={{
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                <option value="HELD_INTACT">🟢 完好持有</option>
                <option value="CONSUMED_DESTROYED">🔴 已消耗/损毁 (防复现锁定)</option>
                <option value="DAMAGED">🟠 残损冷却 (限制使用)</option>
                <option value="LOST_STOLEN">🔵 遗失/易手</option>
              </select>
              <button
                onClick={handleAddInventoryItem}
                style={{
                  padding: '7px 14px',
                  borderRadius: '8px',
                  backgroundColor: '#059669',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                + 记入账本
              </button>
            </div>

            {/* Inventory Ledger Table */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '380px',
                overflowY: 'auto',
              }}
            >
              {inventoryItems.map((item) => {
                const statusStyle =
                  item.status === 'HELD_INTACT'
                    ? { label: '🟢 完好持有', color: '#10b981' }
                    : item.status === 'CONSUMED_DESTROYED'
                    ? { label: '🔴 已消耗/损毁 (防幻觉锁定)', color: '#ef4444' }
                    : item.status === 'DAMAGED'
                    ? { label: '🟠 残损受限', color: '#f59e0b' }
                    : { label: '🔵 已遗失/转移', color: '#3b82f6' };

                return (
                  <div
                    key={item.id}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1px solid ${statusStyle.color}44`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>
                          {item.itemName}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            padding: '2px 7px',
                            borderRadius: '999px',
                            backgroundColor: `${statusStyle.color}20`,
                            color: statusStyle.color,
                            fontWeight: 700,
                          }}
                        >
                          {statusStyle.label}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          marginTop: '3px',
                        }}
                      >
                        归属：{item.holderName} · 第 {item.lastUpdatedChapter}{' '}
                        章变更 · {item.conservationConstraint}
                      </div>
                    </div>

                    <button
                      onClick={() => handleCycleInventoryStatus(item.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      切换状态 ↻
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: Post-Generation Hallucination Scanner + Red-Team Chaos + Unregistered NER */}
      {/* ===================================================================== */}
      {activeSubTab === 'HALLUCINATION_REDTEAM' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Top: Adversarial Red-Team Chaos Drill Bar (F18 / A18) */}
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid rgba(244, 63, 94, 0.35)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 700,
                  margin: 0,
                  color: '#f43f5e',
                }}
              >
                🎯 对抗式幻觉红队混沌注入演练台 (Adversarial Red-Team Chaos Injector · F18/A18)
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                一键注入「越阶放元婴大招」「死人诈尸复活」「全知剧透底牌」「已吃丹药复现」四类典型大模型幻觉，实时验证护栏拦截率与自愈清洗能力。
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              <button
                onClick={() => handleInjectChaosPreset('REALM')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(225, 29, 72, 0.14)',
                  color: '#f43f5e',
                  border: '1px solid rgba(225, 29, 72, 0.3)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ⚡ 注入战力崩坏
              </button>
              <button
                onClick={() => handleInjectChaosPreset('DEAD')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(124, 58, 237, 0.14)',
                  color: '#a78bfa',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                👻 注入死人复活
              </button>
              <button
                onClick={() => handleInjectChaosPreset('SPOILER')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(217, 119, 6, 0.14)',
                  color: '#fbbf24',
                  border: '1px solid rgba(217, 119, 6, 0.3)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                👁️ 注入未卜先知
              </button>
              <button
                onClick={() => handleInjectChaosPreset('ITEM')}
                style={{
                  padding: '6px 11px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(5, 150, 105, 0.14)',
                  color: '#34d399',
                  border: '1px solid rgba(5, 150, 105, 0.3)',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🎒 注入消耗品复现
              </button>
              <button
                onClick={() => handleInjectChaosPreset('ALL')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#e11d48',
                  color: '#fff',
                  border: 'none',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔥 综合注入全部幻觉并稽查
              </button>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
              gap: '18px',
            }}
          >
            {/* Left: Scanner Input & Findings */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700 }}>
                  🔍 待稽查生成草稿 / 编辑器正文
                </span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleRunScan()}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <RefreshCw size={13} />
                    执行因果幻觉稽查
                  </button>
                  <button
                    onClick={handleApplySanitizedToStudio}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#059669',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <Sparkles size={13} />
                    一键自愈并写回创作台
                  </button>
                </div>
              </div>

              <textarea
                value={scanText}
                onChange={(e) => setScanText(e.target.value)}
                rows={5}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  fontSize: '13px',
                  lineHeight: 1.6,
                }}
              />

              {/* Findings List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {auditReport && auditReport.findings.length > 0 ? (
                  auditReport.findings.map((f) => {
                    const targetTab = hallucinationTargetTab(f.hallucinationType);
                    return (
                      <div
                        key={f.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          backgroundColor: 'rgba(244, 63, 94, 0.08)',
                          border: '1px solid rgba(244, 63, 94, 0.35)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#f43f5e',
                            }}
                          >
                            🚨 检出违禁片段：「{f.offendingSnippet}」
                          </span>
                          <button
                            onClick={() =>
                              onNavigateTab?.(
                                targetTab,
                                makeTeleportPayload(
                                  targetTab,
                                  '幻觉稽查台',
                                  f.factViolated
                                )
                              )
                            }
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(244, 63, 94, 0.16)',
                              color: '#f43f5e',
                              border: 'none',
                              fontSize: '11px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            核对真相源 ({targetTab}) ↗
                          </button>
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          违反铁律：{f.factViolated}
                        </div>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#10b981',
                            fontWeight: 600,
                          }}
                        >
                          自愈替换建议：→ 「{f.autoFixReplacement}」
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div
                    style={{
                      padding: '14px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      color: '#10b981',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    ✅ 零幻觉通过！当前文本未触发任何境界崩坏、死人复活、剧透或道具超发红线。
                  </div>
                )}
              </div>
            </div>

            {/* Right: Unregistered Entity NER Detector & 1-Click Canonize / Block (F20 / A20) */}
            <div
              style={{
                padding: '18px 20px',
                borderRadius: '16px',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  🕵️ 新实体防瞎编检测与一键转正/拉黑器 (Unregistered Entity NER · F20/A20)
                </h2>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    margin: '4px 0 0',
                  }}
                >
                  自动扫描大模型在正文中新造的野生人名、宗门、法宝。你可以一键将其「转正入库人物谱/设定集」并跳转编辑，或一键「拉黑拦截」禁止模型瞎编！
                </p>
              </div>

              {unregisteredEntities.length > 0 ? (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {unregisteredEntities.map((cand) => (
                    <div
                      key={cand.id}
                      style={{
                        padding: '12px 14px',
                        borderRadius: '12px',
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid rgba(245, 158, 11, 0.4)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '999px',
                              backgroundColor: 'rgba(245, 158, 11, 0.18)',
                              color: '#f59e0b',
                              fontWeight: 700,
                            }}
                          >
                            未登记野生实体 · {cand.inferredCategory}
                          </span>
                          <span style={{ fontWeight: 800, fontSize: '14px' }}>
                            「{cand.name}」
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        上下文：{cand.contextSnippet}
                      </div>
                      <div style={{ fontSize: '11px', color: '#f59e0b' }}>
                        风险提示：{cand.riskNote}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        <button
                          onClick={() =>
                            handlePromoteUnregisteredToCharacter(cand.name)
                          }
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(99, 102, 241, 0.15)',
                            color: '#818cf8',
                            border: '1px solid rgba(99, 102, 241, 0.35)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <UserPlus size={12} />
                          转正入库【人物谱】
                        </button>
                        <button
                          onClick={() => handlePromoteUnregisteredToLore(cand.name)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <BookmarkPlus size={12} />
                          转正入库【设定集】
                        </button>
                        <button
                          onClick={() => handleBlockUnregisteredEntity(cand.name)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(244, 63, 94, 0.15)',
                            color: '#f43f5e',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          🚫 判定为瞎编并加入禁词锁
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                  }}
                >
                  当前文本中所有专有名词均已在【人物谱】或【设定集】中登记备案。
                </div>
              )}

              {/* Sanitized Draft Output Box */}
              {auditReport && (
                <div
                  style={{
                    marginTop: '6px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid rgba(16, 185, 129, 0.35)',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      color: '#10b981',
                      marginBottom: '6px',
                    }}
                  >
                    ✨ 防幻觉自愈修复后正文预览：
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.6 }}>
                    {auditReport.sanitizedDraft}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: Smart Manuscript Entity Hyperlinks + Bidirectional Chapter Backlinks */}
      {/* ===================================================================== */}
      {activeSubTab === 'SMART_HYPERLINKS' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '18px',
          }}
        >
          {/* Left: Smart Entity Auto-Linker Chips (F21 / A21) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                🔗 正文全实体智能超链识别器 (Manuscript Smart Entity Auto-Linker · F21/A21)
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                自动扫描当前正文中的人物、地理、宗门、伏笔，生成可一键穿梭的智能超链胶囊，点击即刻带上下文跳转对应管理视图！
              </p>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {smartEntityLinks.map((match) => {
                const badgeColor =
                  match.category === 'CHARACTER'
                    ? '#818cf8'
                    : match.category === 'LORE'
                    ? '#10b981'
                    : '#f59e0b';
                return (
                  <button
                    key={match.id}
                    onClick={() =>
                      onNavigateTab?.(
                        match.targetTab as NavTab,
                        makeTeleportPayload(
                          match.targetTab as NavTab,
                          '智能超链引擎',
                          match.summary,
                          { entityName: match.entityName }
                        )
                      )
                    }
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      backgroundColor: 'var(--bg-primary)',
                      border: `1px solid ${badgeColor}55`,
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '3px',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: `${badgeColor}22`,
                          color: badgeColor,
                          fontWeight: 700,
                        }}
                      >
                        {match.category}
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '13px',
                          color: badgeColor,
                        }}
                      >
                        {match.entityName} ↗
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {match.summary}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Bidirectional Entity <-> Chapter Backlinks Matrix (F27 / A27) */}
          <div
            style={{
              padding: '18px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                🔄 实体—章节双向回链穿梭矩阵 (Bidirectional Chapter Backlinks · F27/A27)
              </h2>
              <p
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  margin: '4px 0 0',
                }}
              >
                打通「人物/设定/伏笔 ⇄ 登场章节」双向跳转闭环，既可从实体直达登场章节码字，也可直接进入对应设定库深加工。
              </p>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                maxHeight: '420px',
                overflowY: 'auto',
              }}
            >
              {smartEntityLinks.map((link) => (
                <div
                  key={`backlink-${link.id}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: '10px',
                    backgroundColor: 'var(--bg-primary)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>
                      {link.category === 'CHARACTER'
                        ? '👤'
                        : link.category === 'LORE'
                        ? '🌍'
                        : '🕸️'}{' '}
                      {link.entityName}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '4px',
                        marginTop: '4px',
                      }}
                    >
                      {link.backlinkChapters.map((chap) => (
                        <button
                          key={chap.chapterId}
                          onClick={() => {
                            setActiveChapterId(chap.chapterId);
                            setActiveSceneIndex(0);
                            onNavigateTab?.(
                              'STUDIO',
                              makeTeleportPayload(
                                'STUDIO',
                                `「${link.entityName}」章节回链`,
                                `定位至 ${chap.chapterTitle}`,
                                {
                                  entityName: link.entityName,
                                  chapterId: chap.chapterId,
                                }
                              )
                            );
                          }}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(245, 158, 11, 0.14)',
                            color: '#f59e0b',
                            border: 'none',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          📖 {chap.chapterTitle} ↗
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onNavigateTab?.(
                        link.targetTab as NavTab,
                        makeTeleportPayload(
                          link.targetTab as NavTab,
                          '双向回链矩阵',
                          link.summary,
                          { entityName: link.entityName }
                        )
                      )
                    }
                    style={{
                      padding: '5px 10px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(99, 102, 241, 0.14)',
                      color: '#818cf8',
                      border: 'none',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    去{link.targetTab}档案 ↗
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 6: 30 Features x 30 Architectures Full Blueprint Matrix */}
      {/* ===================================================================== */}
      {activeSubTab === 'BLUEPRINT_30X30' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {[
                { id: 'ALL', label: '全部 (30功能 × 30架构)' },
                { id: 'MEMORY_TOKEN', label: '① 记忆与省 Token (F01-F10 / A01-A10)' },
                {
                  id: 'ANTI_HALLUCINATION',
                  label: '② 零幻觉护栏 (F11-F20 / A11-A20)',
                },
                {
                  id: 'HYPER_NAVIGATION',
                  label: '③ 全站智能跳转 (F21-F30 / A21-A30)',
                },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setBlueprintPillarFilter(p.id as any)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor:
                      blueprintPillarFilter === p.id
                        ? 'var(--accent-primary)'
                        : 'var(--bg-primary)',
                    color:
                      blueprintPillarFilter === p.id
                        ? '#fff'
                        : 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                backgroundColor: 'var(--bg-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              <Search size={14} />
              <input
                value={blueprintSearch}
                onChange={(e) => setBlueprintSearch(e.target.value)}
                placeholder="检索 F01-F30 / A01-A30 / 关键字..."
                style={{
                  border: 'none',
                  outline: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  width: '210px',
                }}
              />
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))',
              gap: '12px',
            }}
          >
            {filteredBlueprints.map((item) => {
              const pillarColor =
                item.pillar === 'MEMORY_TOKEN'
                  ? '#10b981'
                  : item.pillar === 'ANTI_HALLUCINATION'
                  ? '#f43f5e'
                  : '#6366f1';
              return (
                <div
                  key={item.index}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: `1px solid ${pillarColor}44`,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          gap: '6px',
                          alignItems: 'center',
                        }}
                      >
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '6px',
                            backgroundColor: `${pillarColor}22`,
                            color: pillarColor,
                            fontSize: '11px',
                            fontWeight: 800,
                          }}
                        >
                          {item.featureCode} × {item.architectureCode}
                        </span>
                        <span
                          style={{
                            padding: '2px 7px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--bg-primary)',
                            color: 'var(--text-secondary)',
                            fontSize: '10px',
                            fontWeight: 700,
                          }}
                        >
                          {item.tokenSavingOrUxImpact}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '14px' }}>
                      功能：{item.featureTitle}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: pillarColor,
                      }}
                    >
                      架构：{item.architectureTitle}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                      }}
                    >
                      {item.architectureMechanism}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingTop: '8px',
                      borderTop: '1px dashed var(--border-color)',
                    }}
                  >
                    <span
                      style={{ fontSize: '11px', color: 'var(--text-secondary)' }}
                    >
                      宿主视图：{item.jumpTargetTab}
                    </span>
                    <button
                      onClick={() => {
                        if (item.jumpTargetTab === 'MEMORY_GUARD') {
                          if (item.pillar === 'MEMORY_TOKEN') {
                            setActiveSubTab('MEMORY_BUDGET');
                          } else if (item.pillar === 'ANTI_HALLUCINATION') {
                            setActiveSubTab('HALLUCINATION_REDTEAM');
                          } else {
                            setActiveSubTab('SMART_HYPERLINKS');
                          }
                          showToast(
                            `🎯 已定位至本页对应实验台：${item.featureTitle}`
                          );
                        } else {
                          const target = item.jumpTargetTab as NavTab;
                          onNavigateTab?.(
                            target,
                            makeTeleportPayload(
                              target,
                              `${item.featureCode} 蓝图矩阵`,
                              item.featureTitle
                            )
                          );
                        }
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '8px',
                        backgroundColor: `${pillarColor}20`,
                        color: pillarColor,
                        border: 'none',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      立即体验 / 跳转 ↗
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
export default MemoryTokenAntiHallucinationView;
