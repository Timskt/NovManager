# ==============================================================================
# NovManager 后端服务单元与集成测试 (Pytest Suite)
# ==============================================================================

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.storage import NovelRepository

client = TestClient(app)
repo = NovelRepository()

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"

def test_get_novel():
    res = client.get("/api/novels/nov-001")
    assert res.status_code == 200
    data = res.json()
    assert data["title"] == "太虚纪元"
    assert data["genre"] == "修真玄幻 / 仙侠智斗"

def test_query_lore():
    res = client.get("/api/novels/nov-001/world/query?q=金丹")
    assert res.status_code == 200
    results = res.json()
    assert len(results) > 0
    assert "法则" in results[0]["name"]

def test_character_state_evolution():
    # 查询林越初始状态
    res = client.get("/api/characters/char-001/state")
    assert res.status_code == 200
    state = res.json()
    assert "左肩贯穿伤" in state["status_tags"]

    # 外部 Agent 更新林越状态
    update_res = client.post("/api/characters/state", json={
        "character_id": "char-001",
        "chapter_id": "chap-012",
        "location": "坠星崖底古遗迹地渊",
        "combat_power": "筑基后期（真元近乎枯竭）",
        "health_status": "CRITICAL",
        "status_tags": ["左肩贯穿伤", "真元枯竭", "获得古阵图"],
        "state_summary": "硬撼夜枭后坠入地渊，真元几乎消耗殆尽。"
    })
    assert update_res.status_code == 200
    updated_state = update_res.json()
    assert updated_state["location"] == "坠星崖底古遗迹地渊"
    assert updated_state["health_status"] == "CRITICAL"

