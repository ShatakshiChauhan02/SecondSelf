@echo off
title SecondSelf Launcher
echo ==================================================
echo   Starting SecondSelf Windows AI Digital Twin
echo ==================================================
echo.

echo Starting Backend Server in new window...
start "SecondSelf Backend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start_backend.ps1"

echo Starting Frontend Server in new window...
start "SecondSelf Frontend" powershell -NoExit -ExecutionPolicy Bypass -File "%~dp0start_frontend.ps1"

echo.
echo Both servers launched!
echo Backend API: http://127.0.0.1:8000/api/health
echo Frontend UI: http://127.0.0.1:5173
echo.
