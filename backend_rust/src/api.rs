use crate::analytics::AnalyticsCalculator;
use crate::context_packer::ContextPacker;
use crate::git_vcs::GitVcsManager;
use crate::models::*;
use crate::self_iteration::{AutonomousReflector, AutonomousWritingEvaluator, PromptSelfTuner};
use crate::storage::SqliteStorage;
use crate::video_exporter::VideoExporter;
use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    response::{sse::Event, IntoResponse, Json, Sse},
    routing::{delete, get, post, put},
    Router,
};
use futures_util::StreamExt;
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::sync::Arc;
use std::time::Instant;

#[derive(Clone)]
pub struct AppState {
    pub storage: Arc<SqliteStorage>,
    pub git: Arc<GitVcsManager>,
    pub tuner: Arc<PromptSelfTuner>,
    pub context_packer: Arc<ContextPacker>,
    pub http_client: reqwest::Client,
}

pub fn create_router(state: Arc<AppState>) -> Router {
    Router::new()
        // Health
        .route("/api/health", get(health_check))
        // Novels
        .route("/api/novels", get(list_novels).post(create_or_update_novel))
        .route("/api/novels/sync", post(sync_novel_bundle))
        .route("/api/novels/{id}", get(get_novel).delete(delete_novel))
        .route("/api/novels/{id}/bundle", get(get_novel_bundle))
        .route("/api/novels/{id}/active", post(set_active_novel))
        // World Settings
        .route("/api/novels/{id}/world", get(list_world_settings))
        .route("/api/novels/{id}/world/query", get(query_lore))
        // Characters & States
        .route("/api/novels/{id}/characters", get(list_characters))
        .route("/api/novels/{id}/characters/{char_id}", get(get_character))
        .route("/api/characters/{char_id}/state", get(get_character_state))
        .route("/api/characters/state", post(update_character_state))
        // Character Relations
        .route(
            "/api/novels/{id}/relations",
            get(list_character_relations).post(update_character_relation),
        )
        .route("/api/novels/{id}/relations/{relation_id}", delete(delete_character_relation))
        // Outlines & Scenes
        .route("/api/novels/{id}/outlines", get(get_outlines))
        .route("/api/novels/{id}/chapters/{chapter_id}/context", get(get_chapter_context))
        .route("/api/scenes/draft", post(save_scene_draft))
        .route("/api/consistency-check", post(check_consistency))
        // Foreshadowings
        .route("/api/novels/{id}/foreshadowing", get(list_foreshadowings))
        .route("/api/novels/{id}/foreshadowings", get(list_foreshadowings))
        .route("/api/foreshadowings", post(record_foreshadowing))
        // Techniques
        .route(
            "/api/novels/{id}/techniques",
            get(list_polish_techniques).post(save_polish_techniques),
        )
        .route("/api/novels/{id}/techniques/stats", get(get_polish_techniques_stats))
        // Video Storyboards
        .route("/api/novels/{id}/storyboards", get(list_video_storyboards))
        .route("/api/storyboards/{id}", get(get_video_storyboard))
        .route("/api/storyboards", post(create_or_update_video_storyboard))
        .route("/api/storyboards/{id}/shots", post(add_video_shot))
        .route("/api/shots/{id}", put(update_video_shot).delete(delete_video_shot))
        .route("/api/storyboards/{id}/export", post(export_video_storyboard))
        // Workflow Pipelines
        .route("/api/novels/{id}/workflow", get(get_workflow_pipeline))
        .route("/api/novels/{id}/workflow/step", post(advance_workflow_step))
        // Gods Eye State HUD
        .route("/api/novels/{id}/gods-eye", get(get_gods_eye_state).post(save_gods_eye_state))
        // Dungeon Arcs
        .route("/api/novels/{id}/dungeons", get(list_dungeon_arcs).post(save_dungeon_arc))
        // Git VCS
        .route("/api/git/{id}/history", get(get_git_history))
        .route("/api/git/snapshot", post(create_git_snapshot))
        .route("/api/git/diff/{commit_hash}", get(get_git_commit_diff))
        .route("/api/git/restore", post(restore_git_snapshot))
        // Evolution & Self-Iteration
        .route("/api/evolution/evaluate", post(evaluate_draft_quality))
        .route("/api/evolution/reflect", post(generate_reflection_plan))
        .route("/api/evolution/history", get(get_evolution_history))
        .route("/api/evolution/feedback", post(submit_author_feedback))
        .route("/api/evolution/tuner", get(get_tuner_status))
        // Context Packer
        .route("/api/context/pack", post(pack_scene_context))
        // Analytics & Feature Suite
        .route("/api/analytics/{id}/tension-curve", get(get_tension_curve))
        .route("/api/analytics/{id}/relationship-graph", get(get_relationship_graph))
        .route("/api/analytics/{id}/timeline-matrix", get(get_timeline_matrix))
        .route("/api/analytics/{id}/foreshadowing-radar", get(get_foreshadowing_radar))
        .route("/api/doctor/dialogue", post(diagnose_dialogue))
        .route("/api/director/action", post(direct_action))
        .route("/api/export/typeset", post(typeset_novel))
        // Multi-Provider Model Matrix & Resilience Router
        .route("/api/models/providers", get(list_model_providers).post(create_model_provider))
        .route("/api/models/providers/{id}", get(get_model_provider).put(update_model_provider).delete(delete_model_provider))
        .route("/api/models/roles", get(list_model_roles).post(save_model_role))
        .route("/api/models/simulate-fallback", post(simulate_fallback_handler))
        .route("/api/models/telemetry", get(list_telemetry_handler))
        // Style DNA & Literary Mimicry
        .route("/api/style/profiles", get(list_style_profiles))
        .route("/api/style/profiles/{id}", get(get_style_profile))
        .route("/api/style/extract", post(extract_style_handler))
        .route("/api/style/blend", post(blend_style_handler))
        // Idea-to-Universe Genesis
        .route("/api/genesis/outline", post(generate_idea_outline_handler))
        .route("/api/genesis/multiverse", post(generate_multiverse_handler))
        // Reader Psychology & Information Asymmetry
        .route("/api/novels/{id}/reader-psychology", get(get_reader_psychology_handler))
        .route("/api/novels/{id}/asymmetry", get(list_asymmetry_handler).post(save_asymmetry_handler))
        .route("/api/novels/{id}/offscreen-news", get(list_offscreen_news_handler))
        // Epiphany Sparks & Reader Co-Creation Hub
        .route("/api/novels/{id}/sparks", get(list_sparks_handler).post(save_spark_handler))
        .route("/api/sparks/{id}", delete(delete_spark_handler))
        .route("/api/novels/{id}/reader-discussions", get(list_reader_discussions_handler).post(save_reader_discussion_handler))
        .route("/api/sparks/collide", post(collide_sparks_handler))
        // Central Skill & Reusable Asset Vault
        .route("/api/skills/vault", get(list_skills_vault_handler).post(save_skill_vault_handler))
        .route("/api/skills/vault/{id}", delete(delete_skill_vault_handler))
        .route("/api/skills/auto-match", post(auto_match_skills_handler))
        .route("/api/skills/extract", post(extract_skill_handler))
        .route("/api/skills/subvert", post(subvert_skill_handler))
        // Autonomous Marathon Autopilot
        .route("/api/autopilot/generate-segment", post(generate_autopilot_segment_handler))
        // LLM Proxy
        .route("/api/llm/test-connection", post(test_llm_connection))
        .route("/api/llm/proxy", post(proxy_llm))
        .route("/api/llm/stream", post(stream_llm))
        .with_state(state)
}

