#!/usr/bin/env bash
# ==============================================================================
# NovManager 一键启动全栈服务脚本 (Frontend + Backend)
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "🚀 正在启动 NovManager AI 辅助小说管理与创作平台..."
echo "======================================================================"

# 1. 启动后端服务 (FastAPI / Port 8000)
echo "📦 正在启动后端 FastAPI 服务 (端口 8000)..."
if ! curl -s http://localhost:8000/api/health > /dev/null; then
    ./backend/.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --app-dir backend > /dev/null 2>&1 &
    BACKEND_PID=$!
    echo "  ✓ 后端进程已启动 (PID: $BACKEND_PID)"
    sleep 2
else
    echo "  ✓ 后端服务已在运行中 (http://localhost:8000)"
fi

# 2. 启动前端工作台 (Vite / Port 3000)
echo "🖥️ 正在启动 Web 工作台 (端口 3000)..."
if ! curl -s http://localhost:3000/ > /dev/null; then
    pnpm dev > /dev/null 2>&1 &
    FRONTEND_PID=$!
    echo "  ✓ 前端进程已启动 (PID: $FRONTEND_PID)"
    sleep 2
else
    echo "  ✓ 前端工作台已在运行中 (http://localhost:3000)"
fi

echo "======================================================================"
echo "🎉 NovManager 全套服务已就绪！"
echo "  👉 Web 可视化创作工作台: http://localhost:3000"
echo "  👉 RESTful API 与 Swagger 文档: http://localhost:8000/docs"
echo "  👉 MCP 服务端入口: backend/mcp_server.py"
echo "  👉 独立外部 Agent 写书测试: python scripts/external_agent_writer.py"
echo "======================================================================"
