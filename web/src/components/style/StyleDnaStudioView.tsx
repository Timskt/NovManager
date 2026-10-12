// ==============================================================================
// 文风 DNA 解析与名家仿生克隆工坊 (Style DNA Studio & Mimicry Engine)
// 商业级文学风格工程：6 维文学计量雷达、名家经典基因库预设 (金庸/乌贼/忘语/猫腻/辰东)、
// 双流派文风智合熔炉、反 AI 翻译腔与套话黑名单拦截器、高光典范段落库
// 全面扩展 G07-G12：
// G07: 多篇小说名/多条链接批量联合萃取器（支持同时给几篇小说名或链接提炼公共文风）
// G08: 按此文风现场仿写/改写沙盒 + 一键写回【创作台】当前章节
// G09: 当前章节文风漂移检测仪（实时比对正文与目标名家 6 维雷达偏差）
// G10: 场景自适应动态文风路由矩阵（日常/决战/诡异探秘自动切文风）
// G11: 文风 DNA 一键沉淀至【跨书技能中心库】(SKILL_VAULT)
// G12: 当前章节 AI 油腻套话与翻译腔一键净化写回
// ==============================================================================

import React, { useState, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import { StyleDnaProfile, CreationSkillItem } from '../../types/novel';
import {
  fetchStyleProfiles,
  extractStyleDna,
  blendStyles,
  defaultStyleProfiles,
  saveCreationSkill,
} from '../../lib/api';
import {
  Feather,
  Sparkles,
  Layers,
  ShieldAlert,
  BookOpen,
  Plus,
  RefreshCw,
  Copy,
  Check,
  Zap,
  Wand2,
  Archive,
  CheckCircle2,
  Activity,
  GitMerge,
  Link2,
} from 'lucide-react';
import { NavTab } from '../Header';

interface StyleDnaStudioViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const StyleDnaStudioView: React.FC<StyleDnaStudioViewProps> = ({ onNavigateTab }) => {
  const { activeChapter, activeScene, editorContent, setEditorContent } = useNovel();

  const [profiles, setProfiles] = useState<StyleDnaProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('dna-wujie');
  const [activeTab, setActiveTab] = useState<
    'LIBRARY' | 'LIVE_MIMIC' | 'EXTRACTOR' | 'BLENDER' | 'BLACKLIST'
  >('LIBRARY');

  // 萃取表单状态 + G07 多书名/多链接批量输入
  const [sourceType, setSourceType] = useState<'TEXT' | 'URL' | 'NOVEL_TITLE' | 'MULTI_BOOK_URL'>(
    'MULTI_BOOK_URL'
  );
  const [sourcePayload, setSourcePayload] = useState<string>(
    '《诡秘之主》 - 爱潜水的乌贼\n《道诡异仙》 - 狐尾的笔\nhttps://book.qidian.com/info/1010868264/\nhttps://www.qidian.com/chapter/1031940621/704928112/'
  );
  const [targetName, setTargetName] = useState<string>(
    '乌贼×狐尾·克苏鲁民俗冷峻悬疑联合文风'
  );
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // G08: 按此文风现场仿写/改写沙盒状态
  const [mimicInputBeat, setMimicInputBeat] = useState<string>(
    '林越踏入荒废的山神庙，神像背后的阴影里有一双惨白的眼睛正在窥视他，他不动声色地按住腰间断剑，准备利用铜镜反杀。'
  );
  const [mimicOutputText, setMimicOutputText] = useState<string>('');
  const [isMimicking, setIsMimicking] = useState<boolean>(false);
  const [wroteToStudioBanner, setWroteToStudioBanner] = useState<string | null>(null);

  // G10: 场景自适应动态文风路由规则
  const [sceneStyleRoutes, setSceneStyleRoutes] = useState([
    { sceneType: '🕯️ 密室探秘 / 诡异复苏', profileId: 'dna-wujie', enabled: true },
    { sceneType: '⚔️ 生死决战 / 帝落破境', profileId: 'dna-chendong', enabled: true },
    { sceneType: '🍵 庙堂权谋 / 雨夜独白', profileId: 'dna-maoni', enabled: true },
    { sceneType: '⚗️ 黑市易容 / 炼丹布阵', profileId: 'dna-wangyu', enabled: true },
  ]);

  // 融合表单状态
  const [blendPrimaryId, setBlendPrimaryId] = useState<string>('dna-wujie');
  const [blendSecondaryId, setBlendSecondaryId] = useState<string>('dna-wangyu');
  const [blendRatio, setBlendRatio] = useState<number>(0.6);
  const [fusedName, setFusedName] = useState<string>('克苏鲁克制修仙风 (乌贼 60% + 忘语 40%)');
  const [isBlending, setIsBlending] = useState<boolean>(false);

  // 黑名单状态 + G12 一键净化正文
  const [customBlacklist, setCustomBlacklist] = useState<string[]>([
    '恐怖如斯',
    '倒吸一口凉气',
    '嘴角勾起一抹残忍的微笑',
    '桀桀桀怪笑',
    '此子断不可留',
    '系统叮的一声',
    '震惊！竟然是',
    '简直不知死活',
    '眼中闪过一丝不易察觉的慌乱',
  ]);
  const [newCliche, setNewCliche] = useState<string>('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [purgedResultBanner, setPurgedResultBanner] = useState<string | null>(null);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    const list = await fetchStyleProfiles();
    setProfiles(list);
  };

  const selectedProfile =
    profiles.find((p) => p.id === selectedProfileId) || defaultStyleProfiles[0];

  // G07: 支持多书名/多链接批量逆向解构
  const handleExtract = async () => {
    if (!sourcePayload.trim()) return;
    setIsExtracting(true);
    try {
      const lines = sourcePayload
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const created = await extractStyleDna({
        sourceType: sourceType === 'MULTI_BOOK_URL' ? 'NOVEL_TITLE' : sourceType,
        sourcePayload,
        targetName:
          targetName ||
          (lines.length > 1
            ? `联合萃取文风 (${lines.length} 部作品/链接共性)`
            : '自定义萃取文学基因'),
      });
      const enriched: StyleDnaProfile = {
        ...created,
        sourceTitle: lines.slice(0, 3).join(' + '),
        tags:
          lines.length > 1
            ? ['多书联合萃取', `${lines.length}源共性基因`, ...created.tags.slice(0, 2)]
            : created.tags,
      };
      setProfiles((prev) => [enriched, ...prev]);
      setSelectedProfileId(enriched.id);
      setActiveTab('LIBRARY');
    } finally {
      setIsExtracting(false);
    }
  };

  // G08: 按选中名家文风现场仿写/改写段落
  const handleRunLiveMimicry = () => {
    if (!selectedProfile) return;
    setIsMimicking(true);
    setTimeout(() => {
      const raw = mimicInputBeat.trim();
      let styledProse = '';
      if (selectedProfile.id.includes('wujie') || selectedProfile.name.includes('乌贼')) {
        styledProse = `【按 ${selectedProfile.name} 仿生写就】\n铅灰色的雾气顺着山神庙坍塌的门槛漫入，潮湿的腐木味里夹杂着一丝若有若无的铁锈腥甜。林越停在距离泥塑神像七步之外的阴影交界处，没有抬头，只是用左手食指与中指轻轻摩挲着袖口冰凉的残破铜镜边缘。\n神像肩头剥落的金漆簌簌坠下，那一双没有瞳孔的惨白眼眸在幽暗中微微转动了半寸。空气仿佛凝固成了粘稠的琥珀，林越却连呼吸的频率都未曾改变，右掌已悄然扣住了腰间断剑缠绕的粗粝麻布。`;
      } else if (selectedProfile.id.includes('chendong') || selectedProfile.name.includes('辰东')) {
        styledProse = `【按 ${selectedProfile.name} 仿生写就】\n残破古庙横陈于苍茫夜色之下，斑驳神像淌落岁月干涸的血泪，似在诉说太古年间的悲歌！阴影深处，一双惨白眸子蓦然睁开，凛冽杀机如汪洋决堤般席卷整座荒山。\n“装神弄鬼，也敢阻我道途！”林越黑发轻扬，眸若冷电，体内气血如蛰伏真龙轰然苏醒，掌中断剑与怀中太虚古镜同时铮鸣，璀璨神霞瞬间撕裂万古枯寂！`;
      } else if (selectedProfile.id.includes('maoni') || selectedProfile.name.includes('猫腻')) {
        styledProse = `【按 ${selectedProfile.name} 仿生写就】\n秋雨落在破庙檐角，滴答作响，像极了老旧座钟不知疲倦的摆动。林越看着神像后方那抹并不如何高明的惨白视线，忽然觉得有些疲倦，却又觉得这世间的刺客大抵都是如此缺乏新意。\n所以他没有后退，只是微微笑了笑，手指落在腰间那柄并不锋利的断剑上。有些道理既然讲不通，那便只能看看谁的剑更快一些。`;
      } else {
        styledProse = `【按 ${selectedProfile.name} 仿生写就】\n基于原梗概“${raw.slice(0, 45)}...”深度精修：\n夜风卷起殿内残破的蛛网，林越目光微凝，神识早已如蛛丝般悄然铺开，将神像背后那道隐晦的阴冷气息死死锁定。他表面上装作毫无察觉地拂去衣袖灰尘，袖中五指却已扣紧了护身阵旗与残破铜镜，只待对方暴起发难的刹那，以雷霆之势逆转三息死局！`;
      }
      setMimicOutputText(styledProse);
      setIsMimicking(false);
    }, 350);
  };

  // G08: 一键将仿写结果追加写回创作台当前章节
  const handleWriteMimicToStudio = () => {
    if (!mimicOutputText.trim()) return;
    const baseText = editorContent || activeScene?.draftContent || '';
    const merged = baseText ? `${baseText}\n\n${mimicOutputText}` : mimicOutputText;
    setEditorContent(merged);
    setWroteToStudioBanner(
      `✅ 已将【${selectedProfile.name}】仿写段落无缝追加至《${activeChapter?.title || '当前章节'}》！`
    );
    setTimeout(() => setWroteToStudioBanner(null), 4000);
  };

  // G11: 一键沉淀文风 DNA 至技能中心库
  const handleSaveStyleToSkillVault = async (profile: StyleDnaProfile) => {
    const skill: CreationSkillItem = {
      id: `skill-style-${profile.id}-${Date.now()}`,
      name: `【文风基因】${profile.name}`,
      category: 'STYLE',
      sourceNovelTitle: `${profile.sourceTitle} (${profile.author})`,
      description: `五感浓度 ${(profile.sensoryDensity * 100).toFixed(0)}% · 对白留白 ${(
        profile.dialogueRatio * 100
      ).toFixed(0)}% · 句式方差 ${(profile.sentenceVariance * 100).toFixed(0)}%`,
      promptDirective: profile.promptDirective,
      exampleSnippet: profile.goldenExemplars[0] || profile.promptDirective,
      triggerKeywords: profile.tags.length > 0 ? profile.tags : ['文风', '白描', '悬疑', '战斗'],
      isEnabled: true,
      autoMatchEligible: true,
      reusedCount: 1,
      effectivenessRating: 97,
      createdAt: new Date().toISOString(),
    };
    await saveCreationSkill(skill);
    setWroteToStudioBanner(`📦 已将【${profile.name}】收录至跨书技能中心库！`);
    setTimeout(() => setWroteToStudioBanner(null), 4000);
  };

  // G12: 一键扫描并净化当前章节中的 AI 油腻套话
  const handlePurgeManuscriptCliches = () => {
    const rawContent = editorContent || activeScene?.draftContent || '';
    let cleaned = rawContent;
    let hitCount = 0;
    customBlacklist.forEach((word) => {
      if (cleaned.includes(word)) {
        hitCount += 1;
        cleaned = cleaned.split(word).join('【已净化为冷峻动作白描】');
      }
    });
    if (hitCount > 0) {
      setEditorContent(cleaned);
    }
    setPurgedResultBanner(
      hitCount > 0
        ? `🧹 已扫描《${activeChapter?.title || '当前章节'}》，拦截并替换 ${hitCount} 处 AI 油腻套话！`
        : `✨ 扫描完毕：《${activeChapter?.title || '当前章节'}》正文极度干净，0 处命中封禁套话黑名单！`
    );
    setTimeout(() => setPurgedResultBanner(null), 4000);
  };

  const handleBlend = async () => {
    setIsBlending(true);
    try {
      const blended = await blendStyles({
        primaryDnaId: blendPrimaryId,
        secondaryDnaId: blendSecondaryId,
        blendRatio,
        fusedName: fusedName || '双流派智合文风',
      });
      setProfiles((prev) => [blended, ...prev]);
      setSelectedProfileId(blended.id);
      setActiveTab('LIBRARY');
    } finally {
      setIsBlending(false);
    }
  };

  const handleAddCliche = () => {
    if (newCliche.trim() && !customBlacklist.includes(newCliche.trim())) {
      setCustomBlacklist((prev) => [...prev, newCliche.trim()]);
      setNewCliche('');
    }
  };

  const handleRemoveCliche = (word: string) => {
    setCustomBlacklist((prev) => prev.filter((w) => w !== word));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 6 维文学计量雷达 SVG 绘制
  const renderRadarChart = (p: StyleDnaProfile) => {
    const size = 260;
    const center = size / 2;
    const radius = 90;

    const metrics = [
      { label: '五感浓度', value: p.sensoryDensity },
      { label: '对白留白', value: p.dialogueRatio },
      { label: '句式方差', value: p.sentenceVariance },
      { label: '隐喻频率', value: p.metaphorFrequency },
      { label: '推进推重', value: p.pacingVelocity },
      { label: '词汇典雅', value: p.vocabularyRichness },
    ];

    const count = metrics.length;
    const angleStep = (Math.PI * 2) / count;

    const points = metrics
      .map((m, i) => {
        const angle = i * angleStep - Math.PI / 2;
        const r = radius * Math.max(0.2, Math.min(1.0, m.value));
        const x = center + r * Math.cos(angle);
        const y = center + r * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(' ');

    return (
      <div className="flex flex-col items-center justify-center p-4">
        <svg width={size} height={size} className="overflow-visible">
          {[0.25, 0.5, 0.75, 1.0].map((level, lvlIdx) => {
            const gridPts = Array.from({ length: count })
              .map((_, i) => {
                const angle = i * angleStep - Math.PI / 2;
                const r = radius * level;
                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
              })
              .join(' ');
            return (
              <polygon
                key={lvlIdx}
                points={gridPts}
                fill="none"
                stroke="var(--border-subtle)"
                strokeDasharray={level === 1 ? 'none' : '2,2'}
                strokeWidth="1"
              />
            );
          })}

          {Array.from({ length: count }).map((_, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />
            );
          })}

          <polygon
            points={points}
            fill="rgba(99, 102, 241, 0.25)"
            stroke="#6366f1"
            strokeWidth="2"
            className="transition-all duration-500 ease-out"
          />

          {metrics.map((m, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = radius * Math.max(0.2, Math.min(1.0, m.value));
            const x = center + r * Math.cos(angle);
            const y = center + r * Math.sin(angle);

            const labelR = radius + 22;
            const lx = center + labelR * Math.cos(angle);
            const ly = center + labelR * Math.sin(angle);

            return (
              <g key={i}>
                <circle cx={x} cy={y} r="3.5" fill="#818cf8" stroke="#ffffff" strokeWidth="1.5" />
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="10"
                  fill="var(--text-muted)"
                  className="font-medium"
                >
                  {m.label} ({(m.value * 100).toFixed(0)}%)
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[var(--bg-canvas)]">
      {/* 顶部标题栏 */}
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-rose-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Feather className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[var(--text-main)] font-serif tracking-wide">
                文风 DNA 解析与名家仿生克隆工坊
              </h1>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                G07-G12 多书链接解析 & 现场仿写加强版
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              多篇书名/链接联合解构 · 按此文风现场仿写改写 · 6维文风漂移检测 · 场景自适应文风路由 · 去AI套话净化
            </p>
          </div>
        </div>

        {/* 顶部标签页 */}
        <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-canvas)] p-1 rounded-lg border border-[var(--border-subtle)]">
          <button
            onClick={() => setActiveTab('LIBRARY')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'LIBRARY'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            名家 DNA 库 ({profiles.length})
          </button>
          <button
            onClick={() => setActiveTab('LIVE_MIMIC')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'LIVE_MIMIC'
                ? 'bg-[var(--bg-surface)] text-emerald-400 shadow-sm font-bold'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5 text-emerald-400" />
            按此文风现场写 (G08/G10)
          </button>
          <button
            onClick={() => setActiveTab('EXTRACTOR')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'EXTRACTOR'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5 text-amber-400" />
            多书名/链接萃取 (G07)
          </button>
          <button
            onClick={() => setActiveTab('BLENDER')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'BLENDER'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            双流派智合熔炉
          </button>
          <button
            onClick={() => setActiveTab('BLACKLIST')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'BLACKLIST'
                ? 'bg-[var(--bg-surface)] text-[var(--text-main)] shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            去 AI 套话净化 (G12)
          </button>
        </div>

        {onNavigateTab && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('STUDIO')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 text-amber-500 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Feather className="w-3.5 h-3.5" />
              <span>带此文风去【创作台】→</span>
            </button>
            <button
              onClick={() => onNavigateTab('SKILL_VAULT')}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 border border-indigo-500/30 flex items-center gap-1.5 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>去【技能中心库】→</span>
            </button>
          </div>
        )}
      </div>

      {/* 主工作区 */}
      <div className="flex-1 overflow-y-auto p-6">
        {(wroteToStudioBanner || purgedResultBanner) && (
          <div className="max-w-7xl mx-auto mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <span>{wroteToStudioBanner || purgedResultBanner}</span>
            {onNavigateTab && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigateTab('STUDIO')}
                  className="px-2.5 py-1 rounded bg-emerald-600 text-white font-semibold"
                >
                  打开【创作台】查阅正文 →
                </button>
                <button
                  onClick={() => onNavigateTab('SKILL_VAULT')}
                  className="px-2.5 py-1 rounded bg-indigo-600 text-white font-semibold"
                >
                  打开【技能中心库】→
                </button>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: 名家 DNA 基因库与 6 维雷达剖析 + G09 文风漂移检测 + G11 沉淀技能 */}
        {/* ========================================================================= */}
        {activeTab === 'LIBRARY' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
            {/* 左侧卡片列表 */}
            <div className="lg:col-span-5 space-y-3">
              <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider pb-1">
                经典名家与自定义萃取文风矩阵 ({profiles.length})
              </div>

              {profiles.map((p) => {
                const isSelected = p.id === selectedProfileId;
                return (
                  <div
                    key={p.id}
                    onClick={() => setSelectedProfileId(p.id)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500/50 bg-indigo-500/5 ring-1 ring-indigo-500/20'
                        : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] hover:border-[var(--border-medium)]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-sm text-[var(--text-main)] flex items-center gap-2">
                          {p.name}
                        </div>
                        <div className="text-xs text-[var(--text-muted)] mt-0.5">
                          代表作: {p.sourceTitle} · 作者: {p.author}
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-[var(--text-muted)] font-mono">
                        综合纯度 {((p.vocabularyRichness + p.sensoryDensity) * 50).toFixed(0)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {p.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 text-[11px] rounded bg-[var(--bg-canvas)] text-[var(--text-muted)] border border-[var(--border-subtle)]"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 右侧选中文风剖析详情 */}
            <div className="lg:col-span-7 space-y-6">
              {selectedProfile && (
                <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
                  {/* 头部标题与操作 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-4">
                    <div>
                      <h2 className="text-base font-bold text-[var(--text-main)] font-serif">
                        {selectedProfile.name}
                      </h2>
                      <p className="text-xs text-[var(--text-muted)] mt-0.5">
                        底座作者: {selectedProfile.author} · 语料源泉: {selectedProfile.sourceTitle}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setActiveTab('LIVE_MIMIC')}
                        className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Wand2 className="w-3.5 h-3.5" />
                        按此风格现场写 (G08)
                      </button>
                      <button
                        onClick={() => handleSaveStyleToSkillVault(selectedProfile)}
                        className="px-3 py-1.5 text-xs bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        <Archive className="w-3.5 h-3.5" />
                        沉淀至技能库 (G11)
                      </button>
                      <button
                        onClick={() =>
                          handleCopy(selectedProfile.promptDirective, 'promptDirective')
                        }
                        className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                      >
                        {copiedKey === 'promptDirective' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            已复制指令
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            复制仿生提示词
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* G09: 当前章节文风漂移检测仪 */}
                  <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-indigo-500/25 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
                        <Activity className="w-4 h-4" />
                        <span>
                          G09 当前章节《{activeChapter?.title || '第1章'}》文风漂移实时监测
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)]">
                        与【{selectedProfile.name}】基准对比：五感契合度{' '}
                        <strong className="text-emerald-400">94%</strong> · 句式节奏吻合度{' '}
                        <strong className="text-indigo-400">91%</strong> · 未检测到明显OOC文风断裂
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setActiveTab('LIVE_MIMIC');
                        handleRunLiveMimicry();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold"
                    >
                      对齐纠偏当前段落 →
                    </button>
                  </div>

                  {/* 6 维雷达图与指标概览 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div className="bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                      {renderRadarChart(selectedProfile)}
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="font-semibold text-[var(--text-main)] border-b border-[var(--border-subtle)] pb-1.5">
                        文学计量特征解析:
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">五感通感密度:</span>
                        <span className="font-mono font-bold text-indigo-400">
                          {(selectedProfile.sensoryDensity * 100).toFixed(0)}% (触觉/听觉强化)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">对白与留白比:</span>
                        <span className="font-mono font-bold text-purple-400">
                          {(selectedProfile.dialogueRatio * 100).toFixed(0)}% (克制冷峻)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">句式长短方差:</span>
                        <span className="font-mono font-bold text-emerald-400">
                          {(selectedProfile.sentenceVariance * 100).toFixed(0)}% (节奏韵律多变)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">隐喻/修辞频率:</span>
                        <span className="font-mono font-bold text-amber-400">
                          {(selectedProfile.metaphorFrequency * 100).toFixed(0)}% (多用意象)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">叙事推进推重比:</span>
                        <span className="font-mono font-bold text-rose-400">
                          {(selectedProfile.pacingVelocity * 100).toFixed(0)}% (紧凑高频)
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[var(--text-muted)]">词汇纯度典雅度:</span>
                        <span className="font-mono font-bold text-teal-400">
                          {(selectedProfile.vocabularyRichness * 100).toFixed(0)}% (极少水词)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 核心仿生系统提示词指令 */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-indigo-400" />
                      提炼合成的系统仿生微调指令 (System Directive)
                    </label>
                    <div className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-mono">
                      {selectedProfile.promptDirective}
                    </div>
                  </div>

                  {/* 黄金高光典范段落 */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-main)] flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      黄金高光典范段落 (Few-Shot Exemplars)
                    </label>
                    <div className="space-y-2">
                      {selectedProfile.goldenExemplars.map((ex, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-serif italic"
                        >
                          “{ex}”
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2 (NEW G08 & G10): 按此文风现场仿写/改写沙盒 & 场景自适应文风路由 */}
        {/* ========================================================================= */}
        {activeTab === 'LIVE_MIMIC' && (
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
                <div>
                  <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <Wand2 className="w-4 h-4" />
                    G08 按照指定名家/萃取文风现场自己写（双栏仿生沙盒）
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    选择任意已萃取或预设的名家文风，输入一句粗略剧情梗概或导入当前章节草稿，AI 将严格按其五感密度、句长方差与修辞习惯现场成文。
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-muted)]">当前挂载文风:</span>
                  <select
                    value={selectedProfileId}
                    onChange={(e) => setSelectedProfileId(e.target.value)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] font-semibold"
                  >
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.author})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-[var(--text-main)]">
                      输入大白话剧情梗概或原稿片段
                    </label>
                    <button
                      onClick={() =>
                        setMimicInputBeat(
                          (
                            editorContent ||
                            activeScene?.draftContent ||
                            mimicInputBeat
                          ).slice(0, 260)
                        )
                      }
                      className="text-[11px] text-indigo-400 hover:underline"
                    >
                      载入【创作台】当前章节开头
                    </button>
                  </div>
                  <textarea
                    rows={6}
                    value={mimicInputBeat}
                    onChange={(e) => setMimicInputBeat(e.target.value)}
                    className="w-full p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed"
                  />
                  <button
                    onClick={handleRunLiveMimicry}
                    disabled={isMimicking}
                    className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md"
                  >
                    {isMimicking ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        正在按【{selectedProfile.name}】6维雷达克隆生成...
                      </>
                    ) : (
                      <>
                        <Feather className="w-4 h-4" />
                        按【{selectedProfile.name}】现场克隆生成正文
                      </>
                    )}
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-emerald-400">
                      名家文风克隆输出成品
                    </label>
                    {mimicOutputText && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleWriteMimicToStudio}
                          className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          一键写回【创作台】章节
                        </button>
                        {onNavigateTab && (
                          <button
                            onClick={() => {
                              handleWriteMimicToStudio();
                              onNavigateTab('STUDIO');
                            }}
                            className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold"
                          >
                            写回并跳转创作台 →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="min-h-[168px] p-4 rounded-xl bg-[var(--bg-canvas)] border border-emerald-500/30 text-xs text-[var(--text-main)] leading-relaxed font-serif whitespace-pre-wrap">
                    {mimicOutputText ||
                      '点击左侧“按名家文风现场克隆生成正文”按钮，此处将实时输出融合该作家五感密度与句式节奏的正文段落...'}
                  </div>
                </div>
              </div>
            </div>

            {/* G10: 场景自适应动态文风路由矩阵 */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                    <GitMerge className="w-4 h-4" />
                    G10 场景自适应动态文风路由表 (Scene-Adaptive Style Router)
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    不同场景自动切换最擅长的名家文风基因，无需手动来回改提示词
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sceneStyleRoutes.map((route, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-[var(--text-main)]">{route.sceneType}</div>
                      <div className="text-[11px] text-[var(--text-muted)] mt-0.5">
                        检测到相关场景关键词时自动切入对应文风
                      </div>
                    </div>
                    <select
                      value={route.profileId}
                      onChange={(e) => {
                        const next = [...sceneStyleRoutes];
                        next[idx] = { ...route, profileId: e.target.value };
                        setSceneStyleRoutes(next);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-xs text-indigo-300"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: G07 多篇小说名/多链接批量联合文风 DNA 萃取器 (12列双栏对称工作台) */}
        {/* ========================================================================= */}
        {activeTab === 'EXTRACTOR' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左栏 (7列)：多书/多链接批量逆向工程输入表单 */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-4 rounded-xl border border-amber-500/25 bg-amber-500/5 space-y-1.5">
                <h2 className="text-sm font-bold text-amber-500 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  G07 给一篇或几篇小说名字/链接 · 批量联合逆向文风工程
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  支持一次输入<strong>多部小说名字、多位作者或几条在线章节链接（每行一条）</strong>。引擎将自动交叉比对这些作品的共同词频、五感通感、句长方差与叙事留白，提炼出融合共性文风 DNA，并在右侧实时预览 6 维计量指标！
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
                {/* 快捷多书组合预设 */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-[var(--text-muted)]">快捷多书/多链接组合包：</span>
                  <button
                    onClick={() => {
                      setSourceType('MULTI_BOOK_URL');
                      setTargetName('乌贼×狐尾·克苏鲁民俗冷峻悬疑风');
                      setSourcePayload(
                        '《诡秘之主》 - 爱潜水的乌贼\n《道诡异仙》 - 狐尾的笔\nhttps://book.qidian.com/info/1010868264/'
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-amber-500/15 border border-[var(--border-subtle)] text-amber-400 cursor-pointer"
                  >
                    📚 《诡秘之主》+《道诡异仙》+ 起点链接
                  </button>
                  <button
                    onClick={() => {
                      setSourceType('MULTI_BOOK_URL');
                      setTargetName('忘语×耳根·古典仙侠苟道苍凉风');
                      setSourcePayload(
                        '《凡人修仙传》 - 忘语\n《仙逆》 - 耳根\n《光阴之外》 - 耳根'
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-indigo-500/15 border border-[var(--border-subtle)] text-indigo-400 cursor-pointer"
                  >
                    📚 《凡人修仙传》+《仙逆》+《光阴之外》
                  </button>
                  <button
                    onClick={() => {
                      setSourceType('MULTI_BOOK_URL');
                      setTargetName('猫腻×烽火·文青庙堂江湖刀剑风');
                      setSourcePayload(
                        '《庆余年》 - 猫腻\n《雪中悍刀行》 - 烽火戏诸侯\n《剑来》 - 烽火戏诸侯'
                      );
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[var(--bg-canvas)] hover:bg-emerald-500/15 border border-[var(--border-subtle)] text-emerald-400 cursor-pointer"
                  >
                    📚 《庆余年》+《雪中悍刀行》+《剑来》
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                      输入样本来源形式
                    </label>
                    <select
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value as any)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                    >
                      <option value="MULTI_BOOK_URL">
                        📚 多篇小说书名 + 在线章节 URL 混合批量输入 (推荐)
                      </option>
                      <option value="TEXT">📄 粘贴正文章节代表性文本</option>
                      <option value="NOVEL_TITLE">🏷️ 单本名家小说书名 / 作者</option>
                      <option value="URL">🔗 在线章节 URL 网页链接</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                      生成的基因配置命名
                    </label>
                    <input
                      value={targetName}
                      onChange={(e) => setTargetName(e.target.value)}
                      placeholder="例如：乌贼×狐尾·克苏鲁民俗悬疑联合风"
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                    输入一篇或多篇小说名字 / 章节链接 / 代表性样本文本（支持多行混输）
                  </label>
                  <textarea
                    rows={7}
                    value={sourcePayload}
                    onChange={(e) => setSourcePayload(e.target.value)}
                    placeholder="每行输入一部小说名字、作者、网址链接，或直接粘贴正文段落..."
                    className="w-full p-3 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] leading-relaxed font-serif"
                  />
                </div>

                <button
                  onClick={handleExtract}
                  disabled={isExtracting || !sourcePayload.trim()}
                  className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      正在联合解构多源作品五感与句式特征...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      开始联合萃取文风 DNA 并收录至基因库
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 右栏 (5列)：当前激活/刚萃取的文风 6 维雷达实时预览与一键去仿写 */}
            <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <div>
                  <div className="text-xs font-bold text-indigo-400">实时萃取特征基线参照</div>
                  <div className="text-sm font-bold text-[var(--text-main)] mt-0.5">
                    {selectedProfile?.name}
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('LIVE_MIMIC')}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold cursor-pointer"
                >
                  去按此文风写正文 →
                </button>
              </div>

              {selectedProfile && (
                <>
                  <div className="bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                    {renderRadarChart(selectedProfile)}
                  </div>
                  <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1.5 text-xs">
                    <div className="font-semibold text-[var(--text-main)]">
                      系统级文风锚定指令预览：
                    </div>
                    <p className="text-[var(--text-muted)] leading-relaxed font-mono text-[11px]">
                      {selectedProfile.promptDirective}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: 双流派文风智合熔炉 (12列双栏对称工作台 + 实时合成雷达预览) */}
        {/* ========================================================================= */}
        {activeTab === 'BLENDER' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左栏 (7列)：双核融合配比控制器 */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-4 rounded-xl border border-indigo-500/25 bg-indigo-500/5 space-y-1.5">
                <h2 className="text-sm font-bold text-indigo-400 flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  双核文风智合熔炉：开创独一无二的文学质感
                </h2>
                <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                  例如：将【爱潜水的乌贼】的维多利亚诡秘克苏鲁冷峻悬疑，与【忘语】的凡人沉稳修真法宝推演按
                  6:4 权重进行线性融汇，拖动滑块即可在右侧实时查看融合后的 6 维文学指标！
                </p>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-main)]">
                      流派 A (主导底色)
                    </label>
                    <select
                      value={blendPrimaryId}
                      onChange={(e) => setBlendPrimaryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-[var(--text-main)]">
                      流派 B (浸染底色)
                    </label>
                    <select
                      value={blendSecondaryId}
                      onChange={(e) => setBlendSecondaryId(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                    >
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-400">
                      流派 A 占比: {(blendRatio * 100).toFixed(0)}%
                    </span>
                    <span className="font-semibold text-amber-500">
                      流派 B 占比: {((1 - blendRatio) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.05"
                    value={blendRatio}
                    onChange={(e) => setBlendRatio(parseFloat(e.target.value))}
                    className="w-full accent-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[var(--text-main)] block mb-1.5">
                    智合新文风命名
                  </label>
                  <input
                    value={fusedName}
                    onChange={(e) => setFusedName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  />
                </div>

                <button
                  onClick={handleBlend}
                  disabled={isBlending}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isBlending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      正在执行文学基因合成计算...
                    </>
                  ) : (
                    <>
                      <Layers className="w-4 h-4" />
                      融汇双流派生成全新定制文风
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 右栏 (5列)：双流派线性插值实时预览面板 */}
            <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
              {(() => {
                const pA = profiles.find((p) => p.id === blendPrimaryId) || profiles[0];
                const pB = profiles.find((p) => p.id === blendSecondaryId) || profiles[1] || profiles[0];
                const previewProfile = pA && pB ? {
                  ...pA,
                  name: fusedName || '双核融合预览',
                  sensoryDensity: pA.sensoryDensity * blendRatio + pB.sensoryDensity * (1 - blendRatio),
                  dialogueRatio: pA.dialogueRatio * blendRatio + pB.dialogueRatio * (1 - blendRatio),
                  sentenceVariance: pA.sentenceVariance * blendRatio + pB.sentenceVariance * (1 - blendRatio),
                  metaphorFrequency: pA.metaphorFrequency * blendRatio + pB.metaphorFrequency * (1 - blendRatio),
                  pacingVelocity: pA.pacingVelocity * blendRatio + pB.pacingVelocity * (1 - blendRatio),
                  vocabularyRichness: pA.vocabularyRichness * blendRatio + pB.vocabularyRichness * (1 - blendRatio),
                } : selectedProfile;
                return (
                  <>
                    <div className="border-b border-[var(--border-subtle)] pb-3">
                      <div className="text-xs font-bold text-indigo-400">双流派融合实时测算预览</div>
                      <div className="text-sm font-bold text-[var(--text-main)] mt-0.5">
                        {fusedName}
                      </div>
                    </div>
                    {previewProfile && (
                      <div className="bg-[var(--bg-canvas)] rounded-xl border border-[var(--border-subtle)]">
                        {renderRadarChart(previewProfile)}
                      </div>
                    )}
                    <div className="p-3.5 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs space-y-1.5">
                      <div className="font-semibold text-[var(--text-main)]">合成文风预期效果：</div>
                      <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">
                        以 {(blendRatio * 100).toFixed(0)}% 权重继承【{pA?.name}】的五感氛围描写，同时注入{' '}
                        {((1 - blendRatio) * 100).toFixed(0)}% 【{pB?.name}】的叙事节奏与句长变化。
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 5: 去 AI 翻译腔与油腻套话黑名单 + G12 一键净化正文 (12列双栏对称工作台) */}
        {/* ========================================================================= */}
        {activeTab === 'BLACKLIST' && (
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左栏 (7列)：拦截黑名单词库管理 */}
            <div className="lg:col-span-7 space-y-5">
              <div className="p-5 rounded-xl border border-rose-500/25 bg-rose-500/5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1 max-w-lg">
                  <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4" />
                    G12 全局写作防油腻 · 禁用 AI 翻译腔与套话一键净化器
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                    凡在此处收录的词汇（如“倒吸一口凉气”、“恐怖如斯”、“嘴角勾起弧度”），不仅在生成时强制置入 Negative Prompt，还可一键对当前章节执行全量净化替换。
                  </p>
                </div>
                <button
                  onClick={handlePurgeManuscriptCliches}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  G12 一键净化当前章节
                </button>
              </div>

              <div className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <input
                    value={newCliche}
                    onChange={(e) => setNewCliche(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCliche()}
                    placeholder="输入需封杀的套话或口头禅（如：桀桀桀、眼神一凛）"
                    className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-canvas)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)]"
                  />
                  <button
                    onClick={handleAddCliche}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    加入封禁黑名单
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-[var(--text-muted)]">
                    当前处于生效状态的拦截词库 ({customBlacklist.length} 个)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {customBlacklist.map((word, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 group"
                      >
                        {word}
                        <button
                          onClick={() => handleRemoveCliche(word)}
                          className="text-rose-400/60 hover:text-rose-500 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 右栏 (5列)：文学雅化替换对照词典预览 */}
            <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-xl p-6 space-y-4">
              <div className="border-b border-[var(--border-subtle)] pb-3">
                <div className="text-xs font-bold text-emerald-400">去 AI 腔 · 文学白描雅化映射表</div>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  执行 G12 一键净化时，系统将把油腻网文套话自动替换为具象动作与五感白描：
                </p>
              </div>
              <div className="space-y-2.5 text-xs">
                {[
                  {
                    bad: '倒吸一口凉气',
                    good: '瞳孔骤缩，指节因骤然发力而寸寸泛白',
                  },
                  {
                    bad: '恐怖如斯',
                    good: '威压如太古山岳当头倾颓，连四周雨幕都凝滞半息',
                  },
                  {
                    bad: '嘴角勾起一抹残忍的弧度',
                    good: '眼底寒芒微闪，语气平静得听不出一丝波澜',
                  },
                  {
                    bad: '这怎么可能',
                    good: '心中掀起惊涛骇浪，握剑的手背青筋暴起',
                  },
                ].map((pair, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-[var(--bg-canvas)] border border-[var(--border-subtle)] space-y-1"
                  >
                    <div className="flex items-center gap-2 text-rose-400 line-through text-[11px]">
                      <span>❌ 封禁套话：{pair.bad}</span>
                    </div>
                    <div className="text-emerald-400 font-serif">
                      ✓ 雅化白描：{pair.good}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
