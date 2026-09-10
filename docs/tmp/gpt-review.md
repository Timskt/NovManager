# NovManager 2.0「Git 工程底座 + SQLite 索引」架构评审

- 评审对象：`docs/novel_manager_git_sqlite_architecture_redesign.md`
- 交叉核对：当前后端实现、测试、部署配置、`backend/data/novel_store.json`，以及配套的 `docs/novel_manager_migration_plan.md`；存量迁移仅作为新格式覆盖测试，不作为架构放行硬指标
- 评审日期：2026-09-06
- 结论：**方向认可，但应先补齐关键架构契约再进入实现；存量迁移不作为放行硬指标。**

## 1. 总体结论

将“已采纳的小说资产”落为 Markdown/JSON 并交给 Git 管理，同时用 SQLite 构建查询视图，符合本项目以单机创作、本地数据主权和外部编辑器兼容为主的产品定位。按作品拆分仓库、以 Scene 为正文源本、整章按需装配，也都是合理的边界选择。

当前文档的问题不在技术方向，而在关键一致性契约尚未闭合：

1. SQLite 同时被定义为“可随时删除的只读缓存”和“推演树、使用次数等唯一存储”，两者互相冲突；
2. 文件落盘、Git Commit、SQLite 更新被称为“原子操作”，但三者不处于同一事务域，崩溃或并发时会产生半完成状态；
3. 文档宣称支持 Branch、Tag、Merge 且用户不会接触冲突，但没有设计分支上下文、缓存隔离和冲突解决协议；
4. 现有仓储锁只在单进程内有效，而现有部署文档允许 4 个 Uvicorn worker，Git 工作树和 SQLite 写入会被多个进程同时操作。

因此，本次评审给出“**概念方案有条件通过、实施方案暂缓**”的结论。下文 P0-1～P0-5 关闭后即可实现新框架；存量数据只需作为覆盖各类新存储路径的测试夹具，不要求无损继承全部旧历史。

## 2. 值得保留的设计

- **Local-first 方向正确**：文本资产可读、可迁移、可被通用编辑器处理，明显优于当前单一大 JSON 文件加可选 PostgreSQL 镜像。
- **Scene 是源本、Chapter 是编译视图**：避免同时维护 `chapter.md` 和多个 `scene-*.md` 造成双写漂移。
- **已采纳内容与发散推演分离**：产品语义合理，但必须明确推演数据究竟是“允许丢失的临时缓存”还是“需要恢复的工作成果”。
- **每部作品独立仓库**：降低仓库规模和作品间耦合，也便于单本小说移动、归档和远端同步。
- **SQLite 用于关系查询和全文索引**：适合单机读多写少场景，但需要补充中文分词、写并发和重建契约。

## 3. P0：实施前必须解决的问题

### P0-1：唯一真相源定义自相矛盾，会导致用户成果不可恢复

文档第 12～15、194 行声称所有核心资产均为纯文本、Git 是唯一真相源、SQLite 可删除重建；但第 202～206、223～227 行又把 `plot_deduction_trees` 及其 `draft_content` 只写入被 Git 忽略的 SQLite，`polish_techniques.applied_count` 也被描述为数据库状态。第 240 行还提到未在缓存表设计中定义清楚的“版本快照表”。

后果是：删除 `.nov/index.db`、执行 Git Clone、换机或缓存损坏后，推演分支、未采纳正文、技巧使用统计及可能的版本元数据无法从 Git 重建。“一键自愈”和“跨设备迁移”承诺不成立。

必须把状态明确分为三类：

| 状态类别 | 建议载体 | 丢失策略 | 示例 |
| --- | --- | --- | --- |
| 已采纳的领域真相 | Git 跟踪的 Markdown/JSON | 不允许丢失 | 正文、人物卡、状态、伏笔、技巧定义 |
| 未采纳但需要保留的工作区数据 | 独立的 `.nov/workspace.db`，或可同步的草稿文件/专用 Git refs | 必须有备份、导出和恢复协议 | 推演树、候选草稿、审阅会话 |
| 完全派生的查询缓存 | `.nov/index.db` | 可安全删除并由指定 Git 提交重建 | FTS、关系投影、聚合统计 |

