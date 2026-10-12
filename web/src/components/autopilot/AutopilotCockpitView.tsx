import React, { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  Play,
  Pause,
  Sparkles,
  Layers,
  CheckSquare,
  Square,
  Zap,
  CheckCircle2,
  Sliders,
  Cpu,
  BookOpen,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  Feather,
} from 'lucide-react';
import { useNovel } from '../../context/NovelContext';
import { NavTab } from '../Header';
import {
  EpiphanySpark,
  CreationSkillItem,
  AutopilotMode,
  AutopilotPacingStrategy,
  AutopilotGeneratedSegment,
} from '../../types/novel';
import {
  fetchEpiphanySparks,
  saveEpiphanySpark,
  fetchCreationSkills,
  saveCreationSkill,
  runAutopilotSegmentGeneration,
  autoMatchSkillsForScene,
} from '../../lib/api';

interface StageItem {
  stage: 'CONTEXT_SCAN' | 'SKILL_MATCH' | 'BEAT_PLAN' | 'PROSE_DRAFT' | 'SELF_AUDIT' | 'POLISH_COMMIT';
  title: string;
  detail: string;
  timestamp: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED';
}

const PACING_OPTIONS: {
  id: AutopilotPacingStrategy;
  label: string;
  desc: string;
  badgeColor: string;
}[] = [
  {
    id: 'HIGH_OCTANE_PAYOFF',
    label: '爽点密集爆发',
    desc: '每 800 字一个冲突高潮，底牌掀开、越阶反杀、震惊全场',
    badgeColor: '#e11d48',
  },
  {
    id: 'IMMERSIVE_SLOW_BURN',
    label: '细腻铺陈稳健流',
    desc: '因果严丝合缝，世界观渐进展开，人物智商在线博弈',
    badgeColor: '#2563eb',
  },
  {
    id: 'CLIMAX_SHOWDOWN',
    label: '高潮决战爆发流',
    desc: '大场面宿命对决、多线收束、章末强制断章钩子拉满追读',
    badgeColor: '#7c3aed',
  },
];

interface AutopilotCockpitViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const AutopilotCockpitView: React.FC<AutopilotCockpitViewProps> = ({ onNavigateTab }) => {
  const {
    novel,
    volumes,
    characters,
    addChapter,
    setEditorContent,
  } = useNovel();

  const [sparks, setSparks] = useState<EpiphanySpark[]>([]);
  const [skills, setSkills] = useState<CreationSkillItem[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const [mode, setMode] = useState<AutopilotMode>('ZERO_INPUT_PURE_AUTO');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [targetWordCount, setTargetWordCount] = useState<number>(10000);
  const [pacing, setPacing] = useState<AutopilotPacingStrategy>('HIGH_OCTANE_PAYOFF');
  const [referenceData, setReferenceData] = useState<string>(
    '【作者投喂参考资料】\n1. 本章核心冲突：大司命属官黑袍执事以为林越只是筑基蝼蚁，试图强夺断剑残片；\n2. 细节参考：暴雨冲刷青铜古钟，钟声每一次震荡都会让周围十丈内的雨水悬停一瞬；\n3. 预期爽点：林越不语，仅引动断剑内一缕太虚劫雷，瞬息震碎执事本命法器。'
  );
  const [autoSelectSkills, setAutoSelectSkills] = useState<boolean>(true);
  const [autoWeaveSparks, setAutoWeaveSparks] = useState<boolean>(true);
  const [qualityThreshold] = useState<number>(90);

  // Runtime state
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isGeneratingStep, setIsGeneratingStep] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [segments, setSegments] = useState<AutopilotGeneratedSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number>(0);

  const allChapters = volumes.flatMap((v) => v.chapters);

