/**
 * Script de teste para validar sincronização de funis
 * 
 * Uso: node scripts/test-funis-sync.js
 */

require('dotenv').config({ path: '.env.local' });

async function testFunisSync() {
  console.log('🧪 Testando sincronização de funis...\n');
  
  // Verificar variáveis de ambiente
  const apiToken = process.env.APITOKEN;
  const groupId = process.env.I;
  const urlPatch = process.env.URLPATCH;
  
  console.log('📋 Configurações:');
  console.log('  URLPATCH:', urlPatch || '❌ NÃO CONFIGURADO');
  console.log('  APITOKEN:', apiToken ? `${apiToken.substring(0, 10)}...` : '❌ NÃO CONFIGURADO');
  console.log('  I:', groupId || '❌ NÃO CONFIGURADO');
  console.log('');
  
  if (!apiToken || !groupId || !urlPatch) {
    console.error('❌ Variáveis de ambiente não configuradas!');
    console.error('Configure URLPATCH, APITOKEN e I no arquivo .env.local');
    process.exit(1);
  }
  
  // Construir URL
  const url = `${urlPatch}/crm?apitoken=${apiToken}&i=${groupId}`;
  console.log('🔗 URL do endpoint:');
  console.log('  ', url.replace(apiToken, '***TOKEN***'));
  console.log('');
  
  try {
    console.log('📡 Fazendo requisição para API SprintHub...');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      }
    });
    
    console.log('📊 Status da resposta:', response.status, response.statusText);
    console.log('');
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na resposta:');
      console.error('  Status:', response.status);
      console.error('  Mensagem:', errorText);
      process.exit(1);
    }
    
    const data = await response.json();
    
    console.log('✅ Resposta recebida!');
    console.log('');
    console.log('📦 Tipo de resposta:', Array.isArray(data) ? 'Array' : typeof data);
    console.log('📦 Estrutura completa:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');
    
    // Tentar extrair funis
    let funis = [];
    
    if (Array.isArray(data)) {
      funis = data;
      console.log('✅ Array direto encontrado');
    } else if (data && Array.isArray(data.data)) {
      funis = data.data;
      console.log('✅ Array encontrado em data.data');
    } else if (data && Array.isArray(data.funis)) {
      funis = data.funis;
      console.log('✅ Array encontrado em data.funis');
    } else if (data && typeof data === 'object') {
      // Procurar por arrays
      for (const key in data) {
        if (Array.isArray(data[key])) {
          funis = data[key];
          console.log(`✅ Array encontrado em data.${key}`);
          break;
        }
      }
    }
    
    console.log('');
    console.log(`📊 Total de funis extraídos: ${funis.length}`);
    
    if (funis.length > 0) {
      console.log('');
      console.log('📋 Lista de funis:');
      funis.forEach((funil, index) => {
        const id = funil.id || funil.funil_id || funil.ID || 'N/A';
        const nome = funil.funil_nome || funil.nome || funil.name || 'N/A';
        console.log(`  ${index + 1}. ID: ${id}, Nome: "${nome}"`);
      });
      console.log('');
      console.log('✅ Sincronização deve funcionar corretamente!');
    } else {
      console.log('');
      console.log('⚠️  Nenhum funil encontrado na resposta');
      console.log('Verifique se a API está retornando dados ou se o formato mudou');
    }
    
  } catch (error) {
    console.error('❌ Erro ao fazer requisição:');
    console.error('  ', error.message);
    if (error.cause) {
      console.error('  Causa:', error.cause);
    }
    process.exit(1);
  }
}

testFunisSync();

