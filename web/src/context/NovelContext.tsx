// ==============================================================================
// 小说创作管理状态上下文 (Novel Context & State Store)
// 提供完整的状态机、本地持久化与 Agent 协作调度
// ==============================================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Novel,
  WorldSetting,
  Character,
  CharacterState,
  CharacterRelation,
  Volume,
  Chapter,
  Scene,
  Foreshadowing,
  ManuscriptVersion,
  UserSettings,
  InspectionIssue,
  AgentRole,
  NovelSummary,
  NovelFrameworkData,
  PlotBranchOption,
  getCharacterStateAtChapter,
  PolishTechnique,
  PolishResult,
  PolishTechniqueStats,
} from '../types/novel';
import {
  sampleNovel,
  sampleWorldSettings,
  sampleCharacters,
  sampleCharacterStates,
  sampleRelations,
  sampleVolumes,
  sampleForeshadowings,
  sampleVersions,
} from '../data/sampleNovel';
import { AIService, AgentExecutionLog } from '../lib/aiService';

interface NovelContextType {
  // 实体状态
  novel: Novel;
  worldSettings: WorldSetting[];
  characters: Character[];
  characterStates: CharacterState[];
  characterRelations: CharacterRelation[];
  volumes: Volume[];
  foreshadowings: Foreshadowing[];
  versions: ManuscriptVersion[];
  
  // 当前选中的上下文指针
  activeChapterId: string;
  activeSceneIndex: number;
  activeChapter: Chapter | undefined;
  activeScene: Scene | undefined;
  
  // 编辑器与正文状态
  editorContent: string;
  setEditorContent: (content: string) => void;
  pendingDraft: string | null;
  setPendingDraft: (draft: string | null) => void;
  
  // Agent 状态与日志
  currentAgent: AgentRole;
  setCurrentAgent: (role: AgentRole) => void;
  activeDockTab: 'chat' | 'pipeline';
  setActiveDockTab: (tab: 'chat' | 'pipeline') => void;
  isAgentRunning: boolean;
  agentLogs: AgentExecutionLog[];
  inspectionIssues: InspectionIssue[];
  suggestedStateUpdate: Partial<CharacterState> | null;
  
  // 用户设置
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => void;
  isSettingsModalOpen: boolean;
  openSettingsModal: () => void;
  closeSettingsModal: () => void;
  
  // 业务调度方法
  setActiveChapterId: (id: string) => void;
  setActiveSceneIndex: (idx: number) => void;
  updateNovel: (updated: Partial<Novel>) => void;
  
  // 世界观 CRUD
  addWorldSetting: (setting: Omit<WorldSetting, 'id' | 'novelId'>) => void;
  updateWorldSetting: (id: string, setting: Partial<WorldSetting>) => void;
  deleteWorldSetting: (id: string) => void;
  
  // 角色与状态机 CRUD
  addCharacter: (character: Omit<Character, 'id' | 'novelId' | 'createdAt'>) => void;
  updateCharacter: (id: string, character: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  updateCharacterState: (state: Omit<CharacterState, 'id' | 'updatedAt'>) => void;
  getCharacterStateAtChapter: (characterId: string, chapterIndex?: number) => CharacterState | undefined;
  updateCharacterRelation: (relation: Omit<CharacterRelation, 'id' | 'novelId'>) => void;
  deleteCharacterRelation: (id: string) => void;
  
  // 大纲与分镜
  addVolume: (title: string, mainConflict: string, targetClimax: string, summary?: string, boundaryConstraints?: string) => void;
  updateVolume: (volumeId: string, updated: Partial<Volume>) => void;
  deleteVolume: (volumeId: string) => void;
  addChapter: (volumeId: string, title: string, outline: string, povCharId?: string) => void;
  updateChapter: (chapterId: string, updated: Partial<Chapter>) => void;
  deleteChapter: (chapterId: string) => void;
  addScene: (chapterId: string, scene: Omit<Scene, 'id' | 'chapterId'>) => void;
  updateScene: (chapterId: string, sceneIndex: number, scene: Partial<Scene>) => void;
  deleteScene: (chapterId: string, sceneIndex: number) => void;
  generateScenesForChapter: (chapterId: string) => Promise<void>;
  adoptPlotBranch: (branch: PlotBranchOption, targetVolumeId?: string, targetPovId?: string) => string;
  
  // 伏笔
  addForeshadowing: (fs: Omit<Foreshadowing, 'id' | 'novelId'>) => void;
  updateForeshadowingStatus: (id: string, status: Foreshadowing['status']) => void;
  
  // Agent 创作闭环与创世向导
  runDirectorPlanScenes: () => Promise<void>;
  runDrafterWriteScene: () => Promise<void>;
  runInspectorAudit: () => Promise<void>;
  runStylistPolish: (customReuseTechniques?: PolishTechnique[]) => Promise<void>;
  acceptPendingDraft: (selectedTechniquesToSave?: PolishTechnique[]) => Promise<void>;
  dismissPendingDraft: () => void;
  applySuggestedStateUpdate: () => void;
  chatBrainstorm: (messages: { role: 'user' | 'assistant'; content: string }[], genreHint?: string) => Promise<string>;
  chatSceneDiscussion: (messages: { role: 'user' | 'assistant'; content: string }[]) => Promise<string>;
  generateNovelFramework: (seedIdea: string, genre?: string, onProgress?: (log: AgentExecutionLog) => void) => Promise<NovelFrameworkData>;

  // 文风润色与技巧沉淀资产
  pendingPolishResult: PolishResult | null;
  savedPolishTechniques: PolishTechnique[];
  techniqueStats: PolishTechniqueStats | null;
  selectedTechniquesForReuse: string[];
  isTechniqueModalOpen: boolean;
  setIsTechniqueModalOpen: (open: boolean) => void;
  toggleReuseTechnique: (techniqueName: string) => void;
  clearReuseTechniques: () => void;
  fetchPolishTechniques: (novelId?: string) => Promise<void>;
  fetchTechniqueStats: (novelId?: string) => Promise<void>;
  saveTechniquesToDb: (novelId: string, techniques: PolishTechnique[], chapterId?: string) => Promise<void>;

  // 作品库与多作品管理
  novelList: NovelSummary[];
  switchNovel: (novelId: string) => Promise<boolean>;
  createBlankNovel: (title: string, genre: string, targetWordCount?: number) => Promise<string>;
  createNovelFromFramework: (framework: NovelFrameworkData) => string;
  deleteNovel: (novelId: string) => void;

  // 数据导入导出与重置
  resetToSampleData: () => void;
  exportProjectJson: () => string;
  importProjectJson: (jsonStr: string) => boolean;
  syncFromBackend: () => Promise<boolean>;
}

const NovelContext = createContext<NovelContextType | undefined>(undefined);

const LEGACY_STORAGE_KEY = 'nov_manager_state_v1';
const NOVELS_INDEX_KEY = 'nov_manager_novels_index_v2';
const NOVEL_DATA_PREFIX = 'nov_manager_data_';
const ACTIVE_NOVEL_ID_KEY = 'nov_active_novel_id';
const LLM_SETTINGS_KEY = 'nov_manager_llm_settings_v1';

// 将后端完整 Bundle 映射为前端状态模型
export function mapBackendBundleToFrontend(b: any) {
  const n = b.novel || {};
  const novel: Novel = {
    id: n.id,
    title: n.title,
    subtitle: n.subtitle || '',
    genre: n.genre,
    targetWordCount: n.target_word_count ?? n.targetWordCount ?? 1000000,
    currentWordCount: n.current_word_count ?? n.currentWordCount ?? 0,
    defaultPov: n.default_pov || n.defaultPov || '主角视角',
    styleGuide: {
      tone: n.style_guide?.tone || n.styleGuide?.tone || '节奏紧凑、冲突鲜明',
      pacing: n.style_guide?.pacing || n.styleGuide?.pacing || '张弛有度',
      descriptionDensity: n.style_guide?.description_density || n.styleGuide?.descriptionDensity || '适中',
      forbiddenPhrases: n.style_guide?.forbidden_phrases || n.styleGuide?.forbiddenPhrases || ['恐怖如斯', '倒吸一口凉气'],
    },
    createdAt: n.created_at || n.createdAt || new Date().toISOString(),
    updatedAt: n.updated_at || n.updatedAt || new Date().toISOString(),
  };

  const volumes: Volume[] = (b.volumes || []).map((v: any) => ({
    id: v.id,
    novelId: v.novel_id || v.novelId || novel.id,
    volumeIndex: v.volume_index ?? v.volumeIndex ?? 1,
    title: v.title || '第一卷',
    summary: v.summary || '',
    mainConflict: v.main_conflict || v.mainConflict || '',
    targetClimax: v.target_climax || v.targetClimax || '',
    boundaryConstraints: v.boundary_constraints || v.boundaryConstraints || '',
    chapters: (v.chapters || []).map((c: any) => ({
      id: c.id,
      volumeId: c.volume_id || c.volumeId || v.id,
      novelId: c.novel_id || c.novelId || novel.id,
      chapterIndex: c.chapter_index ?? c.chapterIndex ?? 1,
      title: c.title || '第一章',
      outline: c.outline || '',
      povCharacterId: c.pov_character_id || c.povCharacterId || '',
      wordCountGoal: c.word_count_goal ?? c.wordCountGoal ?? 3000,
      actualWordCount: c.actual_word_count ?? c.actualWordCount ?? 0,
      status: c.status || 'PLANNED',
      scenes: (c.scenes || []).map((s: any) => ({
        id: s.id,
        chapterId: s.chapter_id || s.chapterId || c.id,
        sceneIndex: s.scene_index ?? s.sceneIndex ?? 1,
        sceneGoal: s.scene_goal || s.sceneGoal || '',
        conflict: s.conflict || '',
        turnPoint: s.turn_point || s.turnPoint || '',
        outcome: s.outcome || '',
        involvedCharacterIds: s.involved_character_ids || s.involvedCharacterIds || [],
        location: s.location || '',
        draftContent: s.draft_content ?? s.draftContent ?? '',
        agentNotes: s.agent_notes ?? s.agentNotes ?? '',
      })),
    })),
  }));

  const characters: Character[] = (b.characters || []).map((c: any) => ({
    id: c.id,
    novelId: c.novel_id || c.novelId || novel.id,
    name: c.name,
    roleType: c.role_type || c.roleType || 'SUPPORTING',
    gender: c.gender || 'UNKNOWN',
    background: c.background || '',
    createdAt: c.created_at || c.createdAt || new Date().toISOString(),
    profile: {
      appearance: c.profile?.appearance || '',
      personalityTraits: c.profile?.personality_traits || c.profile?.personalityTraits || [],
      voiceAndTone: c.profile?.voice_and_tone || c.profile?.voiceAndTone || '',
      coreMotivation: c.profile?.core_motivation || c.profile?.coreMotivation || '',
      fatalFlaw: c.profile?.fatal_flaw || c.profile?.fatalFlaw || '',
      catchphrases: c.profile?.catchphrases || [],
    },
  }));

  const characterStates: CharacterState[] = (b.character_states || b.characterStates || []).map((st: any) => ({
    id: st.id,
    characterId: st.character_id || st.characterId,
    chapterId: st.chapter_id || st.chapterId,
    chapterIndex: st.chapter_index ?? st.chapterIndex ?? 1,
    location: st.location || '',
    combatPower: st.combat_power || st.combatPower || '',
    healthStatus: st.health_status || st.healthStatus || '良好',
    statusTags: st.status_tags || st.statusTags || [],
    stateSummary: st.state_summary || st.stateSummary || '',
    updatedAt: st.updated_at || st.updatedAt || new Date().toISOString(),
  }));

  const worldSettings: WorldSetting[] = (b.world_settings || b.worldSettings || []).map((w: any) => ({
    id: w.id,
    novelId: w.novel_id || w.novelId || novel.id,
    category: w.category || 'OTHER',
    name: w.name,
    aliases: w.aliases || [],
    tags: w.tags || [],
    content: w.content || '',
    confidentialityLevel: w.confidentiality_level || w.confidentialityLevel || 'PUBLIC',
    rulesAndConstraints: w.rules_and_constraints || w.rulesAndConstraints || [],
  }));

  const foreshadowings: Foreshadowing[] = (b.foreshadowings || []).map((f: any) => ({
    id: f.id,
    novelId: f.novel_id || f.novelId || novel.id,
    title: f.title,
    clueDescription: f.clue_description || f.clueDescription || '',
    plantedChapterId: f.planted_chapter_id || f.plantedChapterId || '',
    plannedResolveChapterId: f.planned_resolve_chapter_id || f.plannedResolveChapterId,
    plannedResolveChapterIndex: f.planned_resolve_chapter_index ?? f.plannedResolveChapterIndex,
    status: f.status || 'PLANTED',
    notes: f.notes || '',
  }));

  return {
    novel,
    volumes,
    characters,
    characterStates,
    characterRelations: b.character_relations || b.characterRelations || [],
    worldSettings,
    foreshadowings,
    versions: b.versions || [],
    activeChapterId: b.active_chapter_id || b.activeChapterId || '',
    activeSceneIndex: b.active_scene_index || b.activeSceneIndex || 1,
  };
}

export const NovelProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 从 LocalStorage 恢复作品索引列表，按规范化书名严格去重
  const loadInitialNovelList = (): NovelSummary[] => {
    try {
      const raw = localStorage.getItem(NOVELS_INDEX_KEY);
      if (raw) {
        const list: NovelSummary[] = JSON.parse(raw);
        const seen = new Set<string>();
        const deduplicated: NovelSummary[] = [];
        for (const item of list) {
          const key = (item.title || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            deduplicated.push(item);
          }
        }
        if (deduplicated.length > 0) {
          return deduplicated;
        }
      }
    } catch (e) {
      console.error('加载作品列表失败:', e);
    }
    return [
      {
        id: sampleNovel.id,
        title: sampleNovel.title,
        genre: sampleNovel.genre,
        targetWordCount: sampleNovel.targetWordCount,
        currentWordCount: sampleNovel.currentWordCount,
        updatedAt: sampleNovel.updatedAt,
      },
    ];
  };

