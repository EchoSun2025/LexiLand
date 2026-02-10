# LexiLand Read Development Startup Script
# This script starts both backend and frontend servers concurrently

Write-Host "=== Starting LexiLand Read Development Servers ===" -ForegroundColor Cyan
Write-Host ""

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    $connection = Test-NetConnection -ComputerName localhost -Port $Port -WarningAction SilentlyContinue -InformationLevel Quiet
    return $connection
}

# Check if ports are already in use
Write-Host "Checking ports..." -ForegroundColor Yellow
$backendPort = 3000
$frontendPort = 5173

if (Test-Port -Port $backendPort) {
    Write-Host "⚠️  Port $backendPort is already in use (backend may already be running)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port $backendPort is available" -ForegroundColor Green
}

if (Test-Port -Port $frontendPort) {
    Write-Host "⚠️  Port $frontendPort is already in use (frontend may already be running)" -ForegroundColor Yellow
} else {
    Write-Host "✓ Port $frontendPort is available" -ForegroundColor Green
}

Write-Host ""

# Start backend server in a new PowerShell window
Write-Host "Starting backend server (port $backendPort)..." -ForegroundColor Cyan
$backendPath = Join-Path $scriptDir "backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host 'Backend Server' -ForegroundColor Green; npm run dev"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start frontend server in a new PowerShell window
Write-Host "Starting frontend server (port $frontendPort)..." -ForegroundColor Cyan
$frontendPath = Join-Path $scriptDir "frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host 'Frontend Server' -ForegroundColor Blue; npm run dev"

Write-Host ""
Write-Host "=== Servers Starting ===" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:$backendPort" -ForegroundColor Yellow
Write-Host "Health:   http://localhost:$backendPort/health" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:$frontendPort" -ForegroundColor Yellow
Write-Host ""
Write-Host "Two new PowerShell windows have opened." -ForegroundColor Cyan
Write-Host "Close those windows to stop the servers." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press any key to exit this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
