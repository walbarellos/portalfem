#!/bin/bash
# Script para corrigir problemas conhecidos do Directus
# Executa dentro do container fem-directus

echo "🔧 Corrigindo problemas do Directus..."

# 1. Corrigir permissões de tradução para acesso público
echo "📝 Corrigindo permissões de tradução..."
psql -U $DB_USER -d $DB_DATABASE -c "
  UPDATE directus_permissions 
  SET read = 'all' 
  WHERE role IS NULL 
  AND collection = 'directus_translations';"

# 2. Verificar e criar favicon padrão
echo "🎨 Adicionando favicon padrão..."
if [ ! -f /directus/uploads/favicon.ico ]; then
  # Cria um favicon.ico simples (1x1 pixel PNG em Base64)
  echo -ne '\x00\x00\x01\x00\x01\x00\x10\x10\x00\x00\x01\x00\x18\x00\x30\x10\x00\x00\x16\x00\x00\x00' > /directus/uploads/favicon.ico
fi

# 3. Limpar cache de sistema
echo "🗑️  Limpando cache..."
rm -rf /directus/.cache/* 2>/dev/null || true

echo "✅ Correção concluída!"