  const [novelList, setNovelList] = useState<NovelSummary[]>(loadInitialNovelList);

  // 从 LocalStorage 恢复当前激活作品数据或加载默认值
  const loadInitialData = () => {
    try {
      const activeId = localStorage.getItem(ACTIVE_NOVEL_ID_KEY) || sampleNovel.id;
      const savedForActive = localStorage.getItem(NOVEL_DATA_PREFIX + activeId);
      if (savedForActive) {
        try {
          const parsed = JSON.parse(savedForActive);
          const existingChapters = parsed?.volumes?.[0]?.chapters || [];
          // 若为太虚纪元且本地缓存的章节少于13章，自动合并升级为全量13章
          if (activeId === 'nov-001' && (existingChapters.length < 13 || !existingChapters.some((c: any) => c.id === 'chap-001'))) {
            console.info('检测到《太虚纪元》本地缓存为旧版，自动升级载入 1-13 章完整内容');
            return {
              ...parsed,
              novel: sampleNovel,
              volumes: sampleVolumes,
              activeChapterId: parsed.activeChapterId || 'chap-001',
              activeSceneIndex: parsed.activeSceneIndex || 1,
            };
          }
          return parsed;
        } catch (e) {}
      }
      // 若当前激活的小说存在于作品列表，但不属于 sampleNovel，则生成干净骨架，避免串入太虚纪元的数据
      const currentSummaries = loadInitialNovelList();
      const currentMeta = currentSummaries.find((n) => n.id === activeId);
      if (currentMeta && currentMeta.id !== sampleNovel.id) {
        return {
          novel: {
            ...sampleNovel,
            id: currentMeta.id,
            title: currentMeta.title,
            genre: currentMeta.genre,
            targetWordCount: currentMeta.targetWordCount,
            currentWordCount: currentMeta.currentWordCount,
            updatedAt: currentMeta.updatedAt,
          },
          worldSettings: [],
          characters: [],
          characterStates: [],
          characterRelations: [],
          volumes: [],
          foreshadowings: [],
          versions: [],
          activeChapterId: '',
          activeSceneIndex: 1,
        };
      }
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacySaved) {
        try {
          const legacyParsed = JSON.parse(legacySaved);
          if (legacyParsed?.volumes?.[0]?.chapters?.length >= 13) {
            return legacyParsed;
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error('加载本地存储失败:', e);
    }
    return {
      novel: sampleNovel,
      worldSettings: sampleWorldSettings,
      characters: sampleCharacters,
      characterStates: sampleCharacterStates,
      characterRelations: sampleRelations,
      volumes: sampleVolumes,
      foreshadowings: sampleForeshadowings,
      versions: sampleVersions,
      activeChapterId: 'chap-001',
      activeSceneIndex: 1,
    };
  };

  const initial = loadInitialData();

  const [novel, setNovel] = useState<Novel>(initial.novel);
  const [worldSettings, setWorldSettings] = useState<WorldSetting[]>(initial.worldSettings);
  const [characters, setCharacters] = useState<Character[]>(initial.characters);
  const [characterStates, setCharacterStates] = useState<CharacterState[]>(initial.characterStates);
  const [characterRelations, setCharacterRelations] = useState<CharacterRelation[]>(initial.characterRelations);
  const [volumes, setVolumes] = useState<Volume[]>(initial.volumes);
  const [foreshadowings, setForeshadowings] = useState<Foreshadowing[]>(initial.foreshadowings);
  const [versions, setVersions] = useState<ManuscriptVersion[]>(initial.versions);

  const [activeChapterId, setActiveChapterId] = useState<string>(initial.activeChapterId || 'chap-001');
  const [activeSceneIndex, setActiveSceneIndex] = useState<number>(initial.activeSceneIndex || 1);

  const [currentAgent, setCurrentAgent] = useState<AgentRole>('DRAFTER');
  const [activeDockTab, setActiveDockTab] = useState<'chat' | 'pipeline'>('chat');
  const [isAgentRunning, setIsAgentRunning] = useState<boolean>(false);
  const [agentLogs, setAgentLogs] = useState<AgentExecutionLog[]>([]);
  const [inspectionIssues, setInspectionIssues] = useState<InspectionIssue[]>([]);
  const [suggestedStateUpdate, setSuggestedStateUpdate] = useState<Partial<CharacterState> | null>(null);

  const [pendingDraft, setPendingDraft] = useState<string | null>(null);
  const [pendingPolishResult, setPendingPolishResult] = useState<PolishResult | null>(null);
  const [savedPolishTechniques, setSavedPolishTechniques] = useState<PolishTechnique[]>([]);
  const [techniqueStats, setTechniqueStats] = useState<PolishTechniqueStats | null>(null);
  const [selectedTechniquesForReuse, setSelectedTechniquesForReuse] = useState<string[]>([]);
  const [isTechniqueModalOpen, setIsTechniqueModalOpen] = useState<boolean>(false);

  // 用户设置 (持久化存储)
  const [settings, setSettings] = useState<UserSettings>(() => {
    try {
      const raw = localStorage.getItem(LLM_SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // 如果旧配置中的 model 是旧版 deepseek-chat 或 deepseek-ai/DeepSeek-V3，自动平滑升级为最新的 deepseek-v4-flash
        if (
          parsed.provider === 'deepseek' &&
          (parsed.model === 'deepseek-chat' || !parsed.model)
        ) {
          parsed.model = 'deepseek-v4-flash';
        } else if (
          parsed.provider === 'opencode' &&
          (parsed.model === 'deepseek-ai/DeepSeek-V3' || !parsed.model)
        ) {
          parsed.model = 'deepseek-v4-flash';
          if (parsed.apiEndpoint === 'https://api.opencode-go.com/v1/chat/completions') {
            parsed.apiEndpoint = 'https://opencode.ai/zen/go/v1/chat/completions';
          }
        }
        return parsed;
      }
    } catch (e) {
      console.error('加载 LLM 设置失败:', e);
    }
    return {
      provider: 'deepseek',
      apiEndpoint: 'https://api.deepseek.com/v1/chat/completions',
      apiKey: '',
      model: 'deepseek-v4-flash',
      useMock: true,
      temperature: 0.7,
      useBackendProxy: false,
    };
  });

  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const openSettingsModal = () => setIsSettingsModalOpen(true);
  const closeSettingsModal = () => setIsSettingsModalOpen(false);

  useEffect(() => {
    try {
      localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(settings));
      ai.updateSettings(settings);
    } catch (e) {
      console.error('保存 LLM 设置失败:', e);
    }
  }, [settings]);

  useEffect(() => {
    ai.updateSettings(settings);
  }, []);

  // 查找到当前章节和分镜
  const allChapters = volumes.flatMap((v) => v.chapters);
  const activeChapter = allChapters.find((c) => c.id === activeChapterId) || allChapters[0];
  const activeScene = activeChapter?.scenes?.find((s) => s.sceneIndex === activeSceneIndex) || activeChapter?.scenes?.[0];

  const [editorContent, setEditorContent] = useState<string>(
    activeScene?.draftContent || ''
  );

  // 当切换章节或分镜时，更新编辑框内容
  useEffect(() => {
    if (activeScene) {
      setEditorContent(activeScene.draftContent || '');
      setPendingDraft(null);
      setInspectionIssues([]);
    }
  }, [activeChapterId, activeSceneIndex]);

  // 自动同步到 LocalStorage (多作品独立持久化)
  useEffect(() => {
    try {
      const payload = {
        novel,
        worldSettings,
        characters,
        characterStates,
        characterRelations,
        volumes,
        foreshadowings,
        versions,
        activeChapterId,
        activeSceneIndex,
      };
      localStorage.setItem(NOVEL_DATA_PREFIX + novel.id, JSON.stringify(payload));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
      localStorage.setItem(ACTIVE_NOVEL_ID_KEY, novel.id);

      // 更新索引列表信息
      setNovelList((prev) => {
        const updatedSummary: NovelSummary = {
          id: novel.id,
          title: novel.title,
          genre: novel.genre,
          targetWordCount: novel.targetWordCount,
          currentWordCount: novel.currentWordCount,
          updatedAt: new Date().toISOString(),
        };
        const exists = prev.some((n) => n.id === novel.id);
        const nextList = exists
          ? prev.map((n) => (n.id === novel.id ? updatedSummary : n))
          : [updatedSummary, ...prev];
        localStorage.setItem(NOVELS_INDEX_KEY, JSON.stringify(nextList));
        return nextList;
      });
    } catch (e) {
      console.error('保存至本地存储失败:', e);
    }

    const timer = setTimeout(() => {
      syncNovelToBackend();
    }, 1200);
    return () => clearTimeout(timer);
  }, [novel, worldSettings, characters, characterStates, characterRelations, volumes, foreshadowings, versions, activeChapterId, activeSceneIndex]);

  const syncNovelToBackend = async (overrideBundle?: any) => {
    try {
      const bundle = overrideBundle || {
        novel,
        worldSettings,
        characters,
        characterStates,
        characterRelations,
        volumes,
        foreshadowings,
        versions,
        isActive: true,
      };
      await fetch('http://localhost:8000/api/novels/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundle),
      });
    } catch (e) {
      // 离线优雅降级
    }
  };

