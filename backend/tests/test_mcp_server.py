# ==============================================================================
# NovManager MCP 服务端单元与调用测试 (MCP Test Suite)
# ==============================================================================

import asyncio
import json
import pytest
from app.mcp.server import mcp

@pytest.mark.asyncio
async def test_mcp_read_meta_resource():
    res = await mcp.read_resource("novel://nov-001/meta")
    text = res[0].content if hasattr(res[0], 'content') else res[0].text
    data = json.loads(text)
    assert data["title"] == "太虚纪元"
    assert data["genre"] == "修真玄幻 / 仙侠智斗"

@pytest.mark.asyncio
async def test_mcp_read_characters_resource():
    res = await mcp.read_resource("novel://nov-001/characters")
    text = res[0].content if hasattr(res[0], 'content') else res[0].text
    data = json.loads(text)
    assert len(data) >= 3
    lin_yue = next(c for c in data if c["character"]["name"] == "林越")
    assert lin_yue["character"]["role_type"] == "PROTAGONIST"

@pytest.mark.asyncio
async def test_mcp_read_chapter_context_resource():
    res = await mcp.read_resource("novel://nov-001/chapters/chap-012/context")
    text = res[0].content if hasattr(res[0], 'content') else res[0].text
    data = json.loads(text)
    assert "chapter" in data
    assert data["chapter"]["title"] == "血战坠星崖"

@pytest.mark.asyncio
async def test_mcp_query_lore_tool():
    res = await mcp.call_tool("query_lore", {"novel_id": "nov-001", "query": "青铜残片"})
    text = res.content[0].text
    data = json.loads(text)
    assert data["matched_count"] > 0
    assert any("青铜残片" in r["name"] for r in data["results"])

@pytest.mark.asyncio
async def test_mcp_consistency_tool():
    # 违规文本：撕裂空间
    res = await mcp.call_tool("check_setting_consistency", {
        "novel_id": "nov-001",
        "draft_text": "林越在罡风中随手撕裂空间瞬移到了洞外。"
    })
    data = json.loads(res.content[0].text)
    assert data["has_issues"] is True
    assert any(i["issue_type"] == "SETTING_VIOLATION" for i in data["issues"])

@pytest.mark.asyncio
async def test_mcp_save_draft_and_update_state_tool():
    # 1. 提交新草稿
    draft_res = await mcp.call_tool("save_scene_draft", {
        "novel_id": "nov-001",
        "chapter_id": "chap-012",
        "scene_index": 3,
        "content": "秋泓剑芒撕裂夜空，苏青瑶如神女降世，与林越背靠背御敌...",
        "agent_notes": "由外部写作 Agent 依照大纲起草",
        "created_by": "Agent:ExternalClaude"
    })
    draft_data = json.loads(draft_res.content[0].text)
    assert draft_data["status"] == "saved"

    # 2. 更新林越动态状态机
    state_res = await mcp.call_tool("update_character_state", {
        "character_id": "char-001",
        "chapter_id": "chap-012",
        "location": "地脉古阵残台",
        "combat_power": "筑基后期（气血两亏）",
        "health_status": "CRITICAL",
        "status_tags": ["真元枯竭", "左肩贯穿伤", "坠入地渊"],
        "state_summary": "施展合击剑招逼退夜枭后跌入地渊"
    })
    state_data = json.loads(state_res.content[0].text)
    assert state_data["location"] == "地脉古阵残台"
    assert state_data["health_status"] == "CRITICAL"

@pytest.mark.asyncio
async def test_mcp_multi_novels_support():
    # 1. 测试读取 novel://list
    list_res = await mcp.read_resource("novel://list")
    list_text = list_res[0].content if hasattr(list_res[0], 'content') else list_res[0].text
    novels = json.loads(list_text)
    assert len(novels) >= 2
    titles = [n["title"] for n in novels]
    assert "太虚纪元" in titles
    assert "天演寻真录" in titles

    # 2. 测试 list_novels 工具
    tool_res = await mcp.call_tool("list_novels", {})
    tool_data = json.loads(tool_res.content[0].text)
    assert tool_data["total"] >= 2
    assert "active_novel_id" in tool_data
    tool_titles = [n["title"] for n in tool_data["novels"]]
    assert "太虚纪元" in tool_titles
    assert "天演寻真录" in tool_titles

    # 3. 测试通过书名模糊切换至《天演寻真录》
    switch_res = await mcp.call_tool("switch_active_novel", {"novel_id_or_title": "天演"})
    switch_data = json.loads(switch_res.content[0].text)
    assert switch_data["success"] is True
    assert switch_data["novel_title"] == "天演寻真录"

    # 4. 测试 create_novel 工具创建新书
    create_res = await mcp.call_tool("create_novel", {"title": "九霄封神志", "genre": "东方玄幻"})
    create_data = json.loads(create_res.content[0].text)
    assert create_data["success"] is True
    assert create_data["novel"]["title"] == "九霄封神志"

    # 5. 切换回太虚纪元并查询世界观
    await mcp.call_tool("switch_active_novel", {"novel_id_or_title": "太虚"})
    lore_res = await mcp.call_tool("query_lore", {"query": "青铜残片"})
    lore_data = json.loads(lore_res.content[0].text)
    assert lore_data["novel_id"] == "nov-001"
    assert lore_data["matched_count"] > 0

