#!/usr/bin/env python3
# ==============================================================================
# NovManager MCP Server 独立启动入口
# 供 Claude Desktop / Cursor / 外部 Agent 命令直接唤起
# ==============================================================================

import os
import sys

# 将 backend 根目录加入 PYTHONPATH
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app.mcp.server import mcp

if __name__ == "__main__":
    mcp.run()
