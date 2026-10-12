use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use nov_server::{
    analytics::AnalyticsCalculator,
    api::{self, AppState},
    context_packer::ContextPacker,
    git_vcs::GitVcsManager,
    models::*,
    self_iteration::{AutonomousReflector, AutonomousWritingEvaluator, PromptSelfTuner},
    storage::SqliteStorage,
};
use serde_json::{json, Value};
use std::sync::Arc;
use tower::ServiceExt;

fn setup_test_app() -> axum::Router {
    let storage = Arc::new(SqliteStorage::new().expect("Failed to init storage"));
    let git = Arc::new(GitVcsManager::new());
    let tuner = Arc::new(PromptSelfTuner::new());
    let context_packer = Arc::new(ContextPacker::new(4000));
    let http_client = reqwest::Client::new();

    let state = Arc::new(AppState {
        storage,
        git,
        tuner,
        context_packer,
        http_client,
    });

    api::create_router(state)
}

#[tokio::test]
async fn test_storage_and_models() {
    let storage = SqliteStorage::new().expect("Storage init failed");
    let status = storage.get_database_status();
    assert_eq!(status["connected"], true);
    assert_eq!(status["wal_enabled"], true);

    let novels = storage.list_novels().expect("list novels");
    assert!(!novels.is_empty(), "Novels should be seeded");
    let first = &novels[0];
    assert!(first.title.contains("太虚") || first.title.contains("天演"));

    let bundle_opt = storage.get_novel_bundle(&first.id).expect("get bundle");
    assert!(bundle_opt.is_some());
    let bundle = bundle_opt.unwrap();
    assert!(bundle.get("novel").is_some());
    assert!(bundle.get("volumes").is_some());
    assert!(bundle.get("characters").is_some());
    assert!(bundle.get("world_settings").is_some());

    // Setting consistency check
    let issues = storage
        .check_setting_consistency(CheckConsistencyRequest {
            novel_id: first.id.clone(),
            draft_text: "林越突然瞬移到了敌人背后，哈哈大笑：受死吧！随后左手挥剑斩杀敌首。这招真是恐怖如斯！".to_string(),
            involved_character_ids: None,
        })
        .expect("check consistency");

    assert!(issues.iter().any(|i| i.issue_type == "SETTING_VIOLATION"));
    assert!(issues.iter().any(|i| i.issue_type == "OOC"));
    assert!(issues.iter().any(|i| i.issue_type == "TYPO"));
    assert!(issues.iter().any(|i| i.issue_type == "PLOT_HOLE"));
}

#[tokio::test]
async fn test_self_iteration_engine() {
    let eval_res = AutonomousWritingEvaluator::evaluate_draft(
        "nov-001",
        "chap-011",
        1,
        "残阳如血。林越伏在青岩后，左肩剧痛传来，冷笑一声，拔出残剑，杀招破空轰鸣！四周弥漫着腥甜血腥气。他惜字如金：“事不可为，且退一步。”",
        Some("伏击反杀"),
    );

    assert!(eval_res.overall_score > 60);
    assert_eq!(eval_res.dimensions.len(), 5);
    assert!(eval_res.dimensions.contains_key("continuity"));
    assert!(eval_res.dimensions.contains_key("voice"));
    assert!(eval_res.dimensions.contains_key("tension"));
    assert!(eval_res.dimensions.contains_key("sensory"));
    assert!(eval_res.dimensions.contains_key("pacing"));

    let reflection = AutonomousReflector::generate_reflection_strategy(&eval_res);
    assert!(reflection.get("target_dimension").is_some());
    assert!(reflection.get("refinement_prompt_addon").is_some());

    let tuner = PromptSelfTuner::new();
    tuner.record_author_feedback(true, 0.1);
    let (weights, inst) = tuner.get_status();
    assert!(weights["action_density"] > 1.2);
    assert!(inst.contains("进化提示词指引"));
}