  const syncFromBackend = async (): Promise<boolean> => {
    try {
      // 1. 同步后端的小说列表并进行双向去重合并
      const listRes = await fetch('http://localhost:8000/api/novels');
      if (listRes.ok) {
        const backendNovels = await listRes.json();

        let localSummaries: NovelSummary[] = [];
        try {
          const rawIndex = localStorage.getItem(NOVELS_INDEX_KEY);
          if (rawIndex) localSummaries = JSON.parse(rawIndex);
        } catch (e) {}

        const normTitle = (t: string) => (t || '').trim().toLowerCase();

        // 以后端为权威主导（MCP 与服务端已存在的作品），按规范化书名唯一索引
        const titleToSummary = new Map<string, NovelSummary>();
        backendNovels.forEach((bn: any) => {
          const key = normTitle(bn.title);
          if (key) {
            titleToSummary.set(key, {
              id: bn.id,
              title: bn.title,
              genre: bn.genre || '综合题材',
              targetWordCount: bn.target_word_count || 1000000,
              currentWordCount: bn.current_word_count || 0,
              updatedAt: bn.updated_at || new Date().toISOString(),
            });
          }
        });

        // 遍历本地缓存的小说索引：去重与数据对齐
        for (const ls of localSummaries) {
          const key = normTitle(ls.title);
          if (!key) continue;

          if (!titleToSummary.has(key)) {
            // 本地特有的新作品（后端尚不存在），保留并反向同步到后端
            titleToSummary.set(key, ls);
            try {
              const localDataRaw = localStorage.getItem(NOVEL_DATA_PREFIX + ls.id);
              if (localDataRaw) {
                const localBundle = JSON.parse(localDataRaw);
                fetch('http://localhost:8000/api/novels/sync', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(localBundle),
                }).catch(() => {});
              }
            } catch (err) {}
          } else {
            // 后端已有同名作品：以后端 ID 为唯一标准。若本地 ID 不一致，迁移数据并清理冗余旧 ID
            const canonical = titleToSummary.get(key)!;
            if (canonical.id !== ls.id) {
              try {
                const oldRaw = localStorage.getItem(NOVEL_DATA_PREFIX + ls.id);
                const canonRaw = localStorage.getItem(NOVEL_DATA_PREFIX + canonical.id);
                if (oldRaw && !canonRaw) {
                  const parsed = JSON.parse(oldRaw);
                  if (parsed.novel) parsed.novel.id = canonical.id;
                  localStorage.setItem(NOVEL_DATA_PREFIX + canonical.id, JSON.stringify(parsed));
                }
                localStorage.removeItem(NOVEL_DATA_PREFIX + ls.id);
              } catch (e) {}

              const activeId = localStorage.getItem(ACTIVE_NOVEL_ID_KEY);
              if (activeId === ls.id) {
                localStorage.setItem(ACTIVE_NOVEL_ID_KEY, canonical.id);
              }
            }
          }
        }

        const mergedList = Array.from(titleToSummary.values());
        setNovelList(mergedList);
        localStorage.setItem(NOVELS_INDEX_KEY, JSON.stringify(mergedList));
      }

      // 2. 当前活跃小说数据完整加载
      const activeId = localStorage.getItem(ACTIVE_NOVEL_ID_KEY) || novel.id || 'nov-001';
      try {
        const bundleRes = await fetch(`http://localhost:8000/api/novels/${activeId}/bundle`);
        if (bundleRes.ok) {
          const bundleData = await bundleRes.json();
          const mapped = mapBackendBundleToFrontend(bundleData);

          // 检查本地 localStorage 是否有未提交的草稿
          const localRaw = localStorage.getItem(NOVEL_DATA_PREFIX + activeId);
          let localData: any = null;
          if (localRaw) {
            try {
              localData = JSON.parse(localRaw);
            } catch (e) {}
          }

          const hasLocalEdits =
            localData &&
            localData.volumes &&
            localData.volumes.length > 0 &&
            localData.volumes.some((v: Volume) =>
              v.chapters.some((c: Chapter) =>
                c.scenes.some((s: Scene) => (s.draftContent || '').length > 0)
              )
            );

          const localChaps = localData?.volumes?.[0]?.chapters || [];
          const backendChaps = mapped.volumes?.[0]?.chapters || [];

          // 若后端章节数多于本地缓存（如新增了 1-10 章），进行智能合并，保留本地已写草稿同时补全缺失章节
          if (backendChaps.length > localChaps.length || (activeId === 'nov-001' && localChaps.length < 13)) {
            const mergedChapters = backendChaps.map((bChap: Chapter) => {
              const existingLocalChap = localChaps.find((lc: Chapter) => lc.id === bChap.id);
              if (!existingLocalChap || !existingLocalChap.scenes || existingLocalChap.scenes.length === 0) {
                return bChap;
              }
              const mergedScenes = bChap.scenes.map((bScene: Scene) => {
                const localScene = existingLocalChap.scenes.find((ls: Scene) => ls.id === bScene.id);
                if (localScene && (localScene.draftContent || '').trim().length > 0) {
                  return localScene;
                }
                return bScene;
              });
              return {
                ...bChap,
                scenes: mergedScenes,
              };
            });

            const updatedVolumes = mapped.volumes.map((v: Volume, idx: number) => {
              if (idx === 0) {
                return { ...v, chapters: mergedChapters };
              }
              return v;
            });

            setNovel(mapped.novel);
            setVolumes(updatedVolumes);
            setCharacters(mapped.characters);
            setCharacterStates(mapped.characterStates);
            setWorldSettings(mapped.worldSettings);
            setForeshadowings(mapped.foreshadowings);
            if (!activeChapterId || activeChapterId === 'chap-012') {
              setActiveChapterId('chap-001');
              setActiveSceneIndex(1);
            }
          } else if (!hasLocalEdits) {
            setNovel(mapped.novel);
            setVolumes(mapped.volumes);
            setCharacters(mapped.characters);
            setCharacterStates(mapped.characterStates);
            setWorldSettings(mapped.worldSettings);
            setForeshadowings(mapped.foreshadowings);
            const allChaps = mapped.volumes.flatMap((v: Volume) => v.chapters);
            if (!allChaps.some((c: Chapter) => c.id === activeChapterId)) {
              if (allChaps.length > 0) {
                setActiveChapterId(allChaps[0].id);
                setActiveSceneIndex(1);
              }
            }
          }
          fetchPolishTechniques(activeId);
          fetchTechniqueStats(activeId);
        }
      } catch (err) {
        console.warn('同步活跃小说 bundle 失败:', err);
      }

      return true;
    } catch (e) {
      console.log('未检测到本地 8000 端口后端，继续保持纯前端模式运行');
      return false;
    }
  };

  // 页面初次加载时尝试从后端同步
  useEffect(() => {
    syncFromBackend();
  }, []);

  const updateSettings = (newSettings: Partial<UserSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...newSettings };
      ai.updateSettings(merged);
      return merged;
    });
  };

  const updateNovel = (updated: Partial<Novel>) => {
    setNovel((prev) => ({ ...prev, ...updated, updatedAt: new Date().toISOString() }));
  };

  // 世界观操作
  const addWorldSetting = (setting: Omit<WorldSetting, 'id' | 'novelId'>) => {
    const newItem: WorldSetting = {
      ...setting,
      id: `ws-${Date.now()}`,
      novelId: novel.id,
    };
    setWorldSettings((prev) => [newItem, ...prev]);
  };

  const updateWorldSetting = (id: string, updated: Partial<WorldSetting>) => {
    setWorldSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updated } : item))
    );
  };

  const deleteWorldSetting = (id: string) => {
    setWorldSettings((prev) => prev.filter((item) => item.id !== id));
  };

  // 角色操作
  const addCharacter = (char: Omit<Character, 'id' | 'novelId' | 'createdAt'>) => {
    const newChar: Character = {
      ...char,
      id: `char-${Date.now()}`,
      novelId: novel.id,
      createdAt: new Date().toISOString(),
    };
    setCharacters((prev) => [...prev, newChar]);
  };

  const updateCharacter = (id: string, updated: Partial<Character>) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updated } : c))
    );
  };

  const deleteCharacter = (id: string) => {
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  const updateCharacterState = (state: Omit<CharacterState, 'id' | 'updatedAt'>) => {
    const newState: CharacterState = {
      ...state,
      id: `cs-${Date.now()}`,
      updatedAt: new Date().toISOString(),
    };
    setCharacterStates((prev) => [newState, ...prev]);
  };

  const updateCharacterRelation = (rel: Omit<CharacterRelation, 'id' | 'novelId'>) => {
    const newRel: CharacterRelation = {
      ...rel,
      id: `rel-${Date.now()}`,
      novelId: novel.id,
    };
    setCharacterRelations((prev) => {
      const filtered = prev.filter(
        (r) => !(r.fromCharacterId === rel.fromCharacterId && r.toCharacterId === rel.toCharacterId)
      );
      return [...filtered, newRel];
    });
  };

  const deleteCharacterRelation = (id: string) => {
    setCharacterRelations((prev) => prev.filter((r) => r.id !== id));
  };

  // 大纲操作
  const addVolume = (
    title: string,
    mainConflict: string,
    targetClimax: string,
    summary?: string,
    boundaryConstraints?: string
  ) => {
    const newVol: Volume = {
      id: `vol-${Date.now()}`,
      novelId: novel.id,
      volumeIndex: volumes.length + 1,
      title,
      summary: summary || '',
      mainConflict,
      targetClimax,
      boundaryConstraints: boundaryConstraints || '',
      chapters: [],
    };
    setVolumes((prev) => [...prev, newVol]);
  };

  const updateVolume = (volumeId: string, updated: Partial<Volume>) => {
    setVolumes((prev) =>
      prev.map((v) => (v.id === volumeId ? { ...v, ...updated } : v))
    );
  };

  const addChapter = (volumeId: string, title: string, outline: string, povCharId?: string) => {
    const chapterId = `chap-${Date.now()}`;
    const newChapter: Chapter = {
      id: chapterId,
      volumeId,
      novelId: novel.id,
      chapterIndex: allChapters.length + 1,
      title,
      outline,
      povCharacterId: povCharId || characters[0]?.id,
      wordCountGoal: 3000,
      actualWordCount: 0,
      status: 'PLANNED',
      scenes: [
        {
          id: `sc-${Date.now()}-1`,
          chapterId,
          sceneIndex: 1,
          sceneGoal: '新场景起势',
          conflict: '面临未知挑战',
          turnPoint: '意外事件触发',
          outcome: '留下悬念',
          involvedCharacterIds: povCharId ? [povCharId] : [],
          location: '待定',
          draftContent: '',
        },
      ],
    };

    setVolumes((prev) =>
      prev.map((v) => (v.id === volumeId ? { ...v, chapters: [...v.chapters, newChapter] } : v))
    );
    setActiveChapterId(chapterId);
    setActiveSceneIndex(1);
  };

  const adoptPlotBranch = (
    branch: PlotBranchOption,
    targetVolumeId?: string,
    targetPovId?: string
  ): string => {
    const volId = targetVolumeId || activeChapter?.volumeId || volumes[0]?.id || 'vol-001';
    const chapterId = `chap-${Date.now()}`;
    const cleanTitle = branch.title.replace(/^第\s*\d+\s*章\s*[:：]?\s*/, '').trim();
    const povId = targetPovId || activeChapter?.povCharacterId || characters[0]?.id;
    const newIdx = allChapters.length + 1;

    const newChapter: Chapter = {
      id: chapterId,
      volumeId: volId,
      novelId: novel.id,
      chapterIndex: newIdx,
      title: cleanTitle || branch.branchLabel,
      outline: branch.summary,
      povCharacterId: povId,
      wordCountGoal: 3000,
      actualWordCount: 0,
      status: 'PLANNED',
      scenes: [
        {
          id: `sc-${Date.now()}-1`,
          chapterId,
          sceneIndex: 1,
          sceneGoal: `切入对抗：面对阻碍【${(branch.conflict || '未知挑战').slice(0, 24)}】`,
          conflict: branch.conflict || '局势紧张',
          turnPoint: '局势迅速升级',
          outcome: '逼入冲突关键点',
          involvedCharacterIds: povId ? [povId] : [],
          location: '待定',
          draftContent: '',
        },
        {
          id: `sc-${Date.now()}-2`,
          chapterId,
          sceneIndex: 2,
          sceneGoal: `核心抉择：局势恶化并引发关键转折（${(branch.turnPoint || '突发危机').slice(0, 24)}）`,
          conflict: branch.conflict || '冲突加剧',
          turnPoint: branch.turnPoint || '出人意料的抉择',
          outcome: '产生戏剧性连锁反应',
          involvedCharacterIds: povId ? [povId] : [],
          location: '待定',
          draftContent: '',
        },
        {
          id: `sc-${Date.now()}-3`,
          chapterId,
          sceneIndex: 3,
          sceneGoal: `终局定格：付出代价并确立后续因果（${(branch.outcome || '收尾悬念').slice(0, 24)}）`,
          conflict: '余波收尾与防守',
          turnPoint: '付出代价，确立后续走向',
          outcome: branch.outcome || '留下悬念',
          involvedCharacterIds: povId ? [povId] : [],
          location: '待定',
          draftContent: '',
        },
      ],
    };

    setVolumes((prev) =>
      prev.map((v) => (v.id === volId ? { ...v, chapters: [...v.chapters, newChapter] } : v))
    );

    // 若分支给出了角色状态演进代价，自动记录即时状态机演进
    if (branch.characterImpact && povId) {
      const prevState = characterStates.find((s) => s.characterId === povId);
      const newState: CharacterState = {
        id: `cs-${Date.now()}`,
        characterId: povId,
        chapterId,
        chapterIndex: newIdx,
        location: prevState?.location || '当前剧情发生地',
        combatPower: prevState?.combatPower || '维持前态',
        healthStatus: branch.branchType === 'BLOOD_BATTLE' ? 'INJURED' : (prevState?.healthStatus || 'HEALTHY'),
        statusTags: [
          branch.branchLabel.slice(0, 8),
          ...(prevState?.statusTags.slice(0, 2) || []),
        ],
        stateSummary: branch.characterImpact,
        updatedAt: new Date().toISOString(),
      };
      setCharacterStates((prev) => [newState, ...prev]);
    }

    setActiveChapterId(chapterId);
    setActiveSceneIndex(1);
    return chapterId;
  };

  const updateChapter = (chapterId: string, updated: Partial<Chapter>) => {
    setVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.map((c) => (c.id === chapterId ? { ...c, ...updated } : c)),
      }))
    );
  };

  const addScene = (chapterId: string, scene: Omit<Scene, 'id' | 'chapterId'>) => {
    const newScene: Scene = {
      ...scene,
      id: `sc-${Date.now()}`,
      chapterId,
    };
    setVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.map((c) =>
          c.id === chapterId ? { ...c, scenes: [...c.scenes, newScene] } : c
        ),
      }))
    );
  };

  const updateScene = (chapterId: string, sceneIndex: number, sceneUpdates: Partial<Scene>) => {
    setVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.map((c) => {
          if (c.id !== chapterId) return c;
          return {
            ...c,
            scenes: c.scenes.map((s) =>
              s.sceneIndex === sceneIndex ? { ...s, ...sceneUpdates } : s
            ),
          };
        }),
      }))
    );
  };

  const deleteScene = (chapterId: string, sceneIndex: number) => {
    setVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.map((c) => {
          if (c.id !== chapterId) return c;
          const filtered = c.scenes
            .filter((s) => s.sceneIndex !== sceneIndex)
            .map((s, idx) => ({ ...s, sceneIndex: idx + 1 }));
          return {
            ...c,
            scenes: filtered,
          };
        }),
      }))
    );
    if (activeSceneIndex === sceneIndex) {
      setActiveSceneIndex(Math.max(1, sceneIndex - 1));
    }
  };

  const deleteChapter = (chapterId: string) => {
    setVolumes((prev) =>
      prev.map((v) => ({
        ...v,
        chapters: v.chapters.filter((c) => c.id !== chapterId),
      }))
    );
    if (activeChapterId === chapterId) {
      const remaining = volumes.flatMap((v) => v.chapters).filter((c) => c.id !== chapterId);
      if (remaining.length > 0) {
        setActiveChapterId(remaining[0].id);
        setActiveSceneIndex(1);
      }
    }
  };

  const deleteVolume = (volumeId: string) => {
    setVolumes((prev) => prev.filter((v) => v.id !== volumeId));
  };

  const generateScenesForChapter = async (chapterId: string) => {
    const chap = volumes.flatMap((v) => v.chapters).find((c) => c.id === chapterId);
    if (!chap) return;
    const parentVol = volumes.find((v) => v.chapters.some((c) => c.id === chap.id));
    setIsAgentRunning(true);
    setCurrentAgent('DIRECTOR');
    setAgentLogs([]);
    try {
      const plannedScenes = await ai.planSceneBreakdown(
        chap,
        novel,
        characters,
        (log) => setAgentLogs((prev) => [...prev, log]),
        parentVol
      );
      const scenesWithIds: Scene[] = plannedScenes.map((p, idx) => ({
        id: `sc-${chap.id}-${idx + 1}-${Date.now()}`,
        chapterId: chap.id,
        sceneIndex: p.sceneIndex || idx + 1,
        sceneGoal: p.sceneGoal || '',
        conflict: p.conflict || '',
        turnPoint: p.turnPoint || '',
        outcome: p.outcome || '',
        involvedCharacterIds: chap.povCharacterId ? [chap.povCharacterId] : [],
        location: '本章核心场景',
        draftContent: '',
      }));
      updateChapter(chap.id, {
        scenes: scenesWithIds,
        status: 'SCENED',
      });
      setActiveChapterId(chap.id);
      setActiveSceneIndex(1);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // 伏笔操作
  const addForeshadowing = (fs: Omit<Foreshadowing, 'id' | 'novelId'>) => {
    const item: Foreshadowing = {
      ...fs,
      id: `fs-${Date.now()}`,
      novelId: novel.id,
    };
    setForeshadowings((prev) => [item, ...prev]);
  };

  const updateForeshadowingStatus = (id: string, status: Foreshadowing['status']) => {
    setForeshadowings((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status } : f))
    );
  };

  // AI 创作动作
  const ai = new AIService(settings);

  // 1. 分镜导演 Agent
  const runDirectorPlanScenes = async () => {
    if (!activeChapter) return;
    const currentVol = volumes.find((v) => v.id === activeChapter.volumeId);
    setActiveDockTab('pipeline');
    setIsAgentRunning(true);
    setCurrentAgent('DIRECTOR');
    setAgentLogs([]);
    try {
      const plannedScenes = await ai.planSceneBreakdown(
        activeChapter,
        novel,
        characters,
        (log) => setAgentLogs((prev) => [...prev, log]),
        currentVol
      );

      // 应用新的场景卡
      const scenesWithIds: Scene[] = plannedScenes.map((p, idx) => ({
        id: `sc-${activeChapter.id}-${idx + 1}`,
        chapterId: activeChapter.id,
        sceneIndex: p.sceneIndex || idx + 1,
        sceneGoal: p.sceneGoal || '',
        conflict: p.conflict || '',
        turnPoint: p.turnPoint || '',
        outcome: p.outcome || '',
        involvedCharacterIds: activeChapter.povCharacterId ? [activeChapter.povCharacterId] : [],
        location: '坠星崖古溶洞',
        draftContent: activeChapter.scenes.find((s) => s.sceneIndex === (p.sceneIndex || idx + 1))?.draftContent || '',
      }));

      updateChapter(activeChapter.id, {
        scenes: scenesWithIds,
        status: 'SCENED',
      });
    } finally {
      setIsAgentRunning(false);
    }
  };

  // 2. 执笔起草 Agent
  const getCharStateAtChap = (characterId: string, chapterIndex?: number) => {
    return getCharacterStateAtChapter(characterStates, characterId, chapterIndex ?? activeChapter?.chapterIndex);
  };

  const runDrafterWriteScene = async () => {
    if (!activeChapter || !activeScene) return;
    setActiveDockTab('pipeline');
    setIsAgentRunning(true);
    setCurrentAgent('DRAFTER');
    setAgentLogs([]);
    setPendingDraft(null);

    try {
      // 核心机制：精准提取截至当前故事线章节在场角色的即时快照状态（严格防止未来时态穿越）
      const currentChapterStates = characters
        .map((c) => getCharacterStateAtChapter(characterStates, c.id, activeChapter.chapterIndex))
        .filter((s): s is CharacterState => Boolean(s));

      const currentVol = volumes.find((v) => v.id === activeChapter.volumeId);
      const result = await ai.draftSceneContent(
        activeScene,
        activeChapter,
        novel,
        characters,
        currentChapterStates,
        worldSettings,
        foreshadowings,
        (log) => setAgentLogs((prev) => [...prev, log]),
        currentVol
      );

      setPendingDraft(result.content);

      // 自动触发一次后台稽查（以当前章节角色状态为基准）
      const issues = await ai.inspectDraftConsistency(
        result.content,
        novel,
        characters,
        currentChapterStates,
        worldSettings,
        foreshadowings
      );
      setInspectionIssues(issues);

      // 如果是场景 3，模拟检测到角色状态跃迁
      if (activeScene.sceneIndex === 3) {
        setSuggestedStateUpdate({
          characterId: 'char-001',
          chapterId: activeChapter.id,
          chapterIndex: activeChapter.chapterIndex,
          location: '坠星崖底地脉深渊',
          combatPower: '筑基后期（真元近乎枯竭）',
          healthStatus: 'CRITICAL',
          statusTags: ['左肩贯穿伤', '真元耗尽', '跌落深渊', '青铜残片异动'],
          stateSummary: '血战夜枭后动用残片强行硬撼金丹魔相，并在溶洞坍塌后与苏青瑶一同坠入地脉古遗迹。',
        });
      }
    } finally {
      setIsAgentRunning(false);
    }
  };

  // 3. 设定稽查员 Agent
  const runInspectorAudit = async () => {
    const contentToAudit = pendingDraft || editorContent;
    if (!contentToAudit) return;
    setActiveDockTab('pipeline');
    setIsAgentRunning(true);
    setCurrentAgent('INSPECTOR');
    setAgentLogs([]);

    try {
      setAgentLogs([
        {
          step: '对齐世界观与战力硬约束',
          detail: '扫描文本中是否存在战力跨级撕裂空间、瞬移等违规情节...',
          status: 'running',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      const currentChapterStates = characters
        .map((c) => getCharacterStateAtChapter(characterStates, c.id, activeChapter?.chapterIndex || 1))
        .filter((s): s is CharacterState => Boolean(s));

      const issues = await ai.inspectDraftConsistency(
        contentToAudit,
        novel,
        characters,
        currentChapterStates,
        worldSettings,
        foreshadowings
      );
      setInspectionIssues(issues);
      setAgentLogs((prev) => [
        ...prev,
        {
          step: '稽查完成',
          detail: `共发现 ${issues.length} 处合规性/人设/文风注意项`,
          status: 'done',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // 文风润色技巧沉淀库方法
  const fetchPolishTechniques = async (targetNovelId?: string) => {
    const nid = targetNovelId || novel.id;
    if (!nid) return;
    try {
      const res = await fetch(`http://localhost:8000/api/novels/${nid}/techniques`);
      if (res.ok) {
        const data = await res.json();
        setSavedPolishTechniques(data);
      }
    } catch (e) {
      console.warn('获取润色技巧失败:', e);
    }
  };

  const fetchTechniqueStats = async (targetNovelId?: string) => {
    const nid = targetNovelId || novel.id;
    if (!nid) return;
    try {
      const res = await fetch(`http://localhost:8000/api/novels/${nid}/techniques/stats`);
      if (res.ok) {
        const data = await res.json();
        setTechniqueStats(data);
      }
    } catch (e) {
      console.warn('获取润色技巧统计失败:', e);
    }
  };

  const saveTechniquesToDb = async (
    targetNovelId: string,
    techniques: PolishTechnique[],
    chapterId?: string
  ) => {
    if (!techniques || techniques.length === 0) return;
    try {
      const res = await fetch(`http://localhost:8000/api/novels/${targetNovelId}/techniques`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          novel_id: targetNovelId,
          chapter_id: chapterId,
          techniques: techniques.map((t) => ({
            id: t.id,
            novel_id: targetNovelId,
            chapter_id: chapterId || t.chapterId,
            name: t.name,
            category: t.category,
            category_label: t.categoryLabel,
            description: t.description,
            before_snippet: t.beforeSnippet || '',
            after_snippet: t.afterSnippet || '',
            applicable_scene: t.applicableScene || '',
            applied_count: t.appliedCount || 1,
          })),
        }),
      });
      if (res.ok) {
        await fetchPolishTechniques(targetNovelId);
        await fetchTechniqueStats(targetNovelId);
      }
    } catch (e) {
      console.warn('保存润色技巧至后端数据库失败:', e);
    }
  };

  const toggleReuseTechnique = (techName: string) => {
    setSelectedTechniquesForReuse((prev) =>
      prev.includes(techName) ? prev.filter((n) => n !== techName) : [...prev, techName]
    );
  };

  const clearReuseTechniques = () => {
    setSelectedTechniquesForReuse([]);
  };

  // 4. 文风润色师 Agent (支持复用沉淀技法并结构化提取技法)
  const runStylistPolish = async (customReuseTechniques?: PolishTechnique[]) => {
    const contentToPolish = pendingDraft || editorContent;
    if (!contentToPolish) return;
    setActiveDockTab('pipeline');
    setIsAgentRunning(true);
    setCurrentAgent('STYLIST');
    setAgentLogs([]);

    try {
      const validCustomTechniques = Array.isArray(customReuseTechniques)
        ? customReuseTechniques
        : undefined;
      const reuseList =
        validCustomTechniques ||
        savedPolishTechniques.filter((t) =>
          selectedTechniquesForReuse.includes(t.name)
        );

      setAgentLogs([
        {
          step: '修辞增强与文学技法提炼',
          detail:
            reuseList.length > 0
              ? `已指定复用 ${reuseList.map((t) => t.name).join('、')} 等 ${reuseList.length} 项既有文风技法，提炼高光改写...`
              : '优化字句节奏，替换通俗虚词，提炼高光文学技法与微动作...',
          status: 'running',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      const result = await ai.polishProse(contentToPolish, novel.styleGuide, reuseList);
      setPendingDraft(result.polishedText);
      setPendingPolishResult(result);
      setAgentLogs((prev) => [
        ...prev,
        {
          step: '润色完成',
          detail: `已提炼出 ${result.techniques.length} 项文学技法，生成更具张力与文学质感的润色候选正文`,
          status: 'done',
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsAgentRunning(false);
    }
  };

  // 接受草稿并合入正文（同时将勾选的文风润色技巧沉淀写入数据库）
  const acceptPendingDraft = async (selectedTechniquesToSave?: PolishTechnique[]) => {
    if (!pendingDraft || !activeChapter || !activeScene) return;

    // 1. 更新当前场景正文
    updateScene(activeChapter.id, activeScene.sceneIndex, {
      draftContent: pendingDraft,
    });
    setEditorContent(pendingDraft);

    // 2. 创建版本快照
    const newVersion: ManuscriptVersion = {
      id: `ver-${Date.now()}`,
      chapterId: activeChapter.id,
      versionNumber: versions.length + 1,
      fullText: pendingDraft,
      createdBy: `Agent:${currentAgent}`,
      changeSummary: `作者采纳了 ${currentAgent} 生成的正文候选`,
      inspectionScore: inspectionIssues.some((i) => i.severity === 'CRITICAL') ? 70 : 95,
      createdAt: new Date().toISOString(),
    };
    setVersions((prev) => [newVersion, ...prev]);

    // 3. 更新全书字数统计
    updateNovel({
      currentWordCount: novel.currentWordCount + pendingDraft.length,
    });

    // 4. 将选中的润色技巧沉淀写入数据库
    const techToSave =
      selectedTechniquesToSave !== undefined
        ? selectedTechniquesToSave
        : pendingPolishResult?.techniques || [];
    if (techToSave.length > 0) {
      await saveTechniquesToDb(novel.id, techToSave, activeChapter.id);
    }

    setPendingDraft(null);
    setPendingPolishResult(null);
  };

  const dismissPendingDraft = () => {
    setPendingDraft(null);
  };

  const applySuggestedStateUpdate = () => {
    if (suggestedStateUpdate && suggestedStateUpdate.characterId) {
      updateCharacterState(suggestedStateUpdate as any);
      setSuggestedStateUpdate(null);
    }
  };

  // 重置回预置样例数据
  const resetToSampleData = () => {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    localStorage.removeItem(NOVEL_DATA_PREFIX + sampleNovel.id);
    setNovel(sampleNovel);
    setWorldSettings(sampleWorldSettings);
    setCharacters(sampleCharacters);
    setCharacterStates(sampleCharacterStates);
    setCharacterRelations(sampleRelations);
    setVolumes(sampleVolumes);
    setForeshadowings(sampleForeshadowings);
    setVersions(sampleVersions);
    setActiveChapterId('chap-012');
    setActiveSceneIndex(1);
    setPendingDraft(null);
    setInspectionIssues([]);
  };

  // 导出与导入
  const exportProjectJson = () => {
    return JSON.stringify(
      {
        novel,
        worldSettings,
        characters,
        characterStates,
        characterRelations,
        volumes,
        foreshadowings,
        versions,
      },
      null,
      2
    );
  };

  const importProjectJson = (jsonStr: string): boolean => {
    try {
      const data = JSON.parse(jsonStr);
      if (data.novel && data.volumes) {
        setNovel(data.novel);
        setWorldSettings(data.worldSettings || []);
        setCharacters(data.characters || []);
        setCharacterStates(data.characterStates || []);
        setCharacterRelations(data.characterRelations || []);
        setVolumes(data.volumes || []);
        setForeshadowings(data.foreshadowings || []);
        setVersions(data.versions || []);
        return true;
      }
    } catch (e) {
      console.error('导入失败:', e);
    }
    return false;
  };

  // 多作品切换与创建
  const switchNovel = async (targetId: string): Promise<boolean> => {
    if (!targetId) return false;

    // 1. 先将当前作品数据保存到 LocalStorage 与 后端
    try {
      const currentPayload = {
        novel,
        worldSettings,
        characters,
        characterStates,
        characterRelations,
        volumes,
        foreshadowings,
        versions,
        activeChapterId,
        activeSceneIndex,
        isActive: false,
      };
      localStorage.setItem(NOVEL_DATA_PREFIX + novel.id, JSON.stringify(currentPayload));
      syncNovelToBackend(currentPayload);
    } catch (e) {
      console.error('保存当前小说失败:', e);
    }

    if (targetId === novel.id) {
      return true;
    }

    // 2. 尝试从本地 LocalStorage 读取目标作品数据
    let targetData: any = null;
    try {
      const raw = localStorage.getItem(NOVEL_DATA_PREFIX + targetId);
      if (raw) {
        targetData = JSON.parse(raw);
      }
    } catch (e) {
      console.error('从 localStorage 读取目标作品失败:', e);
    }

    // 3. 若本地无数据或大纲为空，从后端拉取完整 bundle
    if (!targetData || !targetData.volumes || targetData.volumes.length === 0) {
      try {
        const res = await fetch(`http://localhost:8000/api/novels/${targetId}/bundle`);
        if (res.ok) {
          const bundle = await res.json();
          targetData = mapBackendBundleToFrontend(bundle);
        }
      } catch (err) {
        console.warn('从后端拉取小说 bundle 失败:', err);
      }
    }

    // 4. 若依然无数据，使用索引列表生成基础骨架
    if (!targetData) {
      const summary = novelList.find((n) => n.id === targetId);
      if (summary) {
        targetData = mapBackendBundleToFrontend({
          novel: {
            id: summary.id,
            title: summary.title,
            genre: summary.genre,
            target_word_count: summary.targetWordCount,
            current_word_count: summary.currentWordCount,
          },
          volumes: [],
        });
      }
    }

    if (!targetData) {
      console.error(`无法找到作品 ${targetId} 的数据`);
      return false;
    }

    // 5. 确保至少有一卷一章一幕，避免创作界面空指针
    let finalVolumes: Volume[] = targetData.volumes || [];
    if (finalVolumes.length === 0 || !finalVolumes[0].chapters || finalVolumes[0].chapters.length === 0) {
      const volId = `vol-${Date.now()}`;
      const chapId = `chap-${Date.now()}`;
      const scId = `sc-${Date.now()}-1`;
      finalVolumes = [
        {
          id: volId,
          novelId: targetData.novel?.id || targetId,
          volumeIndex: 1,
          title: '第一卷',
          mainConflict: '',
          targetClimax: '',
          chapters: [
            {
              id: chapId,
              volumeId: volId,
              novelId: targetData.novel?.id || targetId,
              chapterIndex: 1,
              title: '第一章',
              outline: '',
              povCharacterId: '',
              wordCountGoal: 3000,
              actualWordCount: 0,
              status: 'PLANNED',
              scenes: [
                {
                  id: scId,
                  chapterId: chapId,
                  sceneIndex: 1,
                  sceneGoal: '起笔开篇',
                  conflict: '',
                  turnPoint: '',
                  outcome: '',
                  involvedCharacterIds: [],
                  location: '',
                  draftContent: '',
                  agentNotes: '',
                },
              ],
            },
          ],
        },
      ];
    }

    const allChaps = finalVolumes.flatMap((v) => v.chapters);
    const targetChap = allChaps.find((c) => c.id === targetData.activeChapterId) || allChaps[0];
    const validChapId = targetChap?.id || '';
    const targetScene = targetChap?.scenes?.find((s) => s.sceneIndex === targetData.activeSceneIndex) || targetChap?.scenes?.[0];
    const validSceneIndex = targetScene?.sceneIndex || 1;
    const initialDraft = targetScene?.draftContent || '';

    // 6. 原子化更新 React 状态
    setNovel(targetData.novel);
    setWorldSettings(targetData.worldSettings || []);
    setCharacters(targetData.characters || []);
    setCharacterStates(targetData.characterStates || []);
    setCharacterRelations(targetData.characterRelations || []);
    setVolumes(finalVolumes);
    setForeshadowings(targetData.foreshadowings || []);
    setVersions(targetData.versions || []);
    setActiveChapterId(validChapId);
    setActiveSceneIndex(validSceneIndex);
    setEditorContent(initialDraft);
    setPendingDraft(null);
    setInspectionIssues([]);

    // 7. 持久化存储与通知后端
    const fullSavedPayload = {
      novel: targetData.novel,
      worldSettings: targetData.worldSettings || [],
      characters: targetData.characters || [],
      characterStates: targetData.characterStates || [],
      characterRelations: targetData.characterRelations || [],
      volumes: finalVolumes,
      foreshadowings: targetData.foreshadowings || [],
      versions: targetData.versions || [],
      activeChapterId: validChapId,
      activeSceneIndex: validSceneIndex,
    };
    try {
      localStorage.setItem(NOVEL_DATA_PREFIX + targetId, JSON.stringify(fullSavedPayload));
      localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(fullSavedPayload));
      localStorage.setItem(ACTIVE_NOVEL_ID_KEY, targetId);
    } catch (e) {
      console.error('更新本地存储失败:', e);
    }

    fetch(`http://localhost:8000/api/novels/${targetId}/active`, { method: 'POST' }).catch(() => {});
    return true;
  };

  const createBlankNovel = async (
    title: string,
    genre: string,
    targetWordCount: number = 1000000
  ): Promise<string> => {
    const trimmedTitle = title.trim() || '未命名新作品';
    const norm = trimmedTitle.toLowerCase();

    // 检查是否已存在同名作品，避免重复创建
    const existing = novelList.find((n) => (n.title || '').trim().toLowerCase() === norm);
    if (existing) {
      await switchNovel(existing.id);
      return existing.id;
    }

    const newId = `nov-${Date.now()}`;
    const firstVolId = `vol-${Date.now()}`;
    const firstChapId = `chap-${Date.now()}`;
    const firstSceneId = `sc-${Date.now()}-1`;
    const timestamp = new Date().toISOString();

    const newNovel: Novel = {
      id: newId,
      title: trimmedTitle,
      subtitle: '',
      genre: genre.trim() || '综合题材',
      targetWordCount,
      currentWordCount: 0,
      defaultPov: '主角视角',
      styleGuide: {
        tone: '节奏紧凑、戏剧性强',
        pacing: '张弛有度',
        descriptionDensity: '适中',
        forbiddenPhrases: ['恐怖如斯', '倒吸一口凉气'],
      },
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    const newVolumes: Volume[] = [
      {
        id: firstVolId,
        novelId: newId,
        volumeIndex: 1,
        title: '第一卷：破局而生',
        mainConflict: '打破死局，确立核心求存目标',
        targetClimax: '首战告捷，崭露头角',
        chapters: [
          {
            id: firstChapId,
            volumeId: firstVolId,
            novelId: newId,
            chapterIndex: 1,
            title: '第一章：命运转折',
            outline: '主角身陷突如其来的危机，被迫做出改变一生命运的抉择。',
            wordCountGoal: 3000,
            actualWordCount: 0,
            status: 'PLANNED',
            scenes: [
              {
                id: firstSceneId,
                chapterId: firstChapId,
                sceneIndex: 1,
                sceneGoal: '破局生存',
                conflict: '遭遇重大变故与外部强敌压迫',
                turnPoint: '意外发现打破死局的唯一契机',
                outcome: '踏上全新的未知征程',
                involvedCharacterIds: [],
                location: '初始场景',
                draftContent: '',
              },
            ],
          },
        ],
      },
    ];

    // 保存旧作品
    try {
      localStorage.setItem(
        NOVEL_DATA_PREFIX + novel.id,
        JSON.stringify({
          novel,
          worldSettings,
          characters,
          characterStates,
          characterRelations,
          volumes,
          foreshadowings,
          versions,
          activeChapterId,
          activeSceneIndex,
        })
      );
    } catch (e) {
      console.error(e);
    }

    // 切换至新作品
    setNovel(newNovel);
    setWorldSettings([]);
    setCharacters([]);
    setCharacterStates([]);
    setCharacterRelations([]);
    setVolumes(newVolumes);
    setForeshadowings([]);
    setVersions([]);
    setActiveChapterId(firstChapId);
    setActiveSceneIndex(1);
    setEditorContent('');
    setPendingDraft(null);

    // 更新索引（按书名过滤，杜绝重名卡片）
    const newSummary: NovelSummary = {
      id: newId,
      title: newNovel.title,
      genre: newNovel.genre,
      targetWordCount: newNovel.targetWordCount,
      currentWordCount: 0,
      updatedAt: timestamp,
    };
    setNovelList((prev) => [newSummary, ...prev.filter((n) => (n.title || '').trim().toLowerCase() !== norm)]);
    localStorage.setItem(ACTIVE_NOVEL_ID_KEY, newId);

    // 立即同步到后端，使 MCP 可即刻感知
    syncNovelToBackend({
      novel: newNovel,
      worldSettings: [],
      characters: [],
      characterStates: [],
      characterRelations: [],
      volumes: newVolumes,
      foreshadowings: [],
      versions: [],
      activeChapterId: firstChapId,
      activeSceneIndex: 1,
      isActive: true,
    });

    return newId;
  };

  const createNovelFromFramework = (framework: NovelFrameworkData): string => {
    const novelId = `nov-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const newNovel: Novel = {
      id: novelId,
      title: framework.title,
      subtitle: framework.subtitle || '',
      genre: framework.genre,
      targetWordCount: framework.targetWordCount,
      currentWordCount: 0,
      defaultPov: framework.characters[0]?.character.name ? `${framework.characters[0].character.name}视角` : '主角视角',
      styleGuide: framework.styleGuide,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    // 角色与状态
    const newCharacters: Character[] = [];
    const newStates: CharacterState[] = [];
    framework.characters.forEach((cItem, idx) => {
      const charId = `char-${novelId}-${idx + 1}`;
      newCharacters.push({
        ...cItem.character,
        id: charId,
        novelId,
        createdAt: timestamp,
      });
      newStates.push({
        ...cItem.initialState,
        id: `cs-${novelId}-${idx + 1}`,
        characterId: charId,
        updatedAt: timestamp,
      });
    });

    // 世界观设定
    const newWorldSettings: WorldSetting[] = framework.worldSettings.map((w, idx) => ({
      ...w,
      id: `ws-${novelId}-${idx + 1}`,
      novelId,
    }));

    // 卷、章、分镜
    const newVolumes: Volume[] = framework.volumes.map((vItem, vIdx) => {
      const volId = `vol-${novelId}-${vIdx + 1}`;
      return {
        ...vItem.volume,
        id: volId,
        novelId,
        chapters: vItem.chapters.map((cItem, cIdx) => {
          const chapId = `chap-${novelId}-${vIdx + 1}-${cIdx + 1}`;
          return {
            ...cItem.chapter,
            id: chapId,
            volumeId: volId,
            novelId,
            povCharacterId: newCharacters[0]?.id,
            scenes: cItem.scenes.map((sItem, sIdx) => ({
              ...sItem,
              id: `sc-${chapId}-${sIdx + 1}`,
              chapterId: chapId,
              involvedCharacterIds: newCharacters[0]?.id ? [newCharacters[0].id] : [],
            })),
          };
        }),
      };
    });

    // 伏笔
    const newForeshadowings: Foreshadowing[] = framework.foreshadowings.map((fItem, fIdx) => ({
      ...fItem,
      id: `fs-${novelId}-${fIdx + 1}`,
      novelId,
    }));

    // 保存当前旧作品
    try {
      localStorage.setItem(
        NOVEL_DATA_PREFIX + novel.id,
        JSON.stringify({
          novel,
          worldSettings,
          characters,
          characterStates,
          characterRelations,
          volumes,
          foreshadowings,
          versions,
          activeChapterId,
          activeSceneIndex,
        })
      );
    } catch (e) {
      console.error(e);
    }

    const firstChapId = newVolumes[0]?.chapters[0]?.id || '';

    // 切换至新小说
    setNovel(newNovel);
    setWorldSettings(newWorldSettings);
    setCharacters(newCharacters);
    setCharacterStates(newStates);
    setCharacterRelations([]);
    setVolumes(newVolumes);
    setForeshadowings(newForeshadowings);
    setVersions([]);
    setActiveChapterId(firstChapId);
    setActiveSceneIndex(1);
    setEditorContent('');
    setPendingDraft(null);

    // 更新作品列表索引
    const newSummary: NovelSummary = {
      id: novelId,
      title: newNovel.title,
      genre: newNovel.genre,
      targetWordCount: newNovel.targetWordCount,
      currentWordCount: 0,
      updatedAt: timestamp,
    };
    setNovelList((prev) => [newSummary, ...prev]);
    localStorage.setItem(ACTIVE_NOVEL_ID_KEY, novelId);

    // 立即同步完整新作品包到后端
    syncNovelToBackend({
      novel: newNovel,
      worldSettings: newWorldSettings,
      characters: newCharacters,
      characterStates: newStates,
      characterRelations: [],
      volumes: newVolumes,
      foreshadowings: newForeshadowings,
      versions: [],
      activeChapterId: firstChapId,
      activeSceneIndex: 1,
      isActive: true,
    });

    return novelId;
  };

  const deleteNovel = (novelId: string) => {
    if (novelList.length <= 1) {
      alert('至少需要保留一部作品。');
      return;
    }
    const updatedList = novelList.filter((n) => n.id !== novelId);
    setNovelList(updatedList);
    localStorage.setItem(NOVELS_INDEX_KEY, JSON.stringify(updatedList));
    localStorage.removeItem(NOVEL_DATA_PREFIX + novelId);
    fetch(`http://localhost:8000/api/novels/${novelId}`, { method: 'DELETE' }).catch(() => {});

    if (novelId === novel.id) {
      const nextNovel = updatedList[0];
      if (nextNovel) {
        switchNovel(nextNovel.id);
      }
    }
  };

  // 创世向导对话与全套大纲框架生成
  const chatBrainstorm = async (
    messages: { role: 'user' | 'assistant'; content: string }[],
    genreHint?: string
  ) => {
    return ai.chatBrainstorm(messages, genreHint);
  };

  const chatSceneDiscussion = async (
    messages: { role: 'user' | 'assistant'; content: string }[]
  ) => {
    return ai.chatSceneDiscussion(messages, {
      novel,
      activeChapter,
      activeScene,
      characters,
      worldSettings,
      editorContent,
    });
  };

  const generateNovelFramework = async (
    seedIdea: string,
    genre?: string,
    onProgress?: (log: AgentExecutionLog) => void
  ) => {
    return ai.generateNovelFramework(seedIdea, genre, onProgress);
  };

  return (
    <NovelContext.Provider
      value={{
        novel,
        worldSettings,
        characters,
        characterStates,
        characterRelations,
        volumes,
        foreshadowings,
        versions,
        activeChapterId,
        activeSceneIndex,
        activeChapter,
        activeScene,
        editorContent,
        setEditorContent,
        pendingDraft,
        setPendingDraft,
        currentAgent,
        setCurrentAgent,
        activeDockTab,
        setActiveDockTab,
        isAgentRunning,
        agentLogs,
        inspectionIssues,
        suggestedStateUpdate,
        settings,
        updateSettings,
        isSettingsModalOpen,
        openSettingsModal,
        closeSettingsModal,
        setActiveChapterId,
        setActiveSceneIndex,
        updateNovel,
        addWorldSetting,
        updateWorldSetting,
        deleteWorldSetting,
        addCharacter,
        updateCharacter,
        deleteCharacter,
        updateCharacterState,
        getCharacterStateAtChapter: getCharStateAtChap,
        updateCharacterRelation,
        deleteCharacterRelation,
        addVolume,
        updateVolume,
        deleteVolume,
        addChapter,
        updateChapter,
        deleteChapter,
        addScene,
        updateScene,
        deleteScene,
        generateScenesForChapter,
        adoptPlotBranch,
        addForeshadowing,
        updateForeshadowingStatus,
        runDirectorPlanScenes,
        runDrafterWriteScene,
        runInspectorAudit,
        runStylistPolish,
        acceptPendingDraft,
        dismissPendingDraft,
        applySuggestedStateUpdate,
        chatBrainstorm,
        chatSceneDiscussion,
        generateNovelFramework,
        pendingPolishResult,
        savedPolishTechniques,
        techniqueStats,
        selectedTechniquesForReuse,
        isTechniqueModalOpen,
        setIsTechniqueModalOpen,
        toggleReuseTechnique,
        clearReuseTechniques,
        fetchPolishTechniques,
        fetchTechniqueStats,
        saveTechniquesToDb,
        novelList,
        switchNovel,
        createBlankNovel,
        createNovelFromFramework,
        deleteNovel,
        resetToSampleData,
        exportProjectJson,
        importProjectJson,
        syncFromBackend,
      }}
    >
      {children}
    </NovelContext.Provider>
  );
};

export const useNovel = () => {
  const context = useContext(NovelContext);
  if (!context) {
    throw new Error('useNovel must be used within a NovelProvider');
  }
  return context;
};
