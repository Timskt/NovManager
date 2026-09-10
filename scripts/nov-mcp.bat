@echo off
rem ==============================================================================
rem NovManager MCP Server Windows 启动器
rem 供 Windows 端 Claude Desktop / Trae / Cursor 调用
rem ==============================================================================

setlocal
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."

if exist "%ROOT_DIR%\backend\.venv\Scripts\python.exe" (
    set "PYTHON_BIN=%ROOT_DIR%\backend\.venv\Scripts\python.exe"
) else (
    set "PYTHON_BIN=python"
)

set "PYTHONPATH=%ROOT_DIR%\backend;%PYTHONPATH%"
set "PYTHONUNBUFFERED=1"

"%PYTHON_BIN%" "%ROOT_DIR%\backend\mcp_server.py" %*
