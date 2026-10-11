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

        {/* 顶部场景分栏与信息条 */}
        <div
          className="flex items-center justify-between border-b pb-3 gap-2"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          {/* 左侧：分镜标签栏 */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {activeChapter?.scenes?.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSceneIndex(s.sceneIndex)}
                title={`第 ${s.sceneIndex} 幕${s.sceneGoal ? ` · 目标：${s.sceneGoal}` : ''} (${s.draftContent?.length || 0}字)`}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 flex-shrink-0 font-literary-sans ${
                  s.sceneIndex === activeSceneIndex
                    ? 'border shadow-xs'
                    : 'hover:opacity-80'
                }`}
                style={
                  s.sceneIndex === activeSceneIndex
                    ? {
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--accent-primary)',
                        borderColor: 'var(--accent-primary)',
                      }
                    : { color: 'var(--text-muted)' }
                }
              >
                <span>第 {s.sceneIndex} 幕</span>
                {s.draftContent ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full opacity-30 bg-current" />
                )}
              </button>
            ))}

            <div className="flex items-center gap-1">
              <button
                onClick={handleAddScene}
                className="p-1.5 rounded-lg border border-dashed hover:opacity-80 transition flex-shrink-0"
                style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
                title="新增场景节拍"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowFullChapterModal(true)}
                className="ml-1 px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 flex-shrink-0 shadow-xs hover:opacity-85 font-literary-sans"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                title="连续通读本章所有幕的完整正文"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>整章通读</span>
              </button>

              {onSwitchToCanvas && (
                <button
                  onClick={onSwitchToCanvas}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 flex-shrink-0 shadow-xs hover:opacity-85 font-literary-sans"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  title="切换至剧情推演幕布"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>推演幕布</span>
                </button>
              )}
            </div>
          </div>

          {/* 右侧：字数、禅定专注与全屏 */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-literary-sans flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5" />
              <span className="font-mono">{wordCount}</span>
              <span>字</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>约 {readingTimeMin} 分钟</span>
            </span>

            {/* 禅定模式唤起 */}
            <button
              onClick={() => setIsZenFocusOpen(true)}
              className="px-2 py-1 rounded-lg border text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="进入作家禅定沉浸专注模式"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden md:inline">禅定专注</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 rounded-lg border hover:opacity-80 transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title={isFullscreen ? '退出全屏' : '全屏写作'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 章节标题与本幕概要提示 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold font-literary-serif">
              第 {activeChapter?.chapterIndex} 章：{activeChapter?.title}
              <span className="text-xs sm:text-sm font-normal ml-2 sm:ml-3" style={{ color: 'var(--accent-primary)' }}>
                [第 {activeSceneIndex} 幕]
              </span>
            </h2>

            {/* 快捷保存 */}
            <div className="flex items-center gap-2">
              {saveToast && (
                <span className="text-xs text-emerald-600 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">已原子落盘并存入快照</span>
                </span>
              )}
              <button
                onClick={handleManualSave}
                className="px-3 py-1.5 text-xs text-white rounded-lg flex items-center gap-1.5 font-bold transition hover:opacity-90"
                style={{ backgroundColor: 'var(--accent-primary)' }}
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存</span>
              </button>
            </div>
          </div>

          <p className="text-xs line-clamp-2 font-literary-sans" style={{ color: 'var(--text-muted)' }}>
            <span className="font-semibold">本幕目标：</span>
            {activeScene?.sceneGoal || '暂未定义场景目标'}
          </p>
        </div>

        {/* 深度专业文学创作工具条 (Artisan Literary Action Bar) */}
        <div
          className="flex flex-wrap items-center justify-between p-2.5 rounded-xl border text-xs gap-2"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="font-bold flex items-center gap-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
              <Wand2 className="w-3 h-3 text-amber-500" />
              <span>智能参谋：</span>
            </span>

            {/* 执笔起草 */}
            <button
              onClick={runDrafterWriteScene}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 hover:opacity-85 transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)', color: 'var(--accent-primary)' }}
              title="根据当前幕目标与角色状态机起草正文"
            >
              <span>✍️ 执笔起草</span>
            </button>

            {/* 文风润色 */}
            <button
              onClick={() => runStylistPolish()}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 hover:opacity-85 transition disabled:opacity-50"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
              title="根据名家文风准则打磨工笔与动作细节"
            >
              <span>🎨 文风润色</span>
            </button>

            {/* 战力与设定防崩盘稽查 */}
            <button
              onClick={() => setIsConsistencyGuardOpen(true)}
              className="px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 hover:opacity-85 transition text-amber-600 dark:text-amber-400"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
              title="检查战力崩坏与吃设定漏洞，支持一键自愈修复"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>战力自愈</span>
            </button>

            {/* 角色对白诊所 */}
            <button
              onClick={() => setIsDialogueDoctorOpen(true)}
              className="px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 hover:opacity-85 transition text-indigo-600 dark:text-indigo-400"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
              title="深度调优对白潜台词与角色身体动作"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>对白诊所</span>
            </button>

            {/* 高燃打斗动作分镜 */}
            <button
              onClick={() => setIsActionDirectorOpen(true)}
              className="px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 hover:opacity-85 transition text-rose-600 dark:text-rose-400"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-strong)' }}
              title="电影级高燃战斗与法宝搏杀动作分镜"
            >
              <Swords className="w-3.5 h-3.5" />
              <span>打斗分镜</span>
            </button>

            {/* 技法资产库 */}
            <button
              onClick={() => setIsTechniqueModalOpen(true)}
              className="px-2.5 py-1 rounded-md border flex items-center gap-1 hover:opacity-85 transition"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              title="文学润色技巧资产库"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>技巧库 ({savedPolishTechniques.length})</span>
            </button>
          </div>

          <span className="text-[11px] opacity-60 hidden md:inline font-literary-sans">
            按 Ctrl+S 快速落盘 · WAL 日志容灾实时就绪
          </span>
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
