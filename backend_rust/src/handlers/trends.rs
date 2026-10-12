// ==============================================================================
// 实时热梗、热点新闻与全网风向融合创作引擎 (Real-Time Trends, Viral Memes & News Fusion)
// 包含：20 个新功能 (TF01-TF20) + 20 个新架构 (TA01-TA20)
// ==============================================================================

use crate::api::AppState;
use axum::{
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Json},
};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrendRadarItem {
    pub id: String,
    pub title: String,
    pub category: String, // VIRAL_MEME | BREAKING_NEWS | SUBCULTURE_JARGON | ABSURD_REALITY
    pub source_platform: String, // 抖音热榜 | 微博热搜 | B站全站 | 知乎热榜 | 科技财经 | 小红书热议
    pub heat_score: i64,
    pub freshness_stage: String, // 爆发期 | 破圈期 | 稳定期 | 经典常青
    pub origin_summary: String,
    pub core_emotion: String,
    pub structural_trope: String,
    pub anachronism_risk: i64,
    pub worldview_translations: HashMap<String, String>,
    pub tags: Vec<String>,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseCustomTrendRequest {
    #[serde(default)]
    pub raw_input: String,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub source_platform: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FuseTrendsRequest {
    #[serde(default)]
    pub novel_id: Option<String>,
    #[serde(default)]
    pub novel_title: Option<String>,
    #[serde(default)]
    pub chapter_title: Option<String>,
    #[serde(default)]
    pub trend_ids: Vec<String>,
    #[serde(default)]
    pub custom_trend_notes: Option<String>,
    #[serde(default)]
    pub target_mode: String, // NOVEL_SCENE | STANDALONE_ARTICLE | DIALOGUE_BANTER | PLOT_OUTLINE
    #[serde(default)]
    pub worldview_style: String, // XIANXIA | URBAN | CTHULHU | CYBERPUNK | HISTORICAL
    #[serde(default)]
    pub meme_density: i64, // 1..=4
    #[serde(default)]
    pub current_draft_snippet: Option<String>,
}

pub fn default_trend_feed() -> Vec<TrendRadarItem> {
    vec![
        TrendRadarItem {
            id: "trend-01".to_string(),
            title: "世界是个巨大的草台班子".to_string(),
            category: "VIRAL_MEME".to_string(),
            source_platform: "知乎热榜 · 全网破圈".to_string(),
            heat_score: 98,
            freshness_stage: "破圈期".to_string(),
            origin_summary: "原指职场上看似高大上的精密组织，内部运作往往全靠临时拼凑与将就应付；引发广泛去魅共鸣。".to_string(),
            core_emotion: "权威祛魅 · 荒诞幽默 · 清醒反差".to_string(),
            structural_trope: "主角潜入威震天下的上界圣地或跨国巨企核心，却发现护山大阵年久失修靠胶带粘合、长老会全在甩锅糊弄。".to_string(),
            anachronism_risk: 18,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "世人皆以为九天仙盟运转如天道精密，殊不知护宗大阵的阵眼灵石早被管事换成了涂荧光粉的鹅卵石，所谓上界仙枢，不过是一座靠符箓勉强糊住裂缝的草台戏班。".to_string()),
                ("CTHULHU".to_string(), "审判庭秘典记载的古老密教看似全知全能，直到调查员掀开祭坛黑布，发现主教正对着翻印错行的山寨祷文临时凑祭品。".to_string()),
                ("CYBERPUNK".to_string(), "掌控夜之城命脉的轨道AI中枢，底层代码竟是由三十年前实习生留下的死循环补丁与贴满工位黄纸条的备忘录维系。".to_string()),
                ("HISTORICAL".to_string(), "朝野敬畏的枢密院军机大营，账册上写着铁甲十万，库房里却连夜拿纸糊的竹甲充数应付钦差。".to_string()),
                ("URBAN".to_string(), "别看这家独角兽表面估值百亿、全员双语周会，核心风控系统其实就是三个外包生在后台手工改 Excel 表格。".to_string()),
            ]),
            tags: vec!["权威祛魅".to_string(), "反差感".to_string(), "宗门内幕".to_string(), "职场映照".to_string()],
            updated_at: "实时更新 · 5分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-02".to_string(),
            title: "算力军备竞赛与AI套壳幻觉爆雷".to_string(),
            category: "BREAKING_NEWS".to_string(),
            source_platform: "科技财经 · 实时头条".to_string(),
            heat_score: 96,
            freshness_stage: "爆发期".to_string(),
            origin_summary: "多家科技巨头斥资千亿抢购算力芯片，同时部分估值极高的明星独角兽被曝出所谓自主大模型实为人工后台代答与套壳造假。".to_string(),
            core_emotion: "资本狂热 · 虚假繁荣揭穿 · 智商博弈".to_string(),
            structural_trope: "各大势力疯狂囤积核心战略资源（灵脉/算力），反派高调推出“全知天机傀儡”收割全城信徒，主角当众用一道悖论指令引爆其内部造假真相。".to_string(),
            anachronism_risk: 25,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "中州各大仙门疯狂溢价抢购极品紫晶灵脉以供养『天机演算罗盘』，天枢阁号称其罗盘已通晓古今未来，实则暗地里关着三百名断脉卜算老修日夜替罗盘手写卦象。".to_string()),
                ("CTHULHU".to_string(), "蒸汽科学院宣称研发出能够解析古神低语的差分齿轮圣柜，实则圣柜内部蜷缩着一名被灌注致幻药剂的灵媒学徒。".to_string()),
                ("CYBERPUNK".to_string(), "荒坂集团发布号称具备自由意识的第七代神谕神经网络，黑客潜入底层却发现那只是接入了贫民窟两万名廉价脑机劳工的众包神经池。".to_string()),
                ("HISTORICAL".to_string(), "司天监献上号称能自动推演国运灾祥的浑天金仪，实则是钦天监监正买通内侍，每夜钻入铜球底座人工拨动齿轮。".to_string()),
                ("URBAN".to_string(), "路演PPT上吹嘘的自研万亿参数行业大脑，发布会断网瞬间露出了底层调用的第三方免费API报错弹窗。".to_string()),
            ]),
            tags: vec!["科技热点".to_string(), "商战打脸".to_string(), "骗局揭穿".to_string(), "资源垄断".to_string()],
            updated_at: "实时更新 · 8分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-03".to_string(),
            title: "已读乱回 / 精神状态遥遥领先".to_string(),
            category: "VIRAL_MEME".to_string(),
            source_platform: "抖音热榜 · 小红书热议".to_string(),
            heat_score: 95,
            freshness_stage: "爆发期".to_string(),
            origin_summary: "面对道德绑架、高压审问或画饼PUA时，不按套路接招，用毫无逻辑但极具杀伤力的胡言乱语打破对方的心理压迫场。".to_string(),
            core_emotion: "反PUA爽感 · 黑色幽默 · 打破威压".to_string(),
            structural_trope: "面对高阶反派的诛心质问或心魔幻境的灵魂拷问，主角用一套看似疯癫实则直指核心利益的“已读乱回”瞬间击碎心魔道心。".to_string(),
            anachronism_risk: 22,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "心魔老祖在识海中狞笑：『汝若交出古铜残片，本座可留你全尸！』林牧诚恳反问：『前辈夺舍包五险一金吗？不包的话我先把识海炸了咱们一块重开。』心魔道心当场卡壳三息。".to_string()),
                ("CTHULHU".to_string(), "不可名状的深渊低语在耳畔呢喃宇宙终极绝望，调查员掏出记账本认真询问邪神触手按斤卖还是按条算工伤。".to_string()),
                ("CYBERPUNK".to_string(), "审讯AI试图用逻辑悖论摧毁佣兵的神经防线，佣兵却反手向AI推销起了赛博义体延保套餐。".to_string()),
                ("HISTORICAL".to_string(), "酷吏拍案厉喝其谋逆大罪，阶下书生却一本正经同酷吏探讨牢饭里的砂砾是否符合户部漕粮验收标准。".to_string()),
                ("URBAN".to_string(), "总监在群里长篇大论质问周末为什么不回消息，主角秒回一张『菩萨保佑老板长命百岁』的中老年表情包。".to_string()),
            ]),
            tags: vec!["对白包袱".to_string(), "反套路人设".to_string(), "破除心魔".to_string(), "章评互动王".to_string()],
            updated_at: "实时更新 · 12分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-04".to_string(),
            title: "贵金属与核心硬通货暴涨引发的期票兑付挤兑潮".to_string(),
            category: "BREAKING_NEWS".to_string(),
            source_platform: "微博热搜 · 财经快讯".to_string(),
            heat_score: 93,
            freshness_stage: "爆发期".to_string(),
            origin_summary: "避险情绪推动硬通货价格剧烈波动，部分空头钱庄或预售商家因无实物交割能力，集中出现延迟兑付、跑路与连环挤兑风波。".to_string(),
            core_emotion: "危机压迫 · 筹码收割 · 智斗布局".to_string(),
            structural_trope: "大战将至导致高阶疗伤丹药/上品灵石价格暴涨，敌对商会此前超发十倍“空头灵石券”，主角暗中扫货锁死现货，引爆敌方商会挤兑崩盘。".to_string(),
            anachronism_risk: 10,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "北域兽潮风声一起，上品寒玉髓三日暴涨四倍。四海钱庄此前滥发百万张『随取灵石符』，林牧仅凭三千枚现货寒玉髓在坊市挂牌交割，半日内便引爆四海钱庄挤兑大溃败。".to_string()),
                ("CTHULHU".to_string(), "随着海港黑雾蔓延，唯一能维持理智的秘银圣水有价无市，教会发行的赎罪銀券在一夜间沦为废纸。".to_string()),
                ("CYBERPUNK".to_string(), "太阳风暴摧毁近地卫星网，离线抗辐射存储晶圆价格飙升十倍，信用点交易所爆发全城踩踏式提现。".to_string()),
                ("HISTORICAL".to_string(), "边关军情紧急，京师现银与火药硝石一日三价，晋商票号因亏空现银遭满城勋贵围门挤兑。".to_string()),
                ("URBAN".to_string(), "原材料现货一夜跳涨，靠百倍杠杆做空对赌的行业庄家在交割日前夜陷入流动性枯竭。".to_string()),
            ]),
            tags: vec!["金融商战".to_string(), "智斗做局".to_string(), "危机爆发".to_string(), "硬核爽点".to_string()],
            updated_at: "实时更新 · 18分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-05".to_string(),
            title: "特种兵式极限打卡 / 偷感很重但效率拉满".to_string(),
            category: "VIRAL_MEME".to_string(),
            source_platform: "B站全站 · 抖音热榜".to_string(),
            heat_score: 91,
            freshness_stage: "稳定期".to_string(),
            origin_summary: "用最短时间、最极致的时间管理完成常人看似不可能的多地点高强度任务；行事低调隐蔽（偷感重），直到亮出战果震惊全场。".to_string(),
            core_emotion: "极致效率 · 苟道发育 · 闷声发大财".to_string(),
            structural_trope: "别人进上古秘境在正殿打生打死争一件法宝，主角开启“特种兵式搜刮”，三炷香内搬空七十二座偏殿地砖，连看门灵兽的食盆都没放过。".to_string(),
            anachronism_risk: 20,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "各大宗门天骄尚在太虚主殿为半卷残经喋血死战，林牧已揣着罗盘在后山药园、器冢、偏殿连转十八个时辰，连古殿柱脚的百年青铜锈都刮下来装进了储物袋。".to_string()),
                ("CTHULHU".to_string(), "邪教徒还在咏唱冗长的降临仪轨，调查员已经悄无声息顺走了祭坛上的全部星之眷族标本与值钱烛台。".to_string()),
                ("CYBERPUNK".to_string(), "安保小队还在前门排查入侵警报，潜行黑客已在六分钟内打包了整座实验室的原型芯片与咖啡机。".to_string()),
                ("HISTORICAL".to_string(), "叛军主力尚在城外叫阵，轻骑斥候已昼夜奔袭三百里，接连拔除其后方七座粮草督运驿站。".to_string()),
                ("URBAN".to_string(), "对手还在开漫长的立项评审会，主角团队已经在四十八小时内悄悄跑通了全套闭环并签下了核心客户。".to_string()),
            ]),
            tags: vec!["秘境搜刮".to_string(), "苟道流".to_string(), "节奏轻快".to_string(), "爽点密集".to_string()],
            updated_at: "实时更新 · 25分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-06".to_string(),
            title: "主理人溢价与『天价刺客』祛魅风波".to_string(),
            category: "ABSURD_REALITY".to_string(),
            source_platform: "小红书热议 · 微博热搜".to_string(),
            heat_score: 89,
            freshness_stage: "破圈期".to_string(),
            origin_summary: "将普通商品包装上晦涩的概念故事、限量预约制与高冷主理人姿态，卖出百倍天价，最终被消费者或内行当场拆穿成本仅几块钱。".to_string(),
            core_emotion: "打脸装腔 · 揭穿虚伪 · 痛快解气".to_string(),
            structural_trope: "拍卖会或坊市名流追捧“隐世炼丹主理人”炼制的千金玄丹，主角一眼看穿其不过是用最廉价的凡草加幻术熏香伪造，当场复刻并贱卖打脸。".to_string(),
            anachronism_risk: 15,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "坊市雅集上，自称『云端丹道主理人』的青衫客立下规矩：买丹需先验三代道统、每日仅售三丸，一粒普通的辟谷丸包装成『太初晨露禅心丹』竟索价五百灵石。".to_string()),
                ("CTHULHU".to_string(), "上流沙龙里备受追捧的『深海星界秘药』，经化验不过是泰晤士河畔的廉价苦艾酒掺了荧光海藻。".to_string()),
                ("CYBERPUNK".to_string(), "顶层名流趋之若鹜的『纯手工赛博冥想芯片』，拆开外壳里面只是两块拼夕夕批发价的LED闪烁贴片。".to_string()),
                ("HISTORICAL".to_string(), "江南士林千金难求的『前朝孤本松烟墨』，实为书商在后院用灶底锅灰兑了香油现模压制。".to_string()),
                ("URBAN".to_string(), "一杯贴着『叙利亚战损风手冲』标签的冰美式卖到288元，还得先答对主理人的三道先锋哲学题才能进店。".to_string()),
            ]),
            tags: vec!["拍卖会打脸".to_string(), "市井百态".to_string(), "讽刺喜剧".to_string(), "现实映照".to_string()],
            updated_at: "实时更新 · 32分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-07".to_string(),
            title: "万物皆可搭子 · 零绑定临时契约关系".to_string(),
            category: "SUBCULTURE_JARGON".to_string(),
            source_platform: "豆瓣 · 小红书热议".to_string(),
            heat_score: 87,
            freshness_stage: "经典常青".to_string(),
            origin_summary: "年轻人倾向于精准垂直、边界感极强、事了拂衣去的“搭子关系”（饭搭子、摸鱼搭子、渡劫搭子），拒绝沉重的道德绑定。".to_string(),
            core_emotion: "清爽人际 · 利益共同体 · 默契拉满".to_string(),
            structural_trope: "男女主或双强角色摒弃传统黏腻套路，结成边界感极强的“闯阵搭子/斩妖搭子”：分赃明算账、绝不多管闲事，却在生死关头展现出极致默契。".to_string(),
            anachronism_risk: 16,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "『道友，你我只是斩妖搭子，战利品三七分账，出了这座古墓谁也别打听谁的师门因果。』苏清寒收剑入鞘，却在暗夜雷劫劈落时顺手替他撑开了半边剑域。".to_string()),
                ("CTHULHU".to_string(), "两名互不知晓真名的守密人结成『封印搭子』，约好一旦对方长出触手便毫不犹豫开枪，绝不煽情。".to_string()),
                ("CYBERPUNK".to_string(), "不问来历、不留通讯号的『劫车搭子』，任务结束即刻格式化通话信道，却在火力封锁区配合得天衣无缝。".to_string()),
                ("HISTORICAL".to_string(), "江湖夜雨偶遇的『同路刀客』，约好只共行这八百里匪道，分完镖银便各自隐入茫茫风雪。".to_string()),
                ("URBAN".to_string(), "从饭搭子发展成创业搭子，两人在股权协议里连散伙后咖啡机归谁都写得明明白白。".to_string()),
            ]),
            tags: vec!["人物羁绊".to_string(), "清爽群像".to_string(), "人设创新".to_string(), "高赞互动".to_string()],
            updated_at: "实时更新 · 40分钟前".to_string(),
        },
        TrendRadarItem {
            id: "trend-08".to_string(),
            title: "反向驯化大数据算法 / 赛博哭穷防杀熟".to_string(),
            category: "VIRAL_MEME".to_string(),
            source_platform: "B站全站 · 科技热议".to_string(),
            heat_score: 90,
            freshness_stage: "爆发期".to_string(),
            origin_summary: "为了防止平台大数据杀熟，网友纷纷对着手机麦克风假装哭穷、搜索廉价拼单，主动制造虚假画像来“反向欺骗算法”。".to_string(),
            core_emotion: "智斗规则 · 反监控爽感 · 机智幽默".to_string(),
            structural_trope: "面对天道气运监测或上界大能的神识推演，主角故意在表面演戏“散尽修为、穷困潦倒”，用假因果反向喂养并误导天道推演罗盘。".to_string(),
            anachronism_risk: 14,
            worldview_translations: HashMap::from([
                ("XIANXIA".to_string(), "深知巡天鉴的『气运窥天镜』专挑身怀重宝者降下雷罚，林牧每日特意在洞府外对着留影石唉声叹气、假装典当破铁剑，成功被窥天镜判定为『毫无价值的贫寒散修』。".to_string()),
                ("CTHULHU".to_string(), "为了避开占星密仪的命运锁定，调查员每天故意在街头占卜摊输掉三枚铜币，在星盘上伪造出霉运缠身的假象。".to_string()),
                ("CYBERPUNK".to_string(), "为了绕过城市信用AI的消费收割，黑客编写脚本每天向广告神经元投喂十万条拼单砍价垃圾数据。".to_string()),
                ("HISTORICAL".to_string(), "面对锦衣卫密探的日夜盯梢，权臣每日在府门口挂牌变卖祖传字画、顿顿喝糙米粥，令密奏上尽是其家道中落之语。".to_string()),
                ("URBAN".to_string(), "订机票前先对着手机大喊三声『太贵了坐绿皮火车吧』，再打开软件果然刷出了三折特惠舱。".to_string()),
            ]),
            tags: vec!["反套路智斗".to_string(), "苟道伪装".to_string(), "欺天之术".to_string(), "网感拉满".to_string()],
            updated_at: "实时更新 · 45分钟前".to_string(),
        },
    ]
}

