#!/bin/bash
# Deploy em desenvolvimento (WSL2)

cd "$(dirname "$0")/.."

echo "==================================="
echo "  Deploy local do Portal FEM"
echo "==================================="

# 1. Verificar se .env existe
if [ ! -f backend/.env ]; then
  echo "Copiando backend/.env.example para backend/.env..."
  echo "⚠️  Edite as senhas antes de subir!"
  cp backend/.env.example backend/.env
fi

# 2. Subir backend (Postgres + Redis + Directus)
echo ""
echo "[1/4] Subindo backend (Docker)..."
cd backend
docker compose up -d
cd ..

# 3. Aguardar Directus iniciar
echo "[2/4] Aguardando Directus ficar pronto..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8055/server/health > /dev/null 2>&1; then
    echo "  ✅ Directus pronto!"
    break
  fi
  sleep 2
done

# 4. Instalar dependências do frontend
echo "[3/4] Instalando dependências do frontend..."
cd frontend
npm install

# 5. Build do frontend
echo "[4/4] Buildando frontend..."
npm run build
cd ..

echo ""
echo "==================================="
echo "  ✅ Deploy local concluído!"
echo ""
echo "  🌐  Admin Directus: http://localhost:8055"
echo "  🎨  Frontend:      http://localhost:4321"
echo "  📦  PostgreSQL:    localhost:5432"
echo "  ⚡  Redis:         localhost:6379"
echo ""
echo "  💡  Para desenvolver: cd frontend && npm run dev"
echo "==================================="
