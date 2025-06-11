@echo off
echo ===================================
echo Dream App - Environment Setup
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

:: Create .env file if it doesn't exist
if not exist "frontend\.env" (
    echo Creating .env file...
    (
        echo REACT_APP_ENV=development
        echo REACT_APP_API_URL=http://localhost:3000
        echo REACT_APP_OFFLINE_MODE=true
        echo REACT_APP_MOCK_USER=nhce@example.com
        echo REACT_APP_MOCK_PASSWORD=CSE
    ) > "frontend\.env"
    echo .env file created successfully!
) else (
    echo .env file already exists.
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

echo.
echo Environment setup completed!
echo.
echo Current configuration:
echo - Environment: %REACT_APP_ENV%
echo - API URL: %REACT_APP_API_URL%
echo - Offline Mode: %REACT_APP_OFFLINE_MODE%
echo - Mock User: %REACT_APP_MOCK_USER%
echo.
echo To modify these settings, edit the frontend\.env file
echo ===================================
pause 