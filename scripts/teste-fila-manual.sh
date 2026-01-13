#!/bin/bash

# ============================================
# SCRIPT DE TESTE: Fila de Leads V2
# ============================================
# Teste manual da API /api/filav2 após correção

echo "🧪 Testando API de Fila de Leads V2"
echo "===================================="
echo ""

# Configuração
API_URL="http://localhost:3000/api/filav2"
UNIDADE_ID="92"
LEAD_ID="65204"

echo "📋 Configuração:"
echo "  - API: $API_URL"
echo "  - Unidade: $UNIDADE_ID"
echo "  - Lead: $LEAD_ID"
echo ""

# Teste 1: POST com JSON
echo "🔹 Teste 1: POST com JSON body"
echo "-----------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"unidade\": \"$UNIDADE_ID\",
    \"idlead\": \"$LEAD_ID\"
  }" \
  | jq '.'
echo ""
echo ""

# Teste 2: GET com query params
echo "🔹 Teste 2: GET com query parameters"
echo "-----------------------------------"
curl -X GET "${API_URL}?unidade=${UNIDADE_ID}&idlead=${LEAD_ID}" \
  | jq '.'
echo ""
echo ""

# Teste 3: PUT (método legado)
echo "🔹 Teste 3: PUT (compatibilidade)"
echo "-----------------------------------"
curl -X PUT "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"unidade\": \"$UNIDADE_ID\",
    \"idlead\": \"$LEAD_ID\"
  }" \
  | jq '.'
echo ""
echo ""

# Teste 4: Erro - sem parâmetros
echo "🔹 Teste 4: Erro - parâmetros faltando"
echo "-----------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{}" \
  | jq '.'
echo ""
echo ""

# Teste 5: Erro - unidade inválida
echo "🔹 Teste 5: Erro - unidade inexistente"
echo "-----------------------------------"
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -d "{
    \"unidade\": \"99999\",
    \"idlead\": \"$LEAD_ID\"
  }" \
  | jq '.'
echo ""
echo ""

echo "✅ Testes concluídos!"
echo ""
echo "💡 Dica: Execute o script SQL de diagnóstico para ver o estado da fila:"
echo "   mysql -u user -p database < scripts/diagnostico-fila-unidade-92.sql"











