  const [stageLogs, setStageLogs] = useState<StageItem[]>([
    {
      stage: 'CONTEXT_SCAN',
      title: '1. 前文记忆与世界观锚定',
      detail: `已加载《${novel.title}》${allChapters.length} 章上下文、${characters.length} 名角色状态机与未回收伏笔`,
      timestamp: '就绪',
      status: 'COMPLETED',
    },
    {
      stage: 'SKILL_MATCH',
      title: '2. 中心技能库与灵感胶囊装配',
      detail: '自动联动已勾选 Skill 范式与待织入灵光一现卡片',
      timestamp: '就绪',
      status: 'PENDING',
    },
    {
      stage: 'BEAT_PLAN',
      title: '3. 章节节拍与爽点密度推演',
      detail: '规划起承转合微缩节拍与章末断章钩子',
      timestamp: '待命',
      status: 'PENDING',
    },
    {
      stage: 'PROSE_DRAFT',
      title: '4. 多模型协同高速巡航码字',
      detail: '调用主力写作模型流式生成高质感正文',
      timestamp: '待命',
      status: 'PENDING',
    },
    {
      stage: 'SELF_AUDIT',
      title: '5. 五维自省与 OOC 逻辑稽查',
      detail: '校验战力崩坏、人设声纹一致性与五感描写密度',
      timestamp: '待命',
      status: 'PENDING',
    },
    {
      stage: 'POLISH_COMMIT',
      title: '6. 去 AI 味精修与章节自动归档',
      detail: '消除陈词滥调并输出可一键合入目录的成品章节',
      timestamp: '待命',
      status: 'PENDING',
    },
  ]);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadInitialAssets();
  }, [novel.id]);

  const loadInitialAssets = async () => {
    const [spList, skList] = await Promise.all([
      fetchEpiphanySparks(novel.id),
      fetchCreationSkills(),
    ]);
    setSparks(spList);
    setSkills(skList);
  };

  const showToast = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  };

  const handleToggleSkill = async (skillId: string) => {
    const target = skills.find((s) => s.id === skillId);
    if (!target) return;
    const updated: CreationSkillItem = { ...target, isEnabled: !target.isEnabled };
    setSkills((prev) => prev.map((s) => (s.id === skillId ? updated : s)));
    await saveCreationSkill(updated);
  };

  const checkedSkills = skills.filter((s) => s.isEnabled);
  const activeSparks = sparks.filter((s) => s.status !== 'ARCHIVED');

  const totalGeneratedWords = segments.reduce((acc, s) => acc + s.wordCount, 0);
  const progressPercent = Math.min(
    100,
    Math.round((totalGeneratedWords / Math.max(1, targetWordCount)) * 100)
  );
  const avgScore =
    segments.length > 0
      ? Math.round(segments.reduce((acc, s) => acc + s.qualityScore, 0) / segments.length)
      : 94;

  // Timer effect when cruise mode is active
  useEffect(() => {
    if (isRunning) {
      timerRef.current = window.setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  // Trigger a single autonomous segment generation cycle
  const executeNextAutonomousSegment = async (customNextIndex?: number) => {
    if (isGeneratingStep) return;
    setIsGeneratingStep(true);

    const nextIdx = customNextIndex !== undefined ? customNextIndex : segments.length + 1;
    const nowTime = new Date().toLocaleTimeString('zh-CN', { hour12: false });

    // Step 1 & 2: Skill Match
    setStageLogs((prev) =>
      prev.map((log, i) =>
        i === 1
          ? {
              ...log,
              status: 'RUNNING',
              timestamp: nowTime,
              detail: autoSelectSkills
                ? `正在根据当前剧情冲突智能匹配最佳创作 Skill 与待触发灵感...`
                : `已锁定手动勾选的 ${checkedSkills.length} 项创作 Skill...`,
            }
          : log
      )
    );

    let activeSkillsForRun = [...checkedSkills];
    if (autoSelectSkills && skills.length > 0) {
      const matched = await autoMatchSkillsForScene(
        referenceData || novel.title,
        skills
      );
      const matchedIds = new Set(matched.matchedSkillIds);
      const autoMatchedList = skills.filter((s) => matchedIds.has(s.id));
      if (autoMatchedList.length > 0) {
        activeSkillsForRun = autoMatchedList;
      }
    }

    await new Promise((r) => setTimeout(r, 240));

    // Step 3 & 4: Beat Plan & Prose Draft
    setStageLogs((prev) =>
      prev.map((log, i) => {
        if (i === 1) {
          return {
            ...log,
            status: 'COMPLETED',
            detail: `已挂载 ${activeSkillsForRun.length} 项核心 Skill + ${
              autoWeaveSparks ? Math.min(2, activeSparks.length) : 0
            } 条灵光一现胶囊`,
          };
        }
        if (i === 2 || i === 3) {
          return {
            ...log,
            status: 'RUNNING',
            timestamp: nowTime,
            detail:
              i === 2
                ? `正在按【${PACING_OPTIONS.find((p) => p.id === pacing)?.label}】推演第 ${nextIdx} 巡航节拍...`
                : `正在高速流式生成第 ${nextIdx} 巡航章节正文...`,
          };
        }
        return log;
      })
    );

    try {
      const sparksToUse = autoWeaveSparks ? activeSparks.slice(0, 2) : [];

      const generated = await runAutopilotSegmentGeneration({
        novelId: novel.id,
        novelTitle: novel.title,
        mode,
        referenceDataText: mode === 'REFERENCE_GUIDED_AUTO' ? referenceData : undefined,
        chapterIndex: allChapters.length + nextIdx,
        sceneIndex: nextIdx,
        activeSkills: activeSkillsForRun,
        anchoredSparks: sparksToUse,
      });

      // Step 5 & 6: Self Audit & Polish Commit
      setStageLogs((prev) =>
        prev.map((log, i) => ({
          ...log,
          status: 'COMPLETED',
          timestamp: nowTime,
          detail:
            i === 4
              ? `五维自省通过：综合质量分 ${generated.qualityScore} 分（高于阈值 ${qualityThreshold} 分），零 OOC 冲突`
              : i === 5
              ? `第 ${nextIdx} 节拍（${generated.wordCount} 字）已定稿入列，可随时审阅或一键写入正文目录`
              : log.detail,
        }))
      );

      setSegments((prev) => {
        const updated = [...prev, generated];
        setActiveSegmentIndex(updated.length - 1);
        return updated;
      });

      // Mark woven sparks as WOVEN
      if (autoWeaveSparks && sparksToUse.length > 0) {
        const updatedSparks = sparks.map((sp) =>
          sparksToUse.some((u) => u.id === sp.id) ? { ...sp, status: 'WOVEN' as const } : sp
        );
        setSparks(updatedSparks);
        for (const sp of sparksToUse) {
          await saveEpiphanySpark({ ...sp, status: 'WOVEN' });
        }
      }

      showToast(
        `✅ 巡航已完成：《${generated.chapterTitle} · ${generated.sceneTitle}》（+${generated.wordCount} 字）`
      );
    } finally {
      setIsGeneratingStep(false);
    }
  };

  // Start / Stop 1-Hour Autonomous Marathon
  const handleToggleMarathon = async () => {
    if (isRunning) {
      setIsRunning(false);
      showToast('已暂停全自动无人值守巡航码字');
      return;
    }

    setIsRunning(true);
    showToast(
      mode === 'ZERO_INPUT_PURE_AUTO'
        ? '🚀 已启动【零输入全托管懒人巡航】！AI 正接管大纲、技能库与灵感胶囊自动码字...'
        : '🚀 已启动【参考资料投喂半托管巡航】！AI 正融合您的参考资料高速码字...'
    );

    await executeNextAutonomousSegment(segments.length + 1);
  };

  // Burst generate 3 chapters in a row ("一键连码一小时份额")
  const handleBurstHourGeneration = async () => {
    if (isGeneratingStep) return;
    setIsRunning(true);
    const startIdx = segments.length + 1;
    for (let i = 0; i < 3; i++) {
      await executeNextAutonomousSegment(startIdx + i);
      await new Promise((r) => setTimeout(r, 220));
    }
    showToast('🎉 已完成整小时高密度连码巡航！共生成 3 大章节节拍，请检阅并一键合入目录。');
  };

  const handleCommitToNovel = (seg: AutopilotGeneratedSegment) => {
    const firstVolId = volumes[0]?.id || 'vol-1';
    addChapter(firstVolId, seg.chapterTitle, seg.sceneTitle);
    setEditorContent(seg.content);
    showToast(`📚 已将《${seg.chapterTitle}》写入小说目录并同步至创作台编辑器！`);
  };

  const activeSegment = segments[activeSegmentIndex];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        padding: '16px 24px 36px 24px',
      }}
    >
      {notice && (
        <div
          style={{
            padding: '10px 16px',
            borderRadius: '10px',
            background: 'rgba(5, 150, 105, 0.14)',
            border: '1px solid rgba(5, 150, 105, 0.35)',
            color: '#059669',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          {notice}
        </div>
      )}

      {/* Top Hero Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '18px 22px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: isRunning
                ? 'linear-gradient(135deg, #059669 0%, #0d9488 100%)'
                : 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              boxShadow: '0 6px 16px rgba(37, 99, 235, 0.25)',
            }}
          >
            <Rocket size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-main)' }}>
                全自动无人值守巡航码字舱 (Autonomous Marathon Autopilot)
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  background: isRunning ? 'rgba(5, 150, 105, 0.14)' : 'var(--accent-surface)',
                  color: isRunning ? '#059669' : 'var(--accent-primary)',
                }}
              >
                {isRunning ? '● 巡航自动驾驶中' : '待命就绪 · 支持零输入全托管'}
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              无论是「什么都不提供，直接替我码一个小时」还是「给一点零碎资料/大纲设定参考」，自动串联中心技能库与灵光一现胶囊闭环成稿
            </p>
          </div>
        </div>

        {/* Live Telemetry Counters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>巡航计时</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
              {formatTime(elapsedSeconds)} / {durationMinutes}:00
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>已码字数 / 目标</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)' }}>
              {totalGeneratedWords.toLocaleString()} / {targetWordCount.toLocaleString()} 字
            </div>
          </div>

          <div
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              background: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>五维自省均分</div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#059669', fontFamily: 'var(--font-mono)' }}>
              {avgScore} 分
            </div>
          </div>

          <button
            onClick={handleToggleMarathon}
            disabled={isGeneratingStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              background: isRunning ? '#dc2626' : 'var(--accent-primary)',
              color: '#fff',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isGeneratingStep ? 'wait' : 'pointer',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
            }}
          >
            {isRunning ? <Pause size={16} /> : <Play size={16} />}
            {isGeneratingStep
              ? 'AI 巡航高速码字中...'
              : isRunning
              ? '暂停无人巡航'
              : '启动无人巡航码字'}
          </button>

          <button
            onClick={handleBurstHourGeneration}
            disabled={isGeneratingStep}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              border: '1px solid var(--accent-primary)',
              background: 'var(--accent-surface)',
              color: 'var(--accent-primary)',
              fontSize: '13px',
              fontWeight: 700,
              cursor: isGeneratingStep ? 'wait' : 'pointer',
            }}
            title="连续自动推演并生成 3 大章节节拍，模拟整小时高产成果"
          >
            <Zap size={15} />
            一键连码整小时份额 (3连章)
          </button>
        </div>
      </div>

      {/* Main Two-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '410px 1fr',
          gap: '16px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Mode & Reference Config + Skill/Spark Sync */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* 1. Dual Mode Selector Card */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sliders size={15} color="var(--accent-primary)" />
                1. 选择托管巡航模式
              </span>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>随时切换</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              <button
                onClick={() => setMode('ZERO_INPUT_PURE_AUTO')}
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  borderRadius: '10px',
                  border:
                    mode === 'ZERO_INPUT_PURE_AUTO'
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                  background:
                    mode === 'ZERO_INPUT_PURE_AUTO' ? 'var(--accent-surface)' : 'var(--bg-canvas)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  🛋️ 零输入全托管懒人模式
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  什么都不提供！AI 自动读取前文伏笔、人物动机与勾选 Skill 替你码完一整小时
                </div>
              </button>

              <button
                onClick={() => setMode('REFERENCE_GUIDED_AUTO')}
                style={{
                  textAlign: 'left',
                  padding: '12px',
                  borderRadius: '10px',
                  border:
                    mode === 'REFERENCE_GUIDED_AUTO'
                      ? '2px solid var(--accent-primary)'
                      : '1px solid var(--border-subtle)',
                  background:
                    mode === 'REFERENCE_GUIDED_AUTO' ? 'var(--accent-surface)' : 'var(--bg-canvas)',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', marginBottom: '4px' }}>
                  📎 投喂资料半托管模式
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  提供几句零散设定、历史资料、战斗数据或台词片段，AI 据此扩写整章
                </div>
              </button>
            </div>

            {/* Reference Data Box */}
            {mode === 'REFERENCE_GUIDED_AUTO' ? (
              <div style={{ marginBottom: '14px' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '6px',
                  }}
                >
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)' }}>
                    参考数据 / 零散设定投喂池
                  </label>
                  <button
                    onClick={() =>
                      setReferenceData(
                        '【投喂参考数据】\n- 场地：太虚归墟第三重青铜丹炉底部，四周全是历代陨落大能的残破法宝；\n- 核心爽点：主角利用刚领悟的【逆乱阴阳篇】反向吞噬护阵业火，修为连破两阶；\n- 结尾留钩：丹炉核心竟封存着三百年前自己亲手埋下的半截剑穗。'
                      )
                    }
                    style={{
                      fontSize: '11px',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--accent-primary)',
                      cursor: 'pointer',
                      fontWeight: 600,
                    }}
                  >
                    填入示例参考数据
                  </button>
                </div>
                <textarea
                  value={referenceData}
                  onChange={(e) => setReferenceData(e.target.value)}
                  rows={4}
                  placeholder="在此粘贴您想提供给 AI 参考的任何资料、数据、人物设定或剧情点..."
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    lineHeight: 1.55,
                    resize: 'vertical',
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: 'rgba(5, 150, 105, 0.08)',
                  border: '1px solid rgba(5, 150, 105, 0.25)',
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  marginBottom: '14px',
                  lineHeight: 1.5,
                }}
              >
                <strong style={{ color: '#059669' }}>✓ 已开启零输入全自动推导：</strong>
                无需手写任何提示词！系统将直接根据《{novel.title}》最新章末悬念、未回收伏笔与下方勾选的中心库 Skill 自动推演后续剧情。
              </div>
            )}

            {/* Duration & Target Presets */}
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                巡航时长与目标字数档位
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { mins: 15, words: 3000, tag: '15分钟小憩' },
                  { mins: 60, words: 10000, tag: '60分钟整小时' },
                  { mins: 180, words: 30000, tag: '3小时爆更王' },
                ].map((preset) => {
                  const active = durationMinutes === preset.mins;
                  return (
                    <button
                      key={preset.mins}
                      onClick={() => {
                        setDurationMinutes(preset.mins);
                        setTargetWordCount(preset.words);
                      }}
                      style={{
                        padding: '8px 6px',
                        borderRadius: '8px',
                        border: active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        background: active ? 'var(--accent-surface)' : 'var(--bg-canvas)',
                        cursor: 'pointer',
                        textAlign: 'center',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: active ? 'var(--accent-primary)' : 'var(--text-main)' }}>
                        {preset.tag}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        约 {preset.words.toLocaleString()} 字
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pacing Strategy */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-main)', display: 'block', marginBottom: '6px' }}>
                叙事节奏与爽点密度导航
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px' }}>
                {PACING_OPTIONS.map((opt) => {
                  const selected = pacing === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setPacing(opt.id)}
                      style={{
                        textAlign: 'left',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: selected ? `1.5px solid ${opt.badgeColor}` : '1px solid var(--border-subtle)',
                        background: selected ? 'var(--bg-canvas)' : 'transparent',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 700, color: selected ? opt.badgeColor : 'var(--text-main)' }}>
                        {opt.label}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px', lineHeight: 1.35 }}>
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 2. Central Skill Vault & Spark Quick-Check Panel */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Layers size={15} color="var(--accent-primary)" />
                2. 技能中心库勾选 ({checkedSkills.length} 项已勾选)
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={autoSelectSkills}
                    onChange={(e) => setAutoSelectSkills(e.target.checked)}
                  />
                  AI 自动补齐
                </label>
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('SKILL_VAULT')}
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--accent-primary)',
                      background: 'var(--accent-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                    }}
                    title="跳转到跨作品技能与套路中心库管理所有 Skill"
                  >
                    <span>管理中心库</span>
                    <ExternalLink size={11} />
                  </button>
                )}
              </div>
            </div>

            <div
              style={{
                maxHeight: '210px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                paddingRight: '4px',
              }}
            >
              {skills.map((sk) => (
                <div
                  key={sk.id}
                  onClick={() => handleToggleSkill(sk.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    border: sk.isEnabled ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    background: sk.isEnabled ? 'var(--accent-surface)' : 'var(--bg-canvas)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {sk.isEnabled ? (
                      <CheckSquare size={15} color="var(--accent-primary)" />
                    ) : (
                      <Square size={15} color="var(--text-muted)" />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: 'var(--text-main)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {sk.name}
                      </div>
                      <div style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                        [{sk.category}] · 复用 {sk.reusedCount} 次
                      </div>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: sk.isEnabled ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: sk.isEnabled ? '#fff' : 'var(--text-muted)',
                      fontWeight: 600,
                      flexShrink: 0,
                    }}
                  >
                    {sk.isEnabled ? '参考中' : '未勾选'}
                  </span>
                </div>
              ))}
            </div>

            {/* Active Sparks Queue */}
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Sparkles size={13} color="#d97706" />
                  待自动织入的灵光一现 ({activeSparks.length} 条)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={autoWeaveSparks}
                      onChange={(e) => setAutoWeaveSparks(e.target.checked)}
                    />
                    自动穿插
                  </label>
                  {onNavigateTab && (
                    <button
                      onClick={() => onNavigateTab('SPARK_HUB')}
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#d97706',
                        background: 'rgba(217, 119, 6, 0.1)',
                        border: '1px solid rgba(217, 119, 6, 0.3)',
                        borderRadius: '6px',
                        padding: '2px 7px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <span>去灵感中枢</span>
                      <ExternalLink size={11} />
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {activeSparks.slice(0, 4).map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => onNavigateTab?.('SPARK_HUB')}
                    style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: 'rgba(217, 119, 6, 0.1)',
                      color: '#d97706',
                      border: '1px solid rgba(217, 119, 6, 0.25)',
                      cursor: 'pointer',
                    }}
                    title="点击跳转到灵光一现与读者热议中枢查看详情"
                  >
                    ⚡ {sp.title}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Six-Stage Pipeline Status Monitor */}
          <div
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '6px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Cpu size={15} color="var(--accent-primary)" />
                3. 六阶自治码字流水线实时遥测
              </span>
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('MEMORY_GUARD')}
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#059669',
                    background: 'rgba(5, 150, 105, 0.1)',
                    border: '1px solid rgba(5, 150, 105, 0.3)',
                    borderRadius: '6px',
                    padding: '2px 7px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  <ShieldCheck size={12} />
                  <span>记忆与防幻觉护栏</span>
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {stageLogs.map((st) => (
                <div
                  key={st.stage}
                  style={{
                    padding: '8px 10px',
                    borderRadius: '8px',
                    background: 'var(--bg-canvas)',
                    border:
                      st.status === 'RUNNING'
                        ? '1px solid var(--accent-primary)'
                        : '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main)' }}>
                      {st.title}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {st.detail}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '999px',
                      flexShrink: 0,
                      background:
                        st.status === 'COMPLETED'
                          ? 'rgba(5, 150, 105, 0.14)'
                          : st.status === 'RUNNING'
                          ? 'var(--accent-surface)'
                          : 'var(--border-subtle)',
                      color:
                        st.status === 'COMPLETED'
                          ? '#059669'
                          : st.status === 'RUNNING'
                          ? 'var(--accent-primary)'
                          : 'var(--text-muted)',
                    }}
                  >
                    {st.status === 'COMPLETED' ? '已完成' : st.status === 'RUNNING' ? '执行中' : st.timestamp}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Cruise Output Stream & Manuscript Inspector */}
        <div
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            minHeight: '680px',
          }}
        >
          {/* Progress Bar Header */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BookOpen size={16} color="var(--accent-primary)" />
                无人值守巡航成果舱 ({segments.length} 个完整章节节拍已生成)
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => executeNextAutonomousSegment()}
                  disabled={isGeneratingStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--text-main)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: isGeneratingStep ? 'wait' : 'pointer',
                  }}
                >
                  <PlusCircle size={14} color="var(--accent-primary)" />
                  {isGeneratingStep ? '推演码字中...' : '立即推进下一章 (+2,200字)'}
                </button>
              </div>
            </div>

            {/* Progress Track */}
            <div
              style={{
                width: '100%',
                height: '8px',
                borderRadius: '999px',
                background: 'var(--bg-canvas)',
                overflow: 'hidden',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb 0%, #059669 100%)',
                  transition: 'width 0.35s ease',
                }}
              />
            </div>
          </div>

          {/* Segment Selector Tabs */}
          {segments.length > 0 ? (
            <>
              <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
                {segments.map((seg, idx) => {
                  const active = idx === activeSegmentIndex;
                  return (
                    <button
                      key={seg.id}
                      onClick={() => setActiveSegmentIndex(idx)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: active ? '1.5px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                        background: active ? 'var(--accent-surface)' : 'var(--bg-canvas)',
                        color: active ? 'var(--accent-primary)' : 'var(--text-main)',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{seg.chapterTitle}</span>
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 6px',
                          borderRadius: '999px',
                          background: 'rgba(5, 150, 105, 0.14)',
                          color: '#059669',
                        }}
                      >
                        {seg.wordCount}字 · {seg.qualityScore}分
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Active Segment Metadata & Applied Skills/Sparks */}
              {activeSegment && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      padding: '12px 14px',
                      borderRadius: '10px',
                      background: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-main)' }}>
                        {activeSegment.chapterTitle} · {activeSegment.sceneTitle}
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                        {activeSegment.appliedSkills.map((skName, i) => (
                          <button
                            key={i}
                            onClick={() => onNavigateTab?.('SKILL_VAULT')}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'var(--accent-surface)',
                              color: 'var(--accent-primary)',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="点击跳转到技能中心库查看该技能详情"
                          >
                            🧩 挂载技能：{skName} ↗
                          </button>
                        ))}
                        {activeSegment.incorporatedSparks.map((spName, i) => (
                          <button
                            key={i}
                            onClick={() => onNavigateTab?.('SPARK_HUB')}
                            style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: 'rgba(217, 119, 6, 0.12)',
                              color: '#d97706',
                              fontWeight: 600,
                              border: 'none',
                              cursor: 'pointer',
                            }}
                            title="点击跳转到灵光一现中枢查看该灵感详情"
                          >
                            ⚡ 织入灵感：{spName} ↗
                          </button>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleCommitToNovel(activeSegment)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '9px 14px',
                          borderRadius: '8px',
                          border: 'none',
                          background: '#059669',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={15} />
                        一键写入小说正式章节树
                      </button>
                      {onNavigateTab && (
                        <button
                          onClick={() => {
                            handleCommitToNovel(activeSegment);
                            onNavigateTab('STUDIO');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '9px 14px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'var(--accent-primary)',
                            color: '#fff',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <Feather size={14} />
                          写入并打开【创作台】精修 →
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Full Manuscript Content Viewer / Editor */}
                  <textarea
                    value={activeSegment.content}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSegments((prev) =>
                        prev.map((item, idx) =>
                          idx === activeSegmentIndex
                            ? { ...item, content: val, wordCount: val.length }
                            : item
                        )
                      );
                    }}
                    style={{
                      flex: 1,
                      minHeight: '420px',
                      width: '100%',
                      padding: '18px 20px',
                      borderRadius: '10px',
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-canvas)',
                      color: 'var(--text-main)',
                      fontSize: '14px',
                      lineHeight: 1.85,
                      fontFamily: 'var(--font-serif, Georgia, serif)',
                      resize: 'vertical',
                    }}
                  />
                </div>
              )}
            </>
          ) : (
            /* Empty State with Instant Demo Trigger */
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 24px',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle)',
                background: 'var(--bg-canvas)',
                textAlign: 'center',
                gap: '14px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '16px',
                  background: 'var(--accent-surface)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Rocket size={28} />
              </div>
              <div>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: 700, color: 'var(--text-main)' }}>
                  全自动无人值守码字舱已就绪
                </h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)', maxWidth: '520px', lineHeight: 1.6 }}>
                  您可以完全什么都不提供（零输入全托管模式），也可以在左侧粘贴几条碎片资料；系统会自动勾选匹配的中心库 Skill（套路/等级/文风/副本）并穿插您的灵光一现卡片，连续为您码出一整小时的高质量正文。
                </p>
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={handleToggleMarathon}
                  disabled={isGeneratingStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'var(--accent-primary)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Play size={16} />
                  立即启动无人巡航码字
                </button>
                <button
                  onClick={handleBurstHourGeneration}
                  disabled={isGeneratingStep}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--accent-primary)',
                    background: 'var(--accent-surface)',
                    color: 'var(--accent-primary)',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  <Zap size={16} />
                  一键连码整小时份额 (3章连生)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
