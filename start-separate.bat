@echo off
echo ================================================================
echo   Opening Backend (Port 5000) and Frontend (Port 3000)...
echo ================================================================
cd /d "%~dp0"
start "Happiness Restaurant - Backend API (Port 5000)" cmd /k "cd backend && npm run dev"
start "Happiness Restaurant - Frontend (Port 3000)" cmd /k "cd frontend && npm run dev"
echo Both servers have been launched in separate windows!
