@echo off
title Restaurant POS - Starting System...
color 0A

echo.
echo  ====================================================
echo       Restaurant POS System - Starting...
echo  ====================================================
echo.

:: Check if setup was done
if not exist "%~dp0backend\venv" (
    echo  ERROR: Setup not completed!
    echo  Please run SETUP.bat first.
    echo.
    pause
    exit /b 1
)

:: Get the local IP address for network access
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set LOCAL_IP=%%a
    goto :got_ip
)
:got_ip
set LOCAL_IP=%LOCAL_IP: =%

echo  Starting all services...
echo.

:: Start Backend in new window
start "POS Backend (API)" /min cmd /c "cd /d "%~dp0backend" && venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000"

:: Wait for backend to start
echo  Waiting for backend to start...
timeout /t 3 /nobreak >nul

:: Start Admin Panel in new window
start "POS Admin Panel" /min cmd /c "cd /d "%~dp0frontend-admin" && npm run dev -- --host"

:: Start Customer App in new window
start "POS Customer App" /min cmd /c "cd /d "%~dp0frontend-customer" && npm run dev -- --host --port 5174"

:: Wait a moment
timeout /t 4 /nobreak >nul

:: Open Admin Panel in browser
start http://localhost:5173

echo.
echo  ====================================================
echo   ALL SYSTEMS RUNNING!
echo  ====================================================
echo.
echo   ADMIN PANEL (for staff/owner):
echo     This computer:   http://localhost:5173
echo     Other devices:   http://%LOCAL_IP%:5173
echo.
echo   CUSTOMER MENU (for customers at tables):
echo     This computer:   http://localhost:5174
echo     Other devices:   http://%LOCAL_IP%:5174
echo.
echo   Default Login:
echo     Email:    admin@restaurant.com
echo     Password: admin123
echo.
echo  ====================================================
echo   To STOP the system: close this window and run STOP.bat
echo   Or simply close all the black "POS" windows.
echo  ====================================================
echo.
echo  Press any key to open the Admin Panel in browser...
pause >nul
start http://localhost:5173
