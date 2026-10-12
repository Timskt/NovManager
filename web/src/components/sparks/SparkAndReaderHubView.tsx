// ==============================================================================
// 灵光一现与读者热议共创中枢 (Epiphany Spark Vault & Reader Discussion Co-Creation Hub)
// 随时捕捉作者午夜脑洞、解析起点本章说/番茄段评读者神猜测、双灵感对撞聚变、
// 章节锚定挂载与一键织入当前正文，彻底打通“灵光捕捉 -> 读者听劝 -> 正文落地”闭环
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  EpiphanySpark,
  EpiphanySparkType,
  SparkStatus,
  ReaderDiscussionComment,
  SparkCollisionResult,
} from '../../types/novel';
import {
  fetchEpiphanySparks,
  saveEpiphanySpark,
  deleteEpiphanySpark,
  fetchReaderDiscussions,
  collideSparks,
} from '../../lib/api';
import {
  Lightbulb,
  MessageSquare,
  Flame,
  Sparkles,
  Plus,
  Bookmark,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Zap,
  AlertTriangle,
  ThumbsUp,
  Send,
  RefreshCw,
  Anchor,
  Feather,
  Filter,
  GitMerge,
} from 'lucide-react';

const SPARK_TYPE_META: Record<
  EpiphanySparkType,
  { label: string; color: string; badgeBg: string }
