/**
 * Script para testar os dados do painel e verificar timezone
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

const mysql = require('mysql2/promise')

async function testPainelData() {
  console.log('\n📊 Teste de Dados do Painel - Timezone GMT-3\n')
  console.log('=' .repeat(70))

  try {
    // Conectar ao banco
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })

    console.log('✅ Conectado ao banco de dados\n')

    // Teste 1: Verificar timezone do MySQL
    console.log('1️⃣  TIMEZONE DO MYSQL:')
    console.log('-'.repeat(70))
    const [tzResult] = await connection.query(`
      SELECT 
        NOW() as mysql_now_utc,
        CONVERT_TZ(NOW(), '+00:00', '-03:00') as mysql_now_gmt3,
        @@system_time_zone as system_tz,
        @@global.time_zone as global_tz,
        @@session.time_zone as session_tz
    `)
    console.log('  MySQL NOW() (UTC):', tzResult[0].mysql_now_utc)
    console.log('  MySQL NOW() (GMT-3):', tzResult[0].mysql_now_gmt3)
    console.log('  System timezone:', tzResult[0].system_tz)
    console.log('  Global timezone:', tzResult[0].global_tz)
    console.log('  Session timezone:', tzResult[0].session_tz)

    // Teste 2: Oportunidades criadas HOJE (com e sem conversão)
    console.log('\n2️⃣  OPORTUNIDADES CRIADAS HOJE:')
    console.log('-'.repeat(70))
    
    // SEM conversão de timezone (INCORRETO)
    const [semConversao] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(value), 0) as valor_total,
        DATE(createDate) as data_criacao
      FROM oportunidades
      WHERE DATE(createDate) = CURDATE()
        AND archived = 0
      GROUP BY DATE(createDate)
    `)
    console.log('  ❌ SEM CONVERT_TZ (incorreto):')
    console.log('     Total:', semConversao[0]?.total || 0)
    console.log('     Valor:', semConversao[0]?.valor_total || 0)
    console.log('     Data:', semConversao[0]?.data_criacao || 'nenhuma')

    // COM conversão de timezone (CORRETO)
    const [comConversao] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(value), 0) as valor_total,
        DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) as data_criacao
      FROM oportunidades
      WHERE DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
        AND archived = 0
      GROUP BY DATE(CONVERT_TZ(createDate, '+00:00', '-03:00'))
    `)
    console.log('  ✅ COM CONVERT_TZ (correto):')
    console.log('     Total:', comConversao[0]?.total || 0)
    console.log('     Valor:', comConversao[0]?.valor_total || 0)
    console.log('     Data:', comConversao[0]?.data_criacao || 'nenhuma')

    // Teste 3: Últimas oportunidades criadas
    console.log('\n3️⃣  ÚLTIMAS 5 OPORTUNIDADES CRIADAS:')
    console.log('-'.repeat(70))
    const [ultimas] = await connection.query(`
      SELECT 
        id,
        title,
        createDate as create_utc,
        CONVERT_TZ(createDate, '+00:00', '-03:00') as create_gmt3,
        DATE(createDate) as day_utc,
        DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) as day_gmt3
      FROM oportunidades
      WHERE archived = 0
      ORDER BY createDate DESC
      LIMIT 5
    `)

    ultimas.forEach((op, idx) => {
      console.log(`  ${idx + 1}. ID ${op.id}:`)
      console.log(`     Título: ${op.title.substring(0, 50)}...`)
      console.log(`     UTC: ${op.create_utc} (dia ${op.day_utc})`)
      console.log(`     GMT-3: ${op.create_gmt3} (dia ${op.day_gmt3})`)
      if (op.day_utc !== op.day_gmt3) {
        console.log(`     ⚠️  DIFERENÇA DE DIA!`)
      }
      console.log()
    })

    // Teste 4: Total de abertas
    console.log('4️⃣  OPORTUNIDADES ABERTAS:')
    console.log('-'.repeat(70))
    const [abertas] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(value), 0) as valor_total
      FROM oportunidades
      WHERE gain_date IS NULL 
        AND lost_date IS NULL
        AND archived = 0
    `)
    console.log('  Total abertas:', abertas[0].total)
    console.log('  Valor total:', new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(abertas[0].valor_total))

    // Teste 5: Oportunidades ganhas HOJE
    console.log('\n5️⃣  OPORTUNIDADES GANHAS HOJE:')
    console.log('-'.repeat(70))
    
    // COM conversão (correto)
    const [ganhasHoje] = await connection.query(`
      SELECT 
        COUNT(*) as total,
        COALESCE(SUM(value), 0) as valor_total
      FROM oportunidades
      WHERE DATE(CONVERT_TZ(gain_date, '+00:00', '-03:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '-03:00'))
        AND gain_date IS NOT NULL
        AND archived = 0
    `)
    console.log('  Total ganhas hoje:', ganhasHoje[0].total)
    console.log('  Valor:', new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(ganhasHoje[0].valor_total))

    // Resumo
    console.log('\n' + '='.repeat(70))
    console.log('📝 RESUMO:')
    console.log('-'.repeat(70))
    console.log('  ✅ Timezone configurado: GMT-3 (America/Sao_Paulo)')
    console.log('  ✅ MySQL suporta CONVERT_TZ')
    
    if (semConversao[0]?.total !== comConversao[0]?.total) {
      console.log('  ⚠️  ATENÇÃO: Diferença nos dados sem/com CONVERT_TZ!')
      console.log('  📌 SOLUÇÃO: Usar CONVERT_TZ em todas as queries de data')
    } else {
      console.log('  ✅ Dados consistentes (sem diferença de timezone crítica no momento)')
    }

    console.log('\n' + '='.repeat(70))

    await connection.end()
    console.log('✅ Teste concluído!\n')

  } catch (error) {
    console.error('❌ Erro:', error.message)
    process.exit(1)
  }
}

testPainelData()

