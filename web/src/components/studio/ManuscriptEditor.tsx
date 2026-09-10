// ==============================================================================
// 创作工作台中栏：正文沉浸式编辑器与 Diff 审阅 (Manuscript Editor)
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { DiffViewer } from './DiffViewer';
import { TechniqueRepositoryModal } from './TechniqueRepositoryModal';
import { FieldExplainer } from '../common/FieldExplainer';
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
  ListTree,
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
    runDirectorPlanScenes,
    runInspectorAudit,
    isAgentRunning,
  } = useNovel();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  const [showFullChapterModal, setShowFullChapterModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

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

  return (
    <main
      className={`flex-1 flex flex-col bg-slate-950 overflow-y-auto ${
        isFullscreen ? 'fixed inset-0 z-50 p-4 sm:p-8' : 'p-3 sm:p-6'
      }`}
    >
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col space-y-3 sm:space-y-4">
        {/* 全屏沉浸写作模式下的专属顶栏 */}
        {isFullscreen && (
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-slate-200 font-semibold">
                第 {activeChapter?.chapterIndex} 章 · {activeChapter?.title || '未命名'}
              </span>
              {currentVolume && (
                <span className="text-slate-500">({currentVolume.title})</span>
              )}
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg flex items-center gap-1.5 transition"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>退出沉浸</span>
            </button>
          </div>
        )}

        {/* 顶部场景分栏与信息条 */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 gap-2">
          {/* 左侧：分镜标签栏 */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {activeChapter?.scenes?.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSceneIndex(s.sceneIndex)}
                title={`第 ${s.sceneIndex} 幕${s.sceneGoal ? ` · 目标：${s.sceneGoal}` : ''} (${s.draftContent?.length || 0}字)`}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center gap-1.5 flex-shrink-0 ${
                  s.sceneIndex === activeSceneIndex
                    ? 'bg-slate-800 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                }`}
              >
                <span>第 {s.sceneIndex} 幕</span>
                {s.draftContent ? (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                )}
              </button>
            ))}

            <div className="flex items-center gap-1">
              <button
                onClick={handleAddScene}
                className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-900 rounded-lg border border-dashed border-slate-800 transition flex-shrink-0"
                title="新增场景节拍（无需繁琐填表，直接动笔开始撰写；可随时在左侧抽屉编辑目标与转折）"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <FieldExplainer
                title="为什么要分幕创作？"
                what="把一章长文划分为 2~3 个具体对抗节拍（铺垫 ➔ 冲突升级 ➔ 逆转与钩子）。"
                why="无需强制填表打断灵感，点击即可直接开写。若需精细化让 AI 执笔，随时在左侧抽屉细化目标即可。"
                example="第1幕铺垫 ➔ 第2幕遭遇死敌 ➔ 第3幕绝境反杀并留下下一章悬念"
                position="bottom"
              />
              <button
                onClick={() => setShowFullChapterModal(true)}
                className="ml-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                title="连续通读本章所有幕的完整正文"
              >
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>整章通读</span>
              </button>
              {onSwitchToCanvas && (
                <button
                  onClick={onSwitchToCanvas}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-800/60 hover:border-indigo-600 transition flex items-center gap-1.5 flex-shrink-0 shadow-sm"
                  title="切换至本章剧情推演幕布，以实体矩形预览并推演下一幕走向"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>推演幕布</span>
                </button>
              )}
            </div>
          </div>

          {/* 右侧：字数与全屏 */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 flex-shrink-0">
            <span className="flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>{wordCount} 字</span>
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>约 {readingTimeMin} 分钟</span>
            </span>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
              title={isFullscreen ? '退出沉浸' : '沉浸全屏'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-3.5 h-3.5" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* 移动端专属面板唤起快捷栏 */}
        <div className="flex md:hidden items-center justify-between gap-2">
          <button
            onClick={onOpenContext}
            className="flex-1 py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
          >
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>📋 场景大纲 & 角色</span>
          </button>
          <button
            onClick={onOpenAgent}
            className="flex-1 py-2 px-3 rounded-xl bg-indigo-950/60 border border-indigo-700/50 hover:border-indigo-600 text-indigo-200 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>🤖 Agent 协同舱</span>
          </button>
        </div>

        {/* 章节标题与本幕概要提示 */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-bold text-slate-100 font-serif">
              第 {activeChapter?.chapterIndex} 章：{activeChapter?.title}
              <span className="text-xs sm:text-sm font-normal text-indigo-400 ml-2 sm:ml-3">
                [第 {activeSceneIndex} 幕]
              </span>
            </h2>

            {/* 快捷保存提示 */}
            <div className="flex items-center gap-2">
              {saveToast && (
                <span className="text-xs text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">已保存至草稿库</span>
                </span>
              )}
              <button
                onClick={handleManualSave}
                className="px-2.5 sm:px-3 py-1.5 text-xs text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-lg transition flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>保存</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-400 line-clamp-2">
            <span className="text-slate-500">本幕目标：</span>
            {activeScene?.sceneGoal || '暂未定义场景目标'}
          </p>
        </div>

        {/* 快捷 AI 指令工具条 (Action Bar) */}
        <div className="flex flex-wrap items-center justify-between bg-slate-900/60 border border-slate-800/80 px-3 py-2 rounded-xl text-xs gap-2">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <Wand2 className="w-3 h-3 text-indigo-400" />
              <span>快速协同：</span>
              <FieldExplainer
                title="AI 专家协同流水线"
                what="四大专业 Agent 各司其职（研讨参谋 ➔ 执笔起草 ➔ 设定稽查 ➔ 文风润色）。"
                why="分步流水线替代笼统指令，让正文既有扎实的设定硬约束，又杜绝AI机械腔与套话。"
                position="bottom"
              />
            </span>

            <button
              onClick={() => {
                setActiveDockTab('chat');
                onOpenAgent?.();
              }}
              className="px-2.5 py-1 rounded-md bg-indigo-600/30 border border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/40 transition flex items-center gap-1 font-medium"
              title="打开右侧研讨舱：随时与AI探讨剧情推演、反转构思与人物对话，支持一键填入草稿"
            >
              <MessageSquare className="w-3 h-3 text-indigo-400" />
              <span>💬 灵感研讨</span>
            </button>

            <button
              onClick={runDrafterWriteScene}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-md bg-indigo-600/20 border border-indigo-500/40 text-indigo-200 hover:bg-indigo-600/30 transition flex items-center gap-1"
              title="调用起草Agent：根据当前幕目标、登场人物状态机与世界观法则智能编写初稿，支持Diff对比审阅"
            >
              <span>✍️ 执笔起草</span>
            </button>

            <button
              onClick={runInspectorAudit}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
              title="调用稽查Agent：扫描当前正文是否存在战力撕裂空间、吃设定、战力超标或人物OOC矛盾"
            >
              <span>🔍 设定稽查</span>
            </button>

            <button
              onClick={() => runStylistPolish()}
              disabled={isAgentRunning}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 transition flex items-center gap-1"
              title="调用润色Agent：消除AI机械腔与口水话，根据文风准则增强动作细节与张力"
            >
              <span>🎨 文风润色</span>
            </button>

            {/* 文风技巧库入口 */}
            <button
              onClick={() => setIsTechniqueModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-700/50 text-indigo-300 transition flex items-center gap-1.5 shadow-sm"
              title="查看与管理润色沉淀的高光文学技法，支持勾选复用"
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-400" />
              <span>文风技巧库</span>
              <span className="px-1.5 py-0.2 rounded-full bg-indigo-900/90 text-[10px] font-mono text-indigo-200">
                {savedPolishTechniques.length}
              </span>
              {selectedTechniquesForReuse.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
                  {selectedTechniquesForReuse.length}项复用
                </span>
              )}
            </button>
          </div>

          <span className="text-[11px] text-slate-500 hidden md:inline">
            按 Ctrl+S 快速保存，生成结果支持差异对比后合入
          </span>
        </div>

        {/* 若有待确认的 Agent 候选，展示 Gerrit 风格 Diff 对比视窗 */}
        {pendingDraft && (
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

        {/* 主正文编写区域 */}
        <div className="flex-1 flex flex-col min-h-[420px] bg-slate-900/40 border border-slate-800/90 rounded-2xl p-6 shadow-inner focus-within:border-indigo-500/50 transition">
          <textarea
            value={editorContent}
            onChange={(e) => setEditorContent(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                handleManualSave();
              }
            }}
            placeholder="在此沉浸撰写小说正文，或点击上方【执笔起草】让 Agent 结合在场人物与世界观法则为您编写初稿..."
            className="w-full flex-1 bg-transparent text-slate-100 text-base font-serif leading-loose tracking-wide focus:outline-none resize-none placeholder-slate-600"
          />
        </div>
      </div>

      {/* 📖 本章连贯通读预览弹窗 */}
      {showFullChapterModal && activeChapter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* 头部 */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60 text-xs font-semibold">
                    第 {activeChapter.chapterIndex} 章
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-slate-100 font-serif">
                    {activeChapter.title}
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
                  <span>本章实写正文：<strong className="text-emerald-400 font-medium">{chapterTotalWords.toLocaleString()}</strong> 字</span>
                  <span>·</span>
                  <span>全书宏观进度：<strong className="text-indigo-300 font-medium">{novel.currentWordCount.toLocaleString()}</strong> 字</span>
                  <span>·</span>
                  <span>共 {activeChapter.scenes?.length || 0} 幕</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyChapter}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制全章</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowFullChapterModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* 核心说明横幅 */}
            <div className="px-5 py-2.5 bg-indigo-950/30 border-b border-indigo-900/30 text-[11px] text-indigo-300">
              💡 <strong>字数与架构说明</strong>：全书总字数统计（{novel.currentWordCount.toLocaleString()} 字）包含历史连载章节累计（如前 10 章历史前情）；写作台专为当前章节分镜打磨服务，下方为您汇总呈现本章所有幕的完整正文合集。
            </div>

            {/* 正文滚动区域 */}
            <div className="p-5 sm:p-8 overflow-y-auto flex-1 space-y-8 bg-slate-950/40">
              {activeChapter.scenes && activeChapter.scenes.length > 0 ? (
                activeChapter.scenes.map((s) => (
                  <div key={s.id} className="space-y-3 pb-8 border-b border-slate-800/80 last:border-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-800/40">
                        第 {s.sceneIndex} 幕{s.sceneGoal ? ` · ${s.sceneGoal}` : ''}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {s.draftContent?.length || 0} 字
                      </span>
                    </div>
                    {s.draftContent ? (
                      <div className="text-slate-200 leading-relaxed font-serif text-sm sm:text-base whitespace-pre-wrap pl-1">
                        {s.draftContent}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-900/50 border border-dashed border-slate-800 text-xs text-slate-500 italic text-center">
                        本幕暂未起草正文，可切换至本幕后在编辑器中撰写或让 AI 执笔
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 text-sm">
                  本章尚无分幕场景数据
                </div>
              )}
            </div>

            {/* 底部 */}
            <div className="p-3.5 border-t border-slate-800 flex justify-between items-center bg-slate-950/80">
              <span className="text-xs text-slate-500">
                可点击右上角复制全文，或返回分幕编辑器继续推演下一幕
              </span>
              <button
                onClick={() => setShowFullChapterModal(false)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition shadow-sm"
              >
                关闭预览
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文风技巧库与复用中心模态框 */}
      <TechniqueRepositoryModal
        isOpen={isTechniqueModalOpen}
        onClose={() => setIsTechniqueModalOpen(false)}
        onTriggerPolishWithSelected={(techs) => runStylistPolish(techs)}
      />
    </main>
  );
};
