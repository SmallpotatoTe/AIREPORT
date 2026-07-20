@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-schedule.ps1" -Time 08:00
if errorlevel 1 pause
