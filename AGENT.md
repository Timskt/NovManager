# AGENT.md - 项目工程与 AI 协同开发规范

本文档定义了 **墨枢（InkVerse / NovManager）** 项目的工程架构准则、目录规范与回归验证要求。

---

## 一、 文档管理规范

1. **正式文档目录 (`docs/`)**：
   - 存放系统架构设计、数据模型定义、API 规范与版本演进规划等长期维护的正式文档。
   - 表达风格应当客观、清晰、务实，采用标准软件工程与 AI 工程术语，避免浮夸或过度修辞的表达。
2. **临时文档目录 (`docs/tmp/`)**：
   - 存放调试记录、临时验证说明或一次性迁移草稿，可随时清理归档。

---

## 二、 核心工程与架构准则

1. **纯 Rust 后端 + React 19 前端单栈演进**：
   - 后端统一采用 `backend_rust`（Rust + Axum + Tokio + rusqlite），不再维护旧版 Python 后端。
   - 前端统一采用 `web`（React 19 + TypeScript + Vite 8 + Tailwind CSS v4）。
2. **Local-First（本地优先）与双层持久化**：
   - 结构化元数据（作品、卷章、人物状态机、伏笔、模型路由、文风配置）存储在启用 WAL 模式的 SQLite 数据库（`data/novmanager_local.db`）中。
   - 正文快照与版本历史通过本地 Git 仓库（`manuscripts/`）静默提交与管理，向用户屏蔽底层 Git 命令复杂性。
3. **三栏工作台布局与交互一致性**：
   - 创作工作台（`StudioView`）保持左栏（目录与上下文）、中栏（正文编辑器）、右栏（全模态 AI 参谋与流水线）三栏定住布局，三栏顶底固定、中部独立滚动（`overscroll-contain`）。
   - 所有界面配色必须使用语义化 CSS 变量（`var(--bg-surface)`, `var(--text-main)`, `var(--accent-primary)` 等），适配宣纸、黑曜、青釉、素雅四套主题。

---

## 三、 构建、测试与容器化验证准则

1. **后端回归测试**：
   - 修改 `backend_rust` 后，需执行 `cargo test` 确保所有 API 与存储层集成测试通过。
2. **前端类型检查与构建**：
   - 修改 `web` 后，需执行 `pnpm --prefix web build`（包含 `tsc -b` 与 `vite build`），确保零 TypeScript 编译错误。
3. **容器化运行（OrbStack / Docker Compose）**：
   - 项目支持通过 `docker compose up -d --build` 在 OrbStack 或 Docker Desktop 环境中一键构建并运行前后端容器。
