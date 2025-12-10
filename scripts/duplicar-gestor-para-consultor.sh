#!/bin/bash

# Script para duplicar componentes de Gestor para Consultor
# Substituindo todos os nomes e mantendo funcionalidades

echo "🚀 Iniciando duplicação de componentes Gestor -> Consultor"

# Criar diretórios se não existirem
mkdir -p components/consultor

# Lista de arquivos de componentes para duplicar
componentes=(
  "GestorPeriodoFilter"
  "GestorBarraProgressoMeta"
  "GestorEstatisticasCards"
  "GestorOportunidadesDiarias"
  "GestorGanhosDiarios"
  "GestorMatrizMotivosPerda"
  "GestorCardHoje"
  "GestorCardAbertas"
  "GestorCardPerdidas"
  "GestorCardGanhos"
  "GestorCardTaxaConversao"
  "GestorCardTicketMedio"
)

contador=0

for componente in "${componentes[@]}"; do
  arquivo_origem="components/gestor/${componente}.tsx"
  arquivo_destino="components/consultor/${componente/Gestor/Consultor}.tsx"
  
  if [ -f "$arquivo_origem" ]; then
    echo "📄 Duplicando: $componente -> ${componente/Gestor/Consultor}"
    
    # Copiar arquivo e fazer substituições
    sed -e 's/Gestor/Consultor/g' \
        -e 's/gestor/consultor/g' \
        -e 's/@\/hooks\/consultor\/useConsultorDashboard/@\/hooks\/consultor\/useConsultorDashboard/g' \
        "$arquivo_origem" > "$arquivo_destino"
    
    ((contador++))
  else
    echo "⚠️  Arquivo não encontrado: $arquivo_origem"
  fi
done

echo ""
echo "✅ Duplicação concluída!"
echo "📊 Total de componentes duplicados: $contador"
echo ""
echo "🔍 Próximos passos:"
echo "  1. Revisar componentes em components/consultor/"
echo "  2. Ajustar lógica específica de consultor (filtros por vendedor_id)"
echo "  3. Testar cada componente individualmente"

