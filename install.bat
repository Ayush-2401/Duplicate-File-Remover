@echo off
setlocal EnableDelayedExpansion
title Duplicate File Remover - Installer

echo.
echo ============================================================
echo         DUPLICATE FILE REMOVER - ONE-CLICK INSTALLER
echo ============================================================
echo.

:: ── Check for Git ────────────────────────────────────────────
git --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Git is not installed or not in PATH.
    echo Please install Git from: https://git-scm.com/download/win
    echo.
    pause
    exit /b 1
)

:: ── Check for Node.js ────────────────────────────────────────
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Please install Node.js from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [1/5] Cloning repository...
set "INSTALL_DIR=%TEMP%\DuplicateFileRemover_Build"
if exist "%INSTALL_DIR%" rmdir /s /q "%INSTALL_DIR%"
git clone https://github.com/Ayush-2401/Duplicate-File-Remover.git "%INSTALL_DIR%"
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Failed to clone repository. Check your internet connection.
    pause
    exit /b 1
)

echo.
echo [2/5] Installing dependencies...
cd /d "%INSTALL_DIR%"
call npm install
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm install failed.
    pause
    exit /b 1
)

echo.
echo [3/5] Building executable (this may take a few minutes)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Build failed. Try running this installer as Administrator.
    pause
    exit /b 1
)

echo.
echo [4/5] Copying application to Program Files...
set "APP_DIR=%LOCALAPPDATA%\DuplicateFileRemover"
if exist "%APP_DIR%" rmdir /s /q "%APP_DIR%"
mkdir "%APP_DIR%"

:: Copy portable exe if it exists
set "EXE_FOUND=0"
for %%f in ("%INSTALL_DIR%\dist\*.exe") do (
    copy /Y "%%f" "%APP_DIR%\" >nul
    set "EXE_FILE=%%~nxf"
    set "EXE_FOUND=1"
)

if "%EXE_FOUND%"=="0" (
    echo [ERROR] No executable found in dist folder. Build may have failed silently.
    pause
    exit /b 1
)

echo.
echo [5/5] Creating Desktop shortcut...
:: Use PowerShell to create shortcut
powershell -NoProfile -Command ^
    "$ws = New-Object -ComObject WScript.Shell; ^
     $s = $ws.CreateShortcut([Environment]::GetFolderPath('Desktop') + '\Duplicate File Remover.lnk'); ^
     $s.TargetPath = '%APP_DIR%\%EXE_FILE%'; ^
     $s.Description = 'Duplicate File Remover'; ^
     $s.WorkingDirectory = '%APP_DIR%'; ^
     $s.Save()"

echo.
echo ============================================================
echo  INSTALLATION COMPLETE!
echo  A shortcut has been placed on your Desktop.
echo  You can also launch it from:
echo  %APP_DIR%\%EXE_FILE%
echo ============================================================
echo.

:: Clean up temp build folder
rmdir /s /q "%INSTALL_DIR%"

pause
