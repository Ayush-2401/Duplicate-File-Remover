@echo off
setlocal EnableDelayedExpansion
title Duplicate File Remover - Installer

echo.
echo ============================================================
echo         DUPLICATE FILE REMOVER - ONE-CLICK INSTALLER
echo ============================================================
echo.

:: ── Configuration ────────────────────────────────────────────
set "DOWNLOAD_URL=https://github.com/Ayush-2401/Duplicate-File-Remover/releases/latest/download/Duplicate.File.Remover.exe"
set "APP_DIR=%LOCALAPPDATA%\DuplicateFileRemover"
set "EXE_NAME=Duplicate File Remover.exe"
set "DESKTOP=%USERPROFILE%\Desktop"

:: ── Check for OneDrive Desktop ────────────────────────────────
if exist "%USERPROFILE%\OneDrive\Desktop" set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"

echo [1/3] Preparing installation folder...
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

echo.
echo [2/3] Downloading Duplicate File Remover...
echo      (This should only take a few seconds)
echo.
curl -L --progress-bar "%DOWNLOAD_URL%" -o "%APP_DIR%\%EXE_NAME%"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Download failed. Please check your internet connection
    echo         or visit: https://github.com/Ayush-2401/Duplicate-File-Remover/releases
    pause
    exit /b 1
)

echo.
echo [3/3] Creating Desktop shortcut...
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; ^
     $s = $ws.CreateShortcut('%DESKTOP%\Duplicate File Remover.lnk'); ^
     $s.TargetPath = '%APP_DIR%\%EXE_NAME%'; ^
     $s.Description = 'Duplicate File Remover'; ^
     $s.WorkingDirectory = '%APP_DIR%'; ^
     $s.Save()"

echo.
echo ============================================================
echo  INSTALLATION COMPLETE!
echo.
echo  A shortcut has been placed on your Desktop.
echo  You can also launch it directly from:
echo  %APP_DIR%\%EXE_NAME%
echo ============================================================
echo.
pause
