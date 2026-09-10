// ==============================================================================
// AI 小说创世工坊与架构师全屏视窗 (AI Novel Architect View)
// 替代顶部弹窗，作为独立 Tab 提供与大模型多轮探讨灵感、推演全书五维架构与一键立项
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import { NovelFrameworkData } from '../../types/novel';
import { AgentExecutionLog } from '../../lib/aiService';
import { NavTab } from '../Header';
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
  ArrowRight,
  RotateCcw,
  Layers,
  Flame,
  MessageSquare,
  Feather,
  Lightbulb,
  FileCheck,
} from 'lucide-react';

interface ArchitectViewProps {
  onNavigateTab: (tab: NavTab) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const ArchitectView: React.FC<ArchitectViewProps> = ({ onNavigateTab }) => {
  const { chatBrainstorm, generateNovelFramework, createNovelFromFramework } = useNovel();

  // 阶段：'brainstorm' (探讨) | 'generating' (生成中) | 'review' (审阅骨架)
  const [step, setStep] = useState<'brainstorm' | 'generating' | 'review'>('brainstorm');

  // 对话历史
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '你好！我是你的 AI 世界观架构师与资深小说主编。\n无论你现在只有一个模糊脑洞、一段反套路设定，还是一个特色角色，都可以在这里和我探讨。\n我们可以多轮聊出精彩爽点，随时点击下方【一键推演全书框架】，生成包含【文风指南、世界观法则、人物状态机、前瞻卷章分镜与伏笔】的完整小说圣经！',
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);

