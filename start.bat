@echo off
REM Start CyberCom - Both Frontend and Backend

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
echo - Frontend: http://localhost:5173
echo - Admin Login: http://localhost:5173/admin
echo - Competition Login: http://localhost:5173/competition/login
echo - Backend API: http://localhost:3000
echo - XAMPP MySQL: localhost:3306
echo ========================================
echo.
