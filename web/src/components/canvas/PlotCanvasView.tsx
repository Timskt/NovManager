// ==============================================================================
// 剧情推演幕布 (Plot Deduction Canvas / Tree Storyboard Canvas)
// 核心架构升级：
// 1. 剧情推演模态对话框 (Modal Dialog)：点击实体推演时弹出居中大模态框，推演产生的新剧情严格作为当前节点的子节点 (children) 挂载
// 2. 节点完全独立与因果拓扑 (Node Independence & Strict Parent-Child Topology)：
//    - 彻底移除列底部无序的“在第n幕添加分支”
//    - 节点之间严格通过 parentId 因果关联，分支均直接由具体父节点衍生（支持 AI 推演或手动添加子分支）
//    - 子节点卡片明确标注【承接父节点标题】，因果脉络一目了然
// 3. 幕布缩放引擎 (Canvas Zooming Engine)：支持 50% ~ 150% 自由缩放与重置，贝塞尔连线与插槽锚点 1:1 精确补偿吸附
// 4. 标题与梗概纯净规范：幕次由结构化徽章表达，标题为纯戏剧动作命名，梗概为纯故事叙述，彻底杜绝“第X幕·第一幕”
// ==============================================================================

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  useNovel } from '../../context/NovelContext';
import {
  PlotBranchOption,
  Chapter,
  Volume,
  Scene,
  PlotTreeNode,
} from '../../types/novel';
import {
  ai, AgentExecutionLog } from '../../lib/aiService';
import {
  FieldExplainer } from '../common/FieldExplainer';
import {
  Lightbulb,
  GitFork,
  Sparkles,
  Wand2,
  ShieldAlert,
  ArrowRight,
  Check,
  Copy,
  Layers,
  Target,
  BookOpen,
  User,
  Flame,
  Zap,
  ExternalLink,
  Loader2,
  Clock,
  Compass,
  FilePlus,
  ShieldCheck,
  Tag,
  Plus,
  Edit3,
  Trash2,
  X,
  PlusCircle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MapPin,
  RefreshCw,
  Sliders,
  CheckCircle2,
  PenTool,
  AlertCircle,
  Cpu,
  Key,
  Play,
  CornerDownRight,
  Milestone,
  FileText,
  AlignLeft,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CornerDownLeft,
  ArrowDownRight,
} from 'lucide-react';

interface PlotCanvasViewProps {
  onJumpToStudio?: (chapterId: string, sceneIndex: number) => void;
  onJumpToOutline?: () => void;
  embeddedInStudio?: boolean;
  onSwitchToEditor?: () => void;
}

// --------------------------------------------------------------------------
// 标题与梗概纯净化规范清洗函数 (Data Sanitation Utilities)
// --------------------------------------------------------------------------
export function sanitizeActTitle(rawTitle: string): string {
  if (!rawTitle) return '';
  return rawTitle
    .replace(/^第\s*[0-9一二三四五六七八九十]+\s*幕\s*[·:：\s-]*/i, '')
    .replace(/^(走向|分支)\s*[A-Za-z0-9一二三四]\s*[·:：\s-]*/i, '')
    .replace(/^第\s*[0-9一二三四五六七八九十]+\s*章\s*[·:：\s-]*/i, '')
    .replace(/^[·:：\s-]+/, '')
    .trim() || '剧情走向';
}

export function sanitizeActSummary(rawSummary: string): string {
  if (!rawSummary) return '';
  return rawSummary
    .replace(/^第\s*[0-9一二三四五六七八九十]+\s*幕\s*[·:：\s-]*/i, '')
    .replace(/^(场景目标|本幕目标|核心目标)\s*[·:：\s-]*/i, '')
    .replace(/^[·:：\s-]+/, '')
    .trim();
}

// 分支风格配置映射
const getBranchBadgeConfig = (type?: PlotTreeNode['branchType']) => {
  switch (type) {
    case 'BLOOD_BATTLE':
      return {
        bg: 'bg-rose-950/60 text-rose-300 border-rose-800/70',
        icon: <Flame className="w-3 h-3 text-rose-400 shrink-0" />,
        label: '绝境血战',
      };
    case 'OUTWIT_STEALTH':
      return {
        bg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/70',
        icon: <ShieldCheck className="w-3 h-3 text-emerald-400 shrink-0" />,
        label: '暗度陈仓',
      };
    case 'UNEXPECTED_TWIST':
      return {
        bg: 'bg-amber-950/60 text-amber-300 border-amber-800/70',
        icon: <Zap className="w-3 h-3 text-amber-400 shrink-0" />,
        label: '意料之外',
      };
    case 'LORE_OPPORTUNITY':
      return {
        bg: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/70',
        icon: <Sparkles className="w-3 h-3 text-indigo-400 shrink-0" />,
        label: '秘境机缘',
      };
    default:
      return {
        bg: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/70',
        icon: <GitFork className="w-3 h-3 text-cyan-400 shrink-0" />,
        label: '稳健主线',
      };
  }
};

interface TreeConnection {
  parentId: string;
  childId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathD: string;
  midX: number;
  midY: number;
  isActive: boolean;
}

interface PlotTreeNodeItemProps {
  node: PlotTreeNode;
  allNodes: PlotTreeNode[];
  selectedNodeId: string | null;
  activePathIds: Set<string>;
  expandedNodeIds: Set<string>;
  activeDeducingNodeId: string | null;
  streamedCount: number;
  onSelect: (id: string) => void;
  onToggleExpand: (id: string, e: React.MouseEvent) => void;
  onEdit: (node: PlotTreeNode, e: React.MouseEvent) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onAddManualChild: (node: PlotTreeNode, e: React.MouseEvent) => void;
  onStartDeduce: (node: PlotTreeNode, e: React.MouseEvent) => void;
}

