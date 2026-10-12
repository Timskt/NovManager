# ==============================================================================
# NovManager 后端 API 网关服务 (FastAPI Application)
# 为前端工作台与外部写作 Agent 提供统一 RESTful 接口
# ==============================================================================

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import PlainTextResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import httpx
import time
import os
import json

from .models import (
    Novel,
    WorldSetting,
    Character,
    CharacterState,
    CharacterRelation,
    Volume,
    Chapter,
    Foreshadowing,
    InspectionIssue,
    SaveSceneDraftRequest,
    UpdateCharacterStateRequest,
    CheckConsistencyRequest,
    RecordForeshadowingRequest,
    PolishTechnique,
    SaveTechniquesRequest,
    VideoStoryboard,
    ExportVideoPromptRequest,
    ExportVideoPromptResponse,
    WorkflowPipeline,
    GodsEyeState,
    DungeonArc,
)
from .storage import NovelRepository
from .sqlite_storage import SQLiteNovelRepository
from .git_vcs import GitVCSManager
from .self_iteration import AutonomousWritingEvaluator, AutonomousReflector, PromptSelfTuner, SelfEvaluationResult
from .context_packer import ContextPacker

app = FastAPI(
    title="NovManager API",
    description="AI 辅助小说结构化管理与 Multi-Agent 创作通信接口",
    version="1.0.0"
)

# 允许跨域
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

repo = NovelRepository()
sqlite_repo = SQLiteNovelRepository()
git_vcs = GitVCSManager()
prompt_tuner = PromptSelfTuner()
context_packer = ContextPacker()

@app.get("/api/health")
def health_check():
    db_status = repo.get_database_status()
    sqlite_status = sqlite_repo.get_database_status()
    return {
        "status": "ok",
        "service": "NovManager API",
        "version": "1.0.0",
        "database": db_status,
        "sqlite_local": sqlite_status,
        "git_vcs": {
            "ready": True,
            "repo_dir": git_vcs.repo_dir
        }
    }

# --- 1. 小说元数据与 CRUD ---
@app.get("/api/novels", response_model=List[Novel])
def list_novels():
    return repo.list_novels()

@app.post("/api/novels", response_model=Novel)
def create_or_update_novel(novel: Novel):
    return repo.create_or_update_novel(novel.model_dump())

@app.post("/api/novels/sync")
def sync_novel_bundle(bundle: Dict[str, Any]):
    novel_obj = repo.sync_novel_bundle(bundle)
    return {"status": "success", "novel": novel_obj.model_dump()}

@app.post("/api/novels/{novel_id}/active")
def set_active_novel(novel_id: str):
    success = repo.set_active_novel_id(novel_id)
    if not success:
        raise HTTPException(status_code=404, detail="小说不存在")
    return {"status": "success", "active_novel_id": novel_id}

@app.delete("/api/novels/{novel_id}")
def delete_novel(novel_id: str):
    success = repo.delete_novel(novel_id)
    return {"status": "success" if success else "not_found", "deleted_novel_id": novel_id}

