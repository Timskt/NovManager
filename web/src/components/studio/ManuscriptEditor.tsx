// ==============================================================================
// 创作工作台中栏：人文文学工坊编辑器与 Diff 句段审阅 (Manuscript Atelier)
// 专为中文文学创作者深度定制，支持句段级微观比对、战力防崩自愈、对白潜台词与高燃打斗分镜
// ==============================================================================

import React, { useState, useEffect } from 'react';
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
  ShieldAlert,
  Swords,
  GitFork,
  Activity,
} from 'lucide-react';
import type { NavTab } from '../Header';

interface ManuscriptEditorProps {
  onOpenContext?: () => void;
  onOpenAgent?: () => void;
  onNavigateTab?: (tab: NavTab) => void;
  onSwitchToCanvas?: () => void;
}

export const ManuscriptEditor: React.FC<ManuscriptEditorProps> = ({
  onOpenContext,
  onOpenAgent,
  onNavigateTab,
  onSwitchToCanvas,
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
      className={`flex-1 flex flex-col overflow-y-auto transition-colors ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 sm:p-8' : 'p-3 sm:p-6'
      }`}
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-main)',
      }}
    >
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-3 sm:space-y-4">
        {/* 全屏写作模式顶栏 */}
        {isFullscreen && (
          <div
            className="flex items-center justify-between border-b pb-2.5 text-xs"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold font-literary-serif" style={{ color: 'var(--text-main)' }}>
                第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title || '未命名'}
              </span>
              {currentVolume && <span>({currentVolume.title})</span>}
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-2.5 py-1 text-xs rounded-lg border flex items-center gap-1.5 transition hover:opacity-80"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>退出全屏</span>
            </button>
          </div>
        )}

        {/* 顶部极简创作导航条 (Consolidated Studio Navigation Bar) */}
        <div
          className="flex flex-wrap items-center justify-between pb-2.5 border-b gap-2.5"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* 左侧：当前章节标题与幕选呼应 */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="text-[11px] px-2 py-0.5 rounded font-mono font-medium shrink-0"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                第 {activeChapter?.chapterIndex} 章
              </span>
              <h2
                className="text-sm sm:text-base font-bold font-literary-serif truncate max-w-[160px] sm:max-w-xs"
                title={activeChapter?.title}
              >
                {activeChapter?.title || '未命名章节'}
              </h2>
            </div>

            {/* 分镜节拍 Pills */}
            <div
              className="flex items-center gap-1 overflow-x-auto pl-2 border-l"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              {activeChapter?.scenes?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSceneIndex(s.sceneIndex)}
                  title={`第 ${s.sceneIndex} 幕${s.sceneGoal ? ` · 目标：${s.sceneGoal}` : ''} (${s.draftContent?.length || 0}字)`}
                  className={`px-2 py-1 rounded-md text-xs font-medium transition flex items-center gap-1.5 flex-shrink-0 ${
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
                className="p-1 rounded-md border border-dashed hover:opacity-80 transition flex-shrink-0"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
                title="新增本章分镜幕"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* 右侧：统计、视图切换与原子保存 */}
          <div className="flex items-center gap-2 sm:gap-2.5 text-xs flex-shrink-0">
            <span
              className="hidden sm:flex items-center gap-1 font-mono text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>{wordCount} 字</span>
              <span className="opacity-40">·</span>
              <span>约 {readingTimeMin} 分钟</span>
            </span>

            <button
              onClick={() => setShowFullChapterModal(true)}
              className="px-2 py-1 rounded-md border flex items-center gap-1 hover:opacity-85 transition text-xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="连续通读本章所有幕的完整正文"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden md:inline">整章通读</span>
            </button>

            {onSwitchToCanvas && (
              <button
                onClick={onSwitchToCanvas}
                className="px-2 py-1 rounded-md border flex items-center gap-1 hover:opacity-85 transition text-xs"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
                title="切换至推演幕布"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden md:inline">幕布</span>
              </button>
            )}

            <button
              onClick={() => setIsZenFocusOpen(true)}
              className="px-2 py-1 rounded-md border flex items-center gap-1 hover:opacity-85 transition text-xs"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="进入作家禅定沉浸专注模式"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">禅定</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-md border hover:opacity-80 transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title={isFullscreen ? '退出全屏' : '全屏写作'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>

            {/* 快捷保存按钮 */}
            <div className="flex items-center gap-1.5">
              {saveToast && (
                <span className="text-[11px] text-emerald-500 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle className="w-3 h-3" />
                  <span className="hidden lg:inline">已保存</span>
                </span>
              )}
              <button
                onClick={handleManualSave}
                className="px-3 py-1 text-xs text-white rounded-md flex items-center gap-1.5 font-medium transition hover:opacity-90 shadow-xs"
                style={{ backgroundColor: 'var(--accent-primary)' }}
                title="Ctrl+S 快速落盘"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存</span>
              </button>
            </div>
          </div>
        </div>

        {/* 场景目标与文风助手条 (Slim Goal & Literary Assistant Ribbon) */}
        <div
          className="flex flex-wrap items-center justify-between px-3 py-1.5 rounded-xl border text-xs gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          {/* 左侧：本幕戏剧目标 */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span
              className="text-[11px] font-semibold shrink-0"
              style={{ color: 'var(--text-faint)' }}
            >
              幕目标:
            </span>
            <span
              className="truncate text-xs font-literary-sans"
              style={{ color: 'var(--text-muted)' }}
              title={activeScene?.sceneGoal}
            >
              {activeScene?.sceneGoal || '承接上文推进情节'}
            </span>
          </div>

          {/* 右侧：精雅沉稳的创作工具集 */}
          <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
            <button
              onClick={runDrafterWriteScene}
              disabled={isAgentRunning}
              className="px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 hover:opacity-85 transition disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--accent-primary)',
              }}
              title="根据当前幕目标与角色状态机起草正文"
            >
              <span>✍️ 起草</span>
            </button>

            <button
              onClick={() => runStylistPolish()}
              disabled={isAgentRunning}
              className="px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 hover:opacity-85 transition disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="根据名家文风准则打磨工笔与动作细节"
            >
              <span>🎨 润色</span>
            </button>

            <button
              onClick={() => setIsConsistencyGuardOpen(true)}
              className="px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 hover:opacity-85 transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="检查战力崩坏与吃设定漏洞，支持一键自愈修复"
            >
              <ShieldAlert className="w-3 h-3 text-amber-500" />
              <span>战力自愈</span>
            </button>

            <button
              onClick={() => setIsDialogueDoctorOpen(true)}
              className="px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 hover:opacity-85 transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="深度调优对白潜台词与角色身体动作"
            >
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              <span>对白诊所</span>
            </button>

            <button
              onClick={() => setIsActionDirectorOpen(true)}
              className="px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 hover:opacity-85 transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
              title="电影级高燃战斗与法宝搏杀动作分镜"
            >
              <Swords className="w-3 h-3 text-rose-400" />
              <span>打斗分镜</span>
            </button>

            <button
              onClick={() => setIsTechniqueModalOpen(true)}
              className="px-2 py-0.5 rounded border text-[11px] font-medium flex items-center gap-1 hover:opacity-85 transition"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
              title="文学润色技巧资产库"
            >
              <BookOpen className="w-3 h-3 text-amber-500" />
              <span>技巧库 ({savedPolishTechniques.length})</span>
            </button>
          </div>
        </div>

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
