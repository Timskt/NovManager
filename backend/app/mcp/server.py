# ==============================================================================
# NovManager 标准 Model Context Protocol (MCP) 服务端实现
# 基于 Anthropic 官方 Python mcp SDK 构建
# 允许任何外部 Agent (如 Claude Desktop, Cursor, 独立写作Agent) 访问小说资产与工具
# ==============================================================================

import json
from typing import Optional, List, Dict, Any
from mcp.server.mcpserver import MCPServer
from ..storage import NovelRepository

# 初始化 MCP 服务端
mcp = MCPServer("NovManager-MCP")
repo = NovelRepository()

# ==============================================================================
# 1. MCP Resources (标准只读结构化资源)
# ==============================================================================

@mcp.resource("novel://list")
def list_all_novels() -> str:
    """获取系统内所有小说的列表概览（ID、书名、题材、当前字数、活跃状态）。"""
    novels = repo.list_novels()
    active_id = repo.get_active_novel_id()
    res = [
        {
            "id": n.id,
            "title": n.title,
            "genre": n.genre,
            "current_word_count": n.current_word_count,
            "target_word_count": n.target_word_count,
            "is_active": n.id == active_id,
            "updated_at": n.updated_at,
        }
        for n in novels
    ]
    return json.dumps(res, ensure_ascii=False, indent=2)

@mcp.resource("novel://active/meta")
def get_active_novel_meta() -> str:
    """获取当前处于编辑焦点的小说的元数据与写作准则。"""
    active_id = repo.get_active_novel_id()
    return get_novel_meta(active_id)

