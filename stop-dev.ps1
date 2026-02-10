# LexiLand Read - Stop Development Servers
# This script stops all Node.js processes (backend and frontend servers)

Write-Host "=== Stopping LexiLand Read Development Servers ===" -ForegroundColor Red
Write-Host ""

# Find and stop Node.js processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue

if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node.js process(es)" -ForegroundColor Yellow
    Write-Host "Stopping all Node.js processes..." -ForegroundColor Yellow
    
    $nodeProcesses | ForEach-Object {
        Write-Host "  Stopping process $($_.Id)..." -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force
    }
    
    Write-Host ""
    Write-Host "✓ All servers stopped" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found (servers may not be running)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Press any key to exit..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
