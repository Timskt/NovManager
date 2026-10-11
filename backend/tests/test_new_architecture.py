# ==============================================================================
# 架构优化、自迭代与新功能自动化测试套件 (Test Suite for New Features & Engines)
# 覆盖：嵌入式 SQLite 仓储、静默 Git VCS、5 维质量自评、上下文打包与新特性接口
# ==============================================================================

import pytest
import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.main import app
from app.sqlite_storage import SQLiteNovelRepository
from app.git_vcs import GitVCSManager
from app.self_iteration import AutonomousWritingEvaluator, AutonomousReflector, PromptSelfTuner
from app.context_packer import ContextPacker

client = TestClient(app)

def test_sqlite_storage_lifecycle(tmp_path):
    db_file = str(tmp_path / "test_local.db")
    sql_repo = SQLiteNovelRepository(db_path=db_file)
    status = sql_repo.get_database_status()
    assert status["connected"] is True
    assert status["wal_enabled"] is True

    # 保存并检索自评记录
    eval_record = sql_repo.save_evaluation({
        "novel_id": "nov-001",
        "chapter_id": "chap-013",
        "scene_index": 1,
        "overall_score": 90,
        "scores": {"continuity": 18, "voice": 18, "tension": 18, "sensory": 18, "pacing": 18},
        "strengths": ["战力严密"],
        "weaknesses": ["次要配角描写偏弱"],
        "refinements": ["增补环境风声"],
        "iteration_count": 1
    })
    assert eval_record["id"].startswith("eval-")

    eval_list = sql_repo.list_evaluations(novel_id="nov-001")
    assert len(eval_list) >= 1
    assert eval_list[0]["overall_score"] == 90

def test_git_vcs_snapshot_and_history(tmp_path):
    git_manager = GitVCSManager(repo_dir=str(tmp_path))
    # 提交快照
    snap = git_manager.create_milestone_snapshot(
        novel_id="nov-001",
        chapter_id="chap-013",
        scene_index=1,
        content="林越握住残剑，目光如炬。",
        message="第一幕初稿完工",
        tag="draft"
    )
    assert snap["success"] is True
    assert "DRAFT" in snap["message"]

    # 查阅历史
    history = git_manager.list_history("nov-001", "chap-013")
    assert len(history) >= 1
    assert history[0]["commit_hash"] == snap["commit_hash"]

    # 比对差异
    diff = git_manager.get_commit_diff(snap["commit_hash"])
    assert "林越握住残剑" in diff

def test_autonomous_writing_evaluator():
    draft = "狂暴的气浪撕裂殿堂，林越猛地睁开双眼，右手本能地握住腰间残剑。水滴冰冷刺骨，在石柱上溅落成微不可察的闷响。幽冥宗长老冷笑道：“你逃不掉。”"
    res = AutonomousWritingEvaluator.evaluate_draft(
        novel_id="nov-001",
        chapter_id="chap-013",
        scene_index=1,
        draft_text=draft,
        scene_goal="探查古殿生路并戒备强敌"
    )
    assert res.overall_score >= 70
    assert "continuity" in res.dimensions
    assert "voice" in res.dimensions
    assert "tension" in res.dimensions
    assert "sensory" in res.dimensions
    assert "pacing" in res.dimensions

    # 反思生成
    strategy = AutonomousReflector.generate_reflection_strategy(res)
    assert "target_dimension" in strategy
    assert "refinement_prompt_addon" in strategy

def test_prompt_self_tuner():
    tuner = PromptSelfTuner()
    prev_action = tuner.preference_weights["action_density"]
    # 模拟作者连续直接采纳，权重应当上浮
    tuner.record_author_feedback(accepted_as_is=True, diff_length_ratio=0.05)
    assert tuner.preference_weights["action_density"] > prev_action

def test_context_packer():
    packer = ContextPacker(max_token_budget=2000)
    packed = packer.pack_scene_context(
        novel_title="太虚纪元",
        novel_genre="仙侠修真",
        style_guide={"tone": "肃杀"},
        volume_info=None,
        chapter_index=13,
        scene_goal="脱身并探查生路",
        scene_conflict="强敌环伺",
        involved_characters=[{"name": "林越", "state": {"combat_power": "通玄巅峰", "health_status": "INJURED"}}],
        world_rules=[{"name": "天道压制", "content": "地脉煞气封印肉身", "priority": 90}],
        active_foreshadowings=[{"title": "青铜残片", "clue_description": "残片与剑鞘共振"}]
    )
    assert packed["estimated_tokens"] > 0
    assert "太虚纪元" in packed["assembled_prompt"]
    assert "林越" in packed["assembled_prompt"]
    assert "天道压制" in packed["assembled_prompt"]

def test_api_tension_curve():
    res = client.get("/api/analytics/nov-001/tension-curve")
    assert res.status_code == 200
    data = res.json()
    assert "curve" in data
    assert len(data["curve"]) > 0

def test_api_relationship_graph():
    res = client.get("/api/analytics/nov-001/relationship-graph")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "links" in data

def test_api_timeline_matrix():
    res = client.get("/api/analytics/nov-001/timeline-matrix")
    assert res.status_code == 200
    data = res.json()
    assert "events" in data

def test_api_foreshadowing_radar():
    res = client.get("/api/analytics/nov-001/foreshadowing-radar")
    assert res.status_code == 200
    data = res.json()
    assert "items" in data

def test_api_dialogue_doctor():
    res = client.post("/api/doctor/dialogue", json={
        "dialogue_text": "你站住，不要再走过来了。",
        "speaker_name": "林越",
        "speaker_personality": "冷峻肃杀",
        "context_emotion": "杀气凝实"
    })
    assert res.status_code == 200
    data = res.json()
    assert "suggested_dialogue" in data
    assert len(data["action_beats"]) >= 2

def test_api_action_director():
    res = client.post("/api/director/action", json={
        "combatant_a": "林越",
        "combatant_b": "幽冥宗长老",
        "realm_a": "通玄境",
        "realm_b": "元婴境",
        "terrain": "地殿残柱",
        "core_move": "贴地滑步残剑反杀"
    })
    assert res.status_code == 200
    data = res.json()
    assert "sequence_beats" in data
    assert len(data["sequence_beats"]) == 3

def test_api_export_typeset():
    res = client.post("/api/export/typeset", json={
        "novel_id": "nov-001",
        "format": "txt"
    })
    assert res.status_code == 200
    data = res.json()
    assert "content" in data
    assert "《太虚纪元》" in data["content"]
