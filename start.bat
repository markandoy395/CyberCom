@echo off
setlocal
REM Start CyberCom - Both Frontend and Backend

set FRONTEND_PORT=5174
set COMPETITION_FRONTEND_PORT=5174
set BACKEND_PORT=3000

if exist ".env" (
  for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
    if /I "%%A"=="FRONTEND_PORT" set FRONTEND_PORT=%%B
    if /I "%%A"=="BACKEND_PORT" set BACKEND_PORT=%%B
  )
)

set COMPETITION_FRONTEND_PORT=%FRONTEND_PORT%

echo.
echo ========================================
echo   CyberCom - Complete Startup
echo ========================================
echo.

REM Kill all old Node processes to free up ports
echo Cleaning up old Node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo Starting Node.js backend server with auto-reload...
start cmd /k "cd backend-node && npm run dev"

REM Wait for backend to start
timeout /t 5 /nobreak

REM Start Frontend in a new window
echo.
echo Starting React frontend dev server...
start cmd /k "npm run dev"

echo.
echo ========================================
echo CyberCom is starting!
echo ========================================
echo - Frontend: http://localhost:%FRONTEND_PORT%
echo - Admin Login: http://localhost:%FRONTEND_PORT%/admin
echo - Competition Login: http://localhost:%COMPETITION_FRONTEND_PORT%/competition/login
echo - Backend API: http://localhost:%BACKEND_PORT%
echo - XAMPP MySQL: localhost:3306
echo ========================================
echo.
