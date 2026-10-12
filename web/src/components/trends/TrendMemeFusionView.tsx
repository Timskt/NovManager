import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Sparkles,
  Newspaper,
  MessageSquareQuote,
  Globe,
  ShieldCheck,
  Sliders,
  Plus,
  Search,
  Check,
  Copy,
  ArrowUpRight,
  Cpu,
  Layers,
  Zap,
  RefreshCw,
  BookOpen,
  FileText,
  MessageCircle,
  GitBranch,
} from 'lucide-react';
import {
  TrendRadarItem,
  TrendFusionResponse,
  DEFAULT_TREND_RADAR_ITEMS,
  fetchRealtimeTrendsFeed,
  parseCustomTrendItem,
  fuseTrendsIntoCreation,
} from '../../lib/api';
import { useNovel } from '../../context/NovelContext';
import type { NavTab } from '../Header';

interface TrendSpecItem {
  id: string;
  code: string;
  group: 'FEATURE' | 'ARCHITECTURE';
  category: string;
  title: string;
  summary: string;
  metric: string;
  presetWorldview?: 'XIANXIA' | 'URBAN' | 'CTHULHU' | 'CYBERPUNK' | 'HISTORICAL';
  presetMode?: 'NOVEL_SCENE' | 'STANDALONE_ARTICLE' | 'DIALOGUE_BANTER' | 'PLOT_OUTLINE';
}

