@echo off
setlocal
cd /d "%~dp0"
call "%~dp0get-node.bat" || (pause & exit /b 1)
if not exist node_modules (
  echo First run: installing, this takes a few minutes...
  call npm install || (echo npm install failed. & pause & exit /b 1)
)
call npm start
