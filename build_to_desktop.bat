@echo off
echo Building Duplicate File Remover...
cd /d "%~dp0"
call npm install
call npm run build

echo.
echo Copying executables to Desktop...

:: Copy Portable version
if exist "dist\Duplicate File Remover 1.0.0.exe" (
    copy /Y "dist\Duplicate File Remover 1.0.0.exe" "%USERPROFILE%\OneDrive\Desktop\Duplicate File Remover (Portable).exe"
    echo Portable version copied!
)

:: Copy Installer version
if exist "dist\Duplicate File Remover Setup 1.0.0.exe" (
    copy /Y "dist\Duplicate File Remover Setup 1.0.0.exe" "%USERPROFILE%\OneDrive\Desktop\Duplicate File Remover Setup.exe"
    echo Installer version copied!
)

echo.
echo Build complete! You can find the executable on your desktop.
pause
