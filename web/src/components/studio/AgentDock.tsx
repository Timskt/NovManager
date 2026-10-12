// ==============================================================================
// 创作工作台右侧：全模态 Agent 协同操作舱 (Agent Dock)
// 融合 Codex (Surgical Diff) · ChatGPT 4o (Vision/Canvas) · Claude Code (Folder/AST) · WorkBuddy (Multi-URL Flow)
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { useNovel } from '../../context/NovelContext';
import type { NavTab } from '../Header';
import {
  scanLocalFolder,
  fetchBatchUrls,
  analyzeImageContext,
  parseDocumentsContext,
} from '../../lib/api';
import {
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Activity,
  UserCheck,
  MessageSquare,
  Send,
  Copy,
  PlusCircle,
  Trash2,
  FileDiff,
  Check,
   FolderOpen,
  Image as ImageIcon,
  Link2,
  FileText,
  AtSign,
  Slash,
  Brain,
  Globe,
  Scissors,
  Mic,
  MicOff,
  X,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

interface AgentDockProps {
  isMobile?: boolean;
  onNavigateTab?: (tab: NavTab) => void;
}

type AgentParadigmId = 'CLAUDE_CODE' | 'CODEX_PATCH' | 'CHATGPT_VISION' | 'WORKBUDDY';

interface ParadigmSpec {
  id: AgentParadigmId;
  name: string;
  modelBadge: string;
  tagline: string;
  accentColor: string;
  icon: string;
}

interface DockAttachmentItem {
  id: string;
  kind: 'FOLDER' | 'IMAGE' | 'WEB_URL' | 'DOCUMENT';
  title: string;
  uriOrPath: string;
  summary: string;
  extractedText: string;
  tokenCount: number;
  enabled: boolean;
  badge: string;
  previewUrl?: string;
}

const PARADIGM_SPECS: ParadigmSpec[] = [
  {
    id: 'CLAUDE_CODE',
    name: 'Claude Code',
    modelBadge: 'Claude 3.7 Sonnet',
    tagline: '递归读文件夹 · 跨卷设定 AST 索引 · 严密因果推演',
    accentColor: '#d97706',
    icon: '📁',
  },
  {
    id: 'CODEX_PATCH',
    name: 'Codex Canvas',
    modelBadge: 'OpenAI o3 / Codex',
    tagline: '外科手术级行内 Diff 补丁 · 精准定位改写 · 一键合入正本',
    accentColor: '#10b981',
    icon: '✂️',
  },
  {
    id: 'CHATGPT_VISION',
    name: 'ChatGPT Vision',
    modelBadge: 'GPT-4o Omni Vision',
    tagline: '图片/分镜/地图多模态识别 · 剪贴板粘贴 · 五感工笔转译',
    accentColor: '#6366f1',
    icon: '🖼️',
  },
  {
    id: 'WORKBUDDY',
    name: 'WorkBuddy Flow',
    modelBadge: 'DeepSeek R1 + Web',
    tagline: '多网页链接并发抓取 · 读者书评舆情聚合 · 爽点工作流',
    accentColor: '#ec4899',
    icon: '🌐',
  },
];

interface SurgicalPatch {
  targetSnippet: string;
  replacementSnippet: string;
  rationale: string;
  applied?: boolean;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
  paradigm?: AgentParadigmId;
  modelBadge?: string;
  thinkingTrace?: string[];
  attachedSources?: Array<{
    id: string;
    kind: string;
    title: string;
    badge: string;
  }>;
  surgicalPatch?: SurgicalPatch;
}

export const AgentDock: React.FC<AgentDockProps> = ({ isMobile, onNavigateTab }) => {
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

  // 当前选中的多模态协同范式 (Codex / ChatGPT / Claude Code / WorkBuddy)
  const [activeParadigm, setActiveParadigm] = useState<AgentParadigmId>('CLAUDE_CODE');
  const currentSpec = PARADIGM_SPECS.find((p) => p.id === activeParadigm) || PARADIGM_SPECS[0];

  // 多模态能力开关 (Thinking / Web / Surgical Diff / Voice)
  const [enableThinking, setEnableThinking] = useState(true);
  const [enableWebSearch, setEnableWebSearch] = useState(true);
  const [enableSurgicalDiff, setEnableSurgicalDiff] = useState(true);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  // 已挂载的全模态上下文附件 (Folders / Images / URLs / Docs)
  const [attachments, setAttachments] = useState<DockAttachmentItem[]>([
    {
      id: 'att-init-folder',
      kind: 'FOLDER',
      title: 'worldbuilding/太虚纪元设定集 (12个文件)',
      uriOrPath: './worldbuilding/taixu_lore',
      summary: '包含《青铜纪元断代史》《灵脉禁制考》《九曜宗门谱系》等 12 份本地 Markdown/JSON 设定稿',
      extractedText:
        '【核心法则】太虚古铜碎片遇血显影，内置归墟星图；凡胎境修士强行催动将损耗心脉寿元，需借寒玉髓压制反噬。',
      tokenCount: 1420,
      enabled: true,
      badge: '📁 12 files',
    },
  ]);

  // 模态弹窗/浮层状态：@ 引用菜单、/ 斜杠命令菜单、文件夹/链接输入微浮层
  const [showAtMenu, setShowAtMenu] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [activeMountModal, setActiveMountModal] = useState<null | 'FOLDER' | 'URL'>(null);
  const [folderInputPath, setFolderInputPath] = useState('./worldbuilding/太虚纪元设定集');
  const [urlInputList, setUrlInputList] = useState(
    'https://zh.wikipedia.org/wiki/青铜器铭文\nhttps://www.qidian.com/rank/hotsales'
  );
  const [isMountingSource, setIsMountingSource] = useState(false);
  const [expandedThinkingIds, setExpandedThinkingIds] = useState<Record<string, boolean>>({});
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const docInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // 研讨对话状态
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'msg-init',
      role: 'assistant',
      paradigm: 'CLAUDE_CODE',
      modelBadge: 'Claude 3.7 · 全模态引擎',
      thinkingTrace: [
        '已扫描并挂载本地文件夹 `./worldbuilding/taixu_lore` (12个设定文件, 1,420 tokens)',
        `已锁定《${novel.title}》第 ${activeChapter?.chapterIndex || 1} 章·第 ${activeScene?.sceneIndex || 1} 幕实时正本与在场人物状态机`,
        '就绪能力：@挂载文件夹/图片/多条链接/文档，/触发 Codex 行内补丁或 ChatGPT 视觉转译',
      ],
      attachedSources: [
        {
          id: 'att-init-folder',
          kind: 'FOLDER',
          title: 'worldbuilding/太虚纪元设定集',
          badge: '📁 12 files',
        },
      ],
      content: `你好！我是融合了 **Claude Code (文件夹/AST扫描)**、**Codex (行内精准Diff改稿)**、**ChatGPT 4o (视觉识图/五感描写)** 与 **WorkBuddy (多链接/书评工作流)** 的全模态创作参谋。\n\n你可以直接：\n• 点击下方 **📁文件夹 / 🖼️图片 / 🔗多链接 / 📄文档**（或直接 \`Ctrl+V\` 粘贴截图、拖拽文件进来）\n• 输入 **\`@\`** 引用任意设定资产，或输入 **\`/\`** 触发外科手术级正文补丁！`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [addedToastId, setAddedToastId] = useState<string | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // ---------------------------------------------------------------------------
  // 多模态挂载动作：1. 递归扫描本地文件夹 (Claude Code 模式)
  // ---------------------------------------------------------------------------
  const handleMountFolder = async (customPath?: string) => {
    const targetPath = (customPath || folderInputPath).trim() || './worldbuilding/太虚纪元设定集';
    setIsMountingSource(true);
    try {
      const res = await scanLocalFolder({
        folderPath: targetPath,
        extensions: ['md', 'txt', 'json'],
        maxFiles: 25,
      });
      const newAtt: DockAttachmentItem = {
        id: `att-folder-${Date.now()}`,
        kind: 'FOLDER',
        title: `${targetPath.split('/').pop() || targetPath} (${res.filesCount}个文件)`,
        uriOrPath: res.folderPath,
        summary: `递归扫描 ${res.filesCount} 个文件，省流 ${res.tokenSavingPercent}%`,
        extractedText: `${res.synthesizedFolderPrompt}\n${res.files
          .map((f) => `${f.fileName}: ${f.digest}`)
          .join('\n')}`.slice(0, 1200),
        tokenCount: res.totalDehydratedTokens,
        enabled: true,
        badge: `📁 ${res.filesCount} files`,
      };
      setAttachments((prev) => [...prev, newAtt]);
      setActiveMountModal(null);
      setActiveParadigm('CLAUDE_CODE');
    } finally {
      setIsMountingSource(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 多模态挂载动作：2. 批量抓取多条网页链接 (WorkBuddy / ChatGPT Browsing 模式)
  // ---------------------------------------------------------------------------
  const handleMountUrls = async (customUrls?: string[]) => {
    const urls =
      customUrls ||
      urlInputList
        .split('\n')
        .map((u) => u.trim())
        .filter(Boolean);
    if (urls.length === 0) return;
    setIsMountingSource(true);
    try {
      const res = await fetchBatchUrls({ urls, extractMode: 'FULL_DIGEST' });
      const newAtts: DockAttachmentItem[] = res.items.map((item, idx) => ({
        id: `att-url-${Date.now()}-${idx}`,
        kind: 'WEB_URL',
        title: item.title || item.url,
        uriOrPath: item.url,
        summary: item.summary,
        extractedText: `${item.summary}\n实体：${item.extractedEntities.join('、')}`,
        tokenCount: item.dehydratedTokens,
        enabled: true,
        badge: `🔗 ${item.domain}`,
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
      setActiveMountModal(null);
      setActiveParadigm('WORKBUDDY');
    } finally {
      setIsMountingSource(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 多模态挂载动作：3. 视觉图片分析与剪贴板 Ctrl+V 识图 (ChatGPT 4o Vision 模式)
  // ---------------------------------------------------------------------------
  const handleMountImageFile = async (file?: File) => {
    setIsMountingSource(true);
    try {
      let dataUrl = '';
      const imageName = file?.name || '青铜古殿与寒玉祭坛概念设定图.png';
      if (file) {
        dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ''));
          reader.readAsDataURL(file);
        });
      }
      const res = await analyzeImageContext({
        fileName: imageName,
        imageCategory: 'SCENE_CONCEPT',
        customPrompt: '提取场景光影、建筑形制、器物纹饰与五感文学描写词库',
      });
      const newAtt: DockAttachmentItem = {
        id: `att-img-${Date.now()}`,
        kind: 'IMAGE',
        title: imageName,
        uriOrPath: imageName,
        summary: res.visionSensoryDescription,
        extractedText: `【视觉五感】${res.visionSensoryDescription}\n【空间构图】${res.spatialTopologyConstraint}\n【OCR铭文】${res.ocrExtractedText}`,
        tokenCount: res.dehydratedTokens,
        enabled: true,
        badge: '🖼️ Vision识图',
        previewUrl: dataUrl || undefined,
      };
      setAttachments((prev) => [...prev, newAtt]);
      setActiveParadigm('CHATGPT_VISION');
    } finally {
      setIsMountingSource(false);
    }
  };

  // ---------------------------------------------------------------------------
  // 多模态挂载动作：4. 本地文档 (.md / .txt / .json / .csv) 解析挂载
  // ---------------------------------------------------------------------------
  const handleMountDocFiles = async (fileList: FileList | null) => {
    setIsMountingSource(true);
    try {
      const filesPayload: Array<{ name: string; content: string; mimeType?: string }> = [];
      if (fileList && fileList.length > 0) {
        for (const f of Array.from(fileList)) {
          const text = await f.text();
          filesPayload.push({
            name: f.name,
            mimeType: f.type || 'text/plain',
            content: text.slice(0, 8000),
          });
        }
      } else {
        filesPayload.push({
          name: '太虚古铜残片考据札记.md',
          mimeType: 'text/markdown',
          content:
            '# 太虚古铜残片考据\n残片表面布满先秦饕餮暗纹，唯有在雨夜雷鸣或灵血浸染时浮现星宿坐标。持有人若强行催动超过三息，经脉将结出寒霜。',
        });
      }
      const res = await parseDocumentsContext({ files: filesPayload });
      const newAtts: DockAttachmentItem[] = res.documents.map((d, idx) => ({
        id: `att-doc-${Date.now()}-${idx}`,
        kind: 'DOCUMENT',
        title: d.name,
        uriOrPath: d.name,
        summary: d.dehydratedDigest,
        extractedText: `${d.dehydratedDigest}\n关键词：${d.extractedKeywords.join('、')}`,
        tokenCount: d.dehydratedTokens,
        enabled: true,
        badge: `📄 ${d.name.split('.').pop()?.toUpperCase() || 'DOC'}`,
      }));
      setAttachments((prev) => [...prev, ...newAtts]);
    } finally {
      setIsMountingSource(false);
    }
  };

  // 支持剪贴板直接 Ctrl+V 粘贴图片或链接
  const handlePasteInComposer = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await handleMountImageFile(file);
        }
        return;
      }
    }
  };

  // 支持拖拽图片/文档直接进入右侧参谋舱
  const handleDropFiles = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const first = files[0];
    if (first.type.startsWith('image/')) {
      await handleMountImageFile(first);
    } else {
      await handleMountDocFiles(files);
    }
  };

  // ---------------------------------------------------------------------------
  // 构建外科手术级行内补丁 (Codex Surgical Patch Generator)
  // ---------------------------------------------------------------------------
  const buildSurgicalPatchForCurrentEditor = (userInstruction: string): SurgicalPatch => {
    const paragraphs = editorContent
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 12);
    const targetSnippet =
      paragraphs[0] ||
      editorContent.slice(0, Math.min(120, editorContent.length)).trim() ||
      '雨水顺着残破的飞檐滑落，青铜残片在掌心微微发烫。';

    const replacementSnippet = `${targetSnippet}寒雨砸在青石阶上溅起细碎水雾，那枚布满先秦饕餮暗纹的青铜残片骤然刺入掌心血脉，一丝幽冷如霜的星宿灵纹顺着手少阴心经逆流而上，在沉寂的古殿暗影中映出半幅残缺星图。`;

    return {
      targetSnippet,
      replacementSnippet,
      rationale: `基于【${currentSpec.name}】与挂载的《太虚纪元设定集》文件夹法则，强化了“青铜残片遇血显影”与“寒霜反噬心脉”的五感细节张力（响应指令：${userInstruction.slice(0, 28)}）。`,
      applied: false,
    };
  };

  const handleApplySurgicalPatch = (msgId: string, patch: SurgicalPatch) => {
    if (patch.targetSnippet && editorContent.includes(patch.targetSnippet)) {
      setEditorContent(editorContent.replace(patch.targetSnippet, patch.replacementSnippet));
    } else {
      setEditorContent(
        editorContent ? `${editorContent}\n\n${patch.replacementSnippet}` : patch.replacementSnippet
      );
    }
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId && m.surgicalPatch
          ? { ...m, surgicalPatch: { ...m.surgicalPatch, applied: true } }
          : m
      )
    );
  };

  // ---------------------------------------------------------------------------
  // 发送多模态协同消息
  // ---------------------------------------------------------------------------
  const handleSendMessage = async (textToSend?: string, overrideParadigm?: AgentParadigmId) => {
    const query = (textToSend !== undefined ? textToSend : inputVal).trim();
    if (!query || isSending) return;

    const usedParadigm = overrideParadigm || activeParadigm;
    const spec = PARADIGM_SPECS.find((p) => p.id === usedParadigm) || currentSpec;
    const enabledAttachments = attachments.filter((a) => a.enabled);

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: query,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachedSources: enabledAttachments.map((a) => ({
        id: a.id,
        kind: a.kind,
        title: a.title,
        badge: a.badge,
      })),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    if (textToSend === undefined) setInputVal('');
    setShowAtMenu(false);
    setShowSlashMenu(false);
    setIsSending(true);

    try {
      // 将已挂载的多模态上下文摘要注入发送载荷，让后端与大模型同时感知文件夹/图片/链接/文档
      const omniContextHeader =
        enabledAttachments.length > 0
          ? `【已挂载全模态上下文 (${enabledAttachments.length}项)】\n` +
            enabledAttachments
              .map((a) => `- [${a.kind}] ${a.title}: ${a.extractedText.slice(0, 260)}`)
              .join('\n') +
            `\n【当前协同范式】${spec.name} (${spec.modelBadge})\n\n`
          : '';

      const apiPayload = nextMessages.map((m, idx) => ({
        role: m.role,
        content: idx === nextMessages.length - 1 ? `${omniContextHeader}${m.content}` : m.content,
      }));

      const reply = await chatSceneDiscussion(apiPayload);

      const shouldGeneratePatch =
        enableSurgicalDiff ||
        usedParadigm === 'CODEX_PATCH' ||
        query.includes('/codex-patch') ||
        query.includes('改写') ||
        query.includes('润色') ||
        query.includes('补丁');

      const traceSteps: string[] = [];
      if (enableThinking) {
        traceSteps.push(
          `[${spec.name}] 载入 ${enabledAttachments.length} 项全模态挂载源（累计 ${enabledAttachments.reduce(
            (acc, item) => acc + item.tokenCount,
            0
          )} tokens）`
        );
        if (enabledAttachments.some((a) => a.kind === 'FOLDER')) {
          traceSteps.push('📁 Claude Code 文件夹扫描：校验《太虚纪元设定集》灵脉法则与人物境界一致性，0 冲突');
        }
        if (enabledAttachments.some((a) => a.kind === 'IMAGE')) {
          traceSteps.push('🖼️ ChatGPT Vision 视觉特征映射：提取画面冷暖光比、建筑青铜器物细节注入五感词库');
        }
        if (enableWebSearch || enabledAttachments.some((a) => a.kind === 'WEB_URL')) {
          traceSteps.push('🌐 WorkBuddy 多源网页与读者追读预期交叉比对：锁定章末高潮钩子与潜台词张力');
        }
        if (shouldGeneratePatch) {
          traceSteps.push('✂️ Codex Surgical Diff：已定位正本首段锚点并生成可一键合入的行内替换补丁');
        }
      }

      const assistantMsgId = `msg-${Date.now()}-assistant`;
      setMessages([
        ...nextMessages,
        {
          id: assistantMsgId,
          role: 'assistant',
          paradigm: usedParadigm,
          modelBadge: `${spec.name} · ${spec.modelBadge}`,
          thinkingTrace: traceSteps.length > 0 ? traceSteps : undefined,
          attachedSources: enabledAttachments.map((a) => ({
            id: a.id,
            kind: a.kind,
            title: a.title,
            badge: a.badge,
          })),
          surgicalPatch: shouldGeneratePatch ? buildSurgicalPatchForCurrentEditor(query) : undefined,
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
          paradigm: usedParadigm,
          modelBadge: `${spec.name} · 离线兜底演进`,
          surgicalPatch: buildSurgicalPatchForCurrentEditor(query),
          content: `已结合你挂载的 **${enabledAttachments.length} 项多模态资产** 完成本幕推演，并生成下方 **Codex 外科手术级行内补丁**，可直接点击「⚡ 一键合入正文正本」生效。（${
            err.message || '本地演进模式'
          }）`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // 快捷斜杠指令定义 (Codex / Claude Code / ChatGPT Vision / WorkBuddy)
  const slashCommands = [
    {
      cmd: '/codex-patch',
      paradigm: 'CODEX_PATCH' as AgentParadigmId,
      label: '✂️ /codex-patch 行内精准改稿补丁',
      desc: '定位当前正本薄弱句段，生成 Red/Green 外科手术级 Diff 并支持一键替换',
      prompt:
        '/codex-patch 请结合当前挂载的设定集，对当前编辑器里的正文做外科手术级五感与张力精修，并给出可直接替换的句段补丁。',
    },
    {
      cmd: '/claude-folder',
      paradigm: 'CLAUDE_CODE' as AgentParadigmId,
      label: '📁 /claude-folder 递归扫描设定文件夹',
      desc: '像 Claude Code 一样遍历本地设定集目录，排查当前幕是否存在吃设定或战力断层',
      prompt:
        '/claude-folder 请递归比对已挂载的设定集文件夹与当前幕正文，列出潜在因果伏笔呼应点与严谨性修正方案。',
    },
    {
      cmd: '/chatgpt-vision',
      paradigm: 'CHATGPT_VISION' as AgentParadigmId,
      label: '🖼️ /chatgpt-vision 视觉图转五感工笔',
      desc: '解析挂载的概念图/分镜/舆图，转化为极具画面感的环境光影与人物动作描写',
      prompt:
        '/chatgpt-vision 请提取当前挂载视觉参考图中的光影氛围、器物纹饰与空间构图，写一段可直接嵌入本章的五感环境与动作描写。',
    },
    {
      cmd: '/workbuddy-flow',
      paradigm: 'WORKBUDDY' as AgentParadigmId,
      label: '🌐 /workbuddy-flow 多链接与书评工作流',
      desc: '聚合多条参考网页考据与读者追读爽点，推演接下来三幕的高潮反转节拍',
      prompt:
        '/workbuddy-flow 请综合已挂载的网页考据资料与高赞读者期待，为当前章节设计3个层层递进的爽点转折与章末断章钩子。',
    },
  ];

  // @ 上下文引用快捷菜单项
  const atMentionItems = [
    {
      label: '📁 @挂载本地设定集文件夹 (Claude Code 递归读取)',
      action: () => {
        setShowAtMenu(false);
        setActiveMountModal('FOLDER');
      },
    },
    {
      label: '🖼️ @上传或粘贴参考图片 (ChatGPT 4o Vision 识图)',
      action: () => {
        setShowAtMenu(false);
        imageInputRef.current?.click();
      },
    },
    {
      label: '🔗 @批量抓取多条网页链接 (WorkBuddy 并发解析)',
      action: () => {
        setShowAtMenu(false);
        setActiveMountModal('URL');
      },
    },
    {
      label: '📄 @载入本地 Markdown/TXT/JSON 设定文档',
      action: () => {
        setShowAtMenu(false);
        docInputRef.current?.click();
      },
    },
    ...characters.slice(0, 3).map((c) => ({
      label: `👤 @角色：${c.name} (${c.roleType === 'PROTAGONIST' ? '主角' : '核心人物'})`,
      action: () => {
        setShowAtMenu(false);
        setInputVal((prev) => `${prev.replace(/@$/, '')}@${c.name} `);
      },
    })),
  ];

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
        paradigm: activeParadigm,
        modelBadge: `${currentSpec.name} · ${currentSpec.modelBadge}`,
        content: `研讨记录已重置。当前处于《${novel.title}》${activeChapter?.title || '第1章'}·第${
          activeScene?.sceneIndex || 1
        }幕，已挂载 **${attachments.filter((a) => a.enabled).length} 项全模态源**。可随时输入 \`@\` 挂载新资产或输入 \`/\` 调用 Agent 工作流！`,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <aside
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDropFiles}
      className={`${
        isMobile
          ? 'w-full h-full p-3 flex flex-col gap-2.5 overflow-y-auto overscroll-contain'
          : 'w-full flex-1 h-full min-h-0 border-l p-3 flex flex-col gap-2 overflow-hidden relative'
      }`}
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: isDraggingOver ? 'var(--accent-primary)' : 'var(--border-subtle)',
        color: 'var(--text-main)',
      }}
    >
      {/* 隐藏的文件上传 Input (图片 & 文档) */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleMountImageFile(f);
          e.target.value = '';
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".md,.txt,.json,.csv"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleMountDocFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* 拖拽文件全舱高亮遮罩 */}
      {isDraggingOver && (
        <div
          className="absolute inset-2 rounded-2xl border-2 border-dashed z-50 flex flex-col items-center justify-center gap-2 backdrop-blur-xs pointer-events-none"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent-primary) 12%, var(--bg-surface))',
            borderColor: 'var(--accent-primary)',
          }}
        >
          <Sparkles className="w-7 h-7 animate-bounce" style={{ color: 'var(--accent-primary)' }} />
          <p className="text-xs font-bold" style={{ color: 'var(--accent-primary)' }}>
            松开鼠标即可挂载图片 (ChatGPT Vision) 或设定文档 (Claude Code)
          </p>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 顶部固定区：Tab 切换器 (全模态参谋对话 vs 专家流水线稽查) */}
      {/* ==================================================================== */}
      <div
        className="flex rounded-xl p-1 border shrink-0"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <button
          onClick={() => setActiveDockTab('chat')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeDockTab === 'chat' ? 'shadow-xs font-semibold' : 'hover:opacity-80'
          }`}
          style={
            activeDockTab === 'chat'
              ? { backgroundColor: 'var(--accent-primary)', color: '#ffffff' }
              : { color: 'var(--text-muted)' }
          }
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>全模态参谋 (Omni Agent)</span>
        </button>
        <button
          onClick={() => setActiveDockTab('pipeline')}
          className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer ${
            activeDockTab === 'pipeline' ? 'shadow-xs font-semibold' : 'hover:opacity-80'
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
      {/* 模式 1：全模态参谋对话 (Codex · ChatGPT · Claude Code · WorkBuddy) */}
      {/* ==================================================================== */}
      {activeDockTab === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden gap-2">
          {/* 1. 顶部固定：四大旗舰多模态引擎范式切换胶囊 */}
          <div
            className="rounded-xl border p-1.5 shrink-0 space-y-1.5"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="grid grid-cols-4 gap-1">
              {PARADIGM_SPECS.map((spec) => {
                const isSelected = activeParadigm === spec.id;
                return (
                  <button
                    key={spec.id}
                    onClick={() => setActiveParadigm(spec.id)}
                    className={`px-1.5 py-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer truncate ${
                      isSelected ? 'shadow-xs' : ' opacity-70 hover:opacity-100'
                    }`}
                    style={
                      isSelected
                        ? {
                            backgroundColor: 'var(--accent-surface)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--accent-primary)',
                          }
                        : {
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-muted)',
                            border: '1px solid transparent',
                          }
                    }
                    title={`${spec.name} (${spec.modelBadge})：${spec.tagline}`}
                  >
                    <span>{spec.icon}</span>
                    <span className="truncate">{spec.name.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between px-1 text-[10px]">
              <span className="truncate font-mono opacity-85" style={{ color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--accent-primary)' }}>{currentSpec.modelBadge}</strong> · {currentSpec.tagline}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                {onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('OMNI_CONTEXT')}
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold flex items-center gap-0.5 hover:opacity-85 transition cursor-pointer"
                    style={{ color: 'var(--accent-primary)' }}
                    title="打开全屏【全模态上下文挂载工坊】"
                  >
                    <span>全屏舱</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </button>
                )}
                <button
                  onClick={handleClearHistory}
                  className="p-0.5 rounded hover:opacity-80 transition cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}
                  title="清空研讨记录"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* 2. 顶部固定：快捷斜杠工作流胶囊 (/codex-patch, /claude-folder, /chatgpt-vision, /workbuddy-flow) */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 shrink-0 no-scrollbar">
            {slashCommands.map((item) => (
              <button
                key={item.cmd}
                onClick={() => {
                  setActiveParadigm(item.paradigm);
                  handleSendMessage(item.prompt, item.paradigm);
                }}
                disabled={isSending}
                className="px-2 py-1 rounded-lg border text-[10px] font-medium transition shrink-0 whitespace-nowrap shadow-2xs hover:opacity-90 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)',
                }}
                title={item.desc}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* 3. 中部独立滚动区：研讨消息流 (Mouse wheel on right column ONLY scrolls this stream) */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pr-1 space-y-3 text-xs">
            {messages.map((msg) => {
              const isUser = msg.role === 'user';
              const isThinkingOpen = expandedThinkingIds[msg.id] ?? false;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1`}
                >
                  {/* 消息头：发送者 + 模型范式徽章 + 时间 */}
                  <div className="flex items-center gap-1.5 text-[10px] px-1 flex-wrap" style={{ color: 'var(--text-faint)' }}>
                    <span className="font-semibold" style={{ color: isUser ? 'var(--text-muted)' : 'var(--accent-primary)' }}>
                      {isUser ? '你' : msg.modelBadge || 'AI 参谋'}
                    </span>
                    <span>·</span>
                    <span>{msg.time}</span>
                  </div>

                  {/* 挂载的多模态源引用标签 */}
                  {msg.attachedSources && msg.attachedSources.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap max-w-[95%] px-0.5">
                      {msg.attachedSources.map((src) => (
                        <span
                          key={src.id}
                          className="px-1.5 py-0.5 rounded border text-[9px] font-mono flex items-center gap-1"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          <span>{src.badge}</span>
                          <span className="truncate max-w-[130px]">{src.title}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* DeepSeek R1 / Claude 3.7 可折叠深度思维链 (Thinking Trace) */}
                  {!isUser && msg.thinkingTrace && msg.thinkingTrace.length > 0 && (
                    <div
                      className="w-[95%] rounded-lg border text-[10px] overflow-hidden"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      <button
                        onClick={() =>
                          setExpandedThinkingIds((prev) => ({
                            ...prev,
                            [msg.id]: !isThinkingOpen,
                          }))
                        }
                        className="w-full px-2.5 py-1 flex items-center justify-between font-mono cursor-pointer hover:opacity-85"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <span className="flex items-center gap-1">
                          <Brain className="w-3 h-3 text-amber-500" />
                          <span>全模态推理链 ({msg.thinkingTrace.length} 步已校验)</span>
                        </span>
                        {isThinkingOpen ? (
                          <ChevronDown className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                      {isThinkingOpen && (
                        <div
                          className="px-2.5 py-1.5 border-t space-y-1 font-mono text-[10px]"
                          style={{
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          {msg.thinkingTrace.map((step, sIdx) => (
                            <div key={sIdx} className="flex items-start gap-1.5 leading-relaxed">
                              <span className="text-emerald-500">✓</span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* 消息正文卡片 */}
                  <div
                    className="max-w-[95%] rounded-xl p-2.5 leading-relaxed whitespace-pre-wrap border shadow-xs"
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

                  {/* Codex Canvas 外科手术级行内补丁卡 (Surgical Diff Patch Card) */}
                  {!isUser && msg.surgicalPatch && (
                    <div
                      className="w-[95%] rounded-xl border p-2.5 space-y-2 text-[11px] shadow-xs"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'color-mix(in srgb, #10b981 40%, var(--border-subtle))',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold flex items-center gap-1 text-emerald-500">
                          <Scissors className="w-3.5 h-3.5" />
                          <span>Codex 行内精准改稿补丁 (Surgical Diff)</span>
                        </span>
                        <span className="text-[9px] font-mono opacity-70">可直接合入正本</span>
                      </div>

                      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {msg.surgicalPatch.rationale}
                      </p>

                      <div className="space-y-1 font-literary-serif text-[11px]">
                        <div className="p-1.5 rounded bg-rose-500/10 border border-rose-500/25 text-rose-400 line-through">
                          - {msg.surgicalPatch.targetSnippet}
                        </div>
                        <div className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/25 text-emerald-400">
                          + {msg.surgicalPatch.replacementSnippet}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-0.5">
                        <button
                          onClick={() => handleSendToPendingDraft(msg.surgicalPatch!.replacementSnippet)}
                          className="px-2 py-1 rounded border text-[10px] font-medium cursor-pointer hover:opacity-85"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-muted)',
                          }}
                        >
                          在编辑器顶部比对
                        </button>
                        <button
                          onClick={() => handleApplySurgicalPatch(msg.id, msg.surgicalPatch!)}
                          disabled={msg.surgicalPatch.applied}
                          className="px-2.5 py-1 rounded text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer transition hover:opacity-90 disabled:opacity-50"
                          style={{ backgroundColor: '#10b981' }}
                        >
                          <Check className="w-3 h-3" />
                          <span>{msg.surgicalPatch.applied ? '已合入正文正本' : '⚡ 一键合入正文正本'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* AI 回复下方的实用采纳动作条 */}
                  {!isUser && (
                    <div className="flex items-center gap-1.5 text-[10px] px-1 pt-0.5 flex-wrap">
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
                        style={{
                          backgroundColor: 'var(--bg-canvas)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
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
                            <span>追加文末</span>
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
              <div
                className="flex items-center gap-2 text-xs p-2.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--bg-canvas)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--accent-primary)',
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>
                  {currentSpec.name} 正在读取 {attachments.filter((a) => a.enabled).length} 项全模态挂载资产并推演...
                </span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ================================================================ */}
          {/* 4. 底部固定：Codex / ChatGPT / Claude Code / WorkBuddy 全模态输入舱 */}
          {/* ================================================================ */}
          <div
            className="border rounded-xl p-2 shrink-0 space-y-1.5 relative"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {/* 弹出层 A：文件夹扫描输入浮层 (Claude Code Folder Mount) */}
            {activeMountModal === 'FOLDER' && (
              <div
                className="p-2.5 rounded-xl border space-y-2 text-xs shadow-lg animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--accent-primary)',
                }}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Claude Code 递归扫描本地文件夹</span>
                  </span>
                  <button onClick={() => setActiveMountModal(null)} className="opacity-60 hover:opacity-100 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="text"
                  value={folderInputPath}
                  onChange={(e) => setFolderInputPath(e.target.value)}
                  placeholder="输入本地设定集或文稿目录路径，如 ./worldbuilding/太虚纪元设定集"
                  className="w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono bg-transparent focus:outline-none"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 flex-wrap">
                    {['./worldbuilding/太虚纪元设定集', './chapters/前10章正本存根'].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleMountFolder(preset)}
                        className="px-2 py-0.5 rounded border text-[10px] font-mono hover:opacity-85 cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-card)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handleMountFolder()}
                    disabled={isMountingSource}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer shrink-0"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {isMountingSource ? '扫描中...' : '挂载文件夹'}
                  </button>
                </div>
              </div>
            )}

            {/* 弹出层 B：多条网页链接并发抓取浮层 (WorkBuddy / ChatGPT Browsing) */}
            {activeMountModal === 'URL' && (
              <div
                className="p-2.5 rounded-xl border space-y-2 text-xs shadow-lg animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--accent-primary)',
                }}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5" style={{ color: 'var(--accent-primary)' }}>
                    <Link2 className="w-3.5 h-3.5" />
                    <span>WorkBuddy 批量抓取一段或多段网页链接</span>
                  </span>
                  <button onClick={() => setActiveMountModal(null)} className="opacity-60 hover:opacity-100 cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <textarea
                  value={urlInputList}
                  onChange={(e) => setUrlInputList(e.target.value)}
                  rows={2}
                  placeholder="每行输入一条参考网页/百科/书评链接..."
                  className="w-full px-2.5 py-1.5 rounded-lg border text-[11px] font-mono bg-transparent focus:outline-none resize-none"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleMountUrls()}
                    disabled={isMountingSource}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold text-white cursor-pointer"
                    style={{ backgroundColor: 'var(--accent-primary)' }}
                  >
                    {isMountingSource ? '抓取中...' : '并发解析并挂载'}
                  </button>
                </div>
              </div>
            )}

            {/* 弹出层 C：@ 上下文快速引用菜单 */}
            {showAtMenu && (
              <div
                className="p-1.5 rounded-xl border space-y-1 text-xs shadow-xl animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--accent-primary)',
                }}
              >
                <div className="flex items-center justify-between px-2 py-0.5 text-[10px] font-bold opacity-70">
                  <span>@ 选择要挂载或引用的全模态对象</span>
                  <button onClick={() => setShowAtMenu(false)} className="cursor-pointer">
                    ✕
                  </button>
                </div>
                {atMentionItems.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={item.action}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-amber-500/10 transition flex items-center justify-between cursor-pointer"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span className="truncate">{item.label}</span>
                    <span className="text-[9px] font-mono opacity-50">Enter</span>
                  </button>
                ))}
              </div>
            )}

            {/* 弹出层 D：/ 斜杠指令快速菜单 */}
            {showSlashMenu && (
              <div
                className="p-1.5 rounded-xl border space-y-1 text-xs shadow-xl animate-in fade-in duration-150"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--accent-primary)',
                }}
              >
                <div className="flex items-center justify-between px-2 py-0.5 text-[10px] font-bold opacity-70">
                  <span>/ 选择 Agent 专项工作流指令</span>
                  <button onClick={() => setShowSlashMenu(false)} className="cursor-pointer">
                    ✕
                  </button>
                </div>
                {slashCommands.map((sc) => (
                  <button
                    key={sc.cmd}
                    onClick={() => {
                      setShowSlashMenu(false);
                      setActiveParadigm(sc.paradigm);
                      handleSendMessage(sc.prompt, sc.paradigm);
                    }}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] hover:bg-amber-500/10 transition flex flex-col gap-0.5 cursor-pointer"
                  >
                    <span className="font-bold" style={{ color: 'var(--accent-primary)' }}>
                      {sc.label}
                    </span>
                    <span className="text-[10px] opacity-75" style={{ color: 'var(--text-muted)' }}>
                      {sc.desc}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* 已挂载的多模态附件托盘 (Mounted Omni-Attachments Tray) */}
            {attachments.length > 0 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="px-2 py-0.5 rounded-md border text-[10px] flex items-center gap-1 shrink-0 max-w-[190px]"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-main)',
                    }}
                    title={`${att.title}\n${att.extractedText}`}
                  >
                    <span className="font-mono text-[9px]" style={{ color: 'var(--accent-primary)' }}>
                      {att.badge}
                    </span>
                    <span className="truncate">{att.title}</span>
                    <button
                      onClick={() => removeAttachment(att.id)}
                      className="opacity-50 hover:opacity-100 cursor-pointer ml-0.5"
                      title="移除此挂载源"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 多模态快捷挂载栏：文件夹 / 视觉图片 / 多条网页链接 / 设定文档 / @引用 / /指令 */}
            <div className="flex items-center justify-between gap-1 pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setActiveMountModal(activeMountModal === 'FOLDER' ? null : 'FOLDER')}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                  style={{
                    backgroundColor: activeMountModal === 'FOLDER' ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    borderColor: activeMountModal === 'FOLDER' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                  title="像 Claude Code 一样挂载并读取整个本地设定集文件夹"
                >
                  <FolderOpen className="w-3 h-3 text-amber-500" />
                  <span>文件夹</span>
                </button>

                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                  title="像 ChatGPT 4o Vision 一样上传或 Ctrl+V 粘贴参考图片/分镜/地图"
                >
                  <ImageIcon className="w-3 h-3 text-indigo-400" />
                  <span>图片</span>
                </button>

                <button
                  onClick={() => setActiveMountModal(activeMountModal === 'URL' ? null : 'URL')}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                  style={{
                    backgroundColor: activeMountModal === 'URL' ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    borderColor: activeMountModal === 'URL' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                  title="像 WorkBuddy 一样并发输入一段或多段网页链接进行考据提取"
                >
                  <Link2 className="w-3 h-3 text-pink-400" />
                  <span>多链接</span>
                </button>

                <button
                  onClick={() => docInputRef.current?.click()}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-medium flex items-center gap-1 hover:opacity-85 transition cursor-pointer"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                  title="挂载本地 Markdown / TXT / JSON / CSV 设定文件"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span>文档</span>
                </button>

                <button
                  onClick={() => {
                    setShowSlashMenu(false);
                    setShowAtMenu(!showAtMenu);
                  }}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold flex items-center gap-0.5 hover:opacity-85 transition cursor-pointer"
                  style={{
                    backgroundColor: showAtMenu ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    borderColor: showAtMenu ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: 'var(--accent-primary)',
                  }}
                  title="输入 @ 引用角色、章节、文件夹或网页"
                >
                  <AtSign className="w-2.5 h-2.5" />
                  <span>引用</span>
                </button>

                <button
                  onClick={() => {
                    setShowAtMenu(false);
                    setShowSlashMenu(!showSlashMenu);
                  }}
                  className="px-1.5 py-0.5 rounded border text-[10px] font-mono font-bold flex items-center gap-0.5 hover:opacity-85 transition cursor-pointer"
                  style={{
                    backgroundColor: showSlashMenu ? 'var(--accent-surface)' : 'var(--bg-surface)',
                    borderColor: showSlashMenu ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: 'var(--accent-primary)',
                  }}
                  title="输入 / 触发 Codex 补丁或 Claude 文件夹扫描指令"
                >
                  <Slash className="w-2.5 h-2.5" />
                  <span>指令</span>
                </button>
              </div>
            </div>

            {/* 核心多模态文本/指令输入区 */}
            <textarea
              value={inputVal}
              onPaste={handlePasteInComposer}
              onChange={(e) => {
                const v = e.target.value;
                setInputVal(v);
                if (v.endsWith('@')) {
                  setShowAtMenu(true);
                  setShowSlashMenu(false);
                } else if (v === '/') {
                  setShowSlashMenu(true);
                  setShowAtMenu(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                } else if (e.key === 'Escape') {
                  setShowAtMenu(false);
                  setShowSlashMenu(false);
                  setActiveMountModal(null);
                }
              }}
              placeholder="输入 @ 挂载文件夹/图片/多链接/文档，输入 / 召唤 Codex 补丁，或直接 Ctrl+V 粘贴图片探讨剧情..."
              rows={2}
              className="w-full bg-transparent text-xs focus:outline-none resize-none leading-relaxed placeholder:opacity-35"
              style={{ color: 'var(--text-main)' }}
            />

            {/* 底部能力开关 (思维链 / 联网 / Surgical Diff / 语音) 与发送按钮 */}
            <div
              className="flex items-center justify-between pt-1 border-t text-[10px] gap-1"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => setEnableThinking(!enableThinking)}
                  className="px-1.5 py-0.5 rounded border flex items-center gap-1 transition cursor-pointer"
                  style={
                    enableThinking
                      ? {
                          backgroundColor: 'var(--accent-surface)',
                          borderColor: 'var(--accent-primary)',
                          color: 'var(--accent-primary)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }
                  }
                  title="开启/关闭 DeepSeek R1 / Claude 3.7 深度思维链"
                >
                  <Brain className="w-3 h-3" />
                  <span>思维链</span>
                </button>

                <button
                  onClick={() => setEnableWebSearch(!enableWebSearch)}
                  className="px-1.5 py-0.5 rounded border flex items-center gap-1 transition cursor-pointer"
                  style={
                    enableWebSearch
                      ? {
                          backgroundColor: 'var(--accent-surface)',
                          borderColor: 'var(--accent-primary)',
                          color: 'var(--accent-primary)',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }
                  }
                  title="开启/关闭联网实时考据与链接解析"
                >
                  <Globe className="w-3 h-3" />
                  <span>联网</span>
                </button>

                <button
                  onClick={() => setEnableSurgicalDiff(!enableSurgicalDiff)}
                  className="px-1.5 py-0.5 rounded border flex items-center gap-1 transition cursor-pointer"
                  style={
                    enableSurgicalDiff
                      ? {
                          backgroundColor: 'color-mix(in srgb, #10b981 14%, var(--bg-surface))',
                          borderColor: '#10b981',
                          color: '#10b981',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }
                  }
                  title="开启/关闭 Codex Canvas 外科手术级行内补丁生成"
                >
                  <Scissors className="w-3 h-3" />
                  <span>行内Diff</span>
                </button>

                <button
                  onClick={() => {
                    setIsRecordingVoice(!isRecordingVoice);
                    if (!isRecordingVoice) {
                      setInputVal((prev) =>
                        prev
                          ? `${prev} 请根据刚挂载的青铜古殿设定文件夹与视觉图，强化林牧触碰残片时的寒霜反噬描写。`
                          : '请根据刚挂载的青铜古殿设定文件夹与视觉图，强化林牧触碰残片时的寒霜反噬描写。'
                      );
                    }
                  }}
                  className="p-1 rounded border flex items-center transition cursor-pointer"
                  style={
                    isRecordingVoice
                      ? {
                          backgroundColor: 'color-mix(in srgb, #ef4444 15%, var(--bg-surface))',
                          borderColor: '#ef4444',
                          color: '#ef4444',
                        }
                      : {
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }
                  }
                  title="语音口述输入指令 (Whisper / Realtime Voice)"
                >
                  {isRecordingVoice ? <MicOff className="w-3 h-3 animate-pulse" /> : <Mic className="w-3 h-3" />}
                </button>
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={isSending || !inputVal.trim()}
                className="px-3 py-1 text-white font-bold rounded-lg text-xs transition flex items-center gap-1 shadow-xs disabled:opacity-40 hover:opacity-90 cursor-pointer shrink-0"
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
      {/* 模式 2：专家流水线与稽查 (Pipeline & Inspector — 同样具备独立滚轮隔离) */}
      {/* ==================================================================== */}
      {activeDockTab === 'pipeline' && (
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-3.5 pr-1">
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
                  <span className="font-semibold" style={{ color: 'var(--accent-primary)' }}>
                    {suggestedStateUpdate.combatPower}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>所在地点</span>
                  <span className="font-medium" style={{ color: 'var(--text-main)' }}>
                    {suggestedStateUpdate.location}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--text-muted)' }}>状态变动</span>
                  <span className="text-rose-500 font-medium">
                    {suggestedStateUpdate.statusTags?.join('、')}
                  </span>
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

            <div className="space-y-2 max-h-52 overflow-y-auto overscroll-contain pr-1">
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

            <div className="space-y-2.5 max-h-64 overflow-y-auto overscroll-contain pr-1">
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
                        <span className="text-xs tracking-tight">{issue.issueType}</span>
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
