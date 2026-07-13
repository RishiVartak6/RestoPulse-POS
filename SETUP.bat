@echo off
title Restaurant POS - First Time Setup
color 0A

echo.
echo  ██████╗ ███████╗███████╗████████╗ █████╗ ██╗   ██╗██████╗  █████╗ ███╗   ██╗████████╗
echo  ██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔══██╗██║   ██║██╔══██╗██╔══██╗████╗  ██║╚══██╔══╝
echo  ██████╔╝█████╗  ███████╗   ██║   ███████║██║   ██║██████╔╝███████║██╔██╗ ██║   ██║
echo  ██╔══██╗██╔══╝  ╚════██║   ██║   ██╔══██║██║   ██║██╔══██╗██╔══██║██║╚██╗██║   ██║
echo  ██║  ██║███████╗███████║   ██║   ██║  ██║╚██████╔╝██║  ██║██║  ██║██║ ╚████║   ██║
echo  ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝
echo.
echo                         POS SYSTEM - FIRST TIME SETUP
echo.
echo  This will install everything needed to run the Restaurant POS system.
echo  Please wait - this may take 2-5 minutes depending on your internet speed.
echo.
pause

:: ─── Step 1: Check Python ─────────────────────────────────────────────────────
echo.
echo [1/5] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Python is not installed!
    echo.
    echo  Please install Python 3.10 or newer from:
    echo  https://www.python.org/downloads/
    echo.
    echo  IMPORTANT: During installation, check "Add Python to PATH"
    echo.
    pause
    exit /b 1
)
python --version
echo  Python OK!

:: ─── Step 2: Check Node.js ────────────────────────────────────────────────────
echo.
echo [2/5] Checking Node.js installation...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  ERROR: Node.js is not installed!
    echo.
    echo  Please install Node.js from:
    echo  https://nodejs.org/en/download
    echo.
    echo  Download the "LTS" version (recommended).
    echo.
    pause
    exit /b 1
)
node --version
npm --version
echo  Node.js OK!

:: ─── Step 3: Backend Setup ────────────────────────────────────────────────────
echo.
echo [3/5] Setting up Backend (Python)...
cd /d "%~dp0backend"

if not exist "venv" (
    echo  Creating Python virtual environment...
    python -m venv venv
)

echo  Installing Python packages (this may take a minute)...
venv\Scripts\pip.exe install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo  ERROR: Failed to install Python packages.
    echo  Check your internet connection and try again.
    pause
    exit /b 1
)
echo  Backend packages installed!

:: ─── Step 4: Admin Frontend Setup ─────────────────────────────────────────────
echo.
echo [4/5] Setting up Admin Panel (this may take a minute)...
cd /d "%~dp0frontend-admin"
call npm install --silent
if %errorlevel% neq 0 (
    echo  ERROR: Failed to install admin panel packages.
    pause
    exit /b 1
)
echo  Admin panel ready!

:: ─── Step 5: Customer App Setup ───────────────────────────────────────────────
echo.
echo [5/5] Setting up Customer App...
cd /d "%~dp0frontend-customer"
call npm install --silent
if %errorlevel% neq 0 (
    echo  ERROR: Failed to install customer app packages.
    pause
    exit /b 1
)
echo  Customer app ready!

:: ─── Done ─────────────────────────────────────────────────────────────────────
echo.
echo ============================================================
echo   SETUP COMPLETE!
echo ============================================================
echo.
echo   Next steps:
echo   1. Double-click START.bat to launch the system
echo   2. Open http://localhost:5173 on any computer on this network
echo.
echo   Admin Login:
echo     Email:    admin@restaurant.com
echo     Password: admin123
echo.
echo   IMPORTANT: Change your password after first login in Settings!
echo.
pause