若产品决定推演树允许丢失，也必须在产品和文档中显式称其为“临时会话”，设置 TTL，并在删除/迁移前告知用户；不能再把它计入可恢复的核心资产。`applied_count` 若代表业务事实，应由 Git 中的应用事件推导，或直接作为 Git 资产保存，不能只存在于缓存。

### P0-2：“落盘 → Commit → 缓存”的流程不是原子事务

文档第 71、229～241 行将跨文件系统、Git 对象库和 SQLite 的顺序操作称为原子操作。实际上 SQLite 事务只能保证数据库内部原子性，不能替文件写入和 Git 引用更新提供共同提交。任一步骤失败都会留下不同状态，例如：

- 文件已替换但 Commit 失败：工作树内容领先于 `HEAD`；
- Commit 成功但缓存更新失败：读请求继续返回旧正文；
- 缓存先更新而进程随后退出：缓存展示尚未进入 Git 的内容；
- 重试同一个请求：可能产生重复状态行、重复技巧计数或重复 Commit。

建议定义一个持久化、可恢复、幂等的写协议：

1. 按作品获取**跨进程锁**，请求携带 `operation_id`、`expected_head_oid`，更新已有文件时再携带 `expected_blob_hash`；
2. 在临时文件中完成序列化并校验 schema、引用和路径，随后原子替换目标文件；
3. 只暂存本次操作解析出的精确路径，使用 `--` 分隔 Git 选项和路径；禁止 `git add manuscript/ characters/ techniques.json` 这类目录级暂存，因为它会带入用户或其他请求的无关变更；
4. Commit 成功后记录新 OID；SQLite 在自己的事务中更新，并写入 `indexed_head_oid=<new_oid>`；
5. 缓存失败时，Git Commit 仍是成功结果，但服务必须进入 `INDEX_STALE` 状态并重建，不能静默返回一份旧缓存；
6. Commit 之前失败时依据操作日志恢复或明确保留为“待处理工作树”，不能用粗暴 reset 覆盖外部编辑；相同 `operation_id` 重试必须返回同一结果。

更强的一致性实现可以在临时 worktree/临时 index 中构造 Commit，再以 compare-and-swap 方式更新目标 ref；MVP 至少也要有“单写者队列 + 操作日志 + 故障恢复状态机”。验收测试必须在上述每个边界注入进程终止。

### P0-3：Git 分支能力目前只是目标描述，没有可执行设计

文档第 9、13 行以多分支、Tag、合并作为核心收益，但 `GitManager` 职责只列出 `init/add/commit/log/status`；没有 branch、checkout/worktree、merge、冲突状态或远端同步协议。Git 的真实三方合并在冲突时会产生未合并 index 和冲突标记，因此“绝不让创作者感知冲突符号”只能依靠应用层冲突 UI 和语义合并器实现，不能由 Git 自动保证。

此外，`.nov/index.db` 位于共享工作树内。切换分支后它不会跟随 Git 变化，若不按 Commit OID 隔离或强制失效，将直接返回上一个分支的数据。

应在以下两种范围中明确选择一种：

- **推荐 MVP**：只支持 `main` 上的自动 Commit；画布分叉属于 `workspace.db` 的推演节点，不宣称是 Git Branch；历史、Diff、回滚先基于 Commit 实现。删除当前文档中的 Branch/Tag/Merge 和“分布式灾备已具备”承诺。
- **完整分支版**：所有 API 显式携带分支/工作区上下文；不同分支使用独立 Git worktree 或不可变 tree 读取；缓存至少由 `repo_id + head_oid + schema_version` 标识；设计结构化 JSON/JSONL 的三方语义合并、冲突检测、预览、接受/放弃和恢复流程。

### P0-4：并发模型会产生混合 Commit 和覆盖写

