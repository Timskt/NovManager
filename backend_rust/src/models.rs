#![allow(dead_code)]

use chrono::Utc;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

fn default_tone() -> String {
    "冷峻克制，重智斗博弈，重因果逻辑".to_string()
}
fn default_pacing() -> String {
    "张弛有度，高潮利落".to_string()
}
fn default_desc_density() -> String {
    "适中".to_string()
}
fn default_forbidden() -> Vec<String> {
    vec![
        "恐怖如斯".to_string(),
        "倒吸一口凉气".to_string(),
        "桀桀怪笑".to_string(),
    ]
}
fn default_genre() -> String {
    "仙侠修真".to_string()
}
fn default_target_words() -> i64 {
    1_000_000
}
fn default_pov() -> String {
    "THIRD_LIMITED".to_string()
}
fn default_iso_now() -> String {
    Utc::now().to_rfc3339()
}
fn default_priority() -> i64 {
    50
}
fn default_role() -> String {
    "SUPPORTING".to_string()
}
fn default_gender() -> String {
    "男".to_string()
}
fn default_one() -> i64 {
    1
}
fn default_health() -> String {
    "HEALTHY".to_string()
}
fn default_word_goal() -> i64 {
    3000
}
fn default_chapter_status() -> String {
    "PLANNED".to_string()
}
fn default_foreshadowing_status() -> String {
    "PLANTED".to_string()
}
fn default_hundred() -> Option<i64> {
    Some(100)
}
fn default_tech_category() -> String {
    "PACING".to_string()
}
fn default_tech_category_label() -> String {
    "节奏张力".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleGuide {
    #[serde(default = "default_tone")]
    pub tone: String,
    #[serde(default = "default_pacing")]
    pub pacing: String,
    #[serde(default = "default_desc_density", alias = "descriptionDensity")]
    pub description_density: String,
    #[serde(default = "default_forbidden", alias = "forbiddenPhrases")]
    pub forbidden_phrases: Vec<String>,
}

impl Default for StyleGuide {
    fn default() -> Self {
        Self {
            tone: default_tone(),
            pacing: default_pacing(),
            description_density: default_desc_density(),
            forbidden_phrases: default_forbidden(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Novel {
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub subtitle: Option<String>,
    #[serde(default = "default_genre")]
    pub genre: String,
    #[serde(default = "default_target_words", alias = "targetWordCount")]
    pub target_word_count: i64,
    #[serde(default, alias = "currentWordCount")]
    pub current_word_count: i64,
    #[serde(default = "default_pov", alias = "defaultPov")]
    pub default_pov: String,
    #[serde(default, alias = "styleGuide")]
    pub style_guide: StyleGuide,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
    #[serde(default = "default_iso_now", alias = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorldSetting {
    pub id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    pub category: String,
    pub name: String,
    #[serde(default)]
    pub aliases: Vec<String>,
    #[serde(default)]
    pub content: String,
    #[serde(default = "default_priority")]
    pub priority: i64,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CharacterProfile {
    #[serde(default)]
    pub identity: Option<String>,
    #[serde(default)]
    pub appearance: String,
    #[serde(default, alias = "personalityTraits")]
    pub personality_traits: Vec<String>,
    #[serde(default, alias = "voiceAndTone")]
    pub voice_and_tone: String,
    #[serde(default, alias = "coreMotivation")]
    pub core_motivation: String,
    #[serde(default, alias = "fatalFlaw")]
    pub fatal_flaw: String,
    #[serde(default)]
    pub catchphrases: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Character {
    pub id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    pub name: String,
    #[serde(default = "default_role", alias = "roleType")]
    pub role_type: String,
    #[serde(default = "default_gender")]
    pub gender: String,
    #[serde(default)]
    pub profile: CharacterProfile,
    #[serde(default)]
    pub background: String,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterState {
    pub id: String,
    #[serde(alias = "characterId")]
    pub character_id: String,
    #[serde(default, alias = "chapterId")]
    pub chapter_id: String,
    #[serde(default = "default_one", alias = "chapterIndex")]
    pub chapter_index: i64,
    #[serde(default)]
    pub location: String,
    #[serde(default, alias = "combatPower")]
    pub combat_power: String,
    #[serde(default = "default_health", alias = "healthStatus")]
    pub health_status: String,
    #[serde(default, alias = "statusTags")]
    pub status_tags: Vec<String>,
    #[serde(default, alias = "stateSummary")]
    pub state_summary: String,
    #[serde(default = "default_iso_now", alias = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CharacterRelation {
    pub id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "fromCharacterId")]
    pub from_character_id: String,
    #[serde(alias = "toCharacterId")]
    pub to_character_id: String,
    #[serde(alias = "relationType")]
    pub relation_type: String,
    #[serde(default, alias = "affinityScore")]
    pub affinity_score: i64,
    #[serde(default)]
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Scene {
    pub id: String,
    #[serde(alias = "chapterId")]
    pub chapter_id: String,
    #[serde(alias = "sceneIndex")]
    pub scene_index: i64,
    #[serde(default, alias = "sceneGoal")]
    pub scene_goal: String,
    #[serde(default)]
    pub conflict: String,
    #[serde(default, alias = "turnPoint")]
    pub turn_point: String,
    #[serde(default)]
    pub outcome: String,
    #[serde(default, alias = "involvedCharacterIds")]
    pub involved_character_ids: Vec<String>,
    #[serde(default)]
    pub location: String,
    #[serde(default, alias = "draftContent")]
    pub draft_content: String,
    #[serde(default, alias = "agentNotes")]
    pub agent_notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chapter {
    pub id: String,
    #[serde(alias = "volumeId")]
    pub volume_id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "chapterIndex")]
    pub chapter_index: i64,
    pub title: String,
    #[serde(default)]
    pub outline: String,
    #[serde(default, alias = "povCharacterId")]
    pub pov_character_id: Option<String>,
    #[serde(default = "default_word_goal", alias = "wordCountGoal")]
    pub word_count_goal: i64,
    #[serde(default, alias = "actualWordCount")]
    pub actual_word_count: i64,
    #[serde(default = "default_chapter_status")]
    pub status: String,
    #[serde(default)]
    pub scenes: Vec<Scene>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Volume {
    pub id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "volumeIndex")]
    pub volume_index: i64,
    pub title: String,
    #[serde(default)]
    pub summary: Option<String>,
    #[serde(default, alias = "mainConflict")]
    pub main_conflict: String,
    #[serde(default, alias = "targetClimax")]
    pub target_climax: String,
    #[serde(default, alias = "boundaryConstraints")]
    pub boundary_constraints: Option<String>,
    #[serde(default)]
    pub chapters: Vec<Chapter>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Foreshadowing {
    pub id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    pub title: String,
    #[serde(alias = "clueDescription")]
    pub clue_description: String,
    #[serde(alias = "plantedChapterId")]
    pub planted_chapter_id: String,
    #[serde(default, alias = "plantedChapterIndex")]
    pub planted_chapter_index: Option<i64>,
    #[serde(default, alias = "plannedResolveChapterId")]
    pub planned_resolve_chapter_id: Option<String>,
    #[serde(default, alias = "plannedResolveChapterIndex")]
    pub planned_resolve_chapter_index: Option<i64>,
    #[serde(default, alias = "actualResolvedChapterId")]
    pub actual_resolved_chapter_id: Option<String>,
    #[serde(default = "default_foreshadowing_status")]
    pub status: String,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InspectionIssue {
    pub id: String,
    #[serde(alias = "issueType")]
    pub issue_type: String,
    pub severity: String,
    #[serde(alias = "locationSnippet")]
    pub location_snippet: String,
    pub explanation: String,
    #[serde(alias = "fixAdvice")]
    pub fix_advice: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ManuscriptVersion {
    pub id: String,
    #[serde(alias = "chapterId")]
    pub chapter_id: String,
    #[serde(alias = "versionNumber")]
    pub version_number: i64,
    #[serde(alias = "fullText")]
    pub full_text: String,
    #[serde(alias = "createdBy")]
    pub created_by: String,
    #[serde(default, alias = "changeSummary")]
    pub change_summary: String,
    #[serde(default = "default_hundred", alias = "inspectionScore")]
    pub inspection_score: Option<i64>,
    #[serde(default, alias = "inspectionReport")]
    pub inspection_report: Vec<InspectionIssue>,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolishTechnique {
    #[serde(default)]
    pub id: Option<String>,
    #[serde(default, alias = "novelId")]
    pub novel_id: Option<String>,
    #[serde(default, alias = "chapterId")]
    pub chapter_id: Option<String>,
    pub name: String,
    #[serde(default = "default_tech_category")]
    pub category: String,
    #[serde(default = "default_tech_category_label", alias = "categoryLabel")]
    pub category_label: String,
    #[serde(default)]
    pub description: String,
    #[serde(default, alias = "beforeSnippet")]
    pub before_snippet: Option<String>,
    #[serde(default, alias = "afterSnippet")]
    pub after_snippet: Option<String>,
    #[serde(default, alias = "applicableScene")]
    pub applicable_scene: Option<String>,
    #[serde(default = "default_one", alias = "appliedCount")]
    pub applied_count: i64,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
    #[serde(default = "default_iso_now", alias = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluationDimension {
    pub name: String,
    pub label: String,
    pub score: i64,
    pub diagnosis: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SelfEvaluationResult {
    pub id: String,
    pub novel_id: String,
    pub chapter_id: String,
    #[serde(default = "default_one")]
    pub scene_index: i64,
    pub overall_score: i64,
    pub dimensions: HashMap<String, EvaluationDimension>,
    pub strengths: Vec<String>,
    pub weaknesses: Vec<String>,
    pub suggested_refinements: Vec<String>,
    #[serde(default = "default_one")]
    pub iteration_count: i64,
    #[serde(default = "default_iso_now")]
    pub created_at: String,
}

// ----------------- 请求模型 -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveSceneDraftRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "chapterId")]
    pub chapter_id: String,
    #[serde(alias = "sceneIndex")]
    pub scene_index: i64,
    pub content: String,
    #[serde(default, alias = "agentNotes")]
    pub agent_notes: Option<String>,
    #[serde(default, alias = "createdBy")]
    pub created_by: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateCharacterStateRequest {
    #[serde(alias = "characterId")]
    pub character_id: String,
    #[serde(alias = "chapterId")]
    pub chapter_id: String,
    #[serde(default, alias = "chapterIndex")]
    pub chapter_index: Option<i64>,
    pub location: Option<String>,
    #[serde(alias = "combatPower")]
    pub combat_power: Option<String>,
    #[serde(alias = "healthStatus")]
    pub health_status: Option<String>,
    #[serde(alias = "statusTags")]
    pub status_tags: Option<Vec<String>>,
    #[serde(alias = "stateSummary")]
    pub state_summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CheckConsistencyRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "draftText")]
    pub draft_text: String,
    #[serde(default, alias = "involvedCharacterIds")]
    pub involved_character_ids: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecordForeshadowingRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    pub title: String,
    #[serde(alias = "clueDescription")]
    pub clue_description: String,
    #[serde(alias = "plantedChapterId")]
    pub planted_chapter_id: String,
    #[serde(default, alias = "plannedResolveChapterId")]
    pub planned_resolve_chapter_id: Option<String>,
    #[serde(default, alias = "plannedResolveChapterIndex")]
    pub planned_resolve_chapter_index: Option<i64>,
    #[serde(default)]
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaveTechniquesRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(default, alias = "chapterId")]
    pub chapter_id: Option<String>,
    pub techniques: Vec<PolishTechnique>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DialogueDoctorRequest {
    #[serde(alias = "dialogueText")]
    pub dialogue_text: String,
    #[serde(default, alias = "speakerName")]
    pub speaker_name: Option<String>,
    #[serde(default, alias = "speakerPersonality")]
    pub speaker_personality: Option<String>,
    #[serde(default, alias = "contextEmotion")]
    pub context_emotion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActionDirectorRequest {
    #[serde(alias = "combatantA")]
    pub combatant_a: String,
    #[serde(alias = "combatantB")]
    pub combatant_b: String,
    #[serde(default, alias = "realmA")]
    pub realm_a: Option<String>,
    #[serde(default, alias = "realmB")]
    pub realm_b: Option<String>,
    #[serde(default)]
    pub terrain: Option<String>,
    #[serde(default, alias = "coreMove")]
    pub core_move: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TypesetRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(default = "default_format")]
    pub format: String,
}

fn default_format() -> String {
    "markdown".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackContextRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "chapterIndex")]
    pub chapter_index: i64,
    #[serde(alias = "sceneGoal")]
    pub scene_goal: String,
    #[serde(default, alias = "sceneConflict")]
    pub scene_conflict: Option<String>,
    #[serde(default, alias = "involvedCharacterIds")]
    pub involved_character_ids: Option<Vec<String>>,
    #[serde(default, alias = "previousSceneSummary")]
    pub previous_scene_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitSnapshotRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "chapterId")]
    pub chapter_id: String,
    #[serde(alias = "sceneIndex")]
    pub scene_index: i64,
    pub content: String,
    pub message: String,
    #[serde(default = "default_tag")]
    pub tag: String,
}

fn default_tag() -> String {
    "draft".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GitRestoreRequest {
    #[serde(alias = "relPath")]
    pub rel_path: String,
    #[serde(alias = "commitHash")]
    pub commit_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluateDraftRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "chapterId")]
    pub chapter_id: String,
    #[serde(default = "default_one", alias = "sceneIndex")]
    pub scene_index: i64,
    #[serde(alias = "draftText")]
    pub draft_text: String,
    #[serde(default, alias = "sceneGoal")]
    pub scene_goal: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthorFeedbackRequest {
    #[serde(alias = "acceptedAsIs")]
    pub accepted_as_is: bool,
    #[serde(default, alias = "diffLengthRatio")]
    pub diff_length_ratio: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMTestConnectionRequest {
    pub endpoint: String,
    #[serde(default, alias = "apiKey")]
    pub api_key: Option<String>,
    pub model: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LLMProxyRequest {
    pub endpoint: String,
    #[serde(default, alias = "apiKey")]
    pub api_key: Option<String>,
    pub model: String,
    pub messages: Vec<serde_json::Value>,
    #[serde(default)]
    pub temperature: Option<f64>,
    #[serde(default, alias = "maxTokens")]
    pub max_tokens: Option<i64>,
}

// ----------------- Video Storyboard & Cine-AI Models -----------------

fn default_shot_duration() -> f32 {
    5.0
}
fn default_shot_type() -> String {
    "MEDIUM".to_string()
}
fn default_camera_movement() -> String {
    "STATIC".to_string()
}
fn default_aspect_ratio() -> String {
    "16:9".to_string()
}
fn default_target_platform() -> String {
    "SORA".to_string()
}
fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoShot {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "sceneId")]
    pub scene_id: String,
    #[serde(default, alias = "storyboardId")]
    pub storyboard_id: Option<String>,
    #[serde(default = "default_one", alias = "shotNumber")]
    pub shot_number: i64,
    #[serde(default = "default_shot_duration", alias = "durationSeconds")]
    pub duration_seconds: f32,
    #[serde(default = "default_shot_type", alias = "shotType")]
    pub shot_type: String, // CLOSE_UP, MEDIUM, WIDE, EXTREME_CLOSE_UP, AERIAL
    #[serde(default = "default_camera_movement", alias = "cameraMovement")]
    pub camera_movement: String, // DOLLY_IN, DOLLY_OUT, PAN_LEFT, PAN_RIGHT, TRACKING, ORBIT, VERTIGO_ZOOM, STATIC
    #[serde(default, alias = "visualPrompt")]
    pub visual_prompt: String,
    #[serde(default, alias = "motionPrompt")]
    pub motion_prompt: String,
    #[serde(default, alias = "negativePrompt")]
    pub negative_prompt: String,
    #[serde(default)]
    pub lighting: String,
    #[serde(default, alias = "characterReferences")]
    pub character_references: Vec<String>,
    #[serde(default, alias = "soundCue")]
    pub sound_cue: String,
    #[serde(default, alias = "dialogueCue")]
    pub dialogue_cue: String,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VideoStoryboard {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "novelId")]
    pub novel_id: String,
    #[serde(default, alias = "chapterId")]
    pub chapter_id: String,
    #[serde(default, alias = "sceneId")]
    pub scene_id: String,
    pub title: String,
    #[serde(default = "default_aspect_ratio", alias = "aspectRatio")]
    pub aspect_ratio: String, // 16:9, 9:16, 2.39:1
    #[serde(default = "default_target_platform", alias = "targetPlatform")]
    pub target_platform: String, // SORA, KLING, RUNWAY_GEN3, HAILUO_MINIMAX, MIDJOURNEY
    #[serde(default)]
    pub shots: Vec<VideoShot>,
    #[serde(default, alias = "totalDurationSeconds")]
    pub total_duration_seconds: f32,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
    #[serde(default = "default_iso_now", alias = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportVideoPromptRequest {
    #[serde(default, alias = "storyboardId")]
    pub storyboard_id: Option<String>,
    #[serde(default = "default_target_platform")]
    pub platform: String, // SORA, KLING, RUNWAY_GEN3, HAILUO_MINIMAX, MIDJOURNEY, COMFYUI_JSON
    #[serde(default = "default_true", alias = "includeCameraBrackets")]
    pub include_camera_brackets: bool,
    #[serde(default = "default_true", alias = "includeNegative")]
    pub include_negative: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExportVideoPromptResponse {
    pub platform: String,
    #[serde(alias = "formattedContent")]
    pub formatted_content: String,
    #[serde(alias = "shotsCount")]
    pub shots_count: i64,
    #[serde(alias = "totalDuration")]
    pub total_duration: f32,
    pub metadata: serde_json::Value,
}

// ----------------- Narrative & Workflow Pipeline Models -----------------

fn default_node_stage() -> String {
    "WORLD_GENESIS".to_string()
}
fn default_node_status() -> String {
    "PENDING".to_string()
}
fn default_agent_role() -> String {
    "NarrativeArchitect".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowNode {
    pub id: String,
    pub name: String,
    #[serde(default = "default_node_stage")]
    pub stage: String, // WORLD_GENESIS, OUTLINE, BEATS, DRAFT, CONSISTENCY_AUDIT, VIDEO_STORYBOARD
    #[serde(default = "default_node_status")]
    pub status: String, // PENDING, RUNNING, COMPLETED, FAILED
    #[serde(default = "default_agent_role", alias = "agentRole")]
    pub agent_role: String,
    #[serde(default, alias = "outputSummary")]
    pub output_summary: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkflowPipeline {
    pub id: String,
    #[serde(alias = "novelId")]
    pub novel_id: String,
    pub title: String,
    #[serde(default)]
    pub nodes: Vec<WorkflowNode>,
    #[serde(default, alias = "activeNodeId")]
    pub active_node_id: Option<String>,
    #[serde(default = "default_iso_now", alias = "updatedAt")]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdvanceWorkflowStepRequest {
    #[serde(default, alias = "novelId")]
    pub novel_id: Option<String>,
    #[serde(default, alias = "nodeId")]
    pub node_id: Option<String>,
    pub status: Option<String>,
    #[serde(default, alias = "outputSummary")]
    pub output_summary: Option<String>,
    #[serde(default, alias = "agentRole")]
    pub agent_role: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GodsEyeState {
    #[serde(default, alias = "novelId")]
    pub novel_id: String,
    #[serde(default, alias = "currentEra")]
    pub current_era: String,
    #[serde(default, alias = "celestialAnomalies")]
    pub celestial_anomalies: Vec<String>,
    #[serde(default, alias = "macroCrisisCountdownDays")]
    pub macro_crisis_countdown_days: i64,
    #[serde(default, alias = "offscreenFactions")]
    pub offscreen_factions: Vec<serde_json::Value>,
    #[serde(default, alias = "globalTensionIndex")]
    pub global_tension_index: f32,
    #[serde(default = "default_iso_now", alias = "updatedAt")]
    pub updated_at: String,
}

fn default_dungeon_stage() -> String {
    "ENTRANCE".to_string()
}
fn default_danger_level() -> i64 {
    5
}
fn default_survival_rate() -> f32 {
    0.5
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DungeonArc {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "arcName")]
    pub arc_name: String,
    pub location: String,
    #[serde(default = "default_dungeon_stage")]
    pub stage: String, // ENTRANCE, EXPLORATION, MID_CHAMBER, BOSS_BATTLE, EXTRACTION
    #[serde(default = "default_danger_level", alias = "dangerLevel")]
    pub danger_level: i64, // 1-10
    #[serde(default, alias = "milestoneGates")]
    pub milestone_gates: Vec<String>,
    #[serde(default, alias = "lootEconomy")]
    pub loot_economy: serde_json::Value,
    #[serde(default = "default_survival_rate", alias = "survivalRate")]
    pub survival_rate: f32,
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
}

fn default_rpm() -> u32 {
    60
}
fn default_tpm() -> u32 {
    100_000
}
fn default_zero_u64() -> u64 {
    0
}
fn default_zero_usize() -> usize {
    0
}
fn default_zero_u32() -> u32 {
    0
}
fn default_provider_type() -> String {
    "OpenAI".to_string()
}
fn default_health_status() -> String {
    "HEALTHY".to_string()
}
fn default_temp() -> f32 {
    0.7
}
fn default_top_p() -> f32 {
    0.9
}
fn default_max_tokens() -> u32 {
    4000
}
fn default_timeout_ms() -> u64 {
    30000
}
fn default_retry_count() -> u32 {
    3
}
fn default_status_code() -> u16 {
    200
}
fn default_zero_f64() -> f64 {
    0.0
}
fn default_zero_f32() -> f32 {
    0.0
}
fn default_half_f32() -> f32 {
    0.5
}

// ----------------- Model Provider & Resilience Router Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelProvider {
    #[serde(default)]
    pub id: String,
    pub name: String,
    #[serde(default = "default_provider_type", alias = "providerType")]
    pub provider_type: String, // OpenAI, Anthropic, Gemini, DeepSeek, SiliconFlow, Ollama, Custom
    #[serde(alias = "baseUrl")]
    pub base_url: String,
    #[serde(default, alias = "apiKeys")]
    pub api_keys: Vec<String>,
    #[serde(default = "default_zero_usize", alias = "activeKeyIndex")]
    pub active_key_index: usize,
    #[serde(default, alias = "supportedModels")]
    pub supported_models: Vec<String>,
    #[serde(default = "default_rpm", alias = "rpmLimit")]
    pub rpm_limit: u32,
    #[serde(default = "default_tpm", alias = "tpmLimit")]
    pub tpm_limit: u32,
    #[serde(default = "default_true", alias = "isEnabled")]
    pub is_enabled: bool,
    #[serde(default = "default_health_status", alias = "healthStatus")]
    pub health_status: String, // HEALTHY, DEGRADED, RATE_LIMITED, ERROR
    #[serde(default = "default_zero_u64", alias = "latencyMs")]
    pub latency_ms: u64,
    #[serde(default = "default_iso_now", alias = "lastCheckedAt")]
    pub last_checked_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelRoleAssignment {
    pub role: String, // Planner, Drafter, Stylist, Inspector, VideoDirector
    #[serde(alias = "primaryProviderId")]
    pub primary_provider_id: String,
    #[serde(alias = "primaryModel")]
    pub primary_model: String,
    #[serde(alias = "fallbackProviderId")]
    pub fallback_provider_id: String,
    #[serde(alias = "fallbackModel")]
    pub fallback_model: String,
    #[serde(default = "default_temp")]
    pub temperature: f32,
    #[serde(default = "default_top_p", alias = "topP")]
    pub top_p: f32,
    #[serde(default = "default_max_tokens", alias = "maxTokens")]
    pub max_tokens: u32,
    #[serde(default = "default_timeout_ms", alias = "timeoutMs")]
    pub timeout_ms: u64,
    #[serde(default = "default_retry_count", alias = "retryCount")]
    pub retry_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelTelemetry {
    pub id: String,
    #[serde(alias = "providerId")]
    pub provider_id: String,
    pub model: String,
    pub role: String,
    #[serde(alias = "requestType")]
    pub request_type: String, // COMPLETION, EMBEDDING, EVALUATION, REASONING
    #[serde(default = "default_zero_u32", alias = "inputTokens")]
    pub input_tokens: u32,
    #[serde(default = "default_zero_u32", alias = "outputTokens")]
    pub output_tokens: u32,
    #[serde(default = "default_zero_f64", alias = "costUsd")]
    pub cost_usd: f64,
    #[serde(default = "default_zero_u64", alias = "latencyMs")]
    pub latency_ms: u64,
    #[serde(default = "default_status_code", alias = "statusCode")]
    pub status_code: u16,
    #[serde(default, alias = "errorMessage")]
    pub error_message: Option<String>,
    #[serde(default = "default_iso_now")]
    pub timestamp: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FallbackSimulateRequest {
    pub role: String,
    #[serde(default, alias = "simulateStatusCode")]
    pub simulate_status_code: Option<u16>,
    #[serde(default, alias = "promptTokens")]
    pub prompt_tokens: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FallbackSimulateResponse {
    pub success: bool,
    #[serde(alias = "attemptedProviders")]
    pub attempted_providers: Vec<String>,
    #[serde(alias = "finalProviderId")]
    pub final_provider_id: String,
    #[serde(alias = "finalModel")]
    pub final_model: String,
    #[serde(alias = "circuitBroken")]
    pub circuit_broken: bool,
    pub message: String,
    #[serde(alias = "latencyMs")]
    pub latency_ms: u64,
}

// ----------------- Style DNA & Literary Mimicry Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleDnaProfile {
    #[serde(default)]
    pub id: String,
    pub name: String,
    pub author: String,
    #[serde(default, alias = "sourceTitle")]
    pub source_title: String,
    #[serde(default, alias = "sourceUrl")]
    pub source_url: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    // 6-axis literary metrics (0.0 - 1.0)
    #[serde(default = "default_half_f32", alias = "sensoryDensity")]
    pub sensory_density: f32, // 感官密度 (视觉/听觉/嗅觉/触觉描写比例)
    #[serde(default = "default_half_f32", alias = "dialogueRatio")]
    pub dialogue_ratio: f32, // 对话比例 (对白在整体篇幅占比)
    #[serde(default = "default_half_f32", alias = "sentenceVariance")]
    pub sentence_variance: f32, // 句式长短句方差/韵律起伏
    #[serde(default = "default_half_f32", alias = "metaphorFrequency")]
    pub metaphor_frequency: f32, // 隐喻与意象密度
    #[serde(default = "default_half_f32", alias = "pacingVelocity")]
    pub pacing_velocity: f32, // 叙事推进行进速度 (慢热铺垫 vs 凌厉快推)
    #[serde(default = "default_half_f32", alias = "vocabularyRichness")]
    pub vocabulary_richness: f32, // 词汇典雅复杂度 (生僻成语/行业术语/文言词法)
    #[serde(default, alias = "forbiddenCliches")]
    pub forbidden_cliches: Vec<String>, // 负向毒点/陈词滥调黑名单
    #[serde(default, alias = "goldenExemplars")]
    pub golden_exemplars: Vec<String>, // 黄金经典段落摹写样本
    #[serde(default, alias = "promptDirective")]
    pub prompt_directive: String, // 用于大模型模仿该文风的 System Prompt 指令
    #[serde(default = "default_iso_now", alias = "createdAt")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractStyleDnaRequest {
    #[serde(alias = "sampleText", alias = "text")]
    pub sample_text: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default, alias = "sourceTitle")]
    pub source_title: Option<String>,
    #[serde(default, alias = "sourceUrl")]
    pub source_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleFusionRequest {
    #[serde(alias = "primaryProfileId")]
    pub primary_profile_id: String,
    #[serde(alias = "secondaryProfileId")]
    pub secondary_profile_id: String,
    #[serde(default = "default_half_f32", alias = "fusionRatio")]
    pub fusion_ratio: f32, // 0.0 - 1.0 (weight of primary)
    #[serde(default, alias = "customName")]
    pub custom_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StyleFusionResponse {
    #[serde(alias = "fusedProfile")]
    pub fused_profile: StyleDnaProfile,
    #[serde(alias = "blendingNotes")]
    pub blending_notes: String,
}

// ----------------- Idea-to-Universe Genesis Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdeaGenesisRequest {
    pub logline: String, // 核心一句话故事钩子
    pub genre: String, // 题材分类 (玄幻修真、克苏鲁奇幻、赛博朋克、末世废土等)
    #[serde(default = "default_target_words", alias = "targetWordCount")]
    pub target_word_count: i64,
    #[serde(default = "default_tone")]
    pub tone: String,
    #[serde(default, alias = "coreHook")]
    pub core_hook: String,
    #[serde(default)]
    pub tropes: Vec<String>,
    #[serde(default, alias = "goldenFingerType")]
    pub golden_finger_type: String, // 金手指类型 (系统面板、太古残魂、时光重置、神级解析等)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IdeaGenesisResponse {
    #[serde(alias = "novelTitle")]
    pub novel_title: String,
    pub synopsis: String,
    #[serde(alias = "goldenThreeChapters")]
    pub golden_three_chapters: Vec<Chapter>,
    pub volumes: Vec<Volume>,
    #[serde(alias = "worldSettings")]
    pub world_settings: Vec<WorldSetting>,
    #[serde(alias = "mainCharacters")]
    pub main_characters: Vec<Character>,
    #[serde(alias = "cheatSystem")]
    pub cheat_system: serde_json::Value,
    #[serde(alias = "tensionCurvePreview")]
    pub tension_curve_preview: Vec<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiverseBranch {
    #[serde(alias = "branchId")]
    pub branch_id: String,
    pub title: String,
    #[serde(alias = "divergencePoint")]
    pub divergence_point: String, // 关键分歧点 (如：主角第3章选择拒绝加入宗门)
    pub summary: String,
    #[serde(alias = "climaxOutcome")]
    pub climax_outcome: String,
    pub pros: Vec<String>,
    pub cons: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MultiverseBranchRequest {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(default, alias = "divergencePoint")]
    pub divergence_point: Option<String>,
}

// ----------------- Reader Psychology & Information Asymmetry Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReaderPsychologyReport {
    #[serde(alias = "novelId")]
    pub novel_id: String,
    #[serde(default, alias = "chapterId")]
    pub chapter_id: Option<String>,
    #[serde(alias = "anticipationScore")]
    pub anticipation_score: f32, // 期待感指数 (0.0 - 1.0)
    #[serde(alias = "fatigueRisk")]
    pub fatigue_risk: f32, // 阅读疲劳风险 (0.0 - 1.0)
    #[serde(alias = "payoffIndex")]
    pub payoff_index: f32, // 爽点兑现率/报偿系数 (0.0 - 1.0)
    #[serde(alias = "dopamineIntervals")]
    pub dopamine_intervals: Vec<i64>, // 多巴胺高潮间歇字数分布
    #[serde(alias = "diagnosticAdvice")]
    pub diagnostic_advice: Vec<String>, // 毒点诊断与控场优化建议
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InformationAsymmetryItem {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "novelId")]
    pub novel_id: String,
    #[serde(alias = "secretTitle")]
    pub secret_title: String,
    #[serde(default = "default_true", alias = "readerKnows")]
    pub reader_knows: bool,
    #[serde(default, alias = "protagonistKnows")]
    pub protagonist_knows: bool,
    #[serde(default, alias = "antagonistKnows")]
    pub antagonist_knows: bool,
    #[serde(default = "default_half_f32", alias = "dramaticIronyScore")]
    pub dramatic_irony_score: f32, // 戏剧讽刺/信息差悬念张力分 (0.0 - 1.0)
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OffscreenNewsEvent {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "novelId")]
    pub novel_id: String,
    pub era: String,
    pub region: String,
    #[serde(alias = "eventSummary")]
    pub event_summary: String,
    #[serde(alias = "factionInvolved")]
    pub faction_involved: String,
    #[serde(default = "default_zero_f32", alias = "tensionDelta")]
    pub tension_delta: f32,
    #[serde(default = "default_iso_now")]
    pub timestamp: String,
}

// ----------------- Epiphany Sparks & Reader Co-Creation Hub Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EpiphanySpark {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "novel_id")]
    pub novel_id: String,
    pub title: String,
    pub content: String,
    #[serde(default, alias = "spark_type")]
    pub spark_type: String,
    #[serde(default)]
    pub source: String,
    #[serde(default, alias = "reader_username")]
    pub reader_username: Option<String>,
    #[serde(default, alias = "heat_score")]
    pub heat_score: i64,
    #[serde(default)]
    pub status: String,
    #[serde(default, alias = "target_chapter_index")]
    pub target_chapter_index: Option<i64>,
    #[serde(default, alias = "target_scene_note")]
    pub target_scene_note: Option<String>,
    #[serde(default, alias = "ai_weave_advice")]
    pub ai_weave_advice: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default = "default_iso_now", alias = "created_at")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ReaderDiscussionComment {
    #[serde(default)]
    pub id: String,
    #[serde(default, alias = "novel_id")]
    pub novel_id: String,
    #[serde(default = "default_one", alias = "chapter_index")]
    pub chapter_index: i64,
    #[serde(default, alias = "paragraph_snippet")]
    pub paragraph_snippet: String,
    #[serde(default, alias = "reader_name")]
    pub reader_name: String,
    #[serde(default)]
    pub platform: String,
    #[serde(default, alias = "comment_text")]
    pub comment_text: String,
    #[serde(default)]
    pub likes: i64,
    #[serde(default)]
    pub sentiment: String,
    #[serde(default, alias = "extracted_hook")]
    pub extracted_hook: Option<String>,
    #[serde(default, alias = "converted_spark_id")]
    pub converted_spark_id: Option<String>,
    #[serde(default = "default_iso_now", alias = "created_at")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SparkCollideRequest {
    #[serde(default, alias = "spark_a_id")]
    pub spark_a_id: String,
    #[serde(default, alias = "spark_b_id")]
    pub spark_b_id: String,
    #[serde(default, alias = "spark_a_title")]
    pub spark_a_title: Option<String>,
    #[serde(default, alias = "spark_b_title")]
    pub spark_b_title: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SparkCollisionResult {
    pub spark_a_id: String,
    pub spark_b_id: String,
    pub fusion_title: String,
    pub combined_plot_twist: String,
    pub dramatic_tension_bonus: i64,
    pub recommended_chapter_placement: String,
    pub scene_beat_preview: String,
}

// ----------------- Central Skill & Reusable Asset Vault Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreationSkillItem {
    #[serde(default)]
    pub id: String,
    pub name: String,
    pub category: String,
    #[serde(default, alias = "source_novel_title")]
    pub source_novel_title: String,
    pub description: String,
    #[serde(default, alias = "prompt_directive")]
    pub prompt_directive: String,
    #[serde(default, alias = "example_snippet")]
    pub example_snippet: String,
    #[serde(default, alias = "trigger_keywords")]
    pub trigger_keywords: Vec<String>,
    #[serde(default = "default_true", alias = "is_enabled")]
    pub is_enabled: bool,
    #[serde(default = "default_true", alias = "auto_match_eligible")]
    pub auto_match_eligible: bool,
    #[serde(default, alias = "reused_count")]
    pub reused_count: i64,
    #[serde(default, alias = "effectiveness_rating")]
    pub effectiveness_rating: i64,
    #[serde(default = "default_iso_now", alias = "created_at")]
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillAutoMatchRequest {
    #[serde(default, alias = "scene_context")]
    pub scene_context: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillAutoMatchResult {
    pub scene_context_summary: String,
    pub matched_skill_ids: Vec<String>,
    pub match_reasons: std::collections::HashMap<String, String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExtractSkillRequest {
    #[serde(default, alias = "manuscript_text")]
    pub manuscript_text: String,
    #[serde(default, alias = "preferred_category")]
    pub preferred_category: String,
    #[serde(default, alias = "source_novel_title")]
    pub source_novel_title: String,
    #[serde(default, alias = "custom_name")]
    pub custom_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubvertSkillRequest {
    #[serde(default, alias = "skill_id")]
    pub skill_id: String,
    #[serde(default, alias = "skill_name")]
    pub skill_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TropeSubversionVariant {
    pub id: String,
    pub original_skill_name: String,
    pub subversion_title: String,
    pub classic_expectation: String,
    pub subverted_twist: String,
    pub dramatic_payoff: String,
}

// ----------------- Autonomous Marathon Autopilot Models -----------------

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutopilotSegmentRequest {
    #[serde(default, alias = "novel_id")]
    pub novel_id: String,
    #[serde(default, alias = "novel_title")]
    pub novel_title: String,
    #[serde(default)]
    pub mode: String,
    #[serde(default, alias = "reference_data_text")]
    pub reference_data_text: Option<String>,
    #[serde(default = "default_one", alias = "chapter_index")]
    pub chapter_index: i64,
    #[serde(default = "default_one", alias = "scene_index")]
    pub scene_index: i64,
    #[serde(default, alias = "active_skills")]
    pub active_skills: Vec<CreationSkillItem>,
    #[serde(default, alias = "anchored_sparks")]
    pub anchored_sparks: Vec<EpiphanySpark>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AutopilotGeneratedSegment {
    pub id: String,
    pub chapter_index: i64,
    pub chapter_title: String,
    pub scene_index: i64,
    pub scene_title: String,
    pub content: String,
    pub word_count: usize,
    pub quality_score: i64,
    pub applied_skills: Vec<String>,
    pub incorporated_sparks: Vec<String>,
    pub created_at: String,
}




