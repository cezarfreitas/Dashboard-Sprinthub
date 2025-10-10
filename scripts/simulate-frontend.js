// Simular exatamente o que acontece no frontend
const metas = [
  {
    id: 25,
    vendedor_id: 227,
    unidade_id: 2,
    mes: 1,
    ano: 2025,
    meta_valor: '1.00',
    status: 'ativa',
    vendedor_nome: 'Ale',
    vendedor_lastName: 'ES',
    vendedor_username: 'alessandra',
    unidade_nome: 'Espirito Santo'
  },
  {
    id: 26,
    vendedor_id: 5,
    unidade_id: 4,
    mes: 1,
    ano: 2025,
    meta_valor: '5000.00',
    status: 'ativa',
    vendedor_nome: 'Ana',
    vendedor_lastName: 'Costa',
    vendedor_username: 'ana',
    unidade_nome: 'Mato Grosso'
  }
];

const vendedores = [
  {
    id: 227,
    name: 'Ale',
    lastName: 'ES',
    username: 'alessandra',
    unidade_id: 2,
    unidade_nome: 'Espirito Santo'
  },
  {
    id: 5,
    name: 'Ana',
    lastName: 'Costa',
    username: 'ana',
    unidade_id: 4,
    unidade_nome: 'Mato Grosso'
  }
];

const selectedAno = 2025;

// Função getMetaValue exata do frontend
function getMetaValue(vendedorId, mesIndex, unidadeId) {
  console.log(`🚀 getMetaValue chamada - metas.length: ${metas.length}, vendedores.length: ${vendedores.length}`);
  
  const meses = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const mesNumero = meses[mesIndex];
  const targetUnidadeId = unidadeId || vendedores.find(v => v.id === vendedorId)?.unidade_id || 1;
  
  console.log(`🔍 Buscando meta: vendedor=${vendedorId}, mes=${mesNumero} (index:${mesIndex}), unidade=${targetUnidadeId}, ano=${selectedAno}`);
  
  const meta = metas.find(m => 
    m.vendedor_id === vendedorId && 
    m.mes === mesNumero &&
    m.unidade_id === targetUnidadeId &&
    m.ano === selectedAno &&
    m.status === 'ativa'
  );
  
  console.log(`✅ Meta encontrada para ${vendedorId}/${mesNumero}/${targetUnidadeId}/${selectedAno}:`, meta ? `${meta.meta_valor} (ID: ${meta.id})` : 'NENHUMA');
  
  const valor = meta ? parseFloat(meta.meta_valor.toString()) : 0;
  console.log(`💰 Valor final: ${valor}, tipo: ${typeof valor}, isNaN: ${isNaN(valor)}`);
  
  return valor;
}

// Função formatCurrency exata do frontend
function formatCurrency(value) {
  console.log(`💰 formatCurrency chamada com valor: ${value}, tipo: ${typeof value}`);
  if (!value || isNaN(value)) {
    console.log(`⚠️ Valor inválido para formatCurrency: ${value}`);
    return 'R$ 0,00';
  }
  const formatted = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
  console.log(`✅ Valor formatado: ${formatted}`);
  return formatted;
}

// Simular renderCell
function renderCell(vendedor, mesIndex, unidadeId) {
  const targetUnidadeId = unidadeId || vendedor.unidade_id;
  
  console.log(`🎯 RENDERIZANDO CÉLULA: ${vendedor.name} (ID:${vendedor.id}) - Mês ${mesIndex + 1} (index:${mesIndex}) - Unidade:${targetUnidadeId}`);
  
  const metaValue = getMetaValue(vendedor.id, mesIndex, targetUnidadeId);
  
  console.log(`💰 VALOR DA META: ${metaValue}`);
  
  // Log específico para verificar o que está sendo renderizado
  console.log(`🔢 metaValue: ${metaValue}, tipo: ${typeof metaValue}, > 0: ${metaValue > 0}`);
  const hasValue = metaValue && metaValue > 0 && !isNaN(metaValue);
  console.log(`✅ hasValue: ${hasValue}`);
  const displayValue = hasValue ? formatCurrency(metaValue) : 'Meta';
  const displayClass = hasValue ? 'text-green-600 font-medium text-xs' : 'text-gray-400 text-xs';
  
  console.log(`🎨 RENDERIZANDO: "${displayValue}" com classe "${displayClass}"`);
  
  return { displayValue, displayClass };
}

// Testar
console.log('🧪 TESTANDO FRONTEND SIMULADO\n');

for (const vendedor of vendedores) {
  console.log(`\n🔍 Testando vendedor: ${vendedor.name} (ID: ${vendedor.id})`);
  
  for (let mesIndex = 0; mesIndex < 3; mesIndex++) {
    console.log(`\n📅 Mês ${mesIndex + 1}:`);
    const result = renderCell(vendedor, mesIndex);
    console.log(`📊 Resultado final: "${result.displayValue}"`);
  }
}

