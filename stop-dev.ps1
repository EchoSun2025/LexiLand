# LexiLand Read 停止脚本
# 使用方法: 右键此文件 -> "使用 PowerShell 运行"

Write-Host "==================================" -ForegroundColor Red
Write-Host "  停止 LexiLand Read 服务" -ForegroundColor Red
Write-Host "==================================" -ForegroundColor Red

# 停止前端 (5173)
Write-Host "`n正在停止前端服务..." -ForegroundColor Yellow
$port5173 = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($port5173) {
    Stop-Process -Id $port5173.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "已停止前端服务 (端口 5173)" -ForegroundColor Green
} else {
    Write-Host "前端服务未运行" -ForegroundColor Gray
}

# 停止后端 (3000)
Write-Host "`n正在停止后端服务..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"}
if ($port3000) {
    Stop-Process -Id $port3000.OwningProcess -Force -ErrorAction SilentlyContinue
    Write-Host "已停止后端服务 (端口 3000)" -ForegroundColor Green
} else {
    Write-Host "后端服务未运行" -ForegroundColor Gray
}

Write-Host "`n==================================" -ForegroundColor Green
Write-Host "  所有服务已停止" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green

Write-Host "`n按任意键退出..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
