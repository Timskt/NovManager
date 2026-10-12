// ==============================================================================
// AI 小说创世工坊与大纲框架向导 (AI Novel Architect & Brainstorm Modal)
// 支持作者与大模型多轮探讨灵感，一键推演生成世界观铁律、人物状态机与分卷大纲
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { NovelFrameworkData } from '../../types/novel';
import { AgentExecutionLog } from '../../lib/aiService';
import {
  Sparkles,
  Wand2,
  BookOpen,
  Send,
  Users,
  Compass,
  Shield,
  Zap,
  CheckCircle2,
  RefreshCw,
  X,
  ArrowRight,
  RotateCcw,
  Layers,
  Flame,
  MessageSquare,
} from 'lucide-react';

interface NovelArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const NovelArchitectModal: React.FC<NovelArchitectModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { chatBrainstorm, generateNovelFramework, createNovelFromFramework } = useNovel();

  // 阶段：'brainstorm' (探讨) | 'generating' (生成中) | 'review' (审阅骨架)
  const [step, setStep] = useState<'brainstorm' | 'generating' | 'review'>('brainstorm');

  // 对话历史
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '你好！我是你的 AI 世界观架构师与小说主编。\n无论你只有一个模糊的脑洞、一段有趣的设定，还是一个反套路的角色，都可以在这里告诉我。\n我们可以多轮探讨打磨，也可以直接一键生成包含【书名、战力法则、人物状态机、前3章三幕大纲与伏笔】的完整结构化框架！',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // 生成执行状态
  const [progressLogs, setProgressLogs] = useState<AgentExecutionLog[]>([]);
  const [generatedFramework, setGeneratedFramework] = useState<NovelFrameworkData | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<'meta' | 'rules' | 'characters' | 'outlines' | 'foreshadowing'>('meta');

  if (!isOpen) return null;

  // 快捷灵感预设
  const presets = [
    {
      label: '🦾 赛博修真',
      prompt: '我想写一本赛博朋克+道法修真的反乌托邦小说，修真财阀垄断了纯净灵气，底层修士植入廉价机械义体却面临道基过载，主角意外获得旧纪元开源天道代码。',
    },
    {
      label: '👁️ 规则怪谈',
      prompt: '我想写一本不可名状克苏鲁+规则怪谈无限流，规则不是保护伞而是古神的游戏协议，主角患有情感缺失症，在全员恐慌的精神污染副本中解剖生路。',
    },
    {
      label: '⚙️ 晚明工业',
      prompt: '晚明崇祯年间，主角获得第四天灾召唤能力与蒸汽工业科技树，把流寇与建奴打造成工业流水线工人，用钢铁洪流逆天改命。',
    },
    {
      label: '👑 西幻深渊',
      prompt: '古典西幻领主文，主角穿越到被教廷流放的边陲废土，继承了一座连通深渊的古堡，以深渊契约召唤异界生灵种田争霸。',
    },
  ];

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || userInput;
    if (!textToSend.trim() || isChatting) return;

    const nextMessages: ChatMessage[] = [
      ...chatMessages,
      { role: 'user', content: textToSend },
    ];
    setChatMessages(nextMessages);
    setUserInput('');
    setIsChatting(true);

    try {
      const reply = await chatBrainstorm(nextMessages);
      setChatMessages([...nextMessages, { role: 'assistant', content: reply }]);
    } catch (e) {
      setChatMessages([
        ...nextMessages,
        { role: 'assistant', content: '探讨生成遇到网络异常，请重试或直接点击右侧一键生成框架。' },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleStartGenerate = async (seedText?: string) => {
    const idea = seedText || userInput || chatMessages.filter((m) => m.role === 'user').pop()?.content || '赛博修真反乌托邦';
    setStep('generating');
    setProgressLogs([]);

    try {
      const framework = await generateNovelFramework(idea, undefined, (log) => {
        setProgressLogs((prev) => [...prev, log]);
      });
      setGeneratedFramework(framework);
      setStep('review');
    } catch (e) {
      alert('生成大纲骨架失败，请检查网络设置或重试。');
      setStep('brainstorm');
    }
  };

  const handleConfirmAndLaunch = () => {
    if (!generatedFramework) return;
    createNovelFromFramework(generatedFramework);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="rounded-2xl max-w-4xl w-full h-[90vh] shadow-2xl flex flex-col overflow-hidden border"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
      >
        {/* 头部标题与步骤指示 */}
        <div
          className="px-6 py-4 border-b flex items-center justify-between"
          style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-indigo-600 text-white shadow-lg shadow-indigo-950">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
                <span>AI 小说创世工坊 (Novel Architect)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300 font-normal">
                  从灵感到完整结构化作品
                </span>
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                多轮脑暴 ➔ 自动推演世界观硬约束与人物状态机 ➔ 规划第一卷前3章三幕大纲 ➔ 一键实例化新书。
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition hover:opacity-80 cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 主体阶段 1：灵感脑暴与探讨 */}
        {step === 'brainstorm' && (
          <div className="flex-1 flex flex-col overflow-hidden p-6 gap-4">
            {/* 灵感快捷预设 */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                选择热门反套路灵感种子快速起步：
              </span>
              <div className="flex flex-wrap gap-2">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="px-3 py-1.5 rounded-xl border text-xs transition flex items-center gap-1.5 cursor-pointer hover:border-indigo-500/50"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 对话历史滚屏区 */}
            <div
              className="flex-1 overflow-y-auto space-y-3 border rounded-2xl p-4 text-xs font-serif leading-relaxed"
              style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
            >
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2.5 ${
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/60 flex items-center justify-center flex-shrink-0 text-indigo-300 font-sans text-xs">
                      AI
                    </div>
                  )}

                  <div
                    className={`max-w-xl p-3.5 rounded-2xl whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'border rounded-tl-none shadow-sm'
                    }`}
                    style={
                      msg.role !== 'user'
                        ? { backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }
                        : undefined
                    }
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isChatting && (
                <div className="flex items-center gap-2 text-indigo-400 text-xs animate-pulse p-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>架构师正在深入思考并组织主编建议...</span>
                </div>
              )}
            </div>

            {/* 底部输入框与一键生成按钮 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="在此输入你的想法，或提出你的要求（如：主角想要一个什么样的金手指）..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  className="flex-1 rounded-xl px-4 py-2.5 text-xs border focus:outline-none focus:border-indigo-500"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />

                <button
                  onClick={() => handleSendMessage()}
                  disabled={!userInput.trim() || isChatting}
                  className="px-4 py-2.5 border text-xs font-semibold rounded-xl transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>探讨</span>
                </button>

                <button
                  onClick={() => handleStartGenerate()}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-amber-600 hover:from-indigo-500 hover:to-amber-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-2 flex-shrink-0 cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>一键生成全套结构化大纲骨架</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 主体阶段 2：生成中进度条与思维追踪 */}
        {step === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-950 border border-indigo-500/40 flex items-center justify-center shadow-xl shadow-indigo-950/80 animate-bounce">
              <Sparkles className="w-8 h-8 text-amber-300" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>
                AI 正在推演并铸造小说结构化骨架...
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                正在生成严密的战力铁律、角色致命弱点、初期状态机与前3章三幕式对抗节拍
              </p>
            </div>

            {/* 执行日志流 */}
            <div
              className="w-full max-w-md border rounded-xl p-4 space-y-2.5 max-h-64 overflow-y-auto text-xs"
              style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
            >
              {progressLogs.map((log, i) => (
                <div key={i} className="flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold" style={{ color: 'var(--text-main)' }}>{log.step}</span>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{log.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 主体阶段 3：审阅生成的结构化小说骨架 */}
        {step === 'review' && generatedFramework && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* 顶部分类导航 */}
            <div
              className="px-6 py-3 border-b flex items-center justify-between gap-4"
              style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}
            >
              <div
                className="flex items-center gap-1.5 p-1 rounded-xl border text-xs overflow-x-auto"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                <button
                  onClick={() => setActiveReviewTab('meta')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeReviewTab === 'meta'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'hover:opacity-80'
                  }`}
                  style={activeReviewTab !== 'meta' ? { color: 'var(--text-muted)' } : undefined}
                >
                  📖 基础档案与风格
                </button>
                <button
                  onClick={() => setActiveReviewTab('rules')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeReviewTab === 'rules'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'hover:opacity-80'
                  }`}
                  style={activeReviewTab !== 'rules' ? { color: 'var(--text-muted)' } : undefined}
                >
                  ⚖️ 战力与世界法则 ({generatedFramework.worldSettings.length})
                </button>
                <button
                  onClick={() => setActiveReviewTab('characters')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeReviewTab === 'characters'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'hover:opacity-80'
                  }`}
                  style={activeReviewTab !== 'characters' ? { color: 'var(--text-muted)' } : undefined}
                >
                  🎭 人设与状态机 ({generatedFramework.characters.length})
                </button>
                <button
                  onClick={() => setActiveReviewTab('outlines')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeReviewTab === 'outlines'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'hover:opacity-80'
                  }`}
                  style={activeReviewTab !== 'outlines' ? { color: 'var(--text-muted)' } : undefined}
                >
                  🗺️ 第一卷与前3章细纲
                </button>
                <button
                  onClick={() => setActiveReviewTab('foreshadowing')}
                  className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                    activeReviewTab === 'foreshadowing'
                      ? 'bg-indigo-600 text-white font-semibold'
                      : 'hover:opacity-80'
                  }`}
                  style={activeReviewTab !== 'foreshadowing' ? { color: 'var(--text-muted)' } : undefined}
                >
                  ⚡ 初始伏笔 ({generatedFramework.foreshadowings.length})
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('brainstorm')}
                  className="px-3 py-1.5 border text-xs rounded-xl transition flex items-center gap-1 cursor-pointer hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>微调探讨</span>
                </button>

                <button
                  onClick={handleConfirmAndLaunch}
                  className="px-4 py-1.5 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>确认创建并进入新书创作</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 详细内容面板 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4" style={{ backgroundColor: 'var(--bg-canvas)' }}>
              {activeReviewTab === 'meta' && (
                <div className="space-y-4 max-w-2xl mx-auto">
                  <div
                    className="border rounded-2xl p-5 space-y-3"
                    style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold font-serif" style={{ color: 'var(--text-main)' }}>
                        《{generatedFramework.title}》
                      </span>
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-950 border border-indigo-700/60 text-indigo-300">
                        {generatedFramework.genre}
                      </span>
                    </div>

                    {generatedFramework.subtitle && (
                      <p className="text-xs text-amber-300 font-medium">
                        {generatedFramework.subtitle}
                      </p>
                    )}

                    <div className="pt-2 border-t space-y-2 text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div>
                        <span className="font-semibold block mb-0.5" style={{ color: 'var(--text-muted)' }}>一句话核心故事梗概 (Logline)：</span>
                        <p
                          className="leading-relaxed p-3 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                        >
                          {generatedFramework.logline}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                        >
                          <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>预期篇幅字数</span>
                          <span className="font-mono font-bold text-sm" style={{ color: 'var(--text-main)' }}>
                            {generatedFramework.targetWordCount.toLocaleString()} 字
                          </span>
                        </div>
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                        >
                          <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>叙事语调 (Tone)</span>
                          <span className="text-xs" style={{ color: 'var(--text-main)' }}>
                            {generatedFramework.styleGuide.tone}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-[11px] block mb-1" style={{ color: 'var(--text-muted)' }}>违禁成语库（防止网文水词与浮夸感）：</span>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedFramework.styleGuide.forbiddenPhrases.map((phrase, i) => (
                            <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-red-950/40 border border-red-800/40 text-red-300">
                              {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeReviewTab === 'rules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {generatedFramework.worldSettings.map((rule, idx) => (
                    <div
                      key={idx}
                      className="border rounded-2xl p-4 space-y-2.5"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm font-serif flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                          <Shield className="w-4 h-4 text-indigo-400" />
                          <span>{rule.name}</span>
                        </span>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded border text-indigo-400"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                        >
                          {rule.category}
                        </span>
                      </div>
                      <div
                        className="p-3 rounded-xl border text-xs whitespace-pre-wrap leading-relaxed"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                      >
                        {rule.content}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.tags.map((t, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.2 rounded border"
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeReviewTab === 'characters' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {generatedFramework.characters.map((cItem, idx) => (
                    <div
                      key={idx}
                      className="border rounded-2xl p-4 space-y-3"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm font-serif" style={{ color: 'var(--text-main)' }}>
                            {cItem.character.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-semibold border border-indigo-800/60">
                            {cItem.character.roleType}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            性别：{cItem.character.gender}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">
                          初始：{cItem.initialState.combatPower}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                        >
                          <span className="text-[10px] block font-semibold" style={{ color: 'var(--text-muted)' }}>核心动机</span>
                          <p className="mt-0.5" style={{ color: 'var(--text-main)' }}>{cItem.character.profile.coreMotivation}</p>
                        </div>
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                        >
                          <span className="text-red-400/80 text-[10px] block font-semibold">致命缺陷</span>
                          <p className="mt-0.5" style={{ color: 'var(--text-main)' }}>{cItem.character.profile.fatalFlaw}</p>
                        </div>
                        <div
                          className="p-2.5 rounded-xl border"
                          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                        >
                          <span className="text-[10px] block font-semibold" style={{ color: 'var(--text-muted)' }}>语言语气口癖</span>
                          <p className="mt-0.5" style={{ color: 'var(--text-main)' }}>{cItem.character.profile.voiceAndTone}</p>
                        </div>
                      </div>

                      {cItem.initialState.statusTags.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>初始状态标签：</span>
                          {cItem.initialState.statusTags.map((tag, i) => (
                            <span key={i} className="text-[9px] px-1.5 py-0.2 rounded bg-red-950/60 text-red-300 border border-red-800/40">
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeReviewTab === 'outlines' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {generatedFramework.volumes.map((vol, vIdx) => (
                    <div
                      key={vIdx}
                      className="border rounded-2xl p-4 space-y-3"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="font-bold text-sm font-serif" style={{ color: 'var(--text-main)' }}>
                          第 {vol.volume.volumeIndex} 卷：{vol.volume.title}
                        </span>
                        <span className="text-xs text-amber-300/80">
                          高潮预设：{vol.volume.targetClimax}
                        </span>
                      </div>

                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>主线核心矛盾：</span>{vol.volume.mainConflict}
                      </p>

                      <div className="space-y-2.5 pt-1">
                        {vol.chapters.map((chap, cIdx) => (
                          <div
                            key={cIdx}
                            className="border rounded-xl p-3 text-xs space-y-2"
                            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold" style={{ color: 'var(--text-main)' }}>
                                第 {chap.chapter.chapterIndex} 章：{chap.chapter.title}
                              </span>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                                包含 {chap.scenes.length} 幕节拍
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                              {chap.chapter.outline}
                            </p>

                            {/* 场景节拍卡 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                              {chap.scenes.map((sc, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="p-2 rounded-lg border text-[10px] space-y-1"
                                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                                >
                                  <div className="font-semibold text-indigo-400 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5" />
                                    <span>第 {sc.sceneIndex} 幕</span>
                                  </div>
                                  <p className="line-clamp-2" style={{ color: 'var(--text-muted)' }}>{sc.sceneGoal}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeReviewTab === 'foreshadowing' && (
                <div className="space-y-3 max-w-2xl mx-auto">
                  {generatedFramework.foreshadowings.map((fs, idx) => (
                    <div
                      key={idx}
                      className="border rounded-2xl p-4 space-y-2 text-xs"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 font-serif">{fs.title}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          计划第 {fs.plannedResolveChapterIndex || '?'} 章回收
                        </span>
                      </div>
                      <p
                        className="text-[11px] leading-relaxed p-2.5 rounded-xl border"
                        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                      >
                        {fs.clueDescription}
                      </p>
                      {fs.notes && (
                        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>作者备忘：{fs.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
