use crate::models::{ActionDirectorRequest, Character, CharacterRelation, DialogueDoctorRequest, Foreshadowing, Volume};
use serde_json::{json, Value};
use std::collections::HashMap;

pub struct AnalyticsCalculator;

impl AnalyticsCalculator {
    pub fn calculate_tension_curve(novel_id: &str, volumes: &[Volume]) -> Value {
        let keywords_high = [
            "突变", "杀意", "剧痛", "死寂", "绝境", "轰鸣", "破空", "血光", "杀招", "断裂",
        ];
        let keywords_low = [
            "茶香", "沉吟", "微风", "缓步", "思忖", "打坐", "闭目", "安详",
        ];

        let mut tension_points = Vec::new();

        for v in volumes {
            for c in &v.chapters {
                for sc in &c.scenes {
                    let text = &sc.draft_content;
                    let mut base_tension = 45;
                    if !text.is_empty() {
                        let high_hits: usize = keywords_high.iter().map(|kw| text.matches(kw).count()).sum();
                        let low_hits: usize = keywords_low.iter().map(|kw| text.matches(kw).count()).sum();
                        let score = 50 + (high_hits as i64 * 6) - (low_hits as i64 * 3);
                        base_tension = score.clamp(20, 95);
                    }

                    tension_points.push(json!({
                        "chapter_index": c.chapter_index,
                        "scene_index": sc.scene_index,
                        "label": format!("第{}章·幕{}", c.chapter_index, sc.scene_index),
                        "scene_goal": sc.scene_goal,
                        "tension": base_tension,
                        "word_count": text.chars().count()
                    }));
                }
            }
        }

        json!({
            "novel_id": novel_id,
            "total_points": tension_points.len(),
            "curve": tension_points
        })
    }

    pub fn calculate_relationship_graph(characters: &[Character], relations: &[CharacterRelation]) -> Value {
        let nodes: Vec<Value> = characters
            .iter()
            .map(|c| {
                let bg_preview = if c.background.chars().count() > 60 {
                    let mut s: String = c.background.chars().take(60).collect();
                    s.push_str("...");
                    s
                } else {
                    c.background.clone()
                };

                json!({
                    "id": c.id,
                    "name": c.name,
                    "role_type": c.role_type,
                    "gender": c.gender,
                    "background": bg_preview
                })
            })
            .collect();

        let links: Vec<Value> = relations
            .iter()
            .map(|r| {
                json!({
                    "source": r.from_character_id,
                    "target": r.to_character_id,
                    "relation_type": r.relation_type,
                    "affinity_score": r.affinity_score,
                    "description": r.description
                })
            })
            .collect();

        json!({
            "nodes": nodes,
            "links": links
        })
    }

    pub fn calculate_timeline_matrix(novel_id: &str, volumes: &[Volume], characters: &[Character]) -> Value {
        let char_map: HashMap<String, String> = characters.iter().map(|c| (c.id.clone(), c.name.clone())).collect();
        let mut events = Vec::new();

        for v in volumes {
            for c in &v.chapters {
                for sc in &c.scenes {
                    let char_names: Vec<String> = sc
                        .involved_character_ids
                        .iter()
                        .map(|cid| char_map.get(cid).cloned().unwrap_or_else(|| "未知".to_string()))
                        .collect();

                    events.push(json!({
                        "id": sc.id,
                        "chapter_index": c.chapter_index,
                        "scene_index": sc.scene_index,
                        "location": if sc.location.is_empty() { "未定场景" } else { &sc.location },
                        "goal": sc.scene_goal,
                        "conflict": sc.conflict,
                        "turn_point": sc.turn_point,
                        "outcome": sc.outcome,
                        "characters": char_names,
                        "has_draft": !sc.draft_content.is_empty()
                    }));
                }
            }
        }

        json!({
            "novel_id": novel_id,
            "events": events
        })
    }

    pub fn calculate_foreshadowing_radar(foreshadowings: &[Foreshadowing], volumes: &[Volume]) -> Value {
        let mut current_chapter_idx = 1;
        for v in volumes {
            for c in &v.chapters {
                current_chapter_idx = current_chapter_idx.max(c.chapter_index);
            }
        }

        let mut planted_count = 0;
        let mut fermenting_count = 0;
        let mut resolved_count = 0;
        let mut overdue_count = 0;
        let mut items = Vec::new();

        for f in foreshadowings {
            let planted = f.planted_chapter_index.unwrap_or(1);
            let planned = f.planned_resolve_chapter_index.unwrap_or(planted + 10);
            let is_overdue = f.status != "RESOLVED" && current_chapter_idx > planned;

            if is_overdue {
                overdue_count += 1;
            }
            match f.status.as_str() {
                "PLANTED" => planted_count += 1,
                "FERMENTING" => fermenting_count += 1,
                "RESOLVED" => resolved_count += 1,
                _ => {}
            }

            let span = (planned - planted).max(1);
            let urgency = (((current_chapter_idx - planted) as f64 / span as f64) * 100.0) as i64;

            items.push(json!({
                "id": f.id,
                "title": f.title,
                "clue": f.clue_description,
                "planted_idx": planted,
                "planned_idx": planned,
                "current_idx": current_chapter_idx,
                "status": f.status,
                "is_overdue": is_overdue,
                "urgency": urgency.clamp(0, 100)
            }));
        }

        json!({
            "planted_count": planted_count,
            "fermenting_count": fermenting_count,
            "resolved_count": resolved_count,
            "overdue_count": overdue_count,
            "items": items
        })
    }

