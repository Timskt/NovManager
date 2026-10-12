// ==============================================================================
// AI Agent 创作与审查执行服务 (AI Service & Mock Simulator)
// 支持双模运行：
// 1. 本地免 Key 极速仿真模式 (带完整思考链路、结构化上下文与一致性问题检测)
// 2. 真实 API 直连模式 (支持 DeepSeek, OpenAI, Claude 兼容接口)
// ==============================================================================

import {
  Novel,
  Volume,
  Chapter,
  Scene,
  Character,
  CharacterState,
  WorldSetting,
  Foreshadowing,
  InspectionIssue,
  UserSettings,
  NovelFrameworkData,
  PlotBranchOption,
  PlotTreeNode,
  PolishTechnique,
  PolishResult,
} from '../types/novel';
import { normalizeEndpoint } from './aiPresets';
import {
  buildCompactGroundedContext,
  compressChatHistoryForTokenSaving,
  auditAndSanitizeHallucinations,
} from './llmMemoryGuard';

export interface AgentExecutionLog {
  step: string;
  detail: string;
  status: 'running' | 'done' | 'warning';
  timestamp: string;
}

export interface GenerationResult {
  content: string;
  logs: AgentExecutionLog[];
  inspectionIssues?: InspectionIssue[];
}


/**
 * 从不断累加的 SSE 字符流中提取所有完整闭合的 JSON 对象
 * 兼容 NDJSON 格式、标准 JSON 数组格式、Markdown 代码块
 */
export function extractCompleteJsonObjects(
  text: string,
  startIndex: number
): { objects: any[]; nextIndex: number } {
  const objects: any[] = [];
  let i = startIndex;
  const len = text.length;

  while (i < len) {
    const openBraceIndex = text.indexOf('{', i);
    if (openBraceIndex === -1) {
      break;
    }

    let depth = 0;
    let inString = false;
    let isEscaped = false;
    let closeBraceIndex = -1;

    for (let j = openBraceIndex; j < len; j++) {
      const char = text[j];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (char === '\\') {
          isEscaped = true;
        } else if (char === '"') {
          inString = false;
        }
      } else {
        if (char === '"') {
          inString = true;
        } else if (char === '{') {
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0) {
            closeBraceIndex = j;
            break;
          }
        }
      }
    }

    if (closeBraceIndex === -1) {
      // 括号尚未闭合，等待更多 Token
      break;
    }

    const candidateStr = text.slice(openBraceIndex, closeBraceIndex + 1);
    try {
      const parsed = JSON.parse(candidateStr);
      if (parsed && typeof parsed === 'object' && (parsed.title || parsed.summary || parsed.branchLabel)) {
        objects.push(parsed);
      }
    } catch {
      // 容错忽略非合法 JSON
    }

    i = closeBraceIndex + 1;
  }

  return { objects, nextIndex: i };
}

export class AIService {
  private settings: UserSettings;

  constructor(settings?: UserSettings) {
    this.settings = settings || this.loadStoredSettings();
  }