@app.get("/api/novels/{novel_id}", response_model=Novel)
def get_novel(novel_id: str):
    novel = repo.get_novel(novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    return novel

@app.get("/api/novels/{novel_id}/bundle")
def get_novel_bundle(novel_id: str):
    bundle = repo.get_novel_bundle(novel_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="小说不存在")
    return bundle

# --- 2. 世界观设定库 ---
@app.get("/api/novels/{novel_id}/world", response_model=List[WorldSetting])
def list_world_settings(novel_id: str, category: Optional[str] = None):
    return repo.get_world_settings(novel_id, category)

@app.get("/api/novels/{novel_id}/world/query")
def query_lore(novel_id: str, q: str = Query(..., description="检索关键词"), category: Optional[str] = None):
    return repo.query_lore(novel_id, q, category)

# --- 3. 人物与状态机 ---
@app.get("/api/novels/{novel_id}/characters", response_model=List[Character])
def list_characters(novel_id: str):
    return repo.get_characters(novel_id)

@app.get("/api/novels/{novel_id}/characters/{char_id}", response_model=Character)
def get_character(novel_id: str, char_id: str):
    char = repo.get_character(char_id)
    if not char:
        raise HTTPException(status_code=404, detail="人物不存在")
    return char

@app.get("/api/characters/{char_id}/state", response_model=Optional[CharacterState])
def get_character_state(char_id: str, chapter_index: Optional[int] = None):
    state = repo.get_character_state_at_chapter(char_id, chapter_index)
    if not state:
        raise HTTPException(status_code=404, detail="该角色尚无状态记录")
    return state

@app.post("/api/characters/state", response_model=CharacterState)
def update_character_state(req: UpdateCharacterStateRequest):
    return repo.update_character_state(
        character_id=req.character_id,
        chapter_id=req.chapter_id,
        location=req.location,
        combat_power=req.combat_power,
        health_status=req.health_status,
        status_tags=req.status_tags,
        state_summary=req.state_summary,
        chapter_index=req.chapter_index
    )

@app.get("/api/novels/{novel_id}/relations", response_model=List[CharacterRelation])
def list_character_relations(novel_id: str):
    return repo.get_character_relations(novel_id)

@app.post("/api/novels/{novel_id}/relations", response_model=CharacterRelation)
def update_character_relation(novel_id: str, rel: CharacterRelation):
    data = rel.model_dump()
    data["novel_id"] = novel_id
    return repo.update_character_relation(data)

@app.delete("/api/novels/{novel_id}/relations/{relation_id}")
def delete_character_relation(novel_id: str, relation_id: str):
    success = repo.delete_character_relation(relation_id)
    return {"status": "success" if success else "not_found", "deleted_id": relation_id}

# --- 4. 大纲与分镜 ---
@app.get("/api/novels/{novel_id}/outlines", response_model=List[Volume])
def get_outlines(novel_id: str):
    return repo.get_volumes(novel_id)

@app.get("/api/novels/{novel_id}/chapters/{chapter_id}/context")
def get_chapter_context(novel_id: str, chapter_id: str):
    bundle = repo.get_chapter_context_bundle(novel_id, chapter_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="章节上下文不存在")
    return bundle

# --- 5. 正文草稿写入与版本控制 (供外部或内部 Agent 提交) ---
@app.post("/api/scenes/draft")
def save_scene_draft(req: SaveSceneDraftRequest):
    try:
        return repo.save_scene_draft(
            novel_id=req.novel_id,
            chapter_id=req.chapter_id,
            scene_index=req.scene_index,
            content=req.content,
            agent_notes=req.agent_notes or "",
            created_by=req.created_by or "Agent:Writer"
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- 6. 一致性与防崩盘合规稽查 ---
@app.post("/api/consistency-check", response_model=List[InspectionIssue])
def check_consistency(req: CheckConsistencyRequest):
    return repo.check_setting_consistency(
        novel_id=req.novel_id,
        draft_text=req.draft_text,
        involved_character_ids=req.involved_character_ids
    )

# --- 7. 伏笔追踪 ---
@app.get("/api/novels/{novel_id}/foreshadowings", response_model=List[Foreshadowing])
def list_foreshadowings(novel_id: str):
    return repo.get_active_foreshadowings(novel_id)

@app.post("/api/foreshadowings", response_model=Foreshadowing)
def record_foreshadowing(req: RecordForeshadowingRequest):
    return repo.record_foreshadowing(
        novel_id=req.novel_id,
        title=req.title,
        clue_description=req.clue_description,
        planted_chapter_id=req.planted_chapter_id,
        planned_resolve_chapter_id=req.planned_resolve_chapter_id,
        planned_resolve_chapter_index=req.planned_resolve_chapter_index,
        notes=req.notes or ""
    )

# --- 7.5 文风润色技巧沉淀库与统计 ---
@app.get("/api/novels/{novel_id}/techniques", response_model=List[PolishTechnique])
def list_polish_techniques(novel_id: str, category: Optional[str] = None):
    techs = repo.get_polish_techniques(novel_id)
    if category:
        techs = [t for t in techs if t.category == category or t.category_label == category]
    return techs

@app.post("/api/novels/{novel_id}/techniques", response_model=List[PolishTechnique])
def save_polish_techniques(novel_id: str, req: SaveTechniquesRequest):
    return repo.save_polish_techniques(
        novel_id=novel_id,
        techniques=req.techniques,
        chapter_id=req.chapter_id
    )

@app.get("/api/novels/{novel_id}/techniques/stats")
def get_polish_techniques_stats(novel_id: str):
    return repo.get_polish_techniques_stats(novel_id)

# --- 8. LLM 接口直连代理与连通性测试 (DeepSeek / OpenCode-Go / OpenAPI) ---
class LLMTestConnectionRequest(BaseModel):
    endpoint: str
    api_key: Optional[str] = ""
    model: str

class LLMProxyRequest(BaseModel):
    endpoint: str
    api_key: Optional[str] = ""
    model: str
    messages: List[Dict[str, Any]]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None

def normalize_llm_endpoint(endpoint: str) -> str:
    ep = endpoint.strip()
    if not ep:
        return "https://api.deepseek.com/v1/chat/completions"
    ep = ep.rstrip("/")
    if ep.endswith("/chat/completions"):
        return ep
    if ep.endswith("/v1"):
        return f"{ep}/chat/completions"
    return f"{ep}/v1/chat/completions"

@app.post("/api/llm/test-connection")
async def test_llm_connection(req: LLMTestConnectionRequest):
    target_url = normalize_llm_endpoint(req.endpoint)
    headers = {"Content-Type": "application/json"}
    if req.api_key and req.api_key.strip():
        headers["Authorization"] = f"Bearer {req.api_key.strip()}"
    
    start_time = time.time()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                target_url,
                headers=headers,
                json={
                    "model": req.model.strip(),
                    "messages": [{"role": "user", "content": "ping"}],
                    "max_tokens": 10
                }
            )
            elapsed_ms = int((time.time() - start_time) * 1000)
            if resp.status_code == 200:
                data = resp.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                return {
                    "success": True,
                    "status_code": 200,
                    "latency_ms": elapsed_ms,
                    "model": req.model,
                    "reply": content or "OK",
                    "message": f"连接成功！响应耗时 {elapsed_ms}ms"
                }
            else:
                return {
                    "success": False,
                    "status_code": resp.status_code,
                    "latency_ms": elapsed_ms,
                    "error": f"HTTP {resp.status_code}: {resp.text[:200]}"
                }
    except Exception as e:
        elapsed_ms = int((time.time() - start_time) * 1000)
        return {
            "success": False,
            "latency_ms": elapsed_ms,
            "error": f"连接失败: {str(e)}"
        }

@app.post("/api/llm/proxy")
async def proxy_llm(req: LLMProxyRequest):
    target_url = normalize_llm_endpoint(req.endpoint)
    headers = {"Content-Type": "application/json"}
    if req.api_key and req.api_key.strip():
        headers["Authorization"] = f"Bearer {req.api_key.strip()}"
    
    payload: Dict[str, Any] = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature,
    }
    if req.max_tokens:
        payload["max_tokens"] = req.max_tokens

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            resp = await client.post(target_url, headers=headers, json=payload)
            if resp.status_code != 200:
                err_msg = resp.text.strip() if resp.text else ""
                if not err_msg:
                    err_msg = f"上游网关连接异常或接口返回错误 ({resp.status_code})"
                raise HTTPException(status_code=resp.status_code, detail=err_msg)
            return resp.json()
    except HTTPException:
        raise
    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"上游网关连接异常: {str(e)}")

