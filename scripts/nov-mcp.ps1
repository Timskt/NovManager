# ==============================================================================
# NovManager MCP Server PowerShell 启动器
# ==============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

$PythonBin = if (Test-Path "$RootDir\backend\.venv\Scripts\python.exe") {
    "$RootDir\backend\.venv\Scripts\python.exe"
} else {
    "python"
}

$env:PYTHONPATH = "$RootDir\backend;" + $env:PYTHONPATH
$env:PYTHONUNBUFFERED = "1"

& $PythonBin "$RootDir\backend\mcp_server.py" @args