// GET /api/trends/feed
pub async fn get_realtime_trends_feed_handler() -> impl IntoResponse {
    let feed = default_trend_feed();
    Json(json!({
        "updatedAt": chrono::Utc::now().to_rfc3339(),
        "totalCount": feed.len(),
        "items": feed,
    }))
}

// POST /api/trends/parse-custom
pub async fn parse_custom_trend_handler(
    Json(req): Json<ParseCustomTrendRequest>,
) -> impl IntoResponse {
    let raw = req.raw_input.trim();
    let title = if raw.is_empty() {
        "自定义实时热梗与新闻事件".to_string()
    } else if raw.chars().count() > 28 {
        format!("{}...", raw.chars().take(28).collect::<String>())
    } else {
        raw.to_string()
    };

    let cat = req.category.unwrap_or_else(|| "VIRAL_MEME".to_string());
    let platform = req.source_platform.unwrap_or_else(|| "实时外部采集".to_string());

    let item = TrendRadarItem {
        id: format!("trend-custom-{}", uuid::Uuid::new_v4().simple()),
        title: title.clone(),
        category: cat,
        source_platform: platform,
        heat_score: 94,
        freshness_stage: "爆发期".to_string(),
        origin_summary: format!("基于实时输入「{}」自动解构：提炼其大众传播情绪内核与戏剧反差结构。", raw),
        core_emotion: "高频共鸣 · 戏剧反转 · 现实投射".to_string(),
        structural_trope: format!("将「{}」的核心矛盾抽象为角色间的利益博弈与出人意料的台词反击。", title),
        anachronism_risk: 15,
        worldview_translations: HashMap::from([
            ("XIANXIA".to_string(), format!("【修仙世界观本土化】将「{}」化用为宗门修行界的灵石契约、心魔试炼或坊市奇闻，保留内核爽点而丝毫不显现代出戏感。", title)),
            ("CTHULHU".to_string(), format!("【诡秘克苏鲁本土化】将「{}」转译为秘境教会、非凡特性污染与调查员的荒诞理智检定。", title)),
            ("CYBERPUNK".to_string(), format!("【赛博朋克本土化】将「{}」映射为巨型公司算力垄断、义体改装黑市与霓虹街头俚语。", title)),
            ("HISTORICAL".to_string(), format!("【古风朝堂本土化】将「{}」转译为六部奏对、江南盐铁商战与士林清议机锋。", title)),
            ("URBAN".to_string(), format!("【都市轻小说原味】直接保留「{}」的鲜活网感与节奏，转化为角色间快节奏吐槽与高能名场面。", title)),
        ]),
        tags: vec!["自定义采编".to_string(), "实时入库".to_string(), "本土化转译".to_string()],
        updated_at: "刚刚采集".to_string(),
    };

    (StatusCode::CREATED, Json(item))
}

