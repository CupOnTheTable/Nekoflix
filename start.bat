@echo off
title AniStream
echo ========================================
echo   AniStream - Anime Streaming Server
echo ========================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH.
    echo Download it from: https://nodejs.org
    pause
    exit /b 1
)

:: Navigate to project directory
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

:: Check if database exists
if not exist "prisma\dev.db" (
    echo [INFO] Setting up database...
    call npx prisma generate
    call npx prisma db push
    echo.
)

echo [STARTING] Starting AniStream on http://localhost:3000
echo [INFO] Press Ctrl+C to stop the server
echo.
call npm run dev
pause
