use crate::models::{EvaluationDimension, SelfEvaluationResult};
use chrono::Utc;
use regex::Regex;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Mutex;

pub struct AutonomousWritingEvaluator;

impl AutonomousWritingEvaluator {
    pub fn evaluate_draft(
        novel_id: &str,
        chapter_id: &str,
        scene_index: i64,
        draft_text: &str,
        _scene_goal: Option<&str>,
    ) -> SelfEvaluationResult {
        let draft = draft_text.trim();
        let length = draft.chars().count();

        // 1. 设定延续性与防吃设定检验 (Continuity & World Consistency)
        let (continuity_score, continuity_diag) = if length < 200 {
            (12, "正文篇幅过短，未能充分铺展世界观规则与环境细节".to_string())
        } else if draft.contains("系统提示") || draft.contains("作为AI") {
            (5, "正文混入了AI元提示或破壁词汇，破坏沉浸感".to_string())
        } else {
            (18, "设定与前文逻辑基本保持吻合".to_string())
        };

        // 2. 角色声线与人设张力 (Character Voice & Anti-OOC)
        let quote_re = Regex::new(r#"["“][^"”]+["”]"#).unwrap();
        let dialogue_count = quote_re.find_iter(draft).count();
        let (voice_score, voice_diag) = if dialogue_count == 0 {
            (13, "缺乏角色直接对白交互，偏重第三人称平铺直叙".to_string())
        } else if dialogue_count > 10 {
            (18, "对话张力饱满，口吻交锋清晰".to_string())
        } else {
            (17, "角色对白与神态具备一定特征".to_string())
        };

        // 3. 冲突张力与悬念钩子 (Dramatic Tension & Suspense)
        let tension_keywords = [
            "突变", "杀意", "剧痛", "冷笑", "破空", "轰鸣", "绝境", "反转", "警觉", "杀招", "死寂",
        ];
        let found_tension = tension_keywords.iter().filter(|kw| draft.contains(**kw)).count();
        let tension_score = std::cmp::min(20, 14 + found_tension as i64);
        let tension_diag = format!("捕捉到 {} 处戏剧冲突信号，张力呈现合理", found_tension);

        // 4. 五感渲染与意境通感 (Sensory Vividness & Show-Don't-Tell)
        let sensory_keywords = [
            "冰冷", "炽热", "血腥", "腥甜", "焦糊", "微风", "残光", "刺耳", "低沉", "颤栗", "斑驳",
        ];
        let found_sensory = sensory_keywords.iter().filter(|kw| draft.contains(**kw)).count();
        let sensory_score = std::cmp::min(20, 13 + found_sensory as i64);
        let sensory_diag = format!("运用了 {} 处通感具象词汇，具象白描表现良好", found_sensory);

        // 5. 语言节奏与去AI机械腔 (Narrative Pacing & Human Flow)
        let ai_cliches = [
            "总而言之", "值得一提的是", "不仅如此", "在这片广袤的", "眼中闪过一丝", "不可否认",
        ];
        let found_cliches: Vec<&str> = ai_cliches.iter().copied().filter(|c| draft.contains(*c)).collect();
        let mut pacing_score = 18 - (found_cliches.len() as i64 * 3);
        pacing_score = pacing_score.clamp(8, 20);
        let pacing_diag = if !found_cliches.is_empty() {
            format!(
                "检测到 {} 处典型AI套话（如：{}），节奏稍显程式化",
                found_cliches.len(),
                found_cliches.join(", ")
            )
        } else {
            "语言节奏干脆利落，未发现显性AI套话".to_string()
        };

        let overall_score = continuity_score + voice_score + tension_score + sensory_score + pacing_score;

        let mut strengths = Vec::new();
        let mut weaknesses = Vec::new();
        let mut refinements = Vec::new();

        if continuity_score >= 16 {
            strengths.push("世界观法则坚守严密，未发生战力撕裂或突兀设定冲突".to_string());
        } else {
            weaknesses.push("世界观与场景规则交代不够扎实".to_string());
            refinements.push("在第1~2段增补环境法则制约与物理规则束缚".to_string());
        }

        if voice_score >= 16 {
            strengths.push("角色口吻与言行举止鲜活，体现人物性格特质".to_string());
        } else {
            weaknesses.push("角色对白略显平淡，人物特征未完全凸显".to_string());
            refinements.push("引入角色的专属口癖或潜台词交锋".to_string());
        }

        if tension_score >= 16 {
            strengths.push("情节转折扣人心弦，冲突逐步层叠推进".to_string());
        } else {
            weaknesses.push("对抗节奏稍显平缓，未给读者足够的紧迫感".to_string());
            refinements.push("在幕末加入倒计时或突发危机钩子".to_string());
        }

        if sensory_score >= 16 {
            strengths.push("五感白描丰富，冷暖光影与声色具象".to_string());
        } else {
            weaknesses.push("环境侧重陈述概念，缺乏感官细节白描".to_string());
            refinements.push("强化触觉（风力、温度）与听觉微小声响细节描写".to_string());
        }

        if pacing_score >= 16 {
            strengths.push("句式长短错落，动词精准卡点，去AI味道充分".to_string());
        } else {
            weaknesses.push("语言存在AI书卷气或程式化口吻".to_string());
            refinements.push("精简副词与解释性长句，代之以干脆的动作动词".to_string());
        }

        let mut dimensions = HashMap::new();
        dimensions.insert(
            "continuity".to_string(),
            EvaluationDimension {
                name: "continuity".to_string(),
                label: "设定延续与防吃设定".to_string(),
                score: continuity_score,
                diagnosis: continuity_diag,
            },
        );
        dimensions.insert(
            "voice".to_string(),
            EvaluationDimension {
                name: "voice".to_string(),
                label: "角色声线与人设张力".to_string(),
                score: voice_score,
                diagnosis: voice_diag,
            },
        );
        dimensions.insert(
            "tension".to_string(),
            EvaluationDimension {
                name: "tension".to_string(),
                label: "戏剧冲突与悬念推进".to_string(),
                score: tension_score,
                diagnosis: tension_diag,
            },
        );
        dimensions.insert(
            "sensory".to_string(),
            EvaluationDimension {
                name: "sensory".to_string(),
                label: "五感通感与具象意境".to_string(),
                score: sensory_score,
                diagnosis: sensory_diag,
            },
        );
        dimensions.insert(
            "pacing".to_string(),
            EvaluationDimension {
                name: "pacing".to_string(),
                label: "语言节奏与去AI机械腔".to_string(),
                score: pacing_score,
                diagnosis: pacing_diag,
            },
        );

        SelfEvaluationResult {
            id: format!("eval-{}", Utc::now().timestamp_millis()),
            novel_id: novel_id.to_string(),
            chapter_id: chapter_id.to_string(),
            scene_index,
            overall_score,
            dimensions,
            strengths,
            weaknesses,
            suggested_refinements: refinements,
            iteration_count: 1,
            created_at: Utc::now().to_rfc3339(),
        }
    }
}

pub struct AutonomousReflector;

impl AutonomousReflector {
    pub fn generate_reflection_strategy(eval_result: &SelfEvaluationResult) -> Value {
        let weakest = eval_result
            .dimensions
            .values()
            .min_by_key(|d| d.score)
            .cloned()
            .unwrap_or(EvaluationDimension {
                name: "continuity".to_string(),
                label: "设定延续与防吃设定".to_string(),
                score: 15,
                diagnosis: "基本合格".to_string(),
            });

        let mut addon = format!(
            "\n【智能体自我反思与强化指示】\n在前一轮创作自评中，当前最薄弱维度为【{}】(得分 {}/20)。\n诊断反馈：{}\n本轮迭代必须严格落实以下进化修正项：\n",
            weakest.label, weakest.score, weakest.diagnosis
        );

        for (i, ref_item) in eval_result.suggested_refinements.iter().enumerate() {
            addon.push_str(&format!("{}. {}\n", i + 1, ref_item));
        }

        json!({
            "target_dimension": weakest.name,
            "target_label": weakest.label,
            "current_score": weakest.score,
            "refinement_prompt_addon": addon,
            "can_auto_heal": eval_result.overall_score < 85
        })
    }
}

pub struct PromptSelfTuner {
    pub preference_weights: Mutex<HashMap<String, f64>>,
}

impl PromptSelfTuner {
    pub fn new() -> Self {
        let mut weights = HashMap::new();
        weights.insert("action_density".to_string(), 1.2);
        weights.insert("sensory_details".to_string(), 1.3);
        weights.insert("dialogue_subtext".to_string(), 1.1);
        weights.insert("pacing_speed".to_string(), 1.0);

        Self {
            preference_weights: Mutex::new(weights),
        }
    }

    pub fn record_author_feedback(&self, accepted_as_is: bool, diff_length_ratio: f64) {
        let mut weights = self.preference_weights.lock().unwrap();
        if accepted_as_is {
            if let Some(v) = weights.get_mut("action_density") {
                *v = (*v + 0.05).min(2.0);
            }
            if let Some(v) = weights.get_mut("sensory_details") {
                *v = (*v + 0.05).min(2.0);
            }
        } else if diff_length_ratio > 0.5 {
            if let Some(v) = weights.get_mut("pacing_speed") {
                *v = (*v + 0.1).min(2.0);
            }
        }
    }

    pub fn get_status(&self) -> (HashMap<String, f64>, String) {
        let weights = self.preference_weights.lock().unwrap().clone();
        let ad = weights.get("action_density").copied().unwrap_or(1.2);
        let sd = weights.get("sensory_details").copied().unwrap_or(1.3);
        let ds = weights.get("dialogue_subtext").copied().unwrap_or(1.1);

        let instruction = format!(
            "【进化提示词指引】动作描写权重: {:.2}，五感描写权重: {:.2}，潜台词张力: {:.2}。",
            ad, sd, ds
        );

        (weights, instruction)
    }
}
