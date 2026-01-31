# LexiLand Read 一键启动脚本
# 使用方法: 右键此文件 -> "使用 PowerShell 运行"

Write-Host "==================================" -ForegroundColor Cyan
Write-Host "  LexiLand Read 快速启动" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan

$projectRoot = "D:\00working\20260110_CODE_Lexiland_read"

# 检查并清理 5173 端口
Write-Host "`n[1/3] 检查端口占用..." -ForegroundColor Yellow
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($port5173) {
    Write-Host "端口 5173 已被占用，正在关闭..." -ForegroundColor Yellow
    $processId = $port5173.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "已清理端口 5173" -ForegroundColor Green
} else {
    Write-Host "端口 5173 可用" -ForegroundColor Green
}

# 检查并清理 3000 端口（后端）
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($port3000) {
    Write-Host "端口 3000 已被占用，正在关闭..." -ForegroundColor Yellow
    $processId = $port3000.OwningProcess
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    Write-Host "已清理端口 3000" -ForegroundColor Green
}

# 启动前端
Write-Host "`n[2/3] 启动前端服务器..." -ForegroundColor Yellow
cd "$projectRoot\frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\frontend'; npm run dev" -WindowStyle Normal
Start-Sleep -Seconds 3

# 启动后端
Write-Host "`n[3/3] 启动后端服务器..." -ForegroundColor Yellow
cd "$projectRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectRoot\backend'; npm run dev" -WindowStyle Normal

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "  启动完成！" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

Write-Host "`n服务地址：" -ForegroundColor Yellow
Write-Host "  前端: http://localhost:5173" -ForegroundColor Cyan
Write-Host "  后端: http://localhost:3000" -ForegroundColor Cyan

Write-Host "`n提示：" -ForegroundColor Yellow
Write-Host "  - 等待 5-10 秒让服务器完全启动" -ForegroundColor White
Write-Host "  - 如果浏览器无法连接，请再次运行此脚本" -ForegroundColor White
Write-Host "  - 关闭窗口前请先关闭新打开的两个 PowerShell 窗口" -ForegroundColor White

Write-Host "`n按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