const TREND_FEATURES_20: TrendSpecItem[] = [
  {
    id: 'tf-01',
    code: 'TF01',
    group: 'FEATURE',
    category: '全网感知',
    title: '多平台实时热梗雷达 (Multi-Platform Meme Radar)',
    summary: '聚合抖音、B站、微博、小红书、知乎及科技财经热榜，实时捕捉高传播度流行语与情绪共振点。',
    metric: '6大平台实时聚合',
  },
  {
    id: 'tf-02',
    code: 'TF02',
    group: 'FEATURE',
    category: '热点拆解',
    title: '热点新闻叙事三元组拆解器 (Breaking News Narrative Deconstructor)',
    summary: '将复杂的社会/科技热点新闻自动拆解为“利益冲突、荒诞反差、人性痛点”三大叙事钩子。',
    metric: '3维冲突自动提炼',
    presetMode: 'PLOT_OUTLINE',
  },
  {
    id: 'tf-03',
    code: 'TF03',
    group: 'FEATURE',
    category: '跨维转译',
    title: '跨世界观热梗本土化转译引擎 (Worldview Meme Localization)',
    summary: '将现代网络热梗无缝翻译为修仙宗门、诡秘克苏鲁、赛博朋克、古风朝堂等世界观原教旨表达。',
    metric: '5大世界观零违和',
    presetWorldview: 'XIANXIA',
  },
  {
    id: 'tf-04',
    code: 'TF04',
    group: 'FEATURE',
    category: '自定采集',
    title: '自定义实时新闻/新梗一键解析入库 (Custom Live Meme Harvester)',
    summary: '支持直接粘贴刚看到的网页新闻标题、社交评论或新梗词条，自动提取笑点结构与5维本土化译本。',
    metric: '< 200ms 实时解析',
  },
  {
    id: 'tf-05',
    code: 'TF05',
    group: 'FEATURE',
    category: '防违和护栏',
    title: '时代语境防出戏语义护栏 (Anachronism Semantic Guard)',
    summary: '在古风/仙侠/西幻场景中自动拦截生硬的现代缩写与网络词汇，替换为符合时代考据的隐喻。',
    metric: '0 OOC / 0 时代穿帮',
    presetWorldview: 'HISTORICAL',
  },
  {
    id: 'tf-06',
    code: 'TF06',
    group: 'FEATURE',
    category: '双模创制',
    title: '独立热点爆款文章/时评生成器 (Standalone Trending Article Generator)',
    summary: '不仅能融入长篇小说，还可围绕实时热点一键生成结构完整的公众号深度时评、脑洞故事或杂文。',
    metric: '独立成篇 + 小说嵌入',
    presetMode: 'STANDALONE_ARTICLE',
  },
  {
    id: 'tf-07',
    code: 'TF07',
    group: 'FEATURE',
    category: '人设适配',
    title: '角色人设玩梗契合度匹配 (Character Persona Meme Matcher)',
    summary: '根据角色的性格底色（高冷剑仙、市井混混、腹黑幕后）决定由谁说出热梗、以何种语气表达。',
    metric: '贴合角色声纹',
    presetMode: 'DIALOGUE_BANTER',
  },
  {
    id: 'tf-08',
    code: 'TF08',
    group: 'FEATURE',
    category: '浓度控制',
    title: '四档含梗量与幽默浓度滑块 (4-Gear Meme Density Controller)',
    summary: '支持从 1档（隐喻暗合）、2档（自然会心）、3档（密集网感）到 4档（荒诞狂欢）精准调节。',
    metric: '1~4档精准控温',
  },
  {
    id: 'tf-09',
    code: 'TF09',
    group: 'FEATURE',
    category: '互动预演',
    title: '读者“本章说”弹幕高潮预演 (Simulated Reader Danmaku Preview)',
    summary: '融合热梗后实时模拟起点/番茄读者在该段落触发的“本章说”吐槽弹幕，提前验证互动爽感。',
    metric: '高仿真弹幕反馈',
  },
  {
    id: 'tf-10',
    code: 'TF10',
    group: 'FEATURE',
    category: '时效评估',
    title: '热梗生命周期与半衰期预警 (Meme Half-Life Evaluator)',
    summary: '区分“昙花一现热搜”与“经典常青梗”，防止作品在连载数月后因过时热梗产生阅读尴尬。',
    metric: '半衰期智能标注',
  },
  {
    id: 'tf-11',
    code: 'TF11',
    group: 'FEATURE',
    category: '交锋对话',
    title: '热梗交锋对白与相声式捧逗生成 (Meme Banter Dialogue Synthesizer)',
    summary: '自动生成双人或多人围绕实时热梗展开的拉扯对白，内置铺垫、误解、反转与精准吐槽。',
    metric: '捧逗节奏拉满',
    presetMode: 'DIALOGUE_BANTER',
  },
  {
    id: 'tf-12',
    code: 'TF12',
    group: 'FEATURE',
    category: '隐喻映射',
    title: '现实荒诞新闻架空投影仪 (Allegorical News Projector)',
    summary: '将现实中的草台班子、职场内卷、资本泡沫映射为修仙界宗门考核、赛博公司法案或朝堂党争。',
    metric: '讽刺张力倍增',
    presetMode: 'PLOT_OUTLINE',
  },
  {
    id: 'tf-13',
    code: 'TF13',
    group: 'FEATURE',
    category: '金句提炼',
    title: '章节尾声热梗回旋镖金句器 (Chapter-End Punchline Finisher)',
    summary: '在章节末尾利用热梗结构制造“回旋镖”式反转断章，大幅提升读者追读率与评论转发欲。',
    metric: '黄金断章钩子',
  },
  {
    id: 'tf-14',
    code: 'TF14',
    group: 'FEATURE',
    category: '黑话词典',
    title: '圈层亚文化黑话双向转译词典 (Subculture Slang Lexicon)',
    summary: '打通二次元、电竞、金融量化、互联网大厂黑话与玄幻/科幻设定词库的双向映射。',
    metric: '跨圈层黑话对齐',
    presetWorldview: 'CYBERPUNK',
  },
  {
    id: 'tf-15',
    code: 'TF15',
    group: 'FEATURE',
    category: '冷幽默',
    title: '诡秘/克苏鲁冷面荒诞融合器 (Cosmic Horror Deadpan Blender)',
    summary: '专为严肃暗黑或克苏鲁题材设计，用最严谨的神秘学仪式描述最荒诞的现代精神状态。',
    metric: '严肃皮囊 + 荒诞内核',
    presetWorldview: 'CTHULHU',
  },
  {
    id: 'tf-16',
    code: 'TF16',
    group: 'FEATURE',
    category: '多梗串联',
    title: '多热点化学反应组合矩阵 (Multi-Trend Synergy Combinator)',
    summary: '支持同时勾选“1条社会热点新闻 + 2个流行热梗”，自动寻找叙事交集并编织为连贯剧情。',
    metric: '多源热点交叉缝合',
  },
  {
    id: 'tf-17',
    code: 'TF17',
    group: 'FEATURE',
    category: '标题吸睛',
    title: '网感章节标题与卷首语铸造 (Viral Chapter Title Forger)',
    summary: '基于当前选中的实时热梗，生成兼具古典意境与现代网感反差的章节标题与导语。',
    metric: '点击率优化标题',
  },
  {
    id: 'tf-18',
    code: 'TF18',
    group: 'FEATURE',
    category: '内媒模拟',
    title: '异界报刊/灵网热搜公告栏生成 (In-Universe Media Bulletin)',
    summary: '将现实热点改写为小说世界内的《太虚日报》、玉简头条、赛博霓虹广播或酒楼说书段子。',
    metric: '沉浸式侧面描写',
  },
  {
    id: 'tf-19',
    code: 'TF19',
    group: 'FEATURE',
    category: '精准合入',
    title: 'Codex 级无损手术刀段落合入 (Surgical Diff Trend Injection)',
    summary: '生成的玩梗段落或热点隐喻提供红绿 Diff 预览，一键无缝插入或替换当前正在撰写的章节正文。',
    metric: '一键合入当前章节',
    presetMode: 'NOVEL_SCENE',
  },
  {
    id: 'tf-20',
    code: 'TF20',
    group: 'FEATURE',
    category: '副驾联动',
    title: '右侧 AI 副驾 `@热梗/热点` 即时挂载 (Copilot Live Trend Mount)',
    summary: '在沉浸式创作台中随时点击 `@热梗` 胶囊，将全网最新热点作为上下文直接注入多模态对话。',
    metric: 'Studio 零跳转联动',
  },
];