当前 `NovelRepository` 只使用进程内 `threading.RLock`（`backend/app/storage.py:102-110`），而现有部署说明使用 `uvicorn --workers 4`（`README.md:226`）。REST、MCP、多个 worker、外部编辑器以及未来文件监听器均可能同时触碰同一作品。Git 的共享 index/工作树不是业务事务队列；SQLite WAL 也只是允许读写并行，同一时刻仍只有一个 writer。

必须补充：

- 每个项目一个跨进程文件锁或单写者 actor/队列，并定义锁超时、崩溃释放和公平性；
- 乐观并发控制（`expected_head_oid`/ETag），冲突返回 409，不允许 last-write-wins 静默覆盖；
- 读请求的一致性级别：读取 `HEAD`、读取含外部未提交修改的 working set，还是读取指定 Commit；
- SQLite `busy_timeout`、事务边界、`foreign_keys=ON`、`synchronous`、checkpoint 和连接生命周期；
- 明确 WAL 只支持同机进程，不支持把项目放在多主机共享网络文件系统上。

### P0-5：外部编辑能力与缓存一致性没有闭环

方案把 VS Code、Obsidian、Typora 直接编辑当作优势，同时规定所有读请求优先访问 SQLite，但未说明如何发现：文件已改未提交、外部 Git checkout/pull、目录移动、手工 Commit、解析失败和部分写入。

应把外部修改定义为一等状态：

- 在每次读之前至少校验 `HEAD OID + 工作树指纹`，文件监听只作为降低延迟的优化，不能作为唯一正确性机制；
- 外部修改先显示为 dirty working set，缓存与已提交视图分开标记，应用不得静默覆盖；
- 重建必须明确来源是某个 Commit tree 还是含未提交变更的工作目录，不能笼统称为“从 Git 文件重建”；
- 用临时数据库完成全量构建和校验后再切换，避免读到半个索引；记录 `schema_version`、`indexed_head_oid`、源文件哈希和诊断信息；
- YAML/JSON 解析失败时保留原文件并向用户报告精确路径/字段，不能回退到旧缓存后假装成功。

## 4. P1：应在开发主干合入前补齐的问题

### P1-1：SQLite 拓扑与作品目录发现不一致

主文档第 194 行定义每部作品一个 `projects/{novel_id}/.nov/index.db`，配套迁移方案第 76 行却使用全局 `backend/data/novmanager.db`。两者在引擎管理、跨作品列表查询、项目移动和备份上完全不同。

建议保留“每作品独立 DB”，并另设一个很小的全局 catalog，只保存 `repo_id -> canonical_path`、最近打开时间和显示信息。catalog 丢失时可扫描用户配置的根目录重建。自定义路径必须使用不可变 `repo_id`，不能仅靠 `{novel_id}` 拼接和猜测。

### P1-2：文件格式还不足以成为长期稳定协议

需要为 Git 中每类文件定义 JSON Schema/Pydantic 版本、`schema_version`、必填/可空字段、未知字段保留策略、升级器、稳定排序、UTF-8/换行规范、时间格式和引用完整性规则。

`relations.json`、`foreshadowings.json`、`techniques.json` 仍是多人频繁修改的单一数组文件，合并冲突面很大；建议像人物卡一样改为“一实体一文件”。`states.jsonl` 只能降低追加冲突概率，不能消除并发冲突，也没有定义更正和删除；应使用稳定 `event_id`、`op`、`supersedes` 等事件语义，或按角色/章节拆文件。目录序号和业务 ID 必须解耦，否则章节重排会产生大规模 rename。

### P1-3：整章润色后的“智能反向拆分”不可验证

第 181～185 行没有定义章节锚点是什么、AI 删除/移动锚点怎么办、跨 Scene 移动段落归属谁、拆分失败如何恢复。该步骤可能把一份正确整章改稿错误覆盖到多个唯一源本。

建议装配时注入不可见但稳定的 Scene 边界 token，模型输出结构化 patch（每个 Scene 独立的新正文或基于范围的 edits），服务端验证 Scene 集合、顺序和覆盖范围后再展示 Diff。无法无歧义映射时必须让用户手动定界，禁止启发式直接回写。

### P1-4：全文检索不能只写“启用 FTS5”

