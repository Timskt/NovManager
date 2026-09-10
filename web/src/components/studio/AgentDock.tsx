// ==============================================================================
// 创作工作台右侧：Agent 协同操作舱、AI 参谋研讨与稽查报告 (Agent Dock)
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Zap,
  Activity,
  UserCheck,
  MessageSquare,
  Send,
  Copy,
  PlusCircle,
  Trash2,
  FileDiff,
  Check,
  CornerDownLeft,
} from 'lucide-react';

interface AgentDockProps {
  isMobile?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

export const AgentDock: React.FC<AgentDockProps> = ({ isMobile }) => {
  const {
    novel,
    activeChapter,
    activeScene,
    editorContent,
    setEditorContent,
    setPendingDraft,
    activeDockTab,
    setActiveDockTab,
    currentAgent,
    isAgentRunning,
    agentLogs,
    inspectionIssues,
    suggestedStateUpdate,
    applySuggestedStateUpdate,
    runDirectorPlanScenes,
    runDrafterWriteScene,
    runInspectorAudit,
    runStylistPolish,
    characters,
    chatSceneDiscussion,
  } = useNovel();

  const affectedChar = characters.find(
    (c) => c.id === suggestedStateUpdate?.characterId
  );

  // 研讨对话状态
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-init',
      role: 'assistant',
      content: `你好！我是你的创作参谋。我已实时载入《${novel.title}》的设定、大纲与当前正文。你可以随时与我讨论情节推演、设计反转、推敲台词或探讨文笔！`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!query || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (textToSend === undefined) setInputVal('');
    setIsSending(true);

    try {
      const apiPayload = nextMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const reply = await chatSceneDiscussion(apiPayload);
      setMessages([
        ...nextMessages,
        {
          id: `msg-${Date.now()}-assistant`,
          role: 'assistant',
          content: reply,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err: any) {
      setMessages([
        ...nextMessages,
        {
          id: `msg-${Date.now()}-err`,
          role: 'assistant',
          content: `参谋研讨遇到异常：${err.message || '请检查API Key设置'}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyText = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleAppendToEditor = (content: string, id: string) => {
    setEditorContent(editorContent ? `${editorContent}\n\n${content}` : content);
    setAddedToastId(id);
    setTimeout(() => setAddedToastId(null), 1500);
  };

  const handleSendToPendingDraft = (content: string) => {
    setPendingDraft(content);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `msg-${Date.now()}-reset`,
        role: 'assistant',
        content: `研讨记录已清空。当前处于《${novel.title}》${activeChapter?.title || '第1章'}·第${activeScene?.sceneIndex || 1}幕，请问有什么可以协助你的？`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  // 快捷预设提问
  const promptSuggestions = [
    { label: '💡 构思反转', prompt: '针对当前幕的剧情，帮我构思3个高悬念、符合情理的反转方向。' },
    { label: '🎭 角色对话', prompt: '根据当前在场角色性格，推演一段暗流涌动、充满博弈试探的对话。' },
    { label: '⚡ 激化冲突', prompt: '如何将当前幕的核心冲突推向高潮，增强读者的追读情绪？' },
    { label: '📝 润色段落', prompt: '请帮我审阅当前编辑器里的正文，指出节奏拖沓处并给出高质量润色范例。' },
    { label: '🌟 下一幕承接', prompt: '根据当前发生的情节，推演下一幕的最佳戏剧动作与收尾钩子。' },
  ];

  return (
    <aside
      className={`${
        isMobile
          ? 'w-full h-full p-4 flex flex-col gap-3 overflow-y-auto'
          : 'w-full border-l border-slate-800 bg-slate-950/60 p-3.5 flex flex-col gap-3 overflow-hidden h-[calc(100vh-60px)]'
      }`}
    >
      {/* 顶部 Tab 切换器：灵感研讨 vs 专家流水线 */}
      <div className="flex rounded-xl bg-slate-900/90 p-1 border border-slate-800 shrink-0">
        <button
          onClick={() => setActiveDockTab('chat')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeDockTab === 'chat'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>灵感研讨 (AI对话)</span>
        </button>
        <button
          onClick={() => setActiveDockTab('pipeline')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeDockTab === 'pipeline'
              ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>专家流水线与稽查</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 模式 1：灵感研讨与 AI 对话 (Copilot Chat) */}
      {/* ==================================================================== */}
      {activeDockTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-2.5">
          {/* 当前研讨上下文概况 */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl px-3 py-2 shrink-0 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span className="font-medium truncate">
                《{novel.title}》· 第 {activeChapter?.chapterIndex || 1} 章 · 第 {activeScene?.sceneIndex || 1} 幕
              </span>
            </div>
            <button
              onClick={handleClearHistory}
              className="text-slate-500 hover:text-slate-300 p-1 rounded hover:bg-slate-800 transition shrink-0"
              title="清空研讨记录"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 快捷启发词卡片 */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 shrink-0 no-scrollbar">
            {promptSuggestions.map((item, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(item.prompt)}
                disabled={isSending}
                className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-indigo-200 transition shrink-0 whitespace-nowrap shadow-xs"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 研讨消息滚动流 */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3 text-xs min-h-0">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-500 px-1">
                    <span>{isUser ? '你' : 'AI 参谋'}</span>
                    <span>·</span>
                    <span>{msg.time}</span>
                  </div>

                  <div
                    className={`max-w-[95%] rounded-xl p-3 leading-relaxed whitespace-pre-wrap ${
                      isUser
                        ? 'bg-indigo-600/30 border border-indigo-500/40 text-indigo-100 rounded-tr-xs'
                        : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs shadow-md'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* AI 回复下方的实用采纳动作条 */}
                  {!isUser && (
                    <div className="flex items-center gap-2 text-[10px] px-1 pt-0.5">
                      <button
                        onClick={() => handleSendToPendingDraft(msg.content)}
                        className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-950/40 hover:bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/40 transition"
                        title="送入编辑区进行Diff对比采纳"
                      >
                        <FileDiff className="w-3 h-3" />
                        <span>送入Diff草稿</span>
                      </button>

                      <button
                        onClick={() => handleAppendToEditor(msg.content, msg.id)}
                        className="text-slate-400 hover:text-emerald-300 flex items-center gap-1 bg-slate-900 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 transition"
                        title="追加到正文末尾"
                      >
                        {addedToastId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">已追加</span>
                          </>
                        ) : (
                          <>
                            <PlusCircle className="w-3 h-3" />
                            <span>追加到文末</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleCopyText(msg.content, msg.id)}
                        className="text-slate-500 hover:text-slate-300 flex items-center gap-1 p-1 rounded hover:bg-slate-900 transition"
                        title="复制内容"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-indigo-400 bg-slate-900/60 p-2.5 rounded-xl border border-indigo-900/30">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI 参谋正在结合本幕设定与前文推演...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 底部输入框与发送按钮 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-2 shrink-0 space-y-2">
            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="向 AI 参谋提问或探讨情节（Enter 发送，Shift+Enter 换行）..."
              rows={2}
              className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 focus:outline-none resize-none leading-relaxed"
            />
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3 text-slate-600" />
                <span>Enter 发送</span>
              </span>
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputVal.trim()}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white font-medium rounded-lg text-xs transition flex items-center gap-1 shadow-sm"
              >
                {isSending ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <Send className="w-3 h-3" />
                )}
                <span>发送</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 模式 2：专家流水线与稽查 (Pipeline & Inspector) */}
      {/* ==================================================================== */}
      {activeDockTab === 'pipeline' && (
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
          {/* 1. 专家 Agent 矩阵选择器 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>Agent 专家矩阵</span>
              </span>
              <span className="text-[10px] text-slate-500">点击触发流水线</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 分镜导演 */}
              <button
                onClick={runDirectorPlanScenes}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
                  currentAgent === 'DIRECTOR' && isAgentRunning
                    ? 'bg-indigo-950/60 border-indigo-500/70 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">🎬 分镜导演</span>
                  {currentAgent === 'DIRECTOR' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500">规划 3 幕递进对抗节拍</span>
              </button>

              {/* 执笔起草 */}
              <button
                onClick={runDrafterWriteScene}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
                  currentAgent === 'DRAFTER' && isAgentRunning
                    ? 'bg-indigo-950/60 border-indigo-500/70 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">✍️ 执笔起草</span>
                  {currentAgent === 'DRAFTER' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500">带状态机硬约束生成</span>
              </button>

              {/* 设定稽查 */}
              <button
                onClick={runInspectorAudit}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
                  currentAgent === 'INSPECTOR' && isAgentRunning
                    ? 'bg-indigo-950/60 border-indigo-500/70 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">🔍 设定稽查</span>
                  {currentAgent === 'INSPECTOR' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500">查吃设定 / 战力 / OOC</span>
              </button>

              {/* 文风润色 */}
              <button
                onClick={() => runStylistPolish()}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 ${
                  currentAgent === 'STYLIST' && isAgentRunning
                    ? 'bg-indigo-950/60 border-indigo-500/70 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">🎨 文风润色</span>
                  {currentAgent === 'STYLIST' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin text-indigo-400" />
                  )}
                </div>
                <span className="text-[10px] text-slate-500">消除AI腔 / 增强张力</span>
              </button>
            </div>
          </div>

          {/* 2. 动态状态机跃迁提示 (State Machine Feedback) */}
          {suggestedStateUpdate && (
            <div className="bg-amber-950/30 border border-amber-600/50 rounded-xl p-3.5 space-y-2 animate-in slide-in-from-top-2">
              <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                <Activity className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>检测到角色状态跃迁！</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                正文激战完毕，建议同步将【{affectedChar?.name || '主角'}】的即时状态更新为：
              </p>
              <div className="bg-slate-950/80 rounded p-2 text-[11px] text-slate-300 space-y-1 border border-amber-900/30">
                <div>
                  <span className="text-slate-500">最新战力：</span>
                  <span className="text-amber-300 font-medium">{suggestedStateUpdate.combatPower}</span>
                </div>
                <div>
                  <span className="text-slate-500">所在地点：</span>
                  <span className="text-slate-200">{suggestedStateUpdate.location}</span>
                </div>
                <div>
                  <span className="text-slate-500">标签变动：</span>
                  <span className="text-red-400">{suggestedStateUpdate.statusTags?.join('、')}</span>
                </div>
              </div>
              <button
                onClick={applySuggestedStateUpdate}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-500 text-slate-950 font-semibold text-xs rounded-lg shadow-md transition flex items-center justify-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>一键同步更新人物状态机</span>
              </button>
            </div>
          )}

          {/* 3. 实时执行思维链与调用日志 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-indigo-400" />
                <span>执行思维追踪 (Agent Trace)</span>
              </span>
              {isAgentRunning && (
                <span className="text-[10px] text-indigo-400 animate-pulse flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  正在思考...
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {agentLogs.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  暂无执行日志，点击上方专家卡片开始协同创作
                </p>
              ) : (
                agentLogs.map((log, index) => (
                  <div
                    key={index}
                    className="bg-slate-950 border border-slate-900 rounded-lg p-2 text-xs space-y-0.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-300 flex items-center gap-1.5">
                        {log.status === 'running' ? (
                          <RefreshCw className="w-3 h-3 text-indigo-400 animate-spin" />
                        ) : log.status === 'warning' ? (
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        )}
                        {log.step}
                      </span>
                      <span className="text-[9px] text-slate-500 font-mono">
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-4 leading-relaxed">
                      {log.detail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. 设定稽查员合规报告 (Continuity Guard) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                <span>设定与逻辑合规稽查</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                {inspectionIssues.length} 项关注
              </span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {inspectionIssues.length === 0 ? (
                <div className="text-center py-5 text-slate-500 text-xs">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500/50 mx-auto mb-1" />
                  <span>暂未发现战力崩坏或吃设定违规</span>
                </div>
              ) : (
                inspectionIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className={`p-2.5 rounded-lg border text-xs space-y-1.5 ${
                      issue.severity === 'CRITICAL'
                        ? 'bg-red-950/30 border-red-800/50 text-red-200'
                        : issue.severity === 'WARNING'
                        ? 'bg-amber-950/30 border-amber-800/50 text-amber-200'
                        : 'bg-indigo-950/30 border-indigo-800/50 text-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1">
                        {issue.severity === 'CRITICAL' ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
                        ) : issue.severity === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span className="uppercase text-[10px] tracking-wider">
                          {issue.issueType}
                        </span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-950/80">
                        {issue.severity}
                      </span>
                    </div>

                    <div className="bg-slate-950/70 p-1.5 rounded text-[11px] font-mono text-slate-300">
                      <span className="text-slate-500">触碰点：</span>"{issue.locationSnippet}"
                    </div>

                    <p className="text-[11px] leading-relaxed opacity-90">
                      {issue.explanation}
                    </p>

                    <div className="text-[11px] text-emerald-400 bg-emerald-950/30 p-1.5 rounded border border-emerald-900/30">
                      <span className="font-semibold">建议：</span>{issue.fixAdvice}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