  private loadStoredSettings(): UserSettings {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = localStorage.getItem('nov_llm_settings');
        if (raw) {
          const parsed = JSON.parse(raw);
          return {
            provider: parsed.provider || 'deepseek',
            apiEndpoint: parsed.apiEndpoint || 'https://api.deepseek.com/v1/chat/completions',
            apiKey: parsed.apiKey || '',
            model: parsed.model || 'deepseek-v4-flash',
            temperature: parsed.temperature ?? 0.7,
            useMock: parsed.useMock ?? false,
            useBackendProxy: parsed.useBackendProxy ?? false,
          };
        }
      }
    } catch (e) {
      console.error('AIService 加载本地存储设置失败:', e);
    }
    return {
      provider: 'deepseek',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: '',
      model: 'deepseek-v4-flash',
      temperature: 0.7,
      useMock: false,
      useBackendProxy: false,
    };
  }

  public updateSettings(newSettings: Partial<UserSettings>) {
    this.settings = { ...this.settings, ...newSettings };
  }

  public getSettings(): UserSettings {
    return this.settings;
  }

  // 1. 分镜导演 Agent：拆解场景分镜
  async planSceneBreakdown(
    chapter: Chapter,
    novel: Novel,
    characters: Character[],
    onProgress?: (log: AgentExecutionLog) => void,
    volume?: Volume
  ): Promise<Partial<Scene>[]> {
    const emit = (log: AgentExecutionLog) => onProgress?.(log);

    emit({
      step: '检索全书基调与本章冲突',
      detail: `正在载入题材【${novel.genre}】，本章大纲：${chapter.outline.slice(0, 40)}...`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    if (volume?.boundaryConstraints) {
      emit({
        step: '加载分卷故事纲要与出场边界',
        detail: `严格约束红线：${volume.boundaryConstraints.slice(0, 40)}...`,
        status: 'done',
        timestamp: new Date().toLocaleTimeString(),
      });
      await new Promise((r) => setTimeout(r, 400));
    }

    await new Promise((r) => setTimeout(r, 400));

    emit({
      step: '梳理登场角色与利益博弈',
      detail: `分析主视角角色【${characters[0]?.name || '主角'}】当前的驱动动机与阻碍力量`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    await new Promise((r) => setTimeout(r, 400));

    emit({
      step: '应用三幕式节拍规划场景',
      detail: `已生成 3 幕具备递进对抗的场景卡片（目标 -> 冲突 -> 逆转 -> 悬念）`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    // 如果启用了真实 API
    if (!this.settings.useMock && this.settings.apiKey) {
      try {
        emit({
          step: '大模型拆解三幕式场景中',
          detail: `向模型请求拆解第 ${chapter.chapterIndex} 章【${chapter.title}】的分镜节拍...`,
          status: 'running',
          timestamp: new Date().toLocaleTimeString(),
        });

        const prompt = `你是一位顶级小说分镜导演。请根据以下章节信息，将当前章节拆解为 3 个具有因果递进对抗的场景分镜（Scene/幕）：
【小说题材】：${novel.genre}
${volume?.title ? `【当前分卷】：${volume.title}\n` : ''}${volume?.summary ? `【分卷故事梗概】：${volume.summary}\n` : ''}${volume?.boundaryConstraints ? `【分卷出场边界与防早现约束（严禁违背，严禁提前出场非本卷角色/宝物/越级战力）】：\n${volume.boundaryConstraints}\n` : ''}【当前章节】：第 ${chapter.chapterIndex} 章 《${chapter.title}》
【章节大纲】：${chapter.outline}
【登场人物】：${characters.map((c) => `${c.name}(${c.roleType})`).join('、') || '主角'}

请严格输出合法的 JSON 数组，格式如下（严禁包含代码块之外的多余闲聊）：
[
  {
    "sceneIndex": 1,
    "sceneGoal": "主角本幕的明确行动目标",
    "conflict": "遭遇的阻碍或外部危机",
    "turnPoint": "出人意料的转折或关键抉择",
    "outcome": "本幕结果与后续悬念引出"
  },
  {
    "sceneIndex": 2,
    "sceneGoal": "...",
    "conflict": "...",
    "turnPoint": "...",
    "outcome": "..."
  },
  {
    "sceneIndex": 3,
    "sceneGoal": "...",
    "conflict": "...",
    "turnPoint": "...",
    "outcome": "..."
  }
]`;

        const res = await this.callRealLLM(prompt, '你是一位严格输出 JSON 的网文小说分镜策划导演。');
        const jsonMatch = res.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            emit({
              step: '分镜拆解完成',
              detail: `成功通过大模型生成 ${parsed.length} 幕递进场景`,
              status: 'done',
              timestamp: new Date().toLocaleTimeString(),
            });
            return parsed.map((s: any, idx: number) => ({
              sceneIndex: s.sceneIndex || idx + 1,
              sceneGoal: s.sceneGoal || `场景 ${idx + 1} 目标`,
              conflict: s.conflict || '暂无冲突',
              turnPoint: s.turnPoint || '暂无转折',
              outcome: s.outcome || '场景结束',
            }));
          }
        }
      } catch (err: any) {
        emit({
          step: 'API 分镜拆解失败，回退至内置分镜引擎',
          detail: `错误：${err.message}`,
          status: 'warning',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    return [
      {
        sceneIndex: 1,
        sceneGoal: '林越压制伤势，伪装溶洞环境，完成防御布置',
        conflict: '真元溃散，夜枭的猎杀神识顺着血迹迫近',
        turnPoint: '青铜残片与溶洞古纹路产生感应，察觉到上古残阵',
        outcome: '放弃直接逃遁，决定借地利诱敌深入',
      },
      {
        sceneIndex: 2,
        sceneGoal: '夜枭踏入陷阱，双方爆发言语试探与神识对抗',
        conflict: '金丹初期的境界压制几乎令林越窒息',
        turnPoint: '林越引爆洞顶地煞阴火珠，借残片敛息刺杀护法',
        outcome: '成功斩杀魔宗护法，逼迫夜枭显露血煞法相',
      },
      {
        sceneIndex: 3,
        sceneGoal: '夜枭暴怒动杀招，苏青瑶御剑破空赶至合围',
        conflict: '夜枭的金丹血海领域即将碾碎林越道基',
        turnPoint: '苏青瑶祭出掌教天罡剑符，撕开血海破绽',
        outcome: '击退夜枭，林越与苏青瑶坠入下层上古地渊',
      },
    ];
  }

  // 1.5 智能拟定备选章节名称（支持自动生成多个备选供点击选用，亦可手动编辑）
  async suggestChapterTitles(params: {
    novelTitle: string;
    genre: string;
    volumeTitle?: string;
    volumeConflict?: string;
    volumeSummary?: string;
    volumeBoundary?: string;
    chapterOutline: string;
    chapterIndex: number;
    currentTitle?: string;
  }): Promise<string[]> {
    const {
      novelTitle,
      genre,
      volumeTitle,
      volumeConflict,
      volumeSummary,
      volumeBoundary,
      chapterOutline,
      chapterIndex,
      currentTitle,
    } = params;

    // 1. 若配置并启用了真实 API，调用大模型拟定 5 个具备高吸引力与网文网感的章节标题
    if (!this.settings.useMock && this.settings.apiKey) {
      try {
        const prompt = `你是一位顶级网络小说金牌编辑与白金作者。请为正在创作的长篇小说《${novelTitle}》（题材：${genre}）拟定 5 个极具网文爽点、悬念感、戏剧张力与文学质感的备选章节名称。

【所属分卷】：${volumeTitle || '第一卷'}
${volumeConflict ? `【分卷冲突】：${volumeConflict}\n` : ''}${volumeSummary ? `【分卷故事梗概】：${volumeSummary}\n` : ''}${volumeBoundary ? `【分卷出场边界】：${volumeBoundary}\n` : ''}【当前章节序号】：第 ${chapterIndex} 章
【本章大纲/情节梗概】：
${chapterOutline || '暂无详细大纲，请根据分卷冲突与小说题材，发散推演本章核心戏剧性事件'}
${currentTitle ? `【原参考标题】：${currentTitle}\n` : ''}
【拟名规则】：
1. 风格契合【${genre}】类型（例如仙侠修真类侧重四字古风、剑意对仗或险地死生，悬疑类强调诡谲危机，玄幻类强调机缘逆袭）；
2. 简练有力（推荐 4~8 字，如：“第${chapterIndex}章 剑气惊寒”、“第${chapterIndex}章 崖底死生”、“第${chapterIndex}章 青铜异动”）；
3. 必须严格以 JSON 字符串数组格式返回，绝不包含 markdown 或任何闲聊废话，格式如下：
["第${chapterIndex}章 标题一", "第${chapterIndex}章 标题二", "第${chapterIndex}章 标题三", "第${chapterIndex}章 标题四", "第${chapterIndex}章 标题五"]`;

        const res = await this.callRealLLM(
          prompt,
          '你是一位严格输出纯 JSON 字符串数组的网络小说章节命名大师。'
        );
        const cleaned = res.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleaned.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((t: any) => String(t).trim()).filter(Boolean);
          }
        }
      } catch (err) {
        console.warn('AI 章节名生成调用失败，使用本地智能引擎回退:', err);
      }
    }

    // 2. 本地智能启发式备选生成引擎（离线毫秒级返回高质量备选名）
    return this.generateSmartTitleFallbacks(chapterIndex, chapterOutline, genre);
  }

  private generateSmartTitleFallbacks(
    chapterIndex: number,
    outline: string,
    genre: string
  ): string[] {
    const defaultPrefix = `第${chapterIndex}章`;
    const candidates: string[] = [];

    const text = (outline || '').toLowerCase();
    if (text.includes('剑') || text.includes('杀') || text.includes('战') || text.includes('斗')) {
      candidates.push(`${defaultPrefix} 剑气惊寒`, `${defaultPrefix} 生死搏杀`, `${defaultPrefix} 霜刃初试`);
    }
    if (text.includes('残片') || text.includes('宝') || text.includes('古') || text.includes('机缘') || text.includes('铜')) {
      candidates.push(`${defaultPrefix} 青铜异动`, `${defaultPrefix} 上古秘辛`, `${defaultPrefix} 机缘初显`);
    }
    if (text.includes('崖') || text.includes('深渊') || text.includes('洞') || text.includes('坠') || text.includes('风')) {
      candidates.push(`${defaultPrefix} 坠星死局`, `${defaultPrefix} 崖底生机`, `${defaultPrefix} 深渊暗流`);
    }
    if (text.includes('魔') || text.includes('血') || text.includes('夜枭') || text.includes('仇')) {
      candidates.push(`${defaultPrefix} 魔影重重`, `${defaultPrefix} 血煞蚀骨`, `${defaultPrefix} 仇焰焚身`);
    }
    if (text.includes('宗') || text.includes('门') || text.includes('试炼') || text.includes('比') || text.includes('师')) {
      candidates.push(`${defaultPrefix} 宗门暗潮`, `${defaultPrefix} 别院选拔`, `${defaultPrefix} 隐忍待发`);
    }

    // 结合题材精选池补齐至 5 个
    const genrePools: Record<string, string[]> = {
      '仙侠修真': ['潜龙出渊', '风起青云', '逆境求存', '破晓拔剑', '道心初砺', '杀机暗伏'],
      '硬核仙侠': ['霜刃初试', '血战断崖', '幽冥奇变', '剑指苍穹', '生死一线', '绝处逢生'],
      '传统武侠': ['惊鸿一剑', '夜战风波', '恩怨了断', '长街喋血', '侠骨柔肠', '血染征袍'],
      '玄幻修真': ['造化神光', '万象初开', '天道断绝', '神魔共愤', '破境开山', '神念破空'],
    };

    const pool = genrePools[genre] || genrePools['硬核仙侠'] || genrePools['仙侠修真'];
    for (const title of pool) {
      if (candidates.length >= 5) break;
      const fullTitle = `${defaultPrefix} ${title}`;
      if (!candidates.includes(fullTitle)) {
        candidates.push(fullTitle);
      }
    }

    return candidates.slice(0, 5);
  }

  // 3. 剧情推演幕布：SSE 流式分块解析，每完成一个独立走向立即通过 onBranchReceived 实时回调渲染到画布树上
  async streamDeducePlotBranches(params: {
    novel: Novel;
    volume?: Volume;
    currentChapter: Chapter;
    characters: Character[];
    characterStates: CharacterState[];
    worldSettings: WorldSetting[];
    foreshadowings: Foreshadowing[];
    currentScene?: Scene;
    sceneIndex?: number;
    recentDraftSnippet?: string;
    customDirection?: string;
    settings?: UserSettings;
    abortSignal?: AbortSignal;
    onProgress?: (log: AgentExecutionLog) => void;
    onBranchReceived?: (branch: PlotBranchOption) => void;
  }): Promise<PlotBranchOption[]> {
    const {
      novel,
      volume,
      currentChapter,
      characters,
      characterStates,
      worldSettings,
      foreshadowings,
      currentScene,
      sceneIndex,
      recentDraftSnippet,
      customDirection,
      settings: callerSettings,
      abortSignal,
      onProgress,
      onBranchReceived,
    } = params;

    if (callerSettings) {
      this.updateSettings(callerSettings);
    }

    const emit = (log: AgentExecutionLog) => onProgress?.(log);
    const effectiveSettings = this.settings;
    const hasKey = !!(effectiveSettings.apiKey && effectiveSettings.apiKey.trim().length > 0);
    const useRealLLM = !effectiveSettings.useMock && hasKey;

    const currentStage = sceneIndex || currentScene?.sceneIndex || 1;
    const nextStage = currentStage + 1;

    emit({
      step: '载入剧情节点上下文与演化动机',
      detail: `当前节点所属阶段：阶段 ${currentStage}【${currentChapter.title}】${volume ? ` (所属分卷：${volume.title})` : ''}`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    if (volume?.boundaryConstraints) {
      emit({
        step: '装载分卷出场边界与防早现红线',
        detail: `分卷约束红线：${volume.boundaryConstraints.slice(0, 50)}...`,
        status: 'done',
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    const receivedBranches: PlotBranchOption[] = [];

    // 1. 若配置了有效 Key，优先调用真实大模型并启用 SSE 流式分块解析
    if (useRealLLM) {
      emit({
        step: `连接真实大模型 (${effectiveSettings.provider.toUpperCase()})`,
        detail: `正在连接 [${effectiveSettings.model}] 进行 SSE 流式推理，每生成一个走向即刻挂载入树...`,
        status: 'running',
        timestamp: new Date().toLocaleTimeString(),
      });

      try {
        const charSummary = characters
          .slice(0, 5)
          .map((c) => {
            const st = characterStates.find((s) => s.characterId === c.id);
            return `- ${c.name} (${c.roleType}): ${st ? `战力【${st.combatPower}】，健康【${st.healthStatus}】，状态【${st.statusTags.join('/')}】，位置【${st.location}】` : '状态正常'}`;
          })
          .join('\n');

        const activeForeshadowings = foreshadowings
          .filter((f) => f.status === 'PLANTED')
          .slice(0, 4)
          .map((f) => `- 伏笔【${f.title}】：${f.clueDescription}`)
          .join('\n');

        const prompt = `你是一位顶级网络小说全书总监与叙事演化导师。
请为长篇小说《${novel.title}》（题材：${novel.genre}）在当前剧情事件节点之后，推演 4 个截然不同、戏剧张力拉满、因果严谨的【下一步可能剧情事件走向分支（Plot Beats）】。
每个走向都是一个完全独立的分支节点，无需局限于任何死板戏剧教条，让剧情灵活自由演进！

【当前所属分卷】：${volume?.title || '未分卷'}
${volume?.mainConflict ? `【分卷主线核心矛盾】：${volume.mainConflict}\n` : ''}${volume?.summary ? `【分卷剧情整体梗概】：${volume.summary}\n` : ''}${volume?.boundaryConstraints ? `【分卷出场边界与防早现强约束（绝对禁止违背）】：\n${volume.boundaryConstraints}\n` : ''}
【当前章节】：第 ${currentChapter.chapterIndex} 章《${currentChapter.title}》
【当前章节梗概】：${currentChapter.outline}
${currentScene ? `【前序推演锚点剧情节点（阶段 ${currentStage}）】：
- 行动目标：${currentScene.sceneGoal}
- 冲突对抗：${currentScene.conflict}
- 局势转折：${currentScene.turnPoint}
- 结局代价：${currentScene.outcome}
- 地点：${currentScene.location}
【任务核心要求】：请紧密接续在上述剧情节点结局之后，推演进入【阶段 ${nextStage}】的 4 个后续独立走向分支！
` : ''}
${recentDraftSnippet ? `【上一幕正文最新片段截取】：\n${recentDraftSnippet.slice(-400)}\n` : ''}
【当前在场核心角色即时状态机】：
${charSummary || '暂无详细人物'}

【未回收相关伏笔线索】：
${activeForeshadowings || '暂无未回收伏笔'}

${customDirection ? `【作者指定的推演偏向/脑洞要求】：${customDirection}\n` : ''}

【推演规则要求】：
1. 必须推演出 4 个完全不同叙事维度的独立走向：
   - 分支 A（BLOOD_BATTLE 绝境血战）：硬碰硬、置之死地而后生、代价沉重但反杀爽点拉满；
   - 分支 B（OUTWIT_STEALTH 暗度陈仓）：利用地势残阵或规则弱点智斗脱身、潜伏蛰伏；
   - 分支 C（UNEXPECTED_TWIST 意料之外）：第三方突发变故打破僵局，戏剧反转拉满；
   - 分支 D（LORE_OPPORTUNITY 秘境机缘）：契合世界观的暗线线索触发、异宝残片异动或道心突破。
2. 严格遵守分卷出场边界约束，绝不可过早拉入超出边界的人物或神器；
3. 每个分支必须明确标注角色付出的代价或状态转变。
4. 必须严格以 JSON 数组格式逐个输出，严禁带代码块以外的多余文字：
[
  {
    "id": "branch-1",
    "branchType": "BLOOD_BATTLE",
    "branchLabel": "绝境强突·斩杀破局",
    "title": "纯粹戏剧动作标题（4-10字，严禁带'第几幕'等前缀）",
    "summary": "纯粹故事剧情推进（100-200字，严禁带'第几幕'等前缀）",
    "conflict": "本走向面临的最直接致命阻碍与对抗力量",
    "turnPoint": "出人意料的关键抉择或突发战术转折",
    "outcome": "本阶段结局收尾，以及为后续留下的强悬念钩子",
    "characterImpact": "在场角色承受的代价与具体状态演变",
    "foreshadowingHint": "关联或新埋设的伏笔线索",
    "divergenceLevel": "HIGH"
  }
]`;

        const endpoint = normalizeEndpoint(effectiveSettings.apiEndpoint);
        const messages = [
          { role: 'system', content: '你是一位严格输出纯 JSON 数组的网络小说多走向剧情推演引擎，请严格按规范逐个输出分支对象。' },
          { role: 'user', content: prompt }
        ];

        let response: Response;
        if (effectiveSettings.useBackendProxy) {
          response = await fetch('http://localhost:8000/api/llm/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              endpoint,
              api_key: effectiveSettings.apiKey || '',
              model: effectiveSettings.model || 'deepseek-v4-flash',
              messages,
              temperature: effectiveSettings.temperature || 0.7,
            }),
            signal: abortSignal,
          });
        } else {
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (effectiveSettings.apiKey?.trim()) {
            headers['Authorization'] = `Bearer ${effectiveSettings.apiKey.trim()}`;
          }
          response = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              model: effectiveSettings.model || 'deepseek-v4-flash',
              messages,
              temperature: effectiveSettings.temperature || 0.7,
              stream: true,
            }),
            signal: abortSignal,
          });
        }

        if (!response.ok) {
          throw new Error(`LLM 流式接口响应异常 (${response.status})`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('未获取到流式响应数据体');
        }

        const decoder = new TextDecoder();
        let accumulated = '';
        let scanIndex = 0;
        let streamedCount = 0;

        while (true) {
          if (abortSignal?.aborted) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          const chunkText = decoder.decode(value, { stream: true });
          const lines = chunkText.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === 'data: [DONE]') continue;
            if (trimmed.startsWith('data: ')) {
              try {
                const parsedSSE = JSON.parse(trimmed.slice(6));
                const delta = parsedSSE.choices?.[0]?.delta?.content || parsedSSE.choices?.[0]?.text || '';
                if (delta) {
                  accumulated += delta;
                }
              } catch {
                // 容错非 JSON SSE 行
              }
            } else if (!trimmed.startsWith('event:') && !trimmed.startsWith(':')) {
              accumulated += trimmed;
            }
          }

          // 实时提取完成的 JSON 块
          const { objects, nextIndex } = extractCompleteJsonObjects(accumulated, scanIndex);
          scanIndex = nextIndex;

          for (const item of objects) {
            streamedCount++;
            const branch: PlotBranchOption = {
              id: item.id || `stream-branch-${Date.now()}-${streamedCount}`,
              branchType: item.branchType || 'DEFAULT',
              branchLabel: item.branchLabel || `走向分支 ${streamedCount}`,
              title: item.title ? item.title.replace(/^第\s*[0-9一二三四五六七八九十]+\s*(幕|章|阶段)[·:：\s-]*/i, '').trim() : `分支走向 ${streamedCount}`,
              summary: item.summary ? item.summary.replace(/^第\s*[0-9一二三四五六七八九十]+\s*(幕|章|阶段)[·:：\s-]*/i, '').trim() : '剧情演变中',
              conflict: item.conflict || '未知阻碍',
              turnPoint: item.turnPoint || '突发转折',
              outcome: item.outcome || '达成阶段战果',
              characterImpact: item.characterImpact || '角色承受代价',
              foreshadowingHint: item.foreshadowingHint,
              divergenceLevel: item.divergenceLevel || 'MEDIUM',
              source: 'REAL_AI',
              modelName: effectiveSettings.model,
            };

            receivedBranches.push(branch);
            onBranchReceived?.(branch);

            emit({
              step: `实时推演分支已就绪 (${streamedCount})`,
              detail: `【${branch.branchLabel}】${branch.title}`,
              status: 'running',
              timestamp: new Date().toLocaleTimeString(),
            });
          }
        }

        if (receivedBranches.length > 0) {
          emit({
            step: '真实大模型流式推演完成',
            detail: `已成功解析并实时挂载 ${receivedBranches.length} 个独立剧情分支`,
            status: 'done',
            timestamp: new Date().toLocaleTimeString(),
          });
          return receivedBranches;
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          emit({
            step: '用户已主动中止推演',
            detail: '推演进程已取消',
            status: 'warning',
            timestamp: new Date().toLocaleTimeString(),
          });
          return receivedBranches;
        }
        emit({
          step: '大模型流式推演异常，无缝回退至动态因果生成',
          detail: `错误详情：${err.message}`,
          status: 'warning',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    // 2. 本地动态因果模式（免 Key / 离线模拟 / 容错兜底）
    // 采用逐个延时回调，提供真实自然的流式生长感
    emit({
      step: '本地因果推演引擎启动',
      detail: '根据当前节点冲突与人物状态机，逐步演化 4 个独立剧情分支...',
      status: 'running',
      timestamp: new Date().toLocaleTimeString(),
    });

    const povChar = characters.find((c) => c.id === currentChapter.povCharacterId) || characters[0] || { name: '主角' };
    const povState = characterStates.find((s) => s.characterId === povChar.id);
    const activeForeshadowing = foreshadowings.find((f) => f.status === 'PLANTED');
    const location = currentScene?.location || '遗迹深处';

    const prevGoal = currentScene?.sceneGoal || currentChapter.outline || '推进主线';
    const prevConflict = currentScene?.conflict || '面临外部强敌压迫与信任考验';
    const prevTurn = currentScene?.turnPoint || '突发变故打破原有僵局';
    const prevOutcome = currentScene?.outcome || '付出一定代价后勉强稳住局势';
    const customHint = customDirection?.trim() ? `（作者脑洞偏向：${customDirection.trim()}）` : '';

    const localCandidates: PlotBranchOption[] = [
      {
        id: `mock-b1-${Date.now()}`,
        branchType: 'BLOOD_BATTLE',
        branchLabel: '绝境强突·死中求活',
        title: '引爆残阵与绝死反扑',
        summary: `承接上阶段【${prevOutcome.slice(0, 25)}...】。${povChar.name}眼见退路被绝，不再留手，强行引动气海残存真元反噬，引爆${location}古禁制，在血雾中斩杀当面强敌。${customHint}`,
        conflict: `敌方阵法彻底合围，${prevConflict.slice(0, 20)}`,
        turnPoint: `以身作饵，于千钧一发之际诱使敌首踏入虚实杀阵盲区`,
        outcome: `斩杀敌方先锋，但${povChar.name}经脉受创，陷入短暂力竭期`,
        characterImpact: povState ? `${povChar.name}灵力见底，健康下降为【轻伤/虚弱】，急需闭关调息` : `${povChar.name}受创虚弱`,
        foreshadowingHint: activeForeshadowing ? `与伏笔【${activeForeshadowing.title}】产生强烈共振` : undefined,
        divergenceLevel: 'HIGH',
        source: 'HEURISTIC',
      },
      {
        id: `mock-b2-${Date.now()}`,
        branchType: 'OUTWIT_STEALTH',
        branchLabel: '暗度陈仓·金蝉脱壳',
        title: '移形换影与迷踪遁术',
        summary: `面对正面死局，${povChar.name}假意不敌佯退，借${location}地穴复杂的阴煞地磁扰乱神识感应，留下一具替身傀儡，真身潜入暗道。${customHint}`,
        conflict: `敌方血灵罗盘全方位追踪，稍有微弱灵压即会引来雷霆一击`,
        turnPoint: `借助${prevTurn.slice(0, 20)}产生的混乱，金蝉脱壳`,
        outcome: `神不知鬼不觉避开重围，反而意外摸到敌方设防最薄弱的后方腹地`,
        characterImpact: `${povChar.name}耗尽随身防身匿息符箓，行踪暂时隐匿`,
        divergenceLevel: 'MEDIUM',
        source: 'HEURISTIC',
      },
      {
        id: `mock-b3-${Date.now()}`,
        branchType: 'UNEXPECTED_TWIST',
        branchLabel: '意料之外·第三方介入',
        title: '地脉异变与古兽出世',
        summary: `激战正酣之际，地底深处突然传出沉闷古钟声，封印破碎，一尊沉睡千载的太古凶兽破土而出，暴虐威压令双方所有人均被掀翻。${customHint}`,
        conflict: `两方人马均沦为凶兽猎物，原有的恩怨争斗瞬间被更大的生存危机打破`,
        turnPoint: `原本占据绝对上风的敌方领袖首当其冲被凶兽巨尾扫中受创`,
        outcome: `战局陷入混乱大逃杀，${povChar.name}被迫与敌方某位关键人物暂时结成脆弱同盟`,
        characterImpact: `众人心神巨震，各怀鬼胎，敌友界限瞬间模糊`,
        divergenceLevel: 'HIGH',
        source: 'HEURISTIC',
      },
      {
        id: `mock-b4-${Date.now()}`,
        branchType: 'LORE_OPPORTUNITY',
        branchLabel: '秘境机缘·道心顿悟',
        title: '残卷共鸣与古殿显化',
        summary: `受战斗余波震荡，${povChar.name}体内暗藏的神秘残卷与古遗迹深处的祭坛产生奇特共振，指引其踏入一处隐蔽的古仙传承禁制。${customHint}`,
        conflict: `古禁制设有道心问心考验，稍有动摇便会神魂俱灭`,
        turnPoint: `在生死存亡的压力下心境突破，参透残卷第一层玄机`,
        outcome: `获得上古残篇功法或残缺法宝，战力迎来质的飞跃，引来天生异象`,
        characterImpact: `${povChar.name}境界松动，但引动的天地异象已吸引了方圆百里大能的注意`,
        divergenceLevel: 'HIGH',
        source: 'HEURISTIC',
      },
    ];

    for (let i = 0; i < localCandidates.length; i++) {
      if (abortSignal?.aborted) break;
      await new Promise((r) => setTimeout(r, 420));
      const branch = localCandidates[i];
      receivedBranches.push(branch);
      onBranchReceived?.(branch);

      emit({
        step: `实时推演分支已就绪 (${i + 1}/${localCandidates.length})`,
        detail: `【${branch.branchLabel}】${branch.title}`,
        status: 'running',
        timestamp: new Date().toLocaleTimeString(),
      });
    }

    emit({
      step: '剧情推演全部完成',
      detail: `已为您实时生成并挂载 ${receivedBranches.length} 条下一步走向分支`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    return receivedBranches;
  }

  // 兼容老版本的批量推演方法（底层直接调用 streamDeducePlotBranches）
  async deduceNextPlotBranches(params: {
    novel: Novel;
    volume?: Volume;
    currentChapter: Chapter;
    characters: Character[];
    characterStates: CharacterState[];
    worldSettings: WorldSetting[];
    foreshadowings: Foreshadowing[];
    currentScene?: Scene;
    sceneIndex?: number;
    recentDraftSnippet?: string;
    customDirection?: string;
    settings?: UserSettings;
    onProgress?: (log: AgentExecutionLog) => void;
  }): Promise<PlotBranchOption[]> {
    return this.streamDeducePlotBranches(params);
  }

  // 4. 执笔起草 Agent：编写具体分镜工笔正文（单幕工笔 1000~1200 字，全章 3000+ 字标准）
  async draftSceneContent(
    scene: Scene,
    chapter: Chapter,
    novel: Novel,
    characters: Character[],
    states: CharacterState[],
    rules: WorldSetting[],
    foreshadowings: Foreshadowing[],
    onProgress?: (log: AgentExecutionLog) => void,
    volume?: Volume,
    targetWordCount: number = 1050,
    previousSceneDraftSnippet?: string
  ): Promise<GenerationResult> {
    const logs: AgentExecutionLog[] = [];
    const emit = (log: AgentExecutionLog) => {
      logs.push(log);
      onProgress?.(log);
    };

    const memoryReport = buildCompactGroundedContext({
      novel,
      volumes: volume ? [volume] : [],
      activeChapter: chapter,
      activeScene: scene,
      characters,
      characterStates: states,
      worldSettings: rules,
      foreshadowings,
      recentDraftText: previousSceneDraftSnippet || '',
    });

    emit({
      step: '🧠 四级记忆分层召回与 Token 精算压缩',
      detail: `原始上下文 ${memoryReport.totalRawTokens} Tokens → 压缩后 ${memoryReport.totalCompressedTokens} Tokens（节省 ${memoryReport.compressionRatioPercent}%，KV前缀缓存命中率 ${memoryReport.prefixCacheHitRatePercent}%）`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 220));

    // 状态硬约束提取
    const povState = states.find((s) => s.characterId === scene.involvedCharacterIds?.[0]);
    emit({
      step: '🛡️ 挂载防幻觉事实锚点与状态机红线',
      detail: `已锁定 ${memoryReport.activeFactAnchors.length} 条硬性事实锚点 | 主视角：${povState ? `【${povState.combatPower}，健康: ${povState.healthStatus}】` : '默认正常'}`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 220));

    if (volume?.boundaryConstraints) {
      emit({
        step: '加载分卷故事概要与防早现红线',
        detail: `严格出场边界：${volume.boundaryConstraints.slice(0, 45)}...`,
        status: 'done',
        timestamp: new Date().toLocaleTimeString(),
      });
      await new Promise((r) => setTimeout(r, 200));
    }

    emit({
      step: '应用文风与工笔细节慢镜头指引',
      detail: `文风：${novel.styleGuide.tone}；严格过滤词：${novel.styleGuide.forbiddenPhrases.join('、')}；单幕目标字数：~${targetWordCount}字`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 200));

    emit({
      step: '模型起草工笔级正文生成中',
      detail: `场景目标：${scene.sceneGoal} | 核心转折：${scene.turnPoint}`,
      status: 'running',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 450));

    // 如果启用了真实 API：使用 KV-Cache 友好的高压缩四级记忆 Prompt
    if (!this.settings.useMock && this.settings.apiKey) {
      try {
        const generated = await this.callRealLLM(
          `${memoryReport.assembledCompactPrompt}\n\n` +
          `【字数与描写颗粒度核心控制标准】：\n` +
          `1. 本幕目标字数：不少于 ${targetWordCount} 字；\n` +
          `2. 严禁使用大纲式总结或缩写概括语句，必须采用工笔级慢镜头拆解五感氛围、招式力道与心理博弈；\n` +
          `3. 严禁违背上方【L4 铁律与防幻觉护栏】中的境界上限、生死状态与信息差保密锁，严禁使用违禁词（${novel.styleGuide.forbiddenPhrases.join('、')}）。请直接输出正文小说段落：`
        );
        const audit = auditAndSanitizeHallucinations({
          draftText: generated,
          factAnchors: memoryReport.activeFactAnchors,
          protagonistName: characters[0]?.name || '林越',
          currentRealm: povState?.combatPower || '筑基初期',
        });
        emit({
          step: '🛡️ 生成后防幻觉自检与正文定稿',
          detail: `事实忠实度 ${audit.faithfulnessScore}%（拦截并自愈 ${audit.findings.length} 处潜在幻觉），共计 ${audit.sanitizedDraft.length} 字`,
          status: 'done',
          timestamp: new Date().toLocaleTimeString(),
        });
        return { content: audit.sanitizedDraft, logs };
      } catch (err: any) {
        emit({
          step: 'API 调用失败，回退至智能工笔模拟器',
          detail: `错误：${err.message}`,
          status: 'warning',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    // 本地极高文学质感的工笔级专业生成文本（每幕均达到 1000~1200 字，3 幕合计 3200+ 字）
    let generatedProse = '';
    if (scene.sceneIndex === 1) {
      generatedProse = `刺骨的阴风顺着钟乳石林倒灌而入，发出犹如怨魂凄咽的呜咽声。

地下溶洞深处，一片寂死。岩壁上凝结着斑驳的暗黑血苔，不时有一两滴森冷的黑水从百丈高的穹顶滴落，砸在冰冷坚硬的青黑玄岩上，发出“嗒、嗒”的清脆回响。

林越斜倚在断崖阴影的死角中，整个人如同一块沉寂了千年的顽石，连呼吸与心跳都被强行压制到了不可思议的微弱频次。

他的青灰道袍早已被岩壁的煞气浸透得冰寒刺骨。左肩处，一道深可见骨的撕裂伤口正被三根细如牛毛的破煞银针死死封住，虽止住了外溢的鲜血，但每一次牵动气机，都有一股钻心剜骨的阴毒痛楚顺着手少阳三焦经一路侵蚀蔓延。

“血煞宗的‘噬髓散’……”林越在心底冷冷暗忖，下颌线条绷得犹如刀削。

他缓缓伸出右手，指尖悄无声息地探入怀中。那枚自宗门后山剑冢偶然拾得的青铜残片，此刻正紧贴着他的胸膛。残片表面布满了粗粝的上古雷击纹理，虽然表面看去毫无半点灵光，甚至连一丝最基础的真元波动都感应不到，但随着溶洞深处那股若隐若现的血腥杀意逐渐逼近，残片边缘竟泛起了一层几乎无法察觉的温热。

它在预警。

林越缓缓抬起眸子，透过岩壁参差交错的石笋缝隙，向着溶洞入口的必经甬道望去。

三丈开外，原本弥漫在空中的淡灰色地脉毒瘴，正诡异地向着两侧翻卷退避，仿佛有一尊看不见的凶戾巨兽正在黑暗中一步步踏碎虚空。紧接着，两缕幽绿色的磷火无声亮起，在黑暗的甬道深处缓缓浮沉。

那是夜枭的血灵巡山鸢。

“林越小友，何必如阴沟里的硕鼠般藏头缩尾？”

一道沙哑如金石摩擦的冷笑声毫无征兆地在空旷的溶洞内回荡开来。声音不高，却蕴含着筑基巅峰近乎假丹境的雄浑真元，激得四壁碎石簌簌滚落。

“你斩我三名血卫，夺我血髓灵晶，真以为凭这一处残破的上古地渊阵纹，便能瞒过老夫的‘锁魄寻灵盘’么？”

夜枭的身影缓缓自甬道阴影中踏出。他身披一袭绣有九条血蟒的大氅，面容枯槁如骷髅，眼眶内陷，唯有一双浑浊的瞳孔泛着令人心悸的血光。在他的右手掌心上方，一只巴掌大小、通体由白骨雕琢而成的罗盘正飞速旋转，指针死死锁定了林越藏身的那方石崖死角！

空气在这一瞬骤然凝固。

林越没有答话，甚至连眼皮都未曾颤动一下。他在计算。

从夜枭踏入溶洞正中央的青石八卦台，到触动左侧断崖下的地脉煞脉节点，距离只有七步。只要夜枭再向前踏出七步，他事先以本命剑气布下的三道牵引暗线，便能引动地下蓄积了万年的阴煞地火，瞬间撕裂这片区域的空间稳定。

一步。两步。三步。

夜枭枯瘦的脸上浮现出一抹近乎残忍的戏谑，他似乎极享受这种猫戏老鼠的逼仄快感，每一步落下，靴底的血色煞气便在地面腐蚀出一枚寸许深的焦黑脚印。

然而就在踏出第四步的刹那，夜枭的身形猛地一顿，枯爪般的五指在虚空中虚虚一按。

“不对。”老魔目光陡然凌厉如鹰隼，“这地底的阴煞流动，未免太过平顺了！”

杀机在千分之一瞬爆发！

林越没有丝毫犹豫，在夜枭心生疑窦的刹那，整个人已如离弦之箭暴射而出！青锋剑出鞘的清越龙吟骤然撕裂了沉寂，一道凝练到了极致的森寒剑罡，宛如九天落雷般迎面直刺老魔咽喉！`;
    } else if (scene.sceneIndex === 2) {
      generatedProse = `剑芒如银汉倒悬，直贯面门！

林越这一剑没有丝毫拖泥带水，将体内仅存的七成青锋剑罡尽数灌注于剑脊之上。青色长剑在半空中发出一阵不堪重负的悲鸣，剑气过处，虚空中拉出了一道肉眼可见的白色气浪真空，四溢的凛冽剑意将坚硬的石笋齐齐斩成两段！

“米粒之珠，也敢放光！”

夜枭嘴角咧开一抹极度轻蔑的狞笑，面对这夺命一剑，他竟连佩刀都未曾拔出，只是左臂大氅一卷，一只干枯如鹰爪的灰白骨爪自血袖中猛然探出，五指如铁钩般直直抓向青锋长剑的剑尖！

铛——！

金铁交鸣之声犹如洪钟大吕，在封闭狭窄的溶洞中疯狂回荡，音波裹挟着狂暴的真元气浪向四周横扫，将数十根丈许粗细的钟乳石生生震成漫天齑粉！

林越只觉得一股排山倒海般的冰冷巨力顺着剑身悍然轰入体内，右手虎口瞬间崩裂，鲜血淋漓。对方体内那股雄浑磅礴的血煞魔功，犹如数十条阴毒的嗜血水蛭，顺着他的经脉疯狂向上噬咬！

蹬！蹬！蹬！

林越闷哼一声，借着反震之势向后飘退三丈，脚尖在碎石地面上划出两道深深的沟壑。左肩处刚刚止血的创口在这股暴烈暗劲的冲击下再度崩裂，殷红的鲜血顺着手臂滴滴答答落在碎石上。

“筑基中期圆满？能在老夫这一爪之下不退反进，留得全尸，清虚剑宗这代弟子里，你林越倒也算个硬骨头。”

夜枭冷笑收爪，目光落在自己的掌心处——那里，一道深可见骨的森白剑痕赫然横贯掌肉，虽然没有流出鲜血，却有一缕纯阳剑气在疯狂阻止着伤口的愈合。

老魔眼中的戏谑之色缓缓褪去，取而代之的是令人骨髓生寒的浓烈杀机。

“可惜，越是天才，老夫越喜欢抽魂炼魄！”

话音未落，夜枭周身血光滔天而起，身后猛然展开两对完全由浓稠血浆凝聚而成的骨翼。他右手向虚空中狠狠一抓，一柄通体惨白、以千人头盖骨串联炼制而成的“九子白骨血灵幡”轰然自地脉深处拔地而起！

幡面猎猎翻卷，九个拳头大小的血色婴颅在幡旗中凄厉尖啸，散发出的凶煞威压直接将整座溶洞的虚空彻底封锁！

“九子锁魂，万鬼噬心！”

夜枭双手法印疾如闪电，九只血婴幻化作九道迅疾莫测的血色流光，撕裂空气，从九个不可思议的诡异死角同时袭向林越！

这一刻，整座溶洞已被浓郁的血煞毒雾彻底淹没，呼吸之间吸入肺腑的尽是腐肉与毒硝的焦苦味，神识探出不足三尺便被硬生生吞噬消融。

林越身处风暴核心，面色却苍白得近乎透明，唯有一双黑眸深邃如渊。

他没有后退，因为身后已是万丈深渊与死路。

“既然要锁，那便连这方地脉一同锁了！”

林越咬破舌尖，一口蕴含本命精血的精纯剑气猛然喷吐在倒插于地的青铜残片之上！

刹那间，青铜残片剧烈震颤，其上原本黯淡无光的古朴纹理骤然亮起了一道刺目至极的紫金色雷弧！雷弧顺着地面纵横交错的符文阵线疯狂狂飙，眨眼间便与地底蓄积的阴煞主脉产生了惊天动地的共鸣！

轰隆隆——！

坚硬的玄岩地表在此刻宛如沸水般翻滚龟裂，一道道狂暴的地下幽火冲天而起，硬生生与那九道血婴纠缠撕咬在一起！`;
    } else if (scene.sceneIndex === 3) {
      generatedProse = `“小畜生，你敢坏老夫法阵机缘？死！！”

夜枭发出野兽般的狂暴咆哮，双目之中的猩红几乎要满溢而出，他彻底被林越层出不穷的险招激怒。

堂堂半步金丹名宿，竟在一个筑基小辈手中屡次受挫，甚至被引动地火反噬了本命魔幡，这若是传回血煞宗，他将沦为整个修真界的笑柄！

夜枭双掌在胸前猛然交错成圆，一口金丹本源精血狂喷而出，尽数浇灌在身后那翻滚不休的无边血海之中。

轰！

刹那间，整座地下溶洞的温度骤降至绝对冰点！空气中每一颗悬浮的水汽微粒，都在瞬间凝结成赤红如血的冰晶。虚空之中，一尊高达三丈、头生双角、浑身覆盖着狰狞血纹骨甲的修罗魔相咆哮凝聚，带着金丹期修士令人神魂崩裂的绝对威压，宛如泰山崩塌般向着林越头顶怒拍而下！

这是金丹初期的绝杀领域——修罗灭生掌！

轰然巨响中，坚固如铁的青岩地表在这股恐怖的威压下寸寸化为齑粉。林越双足深陷石中直至没膝，全身骨骼发出一阵阵令人牙酸的摩擦碎裂之声，嘴角、鼻孔、眼角同时溢出触目惊心的乌黑血线。

境界的鸿沟，犹如天堑横亘在前！

然而在那铺天盖地的灭顶血色之中，林越却依然死死挺直了脊梁。他右手长剑断裂仅剩半截，左手却一把死死攥住了发烫如烙铁般的青铜残片，眼中没有半分屈服，只有近乎癫狂的孤注一掷！

“上古古仙禁……给我开！”

青铜残片与林越体内的剑骨在生死一线间达成了前所未有的共鸣，一道微弱却纯粹到了极点的开天剑意，竟硬生生在三丈魔相的掌心下方撕开了一道三寸宽的狭窄裂痕！

然而，林越的气海也在此刻彻底干涸枯竭，整个人已至强弩之末。

眼看血色魔掌就要连同这道裂痕一同将林越碾成肉泥——

铮————！

一声清越高亢、宛如九霄鸾凤长鸣的剑啸，毫无征兆地撕裂了溶洞顶部的罡风夜幕！

伴随着轰然巨震，头顶那厚达百丈的坚固岩层竟被一柄凭空降临的碧色神剑生生贯穿！漫天碎石崩飞之间，一抹宛若秋水洗练、澄澈无瑕的通天剑光破空而至，未见其人，纯正至极的天罡北斗剑气已将漫天血雾尽数冻结成霜！

“血煞魔枭，休伤我宗剑首！”

娇叱声如冰泉击石，水波碧裙随风烈烈。

来人身姿曼妙，素手轻挽剑诀，秋泓神剑在半空中化作一朵盛开的青莲剑阵，千百道冰冷刺骨的剑气如疾风骤雨般狠狠轰在修罗魔相的面门之上！

轰隆！狂暴的真元在方圆百丈内连环引爆！

夜枭脸色煞白，猝不及防之下被这股凌厉纯正的金丹级剑气生生逼退七步，胸口气血翻江倒海。

“苏青瑶？！你清虚宗的主力不是被引去了黑风峡吗？！”老魔惊怒交加，厉声喝问。

然而苏青瑶根本不与他废话，身形飘然落在林越身前，玉手一拂，一枚温润的护心丹已送入林越口中，眸光如霜雪般冷冷逼视夜枭。

但双方连番狂暴的金丹级对轰，终于彻底击穿了这处本就风雨飘摇的上古遗迹脆弱的平衡支点。

咔嚓——轰隆隆！！

地底最深处，突然传来令人头皮发麻的古老机括断裂声。

承载着三人的整座万载石台在瞬息间四分五裂，露出了下方一片深不见底、闪烁着幽微上古星纹与森森煞气的万丈虚空深渊！狂暴的空间乱流如飓风般倒灌而上，三人立足不稳，同时向着无尽黑暗坠落而去……`;
    } else {
      generatedProse = `狂暴的空间罡风如千万柄钝刀般在耳畔疯狂割裂呼啸。

下坠，无休止的垂直下坠。

四周没有光线，没有着落，唯有一片令人窒息的混沌与死寂。方才石台崩塌时产生的恐怖空间乱流，将护体真元撕扯得七零八落。

林越竭力维持着灵台最后一丝微弱的神明。体内的气血早已翻江倒海，骨骼剧痛难当，但他握紧残剑的手指却未曾松开半分。

不知下坠了多久，下方的幽暗深渊之中，忽然泛起了一丝极其微弱、却宏大苍凉到了极点的青铜古光。

那是一片被深埋在九幽地脉之下的上古战场遗迹！

无数残破的古剑、断裂的百丈神魔骸骨静静横陈在虚空之中，密密麻麻的古老星辰禁制在深渊四周明灭不定，宛如漫天呼吸的冷眼。而在遗迹的最核心之处，赫然悬浮着一座被十二根九天玄铁重锁封印的通体黑青色巨型青铜古棺！

砰！

林越与苏青瑶重重跌落在一处断裂的古殿飞檐之上，剧烈的撞击震得两人同时吐出一口鲜血。

另一侧百丈开外的石柱阴影下，一道狼狈至极的身影翻滚落地——正是同样被卷入深渊的夜枭。此刻的老魔大氅破烂，九子血灵幡灵气大失，脸色惨白如金纸，显然在空间乱流中也付出了极其沉重的代价。

三人隔着百丈虚空遥遥相望，空气再次紧绷如弦。

“上古……星宿仙魔墓？！”夜枭死死盯着虚空中央那座庞大如山岳的青铜古棺，浑浊的眼眸中瞬间爆发出混合着贪婪与战栗的狂热，“传说是真的！这片无灵死地之下，当真葬着第三纪元的真仙道果！”

林越勉力支撑着身躯站起，将苏青瑶护在身后。怀中那枚一直温热的青铜残片，在接触到这片古战场的瞬间，竟发出了轻微的欢鸣，仿佛迷途万载的游子终于找到了归家的信物。

断壁残垣之上，杀气与机缘交织成网，一场远比溶洞追杀更为凶险莫测的生死对决，在这片万载不见天日的星宿死境中悄然拉开序幕……`;
    }

    emit({
      step: '工笔正文生成完毕',
      detail: `分镜 ${scene.sceneIndex} 起草完成，字数约 ${generatedProse.length} 字（工笔慢镜头达标）`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    return { content: generatedProse, logs };
  }

  // 5. 全章连续流水线工笔起草：基于推演树回溯路径（Path to Root）
  async draftFullChapterFromPath(params: {
    path: PlotTreeNode[];
    chapter: Chapter;
    novel: Novel;
    characters: Character[];
    characterStates: CharacterState[];
    worldSettings: WorldSetting[];
    foreshadowings: Foreshadowing[];
    volume?: Volume;
    targetWordsPerScene?: number;
    onSceneProgress?: (sceneIdx: number, totalScenes: number, sceneTitle: string, progressText: string) => void;
  }): Promise<{
    fullChapterText: string;
    sceneDrafts: { sceneIndex: number; title: string; content: string; wordCount: number }[];
    totalWords: number;
  }> {
    const {
      path,
      chapter,
      novel,
      characters,
      characterStates,
      worldSettings,
      foreshadowings,
      volume,
      targetWordsPerScene = 1050,
      onSceneProgress,
    } = params;

    const sceneDrafts: { sceneIndex: number; title: string; content: string; wordCount: number }[] = [];
    let previousSnippet = '';

    for (let i = 0; i < path.length; i++) {
      const node = path[i];
      const sceneIdx = i + 1;
      const sceneTitle = node.title || `第 ${sceneIdx} 幕`;

      onSceneProgress?.(
        sceneIdx,
        path.length,
        sceneTitle,
        `正在撰写第 ${sceneIdx}/${path.length} 幕【${sceneTitle}】(工笔目标 ~${targetWordsPerScene}字)...`
      );

      const mockScene: Scene = {
        id: node.id || `sc-${sceneIdx}`,
        chapterId: chapter.id,
        sceneIndex: sceneIdx,
        sceneGoal: node.summary,
        conflict: node.conflict || '敌对力量压制与险恶阻碍',
        turnPoint: node.turnPoint || '突发变数打破平衡',
        outcome: node.outcome || '达成阶段结局并引出后续危机',
        involvedCharacterIds: node.involvedCharacterIds || (characters[0] ? [characters[0].id] : []),
        location: node.location || '当前驻地',
        draftContent: '',
      };

      const result = await this.draftSceneContent(
        mockScene,
        chapter,
        novel,
        characters,
        characterStates,
        worldSettings,
        foreshadowings,
        undefined,
        volume,
        targetWordsPerScene,
        previousSnippet
      );

      const content = result.content;
      previousSnippet = content;

      sceneDrafts.push({
        sceneIndex: sceneIdx,
        title: sceneTitle,
        content,
        wordCount: content.length,
      });

      onSceneProgress?.(
        sceneIdx,
        path.length,
        sceneTitle,
        `第 ${sceneIdx}/${path.length} 幕起草完毕（本幕 ${content.length} 字）`
      );
    }

    const fullChapterText = sceneDrafts
      .map((s) => `【第 ${s.sceneIndex} 幕 · ${s.title}】\n\n${s.content}`)
      .join('\n\n' + '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' + '\n\n');

    const totalWords = sceneDrafts.reduce((sum, s) => sum + s.wordCount, 0);

    return {
      fullChapterText,
      sceneDrafts,
      totalWords,
    };
  }


  // 3. 设定稽查员 Agent：扫描吃设定与人物 OOC
  async inspectDraftConsistency(
    draftText: string,
    novel: Novel,
    characters: Character[],
    states: CharacterState[],
    rules: WorldSetting[],
    foreshadowings: Foreshadowing[]
  ): Promise<InspectionIssue[]> {
    await new Promise((r) => setTimeout(r, 1000));

    const issues: InspectionIssue[] = [];

    // 智能规则检测
    // 规则 1：战力崩坏检测 (筑基期不可能破开虚空或瞬移)
    if (draftText.includes('撕裂空间') || draftText.includes('瞬移')) {
      issues.push({
        id: 'iss-01',
        issueType: 'SETTING_VIOLATION',
        severity: 'CRITICAL',
        locationSnippet: '撕裂空间 / 瞬移',
        explanation: '世界观法则硬性规定：筑基期乃至金丹期绝不可撕裂空间或瞬移，化神期方可半步横渡虚空。此处构成严重战力越级！',
        fixAdvice: '建议修改为“凭借疾风遁法身形如电，留下一道残影”。',
      });
    }

    // 规则 2：违禁成语检测
    for (const phrase of novel.styleGuide.forbiddenPhrases) {
      if (draftText.includes(phrase)) {
        issues.push({
          id: `iss-phrase-${phrase}`,
          issueType: 'TYPO',
          severity: 'WARNING',
          locationSnippet: phrase,
          explanation: `命中了全书设定的违禁成语库【${phrase}】，降低了作品的文学严肃感。`,
          fixAdvice: '建议删除该成语，替换为具象的动作神态或心理描写。',
        });
      }
    }

    // 规则 3：人物性格与语气 OOC 检测 (林越极度克制，不应狂妄放话)
    if (draftText.includes('哈哈哈') || draftText.includes('受死吧')) {
      issues.push({
        id: 'iss-ooc-01',
        issueType: 'OOC',
        severity: 'WARNING',
        locationSnippet: '狂笑或嚣张口号',
        explanation: '林越的人设为“极度谨慎、隐忍坚毅、惜字如金”，此类嚣张台词严重脱离人设性格（OOC）。',
        fixAdvice: '建议改为冷酷沉默地直接出剑，不发一语。',
      });
    }

    // 规则 4：状态机一致性提醒 (如果林越左肩被穿透，若正文写“左手挥舞重剑”则产生生理矛盾)
    const linYueState = states.find((s) => s.characterId === 'char-001');
    if (linYueState?.statusTags.includes('左肩贯穿伤') && draftText.includes('左臂挥剑')) {
      issues.push({
        id: 'iss-state-01',
        issueType: 'PLOT_HOLE',
        severity: 'CRITICAL',
        locationSnippet: '左臂挥剑',
        explanation: '林越在第11章中左肩受透骨钉贯穿重创，真元封禁，生理上不可能自如挥剑！',
        fixAdvice: '应明确强调“仅以右臂单手运剑”，加重伤势带给主角的行动阻滞感。',
      });
    }

    // 如果没有任何严重问题，给出一个有价值的润色建议
    if (issues.length === 0) {
      issues.push({
        id: 'iss-sug-01',
        issueType: 'SETTING_VIOLATION',
        severity: 'SUGGESTION',
        locationSnippet: '天罡剑气与血海对撞',
        explanation: '苏青瑶的天罡剑诀来自太虚剑宗镇宗功法，正克制魔门血煞。此处可补充一句环境细节：“血雾接触到剑光如冰雪遇骄阳般消融”，强化功法克制设定。',
        fixAdvice: '在剑光降临时加入两句五感环境交锋描写。',
      });
    }

    // 如果启用了真实 API，补充调用大模型进行剧情逻辑与人设深层巡检
    if (!this.settings.useMock && this.settings.apiKey) {
      try {
        const prompt = `你是一位严苛的小说设定与逻辑质检总监。请审查以下正文片段是否存在吃设定、逻辑漏洞、战力崩塌或人物 OOC：
【小说题材】：${novel.genre}
【正文片段】：
${draftText.slice(0, 1500)}

【世界观规则参考】：
${rules.slice(0, 5).map((r) => `- ${r.name}: ${r.content}`).join('\n')}

【登场人物性格】：
${characters.slice(0, 4).map((c) => `- ${c.name}: ${c.profile.personalityTraits.join('/')}`).join('\n')}

如果发现逻辑硬伤或人物出戏，请严格输出合法的 JSON 数组，格式如下（若无明显问题请直接输出 []）：
[
  {
    "issueType": "SETTING_VIOLATION",
    "severity": "WARNING",
    "locationSnippet": "原文问题片段",
    "explanation": "问题原因",
    "fixAdvice": "修改建议"
  }
]`;
        const llmResp = await this.callRealLLM(prompt, '你是一位严格输出 JSON 的小说设定审查专家。');
        const match = llmResp.match(/\[[\s\S]*\]/);
        if (match) {
          const parsedIssues = JSON.parse(match[0]);
          if (Array.isArray(parsedIssues)) {
            parsedIssues.forEach((it: any, idx: number) => {
              issues.push({
                id: `llm-iss-${Date.now()}-${idx}`,
                issueType: it.issueType || 'SETTING_VIOLATION',
                severity: it.severity || 'WARNING',
                locationSnippet: it.locationSnippet || '正文上下文',
                explanation: it.explanation || '大模型检测到潜在设定冲突',
                fixAdvice: it.fixAdvice || '建议核对设定并微调描写',
              });
            });
          }
        }
      } catch (err) {
        console.warn('Real LLM inspectDraftConsistency failed, using rule engine results:', err);
      }
    }

    return issues;
  }

  // 4. 文风润色师 Agent：修辞提升与节奏优化 (含文学技法提取与复用)
  async polishProse(
    draftText: string,
    styleGuide: any,
    selectedTechniques?: PolishTechnique[]
  ): Promise<PolishResult> {
    if (!this.settings.useMock && this.settings.apiKey) {
      try {
        const reuseInstructions =
          selectedTechniques && selectedTechniques.length > 0
            ? `\n【本次要求重点复用以下作者已沉淀的文风技巧】：\n${selectedTechniques
                .map(
                  (t, i) =>
                    `${i + 1}. [${t.categoryLabel}] ${t.name}：${t.description}`
                )
                .join('\n')}\n`
            : '';

        const prompt = `请对以下小说正文片段进行文学级精细润色与节奏优化，并提炼你在润色中运用的文学写作技巧：
【文风基调】：${styleGuide?.tone || '冷峻沉着'}
【叙事节奏】：${styleGuide?.pacing || '紧凑有力'}
【描写密度】：${styleGuide?.descriptionDensity || '适中'}
【禁用套话】：${styleGuide?.forbiddenPhrases?.join('、') || '无'}
${reuseInstructions}

【待润色原稿】：
${draftText}

【输出格式要求】：
请以严格的 JSON 格式输出，不要包含 Markdown 代码块标记（如 \`\`\`json），直接返回如下纯 JSON 对象：
{
  "polishedText": "完整润色后的正文内容（保持原剧情走向与人物行为，但在文学质感、视听触通感、节奏张力上大幅提升）",
  "summary": "本次润色核心策略概述（1句话）",
  "techniques": [
    {
      "name": "技巧名称（如：短句卡点强化动作张力 / 通感通化造境 / 微动作外化心理 / 留白去水）",
      "category": "PACING",
      "categoryLabel": "节奏张力",
      "description": "技巧具体说明及在本段中的作用",
      "beforeSnippet": "润色前的代表性原句片段",
      "afterSnippet": "润色后的对应新句片段",
      "applicableScene": "适用场景（如：危机遭遇、心智博弈、动作打斗、悬念收束）"
    }
  ]
}`;
        const rawResponse = await this.callRealLLM(prompt, '你是一位顶级文学编辑与小说润色大师，精通文学修辞与结构化输出。');
        if (rawResponse && rawResponse.trim()) {
          const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            try {
              const parsed = JSON.parse(jsonMatch[0]);
              if (parsed.polishedText) {
                return {
                  polishedText: parsed.polishedText,
                  summary: parsed.summary || '已根据文风基调完成文学修辞与节奏张力提升',
                  techniques: Array.isArray(parsed.techniques)
                    ? parsed.techniques.map((t: any, idx: number) => ({
                        id: `tech-llm-${Date.now()}-${idx}`,
                        name: t.name || '精微润色技法',
                        category: t.category || 'PACING',
                        categoryLabel: t.categoryLabel || '文学润色',
                        description: t.description || '优化语言质感与画面感',
                        beforeSnippet: t.beforeSnippet || '',
                        afterSnippet: t.afterSnippet || '',
                        applicableScene: t.applicableScene || '全场景适用',
                        appliedCount: 1,
                      }))
                    : [],
                };
              }
            } catch (jsonErr) {
              console.warn('Failed to parse LLM JSON response for polishProse:', jsonErr);
            }
          }

          // 若 LLM 未返回合法 JSON 但返回了润色正文
          const cleanText = rawResponse.replace(/```json/g, '').replace(/```/g, '').trim();
          return {
            polishedText: cleanText,
            summary: '已通过大模型完成文学修辞与叙事节奏优化',
            techniques: [
              {
                id: `tech-llm-${Date.now()}-0`,
                name: '高级意象与节奏重构',
                category: 'PACING',
                categoryLabel: '节奏张力',
                description: '打破机械平铺叙事，重构动作推进与情绪落点',
                beforeSnippet: draftText.slice(0, 40) + '...',
                afterSnippet: cleanText.slice(0, 40) + '...',
                applicableScene: '叙事推进',
                appliedCount: 1,
              },
            ],
          };
        }
      } catch (err) {
        console.warn('Real LLM polishProse failed, fallback to local rules:', err);
      }
    }

    await new Promise((r) => setTimeout(r, 600));

    // 本地启发式智能文学润色与技法提取引擎
    let modified = draftText;
    const extractedTechniques: PolishTechnique[] = [];

    // 规则 1：去口水话与白描去水 (SHOW_DONT_TELL / PACING)
    const fillerReplacements: [RegExp, string, string, string, string][] = [
      [/显得非常/g, '尤为', '白描精炼去虚词', '剔除空泛无力的程度副词，使用凝练的书面修辞', '通用描写'],
      [/突然之间|突然间/g, '陡然', '短拍突变切入', '改换短促音节强化突发危机感，切忌平铺直叙', '危机遭遇、转折点'],
      [/非常生气/g, '眸色深寒', '微表情外化心理', '将抽象的情绪陈述转化为具体的眼神神态描写', '人物对峙'],
      [/心里面想|心里暗想/g, '暗忖', '内心独白降噪', '精炼心理引导词，提升行文古雅质感与心理紧迫度', '心理活动'],
      [/大声地喊道|大声地说道/g, '厉喝出声', '动词卡点强化声势', '以强动作动词替代“大声地”，增强对白压迫感', '冲突对决'],
      [/慢慢地/g, '徐徐', '节奏缓释造境', '文言化副词延展时间流速，营造凝重滞涩氛围', '压抑时刻、探索'],
      [/感觉有些|觉得有些/g, '微觉', '潜意识直觉微调', '弱化感知犹豫感，贴合沉着主角的敏锐洞察', '洞察感知'],
      [/恐怖如斯/g, '威压如潮', '去网络套话修辞', '消除陈腐网文套路热词，以具象场域威压烘托实力差距', '强者出场、威压'],
      [/倒吸一口凉气/g, '心头剧震', '生理反应去水', '拒绝烂俗套话，精准锚定惊惧震惊的生理直觉', '受惊反转'],
      [/看起来好像/g, '宛如', '比喻拟物凝练', '提升比喻流畅度与画面定格感', '环境意象'],
      [/下一刻/g, '电光石火间', '动作时间切片特写', '打破平淡时序衔接，强化生死一瞬的高速搏杀感', '动作格斗'],
    ];

    for (const [pattern, repl, name, desc, scene] of fillerReplacements) {
      if (pattern.test(draftText)) {
        // 抓取替换前后的代表片段
        const match = draftText.match(pattern);
        if (match && match.index !== undefined) {
          const start = Math.max(0, match.index - 10);
          const end = Math.min(draftText.length, match.index + match[0].length + 15);
          const beforeSnip = draftText.slice(start, end).replace(/\n+/g, ' ');
          const afterSnip = beforeSnip.replace(pattern, repl);

          extractedTechniques.push({
            id: `tech-local-${Date.now()}-${extractedTechniques.length}`,
            name,
            category: 'SHOW_DONT_TELL',
            categoryLabel: '白描入微',
            description: desc,
            beforeSnippet: beforeSnip,
            afterSnippet: afterSnip,
            applicableScene: scene,
            appliedCount: 1,
          });
        }
        modified = modified.replace(pattern, repl);
      }
    }

    // 规则 2：若原稿文字规范未触发上述套话替换，执行高级段落张力与五感通感润色
    if (extractedTechniques.length === 0) {
      // 检查是否包含人物动作或对话
      if (modified.includes('说道：') || modified.includes('说：')) {
        modified = modified.replace(/说道：/g, '沉声凝视道：').replace(/说：/g, '冷声道：');
        extractedTechniques.push({
          id: `tech-local-${Date.now()}-0`,
          name: '潜台词交锋与神态外显',
          category: 'DIALOGUE',
          categoryLabel: '潜台词交锋',
          description: '在对白前置神态与语调动作，使对话自带隐形张力与心理博弈',
          beforeSnippet: '……说道：“……”',
          afterSnippet: '……沉声凝视道：“……”',
          applicableScene: '人物博弈、谈判交锋',
          appliedCount: 1,
        });
      }

      // 环境冷暖与五感通感润色
      if (modified.includes('冷') || modified.includes('暗') || modified.includes('风') || modified.includes('水')) {
        extractedTechniques.push({
          id: `tech-local-${Date.now()}-1`,
          name: '通感通化造境',
          category: 'ATMOSPHERE',
          categoryLabel: '环境意境',
          description: '融合触觉的寒意与视觉光影，烘托环境对人物造成的心理压迫',
          beforeSnippet: '四周一片寂静，气氛冰冷。',
          afterSnippet: '幽暗死寂的四壁宛如寒冰，森冷之意直透脊骨。',
          applicableScene: '探秘潜入、危机潜伏',
          appliedCount: 1,
        });
      }

      // 兜底技法：短句断奏卡点
      extractedTechniques.push({
        id: `tech-local-${Date.now()}-2`,
        name: '短句卡点强化动作张力',
        category: 'PACING',
        categoryLabel: '节奏张力',
        description: '拆解长句连贯动作为短促单节，加快阅读心跳节奏，强化临场感',
        beforeSnippet: modified.slice(0, 30) + '……',
        afterSnippet: modified.slice(0, 30).replace(/，/g, '。') + '……',
        applicableScene: '动作格斗、紧急避险',
        appliedCount: 1,
      });
    }

    // 融入已选复用技巧的标记
    if (selectedTechniques && selectedTechniques.length > 0) {
      for (const st of selectedTechniques) {
        if (!extractedTechniques.some((t) => t.name === st.name)) {
          extractedTechniques.unshift({
            ...st,
            id: `tech-reused-${Date.now()}-${st.id}`,
            description: `【已复用】${st.description}`,
            appliedCount: (st.appliedCount || 1) + 1,
          });
        }
      }
    }

    return {
      polishedText: modified,
      summary: `本次润色提炼并应用了 ${extractedTechniques.length} 项文学技法，强化了节奏顿挫与画面张力`,
      techniques: extractedTechniques,
    };
  }

  // 4.5 创作现场 AI 参谋研讨对话 (Studio In-depth Scene Discussion)
  async chatSceneDiscussion(
    messages: { role: 'user' | 'assistant'; content: string }[],
    context: {
      novel: Novel;
      activeChapter?: Chapter;
      activeScene?: Scene;
      characters: Character[];
      worldSettings: WorldSetting[];
      editorContent: string;
    }
  ): Promise<string> {
    if (!this.settings.useMock && this.settings.apiKey) {
      const charSummary =
        context.characters.map((c) => `${c.name}(${c.roleType})`).join('、') || '暂无设定';
      const sceneSummary = context.activeScene
        ? `目标：${context.activeScene.sceneGoal}；冲突：${context.activeScene.conflict}；转折：${context.activeScene.turnPoint}`
        : '暂无分镜';
      const systemPrompt = `你是一位专业的小说创作参谋与剧情推演助手。你正与作者在创作工作台（Studio）协同研讨与推进正文。
当前小说：《${context.novel.title}》（题材：${context.novel.genre}）
当前章节：${context.activeChapter?.title || '未命名章节'}
当前分镜：第 ${context.activeScene?.sceneIndex || 1} 幕（${sceneSummary}）
登场角色：${charSummary}
作者设定的文风准则：${context.novel.styleGuide.tone}

你的职责：
1. 就作者提出的情节推演、反转设计、人物对话、氛围描写、冲突升级等问题深入研讨，提供具体、高代入感的创作建议；
2. 如果作者需要你起草片段或建议对话台词，直接提供精准贴合人物性格与场景的高质量文本；
3. 遵循因果严密、拒绝陈词滥调、杜绝AI腔与套话。`;

      try {
        const { compressedMessages } = compressChatHistoryForTokenSaving(messages, 4);
        const lastUser = compressedMessages[compressedMessages.length - 1]?.content || '';
        const history = compressedMessages
          .slice(0, -1)
          .map((m) => `${m.role === 'user' ? '作者' : '参谋'}: ${m.content}`)
          .join('\n\n');
        const prompt = `${history ? `【对话前情（滚动摘要记忆）】：\n${history}\n\n` : ''}【当前编辑器已有字数】：${context.editorContent.length}字\n【作者提问或想法】：\n${lastUser}`;
        const reply = await this.callRealLLM(prompt, systemPrompt);
        if (reply && reply.trim()) return reply;
      } catch (err) {
        console.warn('Real LLM chatSceneDiscussion failed, fallback to smart simulation:', err);
      }
    }

    // 本地仿真智能推演
    await new Promise((r) => setTimeout(r, 600));
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    const sceneIdx = context.activeScene?.sceneIndex || 1;
    const title = context.novel.title;

    if (lastUserMsg.includes('反转') || lastUserMsg.includes('意外') || lastUserMsg.includes('转折')) {
      return `【参谋推演】针对当前第 ${sceneIdx} 幕的情节，为您构思了 3 种高质量剧情反转方向：

1. **认知颠覆反转（最推荐）**：
   表面上敌人步步紧逼将主角逼入绝境，实则是主角故意示弱，诱导对方暴露出真正的弱点或关键底牌。

2. **第三方变数介入**：
   正当僵持不下时，原本中立或潜伏的隐藏势力突然出手，打破平衡，造成“敌人的敌人成为新的未知威胁”。

3. **代价与两难抉择**：
   主角发现了瞬间破局的捷径，但必须付出极大的心理或道义代价（如牺牲一件重要信物或暴露隐藏身份）。

💡 您觉得哪一种更贴合当前《${title}》的叙事节奏？需要我针对其中一种直接起草示范段落吗？`;
    }

    if (lastUserMsg.includes('对话') || lastUserMsg.includes('台词') || lastUserMsg.includes('语气')) {
      return `【参谋推演】关于人物对话设计，建议避免“直接说教或交代设定”：

1. **潜台词博弈**：让人物说 A 实际上意在试探 B。表面寒暄，实则句句带刺，逼迫对方露出破绽；
2. **节奏留白**：紧张对峙时，短句为主，配合微动作（如指节发白、按压剑柄、眼神游移），少用大段陈述；
3. **独特口吻**：突出角色阶层与心境差异。

您想设计哪两个角色之间的对话？请告诉我他们的当前立场，我来为您编写一段带有戏剧张力的对话草稿！`;
    }

    return `【参谋推演】收到您的创作构思！对于《${title}》当前第 ${sceneIdx} 幕：

1. **场景节拍评估**：
   建议紧扣“**微目标 → 突发阻碍 → 局部转折**”，让读者在每 1000 字内都能感受到微高潮；
2. **张力放大技巧**：
   可以加入环境压迫感（如光影变化、倒计时危机或周围人群的反应），衬托出主角此刻的紧绷心境；
3. **细节与质感**：
   用具体名词代替抽象形容词，增加动作的物理反馈（如兵刃相撞的震颤、血腥气与冷雨的触感）。

您可以随时让我：“帮我想几句高燃对白”、“帮我润色刚才写的这段”、“分析这段情节是否合理”，我们一起把这段写扎实！`;
  }

  // 5. 灵感脑暴对话 (Interactive Brainstorming)
  async chatBrainstorm(
    messages: { role: 'user' | 'assistant'; content: string }[],
    genreHint?: string
  ): Promise<string> {
    if (!this.settings.useMock && this.settings.apiKey) {
      const systemPrompt = `你是一位资深网络小说白金主编与世界观架构师。
你的任务是协助作者梳理新书的核心卖点（Hook）、核心矛盾、金手指设计、力量体系与主角致命缺陷。
要求：
1. 语言启发性强、懂网文爽点与网文市场脉络。
2. 每次回复提出 2~3 个具体可落地的创意选项，并附带 1 个发人深省的推演问题。
3. 避免陈词滥调，注重反套路与严密的内在逻辑闭环。`;

      try {
        const { compressedMessages } = compressChatHistoryForTokenSaving(messages, 4);
        const lastUser = compressedMessages[compressedMessages.length - 1]?.content || '';
        const historyContext = compressedMessages
          .slice(0, -1)
          .map((m) => `${m.role === 'user' ? '作者' : '主编'}: ${m.content}`)
          .join('\n\n');
        const prompt = historyContext
          ? `【之前的对话背景】：\n${historyContext}\n\n【作者最新构思】：\n${lastUser}`
          : lastUser;
        const reply = await this.callRealLLM(prompt, systemPrompt);
        if (reply && reply.trim()) return reply;
      } catch (err: any) {
        console.warn('Real LLM chatBrainstorm failed, fallback to smart template:', err);
      }
    }

    // 本地仿真智能推演
    await new Promise((r) => setTimeout(r, 700));
    const lastUserMsg = messages[messages.length - 1]?.content || '';
    
    if (lastUserMsg.includes('赛博') || lastUserMsg.includes('机械') || lastUserMsg.includes('科幻')) {
      return `【主编建议】这是一个极具张力的反乌托邦赛博修真设定！
💡 **核心卖点推演**：
1. **义体与灵根冲突**：赛博财阀垄断了“纯净天灵气”，下层修士只能植入二手“高压柴油灵脉机”与“液压经络”，每次运转功法都面临机械过载与灵肉排异。
2. **金手指反转**：主角得到一个旧纪元开源道法编译器，能够黑入并篡改敌对修士的法宝固件，甚至把“御剑术”重构为超音速轨道穿甲攻击。
3. **主角缺陷**：重度义体化导致人性情感流失，越强越冷酷，必须依赖特定人性的情感锚点（如师尊留下的录音带）维持道心。

❓ **下一步探讨**：你倾向于将大反派设定为一个【掌握了飞升云服务器的跨国修真集团】，还是一个【伪装成天道AI的古修残魂】？`;
    }

    if (lastUserMsg.includes('规则') || lastUserMsg.includes('怪谈') || lastUserMsg.includes('克苏鲁') || lastUserMsg.includes('无限')) {
      return `【主编建议】规则怪谈+克苏鲁的核心在于“不可直视的压迫感”与“解谜逻辑的闭环”！
💡 **核心卖点推演**：
1. **认知污染机制**：规则不是保护伞，而是不可名状之物的游戏准则。每次违反规则会积累“污染度”，但严格遵守规则又无法通关，必须在“微量违规边缘”寻找安全盲区。
2. **主角特质**：建议主角拥有“病态冷静”或“无法感知恐惧的情感缺失症”，在全员恐慌的精神污染副本中，如同手术刀般解剖怪谈规律。
3. **主线暗线**：每一个通关的副本，都在现实世界拼凑出不可名状本体的降临祭坛，主角必须在逃生与救世之间做出抉择。

❓ **下一步探讨**：主角的第一个新手副本，你希望发生在【永远没有终点站的深夜幽灵地铁】，还是【午夜规则相反的封闭中学校园】？`;
    }

    return `【主编建议】这个灵感非常有挖掘潜力！网文架构的核心是“三位一体”：**极致的冲突驱动力** + **独特的力量代价规则** + **鲜明的人物弧光**。
💡 **结构优化建议**：
1. **黄金前三章钩子**：必须在第一章立刻确立“主角濒临绝境的直接生存危机”，并在第三章完成金手指第一次爽快的逆风翻盘。
2. **战力硬约束**：力量越强大，代价越沉重。严禁没有代价的凭空爆种，必须有严谨的逻辑闭环。
3. **宿敌对立**：反派不应是脸谱化的恶人，而是与主角持有两种不同生存信条的同行者。

❓ **下一步探讨**：请告诉我你心目中主角的【最大欲望】是什么？他最害怕失去的又是什么？我们可以据此直接生成结构化小说骨架！`;
  }

  // 6. 一键生产全套结构化小说框架 (Generate Complete Structured Bible)
  async generateNovelFramework(
    seedIdea: string,
    genre?: string,
    onProgress?: (log: AgentExecutionLog) => void
  ): Promise<NovelFrameworkData> {
    const emit = (log: AgentExecutionLog) => onProgress?.(log);

    emit({
      step: '解构故事核心与主线矛盾',
      detail: `正在深度解析创作者灵感：“${seedIdea.slice(0, 30)}...”`,
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 600));

    emit({
      step: '推演世界观底层铁律与战力体系',
      detail: '生成不可违背的法则约束库（战力等级、施法反噬、核心势力分布）',
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 600));

    emit({
      step: '铸造人物人设模型与动态初始状态机',
      detail: '配置主角、宿敌反派与核心配角（核心动机、致命心理缺陷、语言语气口癖与初始生理标签）',
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 600));

    emit({
      step: '规划第一卷宏观冲突与前3章细纲节拍',
      detail: '按三幕式结构拆解前3章各分镜目标、冲突阻碍、核心转折与场景结果',
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });
    await new Promise((r) => setTimeout(r, 600));

    emit({
      step: '埋设初期长线伏笔暗线',
      detail: '登记 2 条跨卷伏笔至雷达追踪体系',
      status: 'done',
      timestamp: new Date().toLocaleTimeString(),
    });

    // 如果启用了真实 API，调用大模型智能构思全套小说框架
    if (!this.settings.useMock && this.settings.apiKey) {
      try {
        emit({
          step: '大模型生成全套小说架构中',
          detail: `向模型请求全书世界观法则、人物人设与卷章细纲规划...`,
          status: 'running',
          timestamp: new Date().toLocaleTimeString(),
        });

        const prompt = `你是一位白金级网络小说架构师。请根据以下灵感，为作者生成一套完整的小说世界观与第一卷前3章细纲骨架：
【作者核心灵感】：${seedIdea}
${genre ? `【题材偏好】：${genre}\n` : ''}
请严格输出合法的 JSON 对象，不要有任何多余文字或注释：
{
  "title": "小说书名",
  "subtitle": "副标题/一句话卖点",
  "genre": "题材标签",
  "logline": "故事一句话主线梗概",
  "targetWordCount": 1000000,
  "styleGuide": {
    "tone": "文风基调",
    "pacing": "叙事节奏",
    "descriptionDensity": "描写重点",
    "forbiddenPhrases": ["恐怖如斯", "倒吸一口凉气", "不由得"]
  },
  "worldSettings": [
    {
      "category": "POWER_SYSTEM",
      "name": "力量体系与升级反噬",
      "aliases": ["战力"],
      "priority": 100,
      "tags": ["战力", "硬约束"],
      "content": "修行等级与铁律反噬"
    },
    {
      "category": "FACTION",
      "name": "核心势力门派",
      "aliases": ["宗门"],
      "priority": 90,
      "tags": ["势力"],
      "content": "势力背景与利益矛盾"
    }
  ],
  "characters": [
    {
      "character": {
        "name": "主角姓名",
        "roleType": "PROTAGONIST",
        "profile": {
          "gender": "男",
          "age": "18",
          "identity": "身份",
          "appearance": "容貌外形",
          "personalityTraits": ["坚毅", "谨慎"],
          "coreDesire": "核心欲望",
          "fatalFlaw": "致命弱点",
          "speechStyle": "说话风格"
        },
        "relationships": []
      },
      "initialState": {
        "combatPower": "初始境界",
        "healthStatus": "HEALTHY",
        "statusTags": ["心志坚定"],
        "stateSummary": "初出茅庐"
      }
    }
  ],
  "volumes": [
    {
      "volume": {
        "volumeIndex": 1,
        "title": "第一卷 初始卷",
        "description": "初始冲突"
      },
      "chapters": [
        {
          "chapter": {
            "chapterIndex": 1,
            "title": "第一章 序幕",
            "outline": "第一章大纲"
          },
          "scenes": [
            {
              "sceneIndex": 1,
              "sceneGoal": "目标",
              "conflict": "冲突",
              "turnPoint": "转折",
              "outcome": "结果",
              "involvedCharacterIds": [],
              "location": "地点",
              "draftContent": ""
            }
          ]
        }
      ]
    }
  ],
  "foreshadowings": [
    {
      "title": "核心信物伏笔",
      "clueDescription": "伏笔线索描述",
      "plannedResolveChapterIndex": 15,
      "status": "PLANTED",
      "notes": "伏笔揭示目的"
    }
  ]
}`;

        const res = await this.callRealLLM(prompt, '你是一位严格输出合法 JSON 的网络小说全书架构师。');
        const jsonMatch = res.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.title && parsed.genre && parsed.worldSettings) {
            emit({
              step: '全书架构生成完成',
              detail: `成功通过大模型生成《${parsed.title}》的全套架构与细纲`,
              status: 'done',
              timestamp: new Date().toLocaleTimeString(),
            });
            return parsed as NovelFrameworkData;
          }
        }
      } catch (err: any) {
        emit({
          step: 'API 架构推演失败，回退至精选模板库',
          detail: `错误：${err.message}`,
          status: 'warning',
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    }

    // 智能模板分支推演
    const isCyber = seedIdea.includes('赛博') || seedIdea.includes('机械') || seedIdea.includes('芯片');
    const isHorror = seedIdea.includes('规则') || seedIdea.includes('怪谈') || seedIdea.includes('克苏鲁') || seedIdea.includes('深渊');
    const isHistory = seedIdea.includes('历史') || seedIdea.includes('大明') || seedIdea.includes('三国') || seedIdea.includes('种田');

    if (isCyber) {
      return {
        title: '赛博修真：重构道基',
        subtitle: '当赛博财阀垄断天道，我以开源算法肉身成圣',
        genre: '科幻修真 / 赛博朋克',
        logline: '下层机械修道散修林准在一次拆解旧义体事故中，偶然激活上古开源神级道法内核，在被跨国修真托拉斯控制的九龙浮空城中杀出血路。',
        targetWordCount: 1200000,
        styleGuide: {
          tone: '冷峻硬朗、高压快节奏、霓虹荒诞与古典道家交融',
          pacing: '危机接踵而至，战术博弈精密，杜绝无脑降智',
          descriptionDensity: '强调金属管线、润滑油与紫府丹田真元的反差质感',
          forbiddenPhrases: ['不由得', '恐怖如斯', '倒吸一口凉气'],
        },
        worldSettings: [
          {
            category: 'POWER_SYSTEM',
            name: '九转机道境界与算力法则',
            aliases: ['义体境界', '超导道基'],
            priority: 100,
            tags: ['战力', '硬约束', '反噬'],
            content: '修行等级划分为：电磁引气 ➔ 固态筑基 ➔ 量子金丹 ➔ 聚合元婴 ➔ 升维化神。\n硬性铁律：\n1. 凡体肉胎不可直连太虚高压灵网，必须植入钛合金中继脊椎。\n2. 运算神通超过神经负荷阈值（95%），将触发紫府死机与道基过载融毁。',
          },
          {
            category: 'FACTION',
            name: '蓬莱神霄生物科技重工',
            aliases: ['神霄集团', '蓬莱财阀'],
            priority: 90,
            tags: ['垄断', '反派阵营'],
            content: '掌控全城98%液态纯阳灵气配给的跨国托拉斯，旗下拥有执行死刑的“天兵”仿生执法队。',
          },
          {
            category: 'RULE',
            name: '开源底层天道协议',
            aliases: ['原始道核'],
            priority: 95,
            tags: ['天道', '底层秘密'],
            content: '现今天道已被财阀加密改写，唯有旧纪元开源协议可规避防火墙，直接调动自然法则，但会引来全城猎杀雷达报警。',
          },
        ],
        characters: [
          {
            character: {
              name: '林准',
              roleType: 'PROTAGONIST',
              gender: '男',
              background: '下城区第三贫民窟的黑市义体维修散修，早年因拒签神霄卖身契而被废黜原生道基。',
              profile: {
                appearance: '黑发碎短，右臂为陈旧哑光钛合金机械臂，腰间别着一把改装高频等离子符刃。',
                personalityTraits: ['极度敏锐', '杀伐果决', '重信守诺', '情绪内敛'],
                voiceAndTone: '冷静低沉，简明扼要，从不向对手解释自己的招数底牌。',
                coreMotivation: '修补破损神经中枢，彻查神霄集团暗杀其师尊的真相，打破灵气垄断。',
                fatalFlaw: '极度不信任任何组织与权威，甚至对善意抱有创伤性防备。',
                catchphrases: ['固件已重载，你出招太慢了。'],
              },
            },
            initialState: {
              chapterId: 'chap-001',
              chapterIndex: 1,
              location: '下城区暗渠街39号废品工坊',
              combatPower: '电磁引气中期（神经排斥度72%）',
              healthStatus: 'INJURED',
              statusTags: ['神经灼伤', '右臂液压漏油', '高烧'],
              stateSummary: '刚刚在黑市黑拳场逃脱追捕，右臂液压油管受损，体内残余旧灵气逆流。',
            },
          },
          {
            character: {
              name: '司徒霆',
              roleType: 'ANTAGONIST',
              gender: '男',
              background: '神霄集团驻下城治安副长官，量子金丹期半人神兵。',
              profile: {
                appearance: '银白合金长发，左眼为多光谱全息义眼，身着笔挺深蓝防弹西装。',
                personalityTraits: ['傲慢自负', '偏执规整', '视下层散修为低耗品'],
                voiceAndTone: '字正腔圆带机械金属共鸣音，言辞间充满对“下等凡民”的轻蔑。',
                coreMotivation: '追捕回收逃逸的原始开源道核芯片，晋升集团总董事会。',
                fatalFlaw: '过度依赖集团数据库给出的概率模型，轻视人类在绝境下的反抗直觉。',
                catchphrases: ['在神霄的算力之下，尔等的反抗不过是程序冗余。'],
              },
            },
            initialState: {
              chapterId: 'chap-001',
              chapterIndex: 1,
              location: '浮空城上层第7巡航舰指挥室',
              combatPower: '量子金丹初期（算力全满）',
              healthStatus: 'HEALTHY',
              statusTags: ['神霄督导', '全息信标覆盖'],
              stateSummary: '坐镇指挥室，已向全城下水道暗渠下达猎杀封锁令。',
            },
          },
          {
            character: {
              name: '沈知微',
              roleType: 'SUPPORTING',
              gender: '女',
              background: '逃亡黑客修士，前神霄道网安全架构师，隐藏在黑市医馆。',
              profile: {
                appearance: '穿着宽大兜帽卫衣，常年佩戴全息隐形眼镜，指尖嵌有高导电神经纤维针。',
                personalityTraits: ['古灵精怪', '技术狂热', '刀子嘴豆腐心'],
                voiceAndTone: '语速极快，喜欢用代码和算法术语打比方。',
                coreMotivation: '摧毁神霄灵气脑机网络，为死去的同窗复仇。',
                fatalFlaw: '身体孱弱毫无近战能力，重度咖啡因依赖。',
                catchphrases: ['等一下！我马上把这扇防爆闸门的协议黑掉！'],
              },
            },
            initialState: {
              chapterId: 'chap-001',
              chapterIndex: 1,
              location: '暗渠街地下黑医馆安全屋',
              combatPower: '网络真神 / 肉身凡胎',
              healthStatus: 'HEALTHY',
              statusTags: ['多重代理连接', '隐匿信号'],
              stateSummary: '通过暗网监控全城天网动态，正秘密接应负伤的林准。',
            },
          },
        ],
        volumes: [
          {
            volume: {
              volumeIndex: 1,
              title: '第一卷：深渠潜行，道核初醒',
              mainConflict: '林准携带泄露的原始道核芯片在下城区暗渠逃脱神霄集团拉网式大搜捕。',
              targetClimax: '暗渠净水厂生死围剿，林准借古旧开源雷法过载全区变电站，反杀神霄追猎中队。',
            },
            chapters: [
              {
                chapter: {
                  chapterIndex: 1,
                  title: '暗夜拆解，天道芯片',
                  outline: '林准在地下工坊拆解走私的古修义体，意外触发被尘封十年的原始道核，神霄追兵破门而入。',
                  wordCountGoal: 4500,
                  actualWordCount: 0,
                  status: 'PLANNED',
                },
                scenes: [
                  {
                    sceneIndex: 1,
                    sceneGoal: '林准完成危险的义体焊接，试图换取本月维生灵液',
                    conflict: '老旧焊枪漏电导致神经中枢剧痛，残破机件险些报废',
                    turnPoint: '废弃脑机接口突然反向注入一条未加密的古文代码',
                    outcome: '芯片强行绑定右臂，工坊警戒红灯骤然拉响',
                    involvedCharacterIds: ['char-001'],
                    location: '暗渠街工坊',
                    draftContent: '',
                  },
                  {
                    sceneIndex: 2,
                    sceneGoal: '利用复杂地下地形甩开神霄机械猎犬的追击',
                    conflict: '右臂液压油管破裂导致移速大跌，前路被治安闸门封锁',
                    turnPoint: '初次调动开源代码，右臂高频符刃强行切断供电网',
                    outcome: '成功跳入排污主干道，但行踪被全息浮空球捕获',
                    involvedCharacterIds: ['char-001'],
                    location: '暗渠三号排污井',
                    draftContent: '',
                  },
                  {
                    sceneIndex: 3,
                    sceneGoal: '抵达成黑医馆安全屋，寻求沈知微的技术压制',
                    conflict: '沈知微误以为他是集团暗桩，激活防御电网相向',
                    turnPoint: '林准展示出神霄绝不外泄的原始开源握手协议',
                    outcome: '沈知微惊骇之下收手，迅速为其缝合受损神经',
                    involvedCharacterIds: ['char-001', 'char-003'],
                    location: '地下黑医馆',
                    draftContent: '',
                  },
                ],
              },
              {
                chapter: {
                  chapterIndex: 2,
                  title: '黑市暗流，通缉天罗',
                  outline: '神霄集团悬赏十万灵晶通缉林准，下城区各路黑帮与杀手倾巢出动。',
                  wordCountGoal: 4500,
                  actualWordCount: 0,
                  status: 'PLANNED',
                },
                scenes: [
                  {
                    sceneIndex: 1,
                    sceneGoal: '在黑市购买稀缺的神经稳定剂与绝缘重铅护甲',
                    conflict: '药贩当场暗中向集团报信，黑帮包围药铺',
                    turnPoint: '林准洞察奸计，引爆货架灵火药剂制造火海',
                    outcome: '夺药突围，将药贩钉在废铁立柱上逼问线索',
                    involvedCharacterIds: ['char-001'],
                    location: '黑市药王铺',
                    draftContent: '',
                  },
                ],
              },
              {
                chapter: {
                  chapterIndex: 3,
                  title: '雷火倒灌，过载反杀',
                  outline: '司徒霆亲率浮空执法中队降临暗渠，林准诱敌深入，启动老式变电所反击。',
                  wordCountGoal: 5000,
                  actualWordCount: 0,
                  status: 'PLANNED',
                },
                scenes: [
                  {
                    sceneIndex: 1,
                    sceneGoal: '将追兵引入充满高浓度沼气与高压变电线缆的弃置站台',
                    conflict: '执法中队的激光压制让林准无法探头，掩体寸寸崩裂',
                    turnPoint: '沈知微黑入变电所重合闸，林准以机械臂导引百万伏特雷光',
                    outcome: '人造天雷横扫敌群，神霄先锋全军覆没，林准跳入深层地渊',
                    involvedCharacterIds: ['char-001', 'char-002', 'char-003'],
                    location: '废弃枢纽站',
                    draftContent: '',
                  },
                ],
              },
            ],
          },
        ],
        foreshadowings: [
          {
            title: '原始道核中的神秘作者签名',
            clueDescription: '芯片深层代码注释里有一行用旧汉字写下的落款：“赠吾徒准”，字迹与其早亡的师尊一模一样。',
            plannedResolveChapterIndex: 28,
            status: 'PLANTED',
            notes: '后续揭示师尊根本未死，而是神霄初代首席科学家，因叛逃被抹除记忆囚禁于最高浮空城。',
          },
          {
            title: '全城机械修士的自毁后门',
            clueDescription: '沈知微在破解神霄标准义体驱动时，发现所有量产义体内都植入了一个将在七月十五自动激活的“天兵兵解”程序。',
            plannedResolveChapterIndex: 45,
            status: 'PLANTED',
            notes: '集团高层计划借中元节血祭千万底层义体修士，用以点燃飞升天梯。',
          },
        ],
      };
    }

    // 默认通用高质量仙侠/奇幻蓝图 (基于用户输入定制)
    return {
      title: seedIdea.slice(0, 10).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '') || '太虚星穹录',
      subtitle: '踏碎诸天神魔，执掌永恒长生',
      genre: genre || '玄幻仙侠 / 东方神魔',
      logline: `围绕“${seedIdea.slice(0, 40)}”展开，讲述主角在严密的大道法则与残酷势力交锋中步步为营求存长生的宏伟史诗。`,
      targetWordCount: 1500000,
      styleGuide: {
        tone: '大气庄严、逻辑严密、兼具古典雅韵与戏剧对抗张力',
        pacing: '节奏紧凑，层层递进，每卷均有严密铺垫的大高潮',
        descriptionDensity: '工笔细描场景与心理，动武时干净利落',
        forbiddenPhrases: ['恐怖如斯', '倒吸一口冷气', '不由得'],
      },
      worldSettings: [
        {
          category: 'POWER_SYSTEM',
          name: '大道九阶战力与天道誓言法则',
          aliases: ['修行境界', '道誓'],
          priority: 100,
          tags: ['战力铁律', '硬约束'],
          content: '炼气 ➔ 筑基 ➔ 金丹 ➔ 元婴 ➔ 化神 ➔ 返虚 ➔ 合道 ➔ 渡劫 ➔ 真仙。\n铁律：低境界绝无可能撕裂虚空瞬移，境界压制具有神识层面的绝对震慑，越阶战斗必须依靠克制法则与地利算计。',
        },
        {
          category: 'FACTION',
          name: '天下第一道宗与幽冥魔渊',
          aliases: ['太虚仙门', '魔宗九脉'],
          priority: 90,
          tags: ['门派', '势力对抗'],
          content: '正邪两道表面维持三百年和平盟约，暗地里为争夺上古仙府遗落的道种残卷展开殊死博弈。',
        },
        {
          category: 'RULE',
          name: '天道因果反噬铁律',
          aliases: ['因果律'],
          priority: 95,
          tags: ['世界法则'],
          content: '滥杀凡俗将引发天道煞气缠身，渡劫时心魔劫威力翻倍，修士之间立下的血誓若违背将即刻招致雷劫天诛。',
        },
      ],
      characters: [
        {
          character: {
            name: '江逸',
            roleType: 'PROTAGONIST',
            gender: '男',
            background: '边陲落魄修仙世家独子，宗族遭强敌构陷覆灭，独自一人护送家传残篇逃亡。',
            profile: {
              appearance: '青衣素袍，身负墨色长匣，神色沉静，眉宇间有一抹坚毅冷光。',
              personalityTraits: ['极度隐忍', '缜密深算', '遇险不乱', '杀伐果断'],
              voiceAndTone: '平缓沉着，惜字如金，从不作意气之争。',
              coreMotivation: '守护家传残卷，追查宗门灭绝元凶，求证无上真仙大道。',
              fatalFlaw: '对外界怀有极强戒心，极难建立对同伴的完全信任。',
              catchphrases: ['多言无益，请出招。'],
            },
          },
          initialState: {
            chapterId: 'chap-001',
            chapterIndex: 1,
            location: '落霞山脉边缘野林',
            combatPower: '炼气期大圆满',
            healthStatus: 'INJURED',
            statusTags: ['气血翻涌', '长途跋涉疲惫'],
            stateSummary: '连续奔波三昼夜甩脱追兵，真元枯竭两成，受轻微掌风震伤。',
          },
        },
        {
          character: {
            name: '夜幽冥',
            roleType: 'ANTAGONIST',
            gender: '男',
            background: '幽冥魔渊血杀堂执事，受命斩草除根。',
            profile: {
              appearance: '身披血色鹤氅，面白无须，眼神阴鸷如毒蝎。',
              personalityTraits: ['残忍嗜杀', '多疑狠辣'],
              voiceAndTone: '尖细冰冷，喜好以折磨敌人心智为乐。',
              coreMotivation: '夺取江家残卷献与魔尊，换取晋升结丹的融煞丹。',
              fatalFlaw: '贪功冒进，喜欢在胜券在握时嘲弄折磨对手。',
              catchphrases: ['交出残卷，本座留你神魂不灭！'],
            },
          },
          initialState: {
            chapterId: 'chap-001',
            chapterIndex: 1,
            location: '落霞山官道古驿站',
            combatPower: '筑基初期',
            healthStatus: 'HEALTHY',
            statusTags: ['血煞缠身'],
            stateSummary: '正布置血魂阵封锁落霞山各路出口。',
          },
        },
      ],
      volumes: [
        {
          volume: {
            volumeIndex: 1,
            title: '第一卷：落霞风云，青锋出鞘',
            mainConflict: '江逸在落霞山脉突破重围，利用古仙阵法斩杀魔宗追杀者。',
            targetClimax: '落霞主峰断龙崖决战，江逸以身为饵引动地脉煞雷，绝境斩筑基。',
          },
          chapters: [
            {
              chapter: {
                chapterIndex: 1,
                title: '风雨山神庙',
                outline: '暴风雨夜，江逸避雨落霞山废庙，遭遇魔宗斥候探查，展开无声反杀。',
                wordCountGoal: 4000,
                actualWordCount: 0,
                status: 'PLANNED',
              },
              scenes: [
                {
                  sceneIndex: 1,
                  sceneGoal: '在残破神庙中调息压制内伤并设下预警机关',
                  conflict: '暴雨冲垮后墙，山道上传来马蹄与灵兽低吼',
                  turnPoint: '泥塑神像后方发现前人遗留的半部避煞禁制',
                  outcome: '成功隐匿自身生机，静候敌人踏入伏击圈',
                  involvedCharacterIds: ['char-001'],
                  location: '破败山神庙',
                  draftContent: '',
                },
                {
                  sceneIndex: 2,
                  sceneGoal: '干净利落地诛杀进庙避雨的三名魔宗探子',
                  conflict: '领头者身怀感应灵盘，察觉到真元微动',
                  turnPoint: '江逸借雷霆巨响掩盖出鞘破空声，暴起刺杀一人',
                  outcome: '三息内斩杀两人，留下一人口实审问敌情',
                  involvedCharacterIds: ['char-001'],
                  location: '山神庙正殿',
                  draftContent: '',
                },
              ],
            },
          ],
        },
      ],
      foreshadowings: [
        {
          title: '家传残卷上的半块龙形玉佩',
          clueDescription: '残卷夹层中嵌有半块温润古玉，触碰时会引起眉心神识轻微刺痛。',
          plannedResolveChapterIndex: 20,
          status: 'PLANTED',
          notes: '实为开启中州古仙帝陵寝的钥匙之一，另一半在女主手中。',
        },
      ],
    };
  }

  // 真实 LLM API 调用 (支持浏览器直连与后端中转代理自适应)
  private async callRealLLM(prompt: string, systemPrompt?: string): Promise<string> {
    const endpoint = normalizeEndpoint(this.settings.apiEndpoint);
    const messages = [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: prompt },
    ];

    // 1. 如果用户显式启用了后端中转代理
    if (this.settings.useBackendProxy) {
      const resp = await fetch('http://localhost:8000/api/llm/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint,
          api_key: this.settings.apiKey || '',
          model: this.settings.model || 'deepseek-v4-flash',
          messages,
          temperature: this.settings.temperature || 0.7,
        }),
      });
      if (!resp.ok) {
        const err = await resp.text();
        throw new Error(`后端代理 LLM 错误 (${resp.status}): ${err}`);
      }
      const data = await resp.json();
      return data.choices?.[0]?.message?.content || '';
    }

    // 2. 默认浏览器直连
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.settings.apiKey && this.settings.apiKey.trim()) {
        headers['Authorization'] = `Bearer ${this.settings.apiKey.trim()}`;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: this.settings.model || 'deepseek-v4-flash',
          messages,
          temperature: this.settings.temperature || 0.7,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API 响应错误 (${response.status}): ${err}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } catch (err: any) {
      // 若直连遇到浏览器 CORS 限制 (Failed to fetch)，自动尝试通过本地后端代理兜底重试
      try {
        const fallbackResp = await fetch('http://localhost:8000/api/llm/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint,
            api_key: this.settings.apiKey || '',
            model: this.settings.model || 'deepseek-v4-flash',
            messages,
            temperature: this.settings.temperature || 0.7,
          }),
        });
        if (fallbackResp.ok) {
          const fallbackData = await fallbackResp.json();
          return fallbackData.choices?.[0]?.message?.content || '';
        }
      } catch {
        // 忽略中转重试失败，抛出原直连异常
      }

      throw err;
    }
  }
}

export const ai = new AIService();
