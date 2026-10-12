<p align="center">
  <img src="docs/images/logo.png" alt="InkVerse Logo" width="108" height="108" />
</p>

<h1 align="center">墨枢 · InkVerse</h1>

<p align="center">
  <b>面向长篇小说与剧本工程的本地优先（Local-First）多智能体协同创作与上下文管理平台</b>
</p>

<p align="center">
  <a href="https://github.com/Timskt"><img src="https://img.shields.io/badge/Maintainer-Timskt-2563eb?style=flat-square" alt="Maintainer Timskt" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Backend-Rust_Axum_0.8-dea584?logo=rust&style=flat-square" alt="Rust Backend" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61dafb?logo=react&style=flat-square" alt="React 19" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Storage-SQLite_WAL_+_Git_VCS-003B57?logo=sqlite&style=flat-square" alt="SQLite WAL" /></a>
  <a href="#"><img src="https://img.shields.io/badge/Container-Docker_Compose_/_OrbStack-2496ed?logo=docker&style=flat-square" alt="Docker Compose" /></a>
  <a href="#"><img src="https://img.shields.io/badge/License-MIT-10b981.svg?style=flat-square" alt="MIT License" /></a>
</p>

---

## 1. 项目简介

**墨枢（InkVerse / NovManager）** 是一个面向百万字级长篇小说、系列故事及影视分镜脚本的工程化创作与数据管理平台。

长篇创作在使用大语言模型（LLM）辅助时，普遍面临三大工程痛点：
1. **上下文遗忘与前后矛盾**：随着字数增长，模型容易遗忘前文设定、人物状态或伏笔线索，出现“吃设定”与人物行为失真（OOC）。
2. **输入模态单一**：创作讨论往往需要同时参考本地设定集文件夹、多条网页考据链接、概念设定图以及历史文稿，纯文本对话框难以高效组织多源参考资料。
3. **单一模型局限**：不同模型在逻辑推演、对话张力、古典文风、设定审查上各有所长，单模型单次生成难以兼顾质量与稳定性。

针对上述问题，本项目采用 **Rust (`Axum` + `SQLite WAL` + `Git VCS`) + React 19** 纯净双层架构，将软件工程中的版本控制、状态机校验、多模态上下文挂载（参考 Claude Code、Codex、ChatGPT Vision、WorkBuddy 的交互范式）以及多模型协同辩论引入长篇内容生产流程。

---

## 2. 核心功能模块

### 2.1 三栏定住式创作工作台（Studio IDE）
- **左、中、右三栏独立滚轮隔离**：根容器锁定视口高度（`100vh`），左栏（章节目录与上下文）、中栏（正文编辑器）、右栏（全模态 AI 参谋与稽查流水线）各自的顶栏与底栏固定（Pinned），仅中间内容区响应鼠标滚轮，互不干扰。
- **紧凑型顶部全域导航与命令中心（`⌘K`）**：划分为「创制工坊」「因果演化」「要素资产」「研判进化」四大领域菜单，内置全书模糊检索与快捷指令面板。
- **分镜幕次管理与句段级 Diff 审阅**：支持按“卷 → 章 → 幕（Scene）”三级结构组织正文，内置基于 Myers Diff 算法的整体对比与逐句勾选合并工具（`GranularDiffMerger`）。
- **四套阅读与写作主题**：内置宣纸（Ink Paper）、黑曜（Obsidian Dark）、青釉（Celadon Jade）、素雅（Pure Light）四套基于语义化 CSS 变量的配色方案，支持字号、行距、页宽与首行缩进调节。

### 2.2 全模态上下文挂载与协同参谋（Omni-Context & Agent Dock）
融合主流 AI 生产力工具的交互能力，支持在右侧参谋舱与独立全模态工坊中直接挂载四类非纯文本资产：
- **本地文件夹递归扫描（Claude Code 范式）**：支持指定或上传本地设定集目录（如 `./worldbuilding`），自动递归解析 `.md` / `.txt` / `.json` 文件，过滤无关缓存并提取结构化摘要。
- **行内精准 Diff 补丁（OpenAI Codex 范式）**：通过 `/codex-patch` 指令定位当前正文薄弱段落，生成可视化的增删对比补丁卡片，支持在对话流中一键替换合入编辑器正本。
- **视觉图像解析与剪贴板贴图（ChatGPT Vision 范式）**：支持上传图片、拖拽文件或直接在输入框 `Ctrl+V` 粘贴人物立绘、地图、场景参考图，自动提取画面光影、构图与 OCR 文本并转化为场景描写素材。
- **多网页链接并发抓取（WorkBuddy 范式）**：支持一次性输入多条百科、考据或书评链接，自动去噪提炼关键事实并注入讨论上下文。
- **`@` 引用与 `/` 斜杠指令**：支持在输入框键入 `@` 快速挂载文件夹、图片、链接、文档与在场角色，键入 `/` 触发专项工作流。

