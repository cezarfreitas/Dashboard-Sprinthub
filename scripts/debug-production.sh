#!/bin/bash
# =============================================================================
# Script de Debug para Produção
# =============================================================================
# 
# Uso: Execute este script NO SERVIDOR (VPS/EasyPanel) via SSH
# ssh user@seu-servidor.com
# bash /caminho/para/debug-production.sh
# =============================================================================

echo "🔍 DEBUG DE PRODUÇÃO - Dashboard Inteli"
echo "========================================"
echo ""

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 1. Encontrar container
echo "📦 PROCURANDO CONTAINER..."
CONTAINER=$(docker ps --filter "name=dash" --filter "name=inteli" --filter "name=grupo" --format "{{.ID}}" | head -n 1)

if [ -z "$CONTAINER" ]; then
    echo -e "${RED}❌ Container não encontrado!${NC}"
    echo "Containers rodando:"
    docker ps
    exit 1
fi

echo -e "${GREEN}✓ Container encontrado: $CONTAINER${NC}"
CONTAINER_NAME=$(docker ps --filter "id=$CONTAINER" --format "{{.Names}}")
echo "  Nome: $CONTAINER_NAME"
echo ""

# 2. Status do Container
echo "🏥 STATUS DO CONTAINER"
echo "======================"
docker inspect $CONTAINER --format '
Status: {{.State.Status}}
Running: {{.State.Running}}
Started: {{.State.StartedAt}}
Health: {{.State.Health.Status}}
' 2>/dev/null || echo "Sem health check configurado"
echo ""

# 3. Variáveis de Ambiente (sem mostrar senhas)
echo "🔐 VARIÁVEIS DE AMBIENTE"
echo "========================"
docker exec $CONTAINER sh -c '
echo "NODE_ENV: ${NODE_ENV:-não definida}"
echo "PORT: ${PORT:-não definida}"
echo "HOSTNAME: ${HOSTNAME:-não definida}"
echo "DB_HOST: ${DB_HOST:-não definida}"
echo "DB_USER: ${DB_USER:-não definida}"
echo "DB_DATABASE: ${DB_DATABASE:-não definida}"
echo "NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-não definida}"
echo "JWT_SECRET: $([ -n "$JWT_SECRET" ] && echo "definido" || echo "NÃO DEFINIDO")"
'
echo ""

# 4. Processos Node.js
echo "🔄 PROCESSOS NODE.JS"
echo "===================="
docker exec $CONTAINER ps aux | grep node || echo "Nenhum processo node encontrado"
echo ""

# 5. Porta 3000
echo "🔌 PORTA 3000"
echo "============="
docker exec $CONTAINER sh -c 'netstat -tuln 2>/dev/null | grep :3000 || ss -tuln 2>/dev/null | grep :3000' || echo "Porta 3000 não está aberta"
echo ""

# 6. Health Check Interno
echo "🏥 HEALTH CHECK INTERNO"
echo "======================="
docker exec $CONTAINER curl -s -w "\nHTTP Status: %{http_code}\n" http://localhost:3000/api/health 2>/dev/null || echo "❌ Falha ao testar health check"
echo ""

# 7. Health Check Externo
echo "🌐 HEALTH CHECK EXTERNO"
echo "======================="
curl -s -w "\nHTTP Status: %{http_code}\n" https://gestao.grupointeli.com/api/health 2>/dev/null || echo "❌ Falha ao acessar externamente"
echo ""

# 8. Teste de Banco de Dados
echo "🗄️  TESTE DE BANCO DE DADOS"
echo "==========================="
docker exec $CONTAINER sh -c '
if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
    if command -v mysql &> /dev/null; then
        mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_DATABASE" -e "SELECT 1" 2>&1
        if [ $? -eq 0 ]; then
            echo "✓ Conexão com banco OK"
        else
            echo "❌ Falha na conexão com banco"
        fi
    else
        echo "⚠️  Cliente mysql não instalado no container"
    fi
else
    echo "❌ Variáveis de banco não configuradas"
fi
'
echo ""

# 9. Logs Recentes
echo "📜 LOGS RECENTES (últimas 30 linhas)"
echo "====================================="
docker logs $CONTAINER --tail 30
echo ""

# 10. Rota de Login
echo "🔐 TESTE DA ROTA DE LOGIN"
echo "========================="
curl -s -w "\nHTTP Status: %{http_code}\n" https://gestao.grupointeli.com/sistema/login 2>/dev/null | head -n 5
echo ""

# 11. Labels Traefik
echo "🚦 LABELS TRAEFIK"
echo "================="
docker inspect $CONTAINER --format '{{range $key, $value := .Config.Labels}}{{if eq (printf "%.7s" $key) "traefik"}}{{$key}}: {{$value}}{{println}}{{end}}{{end}}'
echo ""

# 12. Network
echo "🌐 NETWORK"
echo "=========="
docker inspect $CONTAINER --format '{{range .NetworkSettings.Networks}}IP: {{.IPAddress}} | Gateway: {{.Gateway}}{{println}}{{end}}'
echo ""

# 13. Resumo
echo "📊 RESUMO"
echo "========="
echo ""

# Container rodando?
if docker ps --filter "id=$CONTAINER" --filter "status=running" | grep -q $CONTAINER; then
    echo -e "${GREEN}✓ Container está rodando${NC}"
else
    echo -e "${RED}❌ Container NÃO está rodando${NC}"
fi

# Porta 3000 aberta?
if docker exec $CONTAINER sh -c 'netstat -tuln 2>/dev/null | grep -q ":3000" || ss -tuln 2>/dev/null | grep -q ":3000"'; then
    echo -e "${GREEN}✓ Porta 3000 está aberta${NC}"
else
    echo -e "${RED}❌ Porta 3000 NÃO está aberta${NC}"
fi

# Health check funcionando?
if docker exec $CONTAINER curl -sf http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Health check interno OK${NC}"
else
    echo -e "${RED}❌ Health check interno FALHOU${NC}"
fi

# Acesso externo funcionando?
if curl -sf https://gestao.grupointeli.com/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✓ Acesso externo OK${NC}"
else
    echo -e "${YELLOW}⚠️  Acesso externo COM PROBLEMAS${NC}"
fi

echo ""
echo "========================================"
echo "Debug concluído em $(date)"
echo "========================================"