FTS5 默认 `unicode61` 将连续的字母/数字字符视为一个 token；连续中文正文的关键词检索效果需要专门验证。应在 trigram、自定义中文分词器或应用层切词方案中明确选型，并给出索引体积、短于 3 字查询、短语、标点、繁简体和混合语言的验收集。还需检测运行环境是否编译了 FTS5，并设计 FTS 表与内容表的同步方式、删除同步和一致性检查。

### P1-5：保留 PostgreSQL 切换能力会显著扩大范围

SQLite 与 PostgreSQL 不只是在 URL 上不同：JSON 类型、FTS、DDL、连接池参数、健康检查、迁移和并发语义均不同。建议 2.0 首先明确只支持本地 SQLite；若确需 PostgreSQL，定义 `IndexStore`/`WorkspaceStore` 接口并实现两个独立适配器，不要让一个 `DatabaseManager` 通过条件分支模拟通用数据库。

### P1-6：Git 不是自动备份，且“零外部依赖”表述不准确

本地 `.git` 与工作文件位于同一磁盘，磁盘损坏时会一起丢失；只有配置远端并成功 push 后才形成异地副本。Git Clone 也不会带回被忽略的 SQLite 工作区数据。文档应把“版本历史”和“备份”分开，设计远端配置、push 失败提示、离线队列、凭据、隐私/加密以及恢复演练。

原生 Git CLI 本身也是外部运行时依赖。需定义最低版本、启动探测、Windows/macOS/Linux 的安装或随应用打包策略，以及 Git 不可用时的只读/降级行为。

### P1-7：Git 子进程和自定义路径存在安全边界

所有 `novel_id`、自定义项目路径、分支名、作者和 Commit message 都应验证；路径 `resolve()` 后必须仍位于授权根目录，拒绝目录穿越和越界 symlink。子进程必须使用参数数组、`shell=False`、固定可执行文件、超时、受控环境和 `--` 路径分隔符。

导入或外部修改的仓库可能包含 Git hooks，而 `git commit` 会触发 hooks；应用管理的仓库应使用隔离的空 `core.hooksPath`，不能只依赖 `--no-verify`。删除作品默认应移动到可恢复的回收站，而不是递归物理删除包含完整历史的目录。

### P1-8：现有 API 的“保存草稿”语义与新方案冲突

当前 `POST /api/scenes/draft` 会立即覆盖 Scene、创建 `version_id` 并持久化（`backend/app/main.py:170-183`、`backend/app/storage.py:960-1009`）。新文档则规定只有“采纳合入”才写 Git，推演不提交。要保持接口兼容，必须定义旧接口在 2.0 中究竟是 autosave、候选草稿还是正式采纳。

建议拆成 `save workspace draft` 与 `accept/commit` 两个明确命令；旧接口在过渡期映射到哪一个必须写入兼容矩阵。历史版本 API 应以 Git OID 为稳定版本标识；若不保留旧 `version_id/version_number/full_text`，应明确记录为 2.0 的非兼容变更，而不是把旧历史迁移当作硬要求。

## 5. P2：建议优化项

- 存量迁移不是架构硬要求，但配套迁移方案的夹具盘点仍需修正：评审时实际文件为 3 卷、16 章、32 个 Scene，且有 70 条旧版本记录，与方案声称的 1 卷、13 章、13 个 Scene 不一致。无需全部保留，但测试数据应明确选择代表性样本，覆盖每一种 Git 文件、工作区数据、派生索引、删除/重排和旧 API 映射，不能用错误统计证明“覆盖完整”。
- 当前主存储仍是 `novel_store.json` 并尽力同步 PostgreSQL（`backend/app/storage.py:113-144`）；数据库层直接使用 PostgreSQL `JSONB` 和专用健康检查（`backend/app/db.py:23-29, 237-260`）。新框架应作为清晰的新实现构建，不应假设仅修改数据库连接串就能完成切换。
- “数秒/2 秒重建”“秒级拉起”“毫秒级返回”应改为有数据规模、硬件、冷/热缓存和百分位数的 SLO；大稿件首次索引应后台构建并报告进度。
- `current_word_count`、`actual_word_count` 等派生值应从正文统一计算并明确中文计数口径，避免既存缓存值继续漂移。
- 为 reindex、Git 操作、缓存陈旧、dirty working set、未 push Commit、恢复动作提供结构化日志和健康状态，但日志不得记录完整正文或密钥。
- 明确仓库格式升级、SQLite schema migration、旧应用打开新仓库以及新应用打开旧仓库时的兼容策略。
- 制定自动 Commit 的合并/压缩策略；每次 autosave 都 Commit 会造成噪声、仓库膨胀和难以阅读的历史。
- 规定 Git GC、仓库完整性检查、磁盘空间下限和大附件策略，避免导出物、图片或模型产物意外进入历史。