const TREND_ARCHITECTURES_20: TrendSpecItem[] = [
  {
    id: 'ta-01',
    code: 'TA01',
    group: 'ARCHITECTURE',
    category: '流式采集',
    title: '多源热榜异步流式聚合管道 (Multi-Source Async Trend Ingestion Pipeline)',
    summary: '基于 Rust Tokio 异步任务池并发拉取与归一化多平台热榜结构，提供毫秒级本地快照响应。',
    metric: 'Rust Async Pipeline',
  },
  {
    id: 'ta-02',
    code: 'TA02',
    group: 'ARCHITECTURE',
    category: '知识图谱',
    title: '热梗语义本体与结构图谱 (Meme Ontology & Punchline Graph)',
    summary: '将每条热梗解构为「触发语境 → 预期违背 → 情绪落点 → 变体句式」四元结构化节点。',
    metric: '4元组语义表征',
  },
  {
    id: 'ta-03',
    code: 'TA03',
    group: 'ARCHITECTURE',
    category: '跨域映射',
    title: '世界观词法同态映射张量 (Worldview Lexical Homomorphism Tensor)',
    summary: '建立现代概念（如 KPI、算力、直播带货）到修仙/克苏鲁/古风概念的确定性词汇映射矩阵。',
    metric: '5xN 概念映射层',
  },
  {
    id: 'ta-04',
    code: 'TA04',
    group: 'ARCHITECTURE',
    category: '时间衰减',
    title: '热度时间衰减与常青度评分算子 (Temporal Decay & Evergreen Scorer)',
    summary: '引入指数时间衰减函数结合复现频次，实时计算每条热点的创作保鲜期与跨周期生命力。',
    metric: 'Time-Decay 权重模型',
  },
  {
    id: 'ta-05',
    code: 'TA05',
    group: 'ARCHITECTURE',
    category: '违和检测',
    title: '零时代违和语法树重写器 (Zero-Anachronism AST Rewriter)',
    summary: '在生成阶段对现代网络缩写、外来词进行词法扫描，自动替换为符合目标世界观的古典或科幻等价词。',
    metric: 'AST 词法零穿帮',
  },
  {
    id: 'ta-06',
    code: 'TA06',
    group: 'ARCHITECTURE',
    category: '事件提取',
    title: '新闻事件三元组冲突抽取内核 (News Conflict Triplet Extractor)',
    summary: '从非结构化新闻长文中快速剥离冗余报道，仅保留核心矛盾主体、利益博弈与戏剧性转折。',
    metric: '高信噪比摘要',
  },
  {
    id: 'ta-07',
    code: 'TA07',
    group: 'ARCHITECTURE',
    category: '人设约束',
    title: '角色声纹与幽默阈值约束器 (Character Voice Humor Gatekeeper)',
    summary: '结合角色档案中的智商、阶层与说话习惯，动态约束玩梗方式（冷幽默、直球吐槽或阴阳怪气）。',
    metric: 'Persona-Aware 生成',
  },
  {
    id: 'ta-08',
    code: 'TA08',
    group: 'ARCHITECTURE',
    category: '预算路由',
    title: '热点上下文 Token 弹性压缩器 (Trend Context Token Compactor)',
    summary: '当同时勾选多条热点与长篇正文时，自动将背景新闻压缩为高密度叙事指令，节省 75% Token。',
    metric: '75% 提示词压缩率',
  },
  {
    id: 'ta-09',
    code: 'TA09',
    group: 'ARCHITECTURE',
    category: '多巴胺曲线',
    title: '章节情绪张力与笑点节拍对齐器 (Tension-Humor Beat Synchronizer)',
    summary: '分析当前章节的压抑度与爽点节奏，在高压战斗后或铺垫期精准插入热梗调节阅读呼吸感。',
    metric: '张力曲线自适应',
  },
  {
    id: 'ta-10',
    code: 'TA10',
    group: 'ARCHITECTURE',
    category: '双栈输出',
    title: '小说内嵌与独立成篇双轨生成引擎 (Dual-Track Synthesis Engine)',
    summary: '同一套热点数据源同时支持「长篇小说局部缝合」与「自媒体爆款文章独立成篇」两套生成管线。',
    metric: 'Dual-Pipeline 架构',
  },
  {
    id: 'ta-11',
    code: 'TA11',
    group: 'ARCHITECTURE',
    category: '弹幕仿真',
    title: '多读者群像弹幕仿真模拟器 (Reader Cohort Danmaku Simulator)',
    summary: '内置“考据党、乐子人、催更党、玩梗狂魔”四类读者 Agent，对生成段落进行并发弹幕压力测试。',
    metric: '4类读者并发预演',
  },
  {
    id: 'ta-12',
    code: 'TA12',
    group: 'ARCHITECTURE',
    category: '合规过滤',
    title: '敏感时政与版权风险脱敏网关 (Compliance & Desensitization Gateway)',
    summary: '自动将真实人名、具体品牌与敏感争议事件转化为架空隐喻符号，保障作品合规安全连载。',
    metric: '100% 架空脱敏保护',
  },
  {
    id: 'ta-13',
    code: 'TA13',
    group: 'ARCHITECTURE',
    category: '版本回溯',
    title: '玩梗注入 Git 快照与一键回滚 (Meme Injection Git Snapshot Hook)',
    summary: '每次将热梗段落合入正文前自动触发轻量级版本锚点，支持随时对比原稿与玩梗版差异。',
    metric: '无损版本可逆',
  },
  {
    id: 'ta-14',
    code: 'TA14',
    group: 'ARCHITECTURE',
    category: '向量检索',
    title: '剧情情境与热梗语义就近匹配 (Contextual Meme Semantic Matcher)',
    summary: '根据当前正在撰写的章节正文（如“宗门发俸禄”、“秘境夺宝”），自动推荐最契合的3条热梗。',
    metric: '情境感知智能推荐',
  },
  {
    id: 'ta-15',
    code: 'TA15',
    group: 'ARCHITECTURE',
    category: '多Agent博弈',
    title: '网感编剧与严肃文学审校双 Agent 博弈 (Viral-Literary Dual-Agent Referee)',
    summary: '由“网感整活 Agent”负责埋梗，“严肃审校 Agent”负责润色文笔，避免正文沦为低质口水文。',
    metric: '网感与文笔平衡',
  },
  {
    id: 'ta-16',
    code: 'TA16',
    group: 'ARCHITECTURE',
    category: '实时解析',
    title: '任意文本/链接零样本热梗结构化器 (Zero-Shot Custom Trend Structurer)',
    summary: '支持用户输入任意一句刚火起来的话或新闻摘要，后端即时生成 5 大世界观映射与情绪标签。',
    metric: 'Zero-Shot 即时入库',
  },
  {
    id: 'ta-17',
    code: 'TA17',
    group: 'ARCHITECTURE',
    category: '缓存加速',
    title: '高频热梗转译模板内存热缓存 (In-Memory Localization Hot Cache)',
    summary: '对高频使用的经典热梗与世界观转译结果进行内存级缓存，实现零延迟预览与切换。',
    metric: '0ms 预览切换',
  },
  {
    id: 'ta-18',
    code: 'TA18',
    group: 'ARCHITECTURE',
    category: '跨端同步',
    title: 'Studio 编辑器与热点工坊状态总线 (Studio-Trend Reactive State Bus)',
    summary: '通过 Zustand 全局状态总线，实现热点工坊生成结果与沉浸式编辑器正文的实时双向同步。',
    metric: '全局响应式同步',
  },
  {
    id: 'ta-19',
    code: 'TA19',
    group: 'ARCHITECTURE',
    category: '结构化Diff',
    title: '行级 Codex 手术刀补丁生成器 (Line-Level Surgical Patch Generator)',
    summary: '自动计算原章节末尾与新增热点融合段落的 Unified Diff，直观展示每一处修辞改动。',
    metric: 'Unified Diff 视图',
  },
  {
    id: 'ta-20',
    code: 'TA20',
    group: 'ARCHITECTURE',
    category: '高可用兜底',
    title: '离线常青热梗库与在线热榜双模容灾 (Offline-Online Hybrid Trend Store)',
    summary: '即使在无外网或断网闭关码字环境下，依然提供丰富的预置热梗、新闻原型与跨世界观转译能力。',
    metric: '100% 离线可用保障',
  },
];

