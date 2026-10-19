@echo off
rem Makes sure "node" and "npm" work in the calling script.
rem If Node.js is not installed, a private copy is downloaded once into the ".node" folder next to this file (no admin rights needed).
where node >nul 2>nul && exit /b 0
set "NODE_HOME=%~dp0.node"
if not exist "%NODE_HOME%\node.exe" (
  echo.
  echo Node.js is not installed on this PC. Downloading it now (about 30 MB, only once^)...
  echo.
  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-node.ps1" -Dest "%NODE_HOME%"
  if errorlevel 1 (
    echo.
    echo Could not download Node.js automatically. Check your internet connection,
    echo or install it yourself from https://nodejs.org ^(LTS version^) and run this file again.
    exit /b 1
  )
)
set "PATH=%NODE_HOME%;%PATH%"
exit /b 0