## 6. 建议修订后的最小架构契约

建议把 2.0 MVP 收敛为以下可验证契约：

1. **Git 仅是已采纳领域资产的唯一真相源**；真相由明确的 Commit OID 表示，不使用含糊的“仓库目录当前内容”。
2. **工作区数据库不是缓存**；未采纳推演若需保留，放入 `.nov/workspace.db` 并独立备份。纯派生索引单独放入 `.nov/index.db`，删除后不损失任何业务事实。
3. **先不提供 Git Branch/Tag/Merge 产品能力**；MVP 提供 main 上的 Commit、历史、Diff、恢复。画布“分支”只是工作区节点。
4. **单作品单写者**；所有写入通过带幂等键和预期 OID 的命令处理器串行执行，REST 和 MCP 共用同一入口。
5. **缓存绑定源版本**；每次读验证 `indexed_head_oid`，不匹配时绕过旧缓存或返回明确的 rebuilding 状态。
6. **外部编辑形成 dirty working set**；应用展示差异并由用户决定提交、保留或放弃，绝不自动覆盖。
7. **格式稳定可升级**；每个项目带 manifest/schema version，领域实体尽量一文件一对象，所有写入采用确定性序列化。
8. **备份是独立能力**；本地 Git 历史、远端同步、工作区备份分别报告状态。

完成上述 MVP 后，再以独立 ADR 扩展 Git 多分支、语义合并、小团队协作和可选 PostgreSQL 适配器。

## 7. 实施放行验收清单

以下测试全部自动化通过后，方可把新框架设为默认存储后端：

- 删除 `index.db` 后，从指定 Commit 重建出的每张派生表、FTS 文档数和内容哈希一致；`workspace.db` 不被误删。
- 在文件替换、Git 暂存、Commit、SQLite 更新的每个步骤强制终止进程，重启后都能判定并恢复，不产生重复 Commit/状态事件/技巧计数。
- 两个 worker 与 MCP 同时修改同一 Scene 时，一个成功，另一个得到可解释的 409；不存在混合 Commit。
- 外部编辑器修改目标文件后，旧请求不能覆盖新内容；应用能展示 dirty 状态和解析错误。
- 切换到任意受支持的 revision 后绝不返回另一版本的缓存结果；未来启用 Git 分支时复用同一断言。
- 中文 1～2 字、3 字以上、完整句、标点混合、角色名和英文混合检索满足定义的召回/延迟指标。
- Git 缺失、Commit hook、磁盘满、只读目录、损坏仓库、SQLite busy/损坏、远端断网都有明确且不丢数据的行为。
- 迁移夹具覆盖所有新存储类别及主要生命周期；测试数据全部位于临时目录，不触碰 `backend/data/novel_store.json`，不要求继承全部旧版本历史。
- 完成一次从备份到新机器的恢复演练，而不只是验证备份文件存在。

## 8. Rust 重构适配性评估

### 8.1 结论

**适合。若团队具备 Rust 工程能力，建议把 2.0 后端直接重构为单一 Rust 服务；但仍应先冻结 P0-1～P0-5 的语言无关契约，再开始编码。**

