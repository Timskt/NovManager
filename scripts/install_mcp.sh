#!/usr/bin/env bash
# ==============================================================================
# NovManager MCP 一键安装与客户端配置自动化脚本
# 规范流程：
# 步骤一：环境自检并将 nov-mcp 启动器安装至系统可执行目录 (~/.local/bin/nov-mcp)
# 步骤二：依据安装目录，自动配置 Claude Desktop / Trae / Cursor 配置文件
# 步骤三：执行 JSON-RPC 协议握手自检并输出一键终端 cat 快捷命令
# ==============================================================================

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${BLUE}======================================================================${NC}"
echo -e "${GREEN}      NovManager MCP (Model Context Protocol) 安装与配置向导          ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# 获取项目根目录绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
SOURCE_LAUNCHER="${ROOT_DIR}/scripts/nov-mcp"

# 默认安装目录为用户标准可执行路径 (~/.local/bin)
INSTALL_DIR="${INSTALL_DIR:-$HOME/.local/bin}"
INSTALLED_LAUNCHER="${INSTALL_DIR}/nov-mcp"

# ------------------------------------------------------------------------------
# 步骤一：环境检测与安装 (Step 1: Install)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}【步骤一：检测环境并安装 MCP 服务端至系统目录】${NC}"

# 1. 检查 Python
if [ -x "${ROOT_DIR}/backend/.venv/bin/python" ]; then
    PYTHON_EXEC="${ROOT_DIR}/backend/.venv/bin/python"
    echo -e "  ✓ 使用项目独立虚拟环境: ${GREEN}${PYTHON_EXEC}${NC}"
elif command -v python3 >/dev/null 2>&1; then
    PYTHON_EXEC="$(command -v python3)"
    echo -e "  ✓ 使用系统 Python: ${GREEN}${PYTHON_EXEC}${NC}"
else
    echo -e "${RED}  ✗ 错误: 未检测到 Python 3.10+，请先安装 Python${NC}"
    exit 1
fi

# 2. 检查依赖库
if ! "${PYTHON_EXEC}" -c "import mcp" >/dev/null 2>&1; then
    echo -e "  ${YELLOW}正在自动安装 MCP SDK 与必要依赖...${NC}"
    "${PYTHON_EXEC}" -m pip install mcp fastapi uvicorn pydantic httpx
    echo -e "  ✓ 依赖安装完成"
else
    echo -e "  ✓ MCP 官方 SDK 已就绪"
fi

# 3. 安装 nov-mcp 到系统可执行目录
mkdir -p "${INSTALL_DIR}"
chmod +x "${SOURCE_LAUNCHER}"
ln -sf "${SOURCE_LAUNCHER}" "${INSTALLED_LAUNCHER}"
chmod +x "${INSTALLED_LAUNCHER}"
echo -e "  ✓ 启动器已成功安装至: ${GREEN}${INSTALLED_LAUNCHER}${NC}"

# 4. 执行握手自检
TEST_INIT='{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2024-11-05", "capabilities": {}, "clientInfo": {"name": "nov-install-check", "version": "1.0.0"}}}'
RESP=$(echo "${TEST_INIT}" | "${INSTALLED_LAUNCHER}" 2>/dev/null || true)
if echo "${RESP}" | grep -q "NovManager-MCP"; then
    echo -e "  ✓ 安装自检成功！Stdio 协议通信正常响应"
else
    echo -e "  ${YELLOW}⚠️  警告: 自检响应非预期，请确认 Python 环境${NC}"
fi

# ------------------------------------------------------------------------------
# 步骤二：配置客户端 (Step 2: Configure Clients)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}【步骤二：自动写入各 Agent 客户端配置文件】${NC}"

