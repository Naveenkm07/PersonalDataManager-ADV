@echo off
echo ===================================
echo Dream App - Cleanup
echo ===================================

:: Check if frontend directory exists
if not exist "frontend" (
    echo Error: frontend directory not found!
    echo Please make sure you're running this script from the project root
    pause
    exit /b 1
)

echo Cleaning up build artifacts and temporary files...

:: Remove build directory
if exist "frontend\build" (
    echo Removing build directory...
    rmdir /s /q "frontend\build"
)

:: Remove node_modules
if exist "frontend\node_modules" (
    echo Removing node_modules...
    rmdir /s /q "frontend\node_modules"
)

:: Remove package-lock.json
if exist "frontend\package-lock.json" (
    echo Removing package-lock.json...
    del /f /q "frontend\package-lock.json"
)

:: Clear npm cache
echo Clearing npm cache...
call npm cache clean --force

echo.
echo Cleanup completed!
echo.
echo To reinstall dependencies and start fresh:
echo 1. Run setup-env.bat
echo 2. Run start-app.bat
echo ===================================
pause 