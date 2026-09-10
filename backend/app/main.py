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
)
from .storage import NovelRepository

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

@app.get("/api/health")
def health_check():
    db_status = repo.get_database_status()
    return {
        "status": "ok",
        "service": "NovManager API",
        "version": "1.0.0",
        "database": db_status
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
                raise HTTPException(status_code=resp.status_code, detail=resp.text)
            return resp.json()
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