这套 2.0 架构的难点是文件、Git、SQLite、并发锁、崩溃恢复和路径安全，恰好是 Rust 能发挥优势的区域。当前 Python 后端相关代码规模仍较小，新 Git/SQLite 存储层也尚未实现；再考虑到无需无损迁移全部旧数据，此时重构的机会成本可控。现有 LLM 功能主要是 HTTP 代理，MCP 也已有官方 Rust SDK，不构成必须保留 Python 的理由。

目标形态建议是一套单进程 `novd` 服务，而不是长期运行 Python 与 Rust 两个后端：

| 层 | 建议 | 原因 |
| --- | --- | --- |
| 领域与命令层 | Rust | 定义项目、Scene、工作区、Commit、冲突和恢复状态机 |
| Git/文件/SQLite | Rust | 统一拥有全部持久化写入、项目锁、操作日志和 reindex |
| REST | Axum + Tokio | 保持现有 HTTP 合同，供 Web 前端调用 |
| MCP | 官方 Rust MCP SDK | REST 与 MCP 复用同一命令服务，避免两套写路径 |
| LLM 代理 | Rust `reqwest` | 当前需求只是 HTTP/流式转发，无需为此保留 Python 进程 |

### 8.2 Rust 带来的实际收益

- 用 enum 和类型系统显式表达 `Clean / Dirty / Committing / IndexStale / Conflict / RecoveryRequired` 等仓库状态，减少字符串和隐式状态组合。
- 以每作品 actor/队列实现单写者，所有 REST 与 MCP 写操作最终进入同一个命令处理器；所有权模型有助于避免连接、锁和临时文件生命周期错误。
- 错误类型可以保留 Git、SQLite、I/O、schema 和并发冲突的原因链，便于实现可恢复而非“捕获后忽略”。
- `rusqlite` 可选择 bundled SQLite，便于固定 SQLite/FTS5 能力并减少目标机器差异；其 backup feature 也适合工作区数据库备份。
- Axum + Tokio 可把 REST、MCP、后台 reindex 和每作品写队列放在一个运行时中，最终交付一个后端可执行文件；官方 Rust MCP SDK 已经存在。

性能不应成为重构的主要理由：对单机小说项目而言，瓶颈更可能是 Git/磁盘 I/O、全文索引和模型调用，Python 的路由开销通常不是关键路径。Rust 的核心价值在**一致性、状态建模、单进程资源所有权和跨平台可分发性**。

### 8.3 推荐的进程边界

最终架构建议只有一个 Rust 后端进程 `novd`。HTTP 请求可以并发处理，但每个作品的变更命令进入独立 actor/串行队列；该 actor 拥有项目写锁、SQLite writer 和 Git 操作权。读请求可以并行读取不可变 Commit view 或显式的 working view。

建议的内部边界如下：

1. `domain`：纯领域类型、状态机、错误和不变量，不依赖 Axum/SQLite/Git；
2. `application`：`CreateProject`、`SaveDraft`、`AcceptScene`、`Reindex`、`SwitchRevision` 等命令与查询；
3. `storage`：文件格式、`workspace.db`、`index.db` 和 catalog 适配器；
4. `git`：受控 Git CLI、精确 pathspec、OID/dirty/conflict 检测；
5. `api` 与 `mcp`：仅转换协议并调用同一 application service；
6. `novd`：启动、配置、项目 actor 注册表、后台任务和健康检查。

不建议采用 PyO3 作为主架构，也不建议长期保留 Python sidecar：它们会增加跨平台打包、故障定位和进程间一致性成本。迁移期间可以让 Rust 服务保持现有 REST/MCP 合同，与 Python 实现并行做黑盒对照，达标后直接切换进程。

若团队缺乏 Rust 维护经验，或者未来半年仍以快速试错提示词与 Agent 流程为绝对优先，则继续使用 Python 也合理；只要落实同样的状态机、单写者和恢复协议，正确性并不依赖 Rust。

### 8.4 Rust 技术栈建议与注意点