> = {
  PLOT_TWIST: {
    label: '神转折脑洞',
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10 border-purple-500/30 text-purple-400',
  },
  DIALOGUE_GOLD: {
    label: '金句台词',
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  },
  CHARACTER_QUIRK: {
    label: '人设反差闪光',
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
  LORE_FRAGMENT: {
    label: '设定/规则碎片',
    color: 'text-indigo-400',
    badgeBg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400',
  },
  SCENE_IMAGE: {
    label: '画面感名场面',
    color: 'text-rose-400',
    badgeBg: 'bg-rose-500/10 border-rose-500/30 text-rose-400',
  },
  READER_SUGGESTION: {
    label: '读者神评听劝',
    color: 'text-teal-400',
    badgeBg: 'bg-teal-500/10 border-teal-500/30 text-teal-400',
  },
};

export const SparkAndReaderHubView: React.FC = () => {
  const { novel, volumes, editorContent, setEditorContent, addForeshadowing } = useNovel();

  const [sparks, setSparks] = useState<EpiphanySpark[]>([]);
  const [discussions, setDiscussions] = useState<ReaderDiscussionComment[]>([]);
  const [activeTab, setActiveTab] = useState<'SPARK_VAULT' | 'READER_HUB' | 'COLLIDER'>('SPARK_VAULT');
  const [filterStatus, setFilterStatus] = useState<SparkStatus | 'ALL'>('ALL');

  // 新灵感录入状态
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<EpiphanySparkType>('PLOT_TWIST');
  const [newTargetChapter, setNewTargetChapter] = useState<number>(3);
  const [newTags, setNewTags] = useState('高潮反转, 伏笔');

  // 读者评论粘贴解析状态
  const [rawReaderInput, setRawReaderInput] = useState('');
  const [readerPlatform, setReaderPlatform] = useState<ReaderDiscussionComment['platform']>('起点本章说');
  const [readerNameInput, setReaderNameInput] = useState('熬夜书友_8848');
  const [wovenNotice, setWovenNotice] = useState<string | null>(null);

  // 灵感对撞状态
  const [sparkAId, setSparkAId] = useState<string>('');
  const [sparkBId, setSparkBId] = useState<string>('');
  const [isColliding, setIsColliding] = useState(false);
  const [collisionResult, setCollisionResult] = useState<SparkCollisionResult | null>(null);

  useEffect(() => {
    loadAll();
  }, [novel.id]);

  const loadAll = async () => {
    const [spList, discList] = await Promise.all([
      fetchEpiphanySparks(novel.id),
      fetchReaderDiscussions(novel.id),
    ]);
    setSparks(spList);
    setDiscussions(discList);
    if (spList.length >= 2) {
      setSparkAId(spList[0].id);
      setSparkBId(spList[1].id);
    }
  };

  const allChapters = volumes.flatMap((v) => v.chapters);

  const handleAddSpark = async () => {
    if (!newTitle.trim() && !newContent.trim()) return;
    const spark: EpiphanySpark = {
      id: `spark-${Date.now()}`,
      novelId: novel.id,
      title: newTitle.trim() || newContent.trim().slice(0, 24),
      content: newContent.trim() || newTitle.trim(),
      sparkType: newType,
      source: 'AUTHOR_BRAINWAVE',
      heatScore: 90,
      status: newTargetChapter > 0 ? 'ANCHORED' : 'INBOX',
      targetChapterIndex: newTargetChapter > 0 ? newTargetChapter : undefined,
      aiWeaveAdvice: `AI 织入建议：可在第 ${newTargetChapter || 3} 章中段冲突升级时通过环境细节或角色冷语自然引出，切忌生硬直接交代。`,
      tags: newTags
        .split(/[,，\s]+/)
        .map((t) => t.trim())
        .filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    const saved = await saveEpiphanySpark(spark);
    setSparks((prev) => [saved, ...prev]);
    setNewTitle('');
    setNewContent('');
    showNotice(`✨ 已捕捉灵光一现：“${saved.title}”`);
  };

  const showNotice = (msg: string) => {
    setWovenNotice(msg);
    setTimeout(() => setWovenNotice(null), 3500);
  };

  const handleWeaveIntoManuscript = (spark: EpiphanySpark) => {
    const weaveParagraph = `\n\n【✨ 灵光织入 · ${spark.title}】\n${spark.content}\n`;
    setEditorContent((editorContent || '') + weaveParagraph);
    setSparks((prev) =>
      prev.map((s) => (s.id === spark.id ? { ...s, status: 'WOVEN' } : s))
    );
    // 同步沉淀一条伏笔记录
    addForeshadowing({
      title: `[灵光落地] ${spark.title}`,
      clueDescription: spark.content,
      plannedResolveChapterIndex: (spark.targetChapterIndex || 3) + 5,
      status: 'PLANTED',
      notes: `源自灵光一现中枢 (${spark.source})`,
    });
    showNotice(`⚡ 已将“${spark.title}”织入当前创作台正文并同步注册伏笔雷达！`);
  };

  const handleDeleteSpark = async (id: string) => {
    await deleteEpiphanySpark(novel.id, id);
    setSparks((prev) => prev.filter((s) => s.id !== id));
  };

  const handleConvertCommentToSpark = async (comment: ReaderDiscussionComment) => {
    const spark: EpiphanySpark = {
      id: `spark-reader-${Date.now()}`,
      novelId: novel.id,
      title: comment.extractedHook || `读者【${comment.readerName}】共创脑洞`,
      content: `源自${comment.platform}热评（${comment.likes}赞）：“${comment.commentText}”`,
      sparkType: 'READER_SUGGESTION',
      source: 'READER_COMMENT',
      readerUsername: `${comment.readerName} (${comment.platform})`,
      heatScore: Math.min(99, 80 + Math.floor(comment.likes / 100)),
      status: 'ANCHORED',
      targetChapterIndex: comment.chapterIndex + 2,
      aiWeaveAdvice:
        comment.sentiment === 'COMPLAINT_WARNING'
          ? '【防雷修补指令】在后续两章内通过主角的反制行动化解该槽点，将原本静态的说明转化为高张力博弈。'
          : '【听劝反转指令】顺应读者高赞猜测方向埋设半真半假的草蛇灰线，并在高潮章给出比读者猜测更深一层的反转。',
      tags: [comment.platform, '读者听劝', comment.sentiment === 'COMPLAINT_WARNING' ? '防雷补丁' : '神评脑洞'],
      createdAt: new Date().toISOString(),
    };

    const saved = await saveEpiphanySpark(spark);
    setSparks((prev) => [saved, ...prev]);
    setDiscussions((prev) =>
      prev.map((d) => (d.id === comment.id ? { ...d, convertedSparkId: saved.id } : d))
    );
    showNotice(`🎉 已采纳读者【${comment.readerName}】的神评进入灵光库（锚定第 ${spark.targetChapterIndex} 章）！`);
  };

  const handleAddRawReaderComment = () => {
    if (!rawReaderInput.trim()) return;
    const isWarning =
      rawReaderInput.includes('水') ||
      rawReaderInput.includes('毒') ||
      rawReaderInput.includes('拖沓') ||
      rawReaderInput.includes('降智');
    const newComment: ReaderDiscussionComment = {
      id: `disc-${Date.now()}`,
      novelId: novel.id,
      chapterIndex: 2,
      paragraphSnippet: '当前连载最新章节段落热议',
      readerName: readerNameInput || '热心书友',
      platform: readerPlatform,
      commentText: rawReaderInput.trim(),
      likes: Math.floor(Math.random() * 500) + 120,
      sentiment: isWarning ? 'COMPLAINT_WARNING' : 'THEORY_CRAFTING',
      extractedHook: isWarning
        ? `【防雷预警】针对读者反馈“${rawReaderInput.slice(0, 22)}...”进行节奏提速与动机加固`
        : `【读者脑洞】采纳神评：“${rawReaderInput.slice(0, 25)}...”衍生暗线伏笔`,
      createdAt: new Date().toISOString(),
    };
    setDiscussions((prev) => [newComment, ...prev]);
    setRawReaderInput('');
    showNotice('💬 已解析读者书评并提炼剧情抓手！');
  };

  const handleCollide = async () => {
    const sA = sparks.find((s) => s.id === sparkAId);
    const sB = sparks.find((s) => s.id === sparkBId);
    if (!sA || !sB) return;
    setIsColliding(true);
    try {
      const res = await collideSparks(sA, sB);
      setCollisionResult(res);
    } finally {
      setIsColliding(false);
    }
  };

  const handleSaveCollisionAsSpark = async () => {
    if (!collisionResult) return;
    const spark: EpiphanySpark = {
      id: `spark-col-${Date.now()}`,
      novelId: novel.id,
      title: collisionResult.fusionTitle,
      content: `${collisionResult.combinedPlotTwist}\n【四步节拍】${collisionResult.sceneBeatPreview}`,
      sparkType: 'PLOT_TWIST',
      source: 'AI_COLLISION',
      heatScore: 97,
      status: 'ANCHORED',
      targetChapterIndex: 6,
      aiWeaveAdvice: collisionResult.recommendedChapterPlacement,
      tags: ['双灵感聚变', '高能反转'],
      createdAt: new Date().toISOString(),
    };
    const saved = await saveEpiphanySpark(spark);
    setSparks((prev) => [saved, ...prev]);
    setActiveTab('SPARK_VAULT');
    showNotice(`🔥 已将聚变脑洞“${saved.title}”存入灵光库！`);
  };

  const filteredSparks = sparks.filter((s) =>
    filterStatus === 'ALL' ? true : s.status === filterStatus
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部栏 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lightbulb className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                灵光一现与读者热议共创中枢
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                实时脑洞捕手 & 读者听劝系统
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              随时随地记录突发灵感 · 起点本章说/番茄段评神脑洞提炼 · 双灵感对撞聚变 · 章节锚定自动织入正文
            </p>
          </div>
        </div>

        {/* 切换标签 */}
        <div className="flex items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('SPARK_VAULT')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'SPARK_VAULT'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            灵光一现速记库 ({sparks.length})
          </button>
          <button
            onClick={() => setActiveTab('READER_HUB')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'READER_HUB'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-teal-400" />
            读者本章说/讨论听劝池 ({discussions.length})
          </button>
          <button
            onClick={() => setActiveTab('COLLIDER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'COLLIDER'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <GitMerge className="w-3.5 h-3.5 text-purple-400" />
            双灵感对撞反应堆
          </button>
        </div>
      </div>

      {/* 顶部动态通知横幅 */}
      {wovenNotice && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-6 py-2.5 text-xs text-emerald-300 flex items-center justify-between">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {wovenNotice}
          </span>
        </div>
      )}

      {/* 主体内容区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* ========================================================================= */}
          {/* TAB 1: 灵光一现速记舱与章节锚定板 */}
          {/* ========================================================================= */}
          {activeTab === 'SPARK_VAULT' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左侧：3秒极速灵光录入台 */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      捕捉灵光一现 (Flash Brainwave)
                    </h2>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      随时补充，自动挂载至目标章节
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="text-[var(--text-muted)] block mb-1">
                        灵感核心标题 / 一句话钩子
                      </label>
                      <input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="如：主角在绝境中发现追杀自己的死士竟是未来的自己..."
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[var(--text-muted)] block mb-1">灵感类型</label>
                        <select
                          value={newType}
                          onChange={(e) => setNewType(e.target.value as EpiphanySparkType)}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                        >
                          <option value="PLOT_TWIST">🌪️ 神转折脑洞</option>
                          <option value="DIALOGUE_GOLD">💬 装逼金句台词</option>
                          <option value="CHARACTER_QUIRK">🎭 人设反差闪光点</option>
                          <option value="LORE_FRAGMENT">📜 世界观设定碎片</option>
                          <option value="SCENE_IMAGE">🎬 画面感名场面</option>
                          <option value="READER_SUGGESTION">💡 读者讨论补充</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[var(--text-muted)] block mb-1">
                          预定织入章节 (可选)
                        </label>
                        <select
                          value={newTargetChapter}
                          onChange={(e) => setNewTargetChapter(parseInt(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                        >
                          <option value={0}>暂存收件箱 (不指定章节)</option>
                          {allChapters.map((ch) => (
                            <option key={ch.id} value={ch.chapterIndex}>
                              第 {ch.chapterIndex} 章：{ch.title.slice(0, 12)}
                            </option>
                          ))}
                          <option value={12}>第 12 章 (远期高潮预埋)</option>
                          <option value={20}>第 20 章 (卷末收束预埋)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-[var(--text-muted)] block mb-1">
                        详细脑洞描述 / 台词片段 / 读者原话
                      </label>
                      <textarea
                        rows={4}
                        value={newContent}
                        onChange={(e) => setNewContent(e.target.value)}
                        placeholder="写下突然想到的细节、对白、诡计、或者读者群里讨论出来的神展开..."
                        className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] leading-relaxed font-serif"
                      />
                    </div>

                    <div>
                      <label className="text-[var(--text-muted)] block mb-1">标签索引</label>
                      <input
                        value={newTags}
                        onChange={(e) => setNewTags(e.target.value)}
                        placeholder="用逗号分隔，如：反转, 师尊, 伏笔"
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                      />
                    </div>

                    <button
                      onClick={handleAddSpark}
                      className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      存入灵光金库并生成 AI 织入建议
                    </button>
                  </div>
                </div>
              </div>

              {/* 右侧：灵光卡片瀑布流 */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {(['ALL', 'INBOX', 'ANCHORED', 'WOVEN'] as const).map((st) => (
                      <button
                        key={st}
                        onClick={() => setFilterStatus(st)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                          filterStatus === st
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                            : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {st === 'ALL'
                          ? `全部灵感 (${sparks.length})`
                          : st === 'INBOX'
                          ? '待分配收件箱'
                          : st === 'ANCHORED'
                          ? '已锚定章节'
                          : '已织入正文'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  {filteredSparks.map((sp) => {
                    const meta = SPARK_TYPE_META[sp.sparkType] || SPARK_TYPE_META.PLOT_TWIST;
                    return (
                      <div
                        key={sp.id}
                        className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3 hover:border-[var(--border-medium)] transition-all"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${meta.badgeBg}`}
                              >
                                {meta.label}
                              </span>
                              {sp.targetChapterIndex && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-mono flex items-center gap-1">
                                  <Anchor className="w-3 h-3" />
                                  锚定第 {sp.targetChapterIndex} 章
                                </span>
                              )}
                              {sp.status === 'WOVEN' && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                  ✓ 已织入正文
                                </span>
                              )}
                              {sp.readerUsername && (
                                <span className="text-[10px] text-teal-400 font-medium">
                                  💬 共创读者: {sp.readerUsername}
                                </span>
                              )}
                            </div>
                            <h3 className="text-sm font-bold text-[var(--text-main)] font-serif pt-1">
                              {sp.title}
                            </h3>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" />
                              {sp.heatScore}
                            </span>
                            <button
                              onClick={() => handleDeleteSpark(sp.id)}
                              className="p-1 text-[var(--text-muted)] hover:text-rose-400 transition-colors"
                              title="删除该灵感"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-[var(--text-main)] leading-relaxed font-serif bg-[var(--bg-canvas)] p-3.5 rounded-lg border border-[var(--border-subtle)]">
                          {sp.content}
                        </p>

                        {sp.aiWeaveAdvice && (
                          <div className="text-[11px] text-indigo-300 bg-indigo-500/5 border border-indigo-500/20 px-3 py-2 rounded-lg flex items-start gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                            <span>{sp.aiWeaveAdvice}</span>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--border-subtle)]">
                          <div className="flex flex-wrap gap-1.5">
                            {sp.tags.map((t, idx) => (
                              <span
                                key={idx}
                                className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                              >
                                #{t}
                              </span>
                            ))}
                          </div>

                          <button
                            onClick={() => handleWeaveIntoManuscript(sp)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 text-xs font-medium flex items-center gap-1.5 transition-colors"
                          >
                            <Feather className="w-3.5 h-3.5" />
                            一键织入当前正文 & 埋设伏笔
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: 读者本章说/段评讨论听劝池 */}
          {/* ========================================================================= */}
          {activeTab === 'READER_HUB' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左侧：粘贴或录入读者书评讨论 */}
              <div className="lg:col-span-5 space-y-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
                  <div className="border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-teal-400" />
                      导入读者书评 / 书友群讨论热帖
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      将读者在评论区的脑洞猜测或槽点反馈粘贴进来，AI 自动提炼为可落地的剧情补丁
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-[var(--text-muted)] block mb-1">来源社区渠道</label>
                      <select
                        value={readerPlatform}
                        onChange={(e) => setReaderPlatform(e.target.value as any)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                      >
                        <option value="起点本章说">起点本章说</option>
                        <option value="番茄段评">番茄小说段评</option>
                        <option value="书友群">VIP 读者书友群</option>
                        <option value="贴吧热议">贴吧/NGA 推书楼</option>
                        <option value="B站漫评">B站/抖音推文评论</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[var(--text-muted)] block mb-1">读者昵称</label>
                      <input
                        value={readerNameInput}
                        onChange={(e) => setReaderNameInput(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                      />
                    </div>
                  </div>

                  <div className="text-xs">
                    <label className="text-[var(--text-muted)] block mb-1">
                      读者讨论原话 / 猜测脑洞
                    </label>
                    <textarea
                      rows={4}
                      value={rawReaderInput}
                      onChange={(e) => setRawReaderInput(e.target.value)}
                      placeholder="例如：我猜那个卖糖葫芦的瞎子肯定是前朝太监总管！如果他突然拔出绣春刀救场就太帅了..."
                      className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] leading-relaxed"
                    />
                  </div>

                  <button
                    onClick={handleAddRawReaderComment}
                    className="w-full py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    解析读者评论并提炼共创钩子
                  </button>
                </div>
              </div>

              {/* 右侧：读者热议解析列表 */}
              <div className="lg:col-span-7 space-y-4">
                {discussions.map((disc) => (
                  <div
                    key={disc.id}
                    className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[var(--text-main)]">
                          @{disc.readerName}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)]">
                          {disc.platform} · 第 {disc.chapterIndex} 章
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                            disc.sentiment === 'COMPLAINT_WARNING'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                          }`}
                        >
                          {disc.sentiment === 'COMPLAINT_WARNING'
                            ? '⚠️ 节奏/毒点防雷预警'
                            : '🧠 读者野生神推演'}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-amber-400 flex items-center gap-1">
                        <ThumbsUp className="w-3.5 h-3.5" />
                        {disc.likes} 赞
                      </span>
                    </div>

                    <div className="text-[11px] text-[var(--text-muted)] italic border-l-2 border-[var(--border-medium)] pl-3">
                      原文段落：{disc.paragraphSnippet}
                    </div>

                    <p className="text-xs text-[var(--text-main)] leading-relaxed bg-[var(--bg-canvas)] p-3.5 rounded-lg border border-[var(--border-subtle)]">
                      “{disc.commentText}”
                    </p>

                    {disc.extractedHook && (
                      <div className="flex items-center justify-between gap-3 pt-2 border-t border-[var(--border-subtle)]">
                        <div className="text-xs text-teal-400 font-medium flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>AI 提炼抓手：{disc.extractedHook}</span>
                        </div>

                        {disc.convertedSparkId ? (
                          <span className="text-xs text-emerald-400 font-medium shrink-0">
                            ✓ 已收入灵光金库
                          </span>
                        ) : (
                          <button
                            onClick={() => handleConvertCommentToSpark(disc)}
                            className="px-3 py-1.5 rounded-lg bg-teal-500/15 hover:bg-teal-500/25 text-teal-300 border border-teal-500/30 text-xs font-medium shrink-0 transition-colors"
                          >
                            ✨ 听劝采纳为灵光设定
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: 双灵感对撞聚变反应堆 */}
          {/* ========================================================================= */}
          {activeTab === 'COLLIDER' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-2">
                <h2 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                  <GitMerge className="w-4 h-4" />
                  双灵感对撞聚变反应堆 (Spark Collider)
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  真正的神展开往往诞生于两个毫不相干的脑洞强行碰撞。从您的灵光库中任选两个独立点子（例如一条读者评论 + 一个反派怪癖），引擎将把它们聚变为一场高密度戏剧冲突！
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="font-semibold text-[var(--text-main)] block mb-1.5">
                      选择对撞粒子 A
                    </label>
                    <select
                      value={sparkAId}
                      onChange={(e) => setSparkAId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                    >
                      {sparks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-semibold text-[var(--text-main)] block mb-1.5">
                      选择对撞粒子 B
                    </label>
                    <select
                      value={sparkBId}
                      onChange={(e) => setSparkBId(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                    >
                      {sparks.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleCollide}
                  disabled={isColliding || sparks.length < 2}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all"
                >
                  {isColliding ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      正在引爆双灵感粒子对撞...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      启动对撞：合成高能神转折桥段
                    </>
                  )}
                </button>

                {collisionResult && (
                  <div className="p-5 rounded-xl bg-[var(--bg-canvas)] border border-purple-500/30 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-purple-300 font-serif">
                        {collisionResult.fusionTitle}
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 font-mono">
                        戏剧张力增益 +{collisionResult.dramaticTensionBonus}%
                      </span>
                    </div>

                    <p className="text-xs text-[var(--text-main)] leading-relaxed font-serif">
                      {collisionResult.combinedPlotTwist}
                    </p>

                    <div className="p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] font-mono">
                      {collisionResult.sceneBeatPreview}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-indigo-400">
                        {collisionResult.recommendedChapterPlacement}
                      </span>
                      <button
                        onClick={handleSaveCollisionAsSpark}
                        className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
                      >
                        收录至灵光金库
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
