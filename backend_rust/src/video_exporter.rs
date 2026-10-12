use crate::models::{ExportVideoPromptRequest, ExportVideoPromptResponse, VideoStoryboard};
use chrono::Utc;
use serde_json::{json, Value};

pub struct VideoExporter;

impl VideoExporter {
    pub fn export_prompts(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> ExportVideoPromptResponse {
        let platform = req.platform.to_uppercase();
        let total_duration = if storyboard.total_duration_seconds > 0.0 {
            storyboard.total_duration_seconds
        } else {
            storyboard.shots.iter().map(|s| s.duration_seconds).sum()
        };
        let shots_count = storyboard.shots.len() as i64;

        let (formatted_content, metadata) = match platform.as_str() {
            "SORA" => Self::format_sora(storyboard, req),
            "KLING" => Self::format_kling(storyboard, req),
            "RUNWAY_GEN3" | "RUNWAY" => Self::format_runway_gen3(storyboard, req),
            "HAILUO_MINIMAX" | "HAILUO" | "MINIMAX" => Self::format_hailuo_minimax(storyboard, req),
            "MIDJOURNEY" | "FLUX" => Self::format_midjourney_flux(storyboard, req),
            "COMFYUI_JSON" | "COMFYUI" => Self::format_comfyui(storyboard, req),
            _ => Self::format_sora(storyboard, req),
        };

        ExportVideoPromptResponse {
            platform,
            formatted_content,
            shots_count,
            total_duration,
            metadata,
        }
    }

    fn format_sora(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> (String, Value) {
        let shots_json: Vec<Value> = storyboard
            .shots
            .iter()
            .map(|shot| {
                let mut obj = json!({
                    "shot_number": shot.shot_number,
                    "scene_id": shot.scene_id,
                    "duration_seconds": shot.duration_seconds,
                    "shot_type": shot.shot_type,
                    "camera_movement": shot.camera_movement,
                    "visual_prompt": shot.visual_prompt,
                    "motion_prompt": shot.motion_prompt,
                    "lighting": shot.lighting,
                    "character_references": shot.character_references,
                    "full_prompt": format!(
                        "{}, {}, lighting: {}, motion: {}",
                        shot.visual_prompt,
                        Self::map_shot_type(&shot.shot_type),
                        shot.lighting,
                        shot.motion_prompt
                    ),
                });
                if req.include_negative && !shot.negative_prompt.is_empty() {
                    obj["negative_prompt"] = json!(shot.negative_prompt);
                }
                if !shot.sound_cue.is_empty() {
                    obj["audio_sound_cue"] = json!(shot.sound_cue);
                }
                if !shot.dialogue_cue.is_empty() {
                    obj["audio_dialogue"] = json!(shot.dialogue_cue);
                }
                obj
            })
            .collect();

        let root = json!({
            "platform": "SORA",
            "storyboard_id": storyboard.id,
            "storyboard_title": storyboard.title,
            "aspect_ratio": storyboard.aspect_ratio,
            "total_duration_seconds": storyboard.total_duration_seconds,
            "batch_tasks": shots_json,
        });

        let formatted = serde_json::to_string_pretty(&root).unwrap_or_default();
        (
            formatted,
            json!({
                "target_engine": "OpenAI Sora Video-1.0 Batch",
                "aspect_ratio": storyboard.aspect_ratio,
                "batch_mode": true,
                "exported_at": Utc::now().to_rfc3339()
            }),
        )
    }

    fn format_kling(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> (String, Value) {
        let tasks: Vec<Value> = storyboard
            .shots
            .iter()
            .map(|shot| {
                let camera_cfg = json!({
                    "horizontal": match shot.camera_movement.as_str() {
                        "PAN_LEFT" => -5,
                        "PAN_RIGHT" => 5,
                        _ => 0,
                    },
                    "zoom": match shot.camera_movement.as_str() {
                        "DOLLY_IN" | "VERTIGO_ZOOM" => 5,
                        "DOLLY_OUT" => -5,
                        _ => 0,
                    },
                    "mode": shot.camera_movement,
                });

                let mut item = json!({
                    "shot_index": shot.shot_number,
                    "prompt": format!("{}, {}, {}", shot.visual_prompt, shot.motion_prompt, shot.lighting),
                    "camera_control": camera_cfg,
                    "duration": shot.duration_seconds.round() as i64,
                    "cfg_scale": 0.5,
                    "mode": "pro",
                });
                if req.include_negative && !shot.negative_prompt.is_empty() {
                    item["negative_prompt"] = json!(shot.negative_prompt);
                }
                item
            })
            .collect();

        let root = json!({
            "platform": "KLING",
            "storyboard_id": storyboard.id,
            "title": storyboard.title,
            "aspect_ratio": storyboard.aspect_ratio,
            "batch": tasks,
        });

        let formatted = serde_json::to_string_pretty(&root).unwrap_or_default();
        (
            formatted,
            json!({
                "target_engine": "Kling 1.5 HD Video API",
                "aspect_ratio": storyboard.aspect_ratio,
                "batch_count": storyboard.shots.len(),
                "exported_at": Utc::now().to_rfc3339()
            }),
        )
    }

    fn format_runway_gen3(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> (String, Value) {
        let mut lines = Vec::new();
        lines.push(format!("// Runway Gen-3 Alpha Prompt Suite - {}", storyboard.title));
        lines.push(format!(
            "// Aspect Ratio: {} | Total Duration: {:.1}s\n",
            storyboard.aspect_ratio, storyboard.total_duration_seconds
        ));

        for shot in &storyboard.shots {
            let camera_desc = Self::map_runway_camera(&shot.camera_movement, &shot.shot_type);
            let prompt_line = if req.include_camera_brackets {
                format!("[Camera: {}] {}", camera_desc, shot.visual_prompt)
            } else {
                shot.visual_prompt.clone()
            };

            let mut shot_block = format!(
                "Shot #{:02} ({:.1}s):\n{}",
                shot.shot_number, shot.duration_seconds, prompt_line
            );
            if !shot.motion_prompt.is_empty() {
                shot_block.push_str(&format!(" Motion: {}.", shot.motion_prompt));
            }
            if !shot.lighting.is_empty() {
                shot_block.push_str(&format!(" Lighting: {}.", shot.lighting));
            }
            if req.include_negative && !shot.negative_prompt.is_empty() {
                shot_block.push_str(&format!("\nNegative: {}", shot.negative_prompt));
            }
            lines.push(shot_block);
        }

        let formatted = lines.join("\n\n");
        (
            formatted,
            json!({
                "target_engine": "Runway Gen-3 Alpha Bracketed Director",
                "bracketed_syntax": req.include_camera_brackets,
                "aspect_ratio": storyboard.aspect_ratio,
                "exported_at": Utc::now().to_rfc3339()
            }),
        )
    }

    fn format_hailuo_minimax(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> (String, Value) {
        let mut lines = Vec::new();
        lines.push(format!(
            "【MiniMax / 海螺 AI 高稳定性动态分镜指令】 - {}",
            storyboard.title
        ));
        lines.push(format!(
            "画幅比例: {} | 总时长: {:.1}秒\n",
            storyboard.aspect_ratio, storyboard.total_duration_seconds
        ));

        for shot in &storyboard.shots {
            let mut block = format!(
                "分镜 #{:02} ({:.1}s)：\n【主体构图】{} ({})\n【稳定动态】{}，{}，运镜高度平稳，物理规律连贯无抖动\n【光影环境】{}",
                shot.shot_number,
                shot.duration_seconds,
                shot.visual_prompt,
                Self::map_shot_type(&shot.shot_type),
                Self::map_chinese_camera(&shot.camera_movement),
                shot.motion_prompt,
                shot.lighting
            );
            if !shot.character_references.is_empty() {
                block.push_str(&format!("\n【角色特征锚定】{}", shot.character_references.join("，")));
            }
            if req.include_negative && !shot.negative_prompt.is_empty() {
                block.push_str(&format!("\n【负面规避】{}", shot.negative_prompt));
            }
            lines.push(block);
        }

        let formatted = lines.join("\n\n");
        (
            formatted,
            json!({
                "target_engine": "Hailuo MiniMax Video-01-Live",
                "high_stability_mode": true,
                "aspect_ratio": storyboard.aspect_ratio,
                "exported_at": Utc::now().to_rfc3339()
            }),
        )
    }

    fn format_midjourney_flux(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> (String, Value) {
        let ar_flag = match storyboard.aspect_ratio.as_str() {
            "2.39:1" | "21:9" => "21:9",
            "9:16" => "9:16",
            _ => "16:9",
        };

        let mut lines = Vec::new();
        lines.push(format!(
            "// Midjourney / FLUX Keyframe Prompt Sequence - {}",
            storyboard.title
        ));
        lines.push(format!(
            "// Target: Keyframe Visual Concept Art | Aspect Ratio: --ar {}\n",
            ar_flag
        ));

        for shot in &storyboard.shots {
            let mut mj_prompt = format!(
                "/imagine prompt: {}, {}, cinematic lighting: {}, 35mm film grain, masterpiece, highly detailed --ar {} --style raw --v 6.1",
                shot.visual_prompt,
                Self::map_shot_type(&shot.shot_type),
                shot.lighting,
                ar_flag
            );
            if req.include_negative && !shot.negative_prompt.is_empty() {
                mj_prompt.push_str(&format!(" --no {}", shot.negative_prompt));
            }
            lines.push(format!(
                "// Shot #{:02} ({})\n{}",
                shot.shot_number, shot.camera_movement, mj_prompt
            ));
        }

        let formatted = lines.join("\n\n");
        (
            formatted,
            json!({
                "target_engine": "Midjourney v6.1 / FLUX.1 [dev]",
                "version_flags": format!("--ar {} --style raw --v 6.1", ar_flag),
                "exported_at": Utc::now().to_rfc3339()
            }),
        )
    }

    fn format_comfyui(storyboard: &VideoStoryboard, req: &ExportVideoPromptRequest) -> (String, Value) {
        let (width, height) = match storyboard.aspect_ratio.as_str() {
            "9:16" => (720, 1280),
            "2.39:1" => (1920, 804),
            _ => (1280, 720),
        };

        let batch: Vec<Value> = storyboard
            .shots
            .iter()
            .map(|shot| {
                let frames = (shot.duration_seconds * 24.0).round() as i64;
                let mut item = json!({
                    "shot_id": shot.id,
                    "shot_number": shot.shot_number,
                    "width": width,
                    "height": height,
                    "length_frames": frames,
                    "fps": 24,
                    "positive_prompt": format!("{}, {}, {}", shot.visual_prompt, shot.motion_prompt, shot.lighting),
                    "camera_params": {
                        "movement": shot.camera_movement,
                        "shot_type": shot.shot_type,
                    }
                });
                if req.include_negative && !shot.negative_prompt.is_empty() {
                    item["negative_prompt"] = json!(shot.negative_prompt);
                }
                item
            })
            .collect();

        let root = json!({
            "client": "ComfyUI-AnimateDiff-Evolved",
            "storyboard_id": storyboard.id,
            "title": storyboard.title,
            "aspect_ratio": storyboard.aspect_ratio,
            "queue": batch,
        });

        let formatted = serde_json::to_string_pretty(&root).unwrap_or_default();
        (
            formatted,
            json!({
                "target_engine": "ComfyUI Node Graph Batch",
                "dimensions": format!("{}x{}", width, height),
                "exported_at": Utc::now().to_rfc3339()
            }),
        )
    }

    fn map_shot_type(t: &str) -> &'static str {
        match t {
            "CLOSE_UP" => "close-up shot",
            "EXTREME_CLOSE_UP" => "extreme close-up macro shot",
            "WIDE" => "wide angle panoramic shot",
            "AERIAL" => "high aerial drone bird-eye shot",
            _ => "medium cinematic shot",
        }
    }

    fn map_runway_camera(movement: &str, shot_type: &str) -> String {
        let shot_desc = match shot_type {
            "CLOSE_UP" => "Close-up",
            "EXTREME_CLOSE_UP" => "Macro close-up",
            "WIDE" => "Wide shot",
            "AERIAL" => "Aerial high angle",
            _ => "Medium shot",
        };
        let move_desc = match movement {
            "DOLLY_IN" => "Push in slowly, Zoom in slowly",
            "DOLLY_OUT" => "Pull back smoothly, Zoom out slowly",
            "PAN_LEFT" => "Pan left smoothly",
            "PAN_RIGHT" => "Pan right smoothly",
            "TRACKING" => "Tracking follow camera",
            "ORBIT" => "360 orbit around subject",
            "VERTIGO_ZOOM" => "Vertigo zoom, Dolly zoom effect",
            _ => "Static locked tripod camera",
        };
        format!("{}, {}", move_desc, shot_desc)
    }

    fn map_chinese_camera(movement: &str) -> &'static str {
        match movement {
            "DOLLY_IN" => "缓慢向前推进特写",
            "DOLLY_OUT" => "缓缓向后拉远全景",
            "PAN_LEFT" => "水平平缓左摇镜头",
            "PAN_RIGHT" => "水平平缓右摇镜头",
            "TRACKING" => "动态跟随平移跟拍",
            "ORBIT" => "环绕主体360度旋转运镜",
            "VERTIGO_ZOOM" => "希区柯克式眩晕变焦",
            _ => "固定机位平稳凝视",
        }
    }
}