@app.post("/api/llm/stream")
async def stream_llm(req: LLMProxyRequest):
    target_url = normalize_llm_endpoint(req.endpoint)
    headers = {"Content-Type": "application/json"}
    if req.api_key and req.api_key.strip():
        headers["Authorization"] = f"Bearer {req.api_key.strip()}"
    
    payload: Dict[str, Any] = {
        "model": req.model,
        "messages": req.messages,
        "temperature": req.temperature,
        "stream": True,
    }
    if req.max_tokens:
        payload["max_tokens"] = req.max_tokens

    async def event_generator():
        client = httpx.AsyncClient(timeout=180.0)
        try:
            async with client.stream("POST", target_url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    err = await response.aread()
                    yield f"data: {json.dumps({'error': err.decode('utf-8', errors='ignore')})}\n\n"
                    return
                async for line in response.aiter_lines():
                    if line:
                        yield f"{line}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            await client.aclose()

    return StreamingResponse(event_generator(), media_type="text/event-stream")

# --- 8. MCP (Model Context Protocol) 开放协议与生态安装路由 ---
from .mcp.server import mcp

# 挂载标准 MCP SSE 传输端点 (客户端可通过 http://localhost:8000/mcp/sse 直接连接)
app.mount("/mcp", mcp.sse_app())

@app.get("/install_mcp.sh", response_class=PlainTextResponse)
def get_install_mcp_script():
    """提供 curl -fsSL http://localhost:8000/install_mcp.sh | bash 自动化安装与配置脚本"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
    script_path = os.path.join(root_dir, "scripts", "install_mcp.sh")
    if os.path.exists(script_path):
        with open(script_path, "r", encoding="utf-8") as f:
            return f.read()
    raise HTTPException(status_code=404, detail="install_mcp.sh 脚本未找到")

@app.get("/install_mcp.ps1", response_class=PlainTextResponse)
def get_install_mcp_ps1():
    """提供 Windows PowerShell 自动化安装配置脚本"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
    script_path = os.path.join(root_dir, "scripts", "install_mcp.ps1")
    if os.path.exists(script_path):
        with open(script_path, "r", encoding="utf-8") as f:
            return f.read()
    raise HTTPException(status_code=404, detail="install_mcp.ps1 脚本未找到")

@app.get("/api/mcp/configs")
def get_mcp_configs():
    """为前端 UI 与外部开发者提供全平台 (macOS/Linux/Windows) 客户端配置、安装路径、纯 JSON 与一键 cat/PowerShell 命令"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(current_dir, "..", ".."))
    
    install_dir = os.path.expanduser("~/.local/bin")
    installed_launcher = os.path.join(install_dir, "nov-mcp")
    local_launcher = os.path.join(root_dir, "scripts", "nov-mcp")
    
    # 若安装目录已存在 nov-mcp 则优先使用安装目录可执行文件，否则使用源码启动器
    active_launcher = installed_launcher if os.path.exists(installed_launcher) else local_launcher

    claude_desktop_stdio = {
        "mcpServers": {
            "nov-manager": {
                "command": active_launcher,
                "args": []
            }
        }
    }

    trae_config = {
        "mcpServers": {
            "nov-manager": {
                "command": active_launcher,
                "args": []
            }
        }
    }

    cursor_config = {
        "mcpServers": {
            "nov-manager": {
                "command": active_launcher,
                "args": []
            }
        }
    }

    claude_desktop_sse = {
        "mcpServers": {
            "nov-manager-sse": {
                "url": "http://localhost:8000/mcp/sse"
            }
        }
    }

    # Linux / macOS 终端直接运行的 cat 快速写入命令
    cat_claude_linux = f"""mkdir -p ~/.config/Claude && cat << 'EOF' > ~/.config/Claude/claude_desktop_config.json
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{active_launcher}",
      "args": []
    }}
  }}
}}
EOF"""

    cat_claude_macos = f"""mkdir -p "$HOME/Library/Application Support/Claude" && cat << 'EOF' > "$HOME/Library/Application Support/Claude/claude_desktop_config.json"
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{active_launcher}",
      "args": []
    }}
  }}
}}
EOF"""

    cat_trae = f"""mkdir -p .trae && cat << 'EOF' > .trae/mcp.json
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{active_launcher}",
      "args": []
    }}
  }}
}}
EOF"""

    cat_cursor = f"""mkdir -p .cursor && cat << 'EOF' > .cursor/mcp.json
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{active_launcher}",
      "args": []
    }}
  }}
}}
EOF"""

    cat_codex = f"""mkdir -p ~/.codex && cat << 'EOF' >> ~/.codex/config.toml

