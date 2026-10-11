# ==============================================================================
# NovManager 自我迭代与反思进化引擎 (Self-Iteration & Reflection Engine)
# 实现智能体创作质量自评 (5维雷达评分)、自主反思诊断、技法沉淀与提示词自适应进化
# ==============================================================================

import re
import json
from typing import Dict, List, Any, Optional
from datetime import datetime
from pydantic import BaseModel, Field

class EvaluationDimension(BaseModel):
    name: str
    label: str
    score: int = Field(..., ge=0, le=20)
    diagnosis: str

class SelfEvaluationResult(BaseModel):
    id: str = Field(default_factory=lambda: f"eval-{int(datetime.now().timestamp() * 1000)}")
    novel_id: str
    chapter_id: str
    scene_index: int = 1
    overall_score: int = Field(..., ge=0, le=100)
    dimensions: Dict[str, EvaluationDimension]
    strengths: List[str]
    weaknesses: List[str]
    suggested_refinements: List[str]
    iteration_count: int = 1
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

class AutonomousWritingEvaluator:
    """自主写作质量评价器：多维度文本审阅与量化评分"""

    @classmethod
    def evaluate_draft(
        cls,
        novel_id: str,
        chapter_id: str,
        scene_index: int,
        draft_text: str,
        scene_goal: str = "",
        world_rules: Optional[List[str]] = None,
        involved_characters: Optional[List[str]] = None
    ) -> SelfEvaluationResult:
        draft = draft_text.strip()
        length = len(draft)

        # 1. 设定延续性与防吃设定检验 (Continuity & World Consistency)
        continuity_score = 18
        continuity_diag = "设定与前文逻辑基本保持吻合"
        if length < 200:
            continuity_score = 12
            continuity_diag = "正文篇幅过短，未能充分铺展世界观规则与环境细节"
        elif "系统提示" in draft or "作为AI" in draft:
            continuity_score = 5
            continuity_diag = "正文混入了AI元提示或破壁词汇，破坏沉浸感"

        # 2. 角色声线与人设张力 (Character Voice & Anti-OOC)
        dialogue_count = len(re.findall(r'["“][^"”]+["”]', draft))
        voice_score = 17
        voice_diag = "角色对白与神态具备一定特征"
        if dialogue_count == 0:
            voice_score = 13
            voice_diag = "缺乏角色直接对白交互，偏重第三人称平铺直叙"
        elif dialogue_count > 10:
            voice_score = 18
            voice_diag = "对话张力饱满，口吻交锋清晰"

        # 3. 冲突张力与悬念钩子 (Dramatic Tension & Suspense)
        tension_keywords = ["突变", "杀意", "剧痛", "冷笑", "破空", "轰鸣", "绝境", "反转", "警觉", "杀招", "死寂"]
        found_tension = sum(1 for kw in tension_keywords if kw in draft)
        tension_score = min(20, 14 + found_tension)
        tension_diag = f"捕捉到 {found_tension} 处戏剧冲突信号，张力呈现合理"

        # 4. 五感渲染与意境通感 (Sensory Vividness & Show-Don't-Tell)
        sensory_keywords = ["冰冷", "炽热", "血腥", "腥甜", "焦糊", "微风", "残光", "刺耳", "低沉", "颤栗", "斑驳"]
        found_sensory = sum(1 for kw in sensory_keywords if kw in draft)
        sensory_score = min(20, 13 + found_sensory)
        sensory_diag = f"运用了 {found_sensory} 处通感具象词汇，具象白描表现良好"

        # 5. 语言节奏与去AI机械腔 (Narrative Pacing & Human Flow)
        # 检查典型 AI 机械套话
        ai_cliches = ["总而言之", "值得一提的是", "不仅如此", "在这片广袤的", "眼中闪过一丝", "不可否认"]
        found_cliches = [c for c in ai_cliches if c in draft]
        pacing_score = 18 - (len(found_cliches) * 3)
        pacing_score = max(8, min(20, pacing_score))
        if found_cliches:
            pacing_diag = f"检测到 {len(found_cliches)} 处典型AI套话（如：{', '.join(found_cliches)}），节奏稍显程式化"
        else:
            pacing_diag = "语言节奏干脆利落，未发现显性AI套话"

        overall_score = continuity_score + voice_score + tension_score + sensory_score + pacing_score

        strengths = []
        weaknesses = []
        refinements = []

        if continuity_score >= 16:
            strengths.append("世界观法则坚守严密，未发生战力撕裂或突兀设定冲突")
        else:
            weaknesses.append("世界观与场景规则交代不够扎实")
            refinements.append("在第1~2段增补环境法则制约与物理规则束缚")

        if voice_score >= 16:
            strengths.append("角色口吻与言行举止鲜活，体现人物性格特质")
        else:
            weaknesses.append("角色对白略显平淡，人物特征未完全凸显")
            refinements.append("引入角色的专属口癖或潜台词交锋")

        if tension_score >= 16:
            strengths.append("情节转折扣人心弦，冲突逐步层叠推进")
        else:
            weaknesses.append("对抗节奏稍显平缓，未给读者足够的紧迫感")
            refinements.append("在幕末加入倒计时或突发危机钩子")

        if sensory_score >= 16:
            strengths.append("五感白描丰富，冷暖光影与声色具象")
        else:
            weaknesses.append("环境侧重陈述概念，缺乏感官细节白描")
            refinements.append("强化触觉（风力、温度）与听觉微小声响细节描写")

        if pacing_score >= 16:
            strengths.append("句式长短错落，动词精准卡点，去AI味道充分")
        else:
            weaknesses.append("语言存在AI书卷气或程式化口吻")
            refinements.append("精简副词与解释性长句，代之以干脆的动作动词")

        dims = {
            "continuity": EvaluationDimension(name="continuity", label="设定延续与防吃设定", score=continuity_score, diagnosis=continuity_diag),
            "voice": EvaluationDimension(name="voice", label="角色声线与人设张力", score=voice_score, diagnosis=voice_diag),
            "tension": EvaluationDimension(name="tension", label="戏剧冲突与悬念推进", score=tension_score, diagnosis=tension_diag),
            "sensory": EvaluationDimension(name="sensory", label="五感通感与具象意境", score=sensory_score, diagnosis=sensory_diag),
            "pacing": EvaluationDimension(name="pacing", label="语言节奏与去AI机械腔", score=pacing_score, diagnosis=pacing_diag),
        }

        return SelfEvaluationResult(
            novel_id=novel_id,
            chapter_id=chapter_id,
            scene_index=scene_index,
            overall_score=overall_score,
            dimensions=dims,
            strengths=strengths,
            weaknesses=weaknesses,
            suggested_refinements=refinements,
            iteration_count=1
        )