  // 生成执行状态
  const [progressLogs, setProgressLogs] = useState<AgentExecutionLog[]>([]);
  const [generatedFramework, setGeneratedFramework] = useState<NovelFrameworkData | null>(null);
  const [activeReviewTab, setActiveReviewTab] = useState<'meta' | 'rules' | 'characters' | 'outlines' | 'foreshadowing'>('meta');

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
    {
      label: '🗡️ 纯正剑修',
      prompt: '传统古典仙侠，一剑破万法，主角天生剑骨却被宗门挖去弃尸荒野，在剑冢残墟中以凡人之躯重铸本命杀戮心剑，踏上复仇问鼎之路。',
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
    } catch {
      setChatMessages([
        ...nextMessages,
        { role: 'assistant', content: '（抱歉，当前网络波动或思考超时，请稍后重试）' },
      ]);
    } finally {
      setIsChatting(false);
    }
  };

  const handleStartGeneration = async (customIdea?: string) => {
    const idea =
      customIdea ||
      userInput.trim() ||
      chatMessages.filter((m) => m.role === 'user').pop()?.content ||
      '赛博修真反乌托邦';
    setStep('generating');
    setProgressLogs([]);

    try {
      const framework = await generateNovelFramework(idea, undefined, (log: AgentExecutionLog) => {
        setProgressLogs((prev) => [...prev, log]);
      });
      setGeneratedFramework(framework);
      setStep('review');
    } catch (err: unknown) {
      alert('生成框架时遇到问题: ' + String(err));
      setStep('brainstorm');
    }
  };

  const handleAdoptFramework = () => {
    if (!generatedFramework) return;
    createNovelFromFramework(generatedFramework);
    // 切换至写作工作台
    onNavigateTab('STUDIO');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* 顶部阶段导航指示条 */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500/20 to-indigo-500/20 border border-amber-500/30 text-amber-400 shadow-sm">
            <Wand2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">
                AI 创世工坊 / Novel Architect
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-700/50 font-medium">
                大模型架构推演
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              从灵感脑暴到全书五维圣经推演，全流程陪伴式小说构思引擎
            </p>
          </div>
        </div>

        {/* 阶段步骤指示 */}
        <div className="flex items-center gap-1.5 sm:gap-2 text-xs">
          <button
            onClick={() => setStep('brainstorm')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              step === 'brainstorm'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>1. 灵感脑暴</span>
          </button>

          <span className="text-slate-700">→</span>

          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              step === 'generating'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950'
                : 'text-slate-500'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>2. 架构推演</span>
          </div>

          <span className="text-slate-700">→</span>

          <button
            disabled={!generatedFramework}
            onClick={() => generatedFramework && setStep('review')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition ${
              step === 'review'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950'
                : generatedFramework
                ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                : 'text-slate-600 cursor-not-allowed'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5" />
            <span>3. 审阅与立项</span>
          </button>
        </div>
      </div>

      {/* 主体视窗根据 Step 呈现 */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* ========================================================================= */}
        {/* 阶段 1：灵感脑暴与探讨 (Brainstorm) */}
        {/* ========================================================================= */}
        {step === 'brainstorm' && (
          <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto p-4 sm:p-6 overflow-hidden">
            {/* 灵感快捷预设胶囊 */}
            <div className="mb-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>热门网文题材灵感模版（点击自动填入与主编探讨）：</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {presets.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSendMessage(p.prompt)}
                    className="px-3 py-1.5 text-xs rounded-xl bg-slate-900 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-600/60 text-slate-300 hover:text-indigo-300 transition shadow-sm"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 对话消息滚动流 */}
            <div className="flex-1 overflow-y-auto space-y-4 bg-slate-900/50 rounded-2xl border border-slate-800 p-4 sm:p-6">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-md">
                      <Sparkles className="w-4 h-4" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-950'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                      <Feather className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isChatting && (
                <div className="flex gap-3 items-center text-slate-400 text-xs">
                  <div className="w-8 h-8 rounded-xl bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <span>AI 主编与架构师正在构思回应...</span>
                </div>
              )}
            </div>

            {/* 底部输入框与一键生成推演动作栏 */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <textarea
                  rows={2}
                  placeholder="输入你的构想、反套路设定、主角金手指或情节冲突，按 Enter 发送探讨..."
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl p-3 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none shadow-inner"
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!userInput.trim() || isChatting}
                  className="h-full px-5 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-950 transition"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">探讨</span>
                </button>
              </div>

              {/* 核心大动作按钮：结束脑暴推演全书框架 */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-gradient-to-r from-amber-950/40 via-indigo-950/40 to-slate-900 border border-amber-700/30 rounded-2xl shadow-lg">
                <div className="text-xs text-amber-200/90 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>聊得差不多了？点击右侧一键推演全书五维架构圣经，生成完整卷章大纲与角色卡！</span>
                </div>
                <button
                  onClick={() => handleStartGeneration()}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-xl shadow-amber-950 flex items-center justify-center gap-2 transition hover:scale-[1.02] active:scale-95"
                >
                  <Sparkles className="w-4 h-4 text-amber-100 animate-pulse" />
                  <span>✨ 一键推演全书框架</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 阶段 2：生成推演中 (Generating) */}
        {/* ========================================================================= */}
        {step === 'generating' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6 max-w-xl mx-auto text-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-900/60 animate-bounce">
                <Wand2 className="w-10 h-10" />
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-5 w-5 bg-amber-500" />
              </span>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-100">
                AI 架构师团队正在推演全书圣经...
              </h3>
              <p className="text-xs text-slate-400">
                正在依据前述探讨提炼核心世界观公理、反套路金手指、主配角状态机与三幕起伏分镜
              </p>
            </div>

            {/* 动态执行步骤日志 */}
            <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-4 text-left font-mono text-xs text-slate-300 space-y-2 max-h-56 overflow-y-auto">
              {progressLogs.length === 0 ? (
                <div className="text-slate-500 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>启动策划 Agent 与大纲编排系统...</span>
                </div>
              ) : (
                progressLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2 text-indigo-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-slate-200">{log.step}</span>
                      <p className="text-[11px] text-slate-400">{log.detail}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 阶段 3：全书框架全景可视化审阅与立项 (Review & Launch) */}
        {/* ========================================================================= */}
        {step === 'review' && generatedFramework && (
          <div className="flex-1 flex flex-col overflow-hidden max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
            {/* 框架五维审阅 Tab 切换 */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setActiveReviewTab('meta')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeReviewTab === 'meta'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                  }`}
                >
                  📋 基本信息与文风
                </button>
                <button
                  onClick={() => setActiveReviewTab('rules')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeReviewTab === 'rules'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                  }`}
                >
                  🌌 世界法则设定 ({generatedFramework.worldSettings.length})
                </button>
                <button
                  onClick={() => setActiveReviewTab('characters')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeReviewTab === 'characters'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                  }`}
                >
                  👥 角色阵营卡片 ({generatedFramework.characters.length})
                </button>
                <button
                  onClick={() => setActiveReviewTab('outlines')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeReviewTab === 'outlines'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                  }`}
                >
                  📑 卷章大纲与分镜 ({generatedFramework.volumes.length}卷)
                </button>
                <button
                  onClick={() => setActiveReviewTab('foreshadowing')}
                  className={`px-3 py-1.5 rounded-lg font-medium transition ${
                    activeReviewTab === 'foreshadowing'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-900'
                  }`}
                >
                  🎯 核心伏笔雷达 ({generatedFramework.foreshadowings.length})
                </button>
              </div>

              {/* 动作区 */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStep('brainstorm')}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 bg-slate-800 rounded-lg flex items-center gap-1 transition"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>返回探讨微调</span>
                </button>

                <button
                  onClick={handleAdoptFramework}
                  className="px-5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 rounded-lg shadow-lg shadow-emerald-950 flex items-center gap-1.5 transition hover:scale-105 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>🎉 确认创建并进入新书创作</span>
                </button>
              </div>
            </div>

            {/* 审阅详情视窗 */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
              {/* TAB 1: 基本信息 */}
              {activeReviewTab === 'meta' && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold text-slate-100 font-serif">
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

                    <div className="pt-2 border-t border-slate-800 space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block mb-0.5">
                          一句话核心故事梗概 (Logline)：
                        </span>
                        <p className="text-slate-200 leading-relaxed bg-slate-950 p-3 rounded-xl border border-slate-800">
                          {generatedFramework.logline}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[11px] block">预期规划篇幅字数</span>
                          <span className="text-slate-200 font-mono font-bold text-sm">
                            {generatedFramework.targetWordCount.toLocaleString()} 字
                          </span>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[11px] block">叙事行文语调 (Tone)</span>
                          <span className="text-slate-300 text-xs">
                            {generatedFramework.styleGuide.tone}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="text-slate-400 text-[11px] block mb-1">
                          违禁词与避讳库（防止网文水词与毒点）：
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {generatedFramework.styleGuide.forbiddenPhrases.map((phrase, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300"
                            >
                              ✕ {phrase}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: 世界观法则设定 */}
              {activeReviewTab === 'rules' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
                  {generatedFramework.worldSettings.map((rule, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-100 text-sm font-serif flex items-center gap-1.5">
                          <Shield className="w-4 h-4 text-indigo-400" />
                          <span>{rule.name}</span>
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                          {rule.category}
                        </span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {rule.content}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {rule.tags.map((t, i) => (
                          <span
                            key={i}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: 角色阵营卡片 */}
              {activeReviewTab === 'characters' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {generatedFramework.characters.map((cItem, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-100 font-serif">
                            {cItem.character.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 font-semibold border border-indigo-800/60">
                            {cItem.character.roleType}
                          </span>
                          <span className="text-xs text-slate-500">
                            性别：{cItem.character.gender}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 font-medium">
                          初始战力：{cItem.initialState.combatPower}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block font-semibold">
                            核心动机
                          </span>
                          <p className="text-slate-300 mt-0.5">
                            {cItem.character.profile.coreMotivation}
                          </p>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-rose-400/80 text-[10px] block font-semibold">
                            致命性格缺陷
                          </span>
                          <p className="text-slate-300 mt-0.5">
                            {cItem.character.profile.fatalFlaw}
                          </p>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                          <span className="text-slate-500 text-[10px] block font-semibold">
                            语言习惯与口吻
                          </span>
                          <p className="text-slate-300 mt-0.5">
                            {cItem.character.profile.voiceAndTone}
                          </p>
                        </div>
                      </div>

                      {cItem.initialState.statusTags.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1">
                          <span className="text-[10px] text-slate-500">初始状态标签：</span>
                          {cItem.initialState.statusTags.map((tag, i) => (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 4: 卷章大纲与分镜 */}
              {activeReviewTab === 'outlines' && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {generatedFramework.volumes.map((vol, vIdx) => (
                    <div
                      key={vIdx}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-sm text-slate-100 font-serif">
                          第 {vol.volume.volumeIndex} 卷：{vol.volume.title}
                        </span>
                        <span className="text-xs text-amber-300/80">
                          高潮预设：{vol.volume.targetClimax}
                        </span>
                      </div>

                      <p className="text-xs text-slate-400">
                        <span className="text-slate-500">主线核心矛盾：</span>
                        {vol.volume.mainConflict}
                      </p>

                      <div className="space-y-2.5 pt-1">
                        {vol.chapters.map((chap, cIdx) => (
                          <div
                            key={cIdx}
                            className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-200">
                                第 {chap.chapter.chapterIndex} 章：{chap.chapter.title}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                包含 {chap.scenes.length} 幕分镜节拍
                              </span>
                            </div>
                            <p className="text-slate-400 text-[11px] leading-relaxed">
                              {chap.chapter.outline}
                            </p>

                            {/* 场景节拍卡 */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                              {chap.scenes.map((sc, sIdx) => (
                                <div
                                  key={sIdx}
                                  className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-[10px] space-y-1"
                                >
                                  <div className="font-semibold text-indigo-300 flex items-center gap-1">
                                    <Zap className="w-2.5 h-2.5" />
                                    <span>第 {sc.sceneIndex} 幕</span>
                                  </div>
                                  <p className="text-slate-400 line-clamp-2">{sc.sceneGoal}</p>
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

              {/* TAB 5: 核心伏笔雷达 */}
              {activeReviewTab === 'foreshadowing' && (
                <div className="space-y-3 max-w-3xl mx-auto">
                  {generatedFramework.foreshadowings.map((fs, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300 font-serif">{fs.title}</span>
                        <span className="text-[10px] text-slate-500">
                          计划第 {fs.plannedResolveChapterIndex || '?'} 章回收
                        </span>
                      </div>
                      <p className="text-slate-300 text-[11px] leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                        {fs.clueDescription}
                      </p>
                      {fs.notes && (
                        <p className="text-[10px] text-slate-500">作者备忘：{fs.notes}</p>
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
