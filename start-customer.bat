@echo off
echo =============================================
echo   Restaurant POS - Starting Customer App
echo =============================================
cd /d "%~dp0frontend-customer"
echo Starting Customer App at http://localhost:5174
npm run dev
