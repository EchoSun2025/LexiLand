#!/usr/bin/env pwsh
# Tauri Environment Check - Windows

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Tauri Dev Environment Check" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$allGood = $true

# 1. Check Node.js
Write-Host "[1/5] Checking Node.js..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    if ($nodeVersion) {
        Write-Host "  [OK] Node.js: $nodeVersion" -ForegroundColor Green
    } else {
        Write-Host "  [X] Node.js not installed" -ForegroundColor Red
        Write-Host "      Download: https://nodejs.org/" -ForegroundColor Gray
        $allGood = $false
    }
} catch {
    Write-Host "  [X] Node.js not installed" -ForegroundColor Red
    Write-Host "      Download: https://nodejs.org/" -ForegroundColor Gray
    $allGood = $false
}

# 2. Check npm
Write-Host "`n[2/5] Checking npm..." -ForegroundColor Yellow
try {
    $npmVersion = npm --version 2>$null
    if ($npmVersion) {
        Write-Host "  [OK] npm: v$npmVersion" -ForegroundColor Green
    } else {
        Write-Host "  [X] npm not installed" -ForegroundColor Red
        $allGood = $false
    }
} catch {
    Write-Host "  [X] npm not installed" -ForegroundColor Red
    $allGood = $false
}

# 3. Check Rust
Write-Host "`n[3/5] Checking Rust..." -ForegroundColor Yellow
try {
    $rustcVersion = rustc --version 2>$null
    $cargoVersion = cargo --version 2>$null
    if ($rustcVersion -and $cargoVersion) {
        Write-Host "  [OK] Rust: $rustcVersion" -ForegroundColor Green
        Write-Host "  [OK] Cargo: $cargoVersion" -ForegroundColor Green
    } else {
        Write-Host "  [X] Rust not installed" -ForegroundColor Red
        Write-Host "      Download: https://rustup.rs/" -ForegroundColor Gray
        Write-Host "      Or run: winget install Rustlang.Rustup" -ForegroundColor Gray
        $allGood = $false
    }
} catch {
    Write-Host "  [X] Rust not installed" -ForegroundColor Red
    Write-Host "      Download: https://rustup.rs/" -ForegroundColor Gray
    $allGood = $false
}

# 4. Check Visual Studio C++ Build Tools
Write-Host "`n[4/5] Checking C++ Build Tools..." -ForegroundColor Yellow
$vswhere = Join-Path ${env:ProgramFiles(x86)} "Microsoft Visual Studio\Installer\vswhere.exe"
if (Test-Path $vswhere) {
    $vsPath = & $vswhere -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath 2>$null
    if ($vsPath) {
        Write-Host "  [OK] Visual Studio C++ Build Tools installed" -ForegroundColor Green
        Write-Host "      Path: $vsPath" -ForegroundColor Gray
    } else {
        Write-Host "  [!] Visual Studio installed but C++ tools may be missing" -ForegroundColor Yellow
        Write-Host "      Install 'Desktop development with C++' workload" -ForegroundColor Gray
        $allGood = $false
    }
} else {
    Write-Host "  [!] Visual Studio Build Tools not detected" -ForegroundColor Yellow
    Write-Host "      Download: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Gray
    Write-Host "      Or Build Tools: https://aka.ms/vs/17/release/vs_BuildTools.exe" -ForegroundColor Gray
    $allGood = $false
}

# 5. Check WebView2 Runtime
Write-Host "`n[5/5] Checking WebView2 Runtime..." -ForegroundColor Yellow
$webview2Paths = @(
    (Join-Path $env:ProgramFiles "Microsoft\EdgeWebView\Application"),
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\EdgeWebView\Application")
)
$webview2Found = $false
foreach ($path in $webview2Paths) {
    if (Test-Path $path) {
        $versions = Get-ChildItem $path -Directory -ErrorAction SilentlyContinue
        if ($versions) {
            Write-Host "  [OK] WebView2 Runtime installed" -ForegroundColor Green
            $latestVer = ($versions | Sort-Object Name -Descending | Select-Object -First 1).Name
            Write-Host "      Version: $latestVer" -ForegroundColor Gray
            $webview2Found = $true
            break
        }
    }
}
if (-not $webview2Found) {
    Write-Host "  [!] WebView2 Runtime not installed (needed at runtime)" -ForegroundColor Yellow
    Write-Host "      Download: https://go.microsoft.com/fwlink/p/?LinkId=2124703" -ForegroundColor Gray
}

# Summary
Write-Host "`n========================================" -ForegroundColor Cyan
if ($allGood) {
    Write-Host "[OK] All required dependencies installed!" -ForegroundColor Green
    Write-Host "     Ready for Tauri development!" -ForegroundColor Green
} else {
    Write-Host "[X] Some dependencies are missing" -ForegroundColor Red
    Write-Host "    Please check the installation instructions above" -ForegroundColor Gray
}
Write-Host "========================================`n" -ForegroundColor Cyan

# Extra: Check Tauri CLI
Write-Host "Extra Check:" -ForegroundColor Cyan
try {
    $tauriVersion = cargo tauri --version 2>$null
    if ($tauriVersion) {
        Write-Host "  [OK] Tauri CLI: $tauriVersion" -ForegroundColor Green
    } else {
        Write-Host "  [!] Tauri CLI not installed (will auto-install on first use)" -ForegroundColor Yellow
        Write-Host "      Manual install: cargo install tauri-cli" -ForegroundColor Gray
    }
} catch {
    Write-Host "  [!] Tauri CLI not installed (will auto-install on first use)" -ForegroundColor Yellow
}

Write-Host ""
