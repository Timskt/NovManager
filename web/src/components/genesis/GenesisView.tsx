// ==============================================================================
// 灵感创世纪大纲生成系统 (Idea-to-Universe Genesis Engine)
// 商业级叙事架构：从一句话灵感衍生三卷宏大主线、黄金三章开篇推演、
// 角色羁绊与致命性格缺陷、金手指五阶进化树、平行多元宇宙分支矩阵与一键合入工程
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  IdeaGenesisInput,
  IdeaGenesisResponse,
  MultiverseBranch,
  CheatEvolutionNode,
} from '../../types/novel';
import {
  generateIdeaGenesisOutline,
  fetchMultiverseBranches,
} from '../../lib/api';
import {
  Sparkles,
  GitBranch,
  Crown,
  Zap,
  BookOpen,
  Layers,
  ArrowRight,
  CheckCircle,
  Copy,
  Check,
  RefreshCw,
  Flame,
  Shield,
  Compass,
  FileText,
  Sliders,
  Workflow,
  Plus,
} from 'lucide-react';

export const GenesisView: React.FC = () => {
  const { createNovelFromFramework } = useNovel();

  const [logline, setLogline] = useState<string>(
    '宗门被灭前夕，重伤垂死的杂役弟子意外觉醒能逆转三息因果的残破铜镜，在万众追杀中步步反杀，最终重定天地因果秩序。'
  );
  const [genre, setGenre] = useState<string>('玄幻修仙 / 因果苟道');
  const [targetWordCount, setTargetWordCount] = useState<number>(1500000);
  const [tone, setTone] = useState<string>('杀伐果断、沉稳谨慎、步步为营');
  const [coreHook, setCoreHook] = useState<string>('开局必死残局反杀，反派智商在线，信息差拉扯');
  const [goldenFingerType, setGoldenFingerType] = useState<string>('因果溯源命盘 (微调未来因果)');
  const [selectedTropes, setSelectedTropes] = useState<string[]>([
    '宗门覆灭残局',
    '易容黑市潜伏',
    '跨境界反杀',
    '幕后恩师反派',
  ]);

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genesisData, setGenesisData] = useState<IdeaGenesisResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'GOLDEN_THREE' | 'VOLUMES' | 'CHEAT_TREE' | 'MULTIVERSE'>('OVERVIEW');

  // 多元宇宙时间线状态
  const [multiverseBranches, setMultiverseBranches] = useState<MultiverseBranch[]>([]);
  const [divergencePoint, setDivergencePoint] = useState<string>(
    '第一章末尾，主角搜尸时发现恩师密信，面临【立即南逃隐匿】还是【返城潜伏调查】的宿命抉择'
  );
  const [isBranching, setIsBranching] = useState<boolean>(false);
  const [deployedSuccess, setDeployedSuccess] = useState<boolean>(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setDeployedSuccess(false);
    try {
      const input: IdeaGenesisInput = {
        logline,
        genre,
        targetWordCount,
        tone,
        coreHook,
        tropes: selectedTropes,
        goldenFingerType,
      };
      const res = await generateIdeaGenesisOutline(input);
      setGenesisData(res);
      setActiveTab('OVERVIEW');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFetchMultiverse = async () => {
    setIsBranching(true);
    try {
      const branches = await fetchMultiverseBranches('nov-genesis', divergencePoint);
      setMultiverseBranches(branches);
      setActiveTab('MULTIVERSE');
    } finally {
      setIsBranching(false);
    }
  };

  const handleDeployToStudio = () => {
    if (!genesisData) return;
    // 构造工程框架并载入本地上下文
    createNovelFromFramework({
      title: genesisData.novelTitle,
      genre,
      logline,
      targetWordCount,
      styleGuide: {
        tone,
        pacing: '紧凑层层递进',
        descriptionDensity: '工笔白描与动作链结合',
        forbiddenPhrases: ['恐怖如斯', '倒吸一口凉气'],
      },
      worldSettings: genesisData.worldSettings.map((w) => ({
        category: w.category,
        name: w.name,
        aliases: [],
        content: w.content,
        priority: 1,
        tags: ['创世纪生成'],
      })),
      characters: genesisData.mainCharacters.map((c) => ({
        character: {
          name: c.name,
          roleType: c.roleType,
          gender: '男',
          profile: {
            appearance: c.appearance,
            fatalFlaw: c.fatalFlaw,
            catchphrases: c.catchphrases,
            personalityTraits: ['谨慎', '心细如发'],
            voiceAndTone: '冷峻低沉',
            coreMotivation: '守护仅存同门并查明真相',
          },
          background: c.background,
        },
        initialState: {
          chapterId: 'chap-011',
          chapterIndex: 1,
          location: '山神庙废墟',
          combatPower: '聚气境初期 (120)',
          healthStatus: 'INJURED' as const,
          statusTags: ['重伤咳血', '因果铜镜认主', '经脉受损'],
          stateSummary: '宗门遭血洗后唯一幸存者，手持残破因果铜镜。',
        },
      })),
      volumes: genesisData.volumes.map((v) => ({
        volume: {
          volumeIndex: v.volumeIndex,
          title: v.title,
          summary: v.summary,
          mainConflict: v.mainConflict,
          targetClimax: v.targetClimax,
          boundaryConstraints: v.boundaryConstraints,
        },
        chapters:
          v.volumeIndex === 1
            ? genesisData.goldenThreeChapters.map((ch) => ({
                chapter: {
                  chapterIndex: ch.chapterIndex,
                  title: ch.title,
                  outline: `【开篇钩子】${ch.hook}\n【核心冲突】${ch.conflict}\n【爽点兑现】${ch.climaxPayoff}\n【断章悬念】${ch.cliffhanger}`,
                  wordCountGoal: 3000,
                  actualWordCount: 0,
                  status: 'SCENED' as const,
                  povCharacterId: 'char-protagonist',
                },
                scenes: [
                  {
                    sceneIndex: 1,
                    sceneGoal: '破局自救与初探神镜',
                    conflict: ch.conflict,
                    turnPoint: '激活因果铜镜逆转一息杀招',
                    outcome: ch.climaxPayoff,
                    involvedCharacterIds: ['char-protagonist'],
                    location: '山神庙正殿',
                    draftContent: '',
                  },
                ],
              }))
            : [],
      })),
      foreshadowings: [
        {
          title: '恩师佩剑上的暗红印鉴',
          clueDescription: '追杀令上的火漆封口有着特有的云雷暗纹',
          plannedResolveChapterIndex: 15,
          status: 'PLANTED',
          notes: '证实师门遭血洗乃内鬼引路',
        },
      ],
    });

    setDeployedSuccess(true);
    setTimeout(() => setDeployedSuccess(false), 3000);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部标题横幅 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-pink-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                灵感创世纪大纲生成引擎
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Universe Genesis Engine
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              一句话脑洞推演 · 黄金三章断章钩子 · 金手指五阶跃迁 · 多元宇宙时间线分支 · 一键合入工程
            </p>
          </div>
        </div>

        {genesisData && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeployToStudio}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-all"
            >
              {deployedSuccess ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  已成功合入当前小说工程！
                </>
              ) : (
                <>
                  <Workflow className="w-4 h-4" />
                  一键部署载入创制作坊
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* 主体工作区 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 输入表单中枢 */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
              <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                <Crown className="w-4 h-4 text-amber-400" />
                第一步：注入原始核心脑洞与题材锚点
              </h2>
              <span className="text-xs text-[var(--text-muted)]">
                支持任何零碎灵感、设定集片段或一句话梗概
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                核心脑洞灵感 (Logline / Premise)
              </label>
              <textarea
                rows={3}
                value={logline}
                onChange={(e) => setLogline(e.target.value)}
                placeholder="例如：主角在灭门夜觉醒能借用未来寿元的系统，发现仇家竟是自己三百年后的转世之身..."
                className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-serif"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="text-[var(--text-muted)] block mb-1.5">题材流派分类</label>
                <select
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                >
                  <option value="玄幻修仙 / 因果苟道">玄幻修仙 / 因果苟道</option>
                  <option value="维多利亚 / 诡秘克苏鲁">维多利亚 / 诡秘克苏鲁</option>
                  <option value="赛博朋克 / 机械飞升">赛博朋克 / 机械飞升</option>
                  <option value="历史权谋 / 铁血争霸">历史权谋 / 铁血争霸</option>
                  <option value="都市异能 / 灵气复苏">都市异能 / 灵气复苏</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1.5">目标规划字数</label>
                <select
                  value={targetWordCount}
                  onChange={(e) => setTargetWordCount(parseInt(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)] font-mono"
                >
                  <option value={800000}>80 万字 (精品中篇)</option>
                  <option value={1500000}>150 万字 (经典长篇)</option>
                  <option value={3000000}>300 万字 (诸天巨构)</option>
                </select>
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1.5">基调与叙事色彩</label>
                <input
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="如：杀伐果断、严谨克制"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                />
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1.5">核心金手指挂载</label>
                <input
                  value={goldenFingerType}
                  onChange={(e) => setGoldenFingerType(e.target.value)}
                  placeholder="如：因果逆转、熟练度面板"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-main)]"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !logline.trim()}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-medium rounded-lg text-xs shadow-lg flex items-center justify-center gap-2 transition-all"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  架构推演引擎全速运算中（推演三卷大纲与黄金三章）...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  开始推演：生成三卷宇宙宏构与黄金三章细纲
                </>
              )}
            </button>
          </div>

          {/* 生成结果展示中枢 */}
          {genesisData && (
            <div className="space-y-4">
              {/* 结果内部标签页 */}
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2">
                <button
                  onClick={() => setActiveTab('OVERVIEW')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'OVERVIEW'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  全书总览与人设
                </button>
                <button
                  onClick={() => setActiveTab('GOLDEN_THREE')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'GOLDEN_THREE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5 text-amber-300" />
                  黄金三章高光蓝图
                </button>
                <button
                  onClick={() => setActiveTab('VOLUMES')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'VOLUMES'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  三卷宏观主线架构
                </button>
                <button
                  onClick={() => setActiveTab('CHEAT_TREE')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'CHEAT_TREE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-300" />
                  金手指五阶跃迁树
                </button>
                <button
                  onClick={() => setActiveTab('MULTIVERSE')}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
                    activeTab === 'MULTIVERSE'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <GitBranch className="w-3.5 h-3.5 text-teal-300" />
                  多元宇宙分支推演
                </button>
              </div>

              {/* 1. 全书总览与人设 */}
              {activeTab === 'OVERVIEW' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
                    <div>
                      <div className="text-xs text-indigo-400 font-semibold tracking-wider uppercase">
                        生成的作品定名
                      </div>
                      <h2 className="text-2xl font-bold text-[var(--text-main)] font-serif mt-1">
                        {genesisData.novelTitle}
                      </h2>
                    </div>

                    <div className="p-4 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-serif">
                      {genesisData.synopsis}
                    </div>

                    <div className="space-y-3">
                      <div className="text-xs font-semibold text-[var(--text-main)]">
                        核心世界观底层法度 ({genesisData.worldSettings.length})
                      </div>
                      <div className="space-y-2">
                        {genesisData.worldSettings.map((w, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs"
                          >
                            <span className="font-bold text-indigo-400">【{w.name}】</span>
                            <span className="text-[var(--text-muted)] ml-2">{w.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
                    <div className="text-xs font-bold text-[var(--text-main)]">
                      核心登场角色谱系与致命缺陷
                    </div>

                    <div className="space-y-3">
                      {genesisData.mainCharacters.map((c, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[var(--text-main)]">{c.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400">
                              {c.roleType}
                            </span>
                          </div>
                          <div className="text-[var(--text-muted)]">{c.appearance}</div>
                          <div className="text-rose-400/90 text-[11px]">
                            ⚠️ 致命性格缺陷: {c.fatalFlaw}
                          </div>
                          <div className="text-amber-400/90 text-[11px] font-mono">
                            口头禅: {c.catchphrases.join(' ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 2. 黄金三章高光蓝图 */}
              {activeTab === 'GOLDEN_THREE' && (
                <div className="space-y-4">
                  {genesisData.goldenThreeChapters.map((ch) => (
                    <div
                      key={ch.chapterIndex}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2.5">
                        <span className="font-bold text-sm text-[var(--text-main)] font-serif">
                          {ch.title}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          第 {ch.chapterIndex} 章抓手
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                        <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                          <span className="font-bold text-indigo-400">⚡ 开篇吸睛钩子 (Hook)</span>
                          <p className="text-[var(--text-muted)] leading-relaxed">{ch.hook}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                          <span className="font-bold text-rose-400">⚔️ 核心矛盾冲突 (Conflict)</span>
                          <p className="text-[var(--text-muted)] leading-relaxed">{ch.conflict}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                          <span className="font-bold text-emerald-400">🏆 爽点兑现收束 (Payoff)</span>
                          <p className="text-[var(--text-muted)] leading-relaxed">{ch.climaxPayoff}</p>
                        </div>
                        <div className="p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1">
                          <span className="font-bold text-amber-400">🪝 终末断章悬念 (Cliffhanger)</span>
                          <p className="text-[var(--text-muted)] leading-relaxed">{ch.cliffhanger}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 3. 三卷宏观主线架构 */}
              {activeTab === 'VOLUMES' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {genesisData.volumes.map((v) => (
                    <div
                      key={v.volumeIndex}
                      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="text-xs text-indigo-400 font-mono font-bold">
                          VOLUME 0{v.volumeIndex}
                        </div>
                        <h3 className="font-bold text-base text-[var(--text-main)] font-serif">
                          {v.title}
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          {v.summary}
                        </p>
                      </div>

                      <div className="space-y-2 text-xs pt-3 border-t border-[var(--border-subtle)]">
                        <div>
                          <span className="text-rose-400 font-semibold">卷主矛盾:</span>
                          <span className="text-[var(--text-main)] ml-1">{v.mainConflict}</span>
                        </div>
                        <div>
                          <span className="text-amber-400 font-semibold">收束高潮:</span>
                          <span className="text-[var(--text-main)] ml-1">{v.targetClimax}</span>
                        </div>
                        <div className="text-[11px] text-[var(--text-muted)] bg-[var(--bg-canvas)] p-2 rounded border border-[var(--border-subtle)]">
                          战力与边界约束: {v.boundaryConstraints}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 4. 金手指五阶跃迁树 */}
              {activeTab === 'CHEAT_TREE' && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
                  <div className="border-b border-[var(--border-subtle)] pb-3">
                    <h2 className="text-base font-bold text-amber-400 flex items-center gap-2">
                      <Zap className="w-5 h-5" />
                      {genesisData.cheatSystem.systemName}
                    </h2>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      底层运行机制: {genesisData.cheatSystem.coreMechanism}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {genesisData.cheatSystem.progressionNodes.map((node) => (
                      <div
                        key={node.tier}
                        className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex flex-wrap md:flex-nowrap items-center gap-4"
                      >
                        <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono font-bold flex items-center justify-center shrink-0">
                          T{node.tier}
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="font-bold text-sm text-[var(--text-main)]">
                            {node.name}
                          </div>
                          <div className="text-xs text-[var(--text-muted)]">
                            {node.powerDescription}
                          </div>
                        </div>
                        <div className="text-xs space-y-1 text-right md:w-64">
                          <div className="text-indigo-400 font-semibold">
                            解锁契机: {node.unlockCondition}
                          </div>
                          <div className="text-rose-400/90 text-[11px]">
                            代价副作用: {node.sideEffectOrCost}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5. 多元宇宙平行分支推演 */}
              {activeTab === 'MULTIVERSE' && (
                <div className="space-y-6">
                  <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                          <GitBranch className="w-4 h-4 text-teal-400" />
                          平行时间线分歧点推演沙盒
                        </h3>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          设定关键分歧点，自动推演 3 种完全不同因果走向并剖析剧情优劣
                        </p>
                      </div>
                      <button
                        onClick={handleFetchMultiverse}
                        disabled={isBranching}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center gap-1.5 transition-colors"
                      >
                        {isBranching ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            正在推演分支因果树...
                          </>
                        ) : (
                          <>
                            <GitBranch className="w-3.5 h-3.5" />
                            推演三大平行时间线
                          </>
                        )}
                      </button>
                    </div>

                    <textarea
                      rows={2}
                      value={divergencePoint}
                      onChange={(e) => setDivergencePoint(e.target.value)}
                      className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                    />
                  </div>

                  {multiverseBranches.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {multiverseBranches.map((b) => (
                        <div
                          key={b.branchId}
                          className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-5 space-y-4 flex flex-col justify-between"
                        >
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm text-[var(--text-main)] font-serif">
                              {b.title}
                            </h4>
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                              {b.summary}
                            </p>
                            <div className="text-xs font-semibold text-teal-400 mt-2">
                              终局高潮: {b.climaxOutcome}
                            </div>
                          </div>

                          <div className="space-y-1.5 text-[11px] pt-3 border-t border-[var(--border-subtle)]">
                            <div className="text-emerald-400">✓ 优势: {b.pros}</div>
                            <div className="text-rose-400">× 风险: {b.cons}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
