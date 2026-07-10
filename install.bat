@echo off
setlocal EnableDelayedExpansion
title Duplicate File Remover - Installer

echo.
echo ============================================================
echo         DUPLICATE FILE REMOVER - ONE-CLICK INSTALLER
echo ============================================================
echo.

:: ── Configuration ────────────────────────────────────────────
set "DOWNLOAD_URL=https://github.com/Ayush-2401/Duplicate-File-Remover/releases/latest/download/DuplicateFileRemover.zip"
set "APP_DIR=%LOCALAPPDATA%\DuplicateFileRemover"
set "EXE_NAME=Duplicate File Remover.exe"
set "ZIP_FILE=%TEMP%\DuplicateFileRemover.zip"

:: ── Detect Desktop (OneDrive or standard) ────────────────────
set "DESKTOP=%USERPROFILE%\Desktop"
if exist "%USERPROFILE%\OneDrive\Desktop" set "DESKTOP=%USERPROFILE%\OneDrive\Desktop"

echo [1/4] Preparing installation folder...
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
mkdir "%APP_DIR%"

echo.
echo [2/4] Downloading Duplicate File Remover...
echo       (Please wait, file is ~50MB)
echo.
curl -L --progress-bar "%DOWNLOAD_URL%" -o "%ZIP_FILE%"

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Download failed. Check your internet connection or visit:
    echo         https://github.com/Ayush-2401/Duplicate-File-Remover/releases
    pause
    exit /b 1
)

echo.
echo [3/4] Extracting files...
powershell -NoProfile -Command "Expand-Archive -Path '%ZIP_FILE%' -DestinationPath '%APP_DIR%' -Force"
del "%ZIP_FILE%"

if not exist "%APP_DIR%\%EXE_NAME%" (
    echo [ERROR] Extraction failed. Executable not found.
    pause
    exit /b 1
)

echo.
echo [4/4] Creating Desktop shortcut...
set "VBS=%TEMP%\mk_sc.vbs"
echo Set ws = CreateObject("WScript.Shell") > "%VBS%"
echo Set s = ws.CreateShortcut("%DESKTOP%\Duplicate File Remover.lnk") >> "%VBS%"
echo s.TargetPath = "%APP_DIR%\%EXE_NAME%" >> "%VBS%"
echo s.WorkingDirectory = "%APP_DIR%" >> "%VBS%"
echo s.Description = "Duplicate File Remover" >> "%VBS%"
echo s.Save >> "%VBS%"
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
