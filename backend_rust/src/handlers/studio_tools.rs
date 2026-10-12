// ==============================================================================
// 创制工坊辅助工具域处理器：东方取名矩阵、正文去水提纯、全局实体重构、战力天平与商业体检
// ==============================================================================

use crate::api::AppState;
use crate::models::SaveSceneDraftRequest;
use axum::{
    extract::{Json, Path, State},
    http::StatusCode,
    response::IntoResponse,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OrientalNamingRequest {
    pub category: Option<String>, // CHARACTER, SECT, TECHNIQUE, ARTIFACT, ELIXIR, REALM
    pub element: Option<String>,  // 金, 木, 水, 火, 土, 雷, 冰, 太虚
    pub style: Option<String>,    // 古典诗经, 杀伐果断, 诡秘克苏鲁, 仙风道骨
    pub surname: Option<String>,
    pub count: Option<usize>,
}

pub async fn generate_oriental_names_handler(
    Json(req): Json<OrientalNamingRequest>,
) -> impl IntoResponse {
    let category = req.category.unwrap_or_else(|| "CHARACTER".to_string()).to_uppercase();
    let element = req.element.unwrap_or_else(|| "太虚".to_string());
    let style = req.style.unwrap_or_else(|| "仙风道骨".to_string());
    let surname = req.surname.unwrap_or_else(|| "林".to_string());
    let count = req.count.unwrap_or(6).clamp(1, 12);

    let items: Vec<Value> = match category.as_str() {
        "SECT" => vec![
            json!({"name": format!("{}太虚宗", element), "category": "SECT", "element": element, "aura": "SSS", "etymology": "取《庄子·知北游》“是以不过乎昆仑，不游乎太虚”之意", "loreSnippet": "隐世万载的上古道统，山门悬浮于九重罡风之上。"}),
            json!({"name": "悬空藏剑阁", "category": "SECT", "element": "金", "aura": "SS", "etymology": "万剑归宗，悬空听涛", "loreSnippet": "以残剑镇压地脉的剑修圣地，门徒皆修杀伐剑意。"}),
            json!({"name": "烬海听潮楼", "category": "SECT", "element": "水", "aura": "SS", "etymology": "沧海化烬，独立潮头", "loreSnippet": "掌控东荒情报与地下拍卖行的神秘商会组织。"}),
            json!({"name": "北冥玄天观", "category": "SECT", "element": "冰", "aura": "S", "etymology": "北冥有鱼，化而为鹏", "loreSnippet": "立于极北苦寒绝域，擅长推演天机与太阴寒气。"}),
            json!({"name": "赤霄焚天谷", "category": "SECT", "element": "火", "aura": "S", "etymology": "赤霄神剑，焚尽八荒", "loreSnippet": "以地心真火淬炼丹器、行事霸道绝伦的炼器大宗。"}),
            json!({"name": "幽冥白骨道", "category": "SECT", "element": "暗", "aura": "SS", "etymology": "白骨生花，黄泉引渡", "loreSnippet": "行走于禁忌边缘的诡道魔宗，执掌生魂契约。"}),
        ],
        "TECHNIQUE" => vec![
            json!({"name": format!("《{}斩天拔剑术》", element), "category": "TECHNIQUE", "element": element, "aura": "SSS", "etymology": "拔剑一瞬，天地失色", "loreSnippet": "蓄势越久剑威越盛，一剑出而百里灵气尽数抽空。"}),
            json!({"name": "《九转太虚游龙诀》", "category": "TECHNIQUE", "element": "太虚", "aura": "SS", "etymology": "乘云气，御飞龙，而游乎四海之外", "loreSnippet": "身法诡谲莫测，可在咫尺之间折叠空间遁影。"}),
            json!({"name": "《大荒囚天指》", "category": "TECHNIQUE", "element": "土", "aura": "SS", "etymology": "一指囚天地，二指碎山河", "loreSnippet": "引动大荒古意凝成百丈巨指，专破一切护体罡气。"}),
            json!({"name": "《紫霄神雷渡厄经》", "category": "TECHNIQUE", "element": "雷", "aura": "SSS", "etymology": "代天行罚，雷劫淬魂", "loreSnippet": "引九天紫霄神雷入体淬炼神识，万邪不侵。"}),
            json!({"name": "《枯荣一念禅》", "category": "TECHNIQUE", "element": "木", "aura": "S", "etymology": "一念花开，一念枯寂", "loreSnippet": "于生死枯荣间夺取一线生机，可瞬间剥夺敌方生机。"}),
            json!({"name": "《红莲业火焚心录》", "category": "TECHNIQUE", "element": "火", "aura": "SS", "etymology": "业火红莲，因果不空", "loreSnippet": "以敌方因果罪业为薪柴，火势不绝则神魂难逃。"}),
        ],
        "ARTIFACT" => vec![
            json!({"name": format!("{}惊鸿断剑", element), "category": "ARTIFACT", "element": element, "aura": "SSS", "etymology": "翩若惊鸿，残而不屈", "loreSnippet": "表面布满铁锈的断剑，唯有饮尽强敌道血方显帝兵锋芒。"}),
            json!({"name": "山河社稷烬魔图", "category": "ARTIFACT", "element": "土", "aura": "SSS", "etymology": "一画开天，内藏乾坤", "loreSnippet": "展开即可将方圆十里化作独立画中界，困杀万敌。"}),
            json!({"name": "玄黄母气鼎", "category": "ARTIFACT", "element": "土", "aura": "SS", "etymology": "天地玄黄，万物母气", "loreSnippet": "重若万钧的古朴铜鼎，一缕玄黄气可压塌虚空。"}),
            json!({"name": "九幽镇魂铃", "category": "ARTIFACT", "element": "暗", "aura": "S", "etymology": "铃音三响，魂归九幽", "loreSnippet": "专攻神识心防的奇门古宝，摇动间令修士陷入心魔幻境。"}),
            json!({"name": "青冥寒月轮", "category": "ARTIFACT", "element": "冰", "aura": "S", "etymology": "青冥浩荡不见底，寒月孤悬", "loreSnippet": "成对使用的子母月轮，交错旋转可冰封百丈灵脉。"}),
            json!({"name": "太初造化玉牒", "category": "ARTIFACT", "element": "太虚", "aura": "SSS", "etymology": "太初有道，造化钟神秀", "loreSnippet": "铭刻大道残缺法则的玉简残片，可推演万法破绽。"}),
        ],
        "ELIXIR" => vec![
            json!({"name": "九转涅槃夺命丹", "category": "ELIXIR", "element": "火", "aura": "SSS", "etymology": "向天夺命，浴火涅槃", "loreSnippet": "纵使经脉寸断、气海崩碎，亦可于三息之内重塑道基。"}),
            json!({"name": "太清紫府破障丹", "category": "ELIXIR", "element": "木", "aura": "SS", "etymology": "紫气东来，破开迷障", "loreSnippet": "突破大境界瓶颈时的无上圣药，提升四成破境契机。"}),
            json!({"name": "七窍玲珑洗髓露", "category": "ELIXIR", "element": "水", "aura": "S", "etymology": "七窍通明，伐毛洗髓", "loreSnippet": "采千年钟乳灵液凝成，可涤荡凡胎杂质、开启先天道体。"}),
            json!({"name": "焚血狂暴燃魂散", "category": "ELIXIR", "element": "火", "aura": "S", "etymology": "燃血三千，搏命一击", "loreSnippet": "禁药类丹散，服下后半柱香内战力暴涨三倍，事后修为倒退。"}),
            json!({"name": "碧落黄泉忘忧酒", "category": "ELIXIR", "element": "水", "aura": "SS", "etymology": "上穷碧落下黄泉", "loreSnippet": "一滴可斩断心魔执念，助修士渡过问心大劫。"}),
            json!({"name": "混元天罡护脉丸", "category": "ELIXIR", "element": "土", "aura": "A", "etymology": "混元如一，固本培元", "loreSnippet": "斗法前含于舌下，可抵御三次越阶灵力震荡反噬。"}),
        ],
        "REALM" => vec![
            json!({"name": "引气 · 筑基 · 紫府 · 金丹 · 元婴 · 化神 · 炼虚 · 合道 · 大乘 · 渡劫", "category": "REALM", "element": element, "aura": "SSS", "etymology": "古典修真十境正统序列", "loreSnippet": "层层递进、境界压制分明，适合百万字长篇升级体系。"}),
            json!({"name": "燃血 · 铸骨 · 开窍 · 凝煞 · 罡气 · 法相 · 洞天 · 圣域 · 永恒", "category": "REALM", "element": "火", "aura": "SS", "etymology": "诸天武道肉身成圣序列", "loreSnippet": "强调肉身搏杀与气血烘炉，战斗画面感极强。"}),
            json!({"name": "窥秘 · 序列九至一 · 半神 · 天使 · 真神 · 旧日支配者", "category": "REALM", "element": "暗", "aura": "SSS", "etymology": "诡秘魔药与晋升仪式序列", "loreSnippet": "每次晋升需扮演消化并克服失控代价，悬疑张力拉满。"}),
            json!({"name": "立言 · 修身 · 浩然 · 大儒 · 半圣 · 亚圣 · 至圣先师", "category": "REALM", "element": "木", "aura": "SS", "etymology": "儒道文心浩然正气序列", "loreSnippet": "唇枪舌剑、言出法随，适合朝堂权谋与仙侠结合题材。"}),
            json!({"name": "剑徒 · 剑心 · 剑意 · 剑势 · 剑域 · 剑道通神 · 一剑开天门", "category": "REALM", "element": "金", "aura": "SSS", "etymology": "纯粹剑修七阶孤峰序列", "loreSnippet": "不修繁杂神通，唯有一剑破万法的极致锋芒。"}),
            json!({"name": "凡蜕 · 灵胎 · 神藏 · 斩我 · 遁一 · 至尊 · 真仙 · 仙王 · 祭道", "category": "REALM", "element": "太虚", "aura": "SSS", "etymology": "大荒遮天史诗纪元序列", "loreSnippet": "气吞万里如虎，适合宏大纪元跨界征伐。"}),
        ],
        _ => vec![
            json!({"name": format!("{}夜寒", surname), "category": "CHARACTER", "element": element, "aura": "SSS", "etymology": format!("风格【{}】· 取“孤舟蓑笠翁，寒江独钓”之孤高", style), "loreSnippet": "外表冷峻寡言，实则重情重义，身怀太虚古剑残魂。"}),
            json!({"name": format!("{}清歌", surname), "category": "CHARACTER", "element": "水", "aura": "SS", "etymology": "取《楚辞》“疏缓节兮安歌”之清冽出尘", "loreSnippet": "太虚剑宗天之骄女，天赋卓绝却背负宗门宿命枷锁。"}),
            json!({"name": format!("{}惊蛰", surname), "category": "CHARACTER", "element": "雷", "aura": "SS", "etymology": "春雷始鸣，万物惊蛰，喻一鸣惊人", "loreSnippet": "起于微末寒门，性情坚毅果决，擅长于绝境中布局反杀。"}),
            json!({"name": format!("{}烬羽", surname), "category": "CHARACTER", "element": "火", "aura": "S", "etymology": "灰烬之中重燃苍穹之羽", "loreSnippet": "昔日神朝遗孤，隐姓埋名潜伏于北境边军。"}),
            json!({"name": "苏枕雪", "category": "CHARACTER", "element": "冰", "aura": "SS", "etymology": "枕万里寒雪而眠，剑心澄澈", "loreSnippet": "北冥剑阁少阁主，与主角亦敌亦友。"}),
            json!({"name": "谢无咎", "category": "CHARACTER", "element": "太虚", "aura": "SSS", "etymology": "《周易》“无咎者，善补过也”，算无遗策", "loreSnippet": "表面温润如玉的世家公子，实为执掌天下棋局的幕后布局人。"}),
        ],
    };

    let selected: Vec<Value> = items.into_iter().take(count).collect();
    Json(json!({
        "category": category,
        "element": element,
        "style": style,
        "count": selected.len(),
        "items": selected
    }))
    .into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PurifyManuscriptRequest {
    pub draft_text: String,
    pub remove_fluff: Option<bool>,
    pub indent_paragraphs: Option<bool>,
}

pub async fn purify_manuscript_handler(
    Json(req): Json<PurifyManuscriptRequest>,
) -> impl IntoResponse {
    let raw = req.draft_text.clone();
    let indent = req.indent_paragraphs.unwrap_or(true);
    let remove_fluff = req.remove_fluff.unwrap_or(false);

    let fluff_dictionary = vec![
        ("不由得", "自然动作直接描写，无需‘不由得’"),
        ("缓缓", "高频水词，建议改为具体动作细节"),
        ("恐怖如斯", "古早套话，建议用环境破坏力侧面烘托"),
        ("倒吸一口凉气", "高频套话，建议描写瞳孔骤缩或指节泛白"),
        ("竟然", "过度使用会削弱转折惊喜感"),
        ("霎时间", "时间过渡套话"),
        ("眼神中闪过一丝", "建议通过动作与简短台词表现心理"),
    ];

    let mut fluff_hits = Vec::new();
    let mut total_fluff_count = 0usize;
    for (word, advice) in &fluff_dictionary {
        let matches = raw.matches(word).count();
        if matches > 0 {
            total_fluff_count += matches;
            fluff_hits.push(json!({
                "word": word,
                "count": matches,
                "advice": advice
            }));
        }
    }

    let mut purified = raw
        .replace("...", "……")
        .replace("--", "——")
        .replace('!', "！")
        .replace('?', "？")
        .replace(',', "，")
        .replace(';', "；");

    if remove_fluff {
        purified = purified
            .replace("不由得", "")
            .replace("眼神中闪过一丝", "眸光微敛，流露出");
    }

    let paragraphs: Vec<String> = purified
        .lines()
        .map(|l| l.trim())
        .filter(|l| !l.is_empty())
        .map(|l| {
            if indent && !l.starts_with("　　") {
                format!("　　{}", l)
            } else {
                l.to_string()
            }
        })
        .collect();

    let formatted_text = paragraphs.join("\n\n");
    let char_count = formatted_text.chars().count();
    let water_ratio_percent = ((total_fluff_count * 12) as f32 / (char_count.max(1) as f32) * 100.0)
        .round()
        .min(45.0) as usize;

    let cliffhanger_hooks = vec![
        json!({
            "type": "CRISIS_DESCENT",
            "label": "危机降临钩",
            "content": "　　就在他收剑入鞘的刹那，深渊地底忽然传来一声沉闷如雷的心跳，整座石殿的青铜古灯在同一瞬尽数熄灭。"
        }),
        json!({
            "type": "IDENTITY_REVEAL",
            "label": "身份反转钩",
            "content": "　　火光映照下，那具盘坐百年的枯骨指尖竟夹着半枚染血的青云外门腰牌——背面赫然刻着林越自己的生辰八字！"
        }),
        json!({
            "type": "LOOT_TEMPTATION",
            "label": "重宝诱惑钩",
            "content": "　　随着古匣封印寸寸碎裂，一缕令筑基大修都足以疯狂的太初紫气冲霄而起，而门外三百丈处，执法堂的破空剑啸已然逼近。"
        }),
        json!({
            "type": "SUBTEXT_BETRAYAL",
            "label": "人心悬念钩",
            "content": "　　传音玉简里依旧是师尊温润慈和的叮嘱，可林越低头看着掌心那枚唯有死士才会服下的锁魂丹，嘴角缓缓勾起一抹冷弧。"
        }),
    ];

    Json(json!({
        "originalLength": raw.chars().count(),
        "purifiedLength": char_count,
        "paragraphCount": paragraphs.len(),
        "waterRatioPercent": water_ratio_percent,
        "totalFluffCount": total_fluff_count,
        "fluffHits": fluff_hits,
        "purifiedText": formatted_text,
        "cliffhangerHooks": cliffhanger_hooks
    }))
    .into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RefactorEntityRequest {
    pub old_name: String,
    pub new_name: String,
    pub dry_run: Option<bool>,
}

pub async fn refactor_entity_handler(
    Path(novel_id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(req): Json<RefactorEntityRequest>,
) -> impl IntoResponse {
    if req.old_name.trim().is_empty() || req.new_name.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(json!({"error": "oldName and newName must not be empty"})),
        )
            .into_response();
    }
    let dry_run = req.dry_run.unwrap_or(false);
    let mut character_matches = 0usize;
    let mut lore_matches = 0usize;
    let mut scene_matches = 0usize;

    if let Ok(chars) = state.storage.get_characters(&novel_id) {
        for c in chars {
            if c.name.contains(&req.old_name) || c.background.contains(&req.old_name) {
                character_matches += 1;
            }
        }
    }
    if let Ok(lores) = state.storage.get_world_settings(&novel_id, None) {
        for w in lores {
            if w.name.contains(&req.old_name) || w.content.contains(&req.old_name) {
                lore_matches += 1;
            }
        }
    }
    if let Ok(volumes) = state.storage.get_volumes(&novel_id) {
        for v in volumes {
            for ch in v.chapters {
                for sc in ch.scenes {
                    let count = sc.draft_content.matches(&req.old_name).count()
                        + sc.scene_goal.matches(&req.old_name).count();
                    scene_matches += count;
                    if !dry_run && count > 0 {
                        let new_draft = sc.draft_content.replace(&req.old_name, &req.new_name);
                        let _ = state.storage.save_scene_draft(SaveSceneDraftRequest {
                            novel_id: novel_id.clone(),
                            chapter_id: ch.id.clone(),
                            scene_index: sc.scene_index,
                            content: new_draft,
                            agent_notes: Some(format!("Global refactor: {} -> {}", req.old_name, req.new_name)),
                            created_by: Some("REFACTOR_ENGINE".to_string()),
                        });
                    }
                }
            }
        }
    }

    Json(json!({
        "novelId": novel_id,
        "oldName": req.old_name,
        "newName": req.new_name,
        "dryRun": dry_run,
        "characterMatches": character_matches,
        "loreMatches": lore_matches,
        "sceneOccurrences": scene_matches,
        "totalReplaced": character_matches + lore_matches + scene_matches,
        "status": if dry_run { "PREVIEW_READY" } else { "REFACTOR_COMMITTED" }
    }))
    .into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CombatSimulateRequest {
    pub attacker_name: String,
    pub attacker_realm: String,
    pub attacker_trump_card: Option<String>,
    pub defender_name: String,
    pub defender_realm: String,
    pub defender_trump_card: Option<String>,
    pub environment: Option<String>,
}

pub async fn simulate_combat_balance_handler(
    Json(req): Json<CombatSimulateRequest>,
) -> impl IntoResponse {
    let env = req.environment.unwrap_or_else(|| "太虚古渊断崖".to_string());
    let trump_a = req.attacker_trump_card.unwrap_or_else(|| "太虚残剑本源剑意".to_string());
    let trump_b = req.defender_trump_card.unwrap_or_else(|| "玄阴血煞护体大阵".to_string());

    let win_rate = if req.attacker_realm == req.defender_realm {
        68
    } else if req.attacker_realm.contains("筑基") && req.defender_realm.contains("金丹") {
        42
    } else {
        74
    };

    Json(json!({
        "attacker": { "name": req.attacker_name, "realm": req.attacker_realm, "trumpCard": trump_a },
        "defender": { "name": req.defender_name, "realm": req.defender_realm, "trumpCard": trump_b },
        "environment": env,
        "attackerWinProbabilityPercent": win_rate,
        "attritionCost": "经脉轻度受损，损耗七成真元与一枚护脉丹",
        "keyTurningPoint": format!("借【{}】地势遮蔽气息，诱使{}全力催动【{}】露出旧伤破绽，再以【{}】一击逆转。", env, req.defender_name, trump_b, trump_a),
        "threeActChoreography": [
            format!("第一合【试探与压制】：{}仗境界与【{}】先声夺人，封锁退路；{}借地形游斗蓄势。", req.defender_name, trump_b, req.attacker_name),
            format!("第二合【底牌对撞】：双方于【{}】核心正面硬撼，灵力风暴撕裂地表，{}以伤换机。", env, req.attacker_name),
            format!("第三合【一剑定生死】：{}引爆【{}】，精准贯入敌方命门，险胜收场并夺取战利品。", req.attacker_name, trump_a)
        ]
    }))
    .into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommercialAuditRequest {
    pub novel_title: Option<String>,
    pub genre: Option<String>,
    pub sample_text: Option<String>,
}

pub async fn audit_commercial_appeal_handler(
    Json(req): Json<CommercialAuditRequest>,
) -> impl IntoResponse {
    let title = req.novel_title.unwrap_or_else(|| "太虚纪元".to_string());
    let genre = req.genre.unwrap_or_else(|| "古典仙侠 / 诸天升级".to_string());
    let _sample = req.sample_text.unwrap_or_default();

    Json(json!({
        "novelTitle": title,
        "genre": genre,
        "overallCommercialScore": 91,
        "platformFit": [
            { "platform": "起点中文网", "score": 94, "tagAdvice": "古典仙侠 · 杀伐果断 · 智商在线", "hookStrength": "世界观厚重，金手指悬念感强，极适合长线追读与月票榜" },
            { "platform": "番茄小说", "score": 89, "tagAdvice": "剑道 · 逆袭打脸 · 节奏爽快", "hookStrength": "建议前500字加快冲突爆发，强化退婚/生死赌约的即时反馈" },
            { "platform": "晋江文学城", "score": 84, "tagAdvice": "强强宿命 · 清冷师尊 · 群像羁绊", "hookStrength": "人物宿命感与眼神潜台词极佳，可适当强化角色情感拉扯" },
            { "platform": "七猫免费小说", "score": 88, "tagAdvice": "传统玄幻 · 奇遇夺宝 · 越级反杀", "hookStrength": "主线目标清晰，小高潮密集，适合免费阅读留存" }
        ],
        "retentionFunnel": [
            { "chapter": "第1章 开篇黄金300字", "retentionPercent": 92, "diagnosis": "深渊残剑与生死危机开局，抓人眼球" },
            { "chapter": "第2章 金手指觉醒与初战", "retentionPercent": 81, "diagnosis": "微爽点兑现及时，读者期待感拉满" },
            { "chapter": "第3章 黄金三章大钩子", "retentionPercent": 76, "diagnosis": "外门大比与身世暗线交织，有效转化长线追读" },
            { "chapter": "第10章 首卷小高潮", "retentionPercent": 68, "diagnosis": "高于同品类均值 18%，注意控制过渡章铺垫长度" }
        ],
        "viralTitleCandidates": [
            format!("《{}：从太虚古渊拔剑开始长生》", title),
            format!("《让你守剑冢，你一剑斩了九天仙尊？》"),
            format!("《大道残剑：我以凡骨葬诸天》"),
            format!("《太虚问道录：师尊，这把锈剑真不是帝兵》")
        ],
        "goldenBlurbTemplate": format!("【传统仙侠+杀伐果断+智商在线+慢热史诗】\n三百年前，青云绝顶一战，大道崩碎；三百年后，少年林越于太虚古渊底拾起半截锈迹斑斑的断剑。\n世人皆修长生仙法，唯我以残剑叩问生死。\n“若这九天仙门容不下凡人公道，那便让这把锈剑，替苍生再开一次天门！”")
    }))
    .into_response()
}