#[tokio::test]
async fn test_context_packer() {
    let packer = ContextPacker::new(4000);
    let tokens = packer.estimate_tokens("太虚纪元 第一章 斩断前尘");
    assert!(tokens > 0);

    let packed = packer.pack_scene_context(
        "太虚纪元",
        "仙侠修真",
        11,
        "暗中识破伏击",
        "魔宗死士合围",
        &[json!({
            "name": "林越",
            "state": {
                "combat_power": "筑基后期",
                "health_status": "INJURED",
                "location": "坠星崖",
                "state_summary": "左肩被透骨钉洞穿"
            }
        })],
        &[json!({
            "name": "太虚法则",
            "content": "金丹以下不可撕裂空间",
            "priority": 100
        })],
        &[json!({
            "title": "青铜残片古篆",
            "clue_description": "残片背面的远古大荒文字"
        })],
        "上一幕逃入绝壁",
    );

    let prompt = packed["assembled_prompt"].as_str().unwrap();
    assert!(prompt.contains("太虚纪元"));
    assert!(prompt.contains("林越"));
    assert!(prompt.contains("金丹以下不可撕裂空间"));
    assert!(prompt.contains("青铜残片古篆"));
}

#[tokio::test]
async fn test_analytics_and_feature_suite() {
    let volumes = vec![Volume {
        id: "vol-001".to_string(),
        novel_id: "nov-001".to_string(),
        volume_index: 1,
        title: "第一卷".to_string(),
        summary: None,
        main_conflict: "".to_string(),
        target_climax: "".to_string(),
        boundary_constraints: None,
        chapters: vec![Chapter {
            id: "chap-01".to_string(),
            volume_id: "vol-001".to_string(),
            novel_id: "nov-001".to_string(),
            chapter_index: 1,
            title: "第一章".to_string(),
            outline: "".to_string(),
            pov_character_id: None,
            word_count_goal: 3000,
            actual_word_count: 500,
            status: "PLANNED".to_string(),
            scenes: vec![Scene {
                id: "sc-01-1".to_string(),
                chapter_id: "chap-01".to_string(),
                scene_index: 1,
                scene_goal: "试探交手".to_string(),
                conflict: "杀意突变".to_string(),
                turn_point: "".to_string(),
                outcome: "".to_string(),
                involved_character_ids: vec!["char-001".to_string()],
                location: "断崖".to_string(),
                draft_content: "突变骤生！凛冽杀意笼罩四野，剧痛随之袭来，破空声撕裂死寂。".to_string(),
                agent_notes: None,
            }],
        }],
    }];

    let curve = AnalyticsCalculator::calculate_tension_curve("nov-001", &volumes);
    assert_eq!(curve["total_points"], 1);
    let pts = curve["curve"].as_array().unwrap();
    assert!(pts[0]["tension"].as_i64().unwrap() >= 70);

    let chars = vec![Character {
        id: "char-001".to_string(),
        novel_id: "nov-001".to_string(),
        name: "林越".to_string(),
        role_type: "PROTAGONIST".to_string(),
        gender: "男".to_string(),
        profile: CharacterProfile::default(),
        background: "剑宗绝剑峰弟子".to_string(),
        created_at: "".to_string(),
    }];

    let rels = vec![CharacterRelation {
        id: "rel-01".to_string(),
        novel_id: "nov-001".to_string(),
        from_character_id: "char-001".to_string(),
        to_character_id: "char-002".to_string(),
        relation_type: "生死同盟".to_string(),
        affinity_score: 85,
        description: "一同坠入地渊".to_string(),
    }];

    let graph = AnalyticsCalculator::calculate_relationship_graph(&chars, &rels);
    assert_eq!(graph["nodes"].as_array().unwrap().len(), 1);
    assert_eq!(graph["links"].as_array().unwrap().len(), 1);

    let matrix = AnalyticsCalculator::calculate_timeline_matrix("nov-001", &volumes, &chars);
    assert_eq!(matrix["events"].as_array().unwrap().len(), 1);

    let doc_res = AnalyticsCalculator::diagnose_dialogue(DialogueDoctorRequest {
        dialogue_text: "你休想夺走我的青铜残片！".to_string(),
        speaker_name: Some("林越".to_string()),
        speaker_personality: Some("冷峻果断".to_string()),
        context_emotion: None,
    });
    assert!(doc_res["suggested_dialogue"].as_str().unwrap().contains("林越"));

    let action_res = AnalyticsCalculator::direct_action(ActionDirectorRequest {
        combatant_a: "林越".to_string(),
        combatant_b: "夜枭".to_string(),
        realm_a: Some("筑基期".to_string()),
        realm_b: Some("金丹期".to_string()),
        terrain: Some("坠星崖".to_string()),
        core_move: Some("绝灵阵伏杀".to_string()),
    });
    assert_eq!(action_res["sequence_beats"].as_array().unwrap().len(), 3);

    let typeset_res = AnalyticsCalculator::typeset_novel("太虚纪元", &volumes, "txt");
    assert_eq!(typeset_res["format"], "txt");
    assert!(typeset_res["content"].as_str().unwrap().contains("《太虚纪元》"));
}