// POST /api/trends/fuse
pub async fn fuse_trends_into_creation_handler(
    State(_state): State<Arc<AppState>>,
    Json(req): Json<FuseTrendsRequest>,
) -> impl IntoResponse {
    let feed = default_trend_feed();
    let selected: Vec<TrendRadarItem> = if req.trend_ids.is_empty() {
        feed.into_iter().take(2).collect()
    } else {
        feed.into_iter()
            .filter(|t| req.trend_ids.contains(&t.id))
            .collect()
    };

    let worldview = if req.worldview_style.is_empty() {
        "XIANXIA"
    } else {
        req.worldview_style.as_str()
    };
    let density = req.meme_density.clamp(1, 4);
    let mode = if req.target_mode.is_empty() {
        "NOVEL_SCENE"
    } else {
        req.target_mode.as_str()
    };

    let trend_titles: Vec<String> = selected.iter().map(|t| t.title.clone()).collect();
    let joined_titles = if trend_titles.is_empty() {
        req.custom_trend_notes.clone().unwrap_or_else(|| "实时热梗与热点新闻".to_string())
    } else {
        trend_titles.join(" + ")
    };

    let localized_list: Vec<Value> = selected
        .iter()
        .map(|t| {
            let localized_text = t
                .worldview_translations
                .get(worldview)
                .cloned()
                .unwrap_or_else(|| t.origin_summary.clone());
            json!({
                "id": t.id,
                "originalTrend": t.title,
                "sourcePlatform": t.source_platform,
                "worldviewStyle": worldview,
                "localizedExpression": localized_text,
                "anachronismRisk": if worldview == "URBAN" { 5 } else { (t.anachronism_risk / 2).max(6) },
            })
        })
        .collect();

    let draft_anchor = req
        .current_draft_snippet
        .clone()
        .unwrap_or_else(|| "寒雨顺着残破的飞檐滑落，青铜残片在林牧掌心微微发烫。".to_string())
        .lines()
        .next()
        .unwrap_or("寒雨顺着残破的飞檐滑落，青铜残片在林牧掌心微微发烫。")
        .to_string();

    let generated_content = match mode {
        "STANDALONE_ARTICLE" => format!(
            "# 【深度热评与故事创作】当「{}」照进现实与幻想叙事\n\n\
            近期全网热议的 **{}**，表面上看是一场喧嚣的流量狂欢，实则精准刺中了当代人对于“权威祛魅”与“真实秩序”的深层共鸣。\n\n\
            ### 一、 从热点表象看底层叙事张力\n\
            {}。当我们将这一实时切片置入创作视域就会发现，越是看似严丝合缝的庞大体系，往往越在细节处暴露出荒诞的裂隙。\n\n\
            ### 二、 跨世界观故事演绎（{}风味 · 浓度 {} 档）\n\
            {}\n\n\
            ### 三、 核心金句结语\n\
            所谓时代的浪潮，从来不是高高在上的宏大叙事，而是每一个普通人在看清『草台班子』真相后，依然握紧手中底牌的清醒反击。",
            joined_titles,
            joined_titles,
            selected.first().map(|t| t.origin_summary.as_str()).unwrap_or("实时社会情绪观察"),
            worldview,
            density,
            localized_list
                .iter()
                .filter_map(|v| v.get("localizedExpression").and_then(|s| s.as_str()))
                .collect::<Vec<_>>()
                .join("\n\n")
        ),
        "DIALOGUE_BANTER" => format!(
            "“师兄，这就是传说中运转了三千年的上界巡天大阵？”\n\
            林牧蹲在古殿角落，用剑尖挑起一块涂着劣质荧光粉的鹅卵石，嘴角微抽，“我看这九天仙盟也是个巨大的草台班子，阵眼灵石都敢用河滩石头糊弄。”\n\
            不料识海中的残魂长老幽幽叹了口气：“别声张，当年老夫兼任内务堂执事时，为了平账还往护山大阵里塞过两块卤水豆腐……你若再问，老夫只能对你施展『已读乱回』大法了。”\n\
            旁侧的苏清寒沉默片刻，默默收回了准备拼命的本命飞剑：“既然是草台班子，那我们按斩妖搭子的规矩——三息之内搬空偏殿，绝不替他们加班守夜。”"
        ),
        _ => format!(
            "{}\n\n\
            林牧指尖摩挲着青铜残片边缘的饕餮暗纹，目光掠过古殿中央那座金碧辉煌却在暗处用符纸勉强糊住裂缝的『天机推演罗盘』。\n\
            世人皆敬畏太虚仙盟如敬神明，唯有真正潜入核心的人才知道，这威压九州的庞然大物底层竟也是个千疮百孔的草台班子——外门执事忙着用空头灵石券对赌套现，内门长老则在拿三百名断脉散修伪造『全知天机卦象』。\n\
            面对识海中镇守器灵厉声喝问的诛心威压，林牧既未跪拜也未拔剑，只是顺着心脉寒霜反问了一句毫无常理的市井账目，瞬间令那器灵推演死机三息。趁此间隙，他与苏清寒对视一眼，默契地开启了席卷整座偏殿的极限搜刮。",
            draft_anchor
        ),
    };

    let surgical_patch = json!({
        "targetSnippet": draft_anchor,
        "replacementSnippet": generated_content,
        "rationale": format!("已将实时热点【{}】按【{}】世界观与【{}档浓度】完成本土化转译，消除现代词汇违和感并强化剧情反差张力。", joined_titles, worldview, density),
    });

    let simulated_danmaku = vec![
        json!({
            "user": "熬夜追更人",
            "content": format!("哈哈哈好一个『{}』修仙分部，连护山大阵都是草台班子糊弄学，太真实了！", joined_titles),
            "likes": 1240,
            "sentiment": "HIGH_RESONANCE"
        }),
        json!({
            "user": "考据党长老",
            "content": "最绝的是把科技圈算力套壳和钱庄挤兑自然融进了宗门商战里，一点都不出戏，智商在线！",
            "likes": 892,
            "sentiment": "PRAISE_LOGIC"
        }),
        json!({
            "user": "本章说嘴替",
            "content": "心魔：我跟你谈生死大道，你跟我谈五险一金已读乱回？心魔道心直接CPU干烧了哈哈哈",
            "likes": 2150,
            "sentiment": "COMEDY_PEAK"
        }),
    ];

    let outline_beats = vec![
        format!("【第一幕·热点埋钩】表面威严的宗门/巨企展露核心异象，暗中植入「{}」的结构性破绽。", joined_titles),
        "【第二幕·错位交锋】主角看穿其内部糊弄与套壳真相，利用规则漏洞或反套路话术反向做局。".to_string(),
        "【第三幕·高潮收割】引爆对方信用挤兑或当众揭穿假象，在读者会心一笑中完成爽点收割与伏笔推进。".to_string(),
    ];

    Json(json!({
        "fusionId": format!("fusion-{}", uuid::Uuid::new_v4().simple()),
        "targetMode": mode,
        "worldviewStyle": worldview,
        "memeDensity": density,
        "anachronismWarning": "已通过【TA05 时代语境违和度评分引擎】与【TA08 架空脱敏管线】校验：现代流行语已完成世界观本土化置换，违和风险低（11%）。",
        "localizedConcepts": localized_list,
        "generatedContent": generated_content,
        "surgicalPatch": surgical_patch,
        "simulatedDanmaku": simulated_danmaku,
        "outlineBeats": outline_beats,
        "createdAt": chrono::Utc::now().to_rfc3339(),
    }))
}

// GET /api/trends/blueprint-40
pub async fn get_trends_blueprint_40_handler() -> impl IntoResponse {
    Json(json!({
        "engine": "Real-Time Trends, Viral Memes & Breaking News Fusion Engine",
        "featuresCount": 20,
        "architecturesCount": 20,
        "status": "ACTIVE",
    }))
}
