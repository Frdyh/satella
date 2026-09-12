#!/bin/bash
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "============================================"
  echo "  Primera vez: instalando dependencias..."
  echo "  (esto puede tardar unos minutos)"
  echo "============================================"
  npm install
  npm run install:all
fi

if [ ! -f "satella-backend/.env" ]; then
  echo "============================================"
  echo "  Falta satella-backend/.env"
  echo "  Copia satella-backend/.env.example a .env,"
  echo "  configura DATABASE_URL y corre:"
  echo "    cd satella-backend && npx prisma migrate dev"
  echo "============================================"
  exit 1
fi

echo ""
echo "============================================"
echo "  Iniciando Satella (backend + frontend)..."
echo "  Backend:  http://localhost:4000"
echo "  Frontend: http://localhost:3000"
echo "============================================"
echo ""

( sleep 4 && open http://localhost:3000 ) &

npm run dev