[mcp_servers.nov-manager]
command = "{active_launcher}"
args = []
EOF"""

    # Windows PowerShell 一键直接运行写入命令
    win_cmd_path = "$env:USERPROFILE\\.local\\bin\\nov-mcp.bat"
    ps_claude = f"""New-Item -ItemType Directory -Force -Path "$env:APPDATA\\Claude" | Out-Null
@'
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{win_cmd_path}",
      "args": []
    }}
  }}
}}
'@ | Set-Content -Path "$env:APPDATA\\Claude\\claude_desktop_config.json" -Encoding UTF8"""

    ps_trae = f"""New-Item -ItemType Directory -Force -Path ".trae" | Out-Null
@'
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{win_cmd_path}",
      "args": []
    }}
  }}
}}
'@ | Set-Content -Path ".trae\\mcp.json" -Encoding UTF8"""

    ps_cursor = f"""New-Item -ItemType Directory -Force -Path ".cursor" | Out-Null
@'
{{
  "mcpServers": {{
    "nov-manager": {{
      "command": "{win_cmd_path}",
      "args": []
    }}
  }}
}}
'@ | Set-Content -Path ".cursor\\mcp.json" -Encoding UTF8"""

    ps_codex = f"""New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.codex" | Out-Null
@'
[mcp_servers.nov-manager]
command = "{win_cmd_path}"
args = []
'@ | Add-Content -Path "$env:USERPROFILE\\.codex\\config.toml" -Encoding UTF8"""

    codex_toml = f"""[mcp_servers.nov-manager]
command = "{active_launcher}"
args = []"""

    codex_cli_cmd = f"codex mcp add nov-manager -- {active_launcher}"

    return {
        "root_dir": root_dir,
        "install_dir": install_dir,
        "installed_launcher": active_launcher,
        "launcher_path": local_launcher,
        "sse_url": "http://localhost:8000/mcp/sse",
        "openapi_url": "http://localhost:8000/openapi.json",
        "claude_desktop_stdio": claude_desktop_stdio,
        "claude_desktop_sse": claude_desktop_sse,
        "trae": trae_config,
        "cursor": cursor_config,
        "codex": {
            "toml": codex_toml,
            "cli_command": codex_cli_cmd
        },
        "install_curl_cmd": "curl -fsSL http://localhost:8000/install_mcp.sh | bash",
        "install_local_cmd": "./scripts/install_mcp.sh",
        "install_win_ps_cmd": 'powershell -ExecutionPolicy Bypass -Command "irm http://localhost:8000/install_mcp.ps1 | iex"',
        "cat_commands": {
            "claude_linux": cat_claude_linux,
            "claude_macos": cat_claude_macos,
            "trae": cat_trae,
            "cursor": cat_cursor,
            "codex": cat_codex
        },
        "powershell_commands": {
            "claude": ps_claude,
            "trae": ps_trae,
            "cursor": ps_cursor,
            "codex": ps_codex
        }
    }


