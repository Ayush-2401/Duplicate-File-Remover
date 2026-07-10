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

:: ── Detect Desktop (OneDrive or standard) ────────────────────
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%USERPROFILE%\OneDrive\Desktop" set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"

echo [1/3] Preparing installation folder...
if not exist "%APP_DIR%" mkdir "%APP_DIR%"

echo.
echo [2/3] Downloading Duplicate File Remover...
echo       (This should only take a few seconds)
echo.
curl -L --progress-bar "%DOWNLOAD_URL%" -o "%APP_DIR%\%EXE_NAME%"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Download failed. Check your internet connection or visit:
    echo         https://github.com/Ayush-2401/Duplicate-File-Remover/releases
    pause
    exit /b 1
)

echo.
echo [3/3] Creating Desktop shortcut...

:: Write a small VBScript to create the shortcut (avoids ^ issues in PowerShell)
set "VBS=%TEMP%\make_shortcut.vbs"
(
    echo Set ws = CreateObject("WScript.Shell"^)
    echo Set s = ws.CreateShortcut("%DESKTOP%\Duplicate File Remover.lnk"^)
    echo s.TargetPath = "%APP_DIR%\%EXE_NAME%"
    echo s.Description = "Duplicate File Remover"
    echo s.WorkingDirectory = "%APP_DIR%"
    echo s.Save
) > "%VBS%"

cscript //nologo "%VBS%"
del "%VBS%"

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