const WORLDVIEW_OPTIONS: {
  id: 'XIANXIA' | 'URBAN' | 'CTHULHU' | 'CYBERPUNK' | 'HISTORICAL';
  label: string;
  sub: string;
  badgeColor: string;
}[] = [
  { id: 'XIANXIA', label: '修仙宗门 / 仙侠灵网', sub: '玉简传音、宗门大比、天道筑基', badgeColor: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' },
  { id: 'URBAN', label: '现代都市 / 职场轻小说', sub: '大厂整顿、直播吃瓜、都市异能', badgeColor: 'text-sky-400 border-sky-500/30 bg-sky-500/10' },
  { id: 'CTHULHU', label: '诡秘克苏鲁 / 蒸汽民俗', sub: '旧日低语、非凡特性、教会卷宗', badgeColor: 'text-purple-400 border-purple-500/30 bg-purple-500/10' },
  { id: 'CYBERPUNK', label: '赛博朋克 / 义体财阀', sub: '脑机接口、霓虹黑客、算力垄断', badgeColor: 'text-amber-400 border-amber-500/30 bg-amber-500/10' },
  { id: 'HISTORICAL', label: '古风朝堂 / 权谋江湖', sub: '言官弹劾、邸报风闻、茶楼说书', badgeColor: 'text-rose-400 border-rose-500/30 bg-rose-500/10' },
];

const MODE_OPTIONS: {
  id: 'NOVEL_SCENE' | 'STANDALONE_ARTICLE' | 'DIALOGUE_BANTER' | 'PLOT_OUTLINE';
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'NOVEL_SCENE',
    label: '嵌入当前小说场景',
    desc: '与正在写的章节正文自然缝合，提供跨世界观转译与 Diff 预览',
    icon: <BookOpen className="w-3.5 h-3.5" />,
  },
  {
    id: 'STANDALONE_ARTICLE',
    label: '生成独立热点文章/时评',
    desc: '围绕所选热梗与新闻，直接生成一篇结构完整的深度网感文章或脑洞短篇',
    icon: <FileText className="w-3.5 h-3.5" />,
  },
  {
    id: 'DIALOGUE_BANTER',
    label: '角色玩梗交锋对白',
    desc: '生成双人或多人围绕该热点的神吐槽、捧逗拉扯与人设反差对话',
    icon: <MessageCircle className="w-3.5 h-3.5" />,
  },
  {
    id: 'PLOT_OUTLINE',
    label: '三幕式热点映射细纲',
    desc: '将现实热点冲突转化为小说支线任务或副本的三幕式起承转合大纲',
    icon: <GitBranch className="w-3.5 h-3.5" />,
  },
];

const DENSITY_LABELS: Record<number, { name: string; desc: string }> = {
  1: { name: '1档 · 隐喻暗合', desc: '不露声色借用热点内核，完全不出现网络热词，适合严肃正剧' },
  2: { name: '2档 · 自然会心', desc: '角色冷不丁抖机灵或侧面提及，读者会心一笑且不出戏（推荐）' },
  3: { name: '3档 · 密集网感', desc: '轻小说级高密度吐槽与反差玩梗，互动感与“本章说”拉满' },
  4: { name: '4档 · 荒诞狂欢', desc: '火力全开的沙雕整活与解构狂欢，适合番外篇或搞笑日常章' },
};

interface TrendMemeFusionViewProps {
  onNavigateTab?: (tab: NavTab) => void;
}