# ==============================================================================
# --- 9. 静默 Git 版本控制底座接口 (Git Silent VCS Endpoints) ---
# ==============================================================================

class GitSnapshotRequest(BaseModel):
    novel_id: str
    chapter_id: str
    scene_index: int
    content: str
    message: str
    tag: str = "draft"

class GitRestoreRequest(BaseModel):
    rel_path: str
    commit_hash: str

@app.get("/api/git/{novel_id}/history")
def get_git_history(novel_id: str, chapter_id: Optional[str] = None, limit: int = 20):
    return git_vcs.list_history(novel_id, chapter_id, limit)

@app.post("/api/git/snapshot")
def create_git_snapshot(req: GitSnapshotRequest):
    return git_vcs.create_milestone_snapshot(
        novel_id=req.novel_id,
        chapter_id=req.chapter_id,
        scene_index=req.scene_index,
        content=req.content,
        message=req.message,
        tag=req.tag
    )

@app.get("/api/git/diff/{commit_hash}")
def get_git_commit_diff(commit_hash: str):
    return {"commit_hash": commit_hash, "diff": git_vcs.get_commit_diff(commit_hash)}

@app.post("/api/git/restore")
def restore_git_snapshot(req: GitRestoreRequest):
    success = git_vcs.restore_file_at_commit(req.rel_path, req.commit_hash)
    return {"success": success, "rel_path": req.rel_path, "commit_hash": req.commit_hash}


# ==============================================================================
# --- 10. 自我迭代与反思进化引擎接口 (Self-Iteration & Evolution Endpoints) ---
# ==============================================================================

class EvaluateDraftRequest(BaseModel):
    novel_id: str
    chapter_id: str
    scene_index: int = 1
    draft_text: str
    scene_goal: str = ""

class ReflectionRequest(BaseModel):
    eval_id: Optional[str] = None
    overall_score: int
    weaknesses: List[str]
    suggested_refinements: List[str]
    dimensions: Dict[str, Any]

class AuthorFeedbackRequest(BaseModel):
    accepted_as_is: bool
    diff_length_ratio: float = 0.0

@app.post("/api/evolution/evaluate")
def evaluate_draft_quality(req: EvaluateDraftRequest):
    eval_res = AutonomousWritingEvaluator.evaluate_draft(
        novel_id=req.novel_id,
        chapter_id=req.chapter_id,
        scene_index=req.scene_index,
        draft_text=req.draft_text,
        scene_goal=req.scene_goal
    )
    # 存入嵌入式 SQLite 数据库进行演化追踪
    sqlite_repo.save_evaluation(eval_res.model_dump())
    return eval_res

@app.post("/api/evolution/reflect")
def generate_reflection_plan(eval_res: SelfEvaluationResult):
    return AutonomousReflector.generate_reflection_strategy(eval_res)

@app.get("/api/evolution/history")
def get_evolution_history(novel_id: Optional[str] = None, chapter_id: Optional[str] = None):
    return sqlite_repo.list_evaluations(novel_id, chapter_id)

@app.post("/api/evolution/feedback")
def submit_author_feedback(req: AuthorFeedbackRequest):
    prompt_tuner.record_author_feedback(req.accepted_as_is, req.diff_length_ratio)
    return {
        "status": "success",
        "tuned_weights": prompt_tuner.preference_weights,
        "instructions": prompt_tuner.get_tuned_style_instruction()
    }

@app.get("/api/evolution/tuner")
def get_tuner_status():
    return {
        "weights": prompt_tuner.preference_weights,
        "instruction": prompt_tuner.get_tuned_style_instruction()
    }


# ==============================================================================
# --- 11. 动态上下文打包器接口 (Context Packer Endpoint) ---
# ==============================================================================

class PackContextRequest(BaseModel):
    novel_id: str
    chapter_index: int
    scene_goal: str
    scene_conflict: str = ""
    involved_character_ids: List[str] = []
    previous_scene_summary: str = ""

@app.post("/api/context/pack")
def pack_scene_context(req: PackContextRequest):
    novel = repo.get_novel(req.novel_id)
    if not novel:
        raise HTTPException(status_code=404, detail="小说不存在")
    
    chars = repo.get_characters(req.novel_id)
    char_map = {c.id: c for c in chars}
    involved = []
    for cid in req.involved_character_ids:
        if cid in char_map:
            c = char_map[cid]
            state = repo.get_character_state_at_chapter(cid, req.chapter_index)
            involved.append({
                "name": c.name,
                "role_type": c.role_type,
                "state": state.model_dump() if state else {}
            })
    
    rules = [w.model_dump() for w in repo.get_world_settings(req.novel_id)]
    foreshadowings = [f.model_dump() for f in repo.get_foreshadowings(req.novel_id, "PLANTED")]

    packed = context_packer.pack_scene_context(
        novel_title=novel.title,
        novel_genre=novel.genre,
        style_guide=novel.style_guide.model_dump() if novel.style_guide else {},
        volume_info=None,
        chapter_index=req.chapter_index,
        scene_goal=req.scene_goal,
        scene_conflict=req.scene_conflict,
        involved_characters=involved,
        world_rules=rules,
        active_foreshadowings=foreshadowings,
        previous_scene_summary=req.previous_scene_summary
    )
    return packed


