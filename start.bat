@echo off
title Satella - El Grimorio
cd /d "%~dp0"

if not exist node_modules (
  echo ============================================
  echo   Primera vez: instalando dependencias...
  echo   (esto puede tardar unos minutos)
  echo ============================================
  call npm install
  call npm run install:all
)

if not exist satella-backend\.env (
  echo ============================================
  echo   Falta satella-backend\.env
  echo   Copia satella-backend\.env.example a .env,
  echo   configura DATABASE_URL y corre:
  echo     cd satella-backend ^&^& npx prisma migrate dev
  echo ============================================
  pause
  exit /b 1
)

echo.
echo ============================================
echo   Iniciando Satella (backend + frontend)...
echo   Backend:  http://localhost:4000
echo   Frontend: http://localhost:3000
echo ============================================
echo.

start "" http://localhost:3000

call npm run dev

pause
