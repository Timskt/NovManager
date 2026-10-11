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