- Web：`axum + tokio + tower-http`；API schema 使用 `serde`，以 OpenAPI/JSON Schema 和现有请求样本做合同测试。
- MCP：官方 Rust MCP SDK；REST 与 MCP handler 不得直接写文件，统一进入 application command bus。
- SQLite：偏同步单写者模型时优先 `rusqlite`；不要为了“全异步”把一个 SQLite writer 包装成大量并发任务。启用 bundled SQLite 后仍需实测 FTS5/trigram 编译选项。
- Git：MVP 继续调用受控 Git CLI，以保持用户熟悉的 Git 行为和诊断信息；使用参数数组、超时、空 hooksPath 和精确 pathspec。`git2-rs/libgit2` 可减少外部 Git 依赖，但远端协议、凭据和行为兼容会扩大实现范围，不建议首期切换。
- 文件格式：`serde_json`、YAML frontmatter 解析器和明确版本化 schema；写入必须经过临时文件、校验和原子替换。
- LLM：`reqwest` + 流式响应；将供应商差异放入 adapter，不让存储事务持锁等待模型调用。
- 观测：`tracing` 记录 operation/repo/commit/status，不记录正文和密钥。
- 测试：属性测试覆盖序列化往返，故障注入覆盖写流程每个边界，合同测试确保 Python 与 Rust 返回完全一致。

### 8.5 推荐实施顺序

1. 先冻结架构契约：完成 P0-1～P0-5 的 ADR、状态机和 API 契约；
2. 在现有 Python 后端补齐黑盒合同测试和临时项目夹具；
3. 创建 Rust workspace 和 `novd`，实现最小垂直切片：创建项目 → 保存/采纳一个 Scene → Commit → 更新/重建索引 → REST/MCP 查询；
4. 做并发、崩溃、外部编辑和中文检索验证；
5. 用现有前端和合同测试同时验证 Python/Rust 返回，修正差异；
6. 将默认后端切到 `novd`，保留 Python 版本短期回退窗口，稳定后删除旧实现。

因此，本项目的选型建议是：**先用语言无关的契约解决设计问题；若团队能长期维护 Rust，则 2.0 直接采用单一 Rust 后端，不必先用 Python 重写一遍新存储层。**

## 9. 参考依据

- SQLite 官方 WAL 文档说明 WAL 允许读写并发但同一时刻仍只有一个 writer，不适用于多主机网络文件系统，并且复制数据库时 `-wal` 也是持久状态的一部分：<https://www.sqlite.org/wal.html>
- SQLite 官方 FTS5 文档说明默认 tokenizer 是 `unicode61`，而 trigram 才提供通用子串匹配；中文检索必须显式选型和验证：<https://www.sqlite.org/fts5.html>
- Git 官方 `git add` 文档说明目录 pathspec 会更新该目录下匹配的新增、修改和删除内容，因此目录级暂存可能带入非本次业务操作的变更：<https://git-scm.com/docs/git-add>
- Git 官方 merge 文档说明文本冲突会留下未合并 index 和冲突标记，产品层必须自行设计解决流程：<https://git-scm.com/docs/git-merge>
- Git 官方 hooks 文档说明 Commit 会触发多类 hook，且 `prepare-commit-msg` 不能被 `--no-verify` 禁用：<https://git-scm.com/docs/githooks>
- Axum 官方项目展示了基于 Tokio/Tower 的 HTTP 服务能力：<https://github.com/tokio-rs/axum>
- rusqlite 官方项目支持 bundled SQLite 与 SQLite backup API，可用于固定桌面端 SQLite 能力：<https://github.com/rusqlite/rusqlite>
- Model Context Protocol 提供官方 Rust SDK，未来迁移 MCP 适配层具备可行基础：<https://github.com/modelcontextprotocol/rust-sdk>
- `git2-rs` 是 libgit2 的 Rust bindings，但网络能力需额外启用 HTTPS/SSH features，首期使用它并不会自动降低远端与凭据复杂度：<https://github.com/rust-lang/git2-rs>

---

**最终意见：保留 Git + SQLite 的总体方向，先修正状态分层、写入一致性、Git 分支范围以及并发/外部编辑协议。存量迁移只作为格式覆盖测试，不阻断新框架；团队具备 Rust 能力时，推荐 2.0 直接重构为单一 Rust 后端。**
