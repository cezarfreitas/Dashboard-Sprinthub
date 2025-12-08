#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function checkTimezone() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    console.log('\n🕐 PROBLEMA DE TIMEZONE IDENTIFICADO\n')
    console.log('='.repeat(80))

    // Ver oportunidades criadas "ontem" no Brasil (27/11) mas que podem estar como "hoje" (28/11) no MySQL
    const [opsDay27Brazil] = await connection.execute(`
      SELECT 
        id,
        createDate,
        DATE(createDate) as data_mysql,
        HOUR(createDate) as hora_utc,
        DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) as data_brasil,
        HOUR(CONVERT_TZ(createDate, '+00:00', '-03:00')) as hora_brasil
      FROM oportunidades
      WHERE DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) = '2025-11-27'
        AND archived = 0
      ORDER BY createDate DESC
      LIMIT 10
    `)

    console.log(`\n📊 Oportunidades criadas no dia 27/11 (BRASIL):`)
    console.log(`  Total encontrado: ${opsDay27Brazil.length}`)
    console.log('\n  Exemplos (mostrando discrepância UTC vs Brasil):')
    console.log('  ' + '-'.repeat(78))
    console.log('  ID       | Data MySQL (UTC) | Hora UTC | Data Brasil | Hora Brasil')
    console.log('  ' + '-'.repeat(78))
    
    opsDay27Brazil.forEach(o => {
      const dataMysql = o.data_mysql?.toISOString().split('T')[0] || 'N/A'
      const dataBrasil = o.data_brasil?.toISOString().split('T')[0] || 'N/A'
      const discrepancia = dataMysql !== dataBrasil ? ' ⚠️  DIFERENTE!' : ''
      console.log(`  #${String(o.id).padEnd(8)} | ${dataMysql}      | ${String(o.hora_utc).padStart(2, '0')}h      | ${dataBrasil}   | ${String(o.hora_brasil).padStart(2, '0')}h${discrepancia}`)
    })

    // Contar quantas oportunidades estão com data ERRADA devido ao timezone
    const [countErradas] = await connection.execute(`
      SELECT COUNT(*) as total
      FROM oportunidades
      WHERE DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) = '2025-11-27'
        AND DATE(createDate) != '2025-11-27'
        AND archived = 0
    `)

    console.log(`\n❌ Oportunidades com data discrepante:`)
    console.log(`  ${countErradas[0].total} oportunidades criadas no dia 27/11 (Brasil)`)
    console.log(`  mas salvas como outro dia no MySQL (UTC)`)

    console.log('\n🔍 CAUSA RAIZ:')
    console.log('  • MySQL armazena em UTC')
    console.log('  • Brasil = UTC-3')
    console.log('  • Oportunidades criadas após 21h (Brasil) viram dia seguinte no MySQL')
    console.log('  • Exemplo: 27/11 22:00 (Brasil) = 28/11 01:00 (UTC)')
    console.log('  • DATE(createDate) retorna a data em UTC, não Brasil!')

    console.log('\n💡 SOLUÇÃO:')
    console.log('  Usar CONVERT_TZ na query para converter UTC → Brasil antes de DATE()')
    console.log('  Ou ajustar o filtro da API para considerar o timezone')

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
  } finally {
    await connection.end()
  }
}

checkTimezone()