@mcp.resource("novel://active/context")
def get_active_novel_latest_context() -> str:
    """获取当前焦点小说的第一章/最新章节上下文包。"""
    active_id = repo.get_active_novel_id()
    volumes = repo.get_volumes(active_id)
    first_chap = volumes[0].chapters[0].id if volumes and volumes[0].chapters else "chap-001"
    bundle = repo.get_chapter_context_bundle(active_id, first_chap)
    return json.dumps(bundle, ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/meta")
def get_novel_meta(novel_id: str) -> str:
    """获取小说的元数据、题材、目标字数与全书文风写作硬约束。支持传具体ID或'active'。"""
    resolved_id = repo.resolve_novel_id(novel_id)
    novel = repo.get_novel(resolved_id)
    if not novel:
        return json.dumps({"error": f"小说 {novel_id} 不存在"}, ensure_ascii=False)
    return json.dumps(novel.model_dump(), ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/world/rules")
def get_world_rules(novel_id: str) -> str:
    """获取小说全部世界观法则、战力境界划分、门派势力、神兵异宝与地理环境设定。"""
    settings = repo.get_world_settings(novel_id)
    return json.dumps([s.model_dump() for s in settings], ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/characters")
def get_all_characters(novel_id: str) -> str:
    """获取登场角色名录、静态人设（性格/口癖/动机/弱点）以及最新时间线生理状态。"""
    characters = repo.get_characters(novel_id)
    res = []
    for c in characters:
        state = repo.get_latest_character_state(c.id)
        res.append({
            "character": c.model_dump(),
            "latest_state": state.model_dump() if state else None
        })
    return json.dumps(res, ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/characters/{char_id}")
def get_single_character(novel_id: str, char_id: str) -> str:
    """获取单个角色的深度档案、人际关系羁绊与全量状态机演变历史。"""
    char = repo.get_character(char_id)
    if not char:
        return json.dumps({"error": f"角色 {char_id} 不存在"}, ensure_ascii=False)
    state = repo.get_latest_character_state(char_id)
    return json.dumps({
        "character": char.model_dump(),
        "latest_state": state.model_dump() if state else None
    }, ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/outlines/tree")
def get_outline_tree(novel_id: str) -> str:
    """获取分卷、章节与场景分镜节拍的三级完整大纲树。"""
    volumes = repo.get_volumes(novel_id)
    return json.dumps([v.model_dump() for v in volumes], ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/chapters/{chapter_id}/context")
def get_chapter_context(novel_id: str, chapter_id: str) -> str:
    """获取为该章节量身预装配的创作上下文包（含大纲节拍、出场角色卡、硬规则与待呼应伏笔）。"""
    bundle = repo.get_chapter_context_bundle(novel_id, chapter_id)
    return json.dumps(bundle, ensure_ascii=False, indent=2)

@mcp.resource("novel://{novel_id}/foreshadowing/active")
def get_active_foreshadowings(novel_id: str) -> str:
    """获取当前处于已埋设、发酵中状态且等待回收推进的所有伏笔线索列表。"""
    fs_list = repo.get_active_foreshadowings(novel_id)
    return json.dumps([f.model_dump() for f in fs_list], ensure_ascii=False, indent=2)


# ==============================================================================
# 2. MCP Tools (智能体可主动调用的能力)
# ==============================================================================

@mcp.tool()
def list_novels() -> str:
    """
    列出当前工作区中管理的所有小说清单（含小说ID、书名、题材、字数及当前聚焦状态）。
    当 Agent 不确定要为哪本小说服务，或需要让用户/自身选择小说时，优先调用此工具。
    """
    novels = repo.list_novels()
    active_id = repo.get_active_novel_id()
    data = [
        {
            "id": n.id,
            "title": n.title,
            "genre": n.genre,
            "current_word_count": n.current_word_count,
            "target_word_count": n.target_word_count,
            "is_active": n.id == active_id,
        }
        for n in novels
    ]
    return json.dumps({
        "total": len(data),
        "active_novel_id": active_id,
        "novels": data,
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def get_active_novel() -> str:
    """获取当前默认处于编辑激活焦点的小说详细信息。"""
    active_id = repo.get_active_novel_id()
    novel = repo.get_novel(active_id)
    if not novel:
        return json.dumps({"error": "当前暂无激活的小说"}, ensure_ascii=False)
    return json.dumps({
        "id": novel.id,
        "title": novel.title,
        "genre": novel.genre,
        "current_word_count": novel.current_word_count,
        "target_word_count": novel.target_word_count,
        "is_active": True,
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def switch_active_novel(novel_id_or_title: str) -> str:
    """
    切换当前智能体的工作小说焦点。
    参数 novel_id_or_title 可以是小说 ID (如 'nov-001')，也可以是小说标题关键词 (如 '太虚'、'太虚剑尊')。
    切换后后续所有工具调用若省略 novel_id 将自动绑定切换后的小说。
    """
    resolved_id = repo.resolve_novel_id(novel_id_or_title)
    success = repo.set_active_novel_id(resolved_id)
    novel = repo.get_novel(resolved_id)
    title = novel.title if novel else resolved_id
    return json.dumps({
        "success": success,
        "active_novel_id": resolved_id,
        "novel_title": title,
        "message": f"成功将当前工作小说切换为《{title}》({resolved_id})"
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def create_novel(title: str, genre: str = "综合题材", target_word_count: int = 1000000) -> str:
    """
    新建一部小说作品并加入书库，返回新建的小说详情与 ID。
    外部 Agent 需要为新小说创建世界观、人物或分卷时，可先调用此工具。
    """
    novel = repo.create_or_update_novel({
        "title": title.strip(),
        "genre": genre.strip(),
        "target_word_count": target_word_count,
    })
    repo.set_active_novel_id(novel.id)
    return json.dumps({
        "success": True,
        "novel": novel.model_dump(),
        "message": f"成功创建小说《{novel.title}》({novel.id}) 并设为当前焦点"
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def query_lore(novel_id: str = "", query: str = "", category: str = "") -> str:
    """
    语义与关键词混合检索世界观设定与战力铁律。
    参数 novel_id 可选，若留空或传 'active' 自动取当前正在创作的小说。
    在起草情节或动用高深法术前，必须调用此工具以防止吃设定或战力越级。
    """
    resolved_id = repo.resolve_novel_id(novel_id)
    cat = category if category and category != "ALL" else None
    results = repo.query_lore(resolved_id, query, cat)
    return json.dumps({
        "novel_id": resolved_id,
        "query": query,
        "matched_count": len(results),
        "results": results
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def query_plot_memory(novel_id: str = "", query: str = "", before_chapter_index: int = 999) -> str:
    """
    检索过往章节剧情记忆与重大历史事件，确保当前章节叙事因果逻辑严密。
    参数 novel_id 可选，默认取当前激活小说。
    """
    resolved_id = repo.resolve_novel_id(novel_id)
    volumes = repo.get_volumes(resolved_id)
    past_events = []
    for v in volumes:
        for c in v.chapters:
            if c.chapter_index < before_chapter_index:
                past_events.append({
                    "chapter_index": c.chapter_index,
                    "title": c.title,
                    "outline": c.outline
                })
    return json.dumps({
        "novel_id": resolved_id,
        "query": query,
        "past_chapters_searched": len(past_events),
        "events": past_events
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def check_setting_consistency(novel_id: str = "", draft_text: str = "") -> str:
    """
    对一段正文草稿进行严格的设定一致性扫描。
    自动检测：战力越级（如筑基期撕裂空间）、人设OOC语气、伤势生理矛盾、违禁套话词汇。
    参数 novel_id 可选，默认取当前激活小说。
    """
    resolved_id = repo.resolve_novel_id(novel_id)
    issues = repo.check_setting_consistency(resolved_id, draft_text)
    return json.dumps({
        "novel_id": resolved_id,
        "has_issues": len(issues) > 0,
        "issue_count": len(issues),
        "issues": [i.model_dump() for i in issues]
    }, ensure_ascii=False, indent=2)

@mcp.tool()
def save_scene_draft(
    novel_id: str = "",
    chapter_id: str = "",
    scene_index: int = 1,
    content: str = "",
    agent_notes: str = "",
    created_by: str = "ExternalAgent"
) -> str:
    """
    将生成的场景正文草稿安全保存至指定的章节场景中。
    参数 novel_id 可选，默认取当前激活小说。
    系统会自动触发 Git-like 版本快照并更新全书字数统计。
    """
    resolved_id = repo.resolve_novel_id(novel_id)
    try:
        res = repo.save_scene_draft(
            novel_id=resolved_id,
            chapter_id=chapter_id,
            scene_index=scene_index,
            content=content,
            agent_notes=agent_notes,
            created_by=created_by
        )
        res["novel_id"] = resolved_id
        return json.dumps(res, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False)

@mcp.tool()
def update_character_state(
    character_id: str,
    chapter_id: str,
    state_summary: str,
    location: str = "",
    combat_power: str = "",
    health_status: str = "HEALTHY",
    status_tags: Optional[List[str]] = None,
    chapter_index: Optional[int] = None
) -> str:
    """
    当小说情节导致角色负伤、突破、获得新道具或转移地点时，调用此工具将最新状态更新至动态状态机。
    保证后续其他 Agent 在阅读时拥有沿故事线演进的最新真实角色生理/心理状态。
    """
    try:
        updated = repo.update_character_state(
            character_id=character_id,
            chapter_id=chapter_id,
            location=location or None,
            combat_power=combat_power or None,
            health_status=health_status or None,
            status_tags=status_tags or None,
            state_summary=state_summary,
            chapter_index=chapter_index
        )
        return json.dumps(updated.model_dump(), ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False)

@mcp.tool()
def record_foreshadowing(
    novel_id: str = "",
    title: str = "",
    clue_description: str = "",
    planted_chapter_id: str = "",
    planned_resolve_chapter_index: int = 15,
    notes: str = ""
) -> str:
    """
    在当前章节正文中埋下新的伏笔细节时，调用此工具将其登记到伏笔雷达中。
    参数 novel_id 可选，默认取当前激活小说。
    """
    resolved_id = repo.resolve_novel_id(novel_id)
    try:
        fs = repo.record_foreshadowing(
            novel_id=resolved_id,
            title=title,
            clue_description=clue_description,
            planted_chapter_id=planted_chapter_id,
            planned_resolve_chapter_index=planned_resolve_chapter_index,
            notes=notes
        )
        return json.dumps(fs.model_dump(), ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"status": "error", "error": str(e)}, ensure_ascii=False)


# ==============================================================================
# 服务入口
# ==============================================================================
def run_stdio():
    """以 Stdio 形式运行 MCP 服务端 (供 Claude Desktop, Cursor 等直接拉起)"""
    mcp.run()

if __name__ == "__main__":
    run_stdio()
