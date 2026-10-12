// ==============================================================================
// MCP (Model Context Protocol) 客户端安装与配置向导 (McpSetupView)
// 结构组织：
// 1. 严格业务顺序：【步骤一：安装至系统目录】 -> 【步骤二：配置各客户端】 -> 【步骤三：验证测试】
// 2. 多维度矩阵组织：
//    - 操作系统 (macOS / Linux / Windows)
//    - 目标智能体平台 (Trae, Claude Desktop, Cursor, WorkBuddy, ZCode, 远程SSE)
//    - 配置展示形式 (一键终端命令 cat/PowerShell / 纯 JSON 配置 / 路径说明与自动合并)
// ==============================================================================

import React, { useState, useEffect } from 'react';
import {
  Terminal,
  CheckCircle2,
  Copy,
  Sparkles,
  Laptop,
  Code2,
  Globe,
  ArrowRight,
  ShieldCheck,
  FolderCode,
  Building2,
  Apple,
  Monitor,
  FileJson,
  FileCode,
} from 'lucide-react';

interface McpSetupViewProps {
  onGoToInspector: () => void;
}

export type SupportedOS = 'macos' | 'linux' | 'windows';
export type ClientPlatform = 'trae' | 'claude' | 'cursor' | 'codex' | 'workbuddy' | 'zcode' | 'sse';
export type ConfigDisplayMode = 'terminal_cmd' | 'raw_json' | 'path_guide';

interface McpBackendConfigs {
  root_dir?: string;
  install_dir?: string;
  installed_launcher?: string;
  launcher_path?: string;
  sse_url?: string;
  openapi_url?: string;
  claude_desktop_stdio?: any;
  claude_desktop_sse?: any;
  trae?: any;
  cursor?: any;
  codex?: {
    toml?: string;
    cli_command?: string;
  };
  install_curl_cmd?: string;
  install_local_cmd?: string;
  install_win_ps_cmd?: string;
  cat_commands?: {
    claude_linux?: string;
    claude_macos?: string;
    trae?: string;
    cursor?: string;
    codex?: string;
  };
  powershell_commands?: {
    claude?: string;
    trae?: string;
    cursor?: string;
    codex?: string;
  };
}

