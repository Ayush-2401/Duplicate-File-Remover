@echo off
title Duplicate File Remover
echo.
echo  ╔══════════════════════════════════╗
echo  ║   Duplicate File Remover v1.0   ║
echo  ╚══════════════════════════════════╝
echo.

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo [*] Installing dependencies (first run only)...
    npm install
    echo.
)

echo [*] Launching app...
npm start
