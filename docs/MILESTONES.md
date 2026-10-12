# 项目版本演进与里程碑记录 (Milestones & Roadmap)

本文档记录 **墨枢（InkVerse / NovManager）** 从早期原型到纯 Rust + React 19 全栈容器化架构的演进过程与交付成果。

---

## 阶段一：基础小说结构化管理与 Web 工作台 (M1 - M5)

- **三级大纲与场景正文管理**：建立“卷（Volume）→ 章（Chapter）→ 幕/场景（Scene）”的数据模型，支持按幕编写与整章汇总预览。
- **核心设定资产库**：实现人物档案、人物动态状态机（追踪章节维度的位置、能力、状态标签）、世界观规则库与伏笔追踪表。
- **基础协同流水线**：实现分镜规划（Director）、初稿生成（Drafter）、设定一致性审查（Inspector）与文风润色（Stylist）四步标准辅助工作流。
- **句段级 Diff 审阅器**：基于 Myers 差分算法实现初稿与改稿的逐句对比、勾选与合并，同时支持后台 Git 快照记录。

---

## 阶段二：Rust 高性能后端重写与架构收敛 (M6 - M8)

- **移除旧版 Python 服务，统一至 Rust 原生后端 (`backend_rust`)**：
  - 基于 `Axum 0.8` + `Tokio` + `rusqlite (bundled)` 构建单二进制服务端 `nov-server`。
  - 启用 SQLite WAL 并发读写模式，自动完成建表与初始示例数据（《太虚纪元》）初始化。
- **多提供商模型网关与故障转移 (`ModelHubView`)**：
  - 支持接入 OpenAI、Anthropic Claude、Google Gemini、DeepSeek、SiliconFlow、Ollama 及自定义 OpenAI 兼容接口。
  - 支持按创作角色分配主备模型、多 API Key 轮询以及 429/超时自动降级切换。
- **文风量化分析与视频分镜生成**：
  - 新增文风特征提取工坊（`StyleDnaStudioView`）与多平台 AI 视频分镜脚本生成与导出工坊（`VideoStoryboardStudio`）。

---

## 阶段三：多智能体圆桌、全模态上下文与三栏 IDE 交互优化 (M9 - M12)

- **跨提供商多 AI 圆桌辩论系统 (`MultiAgentDebateStudioView`)**：
  - 支持可视化增删辩论节点、自定义节点间拓扑连线，让来自不同模型提供商的 Agent 围绕同一章节或读者评论展开多轮讨论与汇总。
- **全模态多源上下文挂载 (`MultimodalContextStudioView` & `AgentDock`)**：
  - 对标融合 **Claude Code**（本地设定文件夹递归扫描）、**OpenAI Codex**（`/codex-patch` 行内精准 Diff 补丁）、**ChatGPT Vision**（图片/立绘/地图解析与 `Ctrl+V` 直接贴图）与 **WorkBuddy**（多网页链接并发抓取）四大交互模式。
- **工作台三栏定住与独立滚轮隔离 (`StudioView`)**：
  - 精简顶部导航栏与工作区标签栏，消除冗余路径与空旷间距。
  - 锁定视口高度，实现左栏（章节与上下文）、中栏（正文编辑器）、右栏（全模态参谋舱）顶底固定、中部鼠标悬停独立滚动（`overscroll-contain`）。
- **OrbStack / Docker Compose 全栈容器化交付**：
  - 提供多阶段构建的 `backend_rust/Dockerfile` 与 `web/Dockerfile`（含 Nginx `/api` 反向代理），支持通过 `docker compose up -d --build` 在 OrbStack 环境中一键启动。

---

## 阶段四：实时热梗、热点新闻与跨世界观融合引擎 (M13)

- **实时热梗与热点新闻融合系统 (`TrendMemeFusionView` & `backend_rust/src/handlers/trends.rs`)**：
  - **20 项新功能 (`TF01–TF20`)**：涵盖多平台实时热榜雷达（抖音、微博、B站、知乎、小红书、科技财经）、外部新闻/新梗一键解析入库、5 大世界观（修仙、都市、克苏鲁、赛博朋克、古风）防违和本土化转译、小说内嵌与独立时评文章双模生成、1–4 档含梗浓度控制、读者“本章说”弹幕预演及 Codex 手术刀补丁合入。
  - **20 项新架构 (`TA01–TA20`)**：涵盖 Rust 异步热榜聚合管道、热梗四元组语义表征、世界观词法映射张量、时间衰减评分算子、零时代穿帮语法树重写（Anachronism Guard）与离线/在线双模容灾缓存。