#[tokio::test]
async fn test_http_rest_api_endpoints() {
    let app = setup_test_app();

    // 1. GET /api/health
    let res = app
        .clone()
        .oneshot(Request::builder().uri("/api/health").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let health: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(health["status"], "ok");

    // 2. GET /api/novels
    let res = app
        .clone()
        .oneshot(Request::builder().uri("/api/novels").body(Body::empty()).unwrap())
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let novels: Vec<Value> = serde_json::from_slice(&body).unwrap();
    assert!(!novels.is_empty());
    let novel_id = novels[0]["id"].as_str().unwrap();

    // 3. GET /api/novels/:id
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 4. GET /api/novels/:id/bundle
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}/bundle", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let body = res.into_body().collect().await.unwrap().to_bytes();
    let bundle: Value = serde_json::from_slice(&body).unwrap();
    assert!(bundle.get("novel").is_some());

    // 5. GET /api/novels/:id/world
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}/world", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 6. GET /api/novels/:id/characters
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}/characters", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 7. GET /api/novels/:id/relations
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}/relations", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 8. GET /api/novels/:id/foreshadowing
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}/foreshadowing", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 9. GET /api/novels/:id/techniques & POST /api/novels/:id/techniques
    let post_tech_body = json!({
        "novel_id": novel_id,
        "techniques": [{
            "name": "通感白描法",
            "category": "PACING",
            "category_label": "节奏张力",
            "description": "以冰冷石缝触感与血腥微气味展现环境压迫"
        }]
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/novels/{}/techniques", novel_id))
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&post_tech_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/novels/{}/techniques", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 10. GET /api/git/:id/history & POST /api/git/snapshot
    let snap_body = json!({
        "novel_id": novel_id,
        "chapter_id": "chap-011",
        "scene_index": 1,
        "content": "测试快照正文内容",
        "message": "自动化测试提交",
        "tag": "test"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/git/snapshot")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&snap_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/git/{}/history", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 11. POST /api/evolution/evaluate & GET /api/evolution/history & GET /api/evolution/tuner
    let eval_body = json!({
        "novel_id": novel_id,
        "chapter_id": "chap-011",
        "scene_index": 1,
        "draft_text": "残阳如血。林越伏在青岩后，左肩剧痛传来，冷笑一声，拔出残剑，杀招破空轰鸣！四周弥漫着腥甜血腥气。他惜字如金：“事不可为，且退一步。”"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/evolution/evaluate")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&eval_body).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/evolution/history")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri("/api/evolution/tuner")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 12. Analytics: tension curve, relationship graph, timeline matrix, foreshadowing radar
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/analytics/{}/tension-curve", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/analytics/{}/relationship-graph", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/analytics/{}/timeline-matrix", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .uri(format!("/api/analytics/{}/foreshadowing-radar", novel_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 13. POST /api/doctor/dialogue
    let doc_req = json!({
        "dialogue_text": "你到底是谁？",
        "speaker_name": "林越",
        "speaker_personality": "极度谨慎"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/doctor/dialogue")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&doc_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 14. POST /api/director/action
    let action_req = json!({
        "combatant_a": "林越",
        "combatant_b": "夜枭",
        "realm_a": "筑基后期",
        "realm_b": "金丹初期",
        "terrain": "坠星崖溶洞",
        "core_move": "地煞火珠绝杀"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/director/action")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&action_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 15. POST /api/export/typeset
    let typeset_req = json!({
        "novel_id": novel_id,
        "format": "txt"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/export/typeset")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&typeset_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 16. POST /api/context/pack
    let pack_req = json!({
        "novel_id": novel_id,
        "chapter_index": 11,
        "scene_goal": "突围反杀",
        "scene_conflict": "魔宗合围",
        "involved_character_ids": ["char-001"]
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/context/pack")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&pack_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_video_storyboard_and_multiplatform_export() {
    let app = setup_test_app();
    let storage = SqliteStorage::new().expect("Failed to init storage");

    // 1. Storage check for seeded storyboard
    let storyboards = storage.list_video_storyboards("nov-001").expect("list storyboards");
    assert!(!storyboards.is_empty(), "Should have seeded storyboards for nov-001");
    let sb = storyboards
        .iter()
        .find(|s| s.title.contains("太虚纪元") || s.title.contains("乱石林"))
        .expect("Should find seeded storyboard for nov-001");
    assert!(!sb.shots.is_empty(), "Storyboard should contain shots");
    assert!(sb.total_duration_seconds > 0.0);

    // 2. Multi-platform video prompt export unit verification
    // Sora
    let sora_req = ExportVideoPromptRequest {
        storyboard_id: Some(sb.id.clone()),
        platform: "SORA".to_string(),
        include_camera_brackets: true,
        include_negative: true,
    };
    let sora_res = nov_server::video_exporter::VideoExporter::export_prompts(sb, &sora_req);
    assert_eq!(sora_res.platform, "SORA");
    assert!(sora_res.formatted_content.contains("SORA"));
    assert!(sora_res.formatted_content.contains("batch_tasks"));
    assert!(sora_res.shots_count >= 1);

    // Kling
    let kling_req = ExportVideoPromptRequest {
        storyboard_id: Some(sb.id.clone()),
        platform: "KLING".to_string(),
        include_camera_brackets: true,
        include_negative: true,
    };
    let kling_res = nov_server::video_exporter::VideoExporter::export_prompts(sb, &kling_req);
    assert_eq!(kling_res.platform, "KLING");
    assert!(kling_res.formatted_content.contains("camera_control"));

    // Runway Gen-3 bracketed syntax
    let runway_req = ExportVideoPromptRequest {
        storyboard_id: Some(sb.id.clone()),
        platform: "RUNWAY_GEN3".to_string(),
        include_camera_brackets: true,
        include_negative: true,
    };
    let runway_res = nov_server::video_exporter::VideoExporter::export_prompts(sb, &runway_req);
    assert_eq!(runway_res.platform, "RUNWAY_GEN3");
    assert!(runway_res.formatted_content.contains("[Camera:"));

    // Hailuo / MiniMax high-stability
    let hailuo_req = ExportVideoPromptRequest {
        storyboard_id: Some(sb.id.clone()),
        platform: "HAILUO_MINIMAX".to_string(),
        include_camera_brackets: true,
        include_negative: true,
    };
    let hailuo_res = nov_server::video_exporter::VideoExporter::export_prompts(sb, &hailuo_req);
    assert_eq!(hailuo_res.platform, "HAILUO_MINIMAX");
    assert!(hailuo_res.formatted_content.contains("稳定动态"));

    // Midjourney keyframe format
    let mj_req = ExportVideoPromptRequest {
        storyboard_id: Some(sb.id.clone()),
        platform: "MIDJOURNEY".to_string(),
        include_camera_brackets: true,
        include_negative: true,
    };
    let mj_res = nov_server::video_exporter::VideoExporter::export_prompts(sb, &mj_req);
    assert_eq!(mj_res.platform, "MIDJOURNEY");
    assert!(mj_res.formatted_content.contains("/imagine prompt:"));
    assert!(mj_res.formatted_content.contains("--style raw --v 6.1"));

    // ComfyUI format
    let comfy_req = ExportVideoPromptRequest {
        storyboard_id: Some(sb.id.clone()),
        platform: "COMFYUI_JSON".to_string(),
        include_camera_brackets: true,
        include_negative: true,
    };
    let comfy_res = nov_server::video_exporter::VideoExporter::export_prompts(sb, &comfy_req);
    assert_eq!(comfy_res.platform, "COMFYUI_JSON");
    assert!(comfy_res.formatted_content.contains("ComfyUI"));

    // 3. HTTP REST API Endpoints Verification
    // GET /api/novels/:id/storyboards
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/storyboards")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let sbs: Vec<Value> = serde_json::from_slice(&bytes).unwrap();
    assert!(!sbs.is_empty());

    // GET /api/storyboards/:id
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri(format!("/api/storyboards/{}", sb.id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // POST /api/storyboards (Create new)
    let new_sb = json!({
        "novel_id": "nov-001",
        "chapter_id": "chap-011",
        "scene_id": "sc-11-1",
        "title": "测试分镜母本B",
        "aspect_ratio": "16:9",
        "target_platform": "SORA",
        "shots": []
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/storyboards")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_sb).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let created_sb: Value = serde_json::from_slice(&bytes).unwrap();
    let created_sb_id = created_sb["id"].as_str().unwrap().to_string();

    // POST /api/storyboards/:id/shots
    let new_shot = json!({
        "scene_id": "sc-11-1",
        "shot_number": 1,
        "duration_seconds": 6.0,
        "shot_type": "CLOSE_UP",
        "camera_movement": "DOLLY_IN",
        "visual_prompt": "林越手握残剑，眼神坚定",
        "motion_prompt": "镜头向前推至特写",
        "negative_prompt": "模糊，残缺",
        "lighting": "冷光侧照",
        "character_references": ["林越"]
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/storyboards/{}/shots", created_sb_id))
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_shot).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let created_shot: Value = serde_json::from_slice(&bytes).unwrap();
    let created_shot_id = created_shot["id"].as_str().unwrap().to_string();

    // PUT /api/shots/:id
    let updated_shot = json!({
        "id": created_shot_id,
        "scene_id": "sc-11-1",
        "storyboard_id": created_sb_id,
        "shot_number": 1,
        "duration_seconds": 7.5,
        "shot_type": "EXTREME_CLOSE_UP",
        "camera_movement": "STATIC",
        "visual_prompt": "林越眼神如刀，残片散发青光",
        "motion_prompt": "微小呼吸动态",
        "negative_prompt": "失焦",
        "lighting": "幽青色异宝辉光",
        "character_references": ["林越"]
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri(format!("/api/shots/{}", created_shot_id))
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&updated_shot).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // POST /api/storyboards/:id/export
    let export_req = json!({
        "platform": "RUNWAY_GEN3",
        "include_camera_brackets": true,
        "include_negative": true
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri(format!("/api/storyboards/{}/export", created_sb_id))
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&export_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let export_val: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(export_val["platform"], "RUNWAY_GEN3");
    assert!(export_val["formatted_content"].as_str().unwrap().contains("[Camera:"));

    // DELETE /api/shots/:id
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri(format!("/api/shots/{}", created_shot_id))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    let _ = storage.delete_video_storyboard(&created_sb_id);
}


#[tokio::test]
async fn test_workflow_pipeline_gods_eye_and_dungeon_arcs() {
    let app = setup_test_app();

    // 1. GET /api/novels/:id/workflow
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/workflow")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let pipeline: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(pipeline["nodes"].as_array().unwrap().len(), 6);

    // 2. POST /api/novels/:id/workflow/step
    let step_req = json!({
        "node_id": "wf-04",
        "status": "COMPLETED",
        "output_summary": "正文起草第三版完成并已通过初步风格校验",
        "agent_role": "ProseArtisan"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/novels/nov-001/workflow/step")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&step_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let updated_pipeline: Value = serde_json::from_slice(&bytes).unwrap();
    let nodes = updated_pipeline["nodes"].as_array().unwrap();
    let wf04 = nodes.iter().find(|n| n["id"] == "wf-04").unwrap();
    assert_eq!(wf04["status"], "COMPLETED");

    // 3. GET /api/novels/:id/gods-eye
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/gods-eye")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let gods_eye: Value = serde_json::from_slice(&bytes).unwrap();
    assert!(gods_eye["current_era"].as_str().unwrap().contains("天道"));
    assert!(!gods_eye["celestial_anomalies"].as_array().unwrap().is_empty());
    assert!(gods_eye["global_tension_index"].as_f64().unwrap() > 0.0);

    // 4. POST /api/novels/:id/gods-eye
    let update_ge = json!({
        "current_era": "天道崩溃·浩劫降临前夕",
        "celestial_anomalies": ["天裂万丈", "血月当空"],
        "macro_crisis_countdown_days": 42,
        "offscreen_factions": [
            {
                "faction": "九幽魔皇殿",
                "activity": "破开封印，集结魔兵",
                "threat_level": "EXTREME"
            }
        ],
        "global_tension_index": 0.95
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/novels/nov-001/gods-eye")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_ge).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let saved_ge: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(saved_ge["macro_crisis_countdown_days"], 42);
    assert_eq!(saved_ge["global_tension_index"], 0.95);

    // 5. GET /api/novels/:id/dungeons
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/dungeons")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 6. POST /api/novels/:id/dungeons
    let new_dungeon = json!({
        "arc_name": "幽冥血海太虚禁地",
        "location": "地底九万丈血渊",
        "stage": "BOSS_BATTLE",
        "danger_level": 9,
        "milestone_gates": ["渡过血海死水", "诛杀地煞修罗", "斩灭血海魔魂"],
        "loot_economy": {
            "immortal_artifacts": ["血煞天魔珠"],
            "spiritual_stones": 100000
        },
        "survival_rate": 0.15
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/novels/nov-001/dungeons")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_dungeon).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let saved_dng: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(saved_dng["arc_name"], "幽冥血海太虚禁地");
    assert_eq!(saved_dng["danger_level"], 9);
}

#[tokio::test]
async fn test_model_provider_crud_and_fallback_simulation() {
    let app = setup_test_app();

    // 1. GET /api/models/providers (Default seeded providers)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/models/providers")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let providers: Vec<ModelProvider> = serde_json::from_slice(&bytes).unwrap();
    assert!(providers.len() >= 6, "Expected at least 6 default providers");
    assert!(providers.iter().any(|p| p.name.contains("DeepSeek")));
    assert!(providers.iter().any(|p| p.name.contains("Claude")));
    assert!(providers.iter().any(|p| p.name.contains("OpenAI")));
    assert!(providers.iter().any(|p| p.name.contains("Gemini")));
    assert!(providers.iter().any(|p| p.name.contains("SiliconFlow")));
    assert!(providers.iter().any(|p| p.name.contains("Ollama")));

    // 2. POST /api/models/providers (Create new provider)
    let new_provider = json!({
        "id": "prov-test-matrix",
        "name": "Matrix Custom Inference Node",
        "provider_type": "Custom",
        "base_url": "http://127.0.0.1:8000/v1",
        "api_keys": ["sk-test-pool-1", "sk-test-pool-2"],
        "active_key_index": 0,
        "supported_models": ["custom-llama3-70b"],
        "rpm_limit": 60,
        "tpm_limit": 100000,
        "is_enabled": true,
        "health_status": "HEALTHY",
        "latency_ms": 120
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/providers")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_provider).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);

    // 3. PUT /api/models/providers/:id (Update provider)
    let update_provider = json!({
        "id": "prov-test-matrix",
        "name": "Matrix Custom Inference Node (Updated)",
        "provider_type": "Custom",
        "base_url": "http://127.0.0.1:8000/v1",
        "api_keys": ["sk-test-pool-1"],
        "active_key_index": 0,
        "supported_models": ["custom-llama3-70b"],
        "rpm_limit": 90,
        "tpm_limit": 120000,
        "is_enabled": true,
        "health_status": "HEALTHY",
        "latency_ms": 95
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("PUT")
                .uri("/api/models/providers/prov-test-matrix")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&update_provider).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);

    // 4. GET /api/models/roles (Role assignments)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/models/roles")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let roles: Vec<ModelRoleAssignment> = serde_json::from_slice(&bytes).unwrap();
    assert!(roles.iter().any(|r| r.role == "Planner"));
    assert!(roles.iter().any(|r| r.role == "Drafter"));
    assert!(roles.iter().any(|r| r.role == "Stylist"));
    assert!(roles.iter().any(|r| r.role == "Inspector"));
    assert!(roles.iter().any(|r| r.role == "VideoDirector"));

    // 5. POST /api/models/simulate-fallback (Normal dispatch)
    let normal_req = json!({
        "role": "Planner",
        "simulate_status_code": 200,
        "prompt_tokens": 2048
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/simulate-fallback")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&normal_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let normal_sim: FallbackSimulateResponse = serde_json::from_slice(&bytes).unwrap();
    assert!(normal_sim.success);
    assert!(!normal_sim.circuit_broken);
    assert_eq!(normal_sim.final_provider_id, "prov-deepseek");
    assert_eq!(normal_sim.final_model, "deepseek-reasoner");

    // 6. POST /api/models/simulate-fallback (HTTP 429 Quota Exhaustion Circuit-Breaker)
    let fallback_req = json!({
        "role": "Planner",
        "simulate_status_code": 429,
        "prompt_tokens": 4096
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/models/simulate-fallback")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&fallback_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let fallback_sim: FallbackSimulateResponse = serde_json::from_slice(&bytes).unwrap();
    assert!(fallback_sim.success);
    assert!(fallback_sim.circuit_broken);
    assert_eq!(fallback_sim.attempted_providers.len(), 2);
    assert_eq!(fallback_sim.final_provider_id, "prov-claude");
    assert_eq!(fallback_sim.final_model, "claude-3-7-sonnet-20250219");
    assert!(fallback_sim.message.contains("circuit-breaker") || fallback_sim.message.contains("failover"));

    // 7. GET /api/models/telemetry (Verify logs)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/models/telemetry?limit=20")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let telemetry: Vec<ModelTelemetry> = serde_json::from_slice(&bytes).unwrap();
    assert!(!telemetry.is_empty());
    assert!(telemetry.iter().any(|t| t.status_code == 429));
    assert!(telemetry.iter().any(|t| t.status_code == 200));

    // 8. DELETE /api/models/providers/:id
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("DELETE")
                .uri("/api/models/providers/prov-test-matrix")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
}

#[tokio::test]
async fn test_style_dna_extraction_and_blending() {
    let app = setup_test_app();

    // 1. GET /api/style/profiles (Verify presets)
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/style/profiles")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let profiles: Vec<StyleDnaProfile> = serde_json::from_slice(&bytes).unwrap();
    assert!(profiles.len() >= 5);
    assert!(profiles.iter().any(|p| p.name.contains("金庸")));
    assert!(profiles.iter().any(|p| p.name.contains("乌贼")));
    assert!(profiles.iter().any(|p| p.name.contains("忘语")));
    assert!(profiles.iter().any(|p| p.name.contains("猫腻")));
    assert!(profiles.iter().any(|p| p.name.contains("辰东")));

    // 2. POST /api/style/extract (Heuristic extraction from sample text)
    let extract_req = json!({
        "sample_text": "“残阳如血，”林越紧握着残剑冷冷道，“尔等宵小，也配问我姓名？”话音未落，他身形若闪电般骤然拔起！青色剑气呼啸撕裂苍穹，带着浓烈的腥甜血腥气与刺骨寒意。轰的一声巨响，前方黑石绝壁轰然崩塌，碎石飞溅如雨，将三名追兵当场镇压！",
        "name": "林越·绝壁杀伐风",
        "author": "林越",
        "source_title": "《太虚纪元》实战样本"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/style/extract")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&extract_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let extracted: StyleDnaProfile = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(extracted.author, "林越");
    assert!(extracted.sensory_density > 0.0);
    assert!(extracted.dialogue_ratio > 0.0);
    assert!(extracted.sentence_variance > 0.0);
    assert!(extracted.metaphor_frequency > 0.0);
    assert!(extracted.pacing_velocity > 0.0);
    assert!(extracted.vocabulary_richness > 0.0);
    assert!(!extracted.forbidden_cliches.is_empty());
    assert!(!extracted.golden_exemplars.is_empty());
    assert!(extracted.prompt_directive.contains("文风"));

    // 3. POST /api/style/blend (Blend Jin Yong + Cuttlefish)
    let blend_req = json!({
        "primary_profile_id": "dna-jinyong",
        "secondary_profile_id": "dna-cuttlefish",
        "fusion_ratio": 0.65,
        "custom_name": "儒侠克苏鲁神诡新风"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/style/blend")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&blend_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let blend_res: StyleFusionResponse = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(blend_res.fused_profile.name, "儒侠克苏鲁神诡新风");
    assert!(blend_res.blending_notes.contains("成功融合"));
    assert!(blend_res.fused_profile.sensory_density > 0.5);
    assert!(blend_res.fused_profile.forbidden_cliches.len() >= 6);
}

#[tokio::test]
async fn test_idea_genesis_outline_generator() {
    let app = setup_test_app();

    // 1. POST /api/genesis/outline
    let genesis_req = json!({
        "logline": "破落仙门杂役偶然觉醒太虚天演古符，能在神识中推演任何法诀破绽与因果先机，自此逆天伐道登临绝巅",
        "genre": "仙侠修真",
        "target_word_count": 1500000,
        "tone": "冷峻克制，重智斗博弈，杀伐果断",
        "core_hook": "神识演道·洞悉一切破绽与因果线",
        "golden_finger_type": "太虚天演神图",
        "tropes": ["凡人流", "智斗反杀", "上古神魔传承", "宗门风云"]
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/genesis/outline")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&genesis_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let universe: IdeaGenesisResponse = serde_json::from_slice(&bytes).unwrap();

    assert!(universe.novel_title.contains("仙侠修真"));
    assert!(!universe.synopsis.is_empty());
    assert_eq!(universe.golden_three_chapters.len(), 3);
    assert_eq!(universe.golden_three_chapters[0].chapter_index, 1);
    assert_eq!(universe.golden_three_chapters[1].chapter_index, 2);
    assert_eq!(universe.golden_three_chapters[2].chapter_index, 3);
    assert!(!universe.golden_three_chapters[0].scenes.is_empty());

    assert_eq!(universe.volumes.len(), 3);
    assert!(universe.volumes[0].title.contains("第一卷"));
    assert!(universe.volumes[1].title.contains("第二卷"));
    assert!(universe.volumes[2].title.contains("第三卷"));

    assert!(universe.world_settings.len() >= 3);
    assert_eq!(universe.main_characters.len(), 3);
    assert!(universe.cheat_system["system_name"].as_str().unwrap().contains("太虚天演"));
    assert_eq!(universe.tension_curve_preview.len(), 30);

    // 2. POST /api/genesis/multiverse
    let multi_req = json!({
        "novel_id": "nov-001",
        "divergence_point": "主角在第三章祭坛绝境是否当场逆斩强敌头目"
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/genesis/multiverse")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&multi_req).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let branches: Vec<MultiverseBranch> = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(branches.len(), 3);
    assert!(branches.iter().any(|b| b.branch_id.contains("alpha")));
    assert!(branches.iter().any(|b| b.branch_id.contains("beta")));
    assert!(branches.iter().any(|b| b.branch_id.contains("gamma")));
}

#[tokio::test]
async fn test_reader_psychology_and_asymmetry_tracking() {
    let app = setup_test_app();

    // 1. GET /api/novels/:id/reader-psychology
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/reader-psychology")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let report: ReaderPsychologyReport = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(report.novel_id, "nov-001");
    assert!(report.anticipation_score > 0.5);
    assert!(report.fatigue_risk < 0.5);
    assert!(report.payoff_index > 0.5);
    assert!(!report.dopamine_intervals.is_empty());
    assert!(!report.diagnostic_advice.is_empty());

    // 2. GET /api/novels/:id/asymmetry
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/asymmetry")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let items: Vec<InformationAsymmetryItem> = serde_json::from_slice(&bytes).unwrap();
    assert!(!items.is_empty());
    assert!(items.iter().any(|it| it.reader_knows && !it.protagonist_knows));

    // 3. POST /api/novels/:id/asymmetry
    let new_asym = json!({
        "secret_title": "主角随身佩戴的古玉实为上古魔尊沉睡残魂的阵眼容器",
        "reader_knows": true,
        "protagonist_knows": false,
        "antagonist_knows": true,
        "dramatic_irony_score": 0.96
    });
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/api/novels/nov-001/asymmetry")
                .header("Content-Type", "application/json")
                .body(Body::from(serde_json::to_vec(&new_asym).unwrap()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::CREATED);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let saved_asym: InformationAsymmetryItem = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(saved_asym.novel_id, "nov-001");
    assert!(saved_asym.reader_knows);
    assert!(!saved_asym.protagonist_knows);
    assert_eq!(saved_asym.dramatic_irony_score, 0.96);

    // 4. GET /api/novels/:id/offscreen-news
    let res = app
        .clone()
        .oneshot(
            Request::builder()
                .method("GET")
                .uri("/api/novels/nov-001/offscreen-news")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(res.status(), StatusCode::OK);
    let bytes = res.into_body().collect().await.unwrap().to_bytes();
    let news: Vec<OffscreenNewsEvent> = serde_json::from_slice(&bytes).unwrap();
    assert!(!news.is_empty());
    assert!(news.iter().any(|ev| ev.region.contains("九疑山") || ev.region.contains("玄冥海") || ev.region.contains("天机阁")));
}