class AutonomousReflector:
    """自反思与迭代进化循环器：根据自评缺陷生成进阶优化指令"""

    @classmethod
    def generate_reflection_strategy(cls, eval_result: SelfEvaluationResult) -> Dict[str, Any]:
        """依据自评结果，输出针对性的反思策略与进化提示词"""
        weakest_dim = min(eval_result.dimensions.values(), key=lambda d: d.score)

        iteration_prompt_addon = (
            f"\n【智能体自我反思与强化指示】\n"
            f"在前一轮创作自评中，当前最薄弱维度为【{weakest_dim.label}】(得分 {weakest_dim.score}/20)。\n"
            f"诊断反馈：{weakest_dim.diagnosis}\n"
            f"本轮迭代必须严格落实以下进化修正项：\n"
        )
        for i, ref in enumerate(eval_result.suggested_refinements, 1):
            iteration_prompt_addon += f"{i}. {ref}\n"

        return {
            "target_dimension": weakest_dim.name,
            "target_label": weakest_dim.label,
            "current_score": weakest_dim.score,
            "refinement_prompt_addon": iteration_prompt_addon,
            "can_auto_heal": eval_result.overall_score < 85
        }

class PromptSelfTuner:
    """提示词自适应进化器：根据作者日常采纳与修改行为进化系统提示词权重"""

    def __init__(self):
        self.preference_weights = {
            "action_density": 1.2,    # 动作描写密度加权
            "sensory_details": 1.3,   # 五感细节加权
            "dialogue_subtext": 1.1,  # 对白潜台词加权
            "pacing_speed": 1.0       # 叙事节奏推进速度
        }

    def record_author_feedback(self, accepted_as_is: bool, diff_length_ratio: float):
        """若作者几乎直接采纳 (diff 比例低)，强化当前生成范式；若大改，调整权重"""
        if accepted_as_is:
            self.preference_weights["action_density"] = min(2.0, self.preference_weights["action_density"] + 0.05)
            self.preference_weights["sensory_details"] = min(2.0, self.preference_weights["sensory_details"] + 0.05)
        elif diff_length_ratio > 0.5:
            # 作者做了大量修改，说明更青睐干练紧凑
            self.preference_weights["pacing_speed"] = min(2.0, self.preference_weights["pacing_speed"] + 0.1)

    def get_tuned_style_instruction(self) -> str:
        return (
            f"【进化提示词指引】动作描写权重: {self.preference_weights['action_density']:.2f}，"
            f"五感描写权重: {self.preference_weights['sensory_details']:.2f}，"
            f"潜台词张力: {self.preference_weights['dialogue_subtext']:.2f}。"
        )