pub fn app(state: Arc<AppState>) -> Router {
    create_router(state)
}


// ----------------- Handlers -----------------

async fn health_check(State(state): State<Arc<AppState>>) -> Json<Value> {
    let db_status = state.storage.get_database_status();
    Json(json!({
        "status": "ok",
        "service": "NovManager Rust Backend (High Performance)",
        "version": "1.0.0",
        "database": db_status,
        "sqlite_local": db_status,
        "git_vcs": {
            "ready": true,
            "repo_dir": state.git.get_repo_dir()
        }
    }))
}

async fn list_novels(State(state): State<Arc<AppState>>) -> impl IntoResponse {
    match state.storage.list_novels() {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn create_or_update_novel(
    State(state): State<Arc<AppState>>,
    Json(novel): Json<Novel>,
) -> impl IntoResponse {
    match state.storage.create_or_update_novel(novel) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn sync_novel_bundle(
    State(state): State<Arc<AppState>>,
    Json(bundle): Json<Value>,
) -> impl IntoResponse {
    let novel_val = bundle.get("novel").unwrap_or(&bundle);
    let novel: Novel = match serde_json::from_value(novel_val.clone()) {
        Ok(n) => n,
        Err(e) => return (StatusCode::BAD_REQUEST, Json(json!({"error": format!("Invalid novel in bundle: {}", e)}))).into_response(),
    };

    if let Err(e) = state.storage.create_or_update_novel(novel.clone()) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
    }

    if let Err(e) = state.storage.import_json_store(&bundle) {
        return (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response();
    }

    Json(json!({
        "status": "success",
        "novel": novel
    })).into_response()
}

async fn set_active_novel(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.set_active_novel_id(&id) {
        Ok(true) => Json(json!({"status": "success", "active_novel_id": id})).into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"detail": "小说不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn delete_novel(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.delete_novel(&id) {
        Ok(true) => Json(json!({"status": "success", "deleted_novel_id": id})).into_response(),
        Ok(false) => Json(json!({"status": "not_found", "deleted_novel_id": id})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_novel(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_novel(&id) {
        Ok(Some(n)) => Json(n).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "小说不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_novel_bundle(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_novel_bundle(&id) {
        Ok(Some(bundle)) => Json(bundle).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "小说不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_world_settings(
    Path(id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let cat = params.get("category").map(|s| s.as_str());
    match state.storage.get_world_settings(&id, cat) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn query_lore(
    Path(id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let q = match params.get("q") {
        Some(query) => query.as_str(),
        None => return (StatusCode::BAD_REQUEST, Json(json!({"detail": "缺少检索关键词 q"}))).into_response(),
    };
    let cat = params.get("category").map(|s| s.as_str());

    match state.storage.query_lore(&id, q, cat) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_characters(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_characters(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_character(
    Path((_id, char_id)): Path<(String, String)>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_character(&char_id) {
        Ok(Some(c)) => Json(c).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "人物不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_character_state(
    Path(char_id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let idx = params.get("chapter_index").and_then(|s| s.parse::<i64>().ok());
    match state.storage.get_character_state_at_chapter(&char_id, idx) {
        Ok(Some(st)) => Json(st).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "该角色尚无状态记录"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn update_character_state(
    State(state): State<Arc<AppState>>,
    Json(req): Json<UpdateCharacterStateRequest>,
) -> impl IntoResponse {
    match state.storage.update_character_state(req) {
        Ok(st) => Json(st).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_character_relations(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_character_relations(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn update_character_relation(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(rel): Json<CharacterRelation>,
) -> impl IntoResponse {
    match state.storage.update_character_relation(&id, rel) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn delete_character_relation(
    Path((_id, relation_id)): Path<(String, String)>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.delete_character_relation(&relation_id) {
        Ok(true) => Json(json!({"status": "success", "deleted_id": relation_id})).into_response(),
        Ok(false) => Json(json!({"status": "not_found", "deleted_id": relation_id})).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_outlines(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_volumes(&id) {
        Ok(vols) => Json(vols).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_chapter_context(
    Path((id, chapter_id)): Path<(String, String)>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let novel = match state.storage.get_novel(&id) {
        Ok(Some(n)) => n,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"detail": "小说不存在"}))).into_response(),
    };
    let chapter = match state.storage.get_chapter(&chapter_id) {
        Ok(Some(c)) => c,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"detail": "章节不存在"}))).into_response(),
    };

    let characters = state.storage.get_characters(&id).unwrap_or_default();
    let rules = state.storage.get_world_settings(&id, None).unwrap_or_default();
    let foreshadowings = state.storage.get_foreshadowings(&id, Some("PLANTED")).unwrap_or_default();

    let mut char_details = Vec::new();
    for c in &characters {
        let st = state.storage.get_character_state_at_chapter(&c.id, Some(chapter.chapter_index)).ok().flatten();
        char_details.push(json!({
            "id": c.id,
            "name": c.name,
            "role_type": c.role_type,
            "voice": c.profile.voice_and_tone,
            "motivation": c.profile.core_motivation,
            "flaw": c.profile.fatal_flaw,
            "current_state": st
        }));
    }

    let rules_summary: Vec<String> = rules.iter().map(|r| format!("【{}】: {}", r.name, r.content)).collect();

    Json(json!({
        "novel_title": novel.title,
        "genre": novel.genre,
        "style_guide": novel.style_guide,
        "chapter": {
            "id": chapter.id,
            "chapter_index": chapter.chapter_index,
            "title": chapter.title,
            "outline": chapter.outline,
            "scenes": chapter.scenes
        },
        "characters": char_details,
        "rules_summary": rules_summary,
        "active_foreshadowings": foreshadowings
    })).into_response()
}

async fn save_scene_draft(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SaveSceneDraftRequest>,
) -> impl IntoResponse {
    match state.storage.save_scene_draft(req) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn check_consistency(
    State(state): State<Arc<AppState>>,
    Json(req): Json<CheckConsistencyRequest>,
) -> impl IntoResponse {
    match state.storage.check_setting_consistency(req) {
        Ok(issues) => Json(issues).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_foreshadowings(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_foreshadowings(&id, None) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn record_foreshadowing(
    State(state): State<Arc<AppState>>,
    Json(req): Json<RecordForeshadowingRequest>,
) -> impl IntoResponse {
    match state.storage.record_foreshadowing(req) {
        Ok(f) => Json(f).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_polish_techniques(
    Path(id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let cat = params.get("category").map(|s| s.as_str());
    match state.storage.get_polish_techniques(&id, cat) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_polish_techniques(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut req): Json<SaveTechniquesRequest>,
) -> impl IntoResponse {
    req.novel_id = id;
    match state.storage.save_polish_techniques(req) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_polish_techniques_stats(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_polish_techniques_stats(&id) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_git_history(
    Path(id): Path<String>,
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let chapter_id = params.get("chapter_id").map(|s| s.as_str());
    let limit = params.get("limit").and_then(|s| s.parse::<i64>().ok()).unwrap_or(20);
    let history = state.git.list_history(&id, chapter_id, limit);
    Json(history)
}

async fn create_git_snapshot(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GitSnapshotRequest>,
) -> impl IntoResponse {
    let res = state.git.create_milestone_snapshot(
        &req.novel_id,
        &req.chapter_id,
        req.scene_index,
        &req.content,
        &req.message,
        &req.tag,
    );
    Json(res)
}

async fn get_git_commit_diff(
    Path(commit_hash): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let diff = state.git.get_commit_diff(&commit_hash);
    Json(json!({
        "commit_hash": commit_hash,
        "diff": diff
    }))
}

async fn restore_git_snapshot(
    State(state): State<Arc<AppState>>,
    Json(req): Json<GitRestoreRequest>,
) -> impl IntoResponse {
    let success = state.git.restore_file_at_commit(&req.rel_path, &req.commit_hash);
    Json(json!({
        "success": success,
        "rel_path": req.rel_path,
        "commit_hash": req.commit_hash
    }))
}

async fn evaluate_draft_quality(
    State(state): State<Arc<AppState>>,
    Json(req): Json<EvaluateDraftRequest>,
) -> impl IntoResponse {
    let eval_res = AutonomousWritingEvaluator::evaluate_draft(
        &req.novel_id,
        &req.chapter_id,
        req.scene_index,
        &req.draft_text,
        req.scene_goal.as_deref(),
    );

    let _ = state.storage.save_evaluation(&eval_res);
    Json(eval_res)
}

async fn generate_reflection_plan(
    Json(eval_res): Json<SelfEvaluationResult>,
) -> impl IntoResponse {
    let plan = AutonomousReflector::generate_reflection_strategy(&eval_res);
    Json(plan)
}

async fn get_evolution_history(
    Query(params): Query<HashMap<String, String>>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let nid = params.get("novel_id").map(|s| s.as_str());
    let cid = params.get("chapter_id").map(|s| s.as_str());
    match state.storage.list_evaluations(nid, cid) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn submit_author_feedback(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AuthorFeedbackRequest>,
) -> impl IntoResponse {
    state.tuner.record_author_feedback(req.accepted_as_is, req.diff_length_ratio);
    let (weights, instruction) = state.tuner.get_status();
    Json(json!({
        "status": "success",
        "tuned_weights": weights,
        "instructions": instruction
    }))
}

async fn get_tuner_status(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let (weights, instruction) = state.tuner.get_status();
    Json(json!({
        "weights": weights,
        "instruction": instruction
    }))
}

async fn pack_scene_context(
    State(state): State<Arc<AppState>>,
    Json(req): Json<PackContextRequest>,
) -> impl IntoResponse {
    let novel = match state.storage.get_novel(&req.novel_id) {
        Ok(Some(n)) => n,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"detail": "小说不存在"}))).into_response(),
    };

    let characters = state.storage.get_characters(&req.novel_id).unwrap_or_default();
    let char_map: HashMap<String, Character> = characters.into_iter().map(|c| (c.id.clone(), c)).collect();

    let mut involved = Vec::new();
    if let Some(char_ids) = req.involved_character_ids {
        for cid in char_ids {
            if let Some(c) = char_map.get(&cid) {
                let st = state.storage.get_character_state_at_chapter(&cid, Some(req.chapter_index)).ok().flatten();
                involved.push(json!({
                    "name": c.name,
                    "role_type": c.role_type,
                    "state": st
                }));
            }
        }
    }

    let rules = state.storage.get_world_settings(&req.novel_id, None).unwrap_or_default();
    let rules_val: Vec<Value> = rules.into_iter().map(|r| json!(r)).collect();

    let foreshadowings = state.storage.get_foreshadowings(&req.novel_id, Some("PLANTED")).unwrap_or_default();
    let foreshadowings_val: Vec<Value> = foreshadowings.into_iter().map(|f| json!(f)).collect();

    let packed = state.context_packer.pack_scene_context(
        &novel.title,
        &novel.genre,
        req.chapter_index,
        &req.scene_goal,
        req.scene_conflict.as_deref().unwrap_or(""),
        &involved,
        &rules_val,
        &foreshadowings_val,
        req.previous_scene_summary.as_deref().unwrap_or(""),
    );

    Json(packed).into_response()
}

async fn get_tension_curve(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let resolved = state.storage.resolve_novel_id(Some(&id));
    match state.storage.get_volumes(&resolved) {
        Ok(vols) => Json(AnalyticsCalculator::calculate_tension_curve(&resolved, &vols)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_relationship_graph(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let resolved = state.storage.resolve_novel_id(Some(&id));
    let chars = state.storage.get_characters(&resolved).unwrap_or_default();
    let rels = state.storage.get_character_relations(&resolved).unwrap_or_default();
    Json(AnalyticsCalculator::calculate_relationship_graph(&chars, &rels))
}

async fn get_timeline_matrix(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let resolved = state.storage.resolve_novel_id(Some(&id));
    let volumes = state.storage.get_volumes(&resolved).unwrap_or_default();
    let chars = state.storage.get_characters(&resolved).unwrap_or_default();
    Json(AnalyticsCalculator::calculate_timeline_matrix(&resolved, &volumes, &chars))
}

async fn get_foreshadowing_radar(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    let resolved = state.storage.resolve_novel_id(Some(&id));
    let foreshadowings = state.storage.get_foreshadowings(&resolved, None).unwrap_or_default();
    let volumes = state.storage.get_volumes(&resolved).unwrap_or_default();
    Json(AnalyticsCalculator::calculate_foreshadowing_radar(&foreshadowings, &volumes))
}

async fn diagnose_dialogue(
    Json(req): Json<DialogueDoctorRequest>,
) -> impl IntoResponse {
    Json(AnalyticsCalculator::diagnose_dialogue(req))
}

async fn direct_action(
    Json(req): Json<ActionDirectorRequest>,
) -> impl IntoResponse {
    Json(AnalyticsCalculator::direct_action(req))
}

async fn typeset_novel(
    State(state): State<Arc<AppState>>,
    Json(req): Json<TypesetRequest>,
) -> impl IntoResponse {
    let resolved = state.storage.resolve_novel_id(Some(&req.novel_id));
    let novel = match state.storage.get_novel(&resolved) {
        Ok(Some(n)) => n,
        _ => return (StatusCode::NOT_FOUND, Json(json!({"detail": "小说不存在"}))).into_response(),
    };
    let volumes = state.storage.get_volumes(&resolved).unwrap_or_default();
    Json(AnalyticsCalculator::typeset_novel(&novel.title, &volumes, &req.format)).into_response()
}

// ----------------- LLM Proxy -----------------

fn normalize_llm_endpoint(endpoint: &str) -> String {
    let ep = endpoint.trim().trim_end_matches('/');
    if ep.is_empty() {
        return "https://api.deepseek.com/v1/chat/completions".to_string();
    }
    if ep.ends_with("/chat/completions") {
        ep.to_string()
    } else if ep.ends_with("/v1") {
        format!("{}/chat/completions", ep)
    } else {
        format!("{}/v1/chat/completions", ep)
    }
}

async fn test_llm_connection(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LLMTestConnectionRequest>,
) -> impl IntoResponse {
    let target_url = normalize_llm_endpoint(&req.endpoint);
    let mut builder = state.http_client.post(&target_url);

    if let Some(key) = &req.api_key {
        if !key.trim().is_empty() {
            builder = builder.header("Authorization", format!("Bearer {}", key.trim()));
        }
    }

    let payload = json!({
        "model": req.model.trim(),
        "messages": [{"role": "user", "content": "ping"}],
        "max_tokens": 10
    });

    let start = Instant::now();
    match builder.json(&payload).send().await {
        Ok(resp) => {
            let elapsed_ms = start.elapsed().as_millis() as i64;
            let status = resp.status().as_u16();
            if status == 200 {
                let data: Value = resp.json().await.unwrap_or(json!({}));
                let content = data
                    .get("choices")
                    .and_then(|c| c.get(0))
                    .and_then(|ch| ch.get("message"))
                    .and_then(|m| m.get("content"))
                    .and_then(|c| c.as_str())
                    .unwrap_or("OK");

                Json(json!({
                    "success": true,
                    "status_code": 200,
                    "latency_ms": elapsed_ms,
                    "model": req.model,
                    "reply": content,
                    "message": format!("连接成功！响应耗时 {}ms", elapsed_ms)
                })).into_response()
            } else {
                let err_text = resp.text().await.unwrap_or_default();
                Json(json!({
                    "success": false,
                    "status_code": status,
                    "latency_ms": elapsed_ms,
                    "error": format!("HTTP {}: {}", status, err_text.chars().take(200).collect::<String>())
                })).into_response()
            }
        }
        Err(e) => {
            let elapsed_ms = start.elapsed().as_millis() as i64;
            Json(json!({
                "success": false,
                "latency_ms": elapsed_ms,
                "error": format!("连接失败: {}", e)
            })).into_response()
        }
    }
}

async fn proxy_llm(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LLMProxyRequest>,
) -> impl IntoResponse {
    let target_url = normalize_llm_endpoint(&req.endpoint);
    let mut builder = state.http_client.post(&target_url);

    if let Some(key) = &req.api_key {
        if !key.trim().is_empty() {
            builder = builder.header("Authorization", format!("Bearer {}", key.trim()));
        }
    }

    let mut payload = json!({
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature.unwrap_or(0.7),
    });

    if let Some(max_tokens) = req.max_tokens {
        payload["max_tokens"] = json!(max_tokens);
    }

    match builder.json(&payload).send().await {
        Ok(resp) => {
            let status = resp.status();
            if status.is_success() {
                let data: Value = resp.json().await.unwrap_or(json!({}));
                Json(data).into_response()
            } else {
                let err_body = resp.text().await.unwrap_or_default();
                (
                    StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::BAD_GATEWAY),
                    Json(json!({"detail": err_body})),
                ).into_response()
            }
        }
        Err(e) => (
            StatusCode::BAD_GATEWAY,
            Json(json!({"detail": format!("上游网关连接异常: {}", e)})),
        ).into_response(),
    }
}

async fn stream_llm(
    State(state): State<Arc<AppState>>,
    Json(req): Json<LLMProxyRequest>,
) -> impl IntoResponse {
    let target_url = normalize_llm_endpoint(&req.endpoint);
    let mut builder = state.http_client.post(&target_url);

    if let Some(key) = &req.api_key {
        if !key.trim().is_empty() {
            builder = builder.header("Authorization", format!("Bearer {}", key.trim()));
        }
    }

    let mut payload = json!({
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature.unwrap_or(0.7),
        "stream": true
    });

    if let Some(max_tokens) = req.max_tokens {
        payload["max_tokens"] = json!(max_tokens);
    }

    let stream = async_stream::stream! {
        match builder.json(&payload).send().await {
            Ok(resp) => {
                let mut bytes_stream = resp.bytes_stream();
                while let Some(chunk_res) = bytes_stream.next().await {
                    match chunk_res {
                        Ok(bytes) => {
                            if let Ok(text) = String::from_utf8(bytes.to_vec()) {
                                for line in text.lines() {
                                    let trimmed = line.trim();
                                    if !trimmed.is_empty() {
                                        yield Ok::<Event, std::convert::Infallible>(Event::default().data(trimmed.to_string()));
                                    }
                                }
                            }
                        }
                        Err(e) => {
                            yield Ok::<Event, std::convert::Infallible>(Event::default().data(json!({"error": e.to_string()}).to_string()));
                            break;
                        }
                    }
                }
            }
            Err(e) => {
                yield Ok::<Event, std::convert::Infallible>(Event::default().data(json!({"error": e.to_string()}).to_string()));
            }
        }
    };

    Sse::new(stream)
}

// ----------------- Video Storyboard Handlers -----------------

async fn list_video_storyboards(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_video_storyboards(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_video_storyboard(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_video_storyboard(&id) {
        Ok(Some(sb)) => Json(sb).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "分镜母本不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn create_or_update_video_storyboard(
    State(state): State<Arc<AppState>>,
    Json(sb): Json<VideoStoryboard>,
) -> impl IntoResponse {
    match state.storage.create_or_update_video_storyboard(sb) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn add_video_shot(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(shot): Json<VideoShot>,
) -> impl IntoResponse {
    match state.storage.add_video_shot(&id, shot) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn update_video_shot(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut shot): Json<VideoShot>,
) -> impl IntoResponse {
    shot.id = id;
    match state.storage.update_video_shot(shot) {
        Ok(Some(saved)) => Json(saved).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "镜头不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn delete_video_shot(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.delete_video_shot(&id) {
        Ok(true) => Json(json!({"status": "success", "deleted_shot_id": id})).into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"detail": "镜头不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn export_video_storyboard(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut req): Json<ExportVideoPromptRequest>,
) -> impl IntoResponse {
    req.storyboard_id = Some(id.clone());
    match state.storage.get_video_storyboard(&id) {
        Ok(Some(sb)) => {
            let res = VideoExporter::export_prompts(&sb, &req);
            Json(res).into_response()
        }
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"detail": "分镜母本不存在"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Workflow Pipeline Handlers -----------------

async fn get_workflow_pipeline(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_workflow_pipeline(&id) {
        Ok(pipe) => Json(pipe).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn advance_workflow_step(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(req): Json<AdvanceWorkflowStepRequest>,
) -> impl IntoResponse {
    match state.storage.advance_workflow_step(
        &id,
        req.node_id.as_deref(),
        req.status.as_deref(),
        req.output_summary.as_deref(),
        req.agent_role.as_deref(),
    ) {
        Ok(pipe) => Json(pipe).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Gods Eye State Handlers -----------------

async fn get_gods_eye_state(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_gods_eye_state(&id) {
        Ok(ge) => Json(ge).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_gods_eye_state(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut ge): Json<GodsEyeState>,
) -> impl IntoResponse {
    ge.novel_id = id;
    match state.storage.save_gods_eye_state(ge) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Dungeon Arcs Handlers -----------------

async fn list_dungeon_arcs(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_dungeon_arcs(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_dungeon_arc(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut arc): Json<DungeonArc>,
) -> impl IntoResponse {
    arc.novel_id = id;
    match state.storage.create_or_update_dungeon_arc(arc) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Model Provider & Router Handlers -----------------

async fn list_model_providers(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_model_providers() {
        Ok(providers) => Json(providers).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_model_provider(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_model_provider(&id) {
        Ok(Some(p)) => Json(p).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "Model provider not found"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn create_model_provider(
    State(state): State<Arc<AppState>>,
    Json(provider): Json<ModelProvider>,
) -> impl IntoResponse {
    match state.storage.create_or_update_model_provider(provider) {
        Ok(created) => (StatusCode::CREATED, Json(created)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn update_model_provider(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut provider): Json<ModelProvider>,
) -> impl IntoResponse {
    provider.id = id;
    match state.storage.create_or_update_model_provider(provider) {
        Ok(updated) => Json(updated).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn delete_model_provider(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.delete_model_provider(&id) {
        Ok(true) => Json(json!({"success": true, "deleted_id": id})).into_response(),
        Ok(false) => (StatusCode::NOT_FOUND, Json(json!({"error": "Provider not found"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_model_roles(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_model_role_assignments() {
        Ok(roles) => Json(roles).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_model_role(
    State(state): State<Arc<AppState>>,
    Json(assignment): Json<ModelRoleAssignment>,
) -> impl IntoResponse {
    match state.storage.save_model_role_assignment(assignment) {
        Ok(saved) => Json(saved).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn simulate_fallback_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<FallbackSimulateRequest>,
) -> impl IntoResponse {
    match state.storage.simulate_model_fallback(req) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

#[derive(Deserialize)]
struct TelemetryQuery {
    limit: Option<usize>,
}

async fn list_telemetry_handler(
    Query(q): Query<TelemetryQuery>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_model_telemetry(q.limit) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Style DNA Handlers -----------------

async fn list_style_profiles(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_style_dna_profiles() {
        Ok(profiles) => Json(profiles).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn get_style_profile(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_style_dna_profile(&id) {
        Ok(Some(p)) => Json(p).into_response(),
        Ok(None) => (StatusCode::NOT_FOUND, Json(json!({"error": "Style DNA profile not found"}))).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn extract_style_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExtractStyleDnaRequest>,
) -> impl IntoResponse {
    match state.storage.extract_style_dna(req) {
        Ok(profile) => (StatusCode::CREATED, Json(profile)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn blend_style_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<StyleFusionRequest>,
) -> impl IntoResponse {
    match state.storage.blend_style_dna(req) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Idea-to-Universe Genesis Handlers -----------------

async fn generate_idea_outline_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<IdeaGenesisRequest>,
) -> impl IntoResponse {
    match state.storage.generate_idea_universe(req) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn generate_multiverse_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<MultiverseBranchRequest>,
) -> impl IntoResponse {
    match state.storage.generate_multiverse_branches(&req.novel_id, req.divergence_point.as_deref()) {
        Ok(branches) => Json(branches).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Reader Psychology & Information Asymmetry Handlers -----------------

#[derive(Deserialize)]
struct ChapterOptionalQuery {
    chapter_id: Option<String>,
}

async fn get_reader_psychology_handler(
    Path(id): Path<String>,
    Query(q): Query<ChapterOptionalQuery>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.get_reader_psychology_report(&id, q.chapter_id.as_deref()) {
        Ok(report) => Json(report).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_asymmetry_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_information_asymmetry(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_asymmetry_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut item): Json<InformationAsymmetryItem>,
) -> impl IntoResponse {
    item.novel_id = id;
    match state.storage.save_information_asymmetry(item) {
        Ok(saved) => (StatusCode::CREATED, Json(saved)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_offscreen_news_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_offscreen_news_events(&id) {
        Ok(events) => Json(events).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

// ----------------- Epiphany Sparks & Reader Co-Creation Hub Handlers -----------------

async fn list_sparks_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_epiphany_sparks(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_spark_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut spark): Json<EpiphanySpark>,
) -> impl IntoResponse {
    spark.novel_id = id;
    match state.storage.save_epiphany_spark(spark) {
        Ok(saved) => (StatusCode::CREATED, Json(saved)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn delete_spark_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.delete_epiphany_spark(&id) {
        Ok(deleted) => Json(json!({ "success": deleted })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn list_reader_discussions_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_reader_discussions(&id) {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_reader_discussion_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
    Json(mut comment): Json<ReaderDiscussionComment>,
) -> impl IntoResponse {
    comment.novel_id = id;
    match state.storage.save_reader_discussion(comment) {
        Ok(saved) => (StatusCode::CREATED, Json(saved)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn collide_sparks_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SparkCollideRequest>,
) -> impl IntoResponse {
    let result = state.storage.collide_sparks(req);
    Json(result).into_response()
}

// ----------------- Central Skill & Reusable Asset Vault Handlers -----------------

async fn list_skills_vault_handler(
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.list_creation_skills() {
        Ok(list) => Json(list).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn save_skill_vault_handler(
    State(state): State<Arc<AppState>>,
    Json(skill): Json<CreationSkillItem>,
) -> impl IntoResponse {
    match state.storage.save_creation_skill(skill) {
        Ok(saved) => (StatusCode::CREATED, Json(saved)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn delete_skill_vault_handler(
    Path(id): Path<String>,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    match state.storage.delete_creation_skill(&id) {
        Ok(deleted) => Json(json!({ "success": deleted })).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn auto_match_skills_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SkillAutoMatchRequest>,
) -> impl IntoResponse {
    match state.storage.auto_match_skills(req) {
        Ok(res) => Json(res).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn extract_skill_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<ExtractSkillRequest>,
) -> impl IntoResponse {
    match state.storage.extract_skill_from_manuscript(req) {
        Ok(saved) => (StatusCode::CREATED, Json(saved)).into_response(),
        Err(e) => (StatusCode::INTERNAL_SERVER_ERROR, Json(json!({"error": e.to_string()}))).into_response(),
    }
}

async fn subvert_skill_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<SubvertSkillRequest>,
) -> impl IntoResponse {
    let variants = state.storage.subvert_trope_skill(req);
    Json(variants).into_response()
}

// ----------------- Autonomous Marathon Autopilot Handler -----------------

async fn generate_autopilot_segment_handler(
    State(state): State<Arc<AppState>>,
    Json(req): Json<AutopilotSegmentRequest>,
) -> impl IntoResponse {
    let segment = state.storage.generate_autopilot_segment(req);
    Json(segment).into_response()
}



