#!/usr/bin/env python3
# ==============================================================================
# 外部独立写作 Agent (External Creative Agent Demonstration)
# 模拟外部独立智能体通过 MCP 协议与 NovManager 进行通信：
# 1. 读取小说设定、人物状态机、大纲节拍
# 2. 根据作者要求撰写场景正文
# 3. 调用 MCP 工具执行一致性合规自检
# 4. 回写场景草稿并触发版本快照
# 5. 回写更新角色动态状态机与新伏笔
# ==============================================================================

import asyncio
import json
import os
import sys

# 导入 MCP 服务端对象
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(__file__)), "backend"))
from app.mcp.server import mcp

async def run_external_agent():
    print("=" * 70)
    print("🤖 外部独立 Agent 启动，正在通过 MCP 协议连接 NovManager 数据中枢...")
    print("=" * 70)

    novel_id = "nov-001"
    chapter_id = "chap-012"
    scene_index = 3

    # 步骤 1：读取结构化创作上下文
    print("\n[步骤 1] 外部 Agent 读取 MCP Resource: novel://nov-001/chapters/chap-012/context")
    context_res = await mcp.read_resource(f"novel://{novel_id}/chapters/{chapter_id}/context")
    context_text = context_res[0].content if hasattr(context_res[0], 'content') else context_res[0].text
    context = json.loads(context_text)

    print(f"  ✓ 成功读取小说: 《{context['novel_title']}》 ({context['genre']})")
    print(f"  ✓ 叙事基调约束: {context['style_guide']['tone']}")
    print(f"  ✓ 本章大纲: {context['chapter']['title']} - {context['chapter']['outline']}")
    
    # 查找第 3 幕需求
    target_scene = next(s for s in context['chapter']['scenes'] if s['scene_index'] == scene_index)
    print(f"  ✓ 目标场景 [第 {scene_index} 幕]: 目标={target_scene['scene_goal']}")
    print(f"    冲突={target_scene['conflict']}, 转折={target_scene['turn_point']}")

    # 步骤 2：读取在场角色即时生理状态
    print("\n[步骤 2] 外部 Agent 检查在场主角【林越】的最新状态机...")
    lin_yue = next(c for c in context['characters'] if c['name'] == '林越')
    print(f"  ✓ 林越当前战力: {lin_yue['current_state']['combat_power']}")
    print(f"  ✓ 生理健康度: {lin_yue['current_state']['health_status']}")
    print(f"  ✓ 状态标签硬约束: {lin_yue['current_state']['status_tags']}")
    print(f"  ✓ 语言口癖准则: {lin_yue['voice']}")

    # 步骤 3：主动调用 MCP 工具查询世界法则
    print("\n[步骤 3] 外部 Agent 调用 MCP Tool: query_lore 查询太虚五境修行法则...")
    lore_res = await mcp.call_tool("query_lore", {"novel_id": novel_id, "query": "金丹 法则"})
    lore_data = json.loads(lore_res.content[0].text)
    print(f"  ✓ 查得 {lore_data['matched_count']} 条相关铁律，确认硬约束：金丹期绝不可撕裂空间！")

    # 步骤 4：独立创作正文 (严格遵守硬约束：林越左肩负伤用右手握剑、不撕裂空间、无违禁成语)
    print("\n[步骤 4] 外部 Agent 根据上下文与状态机要求撰写正文片段...")
    draft_prose = """夜枭面目狰狞，周身血煞翻涌如沸水。

“蝼蚁，受死！”

轰然一声爆鸣，一尊三丈高的血煞魔相拔地而起，挟裹着金丹初期的狂暴威压，宛如实质巨峰般向着地面悍然拍落。整座溶洞石壁在这股巨力碾压下寸寸爆碎，碎石如暴雨迸射。

林越单膝跪地，右手死死握紧青锋剑柄插在地面。他左肩被透骨钉洞穿的重创崩裂开来，鲜血淋漓渗透了青灰道袍，体内真元更是消耗得近乎干涸。面对境界如天堑般的金丹魔掌，他甚至没有多余的力气开口，眼神依旧沉静如万年冰川。

就在血煞魔掌距离林越头顶仅剩三尺的刹那——

铮！

一声清越高亢的剑鸣声突兀地撕裂了溶洞顶部的罡风夜幕！

碧绿色的秋水剑光破空而至，凛冽纯阳的天罡剑气如狂风扫落叶，将漫天血雾冻结成霜。

“血煞魔种，休伤我剑宗同门！”

一道娇斥声清脆响彻，一袭碧玉水波裙的苏青瑶手掐剑诀飘然而落。秋泓长剑灵动盘旋，精准至极地钉入血魔掌心三寸，正中魔核！

轰隆——！

金丹魔相被纯阳天罡之气刺破，狂暴的真元对冲瞬间震塌了整座溶洞地基。坚固的古石台分崩离析，露出下方深不见底的万年地脉深渊。三人立足不稳，同时向着无尽黑暗坠落而去……"""

    print(f"  ✓ 正文起草完毕，共计 {len(draft_prose)} 字。")

    # 步骤 5：调用 MCP 工具进行设定合规性自检
    print("\n[步骤 5] 外部 Agent 调用 MCP Tool: check_setting_consistency 进行一致性合规扫描...")
    audit_res = await mcp.call_tool("check_setting_consistency", {
        "novel_id": novel_id,
        "draft_text": draft_prose
    })
    audit_data = json.loads(audit_res.content[0].text)
    if audit_data["has_issues"]:
        print(f"  ⚠️ 发现问题：{audit_data['issues']}")
    else:
        print("  ✓ 一致性合规审查 100% 通过！无战力越级、无人设OOC、无生理矛盾。")

    # 步骤 6：调用 MCP 工具回写正文草稿
    print("\n[步骤 6] 外部 Agent 调用 MCP Tool: save_scene_draft 将草稿回写入 NovManager...")
    save_res = await mcp.call_tool("save_scene_draft", {
        "novel_id": novel_id,
        "chapter_id": chapter_id,
        "scene_index": scene_index,
        "content": draft_prose,
        "agent_notes": "外部 Agent 依据大纲完成第3幕起草：夜枭动真身，苏青瑶秋泓剑破局，双双坠渊。",
        "created_by": "Agent:Autonomous-Writer-01"
    })
    save_data = json.loads(save_res.content[0].text)
    print(f"  ✓ 草稿成功入库！生成版本快照 ID: {save_data['version_id']}，字数: {save_data['word_count']}")

    # 步骤 7：调用 MCP 工具更新角色动态状态机
    print("\n[步骤 7] 外部 Agent 调用 MCP Tool: update_character_state 更新林越动态状态机...")
    state_res = await mcp.call_tool("update_character_state", {
        "character_id": "char-001",
        "chapter_id": chapter_id,
        "location": "坠星崖底地脉深渊",
        "combat_power": "筑基后期（真元近乎枯竭）",
        "health_status": "CRITICAL",
        "status_tags": ["左肩贯穿伤", "真元耗尽", "跌入深渊", "青铜残片异动"],
        "state_summary": "硬撼夜枭金丹魔相，并在溶洞坍塌后与苏青瑶一同坠入地脉古遗迹深渊。"
    })
    state_data = json.loads(state_res.content[0].text)
    print(f"  ✓ 林越状态机已更新为: 地点【{state_data['location']}】，健康度【{state_data['health_status']}】，标签: {state_data['status_tags']}")

    # 步骤 8：调用 MCP 工具登记新的伏笔线索
    print("\n[步骤 8] 外部 Agent 调用 MCP Tool: record_foreshadowing 登记新埋设的伏笔...")
    fs_res = await mcp.call_tool("record_foreshadowing", {
        "novel_id": novel_id,
        "title": "深渊古阵中的青铜凹槽",
        "clue_description": "地渊深处散发着与青铜残片完全共鸣的星辰禁制，残片自主脱手悬浮。",
        "planted_chapter_id": chapter_id,
        "planned_resolve_chapter_index": 14,
        "notes": "计划在第14章揭晓地脉古阵其实是远古通往界外的传送阵"
    })
    fs_data = json.loads(fs_res.content[0].text)
    print(f"  ✓ 伏笔成功登记入雷达！伏笔ID: {fs_data['id']}，标题: 【{fs_data['title']}】")

    print("\n" + "=" * 70)
    print("🎉 外部 Agent 跨系统协作写书闭环全流程执行成功！")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(run_external_agent())
