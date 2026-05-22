#!/bin/bash
# Script de backup do Portal FEM
# Uso: ./scripts/backup.sh

set -e

cd "$(dirname "$0")/.."

BACKUP_DIR="backups"
RETENTION_DAYS=14
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

echo "📦 Iniciando backup em $TIMESTAMP"

# Backup do PostgreSQL
echo "  📀 Backup do banco de dados..."
docker exec fem-postgres pg_dump -U fem_admin fem_directus > "$BACKUP_DIR/bd_$TIMESTAMP.sql"
gzip -f "$BACKUP_DIR/bd_$TIMESTAMP.sql"
echo "  ✅ Banco: $BACKUP_DIR/bd_$TIMESTAMP.sql.gz"

# Backup dos uploads
echo "  📁 Backup dos uploads..."
docker run --rm \
  -v directus_uploads:/data \
  -v "$(pwd)/$BACKUP_DIR:/backup" \
  alpine tar czf "/backup/uploads_$TIMESTAMP.tar.gz" -C /data .
echo "  ✅ Uploads: $BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"

# Limpar backups antigos
echo "  🗑️  Removendo backups com mais de $RETENTION_DAYS dias..."
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete

echo "✅ Backup concluído!"
ls -lh "$BACKUP_DIR"/*"$TIMESTAMP"*
