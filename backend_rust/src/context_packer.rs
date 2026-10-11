use serde_json::{json, Value};

pub struct ContextPacker {
    pub max_token_budget: i64,
}

impl ContextPacker {
    pub fn new(max_token_budget: i64) -> Self {
        Self { max_token_budget }
    }

    pub fn estimate_tokens(&self, text: &str) -> i64 {
        if text.is_empty() {
            return 0;
        }
        let cn_chars = text.chars().filter(|c| ('\u{4e00}'..='\u{9fff}').contains(c)).count() as f64;
        let other_chars = text.chars().count() as f64 - cn_chars;
        (cn_chars * 1.5 + other_chars * 0.5) as i64
    }

    pub fn pack_scene_context(
        &self,
        novel_title: &str,
        novel_genre: &str,
        chapter_index: i64,
        scene_goal: &str,
        scene_conflict: &str,
        involved_characters: &[Value],
        world_rules: &[Value],
        active_foreshadowings: &[Value],
        previous_scene_summary: &str,
    ) -> Value {
        let mut budget_left = self.max_token_budget;
        let mut packed_sections: Vec<Value> = Vec::new();

        // Tier 1 (极高优先级，必须包含): 场景核心节拍与当前幕任务
        let mut tier1_text = format!(
            "【小说】《{}》（{}）\n【当前章节】第 {} 章\n【本幕目标】{}\n【核心冲突】{}\n",
            novel_title, novel_genre, chapter_index, scene_goal, scene_conflict
        );
        if !previous_scene_summary.is_empty() {
            tier1_text.push_str(&format!("【承接上文节拍】{}\n", previous_scene_summary));
        }

        let tier1_tokens = self.estimate_tokens(&tier1_text);
        budget_left -= tier1_tokens;
        packed_sections.push(json!({
            "title": "核心场景节拍",
            "content": tier1_text
        }));

        // Tier 2 (高优先级): 登场角色的即时生理/心理/战力状态机
        let mut char_lines = Vec::new();
        for c in involved_characters {
            let name = c.get("name").and_then(|v| v.as_str()).unwrap_or("未名角色");
            let state = c.get("state").unwrap_or(&Value::Null);
            let combat = state.get("combat_power").and_then(|v| v.as_str()).unwrap_or("常态");
            let health = state.get("health_status").and_then(|v| v.as_str()).unwrap_or("HEALTHY");
            let loc = state.get("location").and_then(|v| v.as_str()).unwrap_or("场中");
            let summary = state.get("state_summary").and_then(|v| v.as_str()).unwrap_or("");
            char_lines.push(format!("- {} (战力: {}, 状态: {}, 位置: {}): {}", name, combat, health, loc, summary));
        }

        let tier2_text = format!(
            "【登场角色即时状态】\n{}",
            if char_lines.is_empty() {
                "无特定限制角色".to_string()
            } else {
                char_lines.join("\n")
            }
        );
        let tier2_tokens = self.estimate_tokens(&tier2_text);
        if budget_left >= tier2_tokens {
            budget_left -= tier2_tokens;
            packed_sections.push(json!({
                "title": "登场角色状态",
                "content": tier2_text
            }));
        }

        // Tier 3 (中优先级): 严格世界观法则约束与边界防线 (按 priority 降序)
        let mut sorted_rules = world_rules.to_vec();
        sorted_rules.sort_by(|a, b| {
            let pa = a.get("priority").and_then(|v| v.as_i64()).unwrap_or(50);
            let pb = b.get("priority").and_then(|v| v.as_i64()).unwrap_or(50);
            pb.cmp(&pa)
        });

        let mut rule_lines = Vec::new();
        for r in &sorted_rules {
            let name = r.get("name").and_then(|v| v.as_str()).unwrap_or("法则");
            let content = r.get("content").and_then(|v| v.as_str()).unwrap_or("");
            let line = format!("- [{}]: {}", name, content);
            let tokens = self.estimate_tokens(&line);
            if budget_left >= tokens {
                budget_left -= tokens;
                rule_lines.push(line);
            } else {
                break;
            }
        }

        if !rule_lines.is_empty() {
            let tier3_text = format!("【核心世界观法则约束】\n{}", rule_lines.join("\n"));
            packed_sections.push(json!({
                "title": "世界观法则",
                "content": tier3_text
            }));
        }

        // Tier 4 (低优先级): 本章应触动的伏笔线索
        let mut fore_lines = Vec::new();
        for f in active_foreshadowings {
            let title = f.get("title").and_then(|v| v.as_str()).unwrap_or("伏笔");
            let clue = f.get("clue_description").and_then(|v| v.as_str()).unwrap_or("");
            let line = format!("- {}: {}", title, clue);
            let tokens = self.estimate_tokens(&line);
            if budget_left >= tokens {
                budget_left -= tokens;
                fore_lines.push(line);
            }
        }

        if !fore_lines.is_empty() {
            let tier4_text = format!("【活跃伏笔关注】\n{}", fore_lines.join("\n"));
            packed_sections.push(json!({
                "title": "伏笔线索",
                "content": tier4_text
            }));
        }

        let assembled: Vec<&str> = packed_sections
            .iter()
            .filter_map(|s| s.get("content").and_then(|v| v.as_str()))
            .collect();
        let assembled_system_prompt = assembled.join("\n\n");
        let total_tokens = self.estimate_tokens(&assembled_system_prompt);

        json!({
            "assembled_prompt": assembled_system_prompt,
            "estimated_tokens": total_tokens,
            "budget_left": budget_left,
            "sections_count": packed_sections.len(),
            "sections": packed_sections
        })
    }
}