def test_save_scene_draft_and_versioning():
    # 外部 Agent 提交场景 3 的草稿
    res = client.post("/api/scenes/draft", json={
        "novel_id": "nov-001",
        "chapter_id": "chap-012",
        "scene_index": 3,
        "content": "秋泓剑气纵横，苏青瑶如仙子凌波踏风而至...",
        "agent_notes": "第三方 Agent 按照作者大纲完成了第3幕起草",
        "created_by": "Agent:Claude-Desktop"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "saved"
    assert "version_id" in data

    # 验证草稿已被真实存入
    chapter = repo.get_chapter("chap-012")
    scene_3 = next(s for s in chapter.scenes if s.scene_index == 3)
    assert "秋泓剑气" in scene_3.draft_content
    assert scene_3.agent_notes == "第三方 Agent 按照作者大纲完成了第3幕起草"

def test_setting_consistency_audit():
    # 测试 1：战力越级（金丹撕裂空间）
    res1 = client.post("/api/consistency-check", json={
        "novel_id": "nov-001",
        "draft_text": "夜枭大喝一声，随手撕裂空间瞬移至林越身后！"
    })
    assert res1.status_code == 200
    issues1 = res1.json()
    assert any(i["issue_type"] == "SETTING_VIOLATION" for i in issues1)

    # 测试 2：生理伤势矛盾（左肩贯穿却左手挥剑）
    res2 = client.post("/api/consistency-check", json={
        "novel_id": "nov-001",
        "draft_text": "林越左手挥剑，剑势如虹，哈哈大笑：受死吧！"
    })
    assert res2.status_code == 200
    issues2 = res2.json()
    # 应该同时检测出生理矛盾和 OOC 挑衅
    assert any(i["issue_type"] == "PLOT_HOLE" for i in issues2)
    assert any(i["issue_type"] == "OOC" for i in issues2)

def test_chapter_context_bundle():
    res = client.get("/api/novels/nov-001/chapters/chap-012/context")
    assert res.status_code == 200
    bundle = res.json()
    assert "chapter" in bundle
    assert "characters" in bundle
    assert "rules_summary" in bundle
    assert len(bundle["characters"]) >= 2

def test_llm_test_connection_invalid_endpoint():
    # 测试连接一个不可达的地址，应该优雅返回 success=False 而不是崩溃 500
    res = client.post("/api/llm/test-connection", json={
        "endpoint": "http://127.0.0.1:59999",
        "api_key": "invalid-key",
        "model": "deepseek-chat"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "error" in data

def test_mcp_endpoints():
    # 测试获取安装脚本
    sh_res = client.get("/install_mcp.sh")
    assert sh_res.status_code == 200
    assert "NovManager MCP" in sh_res.text
    assert "claude_desktop_config.json" in sh_res.text

    # 测试获取动态配置 JSON
    cfg_res = client.get("/api/mcp/configs")
    assert cfg_res.status_code == 200
    data = cfg_res.json()
    assert "claude_desktop_stdio" in data
    assert "cursor" in data
    assert "sse_url" in data
    assert "nov-manager" in data["claude_desktop_stdio"]["mcpServers"]

def test_list_and_sync_novels():
    # 测试列出所有小说（应包含太虚纪元和天演寻真录）
    res = client.get("/api/novels")
    assert res.status_code == 200
    novels = res.json()
    titles = [n["title"] for n in novels]
    assert "太虚纪元" in titles
    assert "天演寻真录" in titles

    # 测试同步一部测试小说
    sync_res = client.post("/api/novels/sync", json={
        "novel": {
            "id": "nov-test-sync",
            "title": "大衍道君传",
            "genre": "修真",
            "targetWordCount": 800000
        },
        "worldSettings": [
            {
                "id": "ws-test-1",
                "novelId": "nov-test-sync",
                "category": "RULE",
                "name": "天道誓约",
                "content": "违背誓约者身死道消"
            }
        ],
        "isActive": True
    })
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "success"

    # 验证新小说被持久化
    novel_res = client.get("/api/novels/nov-test-sync")
    assert novel_res.status_code == 200
    assert novel_res.json()["title"] == "大衍道君传"

    # 验证可以删除该测试小说
    del_res = client.delete("/api/novels/nov-test-sync")
    assert del_res.status_code == 200

def test_llm_test_connection_live_probe():
    # 测试连接真实公共端点 (验证真实 HTTP 网络探测与延迟度量)
    res = client.post("/api/llm/test-connection", json={
        "endpoint": "https://api.deepseek.com",
        "api_key": "dummy-test-key-for-auth-check",
        "model": "deepseek-chat"
    })
    assert res.status_code == 200
    data = res.json()
    # 真实远端 DeepSeek 服务器会返回 HTTP 401 (认证失败)，同时计算出真实的网络延迟 ms
    assert data["status_code"] == 401
    assert data["latency_ms"] >= 0
    assert "error" in data

def test_llm_proxy_error_handling():
    # 测试代理端点转发时的异常拦截
    res = client.post("/api/llm/proxy", json={
        "endpoint": "http://127.0.0.1:59999",
        "api_key": "test",
        "model": "test-model",
        "messages": [{"role": "user", "content": "hello"}]
    })
    # 应当返回 502 明确告知上游网关连接异常，而不是内部服务器 500 崩溃
    # 应当返回 502 明确告知上游网关连接异常，而不是内部服务器 500 崩溃
    assert res.status_code == 502
    assert "上游网关连接异常" in res.json()["detail"]


def test_polish_techniques_lifecycle():
    novel_id = "nov-001"
    # 1. 保存润色技巧
    payload = {
        "novel_id": novel_id,
        "chapter_id": "chap-013",
        "techniques": [
            {
                "name": "通感通化造境",
                "category": "ATMOSPHERE",
                "category_label": "环境意境",
                "description": "融合冷热触感与视觉光影塑造地底寒渊的压抑氛围",
                "before_snippet": "水滴落在林越脸上，他醒了。",
                "after_snippet": "冰冷刺骨的水滴，一滴一滴落在林越眉心。",
                "applicable_scene": "危机潜伏、环境描写"
            },
            {
                "name": "短句卡点与动作特写",
                "category": "PACING",
                "category_label": "节奏张力",
                "description": "拆解连贯动作，强化战斗警觉感",
                "before_snippet": "他站起来拿起剑防备。",
                "after_snippet": "他猛地睁开双眼，右手本能地握住腰间残剑，整个人瞬间翻滚戒备。",
                "applicable_scene": "突发遭遇、警觉戒备"
            }
        ]
    }
    save_res = client.post(f"/api/novels/{novel_id}/techniques", json=payload)
    assert save_res.status_code == 200
    saved = save_res.json()
    assert len(saved) == 2
    assert saved[0]["applied_count"] >= 1

    # 2. 查询列表
    list_res = client.get(f"/api/novels/{novel_id}/techniques")
    assert list_res.status_code == 200
    techs = list_res.json()
    names = [t["name"] for t in techs]
    assert "通感通化造境" in names
    assert "短句卡点与动作特写" in names

    # 3. 再次保存同名技巧，应去重并自增 applied_count
    save_res2 = client.post(f"/api/novels/{novel_id}/techniques", json={
        "novel_id": novel_id,
        "chapter_id": "chap-014",
        "techniques": [
            {
                "name": "通感通化造境",
                "category": "ATMOSPHERE",
                "category_label": "环境意境",
                "description": "再次复用通感描写",
                "before_snippet": "风吹过洞穴。",
                "after_snippet": "阴风如刮骨钢刀，自裂隙深处呼啸穿堂而过。"
            }
        ]
    })
    assert save_res2.status_code == 200
    saved2 = save_res2.json()
    assert len(saved2) == 1
    assert saved2[0]["applied_count"] >= 2

    # 4. 获取统计数据
    stats_res = client.get(f"/api/novels/{novel_id}/techniques/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total_techniques"] >= 2
    assert stats["total_applied_count"] >= 3
    assert "环境意境" in stats["category_distribution"]
    assert len(stats["top_techniques"]) > 0




