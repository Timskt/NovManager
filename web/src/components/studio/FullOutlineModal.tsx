// ==============================================================================
// 全景大纲与分镜架构总览模态框 (Full Panoramic Outline Modal)
// 允许创作者在工作台内以宏观全局视角查看与管理全部卷、章、分镜节拍、概要与防早现约束
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Chapter, Volume } from '../../types/novel';
import { ai } from '../../lib/aiService';
import {
  Compass,
  FolderPlus,
  FilePlus,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Target,
  User,
  BookOpen,
  Edit,
  Trash2,
  Wand2,
  ShieldAlert,
  Sparkles,
  Loader2,
  GitFork,
  X,
  Check,
} from 'lucide-react';

interface FullOutlineModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJumpToStudio?: (chapterId: string, sceneIndex?: number) => void;
  onJumpToCanvas?: (chapterId?: string) => void;
}

export const FullOutlineModal: React.FC<FullOutlineModalProps> = ({
  isOpen,
  onClose,
  onJumpToStudio,
  onJumpToCanvas,
}) => {
  const {
    novel,
    volumes,
    characters,
    addVolume,
    updateVolume,
    deleteVolume,
    addChapter,
    updateChapter,
    deleteChapter,
    generateScenesForChapter,
    setActiveChapterId,
    setActiveSceneIndex,
  } = useNovel();

  const [expandedVolumes, setExpandedVolumes] = useState<Record<string, boolean>>({});

  // 新建分卷状态
  const [showAddVolumeModal, setShowAddVolumeModal] = useState(false);
  const [volTitle, setVolTitle] = useState('');
  const [volConflict, setVolConflict] = useState('');
  const [volClimax, setVolClimax] = useState('');
  const [volSummary, setVolSummary] = useState('');
  const [volBoundary, setVolBoundary] = useState('');

  // 编辑分卷状态
  const [editingVolume, setEditingVolume] = useState<Volume | null>(null);
  const [editVolTitle, setEditVolTitle] = useState('');
  const [editVolConflict, setEditVolConflict] = useState('');
  const [editVolClimax, setEditVolClimax] = useState('');
  const [editVolSummary, setEditVolSummary] = useState('');
  const [editVolBoundary, setEditVolBoundary] = useState('');

  // 新增章节状态
  const [showAddChapterModal, setShowAddChapterModal] = useState<string | null>(null);
  const [chapTitle, setChapTitle] = useState('');
  const [chapOutline, setChapOutline] = useState('');
  const [chapPov, setChapPov] = useState(characters[0]?.id || '');
  const [addTitleCandidates, setAddTitleCandidates] = useState<string[]>([]);
  const [isGeneratingAddTitles, setIsGeneratingAddTitles] = useState(false);

  // 编辑章节状态
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editChapTitle, setEditChapTitle] = useState('');
  const [editChapOutline, setEditChapOutline] = useState('');
  const [editChapPov, setEditChapPov] = useState('');
  const [editTitleCandidates, setEditTitleCandidates] = useState<string[]>([]);
  const [isGeneratingEditTitles, setIsGeneratingEditTitles] = useState(false);

  // AI 拆解分镜加载状态
  const [generatingScenesForChapId, setGeneratingScenesForChapId] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleVolume = (volId: string) => {
    setExpandedVolumes((prev) => ({
      ...prev,
      [volId]: prev[volId] === undefined ? false : !prev[volId],
    }));
  };

  const isVolExpanded = (volId: string) => expandedVolumes[volId] !== false;

  const cleanCandidateTitle = (raw: string) => {
    return raw.replace(/^第\s*\d+\s*章\s*[:：]?\s*/, '').trim();
  };

  const handleGenerateTitlesForAdd = async (volumeId: string) => {
    setIsGeneratingAddTitles(true);
    try {
      const vol = volumes.find((v) => v.id === volumeId);
      const nextIndex = (vol?.chapters.length || 0) + 1;
      const titles = await ai.suggestChapterTitles({
        novelTitle: novel?.title || '太虚纪元',
        genre: novel?.genre || '仙侠修真',
        volumeTitle: vol?.title,
        volumeConflict: vol?.mainConflict,
        volumeSummary: vol?.summary,
        volumeBoundary: vol?.boundaryConstraints,
        chapterOutline: chapOutline,
        chapterIndex: nextIndex,
        currentTitle: chapTitle,
      });
      setAddTitleCandidates(titles);
    } catch (err) {
      console.error('生成候选标题失败:', err);
    } finally {
      setIsGeneratingAddTitles(false);
    }
  };

  const handleGenerateTitlesForEdit = async () => {
    if (!editingChapter) return;
    setIsGeneratingEditTitles(true);
    try {
      const vol = volumes.find((v) => v.id === editingChapter.volumeId);
      const titles = await ai.suggestChapterTitles({
        novelTitle: novel?.title || '太虚纪元',
        genre: novel?.genre || '仙侠修真',
        volumeTitle: vol?.title,
        volumeConflict: vol?.mainConflict,
        volumeSummary: vol?.summary,
        volumeBoundary: vol?.boundaryConstraints,
        chapterOutline: editChapOutline,
        chapterIndex: editingChapter.chapterIndex,
        currentTitle: editChapTitle,
      });
      setEditTitleCandidates(titles);
    } catch (err) {
      console.error('生成候选标题失败:', err);
    } finally {
      setIsGeneratingEditTitles(false);
    }
  };

  const handleCreateVolume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volTitle.trim()) return;
    addVolume(volTitle.trim(), volConflict.trim(), volClimax.trim(), volSummary.trim(), volBoundary.trim());
    setShowAddVolumeModal(false);
    setVolTitle('');
    setVolConflict('');
    setVolClimax('');
    setVolSummary('');
    setVolBoundary('');
  };

  const handleUpdateVolume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolume || !editVolTitle.trim()) return;
    updateVolume(editingVolume.id, {
      title: editVolTitle.trim(),
      mainConflict: editVolConflict.trim(),
      targetClimax: editVolClimax.trim(),
      summary: editVolSummary.trim(),
      boundaryConstraints: editVolBoundary.trim(),
    });
    setEditingVolume(null);
  };

  const handleCreateChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAddChapterModal || !chapTitle.trim()) return;
    addChapter(showAddChapterModal, chapTitle.trim(), chapOutline.trim(), chapPov);
    setShowAddChapterModal(null);
    setChapTitle('');
    setChapOutline('');
    setAddTitleCandidates([]);
  };

  const handlePlanScenes = async (chapId: string) => {
    setGeneratingScenesForChapId(chapId);
    try {
      await generateScenesForChapter(chapId);
    } catch (err) {
      console.error('AI拆解分镜失败:', err);
    } finally {
      setGeneratingScenesForChapId(null);
    }
  };

  const totalChapters = volumes.reduce((acc, v) => acc + (v.chapters?.length || 0), 0);
  const totalWords = volumes.reduce(
    (acc, v) =>
      acc +
      (v.chapters || []).reduce(
        (cAcc, c) =>
          cAcc +
          (c.scenes || []).reduce((sAcc, s) => sAcc + (s.draftContent?.length || 0), 0),
        0
      ),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-slate-800 rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* 顶部标题栏 */}
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100 font-serif">
                  全景大纲与分镜架构总览
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800/60 font-mono">
                  {volumes.length} 卷 · {totalChapters} 章 · {totalWords.toLocaleString()} 字
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                分卷主线与阶段防早现约束 ➔ 章节目标与POV ➔ 分镜戏剧节拍对抗链
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowAddVolumeModal(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <FolderPlus className="w-4 h-4" />
              <span>新建分卷</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="关闭全景大纲"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 核心内容区 */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5">
          {volumes.map((vol) => {
            const isExpanded = isVolExpanded(vol.id);
            const volWords = (vol.chapters || []).reduce(
              (acc, c) =>
                acc +
                (c.scenes || []).reduce((sAcc, s) => sAcc + (s.draftContent?.length || 0), 0),
              0
            );

            return (
              <div
                key={vol.id}
                className="bg-slate-900/85 border border-slate-800 rounded-2xl overflow-hidden shadow-lg"
              >
                {/* 卷头部 */}
                <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div
                      onClick={() => toggleVolume(vol.id)}
                      className="flex items-center gap-3 cursor-pointer group select-none flex-1"
                    >
                      <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 group-hover:bg-slate-700 transition">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                            第 {vol.volumeIndex} 卷
                          </span>
                          <h3 className="text-base font-bold text-slate-100 font-serif">
                            {vol.title}
                          </h3>
                          <span className="text-[11px] text-slate-500">
                            ({vol.chapters.length} 章 · {volWords.toLocaleString()} 字)
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          <span className="text-slate-500">核心矛盾：</span>
                          {vol.mainConflict || '未明确定义'}
                          <span className="text-slate-600 mx-2">•</span>
                          <span className="text-slate-500">预期高潮：</span>
                          <span className="text-amber-300/80">{vol.targetClimax || '未明确定义'}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setEditingVolume(vol);
                          setEditVolTitle(vol.title);
                          setEditVolConflict(vol.mainConflict || '');
                          setEditVolClimax(vol.targetClimax || '');
                          setEditVolSummary(vol.summary || '');
                          setEditVolBoundary(vol.boundaryConstraints || '');
                        }}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs rounded-lg transition flex items-center gap-1 border border-slate-700/60 cursor-pointer"
                        title="编辑该卷的故事概要与出场边界约束"
                      >
                        <Edit className="w-3.5 h-3.5 text-indigo-400" />
                        <span>编卷纲与约束</span>
                      </button>

                      <button
                        onClick={() => {
                          setShowAddChapterModal(vol.id);
                          setChapTitle('');
                          setChapOutline('');
                          setAddTitleCandidates([]);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded-lg transition flex items-center gap-1 shadow-sm cursor-pointer"
                      >
                        <FilePlus className="w-3.5 h-3.5" />
                        <span>加新章</span>
                      </button>

                      {volumes.length > 1 && (
                        <button
                          onClick={() => {
                            if (
                              confirm(
                                `确定要删除第 ${vol.volumeIndex} 卷【${vol.title}】及其下所有章节吗？`
                              )
                            ) {
                              deleteVolume(vol.id);
                            }
                          }}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-800 rounded-lg transition cursor-pointer"
                          title="删除此卷"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 卷故事概要与防早现边界约束展示卡片 */}
                  {(vol.summary || vol.boundaryConstraints) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
                      {vol.summary && (
                        <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 text-slate-300 leading-relaxed flex items-start gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-semibold text-indigo-300 block">
                              本卷故事剧情概要：
                            </span>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              {vol.summary}
                            </p>
                          </div>
                        </div>
                      )}
                      {vol.boundaryConstraints && (
                        <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200/90 leading-relaxed flex items-start gap-2">
                          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="font-semibold text-amber-300 block">
                              出场边界与防早现约束（AI 强约束）：
                            </span>
                            <p className="text-amber-200/80 text-[11px] leading-relaxed whitespace-pre-line">
                              {vol.boundaryConstraints}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 卷包含的章节树 */}
                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {vol.chapters.length === 0 ? (
                      <div className="text-xs text-slate-500 italic py-4 text-center">
                        该卷尚无章节，点击右上角【加新章】创建
                      </div>
                    ) : (
                      vol.chapters.map((chap) => {
                        const povChar = characters.find((c) => c.id === chap.povCharacterId);
                        const chapWords = (chap.scenes || []).reduce(
                          (acc, s) => acc + (s.draftContent?.length || 0),
                          0
                        );

                        return (
                          <div
                            key={chap.id}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 space-y-3 hover:border-slate-700 transition"
                          >
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                              <div className="space-y-1 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-xs font-semibold text-slate-200 font-serif">
                                    第 {chap.chapterIndex} 章：{chap.title}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
                                    {chap.status} · {chapWords}字
                                  </span>
                                  {povChar && (
                                    <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {povChar.name} 视角
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                  {chap.outline}
                                </p>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                <button
                                  onClick={() => handlePlanScenes(chap.id)}
                                  disabled={generatingScenesForChapId === chap.id}
                                  className="px-2.5 py-1.5 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/50 text-indigo-300 text-xs rounded-lg transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                                  title="让分镜导演 Agent 自动基于大纲规划 3 幕递进对抗节拍"
                                >
                                  {generatingScenesForChapId === chap.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                  ) : (
                                    <Wand2 className="w-3 h-3 text-indigo-400" />
                                  )}
                                  <span>AI拆解分镜</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setEditingChapter(chap);
                                    setEditChapTitle(chap.title);
                                    setEditChapOutline(chap.outline);
                                    setEditChapPov(chap.povCharacterId || characters[0]?.id || '');
                                    setEditTitleCandidates([]);
                                    setIsGeneratingEditTitles(false);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                                  title="编辑章节大纲与标题"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={() => {
                                    if (confirm(`确定要删除章节【${chap.title}】吗？`)) {
                                      deleteChapter(chap.id);
                                    }
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                                  title="删除章节"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {onJumpToCanvas && (
                                  <button
                                    onClick={() => {
                                      setActiveChapterId(chap.id);
                                      onJumpToCanvas(chap.id);
                                      onClose();
                                    }}
                                    className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-slate-900 rounded-lg transition cursor-pointer"
                                    title="以此章为锚点推演幕布走向"
                                  >
                                    <GitFork className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => {
                                    setActiveChapterId(chap.id);
                                    setActiveSceneIndex(1);
                                    if (onJumpToStudio) {
                                      onJumpToStudio(chap.id, 1);
                                    }
                                    onClose();
                                  }}
                                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 text-xs rounded-lg transition flex items-center gap-1.5 cursor-pointer"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>进入撰写</span>
                                </button>
                              </div>
                            </div>

                            {/* 细粒度分镜场景节拍 */}
                            {chap.scenes && chap.scenes.length > 0 && (
                              <div className="pt-2 border-t border-slate-900 grid grid-cols-1 md:grid-cols-3 gap-2.5">
                                {chap.scenes.map((sc) => (
                                  <div
                                    key={sc.id}
                                    onClick={() => {
                                      setActiveChapterId(chap.id);
                                      setActiveSceneIndex(sc.sceneIndex);
                                      if (onJumpToStudio) {
                                        onJumpToStudio(chap.id, sc.sceneIndex);
                                      }
                                      onClose();
                                    }}
                                    className="bg-slate-900/60 hover:bg-slate-900 border border-slate-800/60 hover:border-indigo-500/50 rounded-lg p-2.5 cursor-pointer transition text-xs space-y-1 group"
                                  >
                                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                                      <span className="flex items-center gap-1 group-hover:text-indigo-300">
                                        <Target className="w-3 h-3 text-amber-400" />
                                        <span>第 {sc.sceneIndex} 幕</span>
                                      </span>
                                      {sc.draftContent ? (
                                        <span className="text-[9px] text-emerald-400 bg-emerald-950/60 px-1 rounded">
                                          已起草 ({sc.draftContent.length}字)
                                        </span>
                                      ) : (
                                        <span className="text-[9px] text-slate-500">待起草</span>
                                      )}
                                    </div>
                                    <p className="text-slate-400 text-[11px] line-clamp-2 leading-snug">
                                      {sc.sceneGoal || '未规划'}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 新建分卷弹窗 */}
      {showAddVolumeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form
            onSubmit={handleCreateVolume}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-400" />
              <span>创建新的小说分卷</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">分卷标题</label>
                <input
                  type="text"
                  required
                  placeholder="例如：第二卷：风起天元"
                  value={volTitle}
                  onChange={(e) => setVolTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  本卷故事剧情概要（整体叙事弧线）
                </label>
                <textarea
                  rows={3}
                  placeholder="概括本卷的故事起承转合，指引本卷全部章节的整体主线走向..."
                  value={volSummary}
                  onChange={(e) => setVolSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">本卷核心矛盾</label>
                  <textarea
                    rows={2}
                    placeholder="例如：林越隐匿身份进入万宝城..."
                    value={volConflict}
                    onChange={(e) => setVolConflict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">预期卷末大高潮</label>
                  <textarea
                    rows={2}
                    placeholder="例如：万宝拍卖会大乱，林越斩魔脱身..."
                    value={volClimax}
                    onChange={(e) => setVolClimax(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>出场边界与防早现约束（AI 强约束规则）</span>
                  </label>
                  <span className="text-[10px] text-slate-500">防人、物、事提早暴露</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="【人物登场禁忌】：严禁金丹后期以上大能本体降临；&#10;【宝物机缘禁忌】：严禁提前出土上古神器；&#10;【战力天花板】：全卷压制在筑基期至金丹初期；&#10;【剧情悬念暗线】：严禁提前揭晓当年灭族真凶。"
                  value={volBoundary}
                  onChange={(e) => setVolBoundary(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-900/50 rounded-lg p-2.5 text-amber-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddVolumeModal(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md cursor-pointer"
              >
                创建分卷
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 编辑分卷与边界约束弹窗 */}
      {editingVolume && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form
            onSubmit={handleUpdateVolume}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-indigo-400" />
                <span>编辑第 {editingVolume.volumeIndex} 卷故事纲要与防早现边界约束</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                设定本卷的核心矛盾、阶段高潮、故事梗概与人物/物品/事件出场边界，AI 拆解分镜与起草正文时将硬性遵守。
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">分卷标题</label>
                <input
                  type="text"
                  required
                  value={editVolTitle}
                  onChange={(e) => setEditVolTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  本卷故事剧情概要（整体叙事弧线）
                </label>
                <textarea
                  rows={3}
                  placeholder="概括本卷的故事起承转合，指引本卷全部章节的整体主线走向..."
                  value={editVolSummary}
                  onChange={(e) => setEditVolSummary(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">本卷核心矛盾</label>
                  <textarea
                    rows={2}
                    placeholder="例如：林越获取青铜残片后遭遇宗门暗流与魔宗追杀..."
                    value={editVolConflict}
                    onChange={(e) => setEditVolConflict(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">预期卷末大高潮</label>
                  <textarea
                    rows={2}
                    placeholder="例如：坠星崖绝地血战，破除死局，名动北域..."
                    value={editVolClimax}
                    onChange={(e) => setEditVolClimax(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>出场边界与防早现约束（核心负向规则）</span>
                  </label>
                  <span className="text-[10px] text-slate-500">AI 起草时的最高优先级负向提示词</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="【人物登场禁忌】：严禁金丹后期以上大能本体直接降临；魔宗宗主仅限侧面传闻；&#10;【宝物机缘禁忌】：本卷仅限第一枚青铜残片苏醒，禁止提前出土第二枚神器；&#10;【战力天花板】：战力严格压制在筑基期至金丹初期，禁止空间撕裂；&#10;【剧情悬念暗线】：严禁提前揭晓当年灭族真凶。"
                  value={editVolBoundary}
                  onChange={(e) => setEditVolBoundary(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-900/50 rounded-lg p-2.5 text-amber-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs leading-relaxed"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingVolume(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md cursor-pointer"
              >
                保存卷纲与约束
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 新建章节弹窗 */}
      {showAddChapterModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form
            onSubmit={handleCreateChapter}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FilePlus className="w-4 h-4 text-indigo-400" />
              <span>在该卷下新增章节</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">主视角人物 (POV)</label>
                <select
                  value={chapPov}
                  onChange={(e) => setChapPov(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roleType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">章节剧情梗概 / 核心对抗事件</label>
                <textarea
                  rows={3}
                  placeholder="简述本章将要发生的关键推进与冲突（输入后点击下方 AI 拟定，即可基于本段梗概生成贴合剧情的高质量备选标题）..."
                  value={chapOutline}
                  onChange={(e) => setChapOutline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">
                    章节标题（支持手动输入编辑，也可点击右侧按钮由 AI 拟定候选）
                  </label>
                  <button
                    type="button"
                    onClick={() => handleGenerateTitlesForAdd(showAddChapterModal)}
                    disabled={isGeneratingAddTitles}
                    className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingAddTitles ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>AI 拟定中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>✨ AI 拟定候选标题</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="例如：地脉迷踪 或 剑气惊寒"
                  value={chapTitle}
                  onChange={(e) => setChapTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />

                {/* 自动生成的候选标题选项 Chips */}
                {addTitleCandidates.length > 0 && (
                  <div className="mt-2.5 p-2.5 bg-slate-950/90 border border-indigo-900/50 rounded-xl space-y-1.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      点击备选标题一键采纳（采纳后仍可在上方自由手动编辑）：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {addTitleCandidates.map((cand, idx) => {
                        const clean = cleanCandidateTitle(cand);
                        const isSelected = chapTitle === clean || chapTitle === cand;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setChapTitle(clean)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition border cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-850 text-indigo-300 border-slate-800 hover:border-indigo-700'
                            }`}
                          >
                            {clean}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddChapterModal(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md cursor-pointer"
              >
                添加章节
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 编辑章节弹窗 */}
      {editingChapter && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!editChapTitle.trim()) return;
              updateChapter(editingChapter.id, {
                title: editChapTitle.trim(),
                outline: editChapOutline.trim(),
                povCharacterId: editChapPov,
              });
              setEditingChapter(null);
            }}
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-indigo-400" />
                <span>编辑第 {editingChapter.chapterIndex} 章大纲与标题</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">主视角人物 (POV)</label>
                <select
                  value={editChapPov}
                  onChange={(e) => setEditChapPov(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roleType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">章节剧情梗概 / 核心对抗事件</label>
                <textarea
                  rows={3}
                  placeholder="修改本章的大纲走向与关键对抗..."
                  value={editChapOutline}
                  onChange={(e) => setEditChapOutline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-medium">
                    章节标题（可手动微调，也可点右侧重新让 AI 拟定）
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTitlesForEdit}
                    disabled={isGeneratingEditTitles}
                    className="px-2.5 py-1 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-300 rounded-lg text-[11px] font-medium transition flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingEditTitles ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        <span>AI 拟定中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>✨ AI 拟定新标题</span>
                      </>
                    )}
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={editChapTitle}
                  onChange={(e) => setEditChapTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />

                {/* 候选标题 Chips */}
                {editTitleCandidates.length > 0 && (
                  <div className="mt-2.5 p-2.5 bg-slate-950/90 border border-indigo-900/50 rounded-xl space-y-1.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      点击备选标题一键采纳：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {editTitleCandidates.map((cand, idx) => {
                        const clean = cleanCandidateTitle(cand);
                        const isSelected = editChapTitle === clean || editChapTitle === cand;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setEditChapTitle(clean)}
                            className={`px-2.5 py-1 rounded-lg text-xs transition border cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                : 'bg-slate-900 hover:bg-slate-850 text-indigo-300 border-slate-800 hover:border-indigo-700'
                            }`}
                          >
                            {clean}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg shadow-md cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                <span>保存章节修改</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