export const TrendMemeFusionView: React.FC<TrendMemeFusionViewProps> = ({ onNavigateTab }) => {
  const { editorContent, setEditorContent, setPendingDraft, activeChapter } = useNovel();
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string, _type?: 'success' | 'warning' | 'error') => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // Radar state
  const [trends, setTrends] = useState<TrendRadarItem[]>(DEFAULT_TREND_RADAR_ITEMS);
  const [selectedTrendIds, setSelectedTrendIds] = useState<string[]>([
    DEFAULT_TREND_RADAR_ITEMS[0]?.id || 'trend-01',
    DEFAULT_TREND_RADAR_ITEMS[1]?.id || 'trend-02',
  ]);
  const [categoryFilter, setCategoryFilter] = useState<
    'ALL' | 'VIRAL_MEME' | 'BREAKING_NEWS' | 'SUBCULTURE_JARGON' | 'ABSURD_REALITY'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);

  // Custom trend harvester state
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customPlatform, setCustomPlatform] = useState('抖音 / 微博实时采集');
  const [customCategory, setCustomCategory] = useState<
    'VIRAL_MEME' | 'BREAKING_NEWS' | 'SUBCULTURE_JARGON' | 'ABSURD_REALITY'
  >('VIRAL_MEME');
  const [customRawText, setCustomRawText] = useState('');
  const [isParsingCustom, setIsParsingCustom] = useState(false);

  // Fusion synthesizer state
  const [targetWorldview, setTargetWorldview] = useState<'XIANXIA' | 'URBAN' | 'CTHULHU' | 'CYBERPUNK' | 'HISTORICAL'>('XIANXIA');
  const [targetMode, setTargetMode] = useState<'NOVEL_SCENE' | 'STANDALONE_ARTICLE' | 'DIALOGUE_BANTER' | 'PLOT_OUTLINE'>('NOVEL_SCENE');
  const [humorDensity, setHumorDensity] = useState<number>(2);
  const [customInstruction, setCustomInstruction] = useState('');
  const [isFusing, setIsFusing] = useState(false);
  const [fusionResult, setFusionResult] = useState<TrendFusionResponse | null>(null);

  // Bottom 20+20 Matrix state
  const [activeSubView, setActiveSubView] = useState<'WORKBENCH' | 'MATRIX_40'>('WORKBENCH');
  const [matrixFilter, setMatrixFilter] = useState<'ALL' | 'FEATURE' | 'ARCHITECTURE'>('ALL');

  useEffect(() => {
    let mounted = true;
    setIsLoadingFeed(true);
    fetchRealtimeTrendsFeed()
      .then((res) => {
        if (mounted && res.items && res.items.length > 0) {
          setTrends(res.items);
        }
      })
      .finally(() => {
        if (mounted) setIsLoadingFeed(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-run initial synthesis preview once on mount so the right panel is immediately rich
  useEffect(() => {
    handleRunFusion(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTrends = useMemo(() => {
    return trends.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.originSummary.toLowerCase().includes(q) ||
          item.structuralTrope.toLowerCase().includes(q) ||
          item.tags.some((t) => t.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [trends, categoryFilter, searchQuery]);

  const selectedTrendObjects = useMemo(() => {
    return trends.filter((t) => selectedTrendIds.includes(t.id));
  }, [trends, selectedTrendIds]);

  const toggleTrendSelection = (id: string) => {
    setSelectedTrendIds((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((item) => item !== id) : prev) : [...prev, id]
    );
  };

  const handleRefreshFeed = async () => {
    setIsLoadingFeed(true);
    const res = await fetchRealtimeTrendsFeed();
    if (res.items?.length) {
      setTrends(res.items);
      showToast(`已同步全网实时热梗与热点新闻（共 ${res.items.length} 条鲜活源）`, 'success');
    }
    setIsLoadingFeed(false);
  };

  const handleAddCustomTrend = async () => {
    if (!customTitle.trim() && !customRawText.trim()) {
      showToast('请输入热梗名称或粘贴一段热点新闻摘要', 'warning');
      return;
    }
    setIsParsingCustom(true);
    try {
      const combinedInput = customTitle.trim()
        ? `${customTitle.trim()}：${customRawText.trim()}`
        : customRawText.trim();
      const created = await parseCustomTrendItem({
        rawInput: combinedInput,
        sourcePlatform: customPlatform,
        category: customCategory,
      });
      setTrends((prev) => [created, ...prev]);
      setSelectedTrendIds((prev) => [created.id, ...prev.slice(0, 2)]);
      setCustomTitle('');
      setCustomRawText('');
      setShowCustomModal(false);
      showToast(`已解析并入库实时热点：「${created.title}」，已生成 5 大世界观本土化译本`, 'success');
    } finally {
      setIsParsingCustom(false);
    }
  };

  const handleRunFusion = async (silent = false) => {
    if (selectedTrendIds.length === 0) {
      if (!silent) showToast('请至少勾选 1 个实时热梗或热点新闻', 'warning');
      return;
    }
    setIsFusing(true);
    try {
      const res = await fuseTrendsIntoCreation({
        trendIds: selectedTrendIds,
        customTrendNotes: customInstruction.trim() || undefined,
        targetMode,
        worldviewStyle: targetWorldview,
        memeDensity: humorDensity,
        currentDraftSnippet: editorContent ? editorContent.slice(-500) : undefined,
      });
      setFusionResult(res);
      if (!silent) {
        showToast(
          `已完成「${selectedTrendObjects.map((t) => t.title).join(' + ')}」的跨维融合创制！`,
          'success'
        );
      }
    } finally {
      setIsFusing(false);
    }
  };

  const handleApplyToManuscript = () => {
    if (!fusionResult) return;
    const baseText = editorContent.trim();
    const mergedText = baseText
      ? `${baseText}\n\n${fusionResult.generatedContent}`
      : fusionResult.generatedContent;

    setPendingDraft(mergedText);
    setEditorContent(mergedText);
    showToast('已将热梗/热点融合段落合入当前章节正文（可在创作台查看或撤销）', 'success');
    if (onNavigateTab) {
      onNavigateTab('STUDIO');
    }
  };

  const handleCopyContent = () => {
    if (!fusionResult) return;
    navigator.clipboard.writeText(fusionResult.generatedContent);
    showToast('已复制融合生成的正文内容到剪贴板', 'success');
  };

  const getWorldviewLocalizationText = (item: TrendRadarItem, wv = targetWorldview) => {
    return item.worldviewTranslations?.[wv] || item.originSummary;
  };

  const activeChapterTitle = useMemo(() => {
    return activeChapter ? `${activeChapter.title}` : '当前章节草稿';
  }, [activeChapter]);

  return (
    <div className="h-full w-full flex flex-col bg-[#080b11] text-slate-100 overflow-hidden select-none relative">
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl bg-slate-900/95 border border-orange-500/50 text-xs text-orange-200 shadow-2xl flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>{toastMsg}</span>
        </div>
      )}
      {/* Top Sub-Header Banner */}
      <div className="shrink-0 px-6 py-3.5 bg-[#0b101b]/95 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/25 via-rose-500/20 to-amber-500/20 border border-orange-500/40 flex items-center justify-center shadow-inner">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-sm font-bold tracking-wide text-white">
                实时热梗、热点新闻与网感融合工坊
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">
                20 新功能 + 20 新架构
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                Anachronism Guard · 零违和转译
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              实时捕捉抖音/微博/B站/知乎流行热梗与社会科技热点，自动转译为修仙、克苏鲁、赛博或古风原教旨表达，支持嵌入小说正文或独立生成爆款时评文章
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-900/90 p-0.5 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveSubView('WORKBENCH')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeSubView === 'WORKBENCH'
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              实时热梗与文章融合台
            </button>
            <button
              onClick={() => setActiveSubView('MATRIX_40')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeSubView === 'MATRIX_40'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              20功能 + 20架构全景矩阵 (TF01-TA20)
            </button>
          </div>

          <button
            onClick={() => setShowCustomModal(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-400 hover:to-rose-400 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            录入刚看到的新梗 / 热点新闻
          </button>
        </div>
      </div>

      {activeSubView === 'WORKBENCH' ? (
        /* Main 3-Column Independent Scroll Workbench */
        <div className="flex-1 min-h-0 grid grid-cols-12 divide-x divide-slate-800/80 overflow-hidden">
          {/* LEFT COLUMN (4 cols): Multi-Platform Live Trend & Meme Radar */}
          <div className="col-span-4 h-full min-h-0 flex flex-col bg-[#090d16]">
            {/* Filter & Search Bar */}
            <div className="p-3.5 border-b border-slate-800/80 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-orange-400" />
                  <span className="text-xs font-semibold text-slate-200">
                    全网实时热梗与热点新闻雷达
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ({filteredTrends.length}条)
                  </span>
                </div>
                <button
                  onClick={handleRefreshFeed}
                  disabled={isLoadingFeed}
                  className="px-2 py-1 rounded text-[11px] text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingFeed ? 'animate-spin text-orange-400' : ''}`} />
                  刷新热榜
                </button>
              </div>

              {/* Search Input */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索热梗、热点新闻、情绪标签（如：草台班子、AI、抽象）..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {[
                  { id: 'ALL', label: '全部源' },
                  { id: 'VIRAL_MEME', label: '🔥 流行热梗' },
                  { id: 'BREAKING_NEWS', label: '📰 热点新闻' },
                  { id: 'SUBCULTURE_JARGON', label: '⚡ 圈层黑话' },
                  { id: 'ABSURD_REALITY', label: '🎭 荒诞现实' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id as typeof categoryFilter)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all cursor-pointer ${
                      categoryFilter === cat.id
                        ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                        : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Independent Scroll List of Trend Cards */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-2.5">
              {filteredTrends.map((item) => {
                const isSelected = selectedTrendIds.includes(item.id);
                const localizedText = getWorldviewLocalizationText(item, targetWorldview);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleTrendSelection(item.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-br from-orange-500/12 via-slate-900/95 to-rose-500/10 border-orange-500/50 shadow-md'
                        : 'bg-slate-900/55 hover:bg-slate-900/90 border-slate-800/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                            isSelected
                              ? 'bg-orange-500 border-orange-400 text-slate-950 font-bold'
                              : 'border-slate-700 bg-slate-950 text-transparent'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </span>
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-slate-800 text-slate-300 border border-slate-700/70">
                          {item.sourcePlatform}
                        </span>
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-500/15 text-orange-300 font-mono">
                          🔥 {item.heatScore}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono shrink-0">
                        {item.freshnessStage}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                      {item.originSummary}
                    </p>

                    <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/80">
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-0.5">
                        <span className="text-orange-300 font-medium">
                          ✦ 当前世界观转译预览 ({WORLDVIEW_OPTIONS.find((w) => w.id === targetWorldview)?.label.split(' ')[0]})
                        </span>
                        <span className="font-mono text-slate-500">{item.coreEmotion}</span>
                      </div>
                      <p className="text-[11px] text-amber-200/90 leading-snug">
                        {localizedText}
                      </p>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 flex-wrap">
                        {item.tags.map((tag) => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800/70 text-slate-400"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.updatedAt}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER COLUMN (4 cols): Worldview Localization & Synthesis Parameter Console */}
          <div className="col-span-4 h-full min-h-0 flex flex-col bg-[#0a0f1a]">
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">
                  跨世界观转译与融合创制引擎
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                已选 <strong className="text-orange-400">{selectedTrendIds.length}</strong> 个实时源
              </span>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
              {/* 1. Selected Trends Pill Bar */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-300">
                    1. 待融合的实时热梗 / 热点新闻组合
                  </span>
                  <span className="text-[10px] text-slate-500">支持多梗交叉化学反应</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedTrendObjects.map((t) => (
                    <span
                      key={t.id}
                      className="px-2.5 py-1 rounded-lg text-xs bg-orange-500/15 border border-orange-500/40 text-orange-200 flex items-center gap-1.5"
                    >
                      <Flame className="w-3 h-3 text-orange-400" />
                      {t.title}
                      {selectedTrendIds.length > 1 && (
                        <button
                          onClick={() => toggleTrendSelection(t.id)}
                          className="text-orange-300/70 hover:text-white ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* 2. Target Creation Mode (Novel Scene vs Standalone Article vs Dialogue vs Outline) */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  2. 选择融合创制模式（支持嵌入小说正文 或 独立生成热点文章）
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {MODE_OPTIONS.map((mode) => {
                    const active = targetMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setTargetMode(mode.id)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-semibold">
                          <span className={active ? 'text-orange-400' : 'text-slate-400'}>
                            {mode.icon}
                          </span>
                          {mode.label}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                          {mode.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. Target Worldview Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-300">
                    3. 目标世界观本土化声纹 (Anachronism Guard)
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono">
                    自动拦截穿帮现代词
                  </span>
                </div>
                <div className="space-y-1.5">
                  {WORLDVIEW_OPTIONS.map((wv) => {
                    const active = targetWorldview === wv.id;
                    return (
                      <button
                        key={wv.id}
                        onClick={() => setTargetWorldview(wv.id)}
                        className={`w-full px-3 py-2 rounded-xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-slate-900 border-orange-500/50 shadow-sm'
                            : 'bg-slate-900/40 border-slate-800/70 hover:bg-slate-900/80'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-semibold text-slate-100">{wv.label}</div>
                          <div className="text-[10px] text-slate-400">{wv.sub}</div>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] border ${wv.badgeColor}`}>
                          {active ? '当前激活' : '切换'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. 4-Gear Meme & Humor Density Slider */}
              <div className="p-3 rounded-xl bg-slate-900/70 border border-slate-800/90 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-200">
                    4. 含梗量与网感浓度滑块
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-semibold">
                    {DENSITY_LABELS[humorDensity]?.name}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={4}
                  step={1}
                  value={humorDensity}
                  onChange={(e) => setHumorDensity(Number(e.target.value))}
                  className="w-full accent-orange-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>1档·隐喻暗合</span>
                  <span>2档·自然会心</span>
                  <span>3档·密集网感</span>
                  <span>4档·荒诞狂欢</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  {DENSITY_LABELS[humorDensity]?.desc}
                </p>
              </div>

              {/* 5. Custom Scene Context / Article Topic Input */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  5. 剧情情境指令 或 独立文章命题（可选）
                </label>
                <textarea
                  rows={3}
                  value={customInstruction}
                  onChange={(e) => setCustomInstruction(e.target.value)}
                  placeholder="例如：让主角在宗门外门发放灵石俸禄时，借用这几个热梗吐槽长老院的形式主义；或者围绕该热点写一篇科技时评..."
                  className="w-full p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50 resize-none"
                />
              </div>

              {/* Primary Synthesize Button */}
              <button
                onClick={() => handleRunFusion(false)}
                disabled={isFusing}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-500 via-rose-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-semibold text-xs shadow-lg shadow-orange-500/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className={`w-4 h-4 ${isFusing ? 'animate-spin' : ''}`} />
                {isFusing
                  ? '正在执行跨世界观转译与融合创制...'
                  : '立即执行热梗/热点融合创制 (Synthesize Now)'}
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN (4 cols): Live Synthesis Output, Anachronism Guard, Reader Danmaku & 1-Click Apply */}
          <div className="col-span-4 h-full min-h-0 flex flex-col bg-[#080c14]">
            <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <MessageSquareQuote className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-semibold text-white">
                  融合生成成品、读者弹幕预演与无损合入
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleCopyContent}
                  className="px-2.5 py-1 rounded-lg text-[11px] bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/70 flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  复制全文
                </button>
                <button
                  onClick={handleApplyToManuscript}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 cursor-pointer"
                >
                  <Zap className="w-3 h-3" />
                  一键合入当前章节
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
              {fusionResult ? (
                <>
                  {/* Anachronism Guard Status Banner */}
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-start gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-emerald-200/90 leading-relaxed">
                      <div className="font-semibold text-emerald-300">
                        防出戏语义护栏 (Anachronism Guard) 已通过
                      </div>
                      {fusionResult.anachronismWarning}
                    </div>
                  </div>

                  {/* Generated Manuscript / Article Card */}
                  <div className="rounded-xl bg-slate-900/85 border border-slate-800 overflow-hidden">
                    <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300">
                        {MODE_OPTIONS.find((m) => m.id === fusionResult.targetMode)?.label || '融合创制结果'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        目标：{activeChapterTitle}
                      </span>
                    </div>
                    <div className="p-4 text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-serif select-text">
                      {fusionResult.generatedContent}
                    </div>
                  </div>

                  {/* Simulated Reader Bullet-Chat (本章说弹幕预演) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-orange-300 flex items-center gap-1.5">
                        <Newspaper className="w-3.5 h-3.5" />
                        读者「本章说 / 弹幕」互动高潮预演 (TF09)
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        4类读者 Agent 并发反馈
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {fusionResult.simulatedDanmaku.map((item, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-1.5 rounded-lg bg-slate-950/80 border border-slate-800/70 text-[11px] text-slate-300 flex items-center justify-between gap-2"
                        >
                          <span>
                            <strong className="text-orange-300">@{item.user}：</strong>
                            {item.content}
                          </span>
                          <span className="text-[10px] text-orange-400/80 font-mono shrink-0">
                            {item.likes}+ 赞
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Codex Surgical Diff Preview */}
                  <div className="rounded-xl bg-slate-950 border border-slate-800/90 overflow-hidden">
                    <div className="px-3 py-2 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] font-mono text-slate-300">
                        Codex Surgical Diff 补丁预览 (TF19 / TA19)
                      </span>
                      <button
                        onClick={handleApplyToManuscript}
                        className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                      >
                        合入创作台 <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                    <pre className="p-3 text-[11px] font-mono text-emerald-300/90 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                      {`--- 原文锚点\n- ${fusionResult.surgicalPatch.targetSnippet}\n+++ 实时热梗/热点融合补丁 (${fusionResult.surgicalPatch.rationale})\n+ ${fusionResult.surgicalPatch.replacementSnippet}`}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  正在初始化实时热梗融合引擎...
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* 20 Features + 20 Architectures Full Interactive Blueprint Matrix */
        <div className="flex-1 min-h-0 flex flex-col bg-[#080b11] overflow-hidden">
          <div className="px-6 py-3 border-b border-slate-800/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMatrixFilter('ALL')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  matrixFilter === 'ALL'
                    ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                全部 40 项能力 (TF01–TA20)
              </button>
              <button
                onClick={() => setMatrixFilter('FEATURE')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  matrixFilter === 'FEATURE'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                20 项实时热梗与热点创作功能 (TF01–TF20)
              </button>
              <button
                onClick={() => setMatrixFilter('ARCHITECTURE')}
                className={`px-3 py-1 rounded-lg text-xs font-medium cursor-pointer ${
                  matrixFilter === 'ARCHITECTURE'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800'
                }`}
              >
                20 项跨世界观语义与流式架构 (TA01–TA20)
              </button>
            </div>
            <span className="text-xs text-slate-400">
              点击任意功能卡片可直接带入参数并在工作台中实测运行
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {[...TREND_FEATURES_20, ...TREND_ARCHITECTURES_20]
                .filter((item) => matrixFilter === 'ALL' || item.group === matrixFilter)
                .map((spec) => (
                  <div
                    key={spec.id}
                    onClick={() => {
                      if (spec.presetWorldview) setTargetWorldview(spec.presetWorldview);
                      if (spec.presetMode) setTargetMode(spec.presetMode);
                      setActiveSubView('WORKBENCH');
                      handleRunFusion(false);
                    }}
                    className="p-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-900 border border-slate-800/90 hover:border-orange-500/40 transition-all flex flex-col justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            spec.group === 'FEATURE'
                              ? 'bg-orange-500/15 text-orange-300 border border-orange-500/30'
                              : 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                          }`}
                        >
                          {spec.code} · {spec.category}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400">
                          {spec.metric}
                        </span>
                      </div>
                      <h3 className="text-xs font-bold text-white group-hover:text-orange-300 transition-colors">
                        {spec.title}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                        {spec.summary}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Cpu className="w-3 h-3 text-slate-500" />
                        已挂载至热梗融合总线
                      </span>
                      <span className="text-orange-400 group-hover:translate-x-0.5 transition-transform">
                        一键实测 →
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Live Meme / Breaking News Harvester Modal (TF04 / TA16) */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[#0d1322] border border-slate-700/80 shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-bold text-white">
                  录入刚看到的新梗 / 突发热点新闻 (TF04 · Zero-Shot 解析)
                </h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="text-slate-400 hover:text-white text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  热梗词条 或 热点新闻标题
                </label>
                <input
                  type="text"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="例如：主包也要闯祸了 / 某科技巨头发布全息脑机接口..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">来源平台</label>
                  <input
                    type="text"
                    value={customPlatform}
                    onChange={(e) => setCustomPlatform(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">热点类型</label>
                  <select
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value as typeof customCategory)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="VIRAL_MEME">流行热梗 (VIRAL_MEME)</option>
                    <option value="BREAKING_NEWS">突发新闻 (BREAKING_NEWS)</option>
                    <option value="SUBCULTURE_JARGON">亚文化黑话 (SUBCULTURE_JARGON)</option>
                    <option value="ABSURD_REALITY">荒诞现实 (ABSURD_REALITY)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">
                  新闻正文摘要 / 玩梗语境说明 / 网页内容粘贴
                </label>
                <textarea
                  rows={4}
                  value={customRawText}
                  onChange={(e) => setCustomRawText(e.target.value)}
                  placeholder="直接粘贴你刚在微博、抖音、知乎或新闻网站看到的段落，系统将自动提取情绪内核并生成 5 大世界观（修仙/克苏鲁/赛博/古风/都市）的防出戏转译版本..."
                  className="w-full p-3 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                取消
              </button>
              <button
                onClick={handleAddCustomTrend}
                disabled={isParsingCustom}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-orange-500 to-rose-500 text-white hover:from-orange-400 hover:to-rose-400 cursor-pointer"
              >
                {isParsingCustom ? '正在解析并转译...' : '解析入库并立即选中'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
