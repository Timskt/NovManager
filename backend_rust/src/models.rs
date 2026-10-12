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