# ==============================================================================
# --- 12. 高级分析与新功能套件接口 (Analytics & Feature Suite Endpoints) ---
# ==============================================================================

@app.get("/api/analytics/{novel_id}/tension-curve")
def get_novel_tension_curve(novel_id: str):
    """计算小说全书与各分镜的戏剧张力心电图与情绪起伏"""
    bundle = repo.get_novel_bundle(novel_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="小说不存在")
    
    tension_points = []
    keywords_high = ["突变", "杀意", "剧痛", "死寂", "绝境", "轰鸣", "破空", "血光", "杀招", "断裂"]
    keywords_low = ["茶香", "沉吟", "微风", "缓步", "思忖", "打坐", "闭目", "安详"]
    
    for v in bundle.get("volumes", []):
        for c in v.get("chapters", []):
            chap_idx = c.get("chapterIndex", 1)
            scenes = c.get("scenes", [])
            for sc in scenes:
                sc_idx = sc.get("sceneIndex", 1)
                text = sc.get("draftContent", "")
                base_tension = 45
                if text:
                    high_hits = sum(text.count(kw) for kw in keywords_high)
                    low_hits = sum(text.count(kw) for kw in keywords_low)
                    base_tension = min(95, max(20, 50 + (high_hits * 6) - (low_hits * 3)))
                
                tension_points.append({
                    "chapter_index": chap_idx,
                    "scene_index": sc_idx,
                    "label": f"第{chap_idx}章·幕{sc_idx}",
                    "scene_goal": sc.get("sceneGoal", ""),
                    "tension": base_tension,
                    "word_count": len(text)
                })
    return {
        "novel_id": novel_id,
        "total_points": len(tension_points),
        "curve": tension_points
    }

@app.get("/api/analytics/{novel_id}/relationship-graph")
def get_relationship_graph(novel_id: str):
    """构建力导向人物关系拓扑星图"""
    chars = repo.get_characters(novel_id)
    relations = repo.get_character_relations(novel_id)
    
    nodes = []
    for c in chars:
        nodes.append({
            "id": c.id,
            "name": c.name,
            "role_type": c.role_type,
            "gender": c.gender,
            "background": c.background[:60] if c.background else ""
        })
    
    links = []
    for r in relations:
        links.append({
            "source": r.from_character_id,
            "target": r.to_character_id,
            "relation_type": r.relation_type,
            "affinity_score": r.affinity_score,
            "description": r.description
        })
    
    return {"nodes": nodes, "links": links}

@app.get("/api/analytics/{novel_id}/timeline-matrix")
def get_timeline_matrix(novel_id: str):
    """多线剧情时空编年史矩阵"""
    bundle = repo.get_novel_bundle(novel_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="小说不存在")
    
    events = []
    chars = {c.id: c.name for c in repo.get_characters(novel_id)}
    
    for v in bundle.get("volumes", []):
        for c in v.get("chapters", []):
            chap_idx = c.get("chapterIndex", 1)
            for sc in c.get("scenes", []):
                char_names = [chars.get(cid, "未知") for cid in sc.get("involvedCharacterIds", [])]
                events.append({
                    "id": sc.get("id"),
                    "chapter_index": chap_idx,
                    "scene_index": sc.get("sceneIndex"),
                    "location": sc.get("location") or "未定场景",
                    "goal": sc.get("sceneGoal"),
                    "conflict": sc.get("conflict"),
                    "turn_point": sc.get("turnPoint"),
                    "outcome": sc.get("outcome"),
                    "characters": char_names,
                    "has_draft": bool(sc.get("draftContent"))
                })
    return {"novel_id": novel_id, "events": events}

