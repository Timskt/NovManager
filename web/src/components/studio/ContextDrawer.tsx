// ==============================================================================
// 创作工作台左侧：大纲分镜架构与结构化上下文抽屉 (Context Drawer)
// 包含两大核心模式：
// 1. 【大纲目录树】(Tree View)：全书卷章分镜层级树，即时组织/跳转/新建章节
// 2. 【本幕节拍与状态】(Beats View)：单幕戏剧节拍卡、幕间因果链与在场角色状态机
// 并在左上角提供全局大纲分镜架构的永久直达入口
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import { Chapter, Volume } from '../../types/novel';
import { FieldExplainer } from '../common/FieldExplainer';
import { SceneEditModal } from './SceneEditModal';
import { FullOutlineModal } from './FullOutlineModal';
import { ai } from '../../lib/aiService';
import type { NavTab } from '../Header';
import {
  Compass,
  User,
  Shield,
  ShieldAlert,
  AlertCircle,
  Zap,
  Layers,
  ChevronRight,
  ChevronDown,
  Target,
  Edit,
  Edit3,
  Link2,
  MapPin,
  ArrowRight,
  Sparkles,
  ListTree,
  Plus,
  BookOpen,
  FileText,
  CheckCircle2,
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Trash2,
  Wand2,
  Maximize2,
  Loader2,
  Check,
  X,
  PlusCircle,
  GitFork,
} from 'lucide-react';

interface ContextDrawerProps {
  isMobile?: boolean;
  onNavigateTab?: (tab: NavTab) => void;
  onSwitchStudioTab?: (tab: 'editor' | 'canvas') => void;
  currentStudioTab?: 'editor' | 'canvas';
  onOpenFullOutlineModal?: () => void;
}

