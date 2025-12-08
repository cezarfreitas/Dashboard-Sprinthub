#!/bin/bash
# =============================================================================
# Script de Diagnóstico de Rede para Container
# =============================================================================
# 
# Uso: Execute este script DENTRO do container para diagnosticar problemas
# de conectividade
#
# No EasyPanel:
# 1. Vá em: Your App → Terminal
# 2. Execute: bash /app/scripts/test-container-network.sh
# =============================================================================

echo "🔍 DIAGNÓSTICO DE REDE DO CONTAINER"
echo "===================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para testar
test_item() {
    local description=$1
    local command=$2
    
    echo -n "Testando: $description... "
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ OK${NC}"
        return 0
    else
        echo -e "${RED}✗ FALHOU${NC}"
        return 1
    fi
}

# 1. Informações Básicas
echo "📋 INFORMAÇÕES BÁSICAS"
echo "======================"
echo "Hostname: $(hostname)"
echo "IP Address: $(hostname -i 2>/dev/null || echo 'N/A')"
echo "Timezone: $(date +%Z)"
echo "Current Time: $(date)"
echo ""

# 2. Verificar Processo Node
echo "🔄 PROCESSOS NODE.JS"
echo "===================="
if ps aux | grep -v grep | grep node > /dev/null; then
    echo -e "${GREEN}✓ Node.js está rodando${NC}"
    ps aux | grep -v grep | grep node | head -n 3
else
    echo -e "${RED}✗ Node.js NÃO está rodando${NC}"
fi
echo ""

# 3. Verificar Portas Abertas
echo "🔌 PORTAS ABERTAS"
echo "================="
if command -v netstat &> /dev/null; then
    echo "Portas TCP escutando:"
    netstat -tulpn 2>/dev/null | grep LISTEN || echo "Comando netstat não disponível"
elif command -v ss &> /dev/null; then
    echo "Portas TCP escutando:"
    ss -tulpn 2>/dev/null | grep LISTEN || echo "Nenhuma porta encontrada"
else
    echo -e "${YELLOW}⚠ netstat/ss não disponível${NC}"
fi
echo ""

# 4. Verificar se porta 3000 está aberta
echo "🎯 VERIFICAR PORTA 3000"
echo "======================="
if netstat -an 2>/dev/null | grep ":3000" > /dev/null || ss -an 2>/dev/null | grep ":3000" > /dev/null; then
    echo -e "${GREEN}✓ Porta 3000 está aberta${NC}"
    
    # Verificar se está em 0.0.0.0 ou apenas localhost
    if netstat -an 2>/dev/null | grep "0.0.0.0:3000" > /dev/null || ss -an 2>/dev/null | grep "0.0.0.0:3000" > /dev/null; then
        echo -e "${GREEN}✓ Escutando em 0.0.0.0:3000 (CORRETO)${NC}"
    elif netstat -an 2>/dev/null | grep "127.0.0.1:3000" > /dev/null || ss -an 2>/dev/null | grep "127.0.0.1:3000" > /dev/null; then
        echo -e "${RED}✗ Escutando apenas em 127.0.0.1:3000 (INCORRETO)${NC}"
        echo -e "${YELLOW}  → O container NÃO ficará acessível externamente!${NC}"
        echo -e "${YELLOW}  → Verifique se package.json tem: next start -H 0.0.0.0${NC}"
    fi
else
    echo -e "${RED}✗ Porta 3000 NÃO está aberta${NC}"
    echo -e "${YELLOW}  → Next.js pode não ter iniciado corretamente${NC}"
fi
echo ""

# 5. Testar Health Check Internamente
echo "🏥 HEALTH CHECK"
echo "==============="
if command -v curl &> /dev/null; then
    echo "Testando: http://localhost:3000/api/health"
    HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:3000/api/health 2>/dev/null)
    HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
    BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo -e "${GREEN}✓ Health check OK (HTTP $HTTP_CODE)${NC}"
        echo "Response:"
        echo "$BODY" | head -c 500
        echo ""
    else
        echo -e "${RED}✗ Health check falhou (HTTP $HTTP_CODE)${NC}"
        echo "Response:"
        echo "$BODY"
    fi
else
    echo -e "${YELLOW}⚠ curl não disponível${NC}"
fi
echo ""

# 6. Verificar Variáveis de Ambiente Críticas
echo "🔐 VARIÁVEIS DE AMBIENTE"
echo "========================"
echo "NODE_ENV: ${NODE_ENV:-'não definida'}"
echo "PORT: ${PORT:-'não definida'}"
echo "HOSTNAME: ${HOSTNAME:-'não definida'}"
echo "TZ: ${TZ:-'não definida'}"
echo ""

