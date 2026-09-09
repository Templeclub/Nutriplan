@echo off
cd /d "%~dp0"
start "" powershell -NoProfile -ExecutionPolicy Bypass -File ".claude\static-server.ps1"
timeout /t 1 >nul
start "" http://localhost:8766/