# 1. 配置 Claude Desktop
CLAUDE_CONFIG_DIR=""
case "$(uname -s)" in
    Darwin)
        CLAUDE_CONFIG_DIR="${HOME}/Library/Application Support/Claude"
        ;;
    Linux)
        CLAUDE_CONFIG_DIR="${HOME}/.config/Claude"
        ;;
    MINGW*|MSYS*|CYGWIN*)
        CLAUDE_CONFIG_DIR="${APPDATA}/Claude"
        ;;
    *)
        CLAUDE_CONFIG_DIR="${HOME}/.config/Claude"
        ;;
esac

CLAUDE_CONFIG_FILE="${CLAUDE_CONFIG_DIR}/claude_desktop_config.json"
mkdir -p "${CLAUDE_CONFIG_DIR}"

export CLAUDE_CONFIG_DIR INSTALLED_LAUNCHER
"${PYTHON_EXEC}" - << 'PYEOF'
import json
import os

config_dir = os.environ.get("CLAUDE_CONFIG_DIR", "")
config_file = os.path.join(config_dir, "claude_desktop_config.json")
cmd_path = os.environ.get("INSTALLED_LAUNCHER", "")

data = {}
if os.path.exists(config_file):
    try:
        with open(config_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = {}

if "mcpServers" not in data:
    data["mcpServers"] = {}

data["mcpServers"]["nov-manager"] = {
    "command": cmd_path,
    "args": []
}

with open(config_file, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"  ✓ 已安全注入 Claude Desktop 配置: {config_file}")
PYEOF

# 2. 配置本地工程的 Trae (.trae/mcp.json) 与 Cursor (.cursor/mcp.json)
mkdir -p "${ROOT_DIR}/.trae" "${ROOT_DIR}/.cursor"
cat << CURSOR_EOF > "${ROOT_DIR}/.trae/mcp.json"
{
  "mcpServers": {
    "nov-manager": {
      "command": "${INSTALLED_LAUNCHER}",
      "args": []
    }
  }
}
CURSOR_EOF
cp "${ROOT_DIR}/.trae/mcp.json" "${ROOT_DIR}/.cursor/mcp.json"
echo -e "  ✓ 已写入 Trae 配置文件: ${GREEN}${ROOT_DIR}/.trae/mcp.json${NC}"
echo -e "  ✓ 已写入 Cursor 配置文件: ${GREEN}${ROOT_DIR}/.cursor/mcp.json${NC}"

# ------------------------------------------------------------------------------
# 步骤三：验证与速查 (Step 3: Verification & Manual Commands)
# ------------------------------------------------------------------------------
echo -e "\n${CYAN}【步骤三：安装与配置完成，客户端即可直接使用】${NC}"
echo -e "已安装命令: ${GREEN}${INSTALLED_LAUNCHER}${NC} (已加入 PATH 可直接运行 ${GREEN}nov-mcp${NC})"
echo -e "\n${YELLOW}备用：若需在其他机器手动写入配置，可直接复制下列 cat 命令在终端执行：${NC}"

echo -e "\n${BLUE}# 写入 Claude Desktop 配置 (Linux/macOS):${NC}"
echo -e "mkdir -p \"${CLAUDE_CONFIG_DIR}\" && cat << 'EOF' > \"${CLAUDE_CONFIG_FILE}\"
{
  \"mcpServers\": {
    \"nov-manager\": {
      \"command\": \"${INSTALLED_LAUNCHER}\",
      \"args\": []
    }
  }
}
EOF"

echo -e "\n${BLUE}# 写入 Trae 配置 (.trae/mcp.json):${NC}"
echo -e "mkdir -p .trae && cat << 'EOF' > .trae/mcp.json
{
  \"mcpServers\": {
    \"nov-manager\": {
      \"command\": \"${INSTALLED_LAUNCHER}\",
      \"args\": []
    }
  }
}
EOF"

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN}🎉 全部完成！重启 Claude Desktop 或在 Trae / Cursor 中即可畅享 AI 写作！${NC}"
echo -e "${GREEN}======================================================================${NC}\n"
