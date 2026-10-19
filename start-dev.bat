@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get the LTS version from https://nodejs.org & pause & exit /b 1)
if not exist node_modules (
  echo First run: installing, this takes a few minutes...
  call npm install || (echo npm install failed. & pause & exit /b 1)
)
call npm start
