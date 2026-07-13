@echo off
title Preparing Restaurant POS for Transfer
color 0B

echo.
echo  ====================================================
echo    Preparing a CLEAN COPY for Transfer
echo    (Removing large auto-generated folders)
echo  ====================================================
echo.

set SOURCE=%~dp0
set DEST=%~dp0..\Billing-TO-COPY

echo  Creating clean copy at:
echo  %DEST%
echo.

:: Remove old copy if exists
if exist "%DEST%" rmdir /s /q "%DEST%"

:: Copy everything except large folders
echo  Copying files (this takes 30-60 seconds)...
xcopy "%SOURCE%*" "%DEST%\" /E /I /Q /EXCLUDE:"%~dp0exclude-list.txt"

echo.
echo  ====================================================
echo   DONE! Your transfer-ready folder is at:
echo   %DEST%
echo.
echo   Copy the "Billing-TO-COPY" folder to a USB drive
echo   or share it with the restaurant.
echo.
echo   Size should be about 10-30 MB (much smaller!)
echo  ====================================================
echo.
pause