export const ContextDrawer: React.FC<ContextDrawerProps> = ({
  isMobile,
  onNavigateTab,
  onSwitchStudioTab,
  currentStudioTab,
  onOpenFullOutlineModal,
}) => {
  const {
    novel,
    activeChapter,
    activeScene,
    characters,
    characterStates,
    getCharacterStateAtChapter,
    worldSettings,
    foreshadowings,
    volumes,
    activeChapterId,
    setActiveChapterId,
    activeSceneIndex,
    setActiveSceneIndex,
    updateScene,
    addScene,
    deleteScene,
    addChapter,
    updateChapter,
    deleteChapter,
    addVolume,
    updateVolume,
    deleteVolume,
    generateScenesForChapter,
  } = useNovel();

  // 左侧抽屉模式：'tree' (大纲目录树) | 'context' (本幕节拍与上下文)
  const [drawerTab, setDrawerTab] = useState<'tree' | 'context'>(() => {
    try {
      return (
        (localStorage.getItem('studio_context_drawer_tab') as 'tree' | 'context') ||
        'tree'
      );
    } catch {
      return 'tree';
    }
  });

  const switchDrawerTab = (tab: 'tree' | 'context') => {
    setDrawerTab(tab);
    try {
      localStorage.setItem('studio_context_drawer_tab', tab);
    } catch {}
  };

  // 卷折叠状态管理 (默认全部展开)
  const [expandedVolumes, setExpandedVolumes] = useState<Record<string, boolean>>({});

  const toggleVolume = (volId: string) => {
    setExpandedVolumes((prev) => ({
      ...prev,
      [volId]: prev[volId] === undefined ? false : !prev[volId],
    }));
  };

  const isVolExpanded = (volId: string) => {
    return expandedVolumes[volId] !== false; // 默认展开
  };

  // 节拍编辑模态框
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // 全景大纲总览模态框
  const [isFullOutlineModalOpen, setIsFullOutlineModalOpen] = useState(false);

  // 新建分卷模态框状态
  const [isAddVolumeModalOpen, setIsAddVolumeModalOpen] = useState(false);
  const [volTitle, setVolTitle] = useState('');
  const [volSummary, setVolSummary] = useState('');
  const [volConflict, setVolConflict] = useState('');
  const [volClimax, setVolClimax] = useState('');
  const [volBoundary, setVolBoundary] = useState('');

  // 编辑分卷模态框状态
  const [editingVolume, setEditingVolume] = useState<Volume | null>(null);
  const [editVolTitle, setEditVolTitle] = useState('');
  const [editVolSummary, setEditVolSummary] = useState('');
  const [editVolConflict, setEditVolConflict] = useState('');
  const [editVolClimax, setEditVolClimax] = useState('');
  const [editVolBoundary, setEditVolBoundary] = useState('');

  // 快捷新建章节模态框状态
  const [isAddChapterModalOpen, setIsAddChapterModalOpen] = useState(false);
  const [targetVolumeId, setTargetVolumeId] = useState<string>('');
  const [newChapTitle, setNewChapTitle] = useState('');
  const [newChapOutline, setNewChapOutline] = useState('');
  const [newChapPov, setNewChapPov] = useState('');
  const [titleCandidates, setTitleCandidates] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // 编辑章节模态框状态
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);
  const [editChapTitle, setEditChapTitle] = useState('');
  const [editChapOutline, setEditChapOutline] = useState('');
  const [editChapPov, setEditChapPov] = useState('');
  const [editTitleCandidates, setEditTitleCandidates] = useState<string[]>([]);
  const [isGeneratingEditTitles, setIsGeneratingEditTitles] = useState(false);

  // AI 拆解分镜运行中状态
  const [generatingScenesChapId, setGeneratingScenesChapId] = useState<string | null>(null);

  useEffect(() => {
    if (activeChapter?.volumeId) {
      setTargetVolumeId(activeChapter.volumeId);
    } else if (volumes.length > 0) {
      setTargetVolumeId(volumes[0].id);
    }
    if (characters.length > 0 && !newChapPov) {
      setNewChapPov(characters[0].id);
    }
  }, [activeChapter, volumes, characters]);

  // 全书大纲统计数据
  const totalChaptersCount = volumes.reduce(
    (acc, v) => acc + (v.chapters?.length || 0),
    0
  );
  const totalWordsCount = volumes.reduce(
    (acc, v) =>
      acc +
      (v.chapters || []).reduce(
        (cAcc, c) =>
          cAcc +
          (c.scenes || []).reduce(
            (sAcc, s) => sAcc + (s.draftContent?.length || 0),
            0
          ),
        0
      ),
    0
  );

  // 当前在场角色
  const involvedChars = characters.filter((c) =>
    activeScene?.involvedCharacterIds?.includes(c.id)
  );

  // 前后幕因果关联
  const prevScene = activeChapter?.scenes?.find(
    (s) => s.sceneIndex === activeSceneIndex - 1
  );
  const nextScene = activeChapter?.scenes?.find(
    (s) => s.sceneIndex === activeSceneIndex + 1
  );

  const handleSaveScene = (updated: any) => {
    if (activeChapter) {
      updateScene(activeChapter.id, activeSceneIndex, updated);
    }
  };

  const handleAiSuggestBeats = async (sceneIndex: number) => {
    const povName = characters[0]?.name || '主角';
    if (sceneIndex === 1) {
      return {
        sceneGoal: `${povName}查探局势异常，暗中布防并寻找关键破局线索`,
        conflict: '真元或资源受限，敌暗我明，退路逐渐收紧',
        turnPoint: '意外发现现场遗留的特殊印记或法则异动',
        outcome: '确认危机降临，放弃侥幸心理，制定反击行动',
        location: activeScene?.location || '当前驻地核心区域',
      };
    } else if (sceneIndex === 2) {
      return {
        sceneGoal: `${povName}与敌对势力正式交锋碰撞，打乱对手节奏`,
        conflict: '双方实力悬殊或对手祭出意外底牌，陷入逆风僵局',
        turnPoint: '抓住对手弱点或动用本门秘法，以微弱代价造成致命逆转',
        outcome: '成功打破封锁包围，但导致局面进一步不可逆恶化',
        location: activeScene?.location || '战况激化交汇点',
      };
    } else {
      return {
        sceneGoal: `终极了结当前阶段死斗，夺取战利品或脱险逃生`,
        conflict: '全场力量濒临崩溃极限，面临同归于尽的险境',
        turnPoint: '关键外援介入或触发上古地脉共鸣，强行撕裂战局',
        outcome: '击退大敌但付出不可逆代价，引申出下一卷/章的核心悬念',
        location: activeScene?.location || '决战死地断崖',
      };
    }
  };

  const cleanCandidateTitle = (raw: string) => {
    return raw.replace(/^第\s*\d+\s*章\s*[:：]?\s*/, '').trim();
  };

  // 快捷生成 AI 标题 (新建章节)
  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true);
    try {
      const vol = volumes.find((v) => v.id === targetVolumeId) || volumes[0];
      const nextIndex = (vol?.chapters.length || 0) + 1;
      const titles = await ai.suggestChapterTitles({
        novelTitle: novel?.title || '太虚纪元',
        genre: novel?.genre || '仙侠修真',
        volumeTitle: vol?.title,
        volumeConflict: vol?.mainConflict,
        volumeSummary: vol?.summary,
        volumeBoundary: vol?.boundaryConstraints,
        chapterOutline: newChapOutline,
        chapterIndex: nextIndex,
        currentTitle: newChapTitle,
      });
      setTitleCandidates(titles);
    } catch (err) {
      console.error('生成候选标题失败:', err);
    } finally {
      setIsGeneratingTitles(false);
    }
  };

  // 快捷生成 AI 标题 (编辑章节)
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
      console.error('生成编辑候选标题失败:', err);
    } finally {
      setIsGeneratingEditTitles(false);
    }
  };

  // 确认创建新章节
  const handleConfirmAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapTitle.trim()) return;
    const volId = targetVolumeId || volumes[0]?.id;
    if (!volId) return;

    addChapter(
      volId,
      newChapTitle.trim(),
      newChapOutline.trim() || '大纲规划中...',
      newChapPov || characters[0]?.id
    );
    setIsAddChapterModalOpen(false);
    setNewChapTitle('');
    setNewChapOutline('');
    setTitleCandidates([]);
  };

  // 确认修改章节
  const handleConfirmEditChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingChapter || !editChapTitle.trim()) return;
    updateChapter(editingChapter.id, {
      title: editChapTitle.trim(),
      outline: editChapOutline.trim(),
      povCharacterId: editChapPov,
    });
    setEditingChapter(null);
  };

  // 删除章节
  const handleDeleteChapter = (chapId: string, chapTitle: string, chapIndex: number) => {
    if (confirm(`确定要删除第 ${chapIndex} 章【${chapTitle}】吗？此操作不可逆。`)) {
      deleteChapter(chapId);
    }
  };

  // 确认创建新分卷
  const handleConfirmAddVolume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!volTitle.trim()) return;
    addVolume(
      volTitle.trim(),
      volConflict.trim(),
      volClimax.trim(),
      volSummary.trim(),
      volBoundary.trim()
    );
    setIsAddVolumeModalOpen(false);
    setVolTitle('');
    setVolSummary('');
    setVolConflict('');
    setVolClimax('');
    setVolBoundary('');
  };

  // 确认修改分卷
  const handleConfirmEditVolume = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVolume || !editVolTitle.trim()) return;
    updateVolume(editingVolume.id, {
      title: editVolTitle.trim(),
      summary: editVolSummary.trim(),
      mainConflict: editVolConflict.trim(),
      targetClimax: editVolClimax.trim(),
      boundaryConstraints: editVolBoundary.trim(),
    });
    setEditingVolume(null);
  };

  // 删除分卷
  const handleDeleteVolume = (volId: string, volTitle: string, volIndex: number) => {
    if (volumes.length <= 1) {
      alert('全书至少保留一个分卷。');
      return;
    }
    if (confirm(`确定要删除第 ${volIndex} 卷【${volTitle}】及其下所有章节吗？此操作不可逆。`)) {
      deleteVolume(volId);
    }
  };

  // AI 一键拆解分镜
  const handlePlanScenes = async (chapId: string) => {
    setGeneratingScenesChapId(chapId);
    try {
      await generateScenesForChapter(chapId);
    } catch (err) {
      console.error('AI拆解分镜失败:', err);
    } finally {
      setGeneratingScenesChapId(null);
    }
  };

  // 删除某幕分镜
  const handleDeleteScene = (chapId: string, sceneIndex: number) => {
    if (confirm(`确定要删除第 ${sceneIndex} 幕吗？`)) {
      deleteScene(chapId, sceneIndex);
    }
  };

  // 快捷在当前章添加一幕
  const handleAddSceneToActiveChapter = () => {
    if (!activeChapter) return;
    const nextIdx = (activeChapter.scenes?.length || 0) + 1;
    addScene(activeChapter.id, {
      sceneIndex: nextIdx,
      sceneGoal: '承接上文推进新冲突与动作',
      conflict: '面临阻碍',
      turnPoint: '局势突变',
      outcome: '产生后续影响',
      involvedCharacterIds: activeChapter.povCharacterId
        ? [activeChapter.povCharacterId]
        : [],
      location: '待定地点',
      draftContent: '',
    });
    setActiveSceneIndex(nextIdx);
  };

  const openFullOutline = () => {
    if (onOpenFullOutlineModal) {
      onOpenFullOutlineModal();
    } else {
      setIsFullOutlineModalOpen(true);
    }
  };

  return (
    <aside
      className={`${
        isMobile
          ? 'w-full h-full p-3.5 flex flex-col gap-3.5 overflow-y-auto'
          : 'w-full border-r border-slate-800 bg-slate-950/70 p-3.5 flex flex-col gap-3.5 overflow-y-auto h-[calc(100vh-60px)]'
      }`}
    >
      {/* 1. 创作平台左上角：大纲分镜全局架构看板与模式切换 */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800/90 rounded-xl p-3 shadow-md space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 shrink-0">
              <Compass className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                <span className="truncate">大纲目录与分镜</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950/80 text-indigo-300 font-normal border border-indigo-700/40 shrink-0">
                  {volumes.length}卷 · {totalChaptersCount}章
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate">
                全书大纲架构与分镜管理
              </p>
            </div>
          </div>

          <button
            onClick={openFullOutline}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-medium transition flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
            title="打开全景大纲分镜总览看板"
          >
            <Maximize2 className="w-3 h-3" />
            <span>全景总览</span>
          </button>
        </div>

        {/* 双模式切换 Tab */}
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950/90 rounded-lg border border-slate-800">
          <button
            onClick={() => switchDrawerTab('tree')}
            className={`py-1.5 text-xs font-medium rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
              drawerTab === 'tree'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListTree className="w-3.5 h-3.5" />
            <span>大纲目录树</span>
          </button>
          <button
            onClick={() => switchDrawerTab('context')}
            className={`py-1.5 text-xs font-medium rounded transition flex items-center justify-center gap-1.5 cursor-pointer ${
              drawerTab === 'context'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>本幕节拍</span>
          </button>
        </div>
      </div>

      {/* 模式 A：大纲目录树视图 (Outline Tree View) */}
      {drawerTab === 'tree' && (
        <div className="space-y-3 flex-1">
          {/* 快捷新建与统计指示 */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span className="flex items-center gap-1 text-slate-400 truncate">
              <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>
                全书共 {totalWordsCount > 0 ? totalWordsCount.toLocaleString() : 0} 字
              </span>
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => {
                  setVolTitle('');
                  setVolSummary('');
                  setVolConflict('');
                  setVolClimax('');
                  setVolBoundary('');
                  setIsAddVolumeModalOpen(true);
                }}
                className="flex items-center gap-1 text-slate-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer"
                title="新建分卷"
              >
                <FolderPlus className="w-3 h-3 text-indigo-400" />
                <span>新建分卷</span>
              </button>
              <span className="text-slate-700">|</span>
              <button
                onClick={() => {
                  setTargetVolumeId(activeChapter?.volumeId || volumes[0]?.id || '');
                  setNewChapTitle('');
                  setNewChapOutline('');
                  setTitleCandidates([]);
                  setIsAddChapterModalOpen(true);
                }}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-medium hover:underline cursor-pointer"
                title="新建章节"
              >
                <Plus className="w-3 h-3" />
                <span>新建章节</span>
              </button>
            </div>
          </div>

          {/* 分卷与章节层级树 */}
          <div className="space-y-2.5">
            {volumes.map((vol) => {
              const expanded = isVolExpanded(vol.id);
              const volTotalWords = (vol.chapters || []).reduce(
                (acc, c) =>
                  acc +
                  (c.scenes || []).reduce(
                    (sAcc, s) => sAcc + (s.draftContent?.length || 0),
                    0
                  ),
                0
              );

              return (
                <div
                  key={vol.id}
                  className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xs"
                >
                  {/* 分卷标题栏 */}
                  <div
                    onClick={() => toggleVolume(vol.id)}
                    className="flex items-center justify-between p-2.5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer border-b border-slate-800/60 transition group"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      {expanded ? (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-300 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-100 truncate">
                        第 {vol.volumeIndex} 卷 · {vol.title}
                      </span>
                    </div>

                    <div
                      className="flex items-center gap-1 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-[10px] text-slate-400 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800">
                        {vol.chapters.length} 章
                      </span>

                      {/* 在该卷加章 */}
                      <button
                        onClick={() => {
                          setTargetVolumeId(vol.id);
                          setNewChapTitle('');
                          setNewChapOutline('');
                          setTitleCandidates([]);
                          setIsAddChapterModalOpen(true);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                        title={`在第 ${vol.volumeIndex} 卷快速新建章节`}
                      >
                        <Plus className="w-3 h-3" />
                      </button>

                      {/* 编辑卷大纲与出场约束 */}
                      <button
                        onClick={() => {
                          setEditingVolume(vol);
                          setEditVolTitle(vol.title);
                          setEditVolSummary(vol.summary || '');
                          setEditVolConflict(vol.mainConflict || '');
                          setEditVolClimax(vol.targetClimax || '');
                          setEditVolBoundary(vol.boundaryConstraints || '');
                        }}
                        className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                        title="编辑该卷的故事概要与出场边界约束"
                      >
                        <Edit className="w-3 h-3" />
                      </button>

                      {/* 删除卷 */}
                      {volumes.length > 1 && (
                        <button
                          onClick={() =>
                            handleDeleteVolume(vol.id, vol.title, vol.volumeIndex)
                          }
                          className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                          title="删除此卷"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 展开的章节与分卷概要 */}
                  {expanded && (
                    <div className="p-2 space-y-1.5">
                      {/* 分卷约束或概要摘要 */}
                      {vol.summary || vol.boundaryConstraints ? (
                        <div className="px-2.5 py-2 bg-slate-950/70 border border-slate-800/80 rounded-lg text-[11px] text-slate-400 space-y-1 mb-1.5 group/card">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium">
                              卷大纲与约束设定
                            </span>
                            <button
                              onClick={() => {
                                setEditingVolume(vol);
                                setEditVolTitle(vol.title);
                                setEditVolSummary(vol.summary || '');
                                setEditVolConflict(vol.mainConflict || '');
                                setEditVolClimax(vol.targetClimax || '');
                                setEditVolBoundary(vol.boundaryConstraints || '');
                              }}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                            >
                              修改
                            </button>
                          </div>
                          {vol.summary && (
                            <div className="line-clamp-2">
                              <span className="text-indigo-400 font-medium">
                                卷主线：
                              </span>
                              <span>{vol.summary}</span>
                            </div>
                          )}
                          {vol.boundaryConstraints && (
                            <div className="line-clamp-2 text-amber-300/80">
                              <span className="font-medium text-amber-400">
                                出场约束：
                              </span>
                              <span>{vol.boundaryConstraints}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="mb-1.5 flex items-center justify-between px-2 py-1 bg-slate-950/40 rounded border border-dashed border-slate-800 text-[10px] text-slate-500">
                          <span>暂未设置本卷剧情纲要与防早现约束</span>
                          <button
                            onClick={() => {
                              setEditingVolume(vol);
                              setEditVolTitle(vol.title);
                              setEditVolSummary(vol.summary || '');
                              setEditVolConflict(vol.mainConflict || '');
                              setEditVolClimax(vol.targetClimax || '');
                              setEditVolBoundary(vol.boundaryConstraints || '');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                          >
                            + 设置
                          </button>
                        </div>
                      )}

                      {/* 章节列表 */}
                      {vol.chapters.length === 0 ? (
                        <div className="text-center py-3 text-xs text-slate-500">
                          暂无章节，点击右上角「+」快速创建
                        </div>
                      ) : (
                        vol.chapters.map((chap) => {
                          const isChapActive = chap.id === activeChapterId;
                          const chapWords = (chap.scenes || []).reduce(
                            (acc, s) => acc + (s.draftContent?.length || 0),
                            0
                          );

                          return (
                            <div key={chap.id} className="space-y-1">
                              {/* 章节行 */}
                              <div
                                onClick={() => {
                                  setActiveChapterId(chap.id);
                                  setActiveSceneIndex(1);
                                }}
                                className={`w-full text-left p-2 rounded-lg border transition flex items-center justify-between gap-2 group cursor-pointer ${
                                  isChapActive
                                    ? 'bg-indigo-950/70 border-indigo-500/60 shadow-xs text-indigo-200'
                                    : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                      isChapActive
                                        ? 'bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.9)]'
                                        : 'bg-slate-600'
                                    }`}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="text-xs font-medium truncate flex items-center gap-1.5">
                                      <span className="text-slate-400 shrink-0 font-normal">
                                        第{chap.chapterIndex}章
                                      </span>
                                      <span className="truncate">{chap.title}</span>
                                    </div>
                                    {chap.outline && (
                                      <p className="text-[10px] text-slate-500 truncate mt-0.5">
                                        {chap.outline}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div
                                  className="flex items-center gap-1 shrink-0"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <span className="text-[10px] text-slate-500 hidden sm:inline">
                                    {chapWords > 0 ? `${chapWords}字` : '0字'}
                                  </span>
                                  <span
                                    className={`text-[9px] px-1 py-0.2 rounded font-medium ${
                                      chap.status === 'PUBLISHED'
                                        ? 'bg-emerald-950 text-emerald-400'
                                        : chap.status === 'REVIEWED'
                                        ? 'bg-cyan-950 text-cyan-300'
                                        : chap.status === 'DRAFTED'
                                        ? 'bg-indigo-950 text-indigo-300'
                                        : chap.status === 'SCENED'
                                        ? 'bg-amber-950 text-amber-300'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {chap.status === 'PUBLISHED'
                                      ? '已发布'
                                      : chap.status === 'REVIEWED'
                                      ? '精修'
                                      : chap.status === 'DRAFTED'
                                      ? '草稿'
                                      : chap.status === 'SCENED'
                                      ? '定镜'
                                      : '规划'}
                                  </span>

                                  {/* AI 拆解分镜按钮 */}
                                  <button
                                    onClick={() => handlePlanScenes(chap.id)}
                                    disabled={generatingScenesChapId === chap.id}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition disabled:opacity-50 cursor-pointer"
                                    title="AI 智能拆解 3 幕戏剧分镜"
                                  >
                                    {generatingScenesChapId === chap.id ? (
                                      <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                                    ) : (
                                      <Wand2 className="w-3 h-3" />
                                    )}
                                  </button>

                                  {/* 编辑章节大纲与标题按钮 */}
                                  <button
                                    onClick={() => {
                                      setEditingChapter(chap);
                                      setEditChapTitle(chap.title);
                                      setEditChapOutline(chap.outline);
                                      setEditChapPov(
                                        chap.povCharacterId || characters[0]?.id || ''
                                      );
                                      setEditTitleCandidates([]);
                                      setIsGeneratingEditTitles(false);
                                    }}
                                    className="p-1 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                                    title="编辑本章大纲、标题与POV"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>

                                  {/* 删除章节按钮 */}
                                  <button
                                    onClick={() =>
                                      handleDeleteChapter(
                                        chap.id,
                                        chap.title,
                                        chap.chapterIndex
                                      )
                                    }
                                    className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                                    title="删除章节"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* 当章节处于当前编辑状态时，展示其包含的场景幕数明细 */}
                              {isChapActive && (
                                <div className="pl-3.5 pr-1 space-y-1 border-l-2 border-indigo-800/40 ml-2 pt-0.5">
                                  {chap.scenes && chap.scenes.length > 0 ? (
                                    chap.scenes.map((s) => {
                                      const isSceneActive =
                                        s.sceneIndex === activeSceneIndex;
                                      return (
                                        <div
                                          key={s.id}
                                          className={`w-full px-2 py-1 rounded text-[11px] transition flex items-center justify-between gap-1.5 cursor-pointer group/scene ${
                                            isSceneActive
                                              ? 'bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 font-medium'
                                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                                          }`}
                                          onClick={() =>
                                            setActiveSceneIndex(s.sceneIndex)
                                          }
                                        >
                                          <div className="flex items-center gap-1 min-w-0 flex-1">
                                            <Target
                                              className={`w-2.5 h-2.5 shrink-0 ${
                                                isSceneActive
                                                  ? 'text-amber-400'
                                                  : 'text-slate-500'
                                              }`}
                                            />
                                            <span className="truncate">
                                              第 {s.sceneIndex} 幕
                                              {s.sceneGoal ? ` · ${s.sceneGoal}` : ''}
                                            </span>
                                          </div>

                                          <div
                                            className="flex items-center gap-1 shrink-0"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <span className="text-[10px] text-slate-500">
                                              {s.draftContent?.length || 0}字
                                            </span>
                                            <button
                                              onClick={() => {
                                                setActiveSceneIndex(s.sceneIndex);
                                                setIsEditModalOpen(true);
                                              }}
                                              className="p-0.5 rounded text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition cursor-pointer"
                                              title="编辑本幕分镜节拍"
                                            >
                                              <Edit className="w-2.5 h-2.5" />
                                            </button>
                                            <button
                                              onClick={() =>
                                                handleDeleteScene(
                                                  chap.id,
                                                  s.sceneIndex
                                                )
                                              }
                                              className="p-0.5 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition cursor-pointer"
                                              title="删除此幕分镜"
                                            >
                                              <Trash2 className="w-2.5 h-2.5" />
                                            </button>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="py-2 text-center text-[10px] text-slate-500 space-y-1">
                                      <p>本章尚未拆解分镜幕</p>
                                      <button
                                        onClick={() => handlePlanScenes(chap.id)}
                                        disabled={
                                          generatingScenesChapId === chap.id
                                        }
                                        className="px-2 py-0.5 bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800/50 rounded text-[10px] inline-flex items-center gap-1 cursor-pointer"
                                      >
                                        <Wand2 className="w-2.5 h-2.5" />
                                        <span>AI 一键拆解3幕</span>
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex items-center gap-1 pt-1">
                                    <button
                                      onClick={handleAddSceneToActiveChapter}
                                      className="flex-1 py-1 text-[10px] text-slate-400 hover:text-indigo-300 hover:bg-slate-900/60 rounded border border-dashed border-slate-800 transition flex items-center justify-center gap-1 cursor-pointer"
                                      title="新增下一幕分镜"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>新增幕分镜</span>
                                    </button>
                                    <button
                                      onClick={() => handlePlanScenes(chap.id)}
                                      disabled={
                                        generatingScenesChapId === chap.id
                                      }
                                      className="py-1 px-2 text-[10px] text-indigo-400 hover:text-white hover:bg-indigo-950/60 rounded border border-dashed border-indigo-900/50 transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                                      title="重新用AI拆解本章分镜"
                                    >
                                      <Wand2 className="w-2.5 h-2.5" />
                                      <span>AI重新拆解</span>
                                    </button>
                                  </div>
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

          {/* 底部功能直达区 */}
          <div className="pt-2 space-y-2 border-t border-slate-800/80">
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setVolTitle('');
                  setVolSummary('');
                  setVolConflict('');
                  setVolClimax('');
                  setVolBoundary('');
                  setIsAddVolumeModalOpen(true);
                }}
                className="py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="创建新分卷"
              >
                <FolderPlus className="w-3.5 h-3.5 text-indigo-400" />
                <span>新建分卷</span>
              </button>

              <button
                onClick={() => {
                  setTargetVolumeId(activeChapter?.volumeId || volumes[0]?.id || '');
                  setNewChapTitle('');
                  setNewChapOutline('');
                  setTitleCandidates([]);
                  setIsAddChapterModalOpen(true);
                }}
                className="py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-lg text-xs font-medium transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                title="快速新建章节（支持 AI 灵感标题）"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>新建章节</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={openFullOutline}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer"
                title="打开全景大纲分镜管理看板"
              >
                <Compass className="w-3 h-3 text-indigo-400" />
                <span>全景大纲</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
              </button>
              <button
                onClick={() =>
                  onSwitchStudioTab
                    ? onSwitchStudioTab('canvas')
                    : onNavigateTab?.('CANVAS')
                }
                className={`py-1.5 px-2 rounded-lg text-[11px] font-medium transition flex items-center justify-center gap-1 cursor-pointer ${
                  currentStudioTab === 'canvas'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="打开本章剧情自动推演幕布"
              >
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>推演幕布</span>
                <ArrowRight className="w-2.5 h-2.5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 模式 B：本幕节拍与上下文视图 (Scene Beats & Context) */}
      {drawerTab === 'context' && (
        <div className="space-y-3.5 flex-1">
          {/* 1. 卷章与分镜切换 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Layers className="w-3.5 h-3.5" />
                <span>当前定位章节</span>
                <FieldExplainer
                  title="章节定位与分镜切换"
                  what="选择当前正在创作与推演的具体卷章。"
                  why="系统将根据选定章节，为编辑区和右侧 Agent 注入对应的大纲、主线冲突与在场人物。"
                  position="right"
                />
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300">
                {activeChapter?.status}
              </span>
            </div>

            <select
              value={activeChapterId}
              onChange={(e) => setActiveChapterId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              {volumes.flatMap((v) =>
                v.chapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    第 {c.chapterIndex} 章：{c.title}
                  </option>
                ))
              )}
            </select>

            {/* 场景幕数标签页 */}
            {activeChapter?.scenes && activeChapter.scenes.length > 0 && (
              <div className="flex gap-1.5 pt-1">
                {activeChapter.scenes.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSceneIndex(s.sceneIndex)}
                    className={`flex-1 py-1 text-[11px] font-medium rounded border transition cursor-pointer ${
                      s.sceneIndex === activeSceneIndex
                        ? 'bg-indigo-600/30 border-indigo-500 text-indigo-200'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    第 {s.sceneIndex} 幕
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 2. 当前分镜剧情节拍卡 (Beats) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>分镜节拍卡 (第 {activeSceneIndex} 幕)</span>
                <FieldExplainer
                  title="分镜节拍卡 (Scene Beats)"
                  what="章节内部的最小戏剧动作单元（节拍）。通常一章划分为 2~3 幕，每幕围绕一个具体目标展开冲突、转折与结局。"
                  why="将大长章拆解为精准节拍，能杜绝大模型写大长篇时的逻辑断层、水文与战力失控，使情节像电影大片一样扣人心弦。"
                  example="好莱坞三幕式网文节拍：第1幕遭遇与铺垫 ➔ 第2幕冲突升级与逆转 ➔ 第3幕对决与章末悬念"
                  position="right"
                />
              </div>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-950/40 hover:bg-indigo-950/80 border border-indigo-800/40 transition cursor-pointer"
                title="点击编辑本幕的目标、冲突、转折与结局"
              >
                <Edit3 className="w-3 h-3" />
                <span>编辑节拍</span>
              </button>
            </div>

            {/* 幕间因果流转指示器 (Causal Continuity Tracker) */}
            <div className="bg-slate-950/80 border border-indigo-900/30 rounded-lg p-2 text-[11px] space-y-1.5">
              <div className="flex items-center justify-between text-indigo-300 font-medium">
                <span className="flex items-center gap-1">
                  <Link2 className="w-3 h-3 text-indigo-400" />
                  <span>幕间因果推进链</span>
                </span>
                <FieldExplainer
                  title="幕间因果推进链 (Causal Chain)"
                  what="网文情节环环相扣的核心法则：上一幕的【结果/代价】直接演变为下一幕的【危机/目标】。"
                  why="避免记流水账或段落断层。每一幕的动作都不是凭空发生，而是上一幕行动导致的必然多米诺骨牌后果。"
                  example="前幕引爆炸塌溶洞 ➔ 导致本幕必须强渡地脉深渊 ➔ 导致后幕遭遇地渊上古凶兽"
                  position="right"
                />
              </div>

              <div className="text-slate-400 space-y-1 leading-snug">
                {prevScene ? (
                  <div className="flex items-start gap-1">
                    <span className="text-slate-500 shrink-0">前幕承接：</span>
                    <span className="text-slate-300 line-clamp-1">
                      {prevScene.outcome || '暂未定义前幕结局'}
                    </span>
                  </div>
                ) : (
                  <div className="text-slate-500">
                    📍 本章开篇第一幕：奠定核心驱动力与初始环境。
                  </div>
                )}

                {nextScene && (
                  <div className="flex items-start gap-1 text-[10px] text-slate-500 pt-0.5 border-t border-slate-900">
                    <span className="shrink-0">后幕走向：</span>
                    <span className="line-clamp-1 text-slate-400">
                      本幕结局将直接决定第 {nextScene.sceneIndex} 幕的危机起点
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 节拍详细字段展示 */}
            <div className="space-y-2 text-xs">
              <div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>场景目标 (Goal)</span>
                  <FieldExplainer
                    title="场景目标 (Scene Goal)"
                    what="主角在本幕想要达成的具体、可见的即时行动目标（不可泛化）。"
                    why="目标是驱动主角行动的核心引擎。缺少目标的场景会沦为无重心的水文；AI执笔将紧扣此目标展开剧情。"
                    example="林越压制肩伤，借溶洞阴煞设伏诱敌（而不是单纯的'林越在溶洞疗伤'）"
                    position="right"
                  />
                </div>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {activeScene?.sceneGoal ||
                    '暂无明确目标，点击上方【编辑节拍】或右侧分镜导演规划'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-400/80">
                  <span>阻碍与冲突 (Conflict)</span>
                  <FieldExplainer
                    title="阻碍与冲突 (Conflict)"
                    what="阻止主角顺利达成目标的敌对力量、险恶环境、时间限制或内在心魔。"
                    why="无阻碍则无戏剧张力（No Conflict, No Story）。阻碍迫使主角动用底牌，是产生爽感与追读代入感的前提。"
                    example="真元严重透支，夜枭血蝙蝠探子在洞口盘旋封死退路"
                    position="right"
                  />
                </div>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {activeScene?.conflict || '暂未设定'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                  <span>核心转折点 (Turn Point)</span>
                  <FieldExplainer
                    title="核心转折点 (Turn Point)"
                    what="打破原本预期、让局面突然反向或异化的意外变数（戏剧节拍）。"
                    why="转折打破读者的心理预见性，带来'意料之外、情理之中'的追读快感，也是情节不可逆推进的关键齿轮。"
                    example="青铜残片与溶洞古石壁共鸣，意外发现万年前的上古残阵"
                    position="right"
                  />
                </div>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {activeScene?.turnPoint || '暂未设定'}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">
                  <span>场景结果 (Outcome)</span>
                  <FieldExplainer
                    title="场景结果与后果 (Outcome)"
                    what="本幕对抗尘埃落定后的实质改变，直接成为下一幕的原因（因果闭环）。"
                    why="幕间关联的生死纽带！上一幕的结果直接转化为下一幕的新危机，保证小说逻辑严密环环相扣。"
                    example="成功诱敌歼灭先锋，但溶洞坍塌断绝退路，被迫坠入未知地渊"
                    position="right"
                  />
                </div>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {activeScene?.outcome || '暂未设定'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. 在场角色即时状态机卡片 (SoT 核心) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>在场角色即时状态机</span>
                <FieldExplainer
                  title="在场角色即时状态机"
                  what="登场角色的实时生理、战力与地点状态（战力等级、负伤标签等）。"
                  why="作为 AI 执笔与设定的唯一真实源（SoT），硬性约束 AI 杜绝'前一幕断臂、下一幕双手持剑'或战力瞬移撕裂空间等逻辑崩坏。"
                  example="林越：左肩贯穿伤、战力损耗四成、真元透支"
                  position="right"
                />
              </span>
              <span className="text-[10px] text-slate-500">
                {involvedChars.length} 人登场
              </span>
            </div>

            {involvedChars.length === 0 ? (
              <div className="text-xs text-slate-500 py-2 text-center bg-slate-950/60 rounded-lg border border-dashed border-slate-800">
                <span>暂未分配在场角色</span>
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="text-indigo-400 hover:underline block text-[11px] mt-1 cursor-pointer"
                >
                  点击配置在场角色
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {involvedChars.map((char) => {
                  const state = getCharacterStateAtChapter
                    ? getCharacterStateAtChapter(
                        char.id,
                        activeChapter?.chapterIndex
                      )
                    : characterStates.find((s) => s.characterId === char.id);
                  return (
                    <div
                      key={char.id}
                      className="bg-slate-950 border border-slate-800/90 rounded-lg p-2.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-slate-200 flex items-center gap-1">
                          {char.name}
                          <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                            {char.roleType}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {state?.chapterIndex && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-800/50 text-indigo-300 font-medium">
                              {state.chapterIndex ===
                              activeChapter?.chapterIndex
                                ? `第${state.chapterIndex}章跃迁`
                                : `继承自第${state.chapterIndex}章`}
                            </span>
                          )}
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              state?.healthStatus === 'HEALTHY'
                                ? 'bg-emerald-950 text-emerald-400'
                                : state?.healthStatus === 'INJURED'
                                ? 'bg-amber-950 text-amber-400'
                                : 'bg-red-950 text-red-400'
                            }`}
                          >
                            {state?.healthStatus || '正常'}
                          </span>
                        </div>
                      </div>

                      <div className="text-[11px] text-slate-400 space-y-0.5">
                        <p>
                          <span className="text-slate-500">当前战力：</span>
                          <span className="text-slate-300 font-medium">
                            {state?.combatPower || '未知'}
                          </span>
                        </p>
                        <p>
                          <span className="text-slate-500">所在地点：</span>
                          <span className="text-slate-300">
                            {state?.location || '当前场景'}
                          </span>
                        </p>
                      </div>

                      {state?.statusTags && state.statusTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {state.statusTags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-red-950/60 border border-red-800/40 text-red-300"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {char.profile?.voiceAndTone && (
                        <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-1">
                          <span>
                            语气：{char.profile.voiceAndTone.slice(0, 24)}...
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 4. 活跃伏笔关联 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5 text-amber-400">
                <Zap className="w-3.5 h-3.5" />
                <span>本章待呼应伏笔</span>
              </span>
              <FieldExplainer
                title="待呼应伏笔"
                what="此前章节埋设、计划在本阶段引爆或回收的伏笔线索。"
                why="AI 起草正文时会自动尝试将伏笔物证或暗线编入剧情，使故事伏脉千里。"
                position="right"
              />
            </div>

            <div className="space-y-1.5">
              {foreshadowings
                .filter(
                  (f) => f.status === 'PLANTED' || f.status === 'FERMENTING'
                )
                .slice(0, 2)
                .map((f) => (
                  <div
                    key={f.id}
                    className="bg-slate-950 border border-slate-800 rounded p-2 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between text-[11px] font-medium text-amber-300">
                      <span>{f.title}</span>
                      <span className="text-[9px] text-slate-500">
                        计划第 {f.plannedResolveChapterIndex || '?'} 章解开
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-snug line-clamp-2">
                      {f.clueDescription}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 快捷新建章节模态框 */}
      {isAddChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">新建章节</h3>
                  <p className="text-[11px] text-slate-400">
                    规划新章节并立即载入创作工作台
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddChapterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmAddChapter} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  归属分卷
                </label>
                <select
                  value={targetVolumeId}
                  onChange={(e) => setTargetVolumeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {volumes.map((v) => (
                    <option key={v.id} value={v.id}>
                      第 {v.volumeIndex} 卷：{v.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    章节名称
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTitles}
                    disabled={isGeneratingTitles}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingTitles ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>AI 灵感标题</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={newChapTitle}
                  onChange={(e) => setNewChapTitle(e.target.value)}
                  placeholder="例如：星舟残骸与断剑"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />

                {/* AI 灵感标题候选芯片 */}
                {titleCandidates.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-950/80 rounded-lg border border-indigo-900/30 space-y-1.5">
                    <span className="text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> 点击采纳候选标题：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {titleCandidates.map((cand, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() =>
                            setNewChapTitle(
                              cand.replace(/^第\s*\d+\s*章\s*[:：]?\s*/, '').trim()
                            )
                          }
                          className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/40 text-indigo-200 rounded text-[11px] transition text-left cursor-pointer"
                        >
                          {cand}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  章节概要 / 核心冲突
                </label>
                <textarea
                  value={newChapOutline}
                  onChange={(e) => setNewChapOutline(e.target.value)}
                  rows={3}
                  placeholder="概述本章核心剧情目标、主线对抗或转折变数..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  主视角角色 (POV)
                </label>
                <select
                  value={newChapPov}
                  onChange={(e) => setNewChapPov(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roleType})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddChapterModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>确定创建</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 编辑分镜节拍模态框 */}
      <SceneEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        scene={activeScene}
        chapter={activeChapter}
        characters={characters}
        onSave={handleSaveScene}
        onAiSuggestBeats={handleAiSuggestBeats}
      />

      {/* 新建分卷模态框 */}
      {isAddVolumeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleConfirmAddVolume}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <FolderPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">创建新的小说分卷</h3>
                  <p className="text-[11px] text-slate-400">
                    设定宏观叙事阶段、主线矛盾与阶段出场约束
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVolumeModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">分卷标题</label>
                <input
                  type="text"
                  required
                  placeholder="例如：第二卷：风起天元"
                  value={volTitle}
                  onChange={(e) => setVolTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">预期卷末大高潮</label>
                  <textarea
                    rows={2}
                    placeholder="例如：万宝拍卖会大乱，林越斩魔脱身..."
                    value={volClimax}
                    onChange={(e) => setVolClimax(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
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
                  rows={3}
                  placeholder="【人物登场禁忌】：严禁金丹后期以上大能本体降临；&#10;【宝物机缘禁忌】：严禁提前出土上古神器；&#10;【战力天花板】：全卷压制在筑基期至金丹初期；&#10;【剧情悬念暗线】：严禁提前揭晓当年灭族真凶。"
                  value={volBoundary}
                  onChange={(e) => setVolBoundary(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-900/50 rounded-lg p-2.5 text-amber-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs leading-relaxed resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddVolumeModalOpen(false)}
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

      {/* 编辑分卷与边界约束模态框 */}
      {editingVolume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleConfirmEditVolume}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
          >
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    编辑第 {editingVolume.volumeIndex} 卷故事纲要与出场约束
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    设定阶段主线、高潮与出场约束规则，AI 撰写将硬性遵守
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingVolume(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">分卷标题</label>
                <input
                  type="text"
                  required
                  value={editVolTitle}
                  onChange={(e) => setEditVolTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
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
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
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
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">预期卷末大高潮</label>
                  <textarea
                    rows={2}
                    placeholder="例如：坠星崖绝地血战，破除死局，名动北域..."
                    value={editVolClimax}
                    onChange={(e) => setEditVolClimax(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-amber-400 font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>出场边界与防早现约束（AI 强约束规则）</span>
                  </label>
                  <span className="text-[10px] text-slate-500">AI 起草时的最高优先级负向提示词</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="【人物登场禁忌】：严禁金丹后期以上大能本体直接降临；&#10;【宝物机缘禁忌】：本卷仅限第一枚青铜残片苏醒，禁止提前出土第二枚神器；&#10;【战力天花板】：战力严格压制在筑基期至金丹初期；&#10;【剧情悬念暗线】：严禁提前揭晓当年灭族真凶。"
                  value={editVolBoundary}
                  onChange={(e) => setEditVolBoundary(e.target.value)}
                  className="w-full bg-slate-950 border border-amber-900/50 rounded-lg p-2.5 text-amber-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-xs leading-relaxed resize-none"
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

      {/* 编辑章节模态框 */}
      {editingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <form
            onSubmit={handleConfirmEditChapter}
            className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400">
                  <Edit3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    编辑第 {editingChapter.chapterIndex} 章大纲与标题
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    微调大纲概要、主视角人物与标题
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingChapter(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  主视角人物 (POV)
                </label>
                <select
                  value={editChapPov}
                  onChange={(e) => setEditChapPov(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.roleType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  章节剧情梗概 / 核心对抗事件
                </label>
                <textarea
                  value={editChapOutline}
                  onChange={(e) => setEditChapOutline(e.target.value)}
                  rows={3}
                  placeholder="概述本章核心剧情目标、主线对抗或转折变数..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-medium">
                    章节名称
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateTitlesForEdit}
                    disabled={isGeneratingEditTitles}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 hover:underline disabled:opacity-50 cursor-pointer"
                  >
                    {isGeneratingEditTitles ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>AI 灵感标题</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={editChapTitle}
                  onChange={(e) => setEditChapTitle(e.target.value)}
                  placeholder="例如：星舟残骸与断剑"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />

                {/* AI 灵感标题候选芯片 */}
                {editTitleCandidates.length > 0 && (
                  <div className="mt-2 p-2 bg-slate-950/80 rounded-lg border border-indigo-900/30 space-y-1.5">
                    <span className="text-[10px] text-indigo-300 font-medium flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> 点击采纳候选标题：
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {editTitleCandidates.map((cand, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditChapTitle(cleanCandidateTitle(cand))}
                          className="px-2 py-1 bg-indigo-950/60 hover:bg-indigo-900 border border-indigo-800/40 text-indigo-200 rounded text-[11px] transition text-left cursor-pointer"
                        >
                          {cand}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingChapter(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:text-white text-xs transition cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存修改</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 全景大纲总览模态框 */}
      <FullOutlineModal
        isOpen={isFullOutlineModalOpen}
        onClose={() => setIsFullOutlineModalOpen(false)}
        onJumpToStudio={(chapId, scIdx) => {
          setActiveChapterId(chapId);
          if (scIdx) setActiveSceneIndex(scIdx);
          setIsFullOutlineModalOpen(false);
        }}
        onJumpToCanvas={(chapId) => {
          if (chapId) setActiveChapterId(chapId);
          setIsFullOutlineModalOpen(false);
          if (onSwitchStudioTab) {
            onSwitchStudioTab('canvas');
          }
        }}
      />
    </aside>
  );
};
