@echo off
echo =============================================
echo     Restaurant POS - Starting Admin Panel
echo =============================================
cd /d "%~dp0frontend-admin"
echo Starting Admin at http://localhost:5173
npm run dev
