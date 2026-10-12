// ==============================================================================
// 创作工作台中栏：人文文学工坊编辑器与 Diff 句段审阅 (Manuscript Atelier)
// 专为中文文学创作者深度定制，支持句段级微观比对、战力防崩自愈、对白潜台词与高燃打斗分镜
// ==============================================================================

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNovel } from '../../context/NovelContext';
import { useTheme } from '../../context/ThemeContext';
import { DiffViewer } from './DiffViewer';
import { GranularDiffMerger } from './GranularDiffMerger';
import { ConsistencyGuardModal } from './ConsistencyGuardModal';
import { DialogueDoctorModal } from './DialogueDoctorModal';
import { ActionDirectorModal } from './ActionDirectorModal';
import { ZenFocusModal } from './ZenFocusModal';
import { TechniqueRepositoryModal } from './TechniqueRepositoryModal';
import { FieldExplainer } from '../common/FieldExplainer';
import { WalStorageManager } from '../../lib/walStorage';
import { purifyManuscript } from '../../lib/api';
import {
  Save,
  Sparkles,
  Plus,
  Clock,
  FileText,
  CheckCircle,
  Maximize2,
  Minimize2,
  Wand2,
  MessageSquare,
  BookOpen,
  Copy,
  Check,
  X,
  Compass,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Swords,
  GitFork,
  Activity,
  Feather,
  Target,
  MapPin,
  Zap,
  ArrowLeft,
  ArrowRight,
  Network,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { NavTab } from '../Header';

interface ManuscriptEditorProps {
  onOpenContext?: () => void;
  onOpenAgent?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onSwitchToCanvas?: () => void;
  onOpenOutlineModal?: () => void;
}

export const ManuscriptEditor: React.FC<ManuscriptEditorProps> = ({
  onOpenContext,
  onOpenAgent,
  onNavigateTab,
  onSwitchToCanvas,
  onOpenOutlineModal,
}) => {
  const {
    novel,
    volumes,
    characters,
    foreshadowings,
    activeChapter,
    activeScene,
    activeSceneIndex,
    setActiveSceneIndex,
    setActiveDockTab,
    addScene,
    updateScene,
    editorContent,
    setEditorContent,
    pendingDraft,
    pendingPolishResult,
    savedPolishTechniques,
    selectedTechniquesForReuse,
    isTechniqueModalOpen,
    setIsTechniqueModalOpen,
    currentAgent,
    acceptPendingDraft,
    dismissPendingDraft,
    runStylistPolish,
    runDrafterWriteScene,
    runInspectorAudit,
    isAgentRunning,
  } = useNovel();

  const { settings: themeSettings, setFontSize } = useTheme();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [showFullChapterModal, setShowFullChapterModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // 多步撤销/重做栈 (UX15 / DA18)
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);

  // 划词悬浮 AI 魔法工具条状态 (UX02 / F1)
  const [selectedSnippet, setSelectedSnippet] = useState<string>('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({ line: 1, col: 1 });

  // TTS 听书校对状态 (F7 / DA19)
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  const triggerToast = (msg: string) => {
    setActionToast(msg);
    setTimeout(() => setActionToast(null), 2800);
  };

  const pushUndoSnapshot = (currentText: string) => {
    setUndoStack((prev) => [...prev.slice(-19), currentText]);
    setRedoStack([]);
  };

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevText = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, editorContent]);
    setUndoStack((u) => u.slice(0, -1));
    setEditorContent(prevText);
    triggerToast('↩️ 已撤销上一步正文修改');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextText = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, editorContent]);
    setRedoStack((r) => r.slice(0, -1));
    setEditorContent(nextText);
    triggerToast('↪️ 已重做正文修改');
  };

  const handlePurifyTypography = async () => {
    pushUndoSnapshot(editorContent);
    const res = await purifyManuscript({
      draftText: editorContent,
      removeFluff: true,
      indentParagraphs: true,
    });
    setEditorContent(res.purifiedText);
    if (activeChapter && activeScene) {
      updateScene(activeChapter.id, activeScene.sceneIndex, {
        draftContent: res.purifiedText,
      });
    }
    triggerToast(
      `🧹 排版净化与脱水完成：规范 ${res.paragraphCount} 段落，清理水词 ${res.totalFluffCount} 处（含水率 ${res.waterRatioPercent}%）`
    );
  };

  const handleInsertCliffhangerHook = async () => {
    pushUndoSnapshot(editorContent);
    const res = await purifyManuscript({ draftText: editorContent });
    const hook =
      res.cliffhangerHooks[0]?.content ||
      '　　就在他收剑入鞘的刹那，深渊地底忽然传来一声沉闷如雷的心跳，整座石殿的青铜古灯在同一瞬尽数熄灭。';
    const next = `${editorContent.trimEnd()}\n\n${hook}`;
    setEditorContent(next);
    triggerToast('🪝 已在章末追加高追读率【黄金断章钩子】');
  };

  const handleInsertDivider = () => {
    pushUndoSnapshot(editorContent);
    const next = `${editorContent.trimEnd()}\n\n　　◇　◇　◇\n\n　　`;
    setEditorContent(next);
    triggerToast('✨ 已插入古典场景过渡分隔符');
  };

  const handleToggleTtsSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      triggerToast('⚠️ 当前浏览器环境暂不支持原生语音合成');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      triggerToast('⏹️ 已停止听书朗读校对');
    } else {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(selectedSnippet || editorContent.slice(0, 600));
      utter.lang = 'zh-CN';
      utter.rate = 1.1;
      utter.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utter);
      setIsSpeaking(true);
      triggerToast('🔊 已开启沉浸听书校对（朗读选中段或前 600 字）');
    }
  };

  const handleSelectionTransform = (mode: 'EXPAND' | 'CONDENSE' | 'CLASSICAL') => {
    if (!selectedSnippet || !selectionRange) return;
    pushUndoSnapshot(editorContent);
    let replacement = selectedSnippet;
    if (mode === 'EXPAND') {
      replacement = `${selectedSnippet}——空气中弥漫着刺骨的铁锈与寒霜气息，每一次呼吸都仿佛牵动着古渊深处潜藏的杀机。`;
    } else if (mode === 'CONDENSE') {
      replacement = selectedSnippet
        .replace(/不由得/g, '')
        .replace(/缓缓/g, '')
        .replace(/竟然/g, '竟');
    } else if (mode === 'CLASSICAL') {
      replacement = `但见${selectedSnippet}，剑气如霜雪漫卷，天地为之肃然。`;
    }
    const updated =
      editorContent.slice(0, selectionRange.start) +
      replacement +
      editorContent.slice(selectionRange.end);
    setEditorContent(updated);
    setSelectedSnippet('');
    setSelectionRange(null);
    triggerToast(`✨ 已完成选中段落行间【${mode === 'EXPAND' ? '五感扩写' : mode === 'CONDENSE' ? '凝练脱水' : '名家古风化'}】`);
  };

  // 页面宽度与导演节拍卡状态
  const [pageWidth, setPageWidth] = useState<'standard' | 'wide' | 'full'>(() => {
    try {
      return (localStorage.getItem('nov_editor_page_width') as 'standard' | 'wide' | 'full') || 'wide';
    } catch {
      return 'wide';
    }
  });

  const handleSetPageWidth = (w: 'standard' | 'wide' | 'full') => {
    setPageWidth(w);
    try {
      localStorage.setItem('nov_editor_page_width', w);
    } catch {}
  };

  const [isDossierOpen, setIsDossierOpen] = useState(true);

  // 新功能模态框开关
  const [isConsistencyGuardOpen, setIsConsistencyGuardOpen] = useState(false);
  const [isDialogueDoctorOpen, setIsDialogueDoctorOpen] = useState(false);
  const [isActionDirectorOpen, setIsActionDirectorOpen] = useState(false);
  const [isZenFocusOpen, setIsZenFocusOpen] = useState(false);
  const [useGranularDiff, setUseGranularDiff] = useState(true);
  const [isClinicMenuOpen, setIsClinicMenuOpen] = useState(false);
  const clinicMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (clinicMenuRef.current && !clinicMenuRef.current.contains(e.target as Node)) {
        setIsClinicMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // WAL 预写日志自动保存
  useEffect(() => {
    if (activeChapter && activeScene && editorContent) {
      WalStorageManager.appendLog(
        novel.id,
        activeChapter.id,
        activeScene.sceneIndex,
        editorContent
      );
    }
  }, [novel.id, activeChapter, activeScene, editorContent]);

  const currentVolume = volumes.find((v) => v.id === activeChapter?.volumeId);

  const inSceneCharacters = useMemo(() => {
    if (!activeScene?.involvedCharacterIds || !characters) return [];
    return characters.filter((c) => activeScene.involvedCharacterIds.includes(c.id));
  }, [activeScene, characters]);

  const relatedForeshadowings = useMemo(() => {
    if (!foreshadowings || !activeChapter) return [];
    return foreshadowings.filter(
      (f) =>
        f.plantedChapterId === activeChapter.id ||
        f.plannedResolveChapterId === activeChapter.id ||
        f.actualResolvedChapterId === activeChapter.id
    );
  }, [foreshadowings, activeChapter]);

  const sensoryMetrics = useMemo(() => {
    if (!editorContent || editorContent.length < 30) {
      return { visual: 42, action: 28, subtext: 18, sensory: 12, tension: 72 };
    }
    const len = editorContent.length;
    const visualMatches = (editorContent.match(/[看望见雪白黑红光暗影视色衣眸峰天景照]/g) || []).length;
    const actionMatches = (editorContent.match(/[走跑行跃斩挥扫拍拔刺冲退抓握打指掠震]/g) || []).length;
    const subtextMatches = (editorContent.match(/[说答哼语沉念心忖暗思神想道笑]/g) || []).length;
    const sensoryMatches = (editorContent.match(/[喝声响风呼啸鸣冷冰痛热气雷震颤]/g) || []).length;
    const total = visualMatches + actionMatches + subtextMatches + sensoryMatches || 1;
    const visual = Math.max(15, Math.round((visualMatches / total) * 100));
    const action = Math.max(15, Math.round((actionMatches / total) * 100));
    const subtext = Math.max(10, Math.round((subtextMatches / total) * 100));
    const sensory = Math.max(10, 100 - visual - action - subtext);
    const tension = Math.min(95, Math.max(45, 50 + Math.round((actionMatches * 2 + sensoryMatches * 1.5) / (len / 100 + 1))));
    return { visual, action, subtext, sensory, tension };
  }, [editorContent]);

  const sceneCount = activeChapter?.scenes?.length || 1;
  const currentSceneNumber = activeSceneIndex;
  const hasPrevScene = currentSceneNumber > 1;
  const hasNextScene = currentSceneNumber < sceneCount;
  const prevScene = activeChapter?.scenes?.find((s) => s.sceneIndex === currentSceneNumber - 1);
  const nextScene = activeChapter?.scenes?.find((s) => s.sceneIndex === currentSceneNumber + 1);

  const chapterTotalWords = (activeChapter?.scenes || []).reduce(
    (acc, s) => acc + (s.draftContent?.length || 0),
    0
  );

  const handleCopyChapter = () => {
    if (!activeChapter) return;
    const text = (activeChapter.scenes || [])
      .map(
        (s) =>
          `【第 ${s.sceneIndex} 幕${s.sceneGoal ? ` · ${s.sceneGoal}` : ''}】\n\n${
            s.draftContent || '（暂无草稿）'
          }`
      )
      .join('\n\n' + '----------------------------------------' + '\n\n');
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const wordCount = editorContent.length;
  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 400));

  const handleManualSave = () => {
    if (activeChapter && activeScene) {
      updateScene(activeChapter.id, activeScene.sceneIndex, {
        draftContent: editorContent,
      });
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2000);
    }
  };

  const handleAddScene = () => {
    if (!activeChapter) return;
    const nextIdx = (activeChapter.scenes?.length || 0) + 1;
    addScene(activeChapter.id, {
      sceneIndex: nextIdx,
      sceneGoal: '承接上文展开新转折',
      conflict: '面临未知的冲突阻碍',
      turnPoint: '局势突变',
      outcome: '产生新的后果',
      involvedCharacterIds: activeChapter.povCharacterId ? [activeChapter.povCharacterId] : [],
      location: '未定地点',
      draftContent: '',
    });
    setActiveSceneIndex(nextIdx);
  };

  // 自愈补丁应用
  const handleApplyPatch = (originalSnippet: string, fixedSnippet: string) => {
    if (editorContent.includes(originalSnippet)) {
      const updated = editorContent.replace(originalSnippet, fixedSnippet);
      setEditorContent(updated);
      if (activeChapter && activeScene) {
        updateScene(activeChapter.id, activeScene.sceneIndex, { draftContent: updated });
      }
    }
  };

  // 插入对白或打斗段落
  const handleInsertText = (textToInsert: string) => {
    const updated = editorContent ? `${editorContent}${textToInsert}` : textToInsert.trim();
    setEditorContent(updated);
    if (activeChapter && activeScene) {
      updateScene(activeChapter.id, activeScene.sceneIndex, { draftContent: updated });
    }
  };

  return (
    <main
      className={`flex-1 flex flex-col overflow-hidden transition-colors ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-main)',
      }}
    >
      {/* ====================================================================
          导演级全景一体化中控台 (Single-Row Director Control Bar)
          消除重复标题、消除重复模式切换、消除多层堆叠，释放超大写作视界
      ==================================================================== */}
      <div
        className="border-b px-3 sm:px-5 py-2 flex items-center justify-between gap-3 shrink-0 z-20 backdrop-blur-md select-none transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {/* 左侧：章节大纲定位指示 + 场景分镜幕 (Scene Acts) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {/* 手机端打开左侧抽屉 */}
          {onOpenContext && (
            <button
              onClick={onOpenContext}
              className="md:hidden p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="打开大纲分镜目录"
            >
              <Compass className="w-4 h-4 text-indigo-400" />
            </button>
          )}

          {/* 大纲与章节标题 Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs truncate shrink-0">
            <button
              onClick={onOpenOutlineModal || onOpenContext}
              className="font-medium flex items-center gap-1 hover:underline cursor-pointer"
              style={{ color: 'var(--accent-primary)' }}
              title="打开全景大纲分镜架构总览"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">大纲架构</span>
            </button>
            <span style={{ color: 'var(--text-faint)' }}>/</span>
            <span
              onClick={onOpenOutlineModal}
              className="font-semibold truncate max-w-[120px] sm:max-w-[180px] cursor-pointer hover:underline"
              style={{ color: 'var(--text-main)' }}
              title={activeChapter?.title}
            >
              第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title || '未命名'}
            </span>
            {activeChapter?.status && (
              <span
                className="text-[10px] px-1.5 py-0.2 rounded font-medium hidden md:inline"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-muted)',
                }}
              >
                {activeChapter.status === 'PUBLISHED'
                  ? '已发布'
                  : activeChapter.status === 'REVIEWED'
                  ? '已精修'
                  : activeChapter.status === 'DRAFTED'
                  ? '草稿'
                  : '构思中'}
              </span>
            )}
          </div>

          {/* 分镜节拍幕选 (Scene Act Pills) */}
          <div
            className="hidden sm:flex items-center gap-1 overflow-x-auto pl-2 border-l"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {activeChapter?.scenes?.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSceneIndex(s.sceneIndex)}
                title={`第 ${s.sceneIndex} 幕${s.sceneGoal ? ` · 目标：${s.sceneGoal}` : ''} (${s.draftContent?.length || 0}字)`}
                className={`px-2 py-0.5 rounded-md text-xs font-medium transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  s.sceneIndex === activeSceneIndex
                    ? 'shadow-xs font-semibold'
                    : 'hover:opacity-80'
                }`}
                style={
                  s.sceneIndex === activeSceneIndex
                    ? {
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--accent-primary)',
                        border: '1px solid var(--accent-primary)',
                      }
                    : {
                        backgroundColor: 'transparent',
                        color: 'var(--text-muted)',
                        border: '1px solid transparent',
                      }
                }
              >
                <span>第 {s.sceneIndex} 幕</span>
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    s.draftContent ? 'bg-emerald-500' : 'opacity-25 bg-current'
                  }`}
                />
              </button>
            ))}

            <button
              onClick={handleAddScene}
              className="p-1 rounded-md border border-dashed hover:opacity-80 transition shrink-0 cursor-pointer"
              style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
              title="新增本章分镜幕"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 中间：本幕戏剧目标胶囊 (Scene Goal Pill) */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs max-w-xs truncate"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          title={`当前幕戏剧目标: ${activeScene?.sceneGoal || '承接上文推进情节'}`}
        >
          <span className="font-semibold shrink-0" style={{ color: 'var(--accent-primary)' }}>
            🎯 目标:
          </span>
          <span className="truncate font-literary-sans" style={{ color: 'var(--text-muted)' }}>
            {activeScene?.sceneGoal || '承接上文推进情节'}
          </span>
        </div>

        {/* 右侧：模式切换 + AI文学工具集 + 审阅与保存 */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 text-xs">
          {/* 模式双联切换器：正文 vs 幕布 */}
          {onSwitchToCanvas && (
            <div
              className="hidden md:flex items-center p-0.5 rounded-lg border shrink-0"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <button
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-xs text-white"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Feather className="w-3 h-3" />
                <span>正文</span>
              </button>
              <button
                onClick={onSwitchToCanvas}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer hover:opacity-80"
                style={{ color: 'var(--text-muted)' }}
                title="切换至剧情推演幕布"
              >
                <GitFork className="w-3 h-3 text-amber-400" />
                <span>幕布</span>
              </button>
            </div>
          )}

          {/* AI 文学创作群组 */}
          <div className="flex items-center gap-1">
            <button
              onClick={runDrafterWriteScene}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent-primary)',
              }}
              title="根据当前幕目标与角色状态机智能起草正文"
            >
              <span>✍️ 起草</span>
            </button>

            <button
              onClick={() => runStylistPolish()}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="根据名家文风准则打磨工笔与动作细节"
            >
              <span>🎨 润色</span>
            </button>

            {/* 文学诊所下拉组合菜单 (Clinic Tools Dropdown) */}
            <div className="relative" ref={clinicMenuRef}>
              <button
                onClick={() => setIsClinicMenuOpen(!isClinicMenuOpen)}
                className="px-2.5 py-1 rounded-lg border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                title="战力自愈、对白潜台词、打斗分镜与技法库"
              >
                <span>🛠️ 诊所</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>

              {isClinicMenuOpen && (
                <div
                  className="absolute right-0 top-9 w-48 p-1.5 rounded-xl border shadow-xl z-50 space-y-1 font-literary-sans text-xs animate-in fade-in duration-100 backdrop-blur-xl"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-strong)',
                    boxShadow: 'var(--shadow-warm)',
                  }}
                >
                  <button
                    onClick={() => {
                      setIsConsistencyGuardOpen(true);
                      setIsClinicMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                    <span>战力自愈 (防吃设定)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDialogueDoctorOpen(true);
                      setIsClinicMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                    <span>对白诊所 (潜台词)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsActionDirectorOpen(true);
                      setIsClinicMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5 text-rose-400" />
                    <span>打斗分镜 (动作导演)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsTechniqueModalOpen(true);
                      setIsClinicMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>名家润色技法库</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 阅读与专注工具 */}
          <div className="flex items-center gap-1 border-l pl-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              onClick={() => setShowFullChapterModal(true)}
              className="p-1.5 rounded-lg border hover:opacity-85 transition cursor-pointer text-xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="连续通读本章所有幕的完整正文"
            >
              <BookOpen className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsZenFocusOpen(true)}
              className="p-1.5 rounded-lg border hover:opacity-85 transition cursor-pointer text-xs text-amber-500"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
              }}
              title="作家禅定专注模式"
            >
              <Sparkles className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg border hover:opacity-80 transition cursor-pointer text-xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title={isFullscreen ? '退出全屏' : '全屏写作'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* 统计与原子保存 */}
          <div className="flex items-center gap-1.5 border-l pl-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
            <span
              className="hidden lg:flex items-center gap-1 font-mono text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <span>{wordCount} 字</span>
            </span>

            {saveToast && (
              <span className="text-[11px] text-emerald-500 flex items-center gap-0.5 animate-in fade-in">
                <CheckCircle className="w-3 h-3" />
              </span>
            )}

            <button
              onClick={handleManualSave}
              className="px-2.5 py-1 text-xs text-white rounded-lg flex items-center gap-1 font-medium transition hover:opacity-90 shadow-xs cursor-pointer"
              style={{ backgroundColor: 'var(--accent-primary)' }}
              title="Ctrl+S 快速落盘"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">保存</span>
            </button>
          </div>
        </div>
      </div>

      {/* 可平滑滚动正文工作区 */}
      <div className="flex-1 overflow-y-auto p-2 sm:p-5 md:p-8">
        <div
          className={`mx-auto w-full flex-1 flex flex-col space-y-4 transition-all duration-200 ${
            pageWidth === 'standard'
              ? 'max-w-4xl'
              : pageWidth === 'wide'
              ? 'max-w-6xl'
              : 'max-w-full px-1 sm:px-4'
          }`}
        >
          {/* 差异审阅区：支持句段级微观比对与打勾合入 */}
          {pendingDraft && (
            <div>
              <div className="flex justify-end gap-2 mb-1 text-xs">
                <button
                  onClick={() => setUseGranularDiff(!useGranularDiff)}
                  className="text-xs hover:underline flex items-center gap-1"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  <GitFork className="w-3 h-3" />
                  <span>{useGranularDiff ? '切换为全局整体 Diff' : '切换为句段级逐句采纳模式'}</span>
                </button>
              </div>

              {useGranularDiff ? (
                <GranularDiffMerger
                  originalText={editorContent}
                  proposedText={pendingDraft}
                  agentName={
                    currentAgent === 'DRAFTER'
                      ? '执笔起草 Agent'
                      : currentAgent === 'STYLIST'
                      ? '文风润色 Agent'
                      : '创作 Agent'
                  }
                  onAcceptMerged={(mergedResult) => {
                    acceptPendingDraft(pendingPolishResult?.techniques);
                    setEditorContent(mergedResult);
                    if (activeChapter && activeScene) {
                      updateScene(activeChapter.id, activeScene.sceneIndex, {
                        draftContent: mergedResult,
                      });
                    }
                  }}
                  onDismiss={dismissPendingDraft}
                />
              ) : (
                <DiffViewer
                  originalText={editorContent}
                  newDraft={pendingDraft}
                  agentName={
                    currentAgent === 'DRAFTER'
                      ? '执笔起草 Agent'
                      : currentAgent === 'STYLIST'
                      ? '文风润色 Agent'
                      : '创作 Agent'
                  }
                  techniques={pendingPolishResult?.techniques}
                  summary={pendingPolishResult?.summary}
                  onAccept={(selectedTechniques) => acceptPendingDraft(selectedTechniques)}
                  onDismiss={dismissPendingDraft}
                  onPolishAgain={() => runStylistPolish()}
                />
              )}
            </div>
          )}

          {/* 巨匠文稿正本纸张 (Master Manuscript Paper Sheet) */}
          <div
            className="w-full flex-1 flex flex-col rounded-2xl sm:rounded-3xl border shadow-xl transition-all duration-200"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              boxShadow: 'var(--shadow-warm)',
              minHeight: 'calc(100vh - 160px)',
            }}
          >
            {/* 1. 文稿卷首徽章与页面宽度切换器 (Manuscript Sheet Masthead) */}
            <div
              className="px-6 sm:px-10 pt-7 pb-4 border-b select-none flex flex-wrap items-center justify-between gap-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* 卷章血脉路径 */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span
                  className="px-2 py-0.5 rounded font-mono font-bold"
                  style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent-primary)' }}
                >
                  {novel.title}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>•</span>
                <span className="font-literary-sans" style={{ color: 'var(--text-muted)' }}>
                  第 {currentVolume?.volumeIndex || 1} 卷 · {currentVolume?.title || '正传'}
                </span>
                <span style={{ color: 'var(--text-faint)' }}>•</span>
                <span className="font-semibold" style={{ color: 'var(--text-main)' }}>
                  第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title || '未命名'}
                </span>
                {activeChapter?.status && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded font-medium"
                    style={{ backgroundColor: 'var(--accent-surface)', color: 'var(--accent-primary)' }}
                  >
                    {activeChapter.status === 'PUBLISHED'
                      ? '已发布'
                      : activeChapter.status === 'REVIEWED'
                      ? '已精修'
                      : activeChapter.status === 'DRAFTED'
                      ? '草稿'
                      : '构思中'}
                  </span>
                )}
              </div>

              {/* 页面宽度与导演节拍开关 */}
              <div className="flex items-center gap-2 text-xs flex-wrap">
                {/* 页面宽度选择器 */}
                <div
                  className="flex items-center p-0.5 rounded-lg border"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  <button
                    onClick={() => handleSetPageWidth('standard')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      pageWidth === 'standard' ? 'shadow-xs text-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={pageWidth === 'standard' ? { backgroundColor: 'var(--accent-primary)' } : {}}
                    title="标准经典排版 (880px)"
                  >
                    标准页
                  </button>
                  <button
                    onClick={() => handleSetPageWidth('wide')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      pageWidth === 'wide' ? 'shadow-xs text-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={pageWidth === 'wide' ? { backgroundColor: 'var(--accent-primary)' } : {}}
                    title="宽屏大工坊排版 (1150px)"
                  >
                    宽屏页
                  </button>
                  <button
                    onClick={() => handleSetPageWidth('full')}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition cursor-pointer ${
                      pageWidth === 'full' ? 'shadow-xs text-white' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={pageWidth === 'full' ? { backgroundColor: 'var(--accent-primary)' } : {}}
                    title="全屏无界排版 (100%)"
                  >
                    全幅页
                  </button>
                </div>

                {/* 导演大纲看板折叠开关 */}
                <button
                  onClick={() => setIsDossierOpen(!isDossierOpen)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-medium transition cursor-pointer hover:opacity-85"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                    color: isDossierOpen ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                  title="折叠或展开本幕导演节拍机要看板"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{isDossierOpen ? '收起导演看板' : '展开导演看板'}</span>
                  {isDossierOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* 2. 章节巨标题与幕次主题 (Chapter Big Title & Dramatic Act Header) */}
            <div className="px-6 sm:px-12 pt-6 pb-2">
              <h1 className="text-2xl sm:text-3xl font-bold font-literary-serif tracking-wider" style={{ color: 'var(--text-main)' }}>
                第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title || '未命名章节'}
              </h1>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs font-literary-sans" style={{ color: 'var(--text-muted)' }}>
                <span
                  className="px-2 py-0.5 rounded-md font-semibold font-mono"
                  style={{ backgroundColor: 'var(--accent-surface)', color: 'var(--accent-primary)' }}
                >
                  第 {activeScene?.sceneIndex || 1} 幕
                </span>
                <span className="font-medium text-sm" style={{ color: 'var(--text-main)' }}>
                  {activeScene?.sceneGoal ? activeScene.sceneGoal.slice(0, 36) : '承接情节展开故事'}
                </span>
                <span className="opacity-40">•</span>
                <span>本幕 {wordCount} 字</span>
                <span className="opacity-40">•</span>
                <span>全章 {chapterTotalWords.toLocaleString()} 字</span>
                <span className="opacity-40">•</span>
                <span>约 {readingTimeMin} 分钟通读</span>
              </div>
            </div>

            {/* 3. 本幕导演机要卡 (Director Scene Dossier) */}
            {isDossierOpen && (
              <div className="px-6 sm:px-12 py-3">
                <div
                  className="rounded-2xl border p-4 sm:p-5 space-y-3 font-literary-sans text-xs transition animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-2 font-bold" style={{ color: 'var(--accent-primary)' }}>
                      <Target className="w-4 h-4" />
                      <span>本幕戏剧节拍机要 (Director Scene Dossier)</span>
                    </div>
                    {activeScene?.location && (
                      <div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                        <span>地点: {activeScene.location}</span>
                      </div>
                    )}
                  </div>

                  {/* 4 维戏剧坐标网格 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="font-semibold flex items-center gap-1.5 text-amber-500 mb-1">
                        <Target className="w-3.5 h-3.5" />
                        <span>戏剧目标 (Scene Goal)</span>
                      </div>
                      <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        {activeScene?.sceneGoal || '承接前文，交代当前困境与动机'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="font-semibold flex items-center gap-1.5 text-rose-500 mb-1">
                        <Swords className="w-3.5 h-3.5" />
                        <span>核心冲突 (Core Conflict)</span>
                      </div>
                      <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        {activeScene?.conflict || '面临未知的冲突与环境阻碍，两难抉择'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="font-semibold flex items-center gap-1.5 text-indigo-400 mb-1">
                        <Zap className="w-3.5 h-3.5" />
                        <span>转折点 (Turn Point)</span>
                      </div>
                      <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        {activeScene?.turnPoint || '突发变数打破攻守平衡，人物采取反制'}
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl border bg-black/5 dark:bg-white/5" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="font-semibold flex items-center gap-1.5 text-emerald-500 mb-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>阶段战果与后果 (Outcome)</span>
                      </div>
                      <p className="leading-relaxed" style={{ color: 'var(--text-main)' }}>
                        {activeScene?.outcome || '达成阶段战果，引动后续深层因果'}
                      </p>
                    </div>
                  </div>

                  {/* 登场角色与伏笔信息 */}
                  <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold shrink-0" style={{ color: 'var(--text-muted)' }}>
                        登场角色:
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {inSceneCharacters.length > 0 ? (
                          inSceneCharacters.map((c) => (
                            <span
                              key={c.id}
                              className="px-2 py-0.5 rounded-md border font-medium"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--accent-primary)',
                              }}
                            >
                              {c.name} ({c.roleType === 'PROTAGONIST' ? '主角' : c.roleType === 'ANTAGONIST' ? '敌对' : '配角'})
                            </span>
                          ))
                        ) : (
                          <span className="opacity-60">未指定具体人物</span>
                        )}
                      </div>
                    </div>

                    {relatedForeshadowings.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold shrink-0 text-amber-500">
                          涉及伏线:
                        </span>
                        {relatedForeshadowings.map((f) => (
                          <span
                            key={f.id}
                            className="px-2 py-0.5 rounded-md border font-medium text-amber-500"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                            }}
                          >
                            🎯 {f.title} ({f.status === 'RESOLVED' ? '已回收' : '埋设中'})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 4. 实时文学五感与智能工笔条 (In-Document Sensory HUD & Copilot Ribbon) */}
            <div className="px-6 sm:px-12 py-2">
              <div
                className="flex flex-wrap items-center justify-between px-3.5 py-2 rounded-xl border text-xs gap-3"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                {/* 实时五感分布 */}
                <div className="flex items-center gap-3 font-mono text-[11px] flex-wrap">
                  <span className="flex items-center gap-1" title="视觉描写占比">
                    <span>👁️ 视觉</span>
                    <span className="font-bold">{sensoryMetrics.visual}%</span>
                  </span>
                  <span className="flex items-center gap-1" title="动作节拍占比">
                    <span>🏃 动作</span>
                    <span className="font-bold">{sensoryMetrics.action}%</span>
                  </span>
                  <span className="flex items-center gap-1" title="潜台词与心理占比">
                    <span>💭 潜台词</span>
                    <span className="font-bold">{sensoryMetrics.subtext}%</span>
                  </span>
                  <span className="flex items-center gap-1" title="听觉与氛围占比">
                    <span>👂 氛围</span>
                    <span className="font-bold">{sensoryMetrics.sensory}%</span>
                  </span>
                  <span className="flex items-center gap-1 border-l pl-3" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-amber-500 font-bold">⚡ 张力指数: {sensoryMetrics.tension}/100</span>
                  </span>
                </div>

                {/* 快速工笔与微操工具栏 */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={handleUndo}
                    disabled={undoStack.length === 0}
                    className="p-1.5 rounded-md border text-xs flex items-center hover:opacity-85 transition cursor-pointer disabled:opacity-35"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title={`撤销修改 (剩余 ${undoStack.length} 步)`}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={redoStack.length === 0}
                    className="p-1.5 rounded-md border text-xs flex items-center hover:opacity-85 transition cursor-pointer disabled:opacity-35"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title={`重做修改 (剩余 ${redoStack.length} 步)`}
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={runDrafterWriteScene}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--accent-primary)',
                    }}
                    title="智能起草续写当前幕"
                  >
                    <span>✍️ 起草续写</span>
                  </button>
                  <button
                    onClick={() => runStylistPolish()}
                    disabled={isAgentRunning}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title="名家工笔润色"
                  >
                    <span>🎨 工笔润色</span>
                  </button>
                  <button
                    onClick={handlePurifyTypography}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title="一键全角标点净化、首行缩进与水词脱水 (F2)"
                  >
                    <span>🧹 排版脱水</span>
                  </button>
                  <button
                    onClick={handleInsertCliffhangerHook}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title="在章末自动生成并追加黄金断章悬念钩子 (F4)"
                  >
                    <span>🪝 断章钩子</span>
                  </button>
                  <button
                    onClick={handleInsertDivider}
                    className="px-2 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-muted)',
                    }}
                    title="插入古典场景切换分隔符"
                  >
                    <span>◇ 分幕符</span>
                  </button>
                  <button
                    onClick={handleToggleTtsSpeak}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                    style={{
                      backgroundColor: isSpeaking ? 'var(--accent-surface)' : 'var(--bg-surface)',
                      borderColor: isSpeaking ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: isSpeaking ? 'var(--accent-primary)' : 'var(--text-main)',
                    }}
                    title="开启/停止 TTS 沉浸听书语音校对 (F7)"
                  >
                    {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                    <span>{isSpeaking ? '停止朗读' : '听书校对'}</span>
                  </button>
                  <button
                    onClick={() => setIsActionDirectorOpen(true)}
                    className="px-2.5 py-1 rounded-md border text-xs font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title="电影级打斗分镜与动作导演"
                  >
                    <Swords className="w-3.5 h-3.5 text-rose-400" />
                    <span>打斗导演</span>
                  </button>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('AI_COUNCIL')}
                      className="px-2.5 py-1 rounded-md border text-xs font-bold flex items-center gap-1 hover:opacity-90 transition cursor-pointer"
                      style={{
                        backgroundColor: 'var(--accent-surface)',
                        borderColor: 'var(--accent-primary)',
                        color: 'var(--accent-primary)',
                      }}
                      title="将当前正文送入【多AI跨提供商圆桌辩论与连线拓扑工坊】博弈出终极正本"
                    >
                      <Network className="w-3.5 h-3.5" />
                      <span>送入多AI圆桌</span>
                    </button>
                  )}
                </div>
              </div>

              {/* 交互操作反馈横幅 */}
              {actionToast && (
                <div
                  className="mt-2 px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center justify-between animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'var(--accent-surface)',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <span>{actionToast}</span>
                  <button onClick={() => setActionToast(null)} className="text-[10px] opacity-75 hover:opacity-100">
                    ✕
                  </button>
                </div>
              )}

              {/* 划词悬浮 AI 魔法工具条 (Contextual Selection Floating AI Magic Bar - UX02 / F1) */}
              {selectedSnippet && (
                <div
                  className="mt-2 px-3.5 py-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs shadow-md animate-in fade-in duration-150"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--accent-primary)',
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="px-2 py-0.5 rounded font-mono text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: 'var(--accent-surface)', color: 'var(--accent-primary)' }}
                    >
                      已划选 {selectedSnippet.length} 字
                    </span>
                    <span className="truncate max-w-xs opacity-75 font-literary-serif">
                      “{selectedSnippet}”
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleSelectionTransform('EXPAND')}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer hover:opacity-85"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      ✨ 五感扩写
                    </button>
                    <button
                      onClick={() => handleSelectionTransform('CONDENSE')}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer hover:opacity-85"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-main)',
                      }}
                    >
                      ✂️ 凝练脱水
                    </button>
                    <button
                      onClick={() => handleSelectionTransform('CLASSICAL')}
                      className="px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer hover:opacity-85"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-main)',
                      }}
                    >
                      🏮 古风武侠化
                    </button>
                    {onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab('AI_COUNCIL')}
                        className="px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer hover:opacity-85"
                        style={{
                          backgroundColor: 'var(--accent-surface)',
                          borderColor: 'var(--accent-primary)',
                          color: 'var(--accent-primary)',
                        }}
                      >
                        🏛️ 多AI圆桌会审此段
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSnippet('');
                        setSelectionRange(null);
                      }}
                      className="px-1.5 py-1 rounded text-[11px] opacity-60 hover:opacity-100 cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 5. 巨匠正文正本输入流 (Core Manuscript Writing Flow) */}
            <div className="px-6 sm:px-12 py-4 flex-1 flex flex-col">
              <textarea
                value={editorContent}
                onChange={(e) => {
                  pushUndoSnapshot(editorContent);
                  setEditorContent(e.target.value);
                }}
                onSelect={(e) => {
                  const target = e.currentTarget;
                  const start = target.selectionStart || 0;
                  const end = target.selectionEnd || 0;
                  if (end > start && end - start >= 2) {
                    setSelectedSnippet(target.value.slice(start, end));
                    setSelectionRange({ start, end });
                  } else {
                    setSelectedSnippet('');
                    setSelectionRange(null);
                  }
                  const textUpToCursor = target.value.slice(0, start);
                  const lines = textUpToCursor.split('\n');
                  setCursorPos({
                    line: lines.length,
                    col: lines[lines.length - 1].length + 1,
                  });
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                    e.preventDefault();
                    handleManualSave();
                  } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
                    if (undoStack.length > 0) {
                      e.preventDefault();
                      handleUndo();
                    }
                  }
                }}
                placeholder="此地为正文字正本，落子生花。可直接动笔，亦可划选任意句子触发【五感扩写/古风化/多AI圆桌会审】..."
                className="w-full flex-1 min-h-[560px] sm:min-h-[700px] bg-transparent border-none outline-none resize-none font-literary-serif selection:bg-amber-500/25 leading-relaxed placeholder:opacity-30"
                style={{
                  fontSize: `${themeSettings.fontSize}px`,
                  lineHeight: themeSettings.lineHeight,
                  textIndent: themeSettings.paragraphIndent ? '2em' : '0',
                  color: 'var(--text-main)',
                }}
              />
            </div>

            {/* 6. 文稿底部幕次流转与原子落盘 (Bottom Act Carousel & Persistent Actions) */}
            <div
              className="px-6 sm:px-12 py-4 border-t select-none flex flex-wrap items-center justify-between gap-3 mt-auto"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {/* 幕次流转导航 */}
              <div className="flex items-center gap-2 flex-wrap">
                {hasPrevScene && prevScene && (
                  <button
                    onClick={() => setActiveSceneIndex(prevScene.sceneIndex)}
                    className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition cursor-pointer hover:opacity-85"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    title={`跳转至上一幕: 第 ${prevScene.sceneIndex} 幕`}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>上一幕 (第 {prevScene.sceneIndex} 幕)</span>
                  </button>
                )}

                <span
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold"
                  style={{
                    backgroundColor: 'var(--accent-surface)',
                    borderColor: 'var(--accent-primary)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  当前：第 {activeSceneIndex} 幕 ({wordCount} 字)
                </span>

                {hasNextScene && nextScene && (
                  <button
                    onClick={() => setActiveSceneIndex(nextScene.sceneIndex)}
                    className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition cursor-pointer hover:opacity-85"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    title={`跳转至下一幕: 第 ${nextScene.sceneIndex} 幕`}
                  >
                    <span>下一幕 (第 {nextScene.sceneIndex} 幕)</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}

                <button
                  onClick={handleAddScene}
                  className="px-2.5 py-1.5 rounded-xl border border-dashed text-xs font-medium flex items-center gap-1 transition cursor-pointer hover:opacity-85"
                  style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
                  title="新增下一分镜幕"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>新增分镜幕</span>
                </button>
              </div>

              {/* 底部动作保存与专注 */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => setShowFullChapterModal(true)}
                  className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition cursor-pointer hover:opacity-85"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>连续通读全章</span>
                </button>

                <button
                  onClick={() => setIsZenFocusOpen(true)}
                  className="px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-medium transition cursor-pointer hover:opacity-85 text-amber-500"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>禅定专注</span>
                </button>

                <button
                  onClick={handleManualSave}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer shadow-md hover:opacity-90"
                  style={{ backgroundColor: 'var(--accent-primary)' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>立即落盘 (Ctrl+S)</span>
                </button>
              </div>
            </div>

            {/* 7. 底部 IDE 级沉浸文稿状态栏 (Bottom Manuscript Status Bar - UX08 / F3) */}
            <div
              className="px-6 sm:px-12 py-2 border-t rounded-b-2xl sm:rounded-b-3xl flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono select-none"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span>
                  行 {cursorPos.line}, 列 {cursorPos.col}
                </span>
                <span>|</span>
                <span>
                  {selectedSnippet ? `已选 ${selectedSnippet.length} 字 / ` : ''}本幕 {wordCount} 字 · 全章 {chapterTotalWords} 字
                </span>
                <span>|</span>
                <span>预计阅读 ~{readingTimeMin} 分钟</span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1">
                  <span>字号:</span>
                  <button
                    onClick={() => setFontSize(Math.max(14, themeSettings.fontSize - 1))}
                    className="px-1.5 py-0.5 rounded border hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    title="减小正文字号"
                  >
                    A-
                  </button>
                  <span className="px-1 font-bold" style={{ color: 'var(--text-main)' }}>
                    {themeSettings.fontSize}px
                  </span>
                  <button
                    onClick={() => setFontSize(Math.min(26, themeSettings.fontSize + 1))}
                    className="px-1.5 py-0.5 rounded border hover:opacity-80 cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                    title="增大正文字号"
                  >
                    A+
                  </button>
                </div>
                <span>|</span>
                <span className="flex items-center gap-1 text-emerald-500 font-sans font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  WAL 双重防丢保护中
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📖 本章连贯通读预览弹窗 */}
      {showFullChapterModal && activeChapter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div
            className="rounded-2xl border max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
              color: 'var(--text-main)',
            }}
          >
            <div className="p-4 sm:p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold" style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent-primary)' }}>
                  第 {activeChapter.chapterIndex} 章
                </span>
                <h3 className="text-base sm:text-lg font-bold font-literary-serif mt-1">
                  {activeChapter.title}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyChapter}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copySuccess ? '已复制' : '复制全章'}</span>
                </button>
                <button onClick={() => setShowFullChapterModal(false)} className="p-1 hover:opacity-75">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-6">
              {activeChapter.scenes?.map((s) => (
                <div key={s.id} className="space-y-2 pb-6 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between text-xs font-literary-sans" style={{ color: 'var(--text-muted)' }}>
                    <span className="font-bold">第 {s.sceneIndex} 幕 · {s.sceneGoal}</span>
                    <span>{s.draftContent?.length || 0} 字</span>
                  </div>
                  <div
                    className="font-literary-serif leading-relaxed whitespace-pre-wrap"
                    style={{
                      fontSize: `${themeSettings.fontSize}px`,
                      lineHeight: themeSettings.lineHeight,
                      textIndent: themeSettings.paragraphIndent ? '2em' : '0',
                    }}
                  >
                    {s.draftContent || '（本幕暂无草稿）'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 战力防崩稽查与自愈弹窗 */}
      <ConsistencyGuardModal
        isOpen={isConsistencyGuardOpen}
        onClose={() => setIsConsistencyGuardOpen(false)}
        onApplyFix={handleApplyPatch}
      />

      {/* 对白潜台词诊所弹窗 */}
      <DialogueDoctorModal
        isOpen={isDialogueDoctorOpen}
        onClose={() => setIsDialogueDoctorOpen(false)}
        onInsertToEditor={handleInsertText}
      />

      {/* 打斗分镜编排弹窗 */}
      <ActionDirectorModal
        isOpen={isActionDirectorOpen}
        onClose={() => setIsActionDirectorOpen(false)}
        onInsertToEditor={handleInsertText}
      />

      {/* 作家禅定专注模式弹窗 */}
      <ZenFocusModal
        isOpen={isZenFocusOpen}
        onClose={() => setIsZenFocusOpen(false)}
      />

      {/* 文风技巧库模态框 */}
      <TechniqueRepositoryModal
        isOpen={isTechniqueModalOpen}
        onClose={() => setIsTechniqueModalOpen(false)}
        onTriggerPolishWithSelected={(techs) => runStylistPolish(techs)}
      />
    </main>
  );
};
