#!/bin/bash

# Script para corrigir permissões da pasta de uploads no VPS

echo "🔧 Corrigindo permissões da pasta de uploads..."

# Criar estrutura de pastas se não existir
mkdir -p public/uploads/logos

# Dar permissões corretas
chmod 755 public/uploads
chmod 755 public/uploads/logos

# Se usar Docker, pode precisar ajustar o usuário
# Descomente a linha abaixo se necessário:
# chown -R node:node public/uploads

echo "✅ Permissões corrigidas!"
echo "📁 Pasta: $(pwd)/public/uploads/logos"
ls -la public/uploads/

