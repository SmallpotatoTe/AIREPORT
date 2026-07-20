@echo off
setlocal
cd /d "%~dp0"
call npm.cmd run collect >> "%~dp0scheduled-collect.log" 2>&1
exit /b %errorlevel%
