// ==============================================================================
// MCP (Model Context Protocol) 协议调试与资产观察视图 (McpInspectorInnerView)
// 专注于只读资源探索 (Resources)、工具模拟调用 (Tools) 与实时 JSON-RPC 载荷查看
// ==============================================================================

import React, { useState } from 'react';
import { useNovel } from '../../context/NovelContext';
import {
  Database,
  Wrench,
  Terminal,
  Play,
  FileCode,
  ArrowLeft,
  Sparkles,
  Layers,
} from 'lucide-react';

interface McpInspectorInnerViewProps {
  onGoToSetup: () => void;
}

export const McpInspectorInnerView: React.FC<McpInspectorInnerViewProps> = ({ onGoToSetup }) => {
  const { novel, novelList, worldSettings, characters, characterStates, activeChapter, switchNovel, getCharacterStateAtChapter } = useNovel();
  const [selectedResource, setSelectedResource] = useState<string>('meta');
  const [toolResult, setToolResult] = useState<string | null>(null);

  // 模拟返回 Resource 载荷
  const getResourcePayload = () => {
    switch (selectedResource) {
      case 'list':
        return novelList.map((n) => ({
          id: n.id,
          title: n.title,
          genre: n.genre,
          current_word_count: n.currentWordCount,
          target_word_count: n.targetWordCount,
          is_active: n.id === novel.id,
          updated_at: n.updatedAt,
        }));
      case 'meta':
        return {
          id: novel.id,
          title: novel.title,
          genre: novel.genre,
          styleGuide: novel.styleGuide,
          targetWordCount: novel.targetWordCount,
        };
      case 'world':
        return worldSettings.map((w) => ({
          category: w.category,
          name: w.name,
          rules: w.content,
          priority: w.priority,
        }));
      case 'characters':
        return characters.map((c) => ({
          id: c.id,
          name: c.name,
          roleType: c.roleType,
          personality: c.profile.personalityTraits,
          currentState: getCharacterStateAtChapter
            ? getCharacterStateAtChapter(c.id, activeChapter?.chapterIndex)
            : characterStates.find((s) => s.characterId === c.id),
        }));
      case 'chapter_context':
        return {
          chapter: activeChapter?.title,
          outline: activeChapter?.outline,
          scenes: activeChapter?.scenes?.map((s) => ({
            index: s.sceneIndex,
            goal: s.sceneGoal,
            conflict: s.conflict,
          })),
        };
      default:
        return {};
    }
  };

  const handleSimulateTool = async (toolName: string) => {
    if (toolName === 'list_novels') {
      try {
        const res = await fetch('/api/novels');
        if (res.ok) {
          const backendNovels = await res.json();
          const activeNovelId = novel.id;
          const data = backendNovels.map((bn: any) => ({
            id: bn.id,
            title: bn.title,
            genre: bn.genre,
            current_word_count: bn.current_word_count,
            target_word_count: bn.target_word_count,
            is_active: bn.id === activeNovelId,
          }));
          setToolResult(
            JSON.stringify(
              {
                tool: 'list_novels',
                status: 'success',
                total: data.length,
                active_novel_id: activeNovelId,
                novels: data,
              },
              null,
              2
            )
          );
          return;
        }
      } catch (e) {}

      const fallbackData = novelList.map((n) => ({
        id: n.id,
        title: n.title,
        genre: n.genre,
        current_word_count: n.currentWordCount,
        target_word_count: n.targetWordCount,
        is_active: n.id === novel.id,
      }));
      setToolResult(
        JSON.stringify(
          {
            tool: 'list_novels',
            status: 'success',
            total: fallbackData.length,
            active_novel_id: novel.id,
            novels: fallbackData,
          },
          null,
          2
        )
      );
    } else if (toolName === 'switch_active_novel') {
      const other = novelList.find((n) => n.id !== novel.id) || novel;
      await switchNovel(other.id);
      setToolResult(
        JSON.stringify(
          {
            tool: 'switch_active_novel',
            status: 'success',
            target: other.title.slice(0, 2),
            active_novel_id: other.id,
            novel_title: other.title,
            message: `成功通过书名模糊匹配切换工作焦点至《${other.title}》(${other.id})`,
          },
          null,
          2
        )
      );
    } else if (toolName === 'query_lore') {
      setToolResult(
        JSON.stringify(
          {
            tool: 'query_lore',
            query: '金丹期法则限制',
            status: 'success',
            matched_novel_id: novel.id,
            results: [
              {
                name: '太虚五境修行法则',
                matched_rule: '金丹威压对筑基期有绝对压制，但不可撕裂空间，不可神识横跨大洲。',
              },
            ],
          },
          null,
          2
        )
      );
    } else if (toolName === 'check_setting_consistency') {
      setToolResult(
        JSON.stringify(
          {
            tool: 'check_setting_consistency',
            draft_sample: '林越右手挥剑突刺...',
            status: 'passed',
            violations: [],
            lore_matched: ['九渊青铜残片（其二）', '坠星崖'],
          },
          null,
          2
        )
      );
    } else if (toolName === 'save_scene_draft') {
      setToolResult(
        JSON.stringify(
          {
            tool: 'save_scene_draft',
            status: 'saved',
            version_id: 'ver-1788542163185',
            scene_index: 1,
            word_count: 1450,
            snapshot_created: true,
          },
          null,
          2
        )
      );
    } else if (toolName === 'update_character_state') {
      setToolResult(
        JSON.stringify(
          {
            tool: 'update_character_state',
            character_id: 'char-lin-yue',
            health_status: 'INJURED',
            state_summary: '左臂受傀儡玄阴指所伤，经脉郁结',
            status_tags: ['重伤', '功力受阻'],
          },
          null,
          2
        )
      );
    }
  };

  return (
    <div
      className="flex-1 p-6 overflow-y-auto space-y-6 max-w-6xl mx-auto transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶部标题栏 */}
      <div
        className="flex items-center justify-between pb-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <Layers className="w-5 h-5 text-indigo-400" />
            <span>MCP 协议在线调试与小说资产看板</span>
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            实时模拟外部 Agent（Claude Desktop、Trae、Cursor）通过 JSON-RPC 2.0 探索只读资源与调用写作工具。
          </p>
        </div>

        <button
          onClick={onGoToSetup}
          className="px-3.5 py-1.5 border text-xs font-medium rounded-xl transition flex items-center gap-1.5"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-main)',
          }}
        >
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
          <span>返回【客户端安装与配置向导】</span>
        </button>
      </div>

      {/* 左右分栏：左侧资源与工具列表，右侧模拟交互窗口 */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* 左 5 栏：资源与工具定义 */}
        <div className="col-span-1 md:col-span-5 space-y-4">
          {/* Resources 清单 */}
          <div
            className="border rounded-2xl p-4 space-y-2.5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              <Database className="w-4 h-4 text-indigo-400" />
              <span>只读小说资源 (Resources)</span>
            </div>

            <div className="space-y-1.5 text-xs">
              {[
                { id: 'list', uri: 'novel://list', label: '全书库作品名录与活跃指针' },
                { id: 'meta', uri: 'novel://active/meta', label: '当前激活作品全书题材与风格准则' },
                { id: 'world', uri: 'novel://nov-001/world/rules', label: '世界观与法则体系清单' },
                { id: 'characters', uri: 'novel://nov-001/characters', label: '全部角色人设与即时状态机' },
                { id: 'chapter_context', uri: 'novel://nov-001/chapters/chap-012/context', label: '第12章预装配创作上下文包' },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedResource(item.id)}
                  className={`w-full p-2.5 rounded-xl border text-left transition flex flex-col gap-0.5 ${
                    selectedResource === item.id ? 'font-semibold' : 'hover:opacity-80'
                  }`}
                  style={{
                    backgroundColor: selectedResource === item.id ? 'var(--accent-surface)' : 'var(--bg-card)',
                    borderColor: selectedResource === item.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    color: selectedResource === item.id ? 'var(--accent-primary)' : 'var(--text-muted)',
                  }}
                >
                  <span className="font-mono text-[11px] font-semibold" style={{ color: 'var(--accent-primary)' }}>
                    {item.uri}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tools 清单 */}
          <div
            className="border rounded-2xl p-4 space-y-2.5"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: 'var(--text-main)' }}>
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>可调用工具集 (Tools Playground)</span>
            </div>

            <div className="space-y-2 text-xs">
              {/* list_novels */}
              <div
                className="border p-2.5 rounded-xl space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs" style={{ color: 'var(--accent-primary)' }}>
                    list_novels()
                  </span>
                  <button
                    onClick={() => handleSimulateTool('list_novels')}
                    className="px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--accent-surface)',
                      color: 'var(--accent-primary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Play className="w-2.5 h-2.5" />
                    模拟探测
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  大模型开局探测书库，感知当前名下所有小说与活跃焦点。
                </p>
              </div>

              {/* switch_active_novel */}
              <div
                className="border p-2.5 rounded-xl space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs" style={{ color: 'var(--accent-primary)' }}>
                    switch_active_novel(title)
                  </span>
                  <button
                    onClick={() => handleSimulateTool('switch_active_novel')}
                    className="px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--accent-surface)',
                      color: 'var(--accent-primary)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Play className="w-2.5 h-2.5" />
                    模拟切换
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  支持传入自然语言书名（如 "太虚"），自动模糊匹配并绑定小说。
                </p>
              </div>

              {/* query_lore */}
              <div
                className="border p-2.5 rounded-xl space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    query_lore(query)
                  </span>
                  <button
                    onClick={() => handleSimulateTool('query_lore')}
                    className="px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: '#10b981',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Play className="w-2.5 h-2.5" />
                    模拟调用
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  语义检索世界观法则与战力限制（novel_id 可省略自动取焦点）。
                </p>
              </div>

              {/* check_setting_consistency */}
              <div
                className="border p-2.5 rounded-xl space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    check_setting_consistency(...)
                  </span>
                  <button
                    onClick={() => handleSimulateTool('check_setting_consistency')}
                    className="px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: '#10b981',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Play className="w-2.5 h-2.5" />
                    模拟调用
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  向 NovManager 提交正文片段，进行战力悖论与人设 OOC 自动拦截。
                </p>
              </div>

              {/* save_scene_draft */}
              <div
                className="border p-2.5 rounded-xl space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                    save_scene_draft(...)
                  </span>
                  <button
                    onClick={() => handleSimulateTool('save_scene_draft')}
                    className="px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Play className="w-2.5 h-2.5" />
                    模拟调用
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  将外部 Agent 起草的 Markdown 正文回写至场景并生成 Git-like 版本快照。
                </p>
              </div>

              {/* update_character_state */}
              <div
                className="border p-2.5 rounded-xl space-y-1"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs" style={{ color: 'var(--text-main)' }}>
                    update_character_state(...)
                  </span>
                  <button
                    onClick={() => handleSimulateTool('update_character_state')}
                    className="px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      borderColor: 'var(--border-subtle)',
                    }}
                  >
                    <Play className="w-2.5 h-2.5" />
                    模拟调用
                  </button>
                </div>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  当外部 Agent 推进情节导致角色受伤或突破时，自动反向更新状态机。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 右 7 栏：JSON-RPC 实时响应控制台 */}
        <div className="col-span-1 md:col-span-7 space-y-4">
          <div
            className="border rounded-2xl p-4 space-y-2"
            style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
          >
            <div
              className="flex items-center justify-between pb-2 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <span className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                <FileCode className="w-4 h-4 text-indigo-400" />
                <span>当前选中的 MCP Resource 结构化 Payload 预览</span>
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>MIME: application/json</span>
            </div>

            <pre
              className="border rounded-xl p-3 text-xs font-mono max-h-80 overflow-y-auto leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            >
              {JSON.stringify(getResourcePayload(), null, 2)}
            </pre>
          </div>

          {toolResult && (
            <div
              className="border border-emerald-500/40 rounded-2xl p-4 space-y-2 animate-in fade-in"
              style={{ backgroundColor: 'var(--bg-surface)' }}
            >
              <div
                className="flex items-center justify-between pb-2 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <span>MCP Tool 模拟执行响应 (JSON-RPC Result)</span>
                </span>
                <button
                  onClick={() => setToolResult(null)}
                  className="text-[10px] hover:underline"
                  style={{ color: 'var(--text-muted)' }}
                >
                  清空
                </button>
              </div>

              <pre
                className="border rounded-xl p-3 text-xs font-mono text-emerald-400 max-h-64 overflow-y-auto leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {toolResult}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
