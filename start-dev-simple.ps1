# LexiLand Read 简单启动（只启动前端）
# 使用方法: 右键此文件 -> "使用 PowerShell 运行"

$projectRoot = "D:\00working\20260110_CODE_Lexiland_read"

Write-Host "正在启动前端..." -ForegroundColor Cyan

# 清理端口
$port = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($port) {
    Stop-Process -Id $port.OwningProcess -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# 启动
cd "$projectRoot\frontend"
npm run dev