### 2.3 跨提供商多智能体圆桌辩论（Multi-Agent Council）
- **可视化拓扑连线画布**：支持自由增删 AI 角色节点（起草主笔、设定审查员、文学主编、读者代表、仲裁总结官等），自定义节点间的辩论、质疑、补充与汇总连线关系。
- **多模型混编路由**：不同节点可绑定来自 OpenAI、Anthropic Claude、Google Gemini、DeepSeek、SiliconFlow、Ollama 本地模型等不同提供商的接口，经过多轮交叉评审后输出达成共识的正文、大纲或优化后的 Prompt。

### 2.4 结构化设定管理与 L1–L4 上下文压缩
- **人物档案与动态状态机**：追踪角色在不同章节的地理位置、能力等级、持有物品、受伤状态与人际关系变化。
- **多级上下文预算打包（Context Packer）**：按 Token 预算（如 4000 Tokens）对长篇历史数据进行分级装配（L1 原文窗口、L2 章节摘要、L3 角色与世界观状态快照、L4 硬性规则校验），降低长文生成中的设定冲突率。
- **设定一致性检查（Consistency Guard）**：自动检测草稿中的人物状态矛盾、时间线错位与未回收伏笔，并给出修改建议。

### 2.5 多模型网关、文风分析与视频分镜扩展
- **多提供商模型路由与容灾（Model Hub）**：支持管理多个自定义 API 提供商、多 Key 轮询与故障自动切换（Circuit-Breaker Failover），提供请求耗时与 Token 消耗统计。
- **文风特征提取与融合（Style DNA Studio）**：基于句长方差、对话占比、感官词密度、修辞频率等 6 维指标量化分析样本文风，并生成对应的写作约束指令。
- **AI 视频分镜脚本工作台（Video Storyboard Studio）**：将小说场景拆解为包含景别、运镜、画面描述、音效与台词的结构化镜头表，支持导出适配 Sora、可灵（Kling）、Runway Gen-3、Midjourney 等平台的提示词格式。

### 2.6 实时热梗与热点新闻融合工坊（Real-Time Trends & Memes Fusion）
针对创作中需要引入实时流行热梗、社会/科技热点新闻并避免世界观违和的需求，提供 20 项功能（`TF01–TF20`）与 20 项架构（`TA01–TA20`）：
- **多平台实时热榜与自定义采集**：聚合主流社交与内容平台（抖音、微博、B站、知乎、小红书、科技财经）的高频热梗与突发新闻，支持粘贴外部实时新闻或新梗进行零样本解析入库（`/api/trends/parse-custom`）。
- **跨世界观防出戏转译（Anachronism Guard）**：内置修仙宗门、现代都市、诡秘克苏鲁、赛博朋克、古风朝堂 5 套本土化词法映射规则，自动将现代网络缩写与热点内核转化为符合目标题材设定的表达。
- **双模创作与四档浓度控制**：既可将热梗自然缝合进当前小说章节场景、角色吐槽对白或支线细纲，也可围绕实时热点独立生成结构完整的时评文章；支持 1–4 档含梗浓度调节、模拟读者弹幕反馈预演及 Codex Diff 一键合入正文。

---

## 3. 系统架构与工程目录

项目已全面统一为 **Rust 原生后端 + React 19 前端** 架构，移除了早期冗余的 Python 兼容层，保持代码库精简、高内聚与低资源占用。

