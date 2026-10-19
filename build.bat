@echo off
setlocal
cd /d "%~dp0"
title StickyPad - build the installer

where node >nul 2>nul || (
  echo.
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org , then double-click this file again.
  echo.
  pause & exit /b 1
)

echo.
echo === Step 1 of 2: installing the build tools (the first time this takes a few minutes) ===
call npm install
if errorlevel 1 (
  echo.
  echo "npm install" failed. Please send me the messages above.
  pause & exit /b 1
)

echo.
echo === Step 2 of 2: building the installer ===
set CSC_IDENTITY_AUTO_DISCOVERY=false
call npm run dist
if errorlevel 1 (
  echo.
  echo The build failed. Please send me the messages above.
  echo.
  echo If you see "A required privilege is not held by the client", either:
  echo   - turn on Developer Mode: Settings ^> System ^> For developers ^> Developer Mode, or
  echo   - right-click this file and choose "Run as administrator",
  echo then double-click it again.
  pause & exit /b 1
)

echo.
echo Done! Your installer is in the "dist" folder ("StickyPad Setup ....exe").
echo Run it once to install StickyPad like any other program.
echo.
echo The build tools and temporary files take up about 1 GB. The installer is all you need to keep.
choice /c YN /n /m "Delete the leftovers now to free that space? [Y/N] "
if errorlevel 2 goto :keep
if exist "%~dp0dist\win-unpacked" rmdir /s /q "%~dp0dist\win-unpacked"
if exist "%~dp0node_modules" rmdir /s /q "%~dp0node_modules"
del /q "%~dp0dist\*.blockmap" "%~dp0dist\builder-*.yaml" "%~dp0dist\builder-*.yml" 2>nul
echo Cleaned up. (The next build will download the tools again.)
:keep
start "" "%~dp0dist"
pause
