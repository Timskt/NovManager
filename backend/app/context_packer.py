# ==============================================================================
# NovManager 动态上下文分级打包压缩器 (Dynamic Context Packer & Token Optimizer)
# 针对 LLM 上下文窗口限制，实施三层漏斗式筛选与优先级权重压缩，保障创作高密度、零幻觉
# ==============================================================================

from typing import List, Dict, Any, Optional

class ContextPacker:
    """动态上下文打包器：按优先级、章节距离和 token 预算筛选装配创作提示词"""

    def __init__(self, max_token_budget: int = 4000):
        self.max_token_budget = max_token_budget

    def estimate_tokens(self, text: str) -> int:
        """估算中英文混合文本 Token 消耗（中文字符约 1.5 token/字，英文约 0.75 token/词）"""
        if not text:
            return 0
        cn_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        other_chars = len(text) - cn_chars
        return int(cn_chars * 1.5 + other_chars * 0.5)

    def pack_scene_context(
        self,
        novel_title: str,
        novel_genre: str,
        style_guide: Dict[str, Any],
        volume_info: Optional[Dict[str, Any]],
        chapter_index: int,
        scene_goal: str,
        scene_conflict: str,
        involved_characters: List[Dict[str, Any]],
        world_rules: List[Dict[str, Any]],
        active_foreshadowings: List[Dict[str, Any]],
        previous_scene_summary: str = "",
        custom_instructions: str = ""
    ) -> Dict[str, Any]:
        """按权重分层组装紧凑上下文"""
        budget_left = self.max_token_budget
        packed_sections: List[Dict[str, str]] = []

        # Tier 1 (极高优先级，必须包含): 场景核心节拍与当前幕任务
        tier1_text = (
            f"【小说】《{novel_title}》（{novel_genre}）\n"
            f"【当前章节】第 {chapter_index} 章\n"
            f"【本幕目标】{scene_goal}\n"
            f"【核心冲突】{scene_conflict}\n"
        )
        if previous_scene_summary:
            tier1_text += f"【承接上文节拍】{previous_scene_summary}\n"
        
        tier1_tokens = self.estimate_tokens(tier1_text)
        budget_left -= tier1_tokens
        packed_sections.append({"title": "核心场景节拍", "content": tier1_text})

        # Tier 2 (高优先级): 登场角色的即时生理/心理/战力状态机
        char_lines = []
        for c in involved_characters:
            name = c.get("name", "未名角色")
            state = c.get("state", {})
            combat = state.get("combat_power") or "常态"
            health = state.get("health_status") or "HEALTHY"
            loc = state.get("location") or "场中"
            summary = state.get("state_summary") or ""
            char_lines.append(f"- {name} (战力: {combat}, 状态: {health}, 位置: {loc}): {summary}")
        
        tier2_text = "【登场角色即时状态】\n" + ("\n".join(char_lines) if char_lines else "无特定限制角色")
        tier2_tokens = self.estimate_tokens(tier2_text)
        if budget_left >= tier2_tokens:
            budget_left -= tier2_tokens
            packed_sections.append({"title": "登场角色状态", "content": tier2_text})

        # Tier 3 (中优先级): 严格世界观法则约束与边界防线
        # 按 priority 降序
        sorted_rules = sorted(world_rules, key=lambda r: r.get("priority", 50), reverse=True)
        rule_lines = []
        for r in sorted_rules:
            line = f"- [{r.get('name')}]: {r.get('content')}"
            tokens = self.estimate_tokens(line)
            if budget_left >= tokens:
                budget_left -= tokens
                rule_lines.append(line)
            else:
                break
        
        if rule_lines:
            tier3_text = "【核心世界观法则约束】\n" + "\n".join(rule_lines)
            packed_sections.append({"title": "世界观法则", "content": tier3_text})

        # Tier 4 (低优先级): 本章应触动的伏笔线索
        fore_lines = []
        for f in active_foreshadowings:
            line = f"- {f.get('title')}: {f.get('clue_description')}"
            tokens = self.estimate_tokens(line)
            if budget_left >= tokens:
                budget_left -= tokens
                fore_lines.append(line)
        
        if fore_lines:
            tier4_text = "【活跃伏笔关注】\n" + "\n".join(fore_lines)
            packed_sections.append({"title": "伏笔线索", "content": tier4_text})

        assembled_system_prompt = "\n\n".join(sec["content"] for sec in packed_sections)
        total_tokens = self.estimate_tokens(assembled_system_prompt)

        return {
            "assembled_prompt": assembled_system_prompt,
            "estimated_tokens": total_tokens,
            "budget_left": budget_left,
            "sections_count": len(packed_sections),
            "sections": packed_sections
        }
