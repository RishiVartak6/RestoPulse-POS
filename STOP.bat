@echo off
title Restaurant POS - Stopping System
color 0C

echo.
echo  Stopping Restaurant POS System...
echo.

:: Kill all POS-related processes
taskkill /f /fi "WINDOWTITLE eq POS Backend (API)*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq POS Admin Panel*" >nul 2>&1
taskkill /f /fi "WINDOWTITLE eq POS Customer App*" >nul 2>&1

:: Kill uvicorn and node processes on specific ports
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":8000"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173"') do taskkill /f /pid %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174"') do taskkill /f /pid %%a >nul 2>&1

echo  All services stopped.
echo.
timeout /t 2 /nobreak >nul
