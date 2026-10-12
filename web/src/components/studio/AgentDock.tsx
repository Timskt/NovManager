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
          : 'w-full border-l p-3.5 flex flex-col gap-3 overflow-hidden h-[calc(100vh-60px)]'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* 顶部 Tab 切换器：灵感研讨 vs 专家流水线 */}
      <div
        className="flex rounded-xl p-1 border shrink-0"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setActiveDockTab('chat')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeDockTab === 'chat'
              ? 'shadow-xs font-semibold'
              : 'hover:opacity-80'
          }`}
          style={
            activeDockTab === 'chat'
              ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
              : { color: 'var(--text-muted)' }
          }
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>灵感研讨 (AI对话)</span>
        </button>
        <button
          onClick={() => setActiveDockTab('pipeline')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition ${
            activeDockTab === 'pipeline'
              ? 'shadow-xs font-semibold'
              : 'hover:opacity-80'
          }`}
          style={
            activeDockTab === 'pipeline'
              ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
              : { color: 'var(--text-muted)' }
          }
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
          <div
            className="border rounded-xl px-3 py-2 shrink-0 flex items-center justify-between text-xs"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1.5 min-w-0" style={{ color: 'var(--text-main)' }}>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium truncate">
                《{novel.title}》· 第 {activeChapter?.chapterIndex || 1} 章 · 第 {activeScene?.sceneIndex || 1} 幕
              </span>
            </div>
            <button
              onClick={handleClearHistory}
              className="p-1 rounded transition shrink-0 hover:opacity-80"
              style={{ color: 'var(--text-muted)' }}
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
                className="px-2.5 py-1 rounded-full border text-[11px] transition shrink-0 whitespace-nowrap shadow-xs hover:opacity-80"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
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
                  <div className="flex items-center gap-1.5 text-[10px] px-1" style={{ color: 'var(--text-faint)' }}>
                    <span>{isUser ? '你' : 'AI 参谋'}</span>
                    <span>·</span>
                    <span>{msg.time}</span>
                  </div>

                  <div
                    className="max-w-[95%] rounded-xl p-3 leading-relaxed whitespace-pre-wrap border shadow-xs"
                    style={
                      isUser
                        ? {
                            backgroundColor: 'var(--accent-surface)',
                            borderColor: 'var(--accent-primary)',
                            color: 'var(--text-main)',
                          }
                        : {
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-main)',
                          }
                    }
                  >
                    {msg.content}
                  </div>

                  {/* AI 回复下方的实用采纳动作条 */}
                  {!isUser && (
                    <div className="flex items-center gap-2 text-[10px] px-1 pt-0.5">
                      <button
                        onClick={() => handleSendToPendingDraft(msg.content)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border transition cursor-pointer hover:opacity-85 shadow-2xs font-medium"
                        style={{
                          backgroundColor: 'var(--accent-surface)',
                          borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--border-subtle))',
                          color: 'var(--accent-primary)',
                        }}
                        title="送入编辑区进行Diff对比采纳"
                      >
                        <FileDiff className="w-3 h-3" />
                        <span>送入Diff草稿</span>
                      </button>

                      <button
                        onClick={() => handleAppendToEditor(msg.content, msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded border transition cursor-pointer hover:opacity-80"
                        style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
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
                        className="flex items-center gap-1 p-1 rounded transition cursor-pointer hover:opacity-80"
                        style={{ color: 'var(--text-muted)' }}
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
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--accent-primary)' }}>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>AI 参谋正在结合本幕设定与前文推演...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 底部输入框与发送按钮 */}
          <div
            className="border rounded-xl p-2 shrink-0 space-y-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
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
              className="w-full bg-transparent text-xs focus:outline-none resize-none leading-relaxed placeholder:opacity-30"
              style={{ color: 'var(--text-main)' }}
            />
            <div
              className="flex items-center justify-between pt-1 border-t text-[11px]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <span className="flex items-center gap-1 opacity-70">
                <CornerDownLeft className="w-3 h-3" />
                <span>Enter 发送</span>
              </span>
              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputVal.trim()}
                className="px-3 py-1 text-white font-medium rounded-lg text-xs transition flex items-center gap-1 shadow-sm disabled:opacity-40 hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)' }}
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
          <div
            className="rounded-xl p-3 space-y-2.5 border shadow-xs"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Agent 专家矩阵</span>
              </span>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                点击触发流水线
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 分镜导演 */}
              <button
                onClick={runDirectorPlanScenes}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
                  currentAgent === 'DIRECTOR' && isAgentRunning
                    ? 'shadow-xs font-semibold'
                    : 'hover:opacity-85'
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor:
                    currentAgent === 'DIRECTOR' && isAgentRunning
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">🎬 分镜导演</span>
                  {currentAgent === 'DIRECTOR' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  )}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  规划 3 幕递进对抗节拍
                </span>
              </button>

              {/* 执笔起草 */}
              <button
                onClick={runDrafterWriteScene}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
                  currentAgent === 'DRAFTER' && isAgentRunning
                    ? 'shadow-xs font-semibold'
                    : 'hover:opacity-85'
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor:
                    currentAgent === 'DRAFTER' && isAgentRunning
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">✍️ 执笔起草</span>
                  {currentAgent === 'DRAFTER' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  )}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  带状态机硬约束生成
                </span>
              </button>

              {/* 设定稽查 */}
              <button
                onClick={runInspectorAudit}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
                  currentAgent === 'INSPECTOR' && isAgentRunning
                    ? 'shadow-xs font-semibold'
                    : 'hover:opacity-85'
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor:
                    currentAgent === 'INSPECTOR' && isAgentRunning
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">🔍 设定稽查</span>
                  {currentAgent === 'INSPECTOR' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  )}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  查吃设定 / 战力 / OOC
                </span>
              </button>

              {/* 文风润色 */}
              <button
                onClick={() => runStylistPolish()}
                disabled={isAgentRunning}
                className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-1 cursor-pointer ${
                  currentAgent === 'STYLIST' && isAgentRunning
                    ? 'shadow-xs font-semibold'
                    : 'hover:opacity-85'
                }`}
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor:
                    currentAgent === 'STYLIST' && isAgentRunning
                      ? 'var(--accent-primary)'
                      : 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">🎨 文风润色</span>
                  {currentAgent === 'STYLIST' && isAgentRunning && (
                    <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                  )}
                </div>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  消除AI腔 / 增强张力
                </span>
              </button>
            </div>
          </div>

          {/* 2. 动态状态机跃迁提示 (State Machine Feedback) */}
          {suggestedStateUpdate && (
            <div
              className="rounded-xl p-3.5 space-y-2.5 animate-in slide-in-from-top-2 border shadow-xs"
              style={{
                backgroundColor: 'color-mix(in srgb, #f59e0b 8%, var(--bg-card))',
                borderColor: 'color-mix(in srgb, #f59e0b 30%, var(--border-subtle))',
              }}
            >
              <div className="flex items-center gap-2 text-xs font-semibold">
                <Activity className="w-4 h-4 text-amber-500 animate-pulse" />
                <span style={{ color: 'var(--text-main)' }}>检测到角色状态跃迁！</span>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                正文推演完毕，建议同步将【{affectedChar?.name || '主角'}】的即时状态更新为：
              </p>
              <div
                className="rounded-lg p-2.5 text-[11px] space-y-1.5 border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>最新战力</span>
                  <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>{suggestedStateUpdate.combatPower}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>所在地点</span>
                  <span className="font-medium" style={{ color: 'var(--text-main)' }}>{suggestedStateUpdate.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>状态变动</span>
                  <span className="text-rose-500 font-medium">{suggestedStateUpdate.statusTags?.join('、')}</span>
                </div>
              </div>
              <button
                onClick={applySuggestedStateUpdate}
                className="w-full py-2 px-3 text-white font-semibold text-xs rounded-lg shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-90 active:scale-[0.99]"
                style={{ backgroundColor: '#d97706' }}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>一键同步更新人物状态机</span>
              </button>
            </div>
          )}

          {/* 3. 实时执行思维链与调用日志 */}
          <div
            className="rounded-xl p-3 space-y-2 border shadow-xs"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                <span>执行思维追踪 (Agent Trace)</span>
              </span>
              {isAgentRunning && (
                <span className="text-[10px] animate-pulse flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent-primary)' }} />
                  正在思考...
                </span>
              )}
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {agentLogs.length === 0 ? (
                <p className="text-xs py-3 text-center" style={{ color: 'var(--text-muted)' }}>
                  暂无执行日志，点击上方专家卡片开始协同创作
                </p>
              ) : (
                agentLogs.map((log, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-2 text-xs space-y-0.5"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                        {log.status === 'running' ? (
                          <RefreshCw className="w-3 h-3 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                        ) : log.status === 'warning' ? (
                          <AlertTriangle className="w-3 h-3 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                        )}
                        {log.step}
                      </span>
                      <span className="text-[9px] font-mono" style={{ color: 'var(--text-faint)' }}>
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] pl-4 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {log.detail}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. 设定稽查员合规报告 (Continuity Guard) */}
          <div
            className="rounded-xl p-3 space-y-2 border shadow-xs"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-main)' }}>
              <span className="flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                <span>设定与逻辑合规稽查</span>
              </span>
              <span
                className="text-[10px] px-1.5 py-0.2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {inspectionIssues.length} 项关注
              </span>
            </div>

            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {inspectionIssues.length === 0 ? (
                <div className="text-center py-6 text-xs space-y-1.5" style={{ color: 'var(--text-muted)' }}>
                  <CheckCircle2 className="w-6 h-6 text-emerald-500/70 mx-auto" />
                  <span className="font-medium">设定严谨，未发现逻辑冲突或战力崩坏</span>
                </div>
              ) : (
                inspectionIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3 rounded-xl border text-xs space-y-2 shadow-2xs"
                    style={{
                      backgroundColor:
                        issue.severity === 'CRITICAL'
                          ? 'color-mix(in srgb, #ef4444 6%, var(--bg-card))'
                          : issue.severity === 'WARNING'
                          ? 'color-mix(in srgb, #f59e0b 6%, var(--bg-card))'
                          : 'color-mix(in srgb, var(--accent-primary) 6%, var(--bg-card))',
                      borderColor:
                        issue.severity === 'CRITICAL'
                          ? 'color-mix(in srgb, #ef4444 26%, var(--border-subtle))'
                          : issue.severity === 'WARNING'
                          ? 'color-mix(in srgb, #f59e0b 26%, var(--border-subtle))'
                          : 'color-mix(in srgb, var(--accent-primary) 26%, var(--border-subtle))',
                    }}
                  >
                    <div className="flex items-center justify-between font-semibold">
                      <span className="flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                        {issue.severity === 'CRITICAL' ? (
                          <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        ) : issue.severity === 'WARNING' ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        ) : (
                          <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--accent-primary)' }} />
                        )}
                        <span className="text-xs tracking-tight">
                          {issue.issueType}
                        </span>
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-mono font-medium border"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color:
                            issue.severity === 'CRITICAL'
                              ? '#ef4444'
                              : issue.severity === 'WARNING'
                              ? '#f59e0b'
                              : 'var(--accent-primary)',
                        }}
                      >
                        {issue.severity}
                      </span>
                    </div>

                    <div
                      className="p-2 rounded-lg text-[11px] font-mono border"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-main)',
                      }}
                    >
                      <span style={{ color: 'var(--text-muted)' }}>违规切片：</span>"{issue.locationSnippet}"
                    </div>

                    <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {issue.explanation}
                    </p>

                    <div
                      className="text-[11px] p-2 rounded-lg border flex items-start gap-1.5 leading-relaxed"
                      style={{
                        backgroundColor: 'color-mix(in srgb, #10b981 10%, var(--bg-surface))',
                        borderColor: 'color-mix(in srgb, #10b981 25%, var(--border-subtle))',
                      }}
                    >
                      <Lightbulb className="w-3.5 h-3.5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                      <div>
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">自愈建议：</span>
                        <span style={{ color: 'var(--text-main)' }}>{issue.fixAdvice}</span>
                      </div>
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