const PlotTreeNodeItem: React.FC<PlotTreeNodeItemProps> = ({
  node,
  allNodes,
  selectedNodeId,
  activePathIds,
  expandedNodeIds,
  activeDeducingNodeId,
  streamedCount,
  onSelect,
  onToggleExpand,
  onEdit,
  onDelete,
  onAddManualChild,
  onStartDeduce,
}) => {
  const children = useMemo(() => {
    return allNodes.filter((n) => n.parentId === node.id);
  }, [allNodes, node.id]);

  const parentNode = node.parentId ? allNodes.find((n) => n.id === node.parentId) : null;
  const badge = getBranchBadgeConfig(node.branchType);
  const isSelected = selectedNodeId === node.id;
  const isInActivePath = activePathIds.has(node.id);
  const isExpanded = expandedNodeIds.has(node.id);
  const isDeducing = activeDeducingNodeId === node.id;
  const cleanTitle = sanitizeActTitle(node.title);
  const cleanSummary = sanitizeActSummary(node.summary);

  return (
    <div className="flex items-center gap-16 relative">
      {/* 节点实体卡片 */}
      <div
        id={`tree-node-${node.id}`}
        onClick={() => onSelect(node.id)}
        className={`w-[320px] shrink-0 rounded-2xl border transition-all duration-200 flex flex-col justify-between p-4 shadow-xl cursor-pointer group relative z-10 ${
          isDeducing
            ? 'bg-slate-900 border-purple-500 ring-2 ring-purple-500 shadow-purple-500/30 animate-pulse'
            : isSelected
            ? 'bg-slate-900 border-indigo-500 ring-2 ring-indigo-500/60 shadow-indigo-500/20'
            : isInActivePath
            ? 'bg-slate-900/90 border-indigo-700/80 shadow-indigo-950/40'
            : 'bg-slate-900/85 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900'
        }`}
      >
        {/* 左侧因果输入锚点（根节点除外） */}
        {node.parentId && (
          <div
            className={`absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center z-20 transition-colors ${
              isInActivePath
                ? 'bg-indigo-950 border-indigo-400 shadow-sm shadow-indigo-500/50'
                : 'bg-slate-900 border-slate-600'
            }`}
            title={`因果承接自：【${parentNode ? sanitizeActTitle(parentNode.title) : '上级剧情'}】`}
          >
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                isInActivePath ? 'bg-indigo-300' : 'bg-slate-500'
              }`}
            />
          </div>
        )}

        {/* 右侧剧情衍生输出锚点 */}
        <div
          className={`absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 flex items-center justify-center z-20 transition-colors ${
            isInActivePath
              ? 'bg-indigo-950 border-indigo-400 shadow-sm shadow-indigo-500/50'
              : 'bg-slate-900 border-slate-600'
          }`}
          title="剧情衍生输出端（可继续推演子走向）"
        >
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              isInActivePath ? 'bg-indigo-300' : 'bg-slate-500'
            }`}
          />
        </div>

        {/* 顶栏：走向类型标签与血缘 */}
        <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              {!node.parentId ? (
                <span className="px-1.5 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/70 text-[10px] font-bold">
                  开篇起局
                </span>
              ) : (
                <span
                  className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-medium truncate max-w-[140px]"
                  title={`承接：${parentNode ? sanitizeActTitle(parentNode.title) : '父剧情'}`}
                >
                  承接：{parentNode ? sanitizeActTitle(parentNode.title) : '父剧情'}
                </span>
              )}

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${badge.bg}`}
              >
                {badge.icon}
                <span>{node.branchLabel || badge.label}</span>
              </span>

              {isInActivePath && (
                <span className="px-1.5 py-0.2 rounded bg-indigo-600 text-white text-[9px] font-bold shadow-xs">
                  ★ 已选主线
                </span>
              )}
            </div>

            {/* 纯粹标题呈现 */}
            <h4 className="text-xs font-bold text-slate-100 leading-snug line-clamp-1 pt-0.5">
              {cleanTitle}
            </h4>
          </div>

          {/* 卡片右上角操作 */}
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => onEdit(node, e)}
              className="p-1 text-slate-400 hover:text-indigo-300 rounded hover:bg-slate-800 transition cursor-pointer"
              title="编辑此剧情实体"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => onDelete(node.id, e)}
              className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition cursor-pointer"
              title="删除此剧情分支"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 核心展示区：剧情核心梗概 */}
        <div className="py-2.5 space-y-2 text-xs flex-1">
          <div>
            <span className="text-[10px] font-bold text-indigo-400/90 flex items-center gap-1 mb-0.5">
              <Target className="w-3 h-3" />
              <span>剧情核心走向</span>
            </span>
            <p className="text-slate-200 font-medium leading-relaxed line-clamp-3 text-xs">
              {cleanSummary || '暂未录入梗概，点击卡片微调...'}
            </p>
          </div>

          {/* 展开查看戏剧节拍 */}
          {isExpanded && (
            <div className="pt-2 border-t border-slate-800/80 space-y-2 animate-in fade-in duration-150">
              {node.conflict && (
                <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-rose-400 block">
                    ⚡ 核心冲突：
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {node.conflict}
                  </p>
                </div>
              )}

              {node.turnPoint && (
                <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-amber-400 block">
                    🔀 戏剧转折：
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {node.turnPoint}
                  </p>
                </div>
              )}

              {node.outcome && (
                <div className="p-2 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-0.5">
                  <span className="text-[10px] font-bold text-emerald-400 block">
                    🏁 战果与代价：
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {node.outcome}
                  </p>
                </div>
              )}

              {node.characterImpact && (
                <div className="text-[10px] text-indigo-300 bg-indigo-950/30 border border-indigo-900/40 rounded p-1.5">
                  <span>角色演变：{node.characterImpact}</span>
                </div>
              )}
            </div>
          )}

          {/* 地点与草稿信息 */}
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span className="flex items-center gap-1 truncate max-w-[130px]">
              <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="truncate">{node.location || '当前驻地'}</span>
            </span>

            <span className="text-[10px] text-slate-500">
              {node.wordCount && node.wordCount > 0 ? (
                <strong className="text-emerald-400 font-semibold">{node.wordCount}字草稿</strong>
              ) : (
                '待工笔起草'
              )}
            </span>
          </div>
        </div>

        {/* 底栏：折叠开关与子分支推演动作 */}
        <div className="pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-1 text-xs">
          <button
            onClick={(e) => onToggleExpand(node.id, e)}
            className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-0.5 cursor-pointer py-1 px-1.5 rounded hover:bg-slate-800/80"
          >
            <span>{isExpanded ? '收起详情' : '展开详情'}</span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => onAddManualChild(node, e)}
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition flex items-center gap-0.5 cursor-pointer border border-slate-700"
              title="手动为此剧情添加一个子分支"
            >
              <Plus className="w-3 h-3" />
              <span>子分支</span>
            </button>

            <button
              onClick={(e) => onStartDeduce(node, e)}
              disabled={activeDeducingNodeId !== null}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/90 hover:bg-indigo-500 text-white text-[11px] font-semibold transition flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
              title="以此剧情为因果起点，SSE 流式推演后续可能走向并挂载为子节点"
            >
              {isDeducing ? (
                <>
                  <Loader2 className="w-3 h-3 text-amber-300 animate-spin" />
                  <span>推演中 ({streamedCount}/4)</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>(+) AI推演走向</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 该节点直接下属的子剧情分支列表（紧密围绕该父节点在右侧自然展开） */}
      {children.length > 0 && (
        <div className="flex flex-col justify-center gap-8 relative py-2">
          {children.map((child) => (
            <PlotTreeNodeItem
              key={child.id}
              node={child}
              allNodes={allNodes}
              selectedNodeId={selectedNodeId}
              activePathIds={activePathIds}
              expandedNodeIds={expandedNodeIds}
              activeDeducingNodeId={activeDeducingNodeId}
              streamedCount={streamedCount}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onDelete={onDelete}
              onAddManualChild={onAddManualChild}
              onStartDeduce={onStartDeduce}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const PlotCanvasView: React.FC<PlotCanvasViewProps> = ({
  onJumpToStudio,
  onJumpToOutline,
  embeddedInStudio = false,
  onSwitchToEditor,
}) => {
  const {
    novel,
    volumes,
    characters,
    characterStates,
    worldSettings,
    foreshadowings,
    activeChapterId,
    setActiveChapterId,
    setActiveSceneIndex,
    updateScene,
    updateChapter,
    settings,
    openSettingsModal,
  } = useNovel();

  const hasRealKey = !!(settings?.apiKey && settings.apiKey.trim().length > 0);
  const isUsingRealAI = hasRealKey && !settings?.useMock;

  const allChapters = useMemo(() => volumes.flatMap((v) => v.chapters), [volumes]);

  const initialChapter =
    allChapters.find((c) => c.id === activeChapterId) ||
    allChapters[0];

  const [selectedChapId, setSelectedChapId] = useState<string>(initialChapter?.id || '');

  useEffect(() => {
    if (activeChapterId && allChapters.some((c) => c.id === activeChapterId)) {
      setSelectedChapId(activeChapterId);
    }
  }, [activeChapterId, allChapters]);

  const currentChapter = allChapters.find((c) => c.id === selectedChapId) || initialChapter;
  const currentVolume = volumes.find((v) => v.id === currentChapter?.volumeId) || volumes[0];
  const povChar = characters.find((c) => c.id === currentChapter?.povCharacterId) || characters[0];

  // --------------------------------------------------------------------------
  // 1. 画布缩放状态 (Canvas Zoom State: 50% ~ 150%)
  // --------------------------------------------------------------------------
  const [zoom, setZoom] = useState<number>(1.0);

  const handleZoomIn = () => setZoom((prev) => Math.min(1.5, Math.round((prev + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((prev) => Math.max(0.5, Math.round((prev - 0.1) * 10) / 10));
  const handleResetZoom = () => setZoom(1.0);

  // --------------------------------------------------------------------------
  // 2. 剧情推演树状态管理 (严格基于 parentId 的独立节点拓扑)
  // --------------------------------------------------------------------------
  const getStorageKey = (chapId: string) => `nov_tree_${novel.id || 'default'}_${chapId}`;

  const cleanLoadedNodes = (nodes: PlotTreeNode[]): PlotTreeNode[] => {
    return nodes.map((n) => ({
      ...n,
      title: sanitizeActTitle(n.title),
      summary: sanitizeActSummary(n.summary),
    }));
  };

  const createDefaultTreeForChapter = (chap: Chapter): PlotTreeNode[] => {
    const existingScenes = chap.scenes || [];
    const povName = povChar?.name || '主角';

    if (existingScenes.length > 0) {
      const nodes: PlotTreeNode[] = [];
      let prevId: string | null = null;

      existingScenes.forEach((sc, idx) => {
        const nodeId = `node-init-${chap.id}-${sc.sceneIndex}`;
        const rawTitle = sc.sceneGoal ? sc.sceneGoal.slice(0, 14) : '承接故事动作';
        nodes.push({
          id: nodeId,
          chapterId: chap.id,
          actLevel: sc.sceneIndex,
          parentId: prevId,
          title: sanitizeActTitle(rawTitle),
          summary: sanitizeActSummary(sc.sceneGoal || '暂未录入梗概'),
          conflict: sc.conflict || '遭遇敌对势力阻截或环境险境',
          turnPoint: sc.turnPoint || '突发变数打破攻守平衡',
          outcome: sc.outcome || '达成阶段战果，引动后续因果',
          characterImpact: sc.involvedCharacterIds?.length ? `${povName}消耗真元并留下暗线` : '状态演进中',
          branchType: idx === 0 ? 'DEFAULT' : idx === 1 ? 'BLOOD_BATTLE' : 'UNEXPECTED_TWIST',
          branchLabel: idx === 0 ? '主线起势' : idx === 1 ? '绝境激战' : '高潮转折',
          location: sc.location || '幽冥暗谷',
          involvedCharacterIds: sc.involvedCharacterIds || (povChar ? [povChar.id] : []),
          draftContent: sc.draftContent || '',
          wordCount: sc.draftContent?.length || 0,
          createdAt: Date.now() + idx,
        });
        prevId = nodeId;
      });
      return nodes;
    }

    const rootId = `node-root-${chap.id}`;
    const rootNode: PlotTreeNode = {
      id: rootId,
      chapterId: chap.id,
      actLevel: 1,
      parentId: null,
      title: '伏线入局',
      summary: sanitizeActSummary(chap.outline || `${povName}隐匿潜行进入古遗迹边缘，探查异变真相，借地势封堵暗处杀机。`),
      conflict: '暗敌暗中结阵封锁退路，地脉毒瘴侵蚀经脉',
      turnPoint: '神识微动，察觉敌方巡山法阵存在隐秘死角破绽',
      outcome: '锁定敌方巡山阵眼，但行踪被金丹魔修神识扫视锁定',
      characterImpact: `${povName}左肩受创，青铜残片产生共振异动`,
      branchType: 'DEFAULT',
      branchLabel: '伏线起势',
      location: '坠星崖底古溶洞',
      involvedCharacterIds: povChar ? [povChar.id] : [],
      draftContent: '',
      wordCount: 0,
      createdAt: Date.now(),
    };

    const branchA: PlotTreeNode = {
      id: `node-b1-${chap.id}`,
      chapterId: chap.id,
      actLevel: 2,
      parentId: rootId,
      title: '绝境硬撼',
      summary: `${povName}不再压抑杀气，抢先引爆地火残阵正面撕裂封锁，与血煞先锋展开硬碰硬搏杀。`,
      conflict: '敌方祭出九子血灵幡，魔煞遮天蔽日',
      turnPoint: '兵行险招，以精血激活青铜残片上古雷纹',
      outcome: '重创敌修先锋，但引来假丹境首领暴怒威压',
      characterImpact: '经脉反噬咳血，气海真元耗损四成',
      branchType: 'BLOOD_BATTLE',
      branchLabel: '绝境血战',
      location: '青石八卦台',
      involvedCharacterIds: povChar ? [povChar.id] : [],
      draftContent: '',
      wordCount: 0,
      createdAt: Date.now() + 1,
    };

    const branchB: PlotTreeNode = {
      id: `node-b2-${chap.id}`,
      chapterId: chap.id,
      actLevel: 2,
      parentId: rootId,
      title: '移形换影',
      summary: `${povName}佯装不支诱敌深入，借上古残壁盲区布下迷踪剑煞，金蝉脱壳潜入地渊核心。`,
      conflict: '血灵罗盘嗅觉极其敏锐，步步紧逼难有喘息之机',
      turnPoint: '利用溶洞裂缝中的阴煞罡风隔绝神识锁定',
      outcome: '成功脱离包围圈，意外撞见敌方正在祭炼的古阵核心',
      characterImpact: '身法达到极限，耗尽两枚随身护命玉符',
      branchType: 'OUTWIT_STEALTH',
      branchLabel: '暗度陈仓',
      location: '溶洞阴影裂谷',
      involvedCharacterIds: povChar ? [povChar.id] : [],
      draftContent: '',
      wordCount: 0,
      createdAt: Date.now() + 2,
    };

    const branchA_Act3: PlotTreeNode = {
      id: `node-a3-${chap.id}`,
      chapterId: chap.id,
      actLevel: 3,
      parentId: branchA.id,
      title: '天降神剑与深渊塌陷',
      summary: `假丹老魔祭出三丈修罗魔相绝杀，苏青瑶携天罡秋泓神剑御空破洞救援，引爆古禁制双双跌入古战场深渊。`,
      conflict: '修罗灭生掌遮天蔽日，威压撼动地脉',
      turnPoint: '青天剑芒从天而降，引动机括崩解万载石台坍塌',
      outcome: '击退老魔，二人一同坠入深不可测的星宿仙魔墓',
      characterImpact: '气海彻底枯竭，护心丹维持心脉，埋下惊天机缘钩子',
      branchType: 'LORE_OPPORTUNITY',
      branchLabel: '秘境机缘',
      location: '万丈虚空深渊飞檐',
      involvedCharacterIds: povChar ? [povChar.id] : [],
      draftContent: '',
      wordCount: 0,
      createdAt: Date.now() + 3,
    };

    return [rootNode, branchA, branchB, branchA_Act3];
  };

  const [treeNodes, setTreeNodes] = useState<PlotTreeNode[]>(() => {
    if (!currentChapter) return [];
    try {
      const saved = localStorage.getItem(getStorageKey(currentChapter.id));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return cleanLoadedNodes(parsed);
        }
      }
    } catch {}
    return createDefaultTreeForChapter(currentChapter);
  });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    if (!currentChapter) return;
    try {
      const saved = localStorage.getItem(getStorageKey(currentChapter.id));
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = cleanLoadedNodes(parsed);
          setTreeNodes(cleaned);
          const deepest = [...cleaned].sort((a, b) => b.actLevel - a.actLevel)[0];
          setSelectedNodeId(deepest?.id || cleaned[0].id);
          return;
        }
      }
    } catch {}
    const defaultNodes = createDefaultTreeForChapter(currentChapter);
    setTreeNodes(defaultNodes);
    const deepest = [...defaultNodes].sort((a, b) => b.actLevel - a.actLevel)[0];
    setSelectedNodeId(deepest?.id || defaultNodes[0].id);
  }, [currentChapter?.id]);

  const saveTreeNodes = (newNodes: PlotTreeNode[]) => {
    const cleaned = cleanLoadedNodes(newNodes);
    setTreeNodes(cleaned);
    if (currentChapter) {
      try {
        localStorage.setItem(getStorageKey(currentChapter.id), JSON.stringify(cleaned));
      } catch (err) {
        console.error('保存剧情推演树失败:', err);
      }
    }
  };

  // --------------------------------------------------------------------------
  // 3. 节点回溯至根（Path Backtracking to Root）
  // --------------------------------------------------------------------------
  const activePath = useMemo(() => {
    if (!selectedNodeId || treeNodes.length === 0) {
      const deepest = [...treeNodes].sort((a, b) => b.actLevel - a.actLevel)[0];
      if (!deepest) return [];
      return getPath(deepest.id);
    }
    return getPath(selectedNodeId);

    function getPath(targetId: string): PlotTreeNode[] {
      const nodeMap = new Map(treeNodes.map((n) => [n.id, n]));
      const path: PlotTreeNode[] = [];
      let curr = nodeMap.get(targetId);
      const visited = new Set<string>();

      while (curr && !visited.has(curr.id)) {
        visited.add(curr.id);
        path.unshift(curr);
        if (!curr.parentId) break;
        curr = nodeMap.get(curr.parentId);
      }
      return path;
    }
  }, [selectedNodeId, treeNodes]);

  const activePathIds = useMemo(() => new Set(activePath.map((n) => n.id)), [activePath]);

  const rootNodes = useMemo(() => {
    return treeNodes.filter((n) => !n.parentId || !treeNodes.some((p) => p.id === n.parentId));
  }, [treeNodes]);

  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const toggleNodeExpand = (nodeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  // --------------------------------------------------------------------------
  // 4. 树状 SVG 贝塞尔曲线连线算法 (带 Zoom 缩放坐标精准补偿)
  // --------------------------------------------------------------------------
  const treeContainerRef = useRef<HTMLDivElement | null>(null);
  const [connections, setConnections] = useState<TreeConnection[]>([]);

  const calculateConnections = useCallback(() => {
    const container = treeContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const newConnections: TreeConnection[] = [];
    const scale = zoom || 1.0;

    treeNodes.forEach((node) => {
      if (!node.parentId) return;

      const parentEl = document.getElementById(`tree-node-${node.parentId}`);
      const childEl = document.getElementById(`tree-node-${node.id}`);

      if (parentEl && childEl) {
        const parentRect = parentEl.getBoundingClientRect();
        const childRect = childEl.getBoundingClientRect();

        // 经缩放补偿的容器局部坐标
        const startX = (parentRect.right - containerRect.left) / scale;
        const startY = (parentRect.top + parentRect.height / 2 - containerRect.top) / scale;

        const endX = (childRect.left - containerRect.left) / scale;
        const endY = (childRect.top + childRect.height / 2 - containerRect.top) / scale;

        const deltaX = Math.max(28, (endX - startX) * 0.5);
        const pathD = `M ${startX} ${startY} C ${startX + deltaX} ${startY}, ${endX - deltaX} ${endY}, ${endX} ${endY}`;
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;

        const isActive = activePathIds.has(node.parentId) && activePathIds.has(node.id);

        newConnections.push({
          parentId: node.parentId,
          childId: node.id,
          startX,
          startY,
          endX,
          endY,
          pathD,
          midX,
          midY,
          isActive,
        });
      }
    });

    setConnections(newConnections);
  }, [treeNodes, activePathIds, zoom]);

  useEffect(() => {
    calculateConnections();
    const timer = setTimeout(calculateConnections, 60);
    const timer2 = setTimeout(calculateConnections, 200);

    const resizeObserver = new ResizeObserver(() => {
      calculateConnections();
    });

    if (treeContainerRef.current) {
      resizeObserver.observe(treeContainerRef.current);
    }

    window.addEventListener('resize', calculateConnections);

    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculateConnections);
    };
  }, [treeNodes, expandedNodeIds, selectedNodeId, zoom, calculateConnections]);

  // --------------------------------------------------------------------------
  // --------------------------------------------------------------------------
  // 5. 剧情推演：SSE 流式分块解析与画布树实时自动挂载 (无需弹窗阻断，完成一个渲染一个)
  // --------------------------------------------------------------------------
  const [activeDeducingNodeId, setActiveDeducingNodeId] = useState<string | null>(null);
  const [streamedCount, setStreamedCount] = useState<number>(0);
  const [deductionStatusText, setDeductionStatusText] = useState<string>('');
  const [globalInspirationHint, setGlobalInspirationHint] = useState<string>('');
  const [recentDeduceNotice, setRecentDeduceNotice] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 中止当前推演
  const handleStopDeduction = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setActiveDeducingNodeId(null);
    setDeductionStatusText('已停止推演');
  };

  // 触发流式推演：无需模态框阻断，完成一个节点立即实时挂载并渲染！
  const handleStartStreamDeduction = async (parentNode: PlotTreeNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!currentChapter) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setActiveDeducingNodeId(parentNode.id);
    setSelectedNodeId(parentNode.id);
    setStreamedCount(0);
    setDeductionStatusText(`正在为【${sanitizeActTitle(parentNode.title)}】深度推演走向...`);
    setRecentDeduceNotice(null);

    try {
      const anchorScene: Scene = {
        id: parentNode.id,
        chapterId: currentChapter.id,
        sceneIndex: parentNode.actLevel,
        sceneGoal: parentNode.summary,
        conflict: parentNode.conflict || '遭遇敌对势力阻截',
        turnPoint: parentNode.turnPoint || '突发变数打破平衡',
        outcome: parentNode.outcome || '达成阶段战果',
        involvedCharacterIds: parentNode.involvedCharacterIds || (povChar ? [povChar.id] : []),
        location: parentNode.location || '当前场景',
        draftContent: parentNode.draftContent || '',
      };

      const targetLevel = (parentNode.actLevel || 1) + 1;
      let count = 0;

      await ai.streamDeducePlotBranches({
        novel,
        volume: currentVolume,
        currentChapter,
        characters,
        characterStates,
        worldSettings,
        foreshadowings,
        currentScene: anchorScene,
        sceneIndex: parentNode.actLevel,
        recentDraftSnippet: parentNode.draftContent || '',
        customDirection: globalInspirationHint.trim() || undefined,
        settings,
        abortSignal: controller.signal,
        onProgress: (log) => {
          setDeductionStatusText(log.detail || log.step);
        },
        onBranchReceived: (branch) => {
          count++;
          setStreamedCount(count);

          const newChildNode: PlotTreeNode = {
            id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            chapterId: currentChapter.id,
            actLevel: targetLevel,
            parentId: parentNode.id, // 严格挂载为当前父节点的子节点
            title: sanitizeActTitle(branch.title || branch.branchLabel),
            summary: sanitizeActSummary(branch.summary),
            conflict: branch.conflict,
            turnPoint: branch.turnPoint,
            outcome: branch.outcome,
            characterImpact: branch.characterImpact,
            branchType: branch.branchType,
            branchLabel: branch.branchLabel,
            location: parentNode.location || '当前场景',
            involvedCharacterIds: parentNode.involvedCharacterIds || (povChar ? [povChar.id] : []),
            draftContent: '',
            wordCount: 0,
            createdAt: Date.now() + count,
          };

          // 实时将新节点注入画布树，立即触发渲染！
          setTreeNodes((prev) => {
            const nextList = [...prev, newChildNode];
            saveTreeNodes(nextList);
            return nextList;
          });
          setSelectedNodeId(newChildNode.id);
        },
      });

      setRecentDeduceNotice(`🎉 已成功为【${sanitizeActTitle(parentNode.title)}】流式生成并挂载分支！您可自由修改或删除任意走向。`);
      setTimeout(() => setRecentDeduceNotice(null), 5000);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('流式推演失败:', err);
        setDeductionStatusText(`推演异常: ${err.message}`);
      }
    } finally {
      setActiveDeducingNodeId(null);
      abortControllerRef.current = null;
    }
  };


  // 直接在卡片上手动为此父节点添加一个子分支
  const handleAddManualChildBranch = (parentNode: PlotTreeNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const nextLevel = parentNode.actLevel + 1;
    const povName = povChar?.name || '主角';
    const newNode: PlotTreeNode = {
      id: `node-manual-${Date.now()}`,
      chapterId: currentChapter.id,
      actLevel: nextLevel,
      parentId: parentNode.id, // 明确挂载为此节点的子节点
      title: '出奇制胜',
      summary: `承接【${sanitizeActTitle(parentNode.title)}】，${povName}采取出人意料的行动打破僵局...`,
      conflict: '面临新出现的强力阻碍与时间压迫',
      turnPoint: '关键时刻发生戏剧性局势扭转',
      outcome: '产生后续深远影响并引动新危机',
      characterImpact: `${povName}状态发生转变并付出相应代价`,
      branchType: 'DEFAULT',
      branchLabel: '自定义分叉',
      location: parentNode.location || '待定地点',
      involvedCharacterIds: parentNode.involvedCharacterIds || (povChar ? [povChar.id] : []),
      draftContent: '',
      wordCount: 0,
      createdAt: Date.now(),
    };

    const merged = [...treeNodes, newNode];
    saveTreeNodes(merged);
    setSelectedNodeId(newNode.id);
    handleOpenEditModal(newNode);
  };

  // 添加第 1 幕新起手节点（仅根节点允许，供平行开篇对比）
  const handleAddRootAlternative = () => {
    if (!currentChapter) return;
    const povName = povChar?.name || '主角';
    const newRoot: PlotTreeNode = {
      id: `node-root-${Date.now()}`,
      chapterId: currentChapter.id,
      actLevel: 1,
      parentId: null,
      title: '潜龙在渊',
      summary: `${povName}改换装束隐匿市井密探暗线，静待破晓之机...`,
      conflict: '各方耳目盘查严密，稍有不慎即露马脚',
      turnPoint: '偶然在古旧摊位截获密信暗语',
      outcome: '掌握第一手机密，提前布防',
      characterImpact: '保持隐忍，真元充盈蓄势待发',
      branchType: 'OUTWIT_STEALTH',
      branchLabel: '平行起手',
      location: '古镇客栈',
      involvedCharacterIds: povChar ? [povChar.id] : [],
      draftContent: '',
      wordCount: 0,
      createdAt: Date.now(),
    };

    const merged = [...treeNodes, newRoot];
    saveTreeNodes(merged);
    setSelectedNodeId(newRoot.id);
    handleOpenEditModal(newRoot);
  };

  // --------------------------------------------------------------------------
  // 6. 分镜实体全字段编辑对话框状态
  // --------------------------------------------------------------------------
  const [editingNode, setEditingNode] = useState<PlotTreeNode | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSummary, setEditSummary] = useState('');
  const [editConflict, setEditConflict] = useState('');
  const [editTurnPoint, setEditTurnPoint] = useState('');
  const [editOutcome, setEditOutcome] = useState('');
  const [editImpact, setEditImpact] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editCharIds, setEditCharIds] = useState<string[]>([]);
  const [isAiRefiningBeats, setIsAiRefiningBeats] = useState(false);

  const handleOpenEditModal = (node: PlotTreeNode, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingNode(node);
    setEditTitle(sanitizeActTitle(node.title));
    setEditSummary(sanitizeActSummary(node.summary));
    setEditConflict(node.conflict || '');
    setEditTurnPoint(node.turnPoint || '');
    setEditOutcome(node.outcome || '');
    setEditImpact(node.characterImpact || '');
    setEditLocation(node.location || '');
    setEditCharIds(node.involvedCharacterIds || (povChar ? [povChar.id] : []));
  };

  const handleSaveNodeEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNode) return;

    const cleanT = sanitizeActTitle(editTitle) || '剧情走向';
    const cleanS = sanitizeActSummary(editSummary);

    const updated = treeNodes.map((n) => {
      if (n.id !== editingNode.id) return n;
      return {
        ...n,
        title: cleanT,
        summary: cleanS,
        conflict: editConflict.trim(),
        turnPoint: editTurnPoint.trim(),
        outcome: editOutcome.trim(),
        characterImpact: editImpact.trim(),
        location: editLocation.trim(),
        involvedCharacterIds: editCharIds,
      };
    });

    saveTreeNodes(updated);

    if (currentChapter && activePathIds.has(editingNode.id)) {
      const activeIdx = activePath.findIndex((n) => n.id === editingNode.id);
      if (activeIdx >= 0) {
        updateScene(currentChapter.id, activeIdx + 1, {
          sceneGoal: cleanS,
          conflict: editConflict.trim(),
          turnPoint: editTurnPoint.trim(),
          outcome: editOutcome.trim(),
          location: editLocation.trim(),
          involvedCharacterIds: editCharIds,
        });
      }
    }

    setEditingNode(null);
  };

  const handleAiRefineNodeBeats = async () => {
    if (!editingNode) return;
    setIsAiRefiningBeats(true);
    try {
      const povName = characters.find((c) => editCharIds.includes(c.id))?.name || povChar?.name || '主角';
      if (editingNode.actLevel === 1) {
        setEditTitle('探阵识破');
        setEditSummary(`${povName}探查地脉异动，借地势封堵暗处杀机，寻找绝地反击契机`);
        setEditConflict('真元受制，暗敌魔盘锁定，退路被九曲符阵死死封锁');
        setEditTurnPoint('意外发现古石壁残纹与青铜残片产生玄妙共振，撕裂感知盲区');
        setEditOutcome('看清对手杀阵破绽并斩杀先锋，但彻底惊动暗中坐镇名宿');
        setEditImpact(`${povName}经脉微创，青铜残片初次显化雷灵威压`);
      } else if (editingNode.actLevel === 2) {
        setEditTitle('破阵争锋');
        setEditSummary(`${povName}动用底牌撕裂封锁，与强敌在狭窄地峡展开惊天博弈`);
        setEditConflict('敌我战力悬殊，护道残阵濒临瓦解，对方祭出本命阴煞魔宝');
        setEditTurnPoint('兵行险着，逆转真元引爆地脉阴煞倒灌战局');
        setEditOutcome('破除老魔绝杀领域，但引动了更深层地渊的未知异动');
        setEditImpact('本命真元消耗过半，撕开对手一缕金丹道韵');
      } else {
        setEditTitle('天降援手');
        setEditSummary(`${povName}完成绝地逆转，援手突降，引爆万载禁制坠入仙魔大遗迹`);
        setEditConflict('气血枯竭，周遭空间被狂暴的真元对轰撕扯崩裂');
        setEditTurnPoint('同门神剑从天而降，斩碎魔相同时击穿上古地脉枢纽');
        setEditOutcome('老魔受创败退，双方一同卷入被岁月遗忘的星宿青铜古墓');
        setEditImpact('心脉受护心丹护持，锁定下一阶段主线核心逆天机缘');
      }
    } finally {
      setIsAiRefiningBeats(false);
    }
  };

  const handleDeleteNode = (nodeId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const node = treeNodes.find((n) => n.id === nodeId);
    if (!node) return;

    const isRoot = !node.parentId;
    const rootCount = treeNodes.filter((n) => !n.parentId).length;
    if (isRoot && rootCount <= 1) {
      alert('这是本章唯一的开局剧情节点，请至少保留一个起手剧情。');
      return;
    }

    if (!confirm(`确定删除【${node.title}】及其下属的所有推演分叉吗？`)) return;

    const toDelete = new Set<string>();
    const collectChildren = (id: string) => {
      toDelete.add(id);
      treeNodes.filter((n) => n.parentId === id).forEach((c) => collectChildren(c.id));
    };
    collectChildren(nodeId);

    const remaining = treeNodes.filter((n) => !toDelete.has(n.id));
    saveTreeNodes(remaining);

    if (selectedNodeId && toDelete.has(selectedNodeId)) {
      const nextActive = remaining[0]?.id || null;
      setSelectedNodeId(nextActive);
    }
  };

  // --------------------------------------------------------------------------
  // 7. 基于选定主线 AI 创作整个章节 (Full Chapter AI Drafting)
  // --------------------------------------------------------------------------
  const [isFullDraftModalOpen, setIsFullDraftModalOpen] = useState(false);
  const [targetWordsPerAct, setTargetWordsPerAct] = useState<number>(1050);
  const [isGeneratingFullChapter, setIsGeneratingFullChapter] = useState(false);
  const [generationProgressText, setGenerationProgressText] = useState('');
  const [completedActsCount, setCompletedActsCount] = useState(0);
  const [generatedChapterResult, setGeneratedChapterResult] = useState<{
    fullText: string;
    totalWords: number;
    sceneDrafts: { sceneIndex: number; title: string; content: string; wordCount: number }[];
  } | null>(null);

  const handleOpenFullDraftModal = () => {
    setIsFullDraftModalOpen(true);
    setGeneratedChapterResult(null);
    setCompletedActsCount(0);
    setGenerationProgressText('');
  };

  const handleExecuteFullChapterDraft = async () => {
    if (!currentChapter || activePath.length === 0) return;
    setIsGeneratingFullChapter(true);
    setGenerationProgressText('正在装载世界规则、出场边界与在场角色状态机...');
    setCompletedActsCount(0);

    try {
      const mappedScenes: Scene[] = activePath.map((node, idx) => ({
        id: `sc-${currentChapter.id}-${idx + 1}`,
        chapterId: currentChapter.id,
        sceneIndex: idx + 1,
        sceneGoal: sanitizeActSummary(node.summary),
        conflict: node.conflict || '主线冲突',
        turnPoint: node.turnPoint || '关键转折',
        outcome: node.outcome || '场景结局',
        involvedCharacterIds: node.involvedCharacterIds || (povChar ? [povChar.id] : []),
        location: node.location || '幽冥断渊',
        draftContent: node.draftContent || '',
      }));

      const draftResult = await ai.draftFullChapterFromPath({
        path: activePath,
        chapter: currentChapter,
        novel,
        characters,
        characterStates,
        worldSettings,
        foreshadowings,
        volume: currentVolume,
        targetWordsPerScene: targetWordsPerAct,
        onSceneProgress: (sceneIdx, totalScenes, sceneTitle, statusText) => {
          setCompletedActsCount(sceneIdx - 1);
          setGenerationProgressText(statusText);
        },
      });

      setCompletedActsCount(activePath.length);
      setGeneratedChapterResult({
        fullText: draftResult.fullChapterText,
        totalWords: draftResult.totalWords,
        sceneDrafts: draftResult.sceneDrafts,
      });

      const updatedNodes = treeNodes.map((n) => {
        const found = draftResult.sceneDrafts.find((sd, idx) => activePath[idx]?.id === n.id);
        if (found) {
          return {
            ...n,
            draftContent: found.content,
            wordCount: found.wordCount,
          };
        }
        return n;
      });
      saveTreeNodes(updatedNodes);

      const finalScenes: Scene[] = mappedScenes.map((sc, idx) => {
        const generated = draftResult.sceneDrafts[idx];
        return {
          ...sc,
          draftContent: generated ? generated.content : '',
        };
      });

      updateChapter(currentChapter.id, {
        scenes: finalScenes,
        actualWordCount: draftResult.totalWords,
      });
    } catch (err) {
      console.error('全章连续工笔起草失败:', err);
    } finally {
      setIsGeneratingFullChapter(false);
    }
  };

  const handleAcceptAndGoToEditor = () => {
    setIsFullDraftModalOpen(false);
    if (onSwitchToEditor) {
      onSwitchToEditor();
    } else if (onJumpToStudio && currentChapter) {
      onJumpToStudio(currentChapter.id, 1);
    }
  };

  const handleResetTree = () => {
    if (!currentChapter) return;
    if (confirm('确定重置当前章节的推演树为主干初始状态吗？未采纳的分支将被清除。')) {
      localStorage.removeItem(getStorageKey(currentChapter.id));
      const defNodes = createDefaultTreeForChapter(currentChapter);
      setTreeNodes(defNodes);
      setSelectedNodeId(defNodes[defNodes.length - 1]?.id || null);
    }
  };

  const activePathTotalDraftWords = activePath.reduce((acc, n) => acc + (n.wordCount || n.draftContent?.length || 0), 0);
  const estimatedTargetWords = activePath.length * targetWordsPerAct;

  return (
    <div className="flex-1 flex flex-col bg-slate-950 overflow-hidden select-auto relative">
      {/* ----------------------------------------------------------------------
          1. 顶部控制与故事主线回溯指示栏
      ---------------------------------------------------------------------- */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2.5 flex flex-col gap-2 shrink-0 backdrop-blur-md z-20 shadow-md">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* 左侧：章节指示与推演拓扑统计 */}
          <div className="flex items-center gap-2.5 flex-wrap min-w-0">
            <div className="flex items-center gap-1.5">
              <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <GitFork className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-100">
                剧情推演树
              </span>
            </div>

            {/* 章节切换器 */}
            <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs">
              <Compass className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <select
                value={selectedChapId}
                onChange={(e) => {
                  setSelectedChapId(e.target.value);
                  setActiveChapterId(e.target.value);
                }}
                className="bg-transparent text-indigo-200 font-medium focus:outline-none cursor-pointer max-w-[200px] truncate"
              >
                {volumes.map((v) => (
                  <optgroup key={v.id} label={`第 ${v.volumeIndex} 卷 · ${v.title}`}>
                    {v.chapters.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                        第 {c.chapterIndex} 章：{c.title}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <span className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-medium">
              独立节点：{treeNodes.length} 个
            </span>

            {/* 防早现约束提示 */}
            {currentVolume?.boundaryConstraints && (
              <div
                className="hidden xl:flex items-center gap-1 text-[11px] text-amber-300/90 bg-amber-950/30 border border-amber-800/40 px-2 py-0.5 rounded-md max-w-xs truncate"
                title={`出场红线约束：${currentVolume.boundaryConstraints}`}
              >
                <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="text-amber-400/80 shrink-0">防早现:</span>
                <span className="truncate">{currentVolume.boundaryConstraints}</span>
              </div>
            )}
          </div>

          {/* 右侧：缩放控制条、重置与全章创作触发 */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 幕布自由缩放工具条 (Zoom Controls: 50% ~ 150%) */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 0.5}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-850 cursor-pointer"
                title="缩小画布 (Ctrl + 滚轮向下)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 py-0.5 text-[11px] font-mono text-indigo-300 hover:text-indigo-200 cursor-pointer"
                title="重置为 100% 缩放"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 1.5}
                className="p-1 text-slate-400 hover:text-white disabled:opacity-30 rounded hover:bg-slate-850 cursor-pointer"
                title="放大画布 (Ctrl + 滚轮向上)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* AI 状态指示 */}
            <button
              onClick={openSettingsModal}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                isUsingRealAI
                  ? 'bg-emerald-950/50 hover:bg-emerald-900/50 border-emerald-800/60 text-emerald-300'
                  : 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-800/50 text-amber-300'
              }`}
              title={isUsingRealAI ? '已连接真实大模型，点击调整' : '免Key本地启发式模拟，点击可配置API Key'}
            >
              {isUsingRealAI ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">真实AI · {settings.model || settings.provider}</span>
                  <span className="sm:hidden">真实AI</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">免Key模拟 · 点击配置真实AI</span>
                  <span className="sm:hidden">免Key模拟</span>
                </>
              )}
            </button>

            {/* 灵感偏向输入框 */}
            <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs shadow-inner">
              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <input
                type="text"
                value={globalInspirationHint}
                onChange={(e) => setGlobalInspirationHint(e.target.value)}
                placeholder="推演灵感偏向 (选填，如：爆发反杀/第三方介入)"
                className="bg-transparent border-none text-slate-200 placeholder-slate-500 focus:outline-none text-[11px] w-36 sm:w-52"
              />
              {globalInspirationHint && (
                <button onClick={() => setGlobalInspirationHint('')} className="text-slate-500 hover:text-slate-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 重置推演树 */}
            <button
              onClick={handleResetTree}
              className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
              title="重置当前章节推演树"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* 核心行动点：采纳主线由 AI 创作全章 */}
            <button
              onClick={handleOpenFullDraftModal}
              className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
              title="基于当前回溯选定故事线，由 AI 连续工笔撰写全章（目标 3000+ 字）"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span>AI 创作全章 ({activePath.length} 节点 · 目标 3000+ 字)</span>
            </button>

            {onSwitchToEditor && (
              <button
                onClick={onSwitchToEditor}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition flex items-center gap-1 cursor-pointer"
                title="前往正文编辑器"
              >
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                <span className="hidden md:inline">切入正文撰写</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 正在进行中的流式推演进度通知栏 */}
        {activeDeducingNodeId && (
          <div className="flex items-center justify-between gap-3 bg-purple-950/70 border border-purple-500/50 rounded-xl px-4 py-2 text-xs text-purple-200 shadow-xl shadow-purple-950/50 animate-pulse">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
              <span className="font-bold">
                正在为【{sanitizeActTitle(treeNodes.find(n => n.id === activeDeducingNodeId)?.title || '节点')}】进行 SSE 流式分块推演
              </span>
              <span className="text-purple-300 text-[11px]">
                ({deductionStatusText || `已实时挂载 ${streamedCount}/4 个独立分支`})
              </span>
            </div>
            <button
              onClick={handleStopDeduction}
              className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 text-white rounded-lg text-[11px] font-bold transition cursor-pointer shadow-xs"
            >
              ⏹ 停止推演
            </button>
          </div>
        )}

        {/* 推演完成通知 */}
        {!activeDeducingNodeId && recentDeduceNotice && (
          <div className="flex items-center justify-between gap-3 bg-emerald-950/70 border border-emerald-500/50 rounded-xl px-4 py-2 text-xs text-emerald-200 shadow-md">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{recentDeduceNotice}</span>
            </div>
            <button onClick={() => setRecentDeduceNotice(null)} className="text-emerald-400 hover:text-emerald-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* 故事主线回溯面包屑条 */}
        <div className="flex items-center justify-between gap-2 bg-slate-950/80 border border-indigo-900/40 rounded-lg px-3 py-1.5 text-xs">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 min-w-0">
            <span className="text-indigo-400 font-bold flex items-center gap-1 shrink-0 text-[11px]">
              <Milestone className="w-3.5 h-3.5 text-amber-400" />
              <span>当前回溯主线路径:</span>
            </span>

            {activePath.length === 0 ? (
              <span className="text-slate-500 text-[11px]">请在下方画布点击任意实体以激活主线回溯</span>
            ) : (
              activePath.map((node, idx) => (
                <React.Fragment key={node.id}>
                  <button
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium transition shrink-0 cursor-pointer ${
                      node.id === selectedNodeId
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-900 text-indigo-300 hover:bg-slate-800 border border-slate-800'
                    }`}
                    title={`第 ${idx + 1} 步梗概：${sanitizeActSummary(node.summary)}`}
                  >
                    <span className="opacity-80 text-[10px]">#{idx + 1}</span>
                    <span className="font-semibold truncate max-w-[120px]">{sanitizeActTitle(node.title)}</span>
                  </button>

                  {idx < activePath.length - 1 && (
                    <ChevronRight className="w-3 h-3 text-indigo-400/60 shrink-0" />
                  )}
                </React.Fragment>
              ))
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0 text-[11px] text-slate-400 hidden sm:flex">
            <span>主线共 <strong className="text-indigo-300">{activePath.length}</strong> 幕</span>
            <span className="text-slate-600">|</span>
            <span>
              已起草正文：
              <strong className={activePathTotalDraftWords >= 3000 ? 'text-emerald-400 font-bold' : 'text-slate-300'}>
                {activePathTotalDraftWords}
              </strong>
              {' '}/ 目标 3000+ 字
            </span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          2. 横向树状幕布工作区与 SVG 连线层 (Horizontal Scaled Canvas)
      ---------------------------------------------------------------------- */}
      <div
        className="flex-1 overflow-x-auto overflow-y-auto p-6 bg-[radial-gradient(#1e293b_1.2px,transparent_1.2px)] [background-size:24px_24px] relative select-none"
        onWheel={(e) => {
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            const delta = e.deltaY > 0 ? -0.05 : 0.05;
            setZoom((prev) => Math.min(1.5, Math.max(0.5, Math.round((prev + delta) * 100) / 100)));
          }
        }}
      >
        <div
          ref={treeContainerRef}
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
          }}
          className="relative flex items-start gap-14 min-w-max pb-20 pt-2 transition-transform duration-100 ease-out select-auto"
        >
          {/* SVG 树状连线覆盖层 */}
          <svg
            className="absolute inset-0 pointer-events-none w-full h-full overflow-visible z-0"
            style={{ minWidth: '100%', minHeight: '100%' }}
          >
            <defs>
              <linearGradient id="activeTreeLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#818cf8" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
              <filter id="treeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {connections.map((conn) => (
              <g key={`${conn.parentId}->${conn.childId}`}>
                {conn.isActive && (
                  <path
                    d={conn.pathD}
                    fill="none"
                    stroke="#6366f1"
                    strokeWidth={6}
                    strokeOpacity={0.35}
                    filter="url(#treeGlow)"
                  />
                )}

                <path
                  d={conn.pathD}
                  fill="none"
                  stroke={conn.isActive ? 'url(#activeTreeLineGradient)' : '#334155'}
                  strokeWidth={conn.isActive ? 2.5 : 1.5}
                  strokeDasharray={conn.isActive ? 'none' : '5 4'}
                  className="transition-all duration-300"
                />

                {conn.isActive && (
                  <circle
                    cx={conn.midX}
                    cy={conn.midY}
                    r={3.5}
                    fill="#a855f7"
                    className="animate-pulse"
                  />
                )}
              </g>
            ))}
          </svg>

          {/* 纯树状剧情图谱渲染 (从左至右自然延展，严格因果父子血缘) */}
          <div className="flex flex-col gap-8 items-start min-w-max relative z-10 pl-6 pr-20 pt-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handleAddRootAlternative}
                className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-indigo-300 hover:text-white border border-indigo-900/60 hover:border-indigo-500/50 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-md"
                title="添加一个新的平行开篇剧情起点"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                <span>+ 新增平行开局剧情</span>
              </button>
              <span className="text-[11px] text-slate-500">
                纯树状因果拓扑 · 共有 {treeNodes.length} 个独立剧情节点 (点击卡片右侧按钮随时衍生分支或推演)
              </span>
            </div>

            {/* 树状分枝渲染 */}
            <div className="flex flex-col gap-14 items-start">
              {rootNodes.map((rootNode) => (
                <PlotTreeNodeItem
                  key={rootNode.id}
                  node={rootNode}
                  allNodes={treeNodes}
                  selectedNodeId={selectedNodeId}
                  activePathIds={activePathIds}
                  expandedNodeIds={expandedNodeIds}
                  activeDeducingNodeId={activeDeducingNodeId}
                  streamedCount={streamedCount}
                      onSelect={(id) => setSelectedNodeId(id)}
                  onToggleExpand={(id, e) => toggleNodeExpand(id, e)}
                  onEdit={(node, e) => handleOpenEditModal(node, e)}
                  onDelete={(id, e) => handleDeleteNode(id, e)}
                  onAddManualChild={(node, e) => handleAddManualChildBranch(node, e)}
                  onStartDeduce={(node, e) => handleStartStreamDeduction(node, e)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------
          4. 基于回溯路径的 AI 创作全章模态舱 (Full Chapter Generation Modal)
      ---------------------------------------------------------------------- */}
      {isFullDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>AI 工笔起草全章（单章 3000+ 字达标标准）</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    基于已选故事线，以【3~4幕因果架构 + 单幕工笔细节】连续起草
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsFullDraftModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-800/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>单章 3000+ 字核心控制策略：</span>
                </span>
                <span className="text-[11px] text-indigo-400 font-mono">
                  当前主线共 {activePath.length} 幕
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-[11px]">
                网络小说单章 3000+ 字不靠盲目堆叠幕数（会导致节奏碎裂成流水账），而是通过<strong>【3~4 幕因果架构】</strong>结合<strong>【单幕工笔级慢镜头细致拆解】</strong>（环境五感煞气、招式攻防慢放拆解、多轮心理博弈）。
              </p>
              <div className="flex items-center gap-3 pt-1 text-[11px]">
                <span className="text-slate-400">单幕工笔目标：</span>
                <select
                  value={targetWordsPerAct}
                  onChange={(e) => setTargetWordsPerAct(Number(e.target.value))}
                  disabled={isGeneratingFullChapter}
                  className="bg-slate-900 border border-slate-700 text-indigo-300 rounded px-2 py-0.5 font-medium cursor-pointer"
                >
                  <option value={900}>900 字 / 幕 (全章预计 ~{activePath.length * 900} 字)</option>
                  <option value={1050}>1050 字 / 幕 (全章预计 ~{activePath.length * 1050} 字 · 推荐)</option>
                  <option value={1200}>1200 字 / 幕 (全章预计 ~{activePath.length * 1200} 字 · 丰满大章)</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block">
                将顺序连续撰写的各幕故事线：
              </span>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {activePath.map((node, idx) => (
                  <div
                    key={node.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-bold text-[10px]">
                          第 {idx + 1} 幕
                        </span>
                        <span className="font-semibold text-slate-200 truncate">{sanitizeActTitle(node.title)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {sanitizeActSummary(node.summary)}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-500 shrink-0 font-mono pt-1">
                      目标 ~{targetWordsPerAct} 字
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {isGeneratingFullChapter && (
              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-900/50 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-indigo-300 font-semibold flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>{generationProgressText}</span>
                  </span>
                  <span className="text-slate-400 font-mono">
                    {completedActsCount} / {activePath.length} 幕
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                    style={{
                      width: `${Math.max(10, (completedActsCount / activePath.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {generatedChapterResult && (
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/60 space-y-3 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      全章工笔起草大获成功！
                    </span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400 font-mono">
                    共计 {generatedChapterResult.totalWords} 字 (满足 3000+ 字网文大章标准)
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-300 leading-relaxed font-serif whitespace-pre-wrap">
                  {generatedChapterResult.fullText.slice(0, 500)}...
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsFullDraftModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                关闭
              </button>

              {generatedChapterResult ? (
                <button
                  type="button"
                  onClick={handleAcceptAndGoToEditor}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>立即切入正文编辑器精修 ({generatedChapterResult.totalWords} 字)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleExecuteFullChapterDraft}
                  disabled={isGeneratingFullChapter}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingFullChapter ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  )}
                  <span>开始连续工笔撰写全章 (目标 ~{estimatedTargetWords} 字)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------
          5. 分镜实体全字段编辑模态框 (Node Edit Modal)
      ---------------------------------------------------------------------- */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    编辑剧情事件实体（阶段 {editingNode.actLevel}）
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    微调核心走向标题与剧情梗概，作为后续 AI 工笔生成的真实源
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingNode(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNodeEdit} className="space-y-3.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-bold">
                    走向标题 (Title · 纯动作命名，无需写第几幕)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    例：伏线入局、绝境硬撼、暗度陈仓
                  </span>
                </div>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="例如：绝死反扑、引爆地火、移形换影"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-200 font-bold flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-indigo-400" />
                    <span>剧情走向核心梗概 (Summary · 纯故事叙述，无需前缀)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAiRefineNodeBeats}
                    disabled={isAiRefiningBeats}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isAiRefiningBeats ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-amber-400" />
                    )}
                    <span>AI 润色节拍</span>
                  </button>
                </div>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={3}
                  placeholder="直接描述主角在本幕的核心动作与事件推进（如：林越压制肩伤，借溶洞阴煞引爆残破古禁制设伏）..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-rose-300 font-bold mb-1">
                  ⚡ 阻碍与核心冲突 (Conflict)
                </label>
                <textarea
                  value={editConflict}
                  onChange={(e) => setEditConflict(e.target.value)}
                  rows={2}
                  placeholder="阻碍主角顺利达成目标的敌对力量、环境或内在魔障..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-amber-300 font-bold mb-1">
                  🔀 核心戏剧转折点 (Turn Point)
                </label>
                <textarea
                  value={editTurnPoint}
                  onChange={(e) => setEditTurnPoint(e.target.value)}
                  rows={2}
                  placeholder="打破预期、让局势突然反转或异化的意外变数..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-emerald-300 font-bold mb-1">
                  🏁 场景结局与后续代价 (Outcome)
                </label>
                <textarea
                  value={editOutcome}
                  onChange={(e) => setEditOutcome(e.target.value)}
                  rows={2}
                  placeholder="本幕尘埃落定后的实质改变，将直接演变为下一幕的因果危机..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">发生地点</label>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="例如：坠星崖底古溶洞"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">在场登场角色</label>
                  <div className="flex flex-wrap gap-1 p-1 bg-slate-950 border border-slate-800 rounded-lg max-h-20 overflow-y-auto">
                    {characters.map((char) => {
                      const isChecked = editCharIds.includes(char.id);
                      return (
                        <button
                          key={char.id}
                          type="button"
                          onClick={() => {
                            setEditCharIds((prev) =>
                              isChecked ? prev.filter((id) => id !== char.id) : [...prev, char.id]
                            );
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] font-medium transition cursor-pointer ${
                            isChecked
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {char.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingNode(null)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存分镜实体</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
