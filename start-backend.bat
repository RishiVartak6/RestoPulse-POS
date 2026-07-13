@echo off
echo =============================================
echo     Restaurant POS - Starting Backend
echo =============================================

:: Always run from the backend directory
cd /d "%~dp0backend"

:: Create venv if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Installing dependencies...
    venv\Scripts\pip.exe install -r requirements.txt -q
) else (
    call venv\Scripts\activate.bat
)

echo.
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/api/docs
echo.
echo  Run start-admin.bat and start-customer.bat in separate windows.
echo.

:: IMPORTANT: must be run from the "backend" directory with "app.main:app"
venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000 --reload
