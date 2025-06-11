@echo off
echo ===================================
echo Dream App - Production Build
echo ===================================

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if frontend directory exists
if not exist "frontend" (
    echo Error: frontend directory not found!
    echo Please make sure you're running this script from the project root
    pause
    exit /b 1
)

:: Clean previous build
echo Cleaning previous build...
if exist "frontend\build" (
    rmdir /s /q "frontend\build"
)

:: Install dependencies if needed
if not exist "frontend\node_modules" (
    echo Installing dependencies...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies!
        pause
        exit /b 1
    )
    cd ..
)

:: Create production build
echo.
echo Creating production build...
echo This may take a few minutes...
echo.
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo.
    echo Error: Build failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)

:: Create a simple server for testing the build
echo.
echo Creating test server for the production build...
echo.
echo The production build will be available at:
echo http://localhost:5000
echo.
echo Press Ctrl+C to stop the server
echo ===================================

:: Start a simple server to test the build
cd build
npx serve -s .

:: If serve fails
if %errorlevel% neq 0 (
    echo.
    echo Error: Failed to start the test server!
    echo Please check the error messages above.
    pause
    exit /b 1
) 