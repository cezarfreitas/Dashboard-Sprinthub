#!/bin/sh
# =============================================================================
# Docker Entrypoint - Inicialização segura do Next.js
# =============================================================================

set -e

echo "🚀 Iniciando Dashboard Inteli..."

# Função para cleanup
cleanup() {
    echo "🛑 Recebido sinal de parada, encerrando gracefully..."
    # Matar processo filho (npm/node)
    kill -TERM "$child" 2>/dev/null || true
    wait "$child"
    exit 0
}

# Registrar trap para sinais
trap cleanup SIGTERM SIGINT SIGQUIT

# 1. Verificar se porta 3000 está em uso
if netstat -tuln 2>/dev/null | grep -q ":3000 "; then
    echo "⚠️  Porta 3000 já está em uso, limpando..."
    pkill -9 node 2>/dev/null || true
    sleep 2
fi

# 2. Verificar variáveis de ambiente críticas
if [ -z "$DB_HOST" ]; then
    echo "⚠️  AVISO: DB_HOST não definido"
fi

if [ -z "$JWT_SECRET" ]; then
    echo "⚠️  AVISO: JWT_SECRET não definido"
fi

# 3. Verificar se build existe
if [ ! -d "/app/.next" ]; then
    echo "❌ ERRO: Build do Next.js não encontrado em /app/.next"
    exit 1
fi

# 4. Iniciar aplicação
echo "✅ Iniciando Next.js na porta ${PORT:-3000}..."
echo "📡 Escutando em: ${HOSTNAME:-0.0.0.0}:${PORT:-3000}"

# Executar npm start em background e capturar PID
npm start &
child=$!

# Aguardar processo filho
wait "$child"
exit_code=$?

echo "🏁 Aplicação encerrada com código: $exit_code"
exit $exit_code