export const McpSetupView: React.FC<McpSetupViewProps> = ({ onGoToInspector }) => {
  // 自动检测用户操作系统
  const detectOS = (): SupportedOS => {
    if (typeof window === 'undefined') return 'linux';
    const ua = window.navigator.userAgent.toLowerCase();
    if (ua.includes('mac')) return 'macos';
    if (ua.includes('win')) return 'windows';
    return 'linux';
  };

  const [selectedOS, setSelectedOS] = useState<SupportedOS>(detectOS);
  const [selectedClient, setSelectedClient] = useState<ClientPlatform>('trae');
  const [configMode, setConfigMode] = useState<ConfigDisplayMode>('terminal_cmd');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [serverConfigs, setServerConfigs] = useState<McpBackendConfigs | null>(null);

  useEffect(() => {
    fetch('http://localhost:8000/api/mcp/configs')
      .then((res) => res.json())
      .then((data) => setServerConfigs(data))
      .catch(() => {});
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // 动态解析各操作系统下的安装路径与命令
  const getInstallPath = () => {
    switch (selectedOS) {
      case 'macos':
        return '$HOME/.local/bin/nov-mcp';
      case 'windows':
        return '%USERPROFILE%\\.local\\bin\\nov-mcp.bat';
      case 'linux':
      default:
        return serverConfigs?.installed_launcher || '~/.local/bin/nov-mcp';
    }
  };

  // 步骤一：安装命令
  const getInstallCommand = () => {
    if (selectedOS === 'windows') {
      return (
        serverConfigs?.install_win_ps_cmd ||
        'powershell -ExecutionPolicy Bypass -Command "irm http://localhost:8000/install_mcp.ps1 | iex"'
      );
    }
    return (
      serverConfigs?.install_curl_cmd ||
      'curl -fsSL http://localhost:8000/install_mcp.sh | bash'
    );
  };

  const getLocalInstallCommand = () => {
    if (selectedOS === 'windows') {
      return '.\\scripts\\install_mcp.bat';
    }
    return serverConfigs?.install_local_cmd || './scripts/install_mcp.sh';
  };

  // 步骤二：各客户端配置文件路径说明
  const getConfigFileInfo = () => {
    switch (selectedClient) {
      case 'claude':
        if (selectedOS === 'macos') {
          return {
            path: '~/Library/Application Support/Claude/claude_desktop_config.json',
            desc: 'macOS Claude Desktop 全局配置文件',
          };
        }
        if (selectedOS === 'windows') {
          return {
            path: '%APPDATA%\\Claude\\claude_desktop_config.json',
            desc: 'Windows Claude Desktop 全局配置文件',
          };
        }
        return {
          path: '~/.config/Claude/claude_desktop_config.json',
          desc: 'Linux Claude Desktop 全局配置文件',
        };
      case 'trae':
        if (selectedOS === 'windows') {
          return {
            path: '.trae\\mcp.json',
            desc: '项目工程根目录专属配置 (Trae 自动读取)',
          };
        }
        return {
          path: '.trae/mcp.json',
          desc: '项目工程根目录专属配置 (Trae 自动读取)',
        };
      case 'cursor':
        if (selectedOS === 'windows') {
          return {
            path: '.cursor\\mcp.json',
            desc: '项目工程根目录专属配置 (Cursor / Windsurf 自动读取)',
          };
        }
        return {
          path: '.cursor/mcp.json',
          desc: '项目工程根目录专属配置 (Cursor / Windsurf 自动读取)',
        };
      case 'codex':
        if (selectedOS === 'windows') {
          return {
            path: '%USERPROFILE%\\.codex\\config.toml',
            desc: 'Windows OpenAI Codex 全局配置文件 (TOML 格式)',
          };
        }
        return {
          path: '~/.codex/config.toml',
          desc: 'OpenAI Codex CLI / Agent 全局配置文件 (TOML 格式，工程目录亦可建 .codex/config.toml)',
        };
      case 'workbuddy':
        return {
          path: '腾讯企业工作台 / 企微智能体中心 / 插件管理',
          desc: '支持通过 OpenAPI 3.0 或 SSE 远程端点接入',
        };
      case 'zcode':
        return {
          path: '智谱清言智能体中心 / ZCode 插件市场',
          desc: 'GLM-4 Function Calling 原生 OpenAPI 插件导入',
        };
      case 'sse':
        return {
          path: '支持任意远程 Agent、跨机器客户端与容器环境',
          desc: '无需任何本地 Python 依赖，基于 HTTP Server-Sent Events',
        };
    }
  };

  // 步骤二：纯 JSON / TOML 载荷
  const getRawJsonConfig = () => {
    const cmd = getInstallPath();
    if (selectedClient === 'codex') {
      return (
        serverConfigs?.codex?.toml ||
        `[mcp_servers.nov-manager]\ncommand = "${cmd}"\nargs = []`
      );
    }
    if (selectedClient === 'sse') {
      return JSON.stringify(
        serverConfigs?.claude_desktop_sse || {
          mcpServers: {
            'nov-manager-sse': {
              url: serverConfigs?.sse_url || 'http://localhost:8000/mcp/sse',
            },
          },
        },
        null,
        2
      );
    }
    return JSON.stringify(
      {
        mcpServers: {
          'nov-manager': {
            command: cmd,
            args: [],
          },
        },
      },
      null,
      2
    );
  };

  // 步骤二：终端直接运行的一键 cat / PowerShell 命令
  const getTerminalDirectCommand = () => {
    const jsonStr = getRawJsonConfig();
    const cmd = getInstallPath();

    if (selectedOS === 'windows') {
      if (selectedClient === 'codex') {
        return (
          serverConfigs?.powershell_commands?.codex ||
          `New-Item -ItemType Directory -Force -Path "$env:USERPROFILE\\.codex" | Out-Null\n@'\n[mcp_servers.nov-manager]\ncommand = "${cmd}"\nargs = []\n'@ | Add-Content -Path "$env:USERPROFILE\\.codex\\config.toml" -Encoding UTF8`
        );
      }
      if (selectedClient === 'claude') {
        return (
          serverConfigs?.powershell_commands?.claude ||
          `New-Item -ItemType Directory -Force -Path "$env:APPDATA\\Claude" | Out-Null\n@'\n${jsonStr}\n'@ | Set-Content -Path "$env:APPDATA\\Claude\\claude_desktop_config.json" -Encoding UTF8`
        );
      }
      if (selectedClient === 'trae') {
        return (
          serverConfigs?.powershell_commands?.trae ||
          `New-Item -ItemType Directory -Force -Path ".trae" | Out-Null\n@'\n${jsonStr}\n'@ | Set-Content -Path ".trae\\mcp.json" -Encoding UTF8`
        );
      }
      if (selectedClient === 'cursor') {
        return (
          serverConfigs?.powershell_commands?.cursor ||
          `New-Item -ItemType Directory -Force -Path ".cursor" | Out-Null\n@'\n${jsonStr}\n'@ | Set-Content -Path ".cursor\\mcp.json" -Encoding UTF8`
        );
      }
    } else if (selectedOS === 'macos') {
      if (selectedClient === 'codex') {
        return (
          serverConfigs?.cat_commands?.codex ||
          `mkdir -p ~/.codex && cat << 'EOF' >> ~/.codex/config.toml\n\n[mcp_servers.nov-manager]\ncommand = "${cmd}"\nargs = []\nEOF`
        );
      }
      if (selectedClient === 'claude') {
        return (
          serverConfigs?.cat_commands?.claude_macos ||
          `mkdir -p "$HOME/Library/Application Support/Claude" && cat << 'EOF' > "$HOME/Library/Application Support/Claude/claude_desktop_config.json"\n${jsonStr}\nEOF`
        );
      }
      if (selectedClient === 'trae') {
        return (
          serverConfigs?.cat_commands?.trae ||
          `mkdir -p .trae && cat << 'EOF' > .trae/mcp.json\n${jsonStr}\nEOF`
        );
      }
      if (selectedClient === 'cursor') {
        return (
          serverConfigs?.cat_commands?.cursor ||
          `mkdir -p .cursor && cat << 'EOF' > .cursor/mcp.json\n${jsonStr}\nEOF`
        );
      }
    } else {
      // Linux
      if (selectedClient === 'codex') {
        return (
          serverConfigs?.cat_commands?.codex ||
          `mkdir -p ~/.codex && cat << 'EOF' >> ~/.codex/config.toml\n\n[mcp_servers.nov-manager]\ncommand = "${cmd}"\nargs = []\nEOF`
        );
      }
      if (selectedClient === 'claude') {
        return (
          serverConfigs?.cat_commands?.claude_linux ||
          `mkdir -p ~/.config/Claude && cat << 'EOF' > ~/.config/Claude/claude_desktop_config.json\n${jsonStr}\nEOF`
        );
      }
      if (selectedClient === 'trae') {
        return (
          serverConfigs?.cat_commands?.trae ||
          `mkdir -p .trae && cat << 'EOF' > .trae/mcp.json\n${jsonStr}\nEOF`
        );
      }
      if (selectedClient === 'cursor') {
        return (
          serverConfigs?.cat_commands?.cursor ||
          `mkdir -p .cursor && cat << 'EOF' > .cursor/mcp.json\n${jsonStr}\nEOF`
        );
      }
    }

    // WorkBuddy / ZCode / SSE 默认返回启动命令或说明
    return `# 远程或企业 OpenAPI 模式无需本地管道启动命令\n# 请参考纯 JSON 或 OpenAPI URL 导入`;
  };

  const codexCliCmd =
    selectedOS === 'windows'
      ? `codex mcp add nov-manager -- "${getInstallPath()}"`
      : serverConfigs?.codex?.cli_command || `codex mcp add nov-manager -- ${getInstallPath()}`;

  const fileInfo = getConfigFileInfo();
  const rawJson = getRawJsonConfig();
  const terminalCmd = getTerminalDirectCommand();
  const openapiUrl = serverConfigs?.openapi_url || 'http://localhost:8000/openapi.json';
  const sseUrl = serverConfigs?.sse_url || 'http://localhost:8000/mcp/sse';

  return (
    <div
      className="flex-1 p-6 overflow-y-auto space-y-8 max-w-6xl mx-auto transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)', color: 'var(--text-main)' }}
    >
      {/* 顶部标题栏 */}
      <div
        className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--text-main)' }}>
            <ShieldCheck className="w-5 h-5 text-indigo-400" />
            <span>MCP 客户端标准安装与多端配置中心</span>
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            支持 macOS、Linux 与 Windows 全平台适配，提供“终端直执命令”、“纯 JSON”与“自动脚本”三种配置形态。
          </p>
        </div>

        {/* 操作系统全局切换器 */}
        <div
          className="flex items-center p-1 rounded-xl gap-1 self-start md:self-auto border"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[10px] px-2 font-medium" style={{ color: 'var(--text-muted)' }}>当前系统:</span>
          {[
            { id: 'macos', label: 'macOS', icon: Apple },
            { id: 'linux', label: 'Linux', icon: Terminal },
            { id: 'windows', label: 'Windows', icon: Monitor },
          ].map((os) => {
            const Icon = os.icon;
            const isSelected = selectedOS === os.id;
            return (
              <button
                key={os.id}
                onClick={() => setSelectedOS(os.id as SupportedOS)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 ${
                  isSelected ? 'text-white shadow-sm font-semibold' : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                  color: isSelected ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{os.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 步骤条流程指示器 (Stepper) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          className="border-l-4 border-indigo-500 border rounded-xl p-3.5 space-y-1"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-indigo-950 text-indigo-300 flex items-center justify-center text-[11px] font-mono font-bold">1</span>
            <span>第一步：环境与程序安装</span>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            将启动器安装至系统的安装目录（如 <code className="text-indigo-400 font-mono">{getInstallPath()}</code>）。
          </p>
        </div>

        <div
          className="border-l-4 border-emerald-500 border rounded-xl p-3.5 space-y-1"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-300 flex items-center justify-center text-[11px] font-mono font-bold">2</span>
            <span>第二步：配置客户端</span>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            按平台选择 Trae / Claude / Cursor 等，以 <code className="text-emerald-400">cat</code> 命令或纯 JSON 写入配置。
          </p>
        </div>

        <div
          className="border-l-4 border-amber-500 border rounded-xl p-3.5 space-y-1"
          style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
        >
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 flex items-center justify-center text-[11px] font-mono font-bold">3</span>
            <span>第三步：客户端验证与调试</span>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            重启对应 Agent，在 AI 对话框中直接调用 NovManager 资源与工具。
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 步骤一：安装服务端到系统目录 (Step 1: Install) */}
      {/* ========================================================================= */}
      <div
        className="border rounded-2xl p-5 space-y-4 shadow-sm"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 gap-2 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-xs font-bold text-indigo-300 font-mono">
              1
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              步骤一：将 NovManager MCP 服务端安装到系统目录
            </h3>
          </div>
          <span
            className="text-[11px] font-mono px-2.5 py-1 rounded-lg border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            安装目标: <span className="text-indigo-400">{getInstallPath()}</span>
          </span>
        </div>

        <div className="text-xs space-y-3" style={{ color: 'var(--text-main)' }}>
          <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            安装脚本会自动部署 Python 运行环境、依赖库并建立全局可执行命令。各操作系统执行命令如下：
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {/* 远程直接安装 */}
            <div
              className="border rounded-xl p-3.5 space-y-2"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>方式 A：终端一键命令安装 ({selectedOS.toUpperCase()})</span>
                </span>
                <button
                  onClick={() => copyToClipboard(getInstallCommand(), 'cmd-install')}
                  className="px-2 py-0.5 rounded text-[11px] transition flex items-center gap-1 border"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  {copiedKey === 'cmd-install' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                  <span>{copiedKey === 'cmd-install' ? '已复制' : '复制命令'}</span>
                </button>
              </div>
              <pre className="border rounded-lg p-2.5 font-mono text-[11px] text-emerald-400 overflow-x-auto" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                {getInstallCommand()}
              </pre>
              <span className="text-[10px] text-slate-500 block">
                {selectedOS === 'windows'
                  ? '在 Windows PowerShell 中粘贴回车，自动配置环境与 .bat 启动器。'
                  : '在终端回车，全自动完成依赖安装、软链接生成与握手自检。'}
              </span>
            </div>

            {/* 本地仓库直接安装 */}
            <div
              className="border rounded-xl p-3.5 space-y-2"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
                  <FolderCode className="w-3.5 h-3.5 text-indigo-400" />
                  <span>方式 B：本地工程源码目录直接执行</span>
                </span>
                <button
                  onClick={() => copyToClipboard(getLocalInstallCommand(), 'local-install')}
                  className="px-2 py-0.5 rounded text-[11px] transition flex items-center gap-1 border"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-main)',
                  }}
                >
                  {copiedKey === 'local-install' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                  <span>{copiedKey === 'local-install' ? '已复制' : '复制命令'}</span>
                </button>
              </div>
              <pre
                className="border rounded-lg p-2.5 font-mono text-[11px] overflow-x-auto text-indigo-400"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
              >
                {getLocalInstallCommand()}
              </pre>
              <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>
                若您当前已在本项目仓库目录中，直接运行该脚本即可。
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 步骤二：配置各 Agent 客户端 (Step 2: Configure) */}
      {/* ========================================================================= */}
      <div
        className="border rounded-2xl p-5 space-y-4 shadow-sm"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex flex-col md:flex-row md:items-center justify-between pb-3 gap-2 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-950 border border-emerald-800 flex items-center justify-center text-xs font-bold text-emerald-300 font-mono">
              2
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              步骤二：选择目标工具与配置方式 (支持 cat / 纯 JSON / TOML 自由切换)
            </h3>
          </div>

          {/* 配置形式切换器 Tab (终端命令 / 纯JSON / 路径说明) */}
          <div
            className="flex items-center p-1 rounded-xl border text-xs"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <button
              onClick={() => setConfigMode('terminal_cmd')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 font-medium ${
                configMode === 'terminal_cmd'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'hover:opacity-80'
              }`}
              style={{
                color: configMode === 'terminal_cmd' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              <Terminal className="w-3 h-3" />
              <span>⚡ 终端直执命令 ({selectedOS === 'windows' ? 'PowerShell' : 'cat'})</span>
            </button>

            <button
              onClick={() => setConfigMode('raw_json')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 font-medium ${
                configMode === 'raw_json'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'hover:opacity-80'
              }`}
              style={{
                color: configMode === 'raw_json' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              <FileJson className="w-3 h-3" />
              <span>📋 {selectedClient === 'codex' ? '纯 TOML 配置' : '纯 JSON 配置'}</span>
            </button>

            <button
              onClick={() => setConfigMode('path_guide')}
              className={`px-3 py-1 rounded-lg transition flex items-center gap-1.5 font-medium ${
                configMode === 'path_guide'
                  ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                  : 'hover:opacity-80'
              }`}
              style={{
                color: configMode === 'path_guide' ? '#ffffff' : 'var(--text-muted)',
              }}
            >
              <FileCode className="w-3 h-3" />
              <span>📁 配置文件路径说明</span>
            </button>
          </div>
        </div>

        {/* 客户端选择器横向滚动条 */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: 'trae', label: '字节跳动 Trae IDE', icon: Laptop },
            { id: 'claude', label: 'Claude Desktop', icon: Laptop },
            { id: 'cursor', label: 'Cursor / Windsurf', icon: Code2 },
            { id: 'codex', label: 'OpenAI Codex', icon: Terminal },
            { id: 'workbuddy', label: '腾讯 WorkBuddy / 企微', icon: Building2 },
            { id: 'zcode', label: '智谱 ZCode / 清言', icon: Sparkles },
            { id: 'sse', label: '远程 SSE 模式', icon: Globe },
          ].map((client) => {
            const Icon = client.icon;
            const isActive = selectedClient === client.id;
            return (
              <button
                key={client.id}
                onClick={() => setSelectedClient(client.id as ClientPlatform)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'hover:opacity-80'
                }`}
                style={{
                  backgroundColor: isActive ? '#059669' : 'var(--bg-card)',
                  borderColor: isActive ? '#10b981' : 'var(--border-subtle)',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{client.label}</span>
              </button>
            );
          })}
        </div>

        {/* 核心配置内容展示区 */}
        <div
          className="border rounded-xl p-4 space-y-3"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          {/* 特殊平台 1: 腾讯 WorkBuddy */}
          {selectedClient === 'workbuddy' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    腾讯 WorkBuddy / 企业微信智能体接入
                  </span>
                  <span className="text-[10px] text-slate-500">
                    支持以企业级 OpenAPI 插件或 MCP 远程 SSE 方式接入
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(openapiUrl, 'wb-openapi')}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  {copiedKey === 'wb-openapi' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'wb-openapi' ? 'URL 已复制' : '复制 OpenAPI 规范 URL'}</span>
                </button>
              </div>

              <div
                className="p-3 border rounded-lg space-y-2 text-[11px]"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              >
                <p>
                  <strong>方式 1（企业工作台插件）：</strong>在 WorkBuddy 工具管理中点击「添加自定义工具 → 导入 OpenAPI」，填入规范地址：
                </p>
                <code
                  className="block px-2.5 py-1.5 rounded border text-emerald-400 font-mono"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  {openapiUrl}
                </code>
                <p>
                  <strong>方式 2（MCP 远程流）：</strong>在 MCP 扩展中配置 Server-Sent Events 地址：
                </p>
                <code
                  className="block px-2.5 py-1.5 rounded border text-indigo-400 font-mono"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  {sseUrl}
                </code>
              </div>
            </div>
          )}

          {/* 特殊平台 2: 智谱 ZCode */}
          {selectedClient === 'zcode' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold block" style={{ color: 'var(--text-main)' }}>
                    智谱 ZCode / 智谱清言智能体平台
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    基于 GLM-4 Function Calling 原生导入 OpenAPI 3.0 工具集
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(openapiUrl, 'zcode-openapi')}
                  className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5"
                >
                  {copiedKey === 'zcode-openapi' ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedKey === 'zcode-openapi' ? 'URL 已复制' : '复制 OpenAPI URL'}</span>
                </button>
              </div>

              <div
                className="p-3 border rounded-lg space-y-2 text-[11px]"
                style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
              >
                <p>
                  在智谱清言智能体中心创建「写作助理」，在能力配置中选择「添加外部工具 → 导入 OpenAPI URL」，粘贴下方地址：
                </p>
                <code
                  className="block px-2.5 py-1.5 rounded border text-purple-400 font-mono"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                >
                  {openapiUrl}
                </code>
                <p style={{ color: 'var(--text-muted)' }}>
                  智谱将自动解析出 <code className="text-indigo-400">query_lore</code>、<code className="text-indigo-400">check_setting_consistency</code>、<code className="text-indigo-400">save_scene_draft</code> 等全部小说生产力工具。
                </p>
              </div>
            </div>
          )}

          {/* 通用平台 (Trae, Claude, Cursor, Codex, SSE) */}
          {selectedClient !== 'workbuddy' && selectedClient !== 'zcode' && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    {selectedClient === 'trae' && '字节跳动 Trae IDE 配置'}
                    {selectedClient === 'claude' && `Claude Desktop (${selectedOS.toUpperCase()}) 配置`}
                    {selectedClient === 'cursor' && 'Cursor / Windsurf 工程配置'}
                    {selectedClient === 'codex' && `OpenAI Codex (${selectedOS.toUpperCase()}) 配置`}
                    {selectedClient === 'sse' && '远程 SSE 网络端点配置'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    目标文件: <span className="text-indigo-300">{fileInfo.path}</span>
                  </span>
                </div>

                {/* 针对不同显示形态的复制按钮 */}
                {configMode === 'terminal_cmd' && (
                  <button
                    onClick={() => copyToClipboard(terminalCmd, 'btn-term')}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    {copiedKey === 'btn-term' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'btn-term' ? '命令已复制！' : '复制终端一键命令'}</span>
                  </button>
                )}

                {configMode === 'raw_json' && (
                  <button
                    onClick={() => copyToClipboard(rawJson, 'btn-json')}
                    className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-600 text-white rounded-lg text-xs font-medium transition flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                  >
                    {copiedKey === 'btn-json' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {copiedKey === 'btn-json'
                        ? selectedClient === 'codex'
                          ? 'TOML 已复制！'
                          : 'JSON 已复制！'
                        : selectedClient === 'codex'
                        ? '复制纯 TOML 配置'
                        : '复制纯 JSON 代码'}
                    </span>
                  </button>
                )}

                {configMode === 'path_guide' && (
                  <button
                    onClick={() => copyToClipboard(fileInfo.path, 'btn-path')}
                    className="px-3 py-1.5 border rounded-lg text-xs font-medium transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer hover:opacity-80"
                    style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  >
                    {copiedKey === 'btn-path' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    <span>{copiedKey === 'btn-path' ? '路径已复制！' : '复制文件绝对路径'}</span>
                  </button>
                )}
              </div>

              {/* 渲染内容 1: 终端直接执行命令 */}
              {configMode === 'terminal_cmd' && (
                <div className="space-y-3">
                  {selectedClient === 'codex' && (
                    <div className="bg-indigo-950/40 border border-indigo-800/80 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-indigo-200 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                          <span>方式 A：Codex CLI 官方一键添加命令 (最推荐)</span>
                        </span>
                        <button
                          onClick={() => copyToClipboard(codexCliCmd, 'btn-codex-cli')}
                          className="px-2.5 py-1 bg-indigo-700 hover:bg-indigo-600 text-white rounded text-[11px] transition flex items-center gap-1"
                        >
                          {copiedKey === 'btn-codex-cli' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-300" />
                          ) : (
                            <Copy className="w-3 h-3 text-indigo-200" />
                          )}
                          <span>{copiedKey === 'btn-codex-cli' ? '已复制' : '复制 CLI 命令'}</span>
                        </button>
                      </div>
                      <pre className="border rounded-lg p-2.5 font-mono text-[11px] text-emerald-400 overflow-x-auto" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                        {codexCliCmd}
                      </pre>
                      <span className="text-[10px] text-indigo-300/80 block">
                        直接调用 Codex 官方命令行工具，自动注册 nov-manager 并写入配置，即刻生效。
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {selectedClient === 'codex' && (
                      <span className="text-xs font-semibold text-slate-300 block">
                        方式 B：终端追加 TOML 配置 ({selectedOS === 'windows' ? 'PowerShell' : 'cat'})
                      </span>
                    )}
                    <pre className="border rounded-lg p-3 font-mono text-[11px] text-emerald-300 overflow-x-auto leading-relaxed" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)' }}>
                      {terminalCmd}
                    </pre>
                    <div className="p-2.5 border rounded-lg text-[11px] flex items-center gap-2" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                      <span>
                        {selectedOS === 'windows'
                          ? '在 Windows PowerShell 中粘贴上方命令回车，自动建立文件夹并以 UTF-8 编码安全写入配置。'
                          : selectedClient === 'codex'
                          ? '复制上方命令直接粘贴进终端回车，会自动创建 ~/.codex 目录并追加 TOML 配置。'
                          : '复制上方命令直接粘贴进终端回车即可完成写入，自动创建父级目录，无需手动打开隐藏文件夹。'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 渲染内容 2: 纯 JSON / TOML 代码 */}
              {configMode === 'raw_json' && (
                <div className="space-y-2">
                  <pre className="border rounded-lg p-3 font-mono text-[11px] overflow-x-auto leading-relaxed" style={{ backgroundColor: 'var(--bg-canvas)', borderColor: 'var(--border-subtle)', color: 'var(--accent-primary)' }}>
                    {rawJson}
                  </pre>
                  <p className="text-[11px] text-slate-500">
                    {selectedClient === 'codex' ? (
                      <>
                        💡 OpenAI Codex 使用 TOML 格式配置。全局配置为 <code className="text-slate-300">~/.codex/config.toml</code>，单工程配置可置于 <code className="text-slate-300">.codex/config.toml</code>。若已有文件直接追加上方片段。
                      </>
                    ) : (
                      <>
                        💡 供手动编辑配置文件的用户使用。若该文件内已有其他 MCP 插件，可将 <code className="text-slate-300">"nov-manager": &#123;...&#125;</code> 复制并合并到原有的 <code className="text-slate-300">mcpServers</code> 字典中。
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* 渲染内容 3: 路径说明与自动合并 */}
              {configMode === 'path_guide' && (
                <div
                  className="p-3.5 border rounded-lg space-y-3 text-[11px]"
                  style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                >
                  <div className="space-y-1">
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>1. 目标文件物理路径：</span>
                    <code
                      className="block px-2.5 py-1.5 rounded border text-indigo-400 font-mono text-xs"
                      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
                    >
                      {fileInfo.path}
                    </code>
                  </div>
                  <div className="space-y-1">
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>2. 路径角色与范围：</span>
                    <p style={{ color: 'var(--text-muted)' }}>{fileInfo.desc}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="block font-medium" style={{ color: 'var(--text-muted)' }}>3. 多作用域与格式支持：</span>
                    <p className="leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {selectedClient === 'codex'
                        ? 'OpenAI Codex 采用 TOML 格式。全局作用域位于 ~/.codex/config.toml（Windows 下为 %USERPROFILE%\\.codex\\config.toml）；亦可在工程根目录下创建 .codex/config.toml 实现当前小说的独占 MCP 挂载。'
                        : 'NovManager 的安装脚本已内置安全的配置 Merge 算法，执行安装命令时会保留您已安装的其他 MCP 插件（如 Filesystem、Git、Memory 等），仅安全更新 nov-manager 节点。'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 步骤三：验证与测试连通性 (Step 3: Test & Verify) */}
      {/* ========================================================================= */}
      <div
        className="border rounded-2xl p-5 space-y-4 shadow-sm"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
      >
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-xs font-bold text-amber-300 font-mono">
              3
            </div>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-main)' }}>
              步骤三：测试与验证客户端连通性
            </h3>
          </div>
          <span className="text-[11px] text-amber-400 font-medium">
            30秒极速自检
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div
            className="border rounded-xl p-3.5 space-y-2"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              <span>方法 1：命令行握手测试</span>
            </span>
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              在终端直接执行命令，验证安装目录的可执行程序是否响应 JSON-RPC 初始化报文：
            </p>
            <div
              className="flex items-center justify-between p-2 rounded-lg border"
              style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}
            >
              <code className="text-[11px] text-emerald-400 font-mono">
                {selectedOS === 'windows' ? 'nov-mcp.bat' : 'nov-mcp'}
              </code>
              <button
                onClick={() =>
                  copyToClipboard(
                    selectedOS === 'windows'
                      ? 'nov-mcp.bat'
                      : 'echo \'{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "test", "version": "1.0"}}}\' | nov-mcp',
                    'verify-cmd'
                  )
                }
                className="text-[10px] px-2 py-0.5 rounded border transition"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {copiedKey === 'verify-cmd' ? '已复制' : '复制自检测试'}
              </button>
            </div>
          </div>

          <div
            className="border rounded-xl p-3.5 space-y-2"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
          >
            <span className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-main)' }}>
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>方法 2：在 Trae / Claude 中体验</span>
            </span>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              重启 Claude Desktop 或在 Trae / Cursor 中重新加载窗口，在 AI 对话框中直接输入：
            </p>
            <div
              className="p-2.5 rounded-lg border text-[11px] italic"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              “请通过 nov-manager 检查《太虚纪元》当前有哪些登场角色，并列出战力法则”
            </div>
          </div>
        </div>

        {/* 底部引导卡 */}
        <div
          className="p-4 border rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <span className="font-semibold text-xs block" style={{ color: 'var(--text-main)' }}>
              想要实时查看 MCP 资源结构或模拟工具执行响应？
            </span>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              切换至【协议在线调试与资产看板】进行在线模拟调用与 Resource JSON 预览。
            </span>
          </div>

          <button
            onClick={onGoToInspector}
            className="px-4 py-2 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 whitespace-nowrap shadow-md"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            <span>进入协议调试看板</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
