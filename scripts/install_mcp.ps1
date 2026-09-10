# ==============================================================================
# NovManager MCP Windows PowerShell 一键安装配置脚本
# ==============================================================================

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$InstallDir = "$env:USERPROFILE\.local\bin"

if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
}

Copy-Item "$RootDir\scripts\nov-mcp.bat" "$InstallDir\nov-mcp.bat" -Force
Copy-Item "$RootDir\scripts\nov-mcp.ps1" "$InstallDir\nov-mcp.ps1" -Force

Write-Host "✓ NovManager MCP 已成功安装至 $InstallDir" -ForegroundColor Green

# 自动写入 Claude Desktop Windows 配置
$ClaudeConfigDir = "$env:APPDATA\Claude"
if (!(Test-Path $ClaudeConfigDir)) {
    New-Item -ItemType Directory -Force -Path $ClaudeConfigDir | Out-Null
}
$ClaudeConfigFile = "$ClaudeConfigDir\claude_desktop_config.json"
$ConfigJson = @"
{
  "mcpServers": {
    "nov-manager": {
      "command": "$InstallDir\nov-mcp.bat",
      "args": []
    }
  }
}
"@
Set-Content -Path $ClaudeConfigFile -Value $ConfigJson -Encoding UTF8
Write-Host "✓ 已写入 Claude Desktop 配置: $ClaudeConfigFile" -ForegroundColor Green

# 写入 Trae 与 Cursor 配置
$TraeDir = "$RootDir\.trae"
if (!(Test-Path $TraeDir)) { New-Item -ItemType Directory -Force -Path $TraeDir | Out-Null }
Set-Content -Path "$TraeDir\mcp.json" -Value $ConfigJson -Encoding UTF8

$CursorDir = "$RootDir\.cursor"
if (!(Test-Path $CursorDir)) { New-Item -ItemType Directory -Force -Path $CursorDir | Out-Null }
Set-Content -Path "$CursorDir\mcp.json" -Value $ConfigJson -Encoding UTF8
Write-Host "✓ 已写入 .trae\mcp.json 与 .cursor\mcp.json" -ForegroundColor Green
