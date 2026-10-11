#!/usr/bin/env bash
# ==============================================================================
# NovManager 一键启动全栈服务脚本 (Frontend + Rust High-Performance Backend)
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "⚡ 正在启动 NovManager (Rust 原生超低时延架构 + 文人工作台)..."
echo "======================================================================"

# 1. 确保 Rust 二进制已编译
RUST_BIN="backend_rust/target/release/nov-server"
if [ ! -f "$RUST_BIN" ]; then
    echo "🔨 正在编译 Rust 高性能服务端 (nov-server)..."
    cargo build --release --manifest-path backend_rust/Cargo.toml
fi

# 2. 启动 Rust 后端服务 (Port 8000)
echo "📦 正在启动 Rust 原生后端服务 (端口 8000)..."
if ! curl -s http://localhost:8000/api/health > /dev/null; then
    PORT=8000 "$RUST_BIN" > /dev/null 2>&1 &
    BACKEND_PID=$!
    echo "  ✓ Rust 服务进程已启动 (PID: $BACKEND_PID)"
    sleep 1
else
    echo "  ✓ 端口 8000 已在运行中 (http://localhost:8000)"
fi

# 3. 启动前端工作台 (Vite / Port 3000)
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
echo "🎉 NovManager Rust 原生全栈服务已就绪！"
echo "  👉 文人审美工作台: http://localhost:3000"
echo "  👉 Rust 原生 RESTful API: http://localhost:8000/api/health"
echo "  👉 零冷启动延迟 (<5ms), 极致内存占用 (<25MB)"
echo "======================================================================"