# Verificar DB (sem mostrar senha)
if [ -n "$DB_HOST" ]; then
    echo -e "${GREEN}✓ DB_HOST definido: $DB_HOST${NC}"
else
    echo -e "${RED}✗ DB_HOST não definido${NC}"
fi

if [ -n "$DB_USER" ]; then
    echo -e "${GREEN}✓ DB_USER definido${NC}"
else
    echo -e "${RED}✗ DB_USER não definido${NC}"
fi

if [ -n "$DB_PASSWORD" ]; then
    echo -e "${GREEN}✓ DB_PASSWORD definido${NC}"
else
    echo -e "${RED}✗ DB_PASSWORD não definido${NC}"
fi

if [ -n "$DB_DATABASE" ]; then
    echo -e "${GREEN}✓ DB_DATABASE definido: $DB_DATABASE${NC}"
else
    echo -e "${RED}✗ DB_DATABASE não definido${NC}"
fi
echo ""

# 7. Testar Conectividade com Banco
echo "🗄️  CONECTIVIDADE COM BANCO"
echo "==========================="
if command -v mysql &> /dev/null; then
    if [ -n "$DB_HOST" ] && [ -n "$DB_USER" ] && [ -n "$DB_PASSWORD" ]; then
        if mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" 2>/dev/null; then
            echo -e "${GREEN}✓ Conexão com MySQL OK${NC}"
        else
            echo -e "${RED}✗ Falha ao conectar no MySQL${NC}"
            echo -e "${YELLOW}  → Verifique DB_HOST, DB_USER, DB_PASSWORD${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ Variáveis de DB não definidas - pulando teste${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Cliente mysql não disponível no container${NC}"
fi
echo ""

# 8. Verificar Logs do Next.js
echo "📜 LOGS RECENTES DO NEXT.JS"
echo "==========================="
if [ -f "/app/.next/trace" ]; then
    echo "Últimas 10 linhas do trace:"
    tail -n 10 /app/.next/trace 2>/dev/null || echo "Não foi possível ler trace"
else
    echo -e "${YELLOW}⚠ Arquivo de trace não encontrado${NC}"
fi
echo ""

# 9. Verificar Arquivos Críticos
echo "📁 ARQUIVOS CRÍTICOS"
echo "===================="
test_item "package.json existe" "[ -f /app/package.json ]"
test_item ".next build existe" "[ -d /app/.next ]"
test_item "node_modules existe" "[ -d /app/node_modules ]"
test_item "next.config.js existe" "[ -f /app/next.config.js ]"
echo ""

# 10. Resumo Final
echo "📊 RESUMO DO DIAGNÓSTICO"
echo "========================"

ISSUES=0

# Check críticos
if ! ps aux | grep -v grep | grep node > /dev/null; then
    echo -e "${RED}✗ CRÍTICO: Node.js não está rodando${NC}"
    ((ISSUES++))
fi

if ! netstat -an 2>/dev/null | grep "0.0.0.0:3000" > /dev/null && ! ss -an 2>/dev/null | grep "0.0.0.0:3000" > /dev/null; then
    echo -e "${RED}✗ CRÍTICO: Porta 3000 não está em 0.0.0.0${NC}"
    ((ISSUES++))
fi

if [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo -e "${YELLOW}⚠ AVISO: Variáveis de banco não configuradas${NC}"
fi

if [ -z "$HOSTNAME" ] || [ "$HOSTNAME" != "0.0.0.0" ]; then
    echo -e "${YELLOW}⚠ AVISO: HOSTNAME não é 0.0.0.0${NC}"
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ Container parece estar configurado corretamente!${NC}"
    echo ""
    echo "Se ainda não está acessível externamente, verifique:"
    echo "1. Configuração de portas no EasyPanel (3000 → 80)"
    echo "2. Firewall/Security Groups do VPS"
    echo "3. DNS apontando para o servidor correto"
else
    echo -e "${RED}✗ Encontrados $ISSUES problemas críticos${NC}"
    echo ""
    echo "Ações recomendadas:"
    echo "1. Verificar logs completos do container"
    echo "2. Fazer rebuild completo (não apenas restart)"
    echo "3. Verificar todas as variáveis de ambiente"
fi

echo ""
echo "===================================="
echo "Diagnóstico concluído em $(date)"
echo "===================================="

