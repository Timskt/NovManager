// ==============================================================================
// 创作工作台中栏：人文文学工坊编辑器与 Diff 句段审阅 (Manuscript Atelier)
// 专为中文文学创作者深度定制，支持句段级微观比对、战力防崩自愈、对白潜台词与高燃打斗分镜
// ==============================================================================

import React, { useState, useEffect, useRef } from 'react';
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
  ShieldAlert,
  Swords,
  GitFork,
  Activity,
  Feather,
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

  const { settings: themeSettings } = useTheme();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [showFullChapterModal, setShowFullChapterModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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
      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-3 sm:space-y-4">

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

        {/* 主正文编写区域 (文人文墨排版，告别廉价代码框) */}
        <div
          className="flex-1 flex flex-col min-h-[460px] rounded-2xl p-6 border shadow-xs transition"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleManualSave();
              }
            }}
            placeholder="此地为正文字正本，落子生花。可直接动笔，亦可调用上方【执笔起草】或【打斗分镜】..."
            className="w-full flex-1 bg-transparent border-none outline-none resize-none font-literary-serif selection:bg-amber-500/25 leading-relaxed placeholder:opacity-30"
            style={{
              fontSize: `${themeSettings.fontSize}px`,
              lineHeight: themeSettings.lineHeight,
              textIndent: themeSettings.paragraphIndent ? '2em' : '0',
              color: 'var(--text-main)',
            }}
          />
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