    pub fn diagnose_dialogue(req: DialogueDoctorRequest) -> Value {
        let speaker = req.speaker_name.unwrap_or_else(|| "角色".to_string());
        let personality = req.speaker_personality.unwrap_or_else(|| "冷峻果断".to_string());
        let original = req.dialogue_text.trim();

        let suggested = format!(
            "“……”{}眉骨微压，并未直接回应，指节在剑鞘上轻叩了两声，“有些话，你该问剑，而不是问我。”",
            speaker
        );

        json!({
            "speaker": speaker,
            "original": original,
            "diagnosis": format!("原文直白度较高，角色【{}】的潜台词张力有提升空间。", personality),
            "subtext_interpretation": "表面冷漠，实则已锁定对方破绽，并施加心理威慑。",
            "suggested_dialogue": suggested,
            "action_beats": [
                "说话前停顿半拍，移开视线",
                "右手食指轻敲刀鞘边缘",
                "嘴角浮起一丝若有若无的冷弧"
            ]
        })
    }

    pub fn direct_action(req: ActionDirectorRequest) -> Value {
        let realm_a = req.realm_a.unwrap_or_else(|| "通玄境".to_string());
        let realm_b = req.realm_b.unwrap_or_else(|| "元婴境".to_string());
        let terrain = req.terrain.unwrap_or_else(|| "崩塌的古殿废墟".to_string());
        let core_move = req.core_move.unwrap_or_else(|| "以死相搏的近身残剑反杀".to_string());

        let tactical_setup = format!(
            "在【{}】的恶劣环境下，{}（{}）面对境界更高的{}（{}），不可力敌，必须利用地形以险求胜。",
            terrain, req.combatant_a, realm_a, req.combatant_b, realm_b
        );

        let sequence_beats = vec![
            json!({
                "beat": 1,
                "phase": "试探与威压",
                "detail": format!("{}以浑厚真元压迫，碎石腾空，将{}逼退至石柱死角。", req.combatant_b, req.combatant_a)
            }),
            json!({
                "beat": 2,
                "phase": "受创诱敌",
                "detail": format!("{}假意真元溃散，硬受一记余波震击，嘴角溢血，诱使对方贴近补刀。", req.combatant_a)
            }),
            json!({
                "beat": 3,
                "phase": "破空逆转",
                "detail": format!("{}！借石柱坍塌扬尘遮蔽，身形贴地滑斩，残剑自不可思议之角度直刺死穴！", core_move)
            })
        ];

        let sensory_elements = vec![
            "骨骼不堪重负的爆鸣声",
            "剑尖撕裂空气的凄厉啸叫",
            "飞溅在残砖上的滚烫血珠",
        ];

        json!({
            "tactical_setup": tactical_setup,
            "sequence_beats": sequence_beats,
            "sensory_elements": sensory_elements
        })
    }

    pub fn typeset_novel(novel_title: &str, volumes: &[Volume], format: &str) -> Value {
        let author = "Timskt · 墨枢 InkVerse";
        let mut chapters_output = Vec::new();
        let mut total_words = 0;

        for v in volumes {
            for c in &v.chapters {
                let scenes_text: Vec<String> = c
                    .scenes
                    .iter()
                    .filter(|s| !s.draft_content.is_empty())
                    .map(|s| s.draft_content.clone())
                    .collect();

                let full_chap_text = scenes_text.join("\n\n");
                let word_count = full_chap_text.chars().count();
                total_words += word_count;

                chapters_output.push(json!({
                    "volume": v.title,
                    "chapter_index": c.chapter_index,
                    "title": c.title,
                    "content": full_chap_text,
                    "words": word_count
                }));
            }
        }

        if format == "txt" {
            let mut doc = format!("《{}》\n作者：{}\n总字数：{}\n\n", novel_title, author, total_words);
            for ch in &chapters_output {
                let c_idx = ch.get("chapter_index").and_then(|v| v.as_i64()).unwrap_or(1);
                let c_title = ch.get("title").and_then(|v| v.as_str()).unwrap_or("");
                let c_content = ch.get("content").and_then(|v| v.as_str()).unwrap_or("");

                doc.push_str(&format!("第{}章 {}\n\n", c_idx, c_title));
                for p in c_content.split("\n\n") {
                    let trimmed = p.trim();
                    if !trimmed.is_empty() {
                        doc.push_str(&format!("　　{}\n", trimmed));
                    }
                }
                doc.push_str("\n\n");
            }

            return json!({
                "format": "txt",
                "content": doc,
                "total_words": total_words
            });
        }

        json!({
            "format": format,
            "title": novel_title,
            "chapters_count": chapters_output.len(),
            "total_words": total_words,
            "chapters": chapters_output
        })
    }
}
