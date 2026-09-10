#!/usr/bin/env python3
# ==============================================================================
# NovManager MCP 示例客户端 (Third-Party Agent Integration Demo)
# 展示第三方智能体如何通过 MCP 协议：
# 1. 发现能力 (list_tools, list_resources)
# 2. 读取上下文资产 (read_resource)
# 3. 执行设定校验 (call_tool: check_setting_consistency)
# 4. 回写正文草稿与更新角色状态机 (call_tool: save_scene_draft, update_character_state)
# ==============================================================================

import asyncio
import json
import os
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAUNCHER_PATH = os.path.join(ROOT_DIR, "scripts", "nov-mcp")

async def run_agent_workflow():
    print("=" * 60)
    print("🤖 启动第三方写作 Agent 与 NovManager-MCP 通信...")
    print("=" * 60)

    # 1. 建立 Stdio 进程管道连接
    server_params = StdioServerParameters(
        command=LAUNCHER_PATH,
        args=[],
        env=None
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # 握手初始化
            init_result = await session.initialize()
            print(f"✓ 握手成功！MCP 服务端: {init_result.server_info.name}\n")

            # 2. 发现服务能力与资源
            print("【1. 能力探测 (Discovery)】")
            tools = await session.list_tools()
            print(f"  - 发现可用 MCP 工具数量: {len(tools.tools)}")
            for t in tools.tools:
                print(f"    • {t.name}: {t.description.splitlines()[0] if t.description else ''}")

            templates = await session.list_resource_templates()
            print(f"\n  - 发现可用结构化资源模板数量: {len(templates.resource_templates)}")
            for r in templates.resource_templates[:4]:
                print(f"    • {r.uri_template} ({r.name or ''})")

            # 3. 读取小说结构化上下文 (Resource 读取)
            print("\n【2. 上下文装配 (Resource Read)】")
            print("  - 正在装配第 12 章创作上下文包 (novel://nov-001/chapters/chap-012/context)...")
            res = await session.read_resource("novel://nov-001/chapters/chap-012/context")
            bundle_data = json.loads(res.contents[0].text)
            print(f"  ✓ 成功拉取上下文！当前章节: 《{bundle_data.get('chapter', {}).get('title')}》")
            print(f"  ✓ 登场角色卡: {[c['name'] for c in bundle_data.get('characters', [])]}")

            # 4. 检索世界观战力法则 (Tool 检索)
            print("\n【3. 世界观检索 (Tool: query_lore)】")
            lore_res = await session.call_tool("query_lore", arguments={
                "novel_id": "nov-001",
                "query": "金丹威压与空间限制"
            })
            lore_data = json.loads(lore_res.content[0].text)
            print(f"  ✓ 检索到 {lore_data.get('matched_count', 0)} 条相关世界观规则")

            # 5. 起草正文与设定合规扫描 (Tool: check_setting_consistency)
            print("\n【4. 设定一致性检测 (Tool: check_setting_consistency)】")
            test_draft = "林越猛地拔出青铜残剑，金丹威压骤然撕裂虚空，横跨三个大洲直刺而去！"
            print(f"  - 待检草稿: \"{test_draft}\"")
            check_res = await session.call_tool("check_setting_consistency", arguments={
                "novel_id": "nov-001",
                "draft_text": test_draft
            })
            issues_data = json.loads(check_res.content[0].text)
            print(f"  - 扫描结果: 发现 {issues_data.get('issue_count', 0)} 处设定冲突或战力越级")
            for issue in issues_data.get("issues", []):
                print(f"    ⚠️  [{issue.get('severity')}] {issue.get('title')}: {issue.get('description')}")

            # 6. 回写正文草稿与更新角色状态机 (Tool: save_scene_draft & update_character_state)
            print("\n【5. 正文回写与状态演进 (Tool: save_scene_draft)】")
            corrected_draft = "林越紧握青铜残剑残片，沉稳催动金丹威压，剑尖微颤，死死锁定三丈外的黑袍傀儡。"
            save_res = await session.call_tool("save_scene_draft", arguments={
                "novel_id": "nov-001",
                "chapter_id": "chap-012",
                "scene_index": 1,
                "content": corrected_draft,
                "agent_notes": "第三方 Agent 修订版：消除了战力撕裂空间越级矛盾。",
                "created_by": "ExternalThirdPartyAgent"
            })
            save_data = json.loads(save_res.content[0].text)
            print(f"  ✓ 草稿回写完成！生成新版本快照 ID: {save_data.get('version_id')}")
            print(f"  ✓ 场景字数统计: {save_data.get('word_count')} 字符")

            print("\n" + "=" * 60)
            print("🎉 第三方 Agent 完整 MCP 闭环流程演示成功！")
            print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_agent_workflow())