```text
NovManager/
├── backend_rust/                 # Rust 高性能后端服务 (nov-server)
│   ├── Cargo.toml                # Rust 依赖配置 (Axum 0.8, Tokio, rusqlite, reqwest)
│   ├── Dockerfile                # 后端多阶段构建镜像配置
│   ├── src/
│   │   ├── main.rs               # HTTP 服务启动入口与路由挂载
│   │   ├── api.rs                # RESTful API 路由注册表
│   │   ├── handlers/             # 按业务域拆分的控制器模块 (含 trends.rs 实时热点融合引擎)
│   │   ├── models.rs             # 领域模型与请求/响应数据结构
│   │   ├── storage.rs            # SQLite (WAL 模式) 持久化仓储层
│   │   ├── git_vcs.rs            # 本地 Git 快照、历史记录与 Diff 封装
│   │   ├── context_packer.rs     # 动态 Token 预算上下文打包器
│   │   ├── self_iteration.rs     # 5 维文本质量评估与提示词微调逻辑
│   │   └── analytics.rs          # 叙事张力曲线、关系图谱与时间线分析
│   └── tests/
│       └── full_tests.rs         # 后端端到端集成测试套件
├── web/                          # 前端单页应用 (React 19 + Vite 8 + Tailwind CSS v4)
│   ├── Dockerfile                # 前端构建与 Nginx 反向代理镜像配置
│   ├── nginx.conf                # Nginx 静态托管与 /api 反向代理配置
│   └── src/
│       ├── App.tsx               # 根容器与视图路由分发
│       ├── config/navigation.tsx # 全站导航路由单一数据源 (SSOT)
│       ├── context/              # NovelContext、ThemeContext、BrandContext 状态管理
│       ├── lib/                  # API 客户端、Myers Diff、倒排搜索、本地 WAL 缓存
│       └── components/
│           ├── Header.tsx        # 顶部全域导航与命令入口
│           ├── common/           # 多标签栏、全局命令面板 (Cmd+K)
│           ├── studio/           # 三栏创作台 (ContextDrawer / ManuscriptEditor / AgentDock)
│           ├── trends/           # 实时热梗与热点新闻融合工坊 (TrendMemeFusionView)
│           ├── multimodal/       # 全模态上下文挂载工坊
│           ├── swarm/            # 多 AI 圆桌辩论与拓扑编排画布
│           ├── models/           # 多模型提供商网关与路由配置
│           ├── memory/           # L1-L4 记忆分层与防冲突监控
│           ├── style/            # 文风特征提取与合成工坊
│           ├── video/            # AI 视频分镜脚本生成与导出
│           └── analytics/        # 张力曲线、伏笔雷达、时间线矩阵
├── data/                         # 本地 SQLite 数据库存储目录 (Docker 持久化挂载卷)
├── manuscripts/                  # 本地 Git 小说手稿仓库目录 (Docker 持久化挂载卷)
├── docs/                         # 架构设计文档、数据库 Schema 与里程碑记录
├── scripts/                      # 本地快速启动与构建辅助脚本
└── docker-compose.yml            # 全栈容器化编排配置 (支持 OrbStack / Docker Desktop)
```

---

## 4. 快速启动指南

### 方式一：使用 OrbStack / Docker Compose 启动（推荐）

在 macOS 上推荐使用 **OrbStack** 运行容器，资源占用低且启动迅速：

```bash
# 1. 确保 OrbStack 已启动（若未启动可执行 open -a OrbStack）
orb status

# 2. 构建并后台启动前后端容器
docker compose up -d --build

# 3. 查看运行状态与健康检查
docker compose ps
```

服务启动后访问：
- **Web 创作工作台**：`http://localhost:3000`（或在 OrbStack 中直接通过容器域名访问）
- **Rust 后端健康检查**：`http://localhost:8000/api/health`
- **数据持久化**：SQLite 数据库自动保存在宿主机 `./data/novmanager_local.db`，Git 手稿保存在 `./manuscripts`。

常用容器管理命令：
```bash
# 查看实时日志
docker compose logs -f

# 停止并移除容器（数据卷保留在 ./data 和 ./manuscripts）
docker compose down
```

### 方式二：本地原生开发模式启动

如果你希望直接在宿主机进行前后端热重载开发：

```bash
# 一键启动 Rust 后端 (端口 8000) + Vite 前端 (端口 3000)
./scripts/start_rust.sh
```

或者分步启动：

```bash
# 终端 1：启动 Rust 后端
cd backend_rust
cargo run

# 终端 2：启动 React 前端
cd web
pnpm install
pnpm dev
```

---

## 5. 测试与构建验证

```bash
# 1. 运行 Rust 后端集成测试
cd backend_rust && cargo test

# 2. 运行前端 TypeScript 类型检查与生产环境构建
cd web && pnpm build
```

---

## 6. 开源协议

本项目基于 **MIT License** 开源。Maintained by [Timskt](https://github.com/Timskt).
