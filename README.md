# NovManager - AI 辅助小说结构化管理与创作平台

![状态](https://img.shields.io/badge/状态-未定稿版本_WIP-orange) ![后端](https://img.shields.io/badge/后端-Rust_重构中-dea584?logo=rust) ![小说管理](https://img.shields.io/badge/小说管理-Git-f05032?logo=git) ![License](https://img.shields.io/badge/License-MIT-blue)

> [!WARNING]
> **本项目为未定稿版本（WIP）**，架构、数据模型与接口仍在快速迭代中，可能随时变更。

> [!NOTE]
> - 🦀 **后端正在使用 Rust 重构**，当前 Python/FastAPI 实现仅为过渡版本；
> - 🌿 **使用 Git 实现小说管理**：以 Git 为版本控制底座与唯一真相源（Source of Truth），由系统后台静默自动提交，支持分支推演、Diff 审阅与安全回滚。

> **NovManager** 是一套面向长篇网络小说、科幻文学与剧本创作的**全流程结构化管理与 Multi-Agent 协同创作系统**。
> 本平台将 App 作为唯一的**“状态与真相中枢（Single Source of Truth, SoT）”**，通过 **PostgreSQL 16 + pgvector** 作为关系与向量持久化底座，结合 **Model Context Protocol (MCP)** 和 **LangGraph** 实现了小说世界观、大纲、人物状态机与外部各类型 AI 编程/创作智能体的无缝对接。

---

## 🌟 核心特色

1. **结构化真相源 (Single Source of Truth, SoT)**
   - 拒绝传统 AI 创作的无序长文本盲目拼接。所有世界观法则、人物卡、人际关系网、卷章大纲、伏笔线索全部以生产级 **PostgreSQL 16** 关系模型及结构化模式严格纳管。
2. **长篇防崩盘向量记忆体系 (Hybrid RAG + Continuity Guard)**
   - 采用原生 **PostgreSQL + pgvector** 语义向量检索，配合三层漏斗式上下文压缩器与防吃设定断言引擎，彻底解决长篇小说“战力崩、人设崩、剧情崩”核心痛点。
3. **支持任意 Agent 对接 (MCP-First Architecture)**
   - 内置标准的 **MCP (Model Context Protocol)** 服务端，无论是外部运行的 Claude Desktop、Cursor、Cline、OpenHands，还是自定义 Agent，均可通过统一协议读取小说上下文并写入草稿与状态。
4. **专业级 Multi-Agent 协作编排 (LangGraph)**
   - 内置“世界架构师、编剧总监、分镜导演、正文执笔员、设定稽查员、文风润色师”六大专家 Agent 协同矩阵。
   - 具备**人在回路 (Human-in-the-Loop)**，在分镜规划、正文终审阶段由作者把控关键决策。
5. **Git-like 正文版本控制与 Diff 审阅**
   - 细粒度版本快照，支持段落级红绿差异高亮、智能批注、多分支剧情平行探索与安全回滚。
6. **整章沉浸阅读与分镜无缝连贯**
   - 支持按幕创作与【📖 整章通读】双重体验，自动拼接章节场景，保障长篇创作的节奏连贯性与宏观张力。

---

## 🖼️ 界面预览

**大纲分镜画布——三幕结构与分镜卡片拖拽编排**

![大纲分镜画布](docs/交互UI/截图%202026-09-05%2015-07-29.png)

**整章沉浸阅读与 AI 协同润色**

![整章协同创作](docs/交互UI/截图%202026-09-05%2020-09-55.png)

**Multi-Agent 专家流水线与执行进度追踪**

![Multi-Agent 流水线](docs/交互UI/截图%202026-09-05%2019-59-29.png)

---

## 🏗️ 架构拓扑

```
┌──────────────────────────────────────────────────────────┐
│             表现层：Web 创作工作台 (React / Tailwind)       │
└──────────────┬────────────────────────────┬──────────────┘
               │ (大纲/人物/设定/正文管理)     │ (触发协同创作)
               ▼                            ▼
┌──────────────────────────────┐   ┌──────────────────────────────┐
│       核心领域仓储与服务       │   │     内部 Multi-Agent 编排    │
│   (状态机/世界观/大纲/伏笔)   │◄──┤          (LangGraph)         │
│                              │   └──────────────┬───────────────┘
│   PostgreSQL 16 + pgvector   │                  │ (调度底层 LLM)
└──────────────┬───────────────┘                  ▼
               │ (暴露标准化只读资源与写入工具)
               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    统一接口层：MCP Server                        │
│  - Resources: novel://characters, novel://world, novel://outline│
│  - Tools: save_scene_draft(), update_character_state(), ...     │
└────────────────────────────────┬────────────────────────────────┘
                                 │ (标准 JSON-RPC 协议)
            ┌────────────────────┼────────────────────┐
            ▼                    ▼                    ▼
     [Claude Desktop]         [Cursor]        [自定义独立 Agent]
```

---

## 🗄️ PostgreSQL 生产级数据库落地与配置指南

NovManager 底层采用生产级关系数据库 **PostgreSQL 16+** 与 **pgvector** 插件构建高可靠持久化架构，同时具备与轻量本地 JSON 仓储的双向容灾同步能力。

### 1. 数据库与扩展准备

#### Linux (Ubuntu/Debian) 环境快速安装
```bash
# 1. 安装 PostgreSQL 16 及 pgvector 扩展
sudo apt update
sudo apt install -y postgresql postgresql-contrib postgresql-16-pgvector

# 2. 确认服务状态
sudo systemctl status postgresql
```

#### macOS (Homebrew)
```bash
brew install postgresql@16 pgvector
brew services start postgresql@16
```

### 2. 创建数据库、角色与扩展

以 `postgres` 超级管理员身份进入终端执行：
```bash
sudo -u postgres psql << 'EOF'
-- 创建专用业务账号
CREATE USER novadmin WITH PASSWORD 'novpassword123';
ALTER USER novadmin CREATEDB;

-- 创建业务数据库
CREATE DATABASE novmanager OWNER novadmin;

-- 连接到 novmanager 数据库并激活必要扩展
\c novmanager
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 授权 public schema 操作权限
GRANT ALL PRIVILEGES ON DATABASE novmanager TO novadmin;
GRANT ALL ON SCHEMA public TO novadmin;
EOF
```

### 3. 配置连接环境变量

在后端运行环境或 `.env` 中指定 `DATABASE_URL`：
```bash
# 标准格式：postgresql+psycopg://<用户名>:<密码>@<主机>:<端口>/<数据库名>
export DATABASE_URL="postgresql+psycopg://novadmin:novpassword123@127.0.0.1:5432/novmanager"
```

### 4. 一键执行表结构初始化与数据全量同步

运行系统内置的初始化同步脚本，自动创建 10 大核心实体数据表并将已有作品（如《太虚纪元》全 13 章、《天演寻真录》、人物状态机、世界观规则、伏笔）无缝同步入库：
```bash
PYTHONPATH=backend python3 backend/scripts/init_postgres.py
```

执行后输出示例：
```text
[INFO] 成功连接至: PostgreSQL 16.15 on x86_64-pc-linux-gnu
[INFO] pgvector 扩展就绪: 已开启 (OK)
[INFO] 正在执行 DDL 创建领域模型表结构...
[INFO] PostgreSQL 所有领域实体数据表已成功就绪！
[INFO] 检测到本地 JSON 种子库，正在同步至 PostgreSQL...
[INFO] JSON 数据到 PostgreSQL 全量同步成功！
```

### 5. 数据库健康检查探针

访问后端健康检查接口：
```bash
curl -s http://127.0.0.1:8000/api/health | jq
```
返回响应：
```json
{
  "status": "ok",
  "service": "NovManager API",
  "version": "1.0.0",
  "database": {
    "connected": true,
    "version": "PostgreSQL 16.15",
    "pgvector_enabled": true,
    "tables_initialized": true,
    "novels_count": 3
  }
}
```

---

## 💻 本地开发运行指南

### 前置要求
- **Node.js**: 18.0+（推荐 Node.js 20+）
- **pnpm**: 9.0+
- **Python**: 3.11 或 3.12
- **PostgreSQL**: 16+（附带 pgvector）

### 1. 后端服务启动

```bash
# 1. 创建并激活虚拟环境
python3 -m venv backend/.venv
source backend/.venv/bin/activate

# 2. 安装后端依赖
pip install -r backend/requirements.txt

# 3. 设置数据库环境变量并启动 FastAPI (默认端口 8000)
export DATABASE_URL="postgresql+psycopg://novadmin:novpassword123@127.0.0.1:5432/novmanager"
uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend --reload
```

### 2. 前端工作台启动

在另一个终端中启动 Web 前端：
```bash
# 根目录下直接启动
pnpm dev
# 或进入 web 目录
cd web && pnpm dev
```
打开浏览器访问：**`http://localhost:3000`**。

---

## 🚀 生产环境部署方案

针对企业级或私有服务器部署，NovManager 提供了以下三种标准的生产部署方案：

### 方案一：Docker Compose 全栈一键编排 (推荐)

仓库已内置 `docker-compose.yml`、`backend/Dockerfile` 和 `web/Dockerfile`。

1. **一键拉起全套集群（PostgreSQL 16 + pgvector + 后端 + 前端 Nginx）**：
   ```bash
   docker compose up -d --build
   ```

2. **验证服务容器健康状态**：
   ```bash
   docker compose ps
   ```

3. **端口映射说明**：
   - 前端工作台：`http://your-server-ip:3000`
   - 后端 API：`http://your-server-ip:8000`
   - PostgreSQL 数据库：`your-server-ip:5432`

---

### 方案二：Linux Systemd 守护进程部署

适用于在专用 Linux 云主机上裸机/虚拟机直接托管运行。

#### 1. 配置后端服务 `/etc/systemd/system/novmanager-backend.service`
```ini
[Unit]
Description=NovManager Backend FastAPI Service
After=network.target postgresql.service

[Service]
Type=simple
User=debug
WorkingDirectory=/home/debug/git/nov-manager
Environment="PATH=/home/debug/git/nov-manager/backend/.venv/bin"
Environment="DATABASE_URL=postgresql+psycopg://novadmin:novpassword123@127.0.0.1:5432/novmanager"
ExecStart=/home/debug/git/nov-manager/backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 2. 配置前端工作台服务 `/etc/systemd/system/novmanager-frontend.service`
```ini
[Unit]
Description=NovManager Web Frontend Service
After=network.target novmanager-backend.service

[Service]
Type=simple
User=debug
WorkingDirectory=/home/debug/git/nov-manager/web
ExecStart=/usr/bin/pnpm preview --port 3000 --host 0.0.0.0
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

#### 3. 启动并配置开机自启
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now novmanager-backend
sudo systemctl enable --now novmanager-frontend
```

---

### 方案三：Nginx 反向代理配置（支持 SSE 流式推流长连接）

若使用独立 Nginx 作为统一网关，请务必关闭 API 代理的响应缓冲以确保大模型生成正文时的 SSE 流式推流不卡顿：

```nginx
server {
    listen 80;
    server_name novel.yourdomain.com;

    # 1. 静态前端资源
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # 2. 后端 REST API 与 SSE 流式通道
    location /api/ {
        proxy_pass http://127.0.0.1:8000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;

        # 针对 Agent 实时流式起草与思考链必须禁用的代理缓冲
        proxy_buffering off;
        proxy_cache off;
        proxy_read_timeout 600s;
        proxy_send_timeout 600s;
    }
}
```

---

## 🔌 外部 Agent 接入指南 (MCP 协议)

NovManager 符合 Anthropic **Model Context Protocol (MCP)** 行业开放标准，支持任何智能体客户端直连。

### 1. Claude Desktop 接入
编辑 `claude_desktop_config.json`：
```json
{
  "mcpServers": {
    "novmanager": {
      "command": "/home/debug/git/nov-manager/backend/.venv/bin/python",
      "args": ["/home/debug/git/nov-manager/backend/mcp_server.py"],
      "env": {
        "NOV_SERVER_URL": "http://127.0.0.1:8000"
      }
    }
  }
}
```

### 2. Cursor / VSCode 接入
在 `.cursor/mcp.json` 中配置：
```json
{
  "mcpServers": {
    "novmanager": {
      "command": "python",
      "args": ["backend/mcp_server.py"],
      "env": {
        "NOV_SERVER_URL": "http://127.0.0.1:8000"
      }
    }
  }
}
```

### 3. 可调用的核心 MCP 资源与工具示例
- **只读 Resources**：
  - `novel://nov-001/meta`：获取小说基础信息与文风指引
  - `novel://nov-001/world/rules`：读取世界观法则库与战力等级
  - `novel://nov-001/characters`：读取角色卡与即时战力状态
  - `novel://nov-001/outlines/tree`：读取分卷、章节、分镜三级大纲树
  - `novel://nov-001/foreshadowing/active`：获取待回收的活跃伏笔
- **写入 Tools**：
  - `query_lore(query, category)`：混合检索世界观条目
  - `save_scene_draft(scene_id, draft_content, agent_name)`：提交分镜场景正文草稿并保存快照版本
  - `update_character_state(...)`：在血战或突破后跃迁角色生理/战力状态

---

## 🧪 自动化测试与验证

本项目具备严密的自动化测试套件（涵盖 CRUD 业务接口、状态机跃迁、MCP 协议兼容性与 PostgreSQL 数据库交互）：

```bash
# 运行后端全量测试套件 (17 项测试用例全部通过)
PYTHONPATH=backend ./backend/.venv/bin/pytest backend/tests

# 运行前端编译校验与类型检查
pnpm build
```

---

## 📚 详细设计文档索引

- 📘 [**整体技术方案与架构设计文档**](docs/architecture_and_system_design.md)
  - 实体关系 E-R 图及数据字典规范
  - 三层漏斗式 Hybrid RAG 检索架构
  - 六大专家 Agent 状态机调度机制
- 🗄️ [**数据库 DDL 完整定义脚本**](docs/database_schema.sql)
- 🔌 [**MCP 接口规范与参数元数据**](docs/mcp_specification.json)

---

## 📄 开源许可证
本项目遵循 MIT License 协议。