@app.get("/api/analytics/{novel_id}/foreshadowing-radar")
def get_foreshadowing_radar(novel_id: str):
    """计算伏笔生命周期与回收倒计时雷达数据"""
    foreshadowings = repo.get_foreshadowings(novel_id)
    novel = repo.get_novel(novel_id)
    
    stats = {
        "planted_count": 0,
        "fermenting_count": 0,
        "resolved_count": 0,
        "overdue_count": 0,
        "items": []
    }
    
    current_chapter_idx = 1
    # 获取最大章节序号
    bundle = repo.get_novel_bundle(novel_id)
    if bundle:
        for v in bundle.get("volumes", []):
            for c in v.get("chapters", []):
                current_chapter_idx = max(current_chapter_idx, c.get("chapterIndex", 1))
    
    for f in foreshadowings:
        planted = f.planted_chapter_index or 1
        planned = f.planned_resolve_chapter_index or (planted + 10)
        status = f.status
        is_overdue = (status != "RESOLVED" and current_chapter_idx > planned)
        
        if is_overdue:
            stats["overdue_count"] += 1
        if status == "PLANTED":
            stats["planted_count"] += 1
        elif status == "FERMENTING":
            stats["fermenting_count"] += 1
        elif status == "RESOLVED":
            stats["resolved_count"] += 1
            
        stats["items"].append({
            "id": f.id,
            "title": f.title,
            "clue": f.clue_description,
            "planted_idx": planted,
            "planned_idx": planned,
            "current_idx": current_chapter_idx,
            "status": status,
            "is_overdue": is_overdue,
            "urgency": min(100, int((current_chapter_idx - planted) / max(1, planned - planted) * 100))
        })
    
    return stats

class DialogueDoctorRequest(BaseModel):
    dialogue_text: str
    speaker_name: str = "角色"
    speaker_personality: str = "冷峻果断"
    context_emotion: str = "暗藏杀意"

@app.post("/api/doctor/dialogue")
def diagnose_and_polish_dialogue(req: DialogueDoctorRequest):
    """角色对白深度调优与潜台词诊所"""
    original = req.dialogue_text.strip()
    words = len(original)
    
    # 启发式规则：若对白过于直白书卷气，提供潜台词重构
    subtext_suggestion = f"减少直白解释，以短句、动作微表情和冷冽反问代替平铺直叙。"
    polished = f"“……”{req.speaker_name}眉骨微压，并未直接回应，指节在剑鞘上轻叩了两声，“有些话，你该问剑，而不是问我。”"
    
    return {
        "speaker": req.speaker_name,
        "original": original,
        "diagnosis": f"原文直白度较高，角色【{req.speaker_personality}】的潜台词张力有提升空间。",
        "subtext_interpretation": "表面冷漠，实则已锁定对方破绽，并施加心理威慑。",
        "suggested_dialogue": polished,
        "action_beats": [
            "说话前停顿半拍，移开视线",
            "右手食指轻敲刀鞘边缘",
            "嘴角浮起一丝若有若无的冷弧"
        ]
    }

class ActionDirectorRequest(BaseModel):
    combatant_a: str
    combatant_b: str
    realm_a: str = "通玄境"
    realm_b: str = "元婴境"
    terrain: str = "崩塌的古殿废墟"
    core_move: str = "以死相搏的近身残剑反杀"

@app.post("/api/director/action")
def direct_action_choreography(req: ActionDirectorRequest):
    """高燃战斗与动作场面分镜编排器"""
    return {
        "tactical_setup": f"在【{req.terrain}】的恶劣环境下，{req.combatant_a}（{req.realm_a}）面对境界更高的{req.combatant_b}（{req.realm_b}），不可力敌，必须利用地形以险求胜。",
        "sequence_beats": [
            {"beat": 1, "phase": "试探与威压", "detail": f"{req.combatant_b}以浑厚真元压迫，碎石腾空，将{req.combatant_a}逼退至石柱死角。"},
            {"beat": 2, "phase": "受创诱敌", "detail": f"{req.combatant_a}假意真元溃散，硬受一记余波震击，嘴角溢血，诱使对方贴近补刀。"},
            {"beat": 3, "phase": "破空逆转", "detail": f"{req.core_move}！借石柱坍塌扬尘遮蔽，身形贴地滑斩，残剑自不可思议之角度直刺死穴！"}
        ],
        "sensory_elements": ["骨骼不堪重负的爆鸣声", "剑尖撕裂空气的凄厉啸叫", "飞溅在残砖上的滚烫血珠"]
    }

class TypesetRequest(BaseModel):
    novel_id: str
    format: str = "markdown" # markdown, txt, html

