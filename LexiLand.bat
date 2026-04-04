@echo off
REM LexiLand Read - Quick Launch Script
REM This script starts the development servers and opens the browser automatically

echo ============================================
echo    Starting LexiLand Read...
echo ============================================
echo.

REM Change to the project directory
cd /d "%~dp0"

REM Start the PowerShell script that launches backend and frontend
echo Starting servers...
start "" powershell -ExecutionPolicy Bypass -File "%~dp0start-dev.ps1"

REM Wait 6 seconds for servers to start
echo Waiting for servers to start (6 seconds)...
timeout /t 6 /nobreak >nul

REM Open browser automatically
echo Opening browser...
start "" "http://localhost:5173"

echo.
echo ============================================
echo    LexiLand Read is starting!
echo    Browser will open automatically
echo ============================================
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3000
echo.
echo Close the PowerShell windows to stop servers
echo.

REM Keep this window open for a moment
timeout /t 3 /nobreak >nul
exit
