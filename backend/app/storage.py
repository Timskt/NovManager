# ==============================================================================
# NovManager 数据持久化引擎与仓储服务 (Storage Repository)
# 纯 Python 实现轻量级持久化，支持线程安全读写、数据种子初始化与设定一致性检查
# ==============================================================================

import json
import os
import re
import threading
from typing import List, Optional, Dict, Any
from datetime import datetime

from .models import (
    Novel,
    WorldSetting,
    Character,
    CharacterState,
    CharacterRelation,
    Volume,
    Chapter,
    Scene,
    Foreshadowing,
    ManuscriptVersion,
    InspectionIssue,
    StyleGuide,
    CharacterProfile,
    PolishTechnique,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
STORE_FILE = os.path.join(DATA_DIR, "novel_store.json")

def camel_to_snake(name: str) -> str:
    s1 = re.sub('(.)([A-Z][a-z]+)', r'\1_\2', name)
    return re.sub('([a-z0-9])([A-Z])', r'\1_\2', s1).lower()

def to_snake_dict(d: Any) -> Any:
    if isinstance(d, list):
        return [to_snake_dict(v) for v in d]
    if isinstance(d, dict):
        mapping = {
            "volumeId": "volume_id",
            "novelId": "novel_id",
            "povCharacterId": "pov_character_id",
            "targetWordCount": "target_word_count",
            "currentWordCount": "current_word_count",
            "defaultPov": "default_pov",
            "styleGuide": "style_guide",
            "descriptionDensity": "description_density",
            "forbiddenPhrases": "forbidden_phrases",
            "roleType": "role_type",
            "personalityTraits": "personality_traits",
            "voiceAndTone": "voice_and_tone",
            "coreMotivation": "core_motivation",
            "fatalFlaw": "fatal_flaw",
            "characterId": "character_id",
            "chapterId": "chapter_id",
            "chapterIndex": "chapter_index",
            "combatPower": "combat_power",
            "healthStatus": "health_status",
            "statusTags": "status_tags",
            "stateSummary": "state_summary",
            "volumeIndex": "volume_index",
            "mainConflict": "main_conflict",
            "targetClimax": "target_climax",
            "boundaryConstraints": "boundary_constraints",
            "wordCountGoal": "word_count_goal",
            "actualWordCount": "actual_word_count",
            "sceneIndex": "scene_index",
            "sceneGoal": "scene_goal",
            "turnPoint": "turn_point",
            "involvedCharacterIds": "involved_character_ids",
            "draftContent": "draft_content",
            "agentNotes": "agent_notes",
            "clueDescription": "clue_description",
            "plantedChapterId": "planted_chapter_id",
            "plantedChapterIndex": "planted_chapter_index",
            "plannedResolveChapterIndex": "planned_resolve_chapter_index",
            "createdAt": "created_at",
            "updatedAt": "updated_at",
            "worldSettings": "world_settings",
            "characterStates": "character_states",
            "characterRelations": "character_relations",
            "fromCharacterId": "from_character_id",
            "toCharacterId": "to_character_id",
            "relationType": "relation_type",
            "affinityScore": "affinity_score",
            "isActive": "is_active",
        }
        res = {}
        for k, v in d.items():
            new_k = mapping.get(k) or camel_to_snake(k)
            res[new_k] = to_snake_dict(v)
        return res
    return d

try:
    from .db import DatabaseManager
except Exception as e:
    DatabaseManager = None

class NovelRepository:
    _instance = None
    _lock = threading.RLock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(NovelRepository, cls).__new__(cls)
                cls._instance._init_store()
            return cls._instance

    def _init_store(self):
        os.makedirs(DATA_DIR, exist_ok=True)
        if not os.path.exists(STORE_FILE):
            self._seed_sample_data()
        else:
            try:
                with open(STORE_FILE, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
                self._ensure_default_novels()
            except Exception as e:
                print(f"加载数据失败，重新种子化: {e}")
                self._seed_sample_data()

        # 尝试连接 PostgreSQL 并自动初始化/同步
        if DatabaseManager:
            try:
                db_health = DatabaseManager.check_health()
                if db_health.get("connected"):
                    if not db_health.get("tables_initialized") or db_health.get("novels_count", 0) == 0:
                        DatabaseManager.sync_from_json(self._data)
            except Exception as e:
                print(f"PostgreSQL 自动检查/初始化跳过: {e}")

    def _save(self):
        with self._lock:
            with open(STORE_FILE, "w", encoding="utf-8") as f:
                json.dump(self._data, f, ensure_ascii=False, indent=2)
            if DatabaseManager:
                try:
                    DatabaseManager.sync_from_json(self._data)
                except Exception:
                    pass

    def get_database_status(self) -> Dict[str, Any]:
        """获取当前底层关系数据库 (PostgreSQL) 运行状态及 pgvector 就绪情况"""
        if DatabaseManager:
            return DatabaseManager.check_health()
        return {"connected": False, "error": "DatabaseManager not configured"}

    def _ensure_default_novels(self):
        """确保基础种子作品（包括《太虚纪元》与《天演寻真录》）完整存在且无同名重复"""
        novels = self._data.setdefault("novels", {})

        # 1. 自动根据小说名称查重，彻底合并同名冗余数据
        title_to_id: Dict[str, str] = {}
        duplicates_to_delete = []
        for nid, n in list(novels.items()):
            t = n.get("title", "").strip()
            if not t:
                continue
            if t in title_to_id:
                canonical_id = title_to_id[t]
                # 迁移重复项中的分卷到主作品
                for vid, v in list(self._data.get("volumes", {}).items()):
                    if v.get("novel_id") == nid:
                        v["novel_id"] = canonical_id
                # 迁移重复项中的角色到主作品
                for cid, c in list(self._data.get("characters", {}).items()):
                    if c.get("novel_id") == nid:
                        c["novel_id"] = canonical_id
                duplicates_to_delete.append(nid)
            else:
                title_to_id[t] = nid

        for dup_id in duplicates_to_delete:
            del novels[dup_id]

        # 2. 确保《天演寻真录》存在且为 nov-002
        has_tianyan = any("天演" in n.get("title", "") for n in novels.values())
        if not has_tianyan and "nov-002" not in novels:
            novels["nov-002"] = {
                "id": "nov-002",
                "title": "天演寻真录",
                "subtitle": "",
                "genre": "仙侠修真 / 天道推演",
                "target_word_count": 1000000,
                "current_word_count": 0,
                "default_pov": "主角视角",
                "style_guide": {
                    "tone": "节奏紧凑、戏剧性强",
                    "pacing": "张弛有度",
                    "description_density": "适中",
                    "forbidden_phrases": ["恐怖如斯", "倒吸一口凉气"]
                },
                "created_at": "2026-09-05T08:00:00Z",
                "updated_at": "2026-09-05T09:00:00Z"
            }
            # 纯净初始分卷与空场景，不注入虚假人物
            self._data.setdefault("volumes", {})["vol-002"] = {
                "id": "vol-002",
                "novel_id": "nov-002",
                "volume_index": 1,
                "title": "第一卷",
                "main_conflict": "",
                "target_climax": "",
                "chapters": [
                    {
                        "id": "chap-002-1",
                        "volume_id": "vol-002",
                        "novel_id": "nov-002",
                        "chapter_index": 1,
                        "title": "第一章",
                        "outline": "",
                        "pov_character_id": "",
                        "word_count_goal": 3000,
                        "actual_word_count": 0,
                        "status": "PLANNED",
                        "scenes": [
                            {
                                "id": "sc-002-1-1",
                                "chapter_id": "chap-002-1",
                                "scene_index": 1,
                                "scene_goal": "开篇起笔",
                                "conflict": "",
                                "turn_point": "",
                                "outcome": "",
                                "involved_character_ids": [],
                                "location": "",
                                "draft_content": "",
                                "agent_notes": ""
                            }
                        ]
                    }
                ]
            }

        # 确保太虚纪元的核心世界观设定完整
        ws = self._data.setdefault("world_settings", {})
        if "ws-001" not in ws:
            ws["ws-001"] = {
                "id": "ws-001",
                "novel_id": "nov-001",
                "category": "POWER_SYSTEM",
                "name": "太虚五境修行法则",
                "aliases": ["境界体系", "修真法则"],
                "priority": 100,
                "tags": ["战力基石", "铁律"],
                "content": "练气期(1-9层)不可飞行；筑基期真气凝液，可短途腾空；金丹期真元化罡，寿五百载。核心铁律：金丹及以下修士绝不可撕裂空间或瞬移！跨大境界不可逆斩，妄动秘法必遭天道反噬。"
            }
        if "ws-002" not in ws:
            ws["ws-002"] = {
                "id": "ws-002",
                "novel_id": "nov-001",
                "category": "ITEM",
                "name": "九渊青铜残片（其二）",
                "aliases": ["青铜片", "古器"],
                "priority": 95,
                "tags": ["金手指", "上古禁器"],
                "content": "林越贴身异宝。特性：推演低阶功法破绽、敛息遮蔽金丹神识探查、中和魔宗血煞毒素。代价：强行推演会导致识海剧痛，短期无法动用神识。"
            }
        if "ws-003" not in ws:
            ws["ws-003"] = {
                "id": "ws-003",
                "novel_id": "nov-001",
                "category": "GEOGRAPHY",
                "name": "坠星崖",
                "aliases": ["断魂谷"],
                "priority": 75,
                "tags": ["主战场", "险地"],
                "content": "北域与南岭交界绝壁，罡风呼啸如刀，筑基修士难以御剑腾空，崖底有万年古遗迹与地脉禁制。"
            }

        # 确保新创建小说（如 nov-002）的人物与设定绝不混入虚构角色
        chars = self._data.setdefault("characters", {})
        for cid, c in list(chars.items()):
            if c.get("novel_id") == "nov-002":
                del chars[cid]

        self._save()

    def _seed_sample_data(self):
        self._data = {
            "novels": {
                "nov-001": {
                    "id": "nov-001",
                    "title": "太虚纪元",
                    "subtitle": "青铜残片现世，天道断绝三万年后的人间绝响",
                    "genre": "修真玄幻 / 仙侠智斗",
                    "target_word_count": 1500000,
                    "current_word_count": 68420,
                    "default_pov": "THIRD_LIMITED",
                    "style_guide": {
                        "tone": "冷峻克制，重智斗博弈，重因果逻辑，严谨无口水话",
                        "pacing": "张弛有度，日常紧扣资源争夺，冲突高潮干净利落",
                        "description_density": "中等偏浓郁",
                        "forbidden_phrases": ["恐怖如斯", "倒吸一口凉气", "桀桀怪笑", "嘴角泛起一抹弧度"]
                    },
                    "created_at": "2026-08-01T08:00:00Z",
                    "updated_at": "2026-09-04T10:30:00Z"
                }
            },
            "world_settings": {
                "ws-001": {
                    "id": "ws-001",
                    "novel_id": "nov-001",
                    "category": "POWER_SYSTEM",
                    "name": "太虚五境修行法则",
                    "aliases": ["境界体系", "修真法则"],
                    "priority": 100,
                    "tags": ["战力基石", "铁律"],
                    "content": "练气期(1-9层)不可飞行；筑基期真气凝液，可短途腾空；金丹期真元化罡，寿五百载。核心铁律：金丹及以下修士绝不可撕裂空间或瞬移！跨大境界不可逆斩，妄动秘法必遭天道反噬。"
                },
                "ws-002": {
                    "id": "ws-002",
                    "novel_id": "nov-001",
                    "category": "ITEM",
                    "name": "九渊青铜残片（其二）",
                    "aliases": ["青铜片", "古器"],
                    "priority": 95,
                    "tags": ["金手指", "上古禁器"],
                    "content": "林越贴身异宝。特性：推演低阶功法破绽、敛息遮蔽金丹神识探查、中和魔宗血煞毒素。代价：强行推演会导致识海剧痛，短期无法动用神识。"
                },
                "ws-003": {
                    "id": "ws-003",
                    "novel_id": "nov-001",
                    "category": "GEOGRAPHY",
                    "name": "坠星崖",
                    "aliases": ["断魂谷"],
                    "priority": 75,
                    "tags": ["主战场", "险地"],
                    "content": "北域与南岭交界绝壁，罡风呼啸如刀，筑基修士难以御剑腾空，崖底有万年古遗迹与地脉禁制。"
                }
            },
            "characters": {
                "char-001": {
                    "id": "char-001",
                    "novel_id": "nov-001",
                    "name": "林越",
                    "role_type": "PROTAGONIST",
                    "gender": "男",
                    "profile": {
                        "appearance": "青灰道袍，眼神如刀削，深邃内敛，左手食指有厚茧。",
                        "personality_traits": ["极度谨慎", "隐忍坚毅", "杀伐果断", "惜字如金"],
                        "voice_and_tone": "语速平缓低沉，少用反问与感叹句，极少放狠话；面对强敌时惜字如金。",
                        "core_motivation": "追查家族灭门真相，求存长生",
                        "fatal_flaw": "多疑成癖，极难信任同门",
                        "catchphrases": ["事不可为，且退一步。", "拔剑之后，便无退路。"]
                    },
                    "background": "太虚剑宗绝剑峰弟子",
                    "created_at": "2026-08-01T08:00:00Z"
                },
                "char-002": {
                    "id": "char-002",
                    "novel_id": "nov-001",
                    "name": "苏青瑶",
                    "role_type": "SUPPORTING",
                    "gender": "女",
                    "profile": {
                        "appearance": "碧玉水波裙，长发挽剑簪，双眸清澈，英姿飒爽。",
                        "personality_traits": ["聪慧机敏", "外柔内刚", "深明大义"],
                        "voice_and_tone": "清脆利落，行事干脆，对魔门冷冽如霜。",
                        "core_motivation": "登临剑道绝巅，暗查父亲异样",
                        "fatal_flaw": "同门情谊牵绊",
                        "catchphrases": ["绝剑峰的林师兄，倒真是一块捂不热的顽石。"]
                    },
                    "background": "太虚剑宗掌教幼女",
                    "created_at": "2026-08-01T08:00:00Z"
                },
                "char-003": {
                    "id": "char-003",
                    "novel_id": "nov-001",
                    "name": "夜枭",
                    "role_type": "ANTAGONIST",
                    "gender": "男",
                    "profile": {
                        "appearance": "面容苍白俊美，玄黑血纹大氅，腰悬嗜血短刃。",
                        "personality_traits": ["残忍嗜杀", "城府极深", "狂妄自负"],
                        "voice_and_tone": "阴柔居高临下，语调拉长，喜欢在击溃对手前心理施压。",
                        "core_motivation": "抢夺九枚青铜残片，开启血海大阵突破金丹枷锁",
                        "fatal_flaw": "轻视正道年轻一辈",
                        "catchphrases": ["挣扎的蝼蚁，血往往比认命的骨头更甜。"]
                    },
                    "background": "血煞魔宗少主",
                    "created_at": "2026-08-01T08:00:00Z"
                }
            },
            "character_states": [
                {
                    "id": "cs-001",
                    "character_id": "char-001",
                    "chapter_id": "chap-011",
                    "chapter_index": 11,
                    "location": "坠星崖底古溶洞外围",
                    "combat_power": "筑基后期（战力损耗四成）",
                    "health_status": "INJURED",
                    "status_tags": ["左肩贯穿伤", "真元透支", "青铜残片发烫中"],
                    "state_summary": "被魔宗死士透骨钉穿肩，拼死斩杀敌手后负伤遁入溶洞。",
                    "updated_at": "2026-09-04T09:00:00Z"
                }
            ],
            "volumes": {
                "vol-001": {
                    "id": "vol-001",
                    "novel_id": "nov-001",
                    "volume_index": 1,
                    "title": "第一卷：潜龙出渊",
                    "summary": "讲述落魄庶子林越自灭门惨剧后隐忍拜入太虚剑宗，在外门试炼中意外激活上古青铜残片，引起宗门内部暗流与南岭血煞魔宗的疯狂觊觎。在黑风渊秘境夺宝与坠星崖生死大追杀中，林越凭借极度谨慎的心性与狠辣剑招，联合剑宗真传苏青瑶殊死周旋，最终在坠星崖绝壁撕裂魔相，双双跌入上古地渊绝境。",
                    "main_conflict": "林越持青铜残片在魔宗追杀与宗门暗流中杀出血路",
                    "target_climax": "坠星崖绝地血战，破除死局",
                    "boundary_constraints": "【人物登场禁忌】：严禁金丹后期以上大能本体直接降临参战；魔宗宗主与太虚掌教仅限侧面传闻提及，不可提前现身；\n【宝物机缘禁忌】：本卷仅限第一枚青铜残片苏醒，绝对禁止提前出土第二枚残片或上古神器；\n【战力天花板】：全卷战力严格压制在筑基期至金丹初期（如夜枭受创魔相），禁止出现空间撕裂或化神异象；\n【剧情悬念暗线】：严禁提前揭晓当年林氏灭族真正元凶，保留暗桩线索。",
                    "chapters": [
                        {
                            "id": "chap-011",
                            "volume_id": "vol-001",
                            "novel_id": "nov-001",
                            "chapter_index": 11,
                            "title": "绝壁惊变",
                            "outline": "林越察觉被宗门同道暗算引来魔宗死士，在乱石林中利用地势完成反杀，但自己左肩遭受重创，不得不冒险遁向罡风肆虐的坠星崖底。",
                            "pov_character_id": "char-001",
                            "word_count_goal": 3200,
                            "actual_word_count": 3180,
                            "status": "PUBLISHED",
                            "scenes": [
                                {
                                    "id": "sc-11-1",
                                    "chapter_id": "chap-011",
                                    "scene_index": 1,
                                    "scene_goal": "暗中识破伏击，引诱魔宗死士踏入绝灵杀阵",
                                    "conflict": "三名魔宗筑基后期死士手持尸火短刃合围逼近",
                                    "turn_point": "暗中启动三道绝灵困杀阵，出其不意拔剑反杀二人",
                                    "outcome": "斩杀两名死士，但被领头死士以透骨钉刺穿左肩",
                                    "involved_character_ids": ["char-001"],
                                    "location": "坠星崖外围乱石林",
                                    "draft_content": "暮色四合，残阳如血。\n\n林越伏在一块巨大的青黑色风化岩后，屏息凝神，左手掌心紧贴着冰冷的岩面。\n\n四周极其安静，静得只能听见狂风穿过石孔发出的尖锐呼啸。但空气中那一缕微不可察的血腥气与腐尸香，却瞒不过他的感知。\n\n“绝剑峰的探子……动作倒是挺快。”\n\n三名身着血煞魔宗服饰的黑袍修士呈品字形急速穿插，手中短刃吞吐着惨绿色的尸火，直逼林越藏身之所。\n\n林越眼眸低垂，毫无慌乱。他早在半个时辰前便在此地布下了三道‘绝灵困杀阵’。当领头黑袍人踏入石隙阵眼的刹那，林越骤然拔剑！\n\n剑若惊鸿，刺破暮色！",
                                    "agent_notes": "展现林越心思缜密，反杀干脆利落"
                                },
                                {
                                    "id": "sc-11-2",
                                    "chapter_id": "chap-011",
                                    "scene_index": 2,
                                    "scene_goal": "带伤突围，强渡罡风绝壁遁入崖底溶洞",
                                    "conflict": "魔宗援军与夜枭的血煞罗盘锁定了血腥气，后路被断",
                                    "turn_point": "冒险纵身跳下万丈罡风呼啸的坠星崖绝壁",
                                    "outcome": "借青铜残片微弱浮力穿过罡风层，成功迫降崖底古溶洞",
                                    "involved_character_ids": ["char-001"],
                                    "location": "坠星崖万丈绝壁罡风层",
                                    "draft_content": "“噗！”\n\n透骨钉自左肩胛骨穿透而过，带出一串刺目的血花。\n\n林越闷哼一声，反手一剑将最后一名死士斩首。然而山林远端，数道强悍无匹的金丹血煞之气正如长虹贯日般急掠而来，夜枭阴冷的狞笑声已隐隐顺着风势压入耳膜。\n\n“退路已断。”\n\n林越眼中闪过一抹决绝之色。他望向身前那深不见底、罡风如刀的坠星断崖，没有任何迟疑，纵身一跃！\n\n狂暴的天地罡风疯狂撕扯着他的道袍与皮肉，胸口贴身的青铜残片却在剧烈共鸣中泛起一层古朴微光，托着他在绝壁间七折八绕，最终重重砸落在崖底漆黑的古溶洞入口处。",
                                    "agent_notes": "第11章收尾转入第12章，引出后续溶洞决战"
                                }
                            ]
                        },
                        {
                            "id": "chap-012",
                            "volume_id": "vol-001",
                            "novel_id": "nov-001",
                            "chapter_index": 12,
                            "title": "血战坠星崖",
                            "outline": "夜枭率众封锁溶洞，林越以弱敌强设下火珠陷阱，青铜残片与古石壁共鸣，激战坠崖。",
                            "pov_character_id": "char-001",
                            "word_count_goal": 3500,
                            "actual_word_count": 2240,
                            "status": "DRAFTED",
                            "scenes": [
                                {
                                    "id": "sc-12-1",
                                    "chapter_id": "chap-012",
                                    "scene_index": 1,
                                    "scene_goal": "林越压制肩伤，借溶洞阴煞伪装，设下埋伏",
                                    "conflict": "真元透支，夜枭血蝙蝠探子在洞口盘旋",
                                    "turn_point": "青铜残片与古老石壁共鸣，发现上古残阵",
                                    "outcome": "放弃遁逃，决定借地利诱敌歼灭",
                                    "involved_character_ids": ["char-001"],
                                    "location": "坠星崖底古溶洞",
                                    "draft_content": "夜雨如注。\n\n黑沉沉的罡风宛如实质的钢刀，在万丈绝壁之间穿凿出凄厉的鬼哭之音。\n\n林越背靠着潮湿冰冷的溶洞岩壁，呼吸轻微得几不可闻。他右手并指如剑，没有丝毫迟疑地在左肩贯穿伤口周边连点七处大穴。真元封禁的刹那，皮肉翻卷的剧痛令他瞳孔骤然一缩，但他甚至连眉头都未曾动一下。\n\n“咳……”\n\n一口夹杂着黑煞之气的暗红淤血被他强咽回去，只在嘴角溢出一缕刺目的血痕。\n\n血煞宗的‘透骨钉’。若非他在电光石火间侧移了半寸，被洞穿的就不仅是琵琶骨，而是他的心脉。\n\n林越垂眸，左手下意识地探入衣襟深处。贴肉处，那枚边缘残缺、生着斑驳铜锈的青铜残片正散发着灼热的温度。铜片微颤，将顺着伤口侵入他体内的阴煞之气丝丝缕缕吸纳进去。\n\n溶洞外，雷光乍亮，一道黑影无声无息地掠过洞口上空。\n\n林越眼眸沉冷，整个人如同一块风化千万年的山岩，心跳已降至常人三成以下。他知道，夜枭的猎犬已经到了。",
                                    "agent_notes": "描写林越忍痛点穴封伤，体现冷酷心性"
                                },
                                {
                                    "id": "sc-12-2",
                                    "chapter_id": "chap-012",
                                    "scene_index": 2,
                                    "scene_goal": "夜枭踏入陷阱，双方爆发言语与神识试探",
                                    "conflict": "金丹初期的绝对威压压迫林越经脉欲裂，正面实力悬殊",
                                    "turn_point": "引爆地煞阴火珠，借残片敛息刺杀护法",
                                    "outcome": "斩杀魔宗护法，逼迫夜枭动用真身",
                                    "involved_character_ids": ["char-001", "char-003"],
                                    "location": "古溶洞中段裂谷",
                                    "draft_content": "“林师弟，何必如阴沟里的老鼠一般躲躲藏藏？”\n\n幽冷的声音自洞外漫入，带着一种令人神魂泛恶的甜腥气。\n\n伴随着细碎的脚步声，一袭血纹大氅踏着碎石迈入溶洞。夜枭居高临下地俯视着盘坐于石台上的林越，苍白俊美的面孔上浮现出一抹玩味的笑意。\n\n在他身后，两具通体缠绕尸布的铁甲铜尸默无声息地立于阴影之中，散发着媲美筑基后期的凶戾威压。\n\n“交出青铜片，我准你自废道基，留你一具全尸回去给绝剑峰收殓。”夜枭手指轻抚腰间血刃，眼神像在看一具已死之物。\n\n林越缓缓抬起头。他的脸色因失血而惨白，眼神却平静得如同一汪深不见底的寒潭。\n\n“青铜片在此。”\n\n林越缓缓摊开右手，一枚散发着微弱青芒的古物静静躺在掌心。\n\n夜枭眼眸骤然一亮，周身血芒暴涨！就在其心神被残片所摄的电光石火之间，林越左脚猛然顿地——\n\n轰！\n\n深埋于溶洞上方的十二颗地煞阴火珠同时被引爆！炽烈的紫黑火浪瞬间将整个洞顶崩塌，伴随着惊天动地的巨响，万斤巨石挟裹着地煞烈火如雨砸落！",
                                    "agent_notes": "夜枭逼迫交出残片，林越果断引爆地煞火珠"
                                },
                                {
                                    "id": "sc-12-3",
                                    "chapter_id": "chap-012",
                                    "scene_index": 3,
                                    "scene_goal": "夜枭暴怒动用金丹领域，苏青瑶御剑赶到破局",
                                    "conflict": "夜枭金丹血相即将碾碎林越道基",
                                    "turn_point": "苏青瑶祭出掌教天罡剑符撕裂领域，地脉塌陷",
                                    "outcome": "击退夜枭，林越与苏青瑶一同坠入地渊深处",
                                    "involved_character_ids": ["char-001", "char-002", "char-003"],
                                    "location": "坠星崖底地脉深渊",
                                    "draft_content": "“找死！”\n\n巨石与烈火之中，夜枭身形狼狈地冲天而起，俊美面庞已被灼烧得狰狞扭曲。金丹初期的浩瀚血相轰然显化，一尊长达十余丈的血煞鬼手凌空探下，死死扣向林越天灵！\n\n在那股可怖的威压之下，林越脚下岩石寸寸龟裂，全身骨骼发出令人牙酸的爆响。\n\n就在这千钧一发之际——\n\n“唳——！”\n\n一声清亮如龙吟的剑鸣骤然自夜雨中穿透而来！一道湛青色的惊天剑虹宛如银河倾泻，伴随着无边罡气，狠狠斩在那尊血煞鬼手之上！\n\n“夜枭，休伤我剑宗弟子！”\n\n青衣猎猎，苏青瑶手持秋泓飞剑凌空按落，掌教手书的‘天罡剑符’在虚空中显化出九道璀璨金芒，硬生生将夜枭的金丹领域撕开一道大口！\n\n轰隆！\n\n整座溶洞的地脉在两大至强招式碰撞下彻底崩裂塌陷，林越与苏青瑶的身影瞬间被无底深渊的黑暗所吞没……",
                                    "agent_notes": "苏青瑶天罡剑符逆转战局，留下坠入深渊悬念"
                                }
                            ]
                        },
                        {
                            "id": "chap-013",
                            "volume_id": "vol-001",
                            "novel_id": "nov-001",
                            "chapter_index": 13,
                            "title": "地渊遗迹",
                            "outline": "坠入地渊后的二人发现这是一座被岁月掩埋的上古传送古阵，青铜残片与石台中央的凹槽严丝合缝...",
                            "pov_character_id": "char-001",
                            "word_count_goal": 3200,
                            "actual_word_count": 800,
                            "status": "PLANNED",
                            "scenes": [
                                {
                                    "id": "sc-13-1",
                                    "chapter_id": "chap-013",
                                    "scene_index": 1,
                                    "scene_goal": "林越与苏青瑶在地渊幽暗古殿中苏醒，相互戒备中确认彼此伤势",
                                    "conflict": "地脉深渊灵气紊乱，古禁制蠢蠢欲动",
                                    "turn_point": "苏青瑶的本命飞剑秋泓剑鞘，竟与林越的青铜残片产生共振",
                                    "outcome": "发现地底巨大残阵的轮廓，决定结伴探索生路",
                                    "involved_character_ids": ["char-001", "char-002"],
                                    "location": "地渊上古遗迹外殿",
                                    "draft_content": "冰冷刺骨的水滴，一滴一滴落在林越眉心。\n\n他猛地睁开双眼，右手本能地握住腰间残剑，整个人瞬间翻滚戒备。然而牵动左肩的伤口，让他忍不住倒抽了一口凉气。\n\n“林师兄……你醒了？”\n\n微弱的声音从数步外的碎石堆后传来。苏青瑶面容微白，衣裙多处被罡风划破，发髻散乱，却依然挣扎着执剑站直。\n\n林越目光扫视四周。这并非寻常的山洞，而是一座足有百丈宽阔的巨型地底殿堂。四壁由不知名的青黑玄玉砌成，地面铭刻着密密麻麻、早已失传的古老阵纹。\n\n更诡异的是，苏青瑶佩剑的剑鞘末端，那道奇特的云纹卡槽，正散发着与林越怀中残片一模一样的幽幽青辉。",
                                    "agent_notes": "开启地底探险新篇章"
                                }
                            ]
                        }
                    ]
                }
            },
            "foreshadowings": {
                "fs-001": {
                    "id": "fs-001",
                    "novel_id": "nov-001",
                    "title": "青铜残片上的逆向铭文",
                    "clue_description": "残片背面刻有一行古篆，文字结构与当代修真界完全相反，疑似远古大荒文字。",
                    "planted_chapter_id": "chap-011",
                    "planted_chapter_index": 11,
                    "planned_resolve_chapter_index": 20,
                    "status": "FERMENTING",
                    "notes": "后续由苏青瑶辨认出属于绝天地通封印铭文"
                },
                "fs-002": {
                    "id": "fs-002",
                    "novel_id": "nov-001",
                    "title": "苏青瑶佩剑的卡槽",
                    "clue_description": "苏青瑶的秋泓剑剑鞘有一处与铜片完全吻合的缺口卡槽。",
                    "planted_chapter_id": "chap-012",
                    "planted_chapter_index": 12,
                    "planned_resolve_chapter_index": 12,
                    "status": "PLANTED",
                    "notes": "第12章第3幕激战引动共鸣"
                }
            },
            "versions": []
        }
        self._save()

    # --- 核心 CRUD 方法 ---

    def list_novels(self) -> List[Novel]:
        """获取所有小说列表"""
        return [Novel(**n) for n in self._data.get("novels", {}).values()]

    def create_or_update_novel(self, novel_data: Dict[str, Any]) -> Novel:
        novel_data = to_snake_dict(novel_data)
        title = novel_data.get("title", "").strip()
        novel_id = novel_data.get("id")

        # 检查是否已存在同名小说，优先复用同名小说的 ID，杜绝重复创建
        if title:
            for nid, n in self._data.get("novels", {}).items():
                if n.get("title", "").strip() == title:
                    novel_id = nid
                    break

        if not novel_id:
            novel_id = f"nov-{int(datetime.utcnow().timestamp() * 1000)}"
        novel_data["id"] = novel_id
        now_iso = datetime.utcnow().isoformat()
        if "created_at" not in novel_data:
            novel_data["created_at"] = now_iso
        novel_data["updated_at"] = now_iso

        if "style_guide" not in novel_data or not isinstance(novel_data["style_guide"], dict):
            novel_data["style_guide"] = {
                "tone": "节奏紧凑、冲突鲜明",
                "pacing": "张弛有度",
                "description_density": "适中",
                "forbidden_phrases": ["恐怖如斯", "倒吸一口凉气"]
            }

        novel_obj = Novel(**novel_data)
        self._data.setdefault("novels", {})[novel_id] = novel_obj.model_dump()
        self._save()
        return novel_obj

    def sync_novel_bundle(self, bundle: Dict[str, Any]) -> Novel:
        bundle = to_snake_dict(bundle)
        novel_raw = bundle.get("novel") or bundle
        title = novel_raw.get("title", "").strip()
        novel_id = novel_raw.get("id")

        # 检查是否已存在同名小说，优先复用同名小说的 ID
        if title:
            for nid, n in self._data.get("novels", {}).items():
                if n.get("title", "").strip() == title:
                    novel_id = nid
                    break

        if not novel_id:
            novel_id = f"nov-{int(datetime.utcnow().timestamp() * 1000)}"
        novel_raw["id"] = novel_id
        now_iso = datetime.utcnow().isoformat()
        if "created_at" not in novel_raw:
            novel_raw["created_at"] = now_iso
        novel_raw["updated_at"] = now_iso

        if "style_guide" not in novel_raw or not isinstance(novel_raw["style_guide"], dict):
            novel_raw["style_guide"] = {
                "tone": "节奏紧凑、冲突鲜明",
                "pacing": "张弛有度",
                "description_density": "适中",
                "forbidden_phrases": ["恐怖如斯", "倒吸一口凉气"]
            }

        novel_obj = Novel(**novel_raw)
        self._data.setdefault("novels", {})[novel_id] = novel_obj.model_dump()

        # 同步设定
        if "world_settings" in bundle:
            self._data["world_settings"] = {
                k: v for k, v in self._data.get("world_settings", {}).items()
                if v.get("novel_id") != novel_id
            }
            for ws in bundle["world_settings"]:
                ws["novel_id"] = novel_id
                ws_id = ws.get("id") or f"ws-{int(datetime.utcnow().timestamp() * 1000)}"
                ws["id"] = ws_id
                self._data["world_settings"][ws_id] = ws

        # 同步角色
        if "characters" in bundle:
            self._data["characters"] = {
                k: v for k, v in self._data.get("characters", {}).items()
                if v.get("novel_id") != novel_id
            }
            for c in bundle["characters"]:
                c["novel_id"] = novel_id
                c_id = c.get("id") or f"char-{int(datetime.utcnow().timestamp() * 1000)}"
                c["id"] = c_id
                self._data["characters"][c_id] = c

        # 同步角色状态
        if "character_states" in bundle:
            char_ids = set(c.get("id") for c in bundle.get("characters", []))
            self._data["character_states"] = [
                s for s in self._data.get("character_states", [])
                if s.get("character_id") not in char_ids
            ]
            for cs in bundle["character_states"]:
                self._data["character_states"].append(cs)

        # 同步人物关系
        if "character_relations" in bundle:
            self._data["character_relations"] = [
                r for r in self._data.get("character_relations", [])
                if r.get("novel_id") != novel_id
            ]
            for cr in bundle["character_relations"]:
                cr["novel_id"] = novel_id
                cr_id = cr.get("id") or f"rel-{int(datetime.utcnow().timestamp() * 1000)}"
                cr["id"] = cr_id
                self._data.setdefault("character_relations", []).append(cr)

        # 同步分卷大纲
        if "volumes" in bundle:
            self._data["volumes"] = {
                k: v for k, v in self._data.get("volumes", {}).items()
                if v.get("novel_id") != novel_id
            }
            for vol in bundle["volumes"]:
                vol["novel_id"] = novel_id
                vol_id = vol.get("id") or f"vol-{int(datetime.utcnow().timestamp() * 1000)}"
                vol["id"] = vol_id
                self._data["volumes"][vol_id] = vol

        # 同步伏笔
        if "foreshadowings" in bundle:
            self._data["foreshadowings"] = {
                k: v for k, v in self._data.get("foreshadowings", {}).items()
                if v.get("novel_id") != novel_id
            }
            for fs in bundle["foreshadowings"]:
                fs["novel_id"] = novel_id
                fs_id = fs.get("id") or f"fs-{int(datetime.utcnow().timestamp() * 1000)}"
                fs["id"] = fs_id
                self._data["foreshadowings"][fs_id] = fs

        if bundle.get("is_active"):
            self._data["active_novel_id"] = novel_id

        self._save()
        return novel_obj

    def delete_novel(self, novel_id: str) -> bool:
        if novel_id in self._data.get("novels", {}):
            del self._data["novels"][novel_id]
            self._data["world_settings"] = {k: v for k, v in self._data.get("world_settings", {}).items() if v.get("novel_id") != novel_id}
            self._data["characters"] = {k: v for k, v in self._data.get("characters", {}).items() if v.get("novel_id") != novel_id}
            self._data["volumes"] = {k: v for k, v in self._data.get("volumes", {}).items() if v.get("novel_id") != novel_id}
            self._data["foreshadowings"] = {k: v for k, v in self._data.get("foreshadowings", {}).items() if v.get("novel_id") != novel_id}
            self._data["character_relations"] = [r for r in self._data.get("character_relations", []) if r.get("novel_id") != novel_id]
            if self._data.get("active_novel_id") == novel_id:
                novels = self._data.get("novels", {})
                self._data["active_novel_id"] = next(iter(novels.keys())) if novels else ""
            self._save()
            return True
        return False

    def get_active_novel_id(self) -> str:
        """获取当前激活的小说 ID（优先读取环境变量，其次仓储状态，最后回退到第一个小说）"""
        env_active = os.environ.get("NOV_ACTIVE_NOVEL_ID")
        if env_active and env_active in self._data.get("novels", {}):
            return env_active
        active = self._data.get("active_novel_id")
        if active and active in self._data.get("novels", {}):
            return active
        novels = self._data.get("novels", {})
        return next(iter(novels.keys())) if novels else "nov-001"

    def set_active_novel_id(self, novel_id: str) -> bool:
        """切换当前激活的小说"""
        if novel_id in self._data.get("novels", {}):
            self._data["active_novel_id"] = novel_id
            self._save()
            return True
        return False

    def resolve_novel_id(self, novel_id_or_title: Optional[str] = None) -> str:
        """
        智能解析小说 ID：
        1. 若未提供、为空、或为 'active'/'current'，返回当前活跃小说 ID
        2. 若精确匹配已存在的 novel_id，直接返回
        3. 若模糊匹配小说标题（例如 '太虚'、'太虚剑尊'），自动返回对应 ID
        4. 否则默认返回当前激活小说 ID
        """
        if not novel_id_or_title or novel_id_or_title.strip() in ("", "active", "current"):
            return self.get_active_novel_id()
        
        target = novel_id_or_title.strip()
        novels = self._data.get("novels", {})
        if target in novels:
            return target
        
        # 模糊书名匹配
        target_lower = target.lower()
        for nid, n in novels.items():
            title = n.get("title", "").lower()
            if target_lower == title or target_lower in title:
                return nid

        return self.get_active_novel_id()

    def get_novel(self, novel_id: str = "nov-001") -> Optional[Novel]:
        resolved = self.resolve_novel_id(novel_id)
        data = self._data["novels"].get(resolved)
        return Novel(**data) if data else None

    def get_world_settings(self, novel_id: str = "nov-001", category: Optional[str] = None) -> List[WorldSetting]:
        res = []
        for item in self._data["world_settings"].values():
            if item["novel_id"] == novel_id:
                if not category or item["category"] == category:
                    res.append(WorldSetting(**item))
        return res

    def query_lore(self, novel_id: str, query: str, category: Optional[str] = None) -> List[Dict[str, Any]]:
        settings = self.get_world_settings(novel_id, category)
        matched = []
        q_lower = query.lower()
        for s in settings:
            score = 0
            if q_lower in s.name.lower():
                score += 10
            for a in s.aliases:
                if q_lower in a.lower():
                    score += 8
            if q_lower in s.content.lower():
                score += 5
            for t in s.tags:
                if q_lower in t.lower():
                    score += 4
            
            # 部分字符重叠简易模糊匹配
            for char in q_lower:
                if char in s.name or char in s.content:
                    score += 1

            if score > 0:
                matched.append({
                    "id": s.id,
                    "name": s.name,
                    "category": s.category,
                    "content": s.content,
                    "score": score
                })
        matched.sort(key=lambda x: x["score"], reverse=True)
        return matched[:5]

    def get_characters(self, novel_id: str = "nov-001") -> List[Character]:
        return [Character(**c) for c in self._data["characters"].values() if c["novel_id"] == novel_id]

    def get_character(self, character_id: str) -> Optional[Character]:
        data = self._data["characters"].get(character_id)
        return Character(**data) if data else None

    def get_character_state_at_chapter(self, character_id: str, chapter_index: Optional[int] = None) -> Optional[CharacterState]:
        states = [s for s in self._data.get("character_states", []) if s.get("character_id") == character_id]
        if not states:
            return None
        if chapter_index is not None and chapter_index > 0:
            valid = [s for s in states if s.get("chapter_index", 1) <= chapter_index]
            if valid:
                valid.sort(key=lambda s: s.get("chapter_index", 1))
                return CharacterState(**valid[-1])
            return None
        states.sort(key=lambda s: s.get("chapter_index", 1))
        return CharacterState(**states[-1])

    def get_latest_character_state(self, character_id: str) -> Optional[CharacterState]:
        return self.get_character_state_at_chapter(character_id, None)

    def update_character_state(
        self,
        character_id: str,
        chapter_id: str,
        location: Optional[str],
        combat_power: Optional[str],
        health_status: Optional[str],
        status_tags: Optional[List[str]],
        state_summary: str,
        chapter_index: Optional[int] = None
    ) -> CharacterState:
        prev = self.get_latest_character_state(character_id)
        chap_idx = chapter_index
        if chap_idx is None:
            chap = self.get_chapter(chapter_id)
            chap_idx = chap.chapter_index if chap else 1

        new_state = {
            "id": f"cs-{int(datetime.utcnow().timestamp() * 1000)}",
            "character_id": character_id,
            "chapter_id": chapter_id,
            "chapter_index": chap_idx,
            "location": location or (prev.location if prev else "未知"),
            "combat_power": combat_power or (prev.combat_power if prev else "未知"),
            "health_status": health_status or (prev.health_status if prev else "HEALTHY"),
            "status_tags": status_tags or (prev.status_tags if prev else []),
            "state_summary": state_summary,
            "updated_at": datetime.utcnow().isoformat()
        }
        self._data["character_states"].append(new_state)
        self._save()
        return CharacterState(**new_state)

    def get_character_relations(self, novel_id: str = "nov-001") -> List[CharacterRelation]:
        novel_id = self.resolve_novel_id(novel_id)
        return [
            CharacterRelation(**to_snake_dict(r))
            for r in self._data.get("character_relations", [])
            if r.get("novel_id") == novel_id
        ]

    def update_character_relation(self, relation_data: Dict[str, Any]) -> CharacterRelation:
        rel_dict = to_snake_dict(relation_data)
        rel_id = rel_dict.get("id") or f"rel-{int(datetime.utcnow().timestamp() * 1000)}"
        rel_dict["id"] = rel_id
        novel_id = rel_dict.get("novel_id") or self.get_active_novel_id()
        rel_dict["novel_id"] = novel_id

        relations = self._data.setdefault("character_relations", [])
        relations = [
            r for r in relations
            if r.get("id") != rel_id and not (
                r.get("from_character_id") == rel_dict.get("from_character_id") and
                r.get("to_character_id") == rel_dict.get("to_character_id")
            )
        ]
        relations.append(rel_dict)
        self._data["character_relations"] = relations
        self._save()
        return CharacterRelation(**rel_dict)

    def delete_character_relation(self, relation_id: str) -> bool:
        relations = self._data.get("character_relations", [])
        before = len(relations)
        self._data["character_relations"] = [r for r in relations if r.get("id") != relation_id]
        if len(self._data["character_relations"]) != before:
            self._save()
            return True
        return False

    def get_volumes(self, novel_id: str = "nov-001") -> List[Volume]:
        return [Volume(**to_snake_dict(v)) for v in self._data["volumes"].values() if v.get("novel_id") == novel_id]

    def get_chapter(self, chapter_id: str) -> Optional[Chapter]:
        for vol in self._data["volumes"].values():
            for c in vol.get("chapters", []):
                if c.get("id") == chapter_id:
                    return Chapter(**to_snake_dict(c))
        return None

    def get_chapter_context_bundle(self, novel_id: str, chapter_id: str) -> Dict[str, Any]:
        novel = self.get_novel(novel_id)
        chapter = self.get_chapter(chapter_id)
        if not chapter or not novel:
            return {}
        
        chap_idx = chapter.chapter_index if chapter else 1
        characters = self.get_characters(novel_id)
        # 精准按当前章节获取角色即时状态机快照
        active_states = {c.id: self.get_character_state_at_chapter(c.id, chap_idx) for c in characters}
        active_foreshadowings = self.get_active_foreshadowings(novel_id)
        rules = self.get_world_settings(novel_id)

        return {
            "novel_title": novel.title,
            "genre": novel.genre,
            "style_guide": novel.style_guide.model_dump(),
            "chapter": {
                "id": chapter.id,
                "chapter_index": chapter.chapter_index,
                "title": chapter.title,
                "outline": chapter.outline,
                "scenes": [s.model_dump() for s in chapter.scenes]
            },
            "characters": [
                {
                    "id": c.id,
                    "name": c.name,
                    "role_type": c.role_type,
                    "voice": c.profile.voice_and_tone,
                    "motivation": c.profile.core_motivation,
                    "flaw": c.profile.fatal_flaw,
                    "current_state": active_states[c.id].model_dump() if active_states[c.id] else None
                }
                for c in characters
            ],
            "rules_summary": [f"【{r.name}】: {r.content}" for r in rules],
            "active_foreshadowings": [f.model_dump() for f in active_foreshadowings]
        }

    def save_scene_draft(
        self,
        novel_id: str,
        chapter_id: str,
        scene_index: int,
        content: str,
        agent_notes: str = "",
        created_by: str = "Agent:Writer"
    ) -> Dict[str, Any]:
        target_scene = None
        for vol in self._data["volumes"].values():
            for c in vol["chapters"]:
                if c["id"] == chapter_id:
                    for s in c["scenes"]:
                        if s["scene_index"] == scene_index:
                            s["draft_content"] = content
                            s["agent_notes"] = agent_notes
                            target_scene = s
                            c["status"] = "DRAFTED"
                            break

        if not target_scene:
            raise ValueError(f"章节 {chapter_id} 中不存在第 {scene_index} 幕场景")

        # 创建版本快照
        ver_id = f"ver-{int(datetime.utcnow().timestamp() * 1000)}"
        version = {
            "id": ver_id,
            "chapter_id": chapter_id,
            "version_number": len(self._data["versions"]) + 1,
            "full_text": content,
            "created_by": created_by,
            "change_summary": f"第 {scene_index} 幕由 {created_by} 提交草稿",
            "inspection_score": 95,
            "inspection_report": [],
            "created_at": datetime.utcnow().isoformat()
        }
        self._data["versions"].append(version)

        # 更新全书总字数
        novel = self._data["novels"].get(novel_id)
        if novel:
            novel["current_word_count"] += len(content)

        self._save()
        return {
            "version_id": ver_id,
            "scene_index": scene_index,
            "word_count": len(content),
            "status": "saved"
        }

    def get_active_foreshadowings(self, novel_id: str = "nov-001") -> List[Foreshadowing]:
        return [
            Foreshadowing(**f)
            for f in self._data["foreshadowings"].values()
            if f["novel_id"] == novel_id and f["status"] in ["PLANTED", "FERMENTING"]
        ]

    def record_foreshadowing(
        self,
        novel_id: str,
        title: str,
        clue_description: str,
        planted_chapter_id: str,
        planned_resolve_chapter_id: Optional[str] = None,
        planned_resolve_chapter_index: Optional[int] = None,
        notes: str = ""
    ) -> Foreshadowing:
        fs_id = f"fs-{int(datetime.utcnow().timestamp() * 1000)}"
        fs_data = {
            "id": fs_id,
            "novel_id": novel_id,
            "title": title,
            "clue_description": clue_description,
            "planted_chapter_id": planted_chapter_id,
            "planted_chapter_index": 12,
            "planned_resolve_chapter_id": planned_resolve_chapter_id,
            "planned_resolve_chapter_index": planned_resolve_chapter_index or 15,
            "status": "PLANTED",
            "notes": notes
        }
        self._data["foreshadowings"][fs_id] = fs_data
        self._save()
        return Foreshadowing(**fs_data)

    def get_foreshadowings(self, novel_id: str = "nov-001") -> List[Foreshadowing]:
        return [
            Foreshadowing(**to_snake_dict(f))
            for f in self._data.get("foreshadowings", {}).values()
            if f.get("novel_id") == novel_id
        ]

    def get_novel_bundle(self, novel_id: str) -> Optional[Dict[str, Any]]:
        novel_id = self.resolve_novel_id(novel_id)
        novel = self.get_novel(novel_id)
        if not novel:
            return None

        volumes = self.get_volumes(novel_id)
        # 如果新小说尚无分卷，自动初始创建第一卷第一章第一幕
        if not volumes:
            vol_id = f"vol-{int(datetime.utcnow().timestamp() * 1000)}"
            chap_id = f"chap-{int(datetime.utcnow().timestamp() * 1000)}-1"
            sc_id = f"sc-{int(datetime.utcnow().timestamp() * 1000)}-1"
            init_vol = {
                "id": vol_id,
                "novel_id": novel_id,
                "volume_index": 1,
                "title": "第一卷",
                "main_conflict": "",
                "target_climax": "",
                "chapters": [
                    {
                        "id": chap_id,
                        "volume_id": vol_id,
                        "novel_id": novel_id,
                        "chapter_index": 1,
                        "title": "第一章",
                        "outline": "",
                        "pov_character_id": "",
                        "word_count_goal": 3000,
                        "actual_word_count": 0,
                        "status": "PLANNED",
                        "scenes": [
                            {
                                "id": sc_id,
                                "chapter_id": chap_id,
                                "scene_index": 1,
                                "scene_goal": "起笔开篇",
                                "conflict": "",
                                "turn_point": "",
                                "outcome": "",
                                "involved_character_ids": [],
                                "location": "",
                                "draft_content": "",
                                "agent_notes": ""
                            }
                        ]
                    }
                ]
            }
            self._data.setdefault("volumes", {})[vol_id] = init_vol
            self._save()
            volumes = [Volume(**init_vol)]

        characters = self.get_characters(novel_id)
        char_ids = set(c.id for c in characters)
        character_states = [
            to_snake_dict(s)
            for s in self._data.get("character_states", [])
            if s.get("character_id") in char_ids
        ]
        world_settings = self.get_world_settings(novel_id)
        foreshadowings = self.get_foreshadowings(novel_id)
        character_relations = [
            to_snake_dict(r)
            for r in self._data.get("character_relations", [])
            if r.get("novel_id") == novel_id
        ]
        first_chap_id = volumes[0].chapters[0].id if volumes and volumes[0].chapters else ""

        return {
            "novel": novel.model_dump(),
            "world_settings": [w.model_dump() for w in world_settings],
            "characters": [c.model_dump() for c in characters],
            "character_states": character_states,
            "character_relations": character_relations,
            "volumes": [v.model_dump() for v in volumes],
            "foreshadowings": [f.model_dump() for f in foreshadowings],
            "versions": [],
            "active_chapter_id": first_chap_id,
            "active_scene_index": 1,
            "is_active": novel_id == self.get_active_novel_id()
        }

    def check_setting_consistency(
        self,
        novel_id: str,
        draft_text: str,
        involved_character_ids: Optional[List[str]] = None
    ) -> List[InspectionIssue]:
        novel = self.get_novel(novel_id)
        issues = []

        # 1. 战力铁律违背检测
        if "撕裂空间" in draft_text or "瞬移" in draft_text:
            issues.append(InspectionIssue(
                id="iss-power-01",
                issue_type="SETTING_VIOLATION",
                severity="CRITICAL",
                location_snippet="撕裂空间 / 瞬移",
                explanation="世界观法则严禁筑基期与金丹期撕裂空间，化神期方可半步横渡虚空。此处出现严重战力崩坏越级！",
                fix_advice="建议改为‘身形化作残影，风遁疾驰’。"
            ))

        # 2. 全书违禁词过滤
        if novel:
            for phrase in novel.style_guide.forbidden_phrases:
                if phrase in draft_text:
                    issues.append(InspectionIssue(
                        id=f"iss-phrase-{phrase}",
                        issue_type="TYPO",
                        severity="WARNING",
                        location_snippet=phrase,
                        explanation=f"命中了全书风格指南违禁词【{phrase}】，降低了作品的严谨沉浸感。",
                        fix_advice="建议删除此成语，替换为具体动作或心理刻画。"
                    ))

        # 3. 人设 OOC 检测
        if "林越" in draft_text:
            if "哈哈哈" in draft_text or "受死吧" in draft_text:
                issues.append(InspectionIssue(
                    id="iss-ooc-01",
                    issue_type="OOC",
                    severity="WARNING",
                    location_snippet="狂笑或嚣张挑衅",
                    explanation="主角林越人设为极度谨慎、隐忍坚毅、惜字如金，绝不发表无意义嚣张言论。",
                    fix_advice="修改为冷漠直接拔剑，不发一语。"
                ))

        # 4. 生理伤势矛盾检测
        lin_yue_state = self.get_latest_character_state("char-001")
        if lin_yue_state and "左肩贯穿伤" in lin_yue_state.status_tags:
            if "左手挥剑" in draft_text or "左臂发力" in draft_text:
                issues.append(InspectionIssue(
                    id="iss-wound-01",
                    issue_type="PLOT_HOLE",
                    severity="CRITICAL",
                    location_snippet="左手挥剑 / 左臂发力",
                    explanation="林越在第11章中左肩被透骨钉洞穿，真元封禁，生理上不可能用左臂正常运剑！",
                    fix_advice="修改为‘右手单手持剑，左肩鲜血渗出道袍’。"
                ))

        return issues

    def save_polish_techniques(
        self,
        novel_id: str,
        techniques: List[Dict[str, Any]],
        chapter_id: Optional[str] = None
    ) -> List[PolishTechnique]:
        """将采纳的文风润色技巧写入数据库，累计复用频次与典型例句"""
        with self._lock:
            if "polish_techniques" not in self._data:
                self._data["polish_techniques"] = {}
            
            saved: List[PolishTechnique] = []
            for tech_item in techniques:
                tech = tech_item.model_dump() if hasattr(tech_item, "model_dump") else dict(tech_item)
                tech_name = tech.get("name", "未命名技巧").strip()
                if not tech_name:
                    continue
                
                # 按名称和作品查找是否已沉淀同名技巧
                existing_key = None
                for t_id, t_val in self._data["polish_techniques"].items():
                    if t_val.get("novel_id") == novel_id and t_val.get("name") == tech_name:
                        existing_key = t_id
                        break
                
                now_iso = datetime.utcnow().isoformat()
                if existing_key:
                    t_val = self._data["polish_techniques"][existing_key]
                    t_val["applied_count"] = t_val.get("applied_count", 1) + 1
                    t_val["updated_at"] = now_iso
                    if tech.get("description"):
                        t_val["description"] = tech["description"]
                    if tech.get("before_snippet"):
                        t_val["before_snippet"] = tech["before_snippet"]
                    if tech.get("after_snippet"):
                        t_val["after_snippet"] = tech["after_snippet"]
                    if tech.get("category"):
                        t_val["category"] = tech["category"]
                    if tech.get("category_label"):
                        t_val["category_label"] = tech["category_label"]
                    if chapter_id:
                        t_val["chapter_id"] = chapter_id
                    saved.append(PolishTechnique(**t_val))
                else:
                    t_id = tech.get("id") or f"tech-{int(datetime.utcnow().timestamp() * 1000)}-{len(saved)}"
                    tech_data = {
                        "id": t_id,
                        "novel_id": novel_id,
                        "chapter_id": chapter_id or tech.get("chapter_id"),
                        "name": tech_name,
                        "category": tech.get("category", "PACING"),
                        "category_label": tech.get("category_label", "节奏张力"),
                        "description": tech.get("description", ""),
                        "before_snippet": tech.get("before_snippet", ""),
                        "after_snippet": tech.get("after_snippet", ""),
                        "applicable_scene": tech.get("applicable_scene", ""),
                        "applied_count": tech.get("applied_count", 1),
                        "created_at": tech.get("created_at", now_iso),
                        "updated_at": now_iso,
                    }
                    self._data["polish_techniques"][t_id] = tech_data
                    saved.append(PolishTechnique(**tech_data))
            
            self._save()
            return saved

    def get_polish_techniques(self, novel_id: str) -> List[PolishTechnique]:
        """获取全书沉淀的所有润色技巧，按复用频次倒序排列"""
        with self._lock:
            techs = [
                PolishTechnique(**t) for t in self._data.get("polish_techniques", {}).values()
                if t.get("novel_id") == novel_id
            ]
            techs.sort(key=lambda x: x.applied_count, reverse=True)
            return techs

    def get_polish_techniques_stats(self, novel_id: str) -> Dict[str, Any]:
        """统计全书润色技巧资产分布与Top高频技法"""
        techs = self.get_polish_techniques(novel_id)
        total_applied = sum(t.applied_count for t in techs)
        category_dist: Dict[str, int] = {}
        for t in techs:
            cat = t.category_label or "其他"
            category_dist[cat] = category_dist.get(cat, 0) + 1
        
        return {
            "total_techniques": len(techs),
            "total_applied_count": total_applied,
            "category_distribution": category_dist,
            "top_techniques": [t.model_dump() for t in techs[:5]],
        }