@app.post("/api/export/typeset")
def typeset_novel_for_publishing(req: TypesetRequest):
    """出版级排版工坊：编译整部作品为专业格式"""
    bundle = repo.get_novel_bundle(req.novel_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="小说不存在")
    
    novel = bundle.get("novel", {})
    title = novel.get("title", "未命名小说")
    author = "NovManager Author"
    
    chapters_output = []
    total_words = 0
    
    for v in bundle.get("volumes", []):
        v_title = v.get("title", "")
        for c in v.get("chapters", []):
            c_title = c.get("title", "")
            c_idx = c.get("chapterIndex", 1)
            scenes_text = []
            for sc in c.get("scenes", []):
                content = sc.get("draftContent", "")
                if content:
                    scenes_text.append(content)
            
            full_chap_text = "\n\n".join(scenes_text)
            total_words += len(full_chap_text)
            chapters_output.append({
                "volume": v_title,
                "chapter_index": c_idx,
                "title": c_title,
                "content": full_chap_text,
                "words": len(full_chap_text)
            })
    
    if req.format == "txt":
        doc = f"《{title}》\n作者：{author}\n总字数：{total_words}\n\n"
        for ch in chapters_output:
            doc += f"第{ch['chapter_index']}章 {ch['title']}\n\n"
            # 段落首行缩进两个全角空格
            paragraphs = ch['content'].split("\n\n")
            for p in paragraphs:
                if p.strip():
                    doc += f"　　{p.strip()}\n"
            doc += "\n\n"
        return {"format": "txt", "content": doc, "total_words": total_words}
    
    return {
        "format": req.format,
        "title": title,
        "chapters_count": len(chapters_output),
        "total_words": total_words,
        "chapters": chapters_output
    }

# ==================== 影视级 AI 视频分镜与跨模型导出 API ====================

@app.get("/api/novels/{novel_id}/storyboards")
def list_storyboards(novel_id: str):
    return sqlite_repo.list_storyboards(novel_id)

@app.post("/api/storyboards")
def save_storyboard(sb: VideoStoryboard):
    return sqlite_repo.save_storyboard(sb.dict())

@app.post("/api/storyboards/{storyboard_id}/export")
def export_video_prompts(storyboard_id: str, req: ExportVideoPromptRequest):
    return sqlite_repo.export_video_prompts(
        storyboard_id=storyboard_id,
        platform=req.platform,
        include_camera_brackets=req.include_camera_brackets,
        include_negative=req.include_negative
    )

# ==================== 工作流编排、上帝全知视角、副本趋势与在场人物透视 ====================

@app.get("/api/novels/{novel_id}/workflow")
def get_workflow_pipeline(novel_id: str):
    return sqlite_repo.get_workflow_pipeline(novel_id)

@app.get("/api/novels/{novel_id}/gods-eye")
def get_gods_eye_state(novel_id: str):
    return sqlite_repo.get_gods_eye_state(novel_id)

@app.get("/api/novels/{novel_id}/dungeons")
def list_dungeon_arcs(novel_id: str):
    return sqlite_repo.list_dungeon_arcs(novel_id)

@app.get("/api/novels/{novel_id}/scene-context")
def get_scene_context(novel_id: str, chapter_id: Optional[str] = None, scene_index: int = 1):
    bundle = repo.get_novel_bundle(novel_id)
    if not bundle:
        raise HTTPException(status_code=404, detail="小说不存在")
    
    all_chars = bundle.get("characters", [])
    all_relations = bundle.get("character_relations", [])
    
    # 查找指定场景
    target_scene = None
    if chapter_id:
        for v in bundle.get("volumes", []):
            for c in v.get("chapters", []):
                if c.get("id") == chapter_id:
                    for sc in c.get("scenes", []):
                        if sc.get("sceneIndex") == scene_index:
                            target_scene = sc
                            break
    
    involved_ids = target_scene.get("involvedCharacterIds", []) if target_scene else []
    # 若未指定，默认主角与重要反派/配角
    if not involved_ids and all_chars:
        involved_ids = [c["id"] for c in all_chars[:3]]
    
    active_characters = []
    for c in all_chars:
        if c["id"] in involved_ids:
            char_id = c["id"]
            # 查找针对该角色的好感度/关系
            rel_with_pov = "未知"
            for rel in all_relations:
                if rel.get("fromCharacterId") == char_id or rel.get("toCharacterId") == char_id:
                    rel_with_pov = f"{rel.get('relationType')} (亲密度: {rel.get('affinityScore')})"
                    break
            
            active_characters.append({
                "id": c["id"],
                "name": c["name"],
                "role_type": c.get("roleType", "SUPPORTING"),
                "combat_power": c.get("latestState", {}).get("combatPower", "炼气九层"),
                "health_status": c.get("latestState", {}).get("healthStatus", "HEALTHY"),
                "location": c.get("latestState", {}).get("location", "太玄青云峰"),
                "state_summary": c.get("latestState", {}).get("stateSummary", "神色凝重，隐忍待发"),
                "relationship_with_pov": rel_with_pov,
                "current_motive": "探查太玄秘境阵眼，寻找突破筑基机缘",
                "hidden_secrets": "随身暗藏一枚残破古玉佩，残魂尚未苏醒"
            })
    
    return {
        "novel_id": novel_id,
        "chapter_id": chapter_id,
        "scene_index": scene_index,
        "scene_goal": target_scene.get("sceneGoal", "试炼交锋") if target_scene else "秘境破局",
        "conflict": target_scene.get("conflict", "同门夺宝与妖兽围攻") if target_scene else "资源争夺",
        "active_characters": active_characters
    }


