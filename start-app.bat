@echo off
echo ===================================
echo Dream App - Development Server
echo ===================================

cd frontend

echo Checking for existing processes...
netstat -ano | findstr :3000 > nul
if %errorlevel% equ 0 (
    echo Port 3000 is in use. Attempting to free it...
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000') do (
        taskkill /F /PID %%a 2>nul
    )
)

echo Starting the development server...
echo The application will open in your default browser.

set PORT=3000
set BROWSER=none

echo Opening http://localhost:3000 in your default browser...
start "" http://localhost:3000

call npm start

if %errorlevel% neq 0 (
    echo Failed to start the server. Please check the error messages above.
    pause
    exit /b 1
) 