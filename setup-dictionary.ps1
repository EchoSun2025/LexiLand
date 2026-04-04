# Setup ECDICT Dictionary for LexiLand Read
# 此脚本会下载并转换 ECDICT 词典

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ECDICT Dictionary Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Python
Write-Host "Checking Python..." -ForegroundColor Yellow
$pythonCmd = $null

# 尝试找到 Python
$pythonCommands = @("python", "python3", "py")
foreach ($cmd in $pythonCommands) {
    try {
        $version = & $cmd --version 2>&1
        if ($version -match "Python") {
            $pythonCmd = $cmd
            Write-Host "  Found: $version" -ForegroundColor Green
            break
        }
    } catch {
        continue
    }
}

if (-not $pythonCmd) {
    Write-Host "  Python not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Python first:" -ForegroundColor Yellow
    Write-Host "  https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Or download manually:" -ForegroundColor Yellow
    Write-Host "  1. Visit: https://github.com/skywind3000/ECDICT" -ForegroundColor Cyan
    Write-Host "  2. Download stardict.csv" -ForegroundColor Cyan
    Write-Host "  3. Run: python scripts/convert_ecdict.py stardict.csv" -ForegroundColor Cyan
    pause
    exit 1
}

Write-Host ""

# 切换到 scripts 目录
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptsPath = Join-Path $scriptDir "scripts"

if (-not (Test-Path $scriptsPath)) {
    Write-Host "Creating scripts directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $scriptsPath | Out-Null
}

Set-Location $scriptsPath

# 运行下载脚本
Write-Host "Running download script..." -ForegroundColor Yellow
Write-Host ""

& $pythonCmd download_ecdict.py

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Setup failed! Please try manual download." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "  1. Download from: https://github.com/skywind3000/ECDICT" -ForegroundColor Cyan
    Write-Host "  2. Place stardict.csv in: $scriptsPath" -ForegroundColor Cyan
    Write-Host "  3. Run: python convert_ecdict.py" -ForegroundColor Cyan
    pause
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Restart your development server" -ForegroundColor Cyan
Write-Host "  2. Open http://localhost:5175" -ForegroundColor Cyan
Write-Host "  3. Click Settings (gear icon)" -ForegroundColor Cyan
Write-Host "  4. Check dictionary status" -ForegroundColor Cyan
Write-Host ""
pause
