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
    console.log('\n🕐 VERIFICANDO TIMEZONE DAS OPORTUNIDADES DO DIA 27/11\n')
    console.log('='.repeat(80))

    // Ver timezone do servidor MySQL
    const [timezone] = await connection.execute('SELECT @@system_time_zone, NOW(), UTC_TIMESTAMP()')
    console.log('\n⏰ Timezone do MySQL:')
    console.log('  Sistema:', timezone[0]['@@system_time_zone'])
    console.log('  NOW():', timezone[0]['NOW()'])
    console.log('  UTC:', timezone[0]['UTC_TIMESTAMP()'])

    // Ver as oportunidades criadas "hoje" com timestamps completos
    const [oportunidades] = await connection.execute(`
      SELECT 
        id,
        createDate,
        DATE(createDate) as data_apenas,
        HOUR(createDate) as hora,
        CAST(user AS UNSIGNED) as vendedor_id
      FROM oportunidades
      WHERE DATE(createDate) = '2025-11-27'
        AND archived = 0
      ORDER BY createDate DESC
      LIMIT 20
    `)

    console.log(`\n📊 Primeiras 20 oportunidades do dia 27/11:`)
    console.log('  Total:', oportunidades.length)
    
    if (oportunidades.length > 0) {
      console.log('\n  Exemplos:')
      oportunidades.slice(0, 10).forEach(o => {
        console.log(`    ID #${o.id}: ${o.createDate} | Data: ${o.data_apenas} | Hora: ${o.hora}h | Vendedor: ${o.vendedor_id}`)
      })
    }

    // Verificar se a query da API está funcionando
    const unidadeId = 92
    
    // Buscar users da unidade
    const [unidade] = await connection.execute(
      'SELECT users FROM unidades WHERE id = ?',
      [unidadeId]
    )

    if (!unidade[0] || !unidade[0].users) {
      console.log('\n❌ Unidade #92 não tem campo users!')
      await connection.end()
      return
    }

    const users = JSON.parse(unidade[0].users)
    const userIds = users.map(u => typeof u === 'object' ? u.id : u).filter(id => id)
    
    console.log(`\n👥 Unidade #92 (CE OUTDOOR):`)
    console.log(`  Vendedores: ${userIds.join(', ')}`)

    // Query EXATA que a API usa
    const placeholders = userIds.map(() => '?').join(',')
    const [resultadoAPI] = await connection.execute(`
      SELECT 
        DATE(createDate) as data,
        DAY(createDate) as dia,
        MONTH(createDate) as mes,
        YEAR(createDate) as ano,
        CAST(o.user AS UNSIGNED) as vendedor_id,
        COALESCE(CONCAT(v.name, ' ', v.lastName), v.name, 'Sem vendedor') as vendedor_nome,
        COUNT(*) as total
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      WHERE o.archived = 0
        AND DATE(createDate) >= DATE(?)
        AND DATE(createDate) <= DATE(?)
        AND CAST(o.user AS UNSIGNED) IN (${placeholders})
      GROUP BY DATE(createDate), DAY(createDate), MONTH(createDate), YEAR(createDate), CAST(o.user AS UNSIGNED), v.name, v.lastName
      HAVING DATE(createDate) = '2025-11-27'
      ORDER BY data ASC, vendedor_nome ASC
    `, ['2025-11-01', '2025-11-27', ...userIds])

    console.log(`\n🎯 Query da API para dia 27/11:`)
    console.log(`  Registros retornados: ${resultadoAPI.length}`)
    
    if (resultadoAPI.length > 0) {
      console.log('\n  ✅ DADOS ENCONTRADOS:')
      resultadoAPI.forEach(r => {
        console.log(`    ${r.data} - ${r.vendedor_nome}: ${r.total} oportunidades`)
      })
    } else {
      console.log('\n  ❌ NENHUM dado retornado pela query!')
      console.log('\n  🔍 Verificando individualmente:')
      
      // Ver se há oportunidades para cada vendedor
      for (const userId of userIds) {
        const [individual] = await connection.execute(`
          SELECT COUNT(*) as total
          FROM oportunidades
          WHERE archived = 0
            AND DATE(createDate) = '2025-11-27'
            AND CAST(user AS UNSIGNED) = ?
        `, [userId])
        
        if (individual[0].total > 0) {
          const [vendedor] = await connection.execute(
            'SELECT name, lastName FROM vendedores WHERE id = ?',
            [userId]
          )
          const nome = vendedor[0] ? `${vendedor[0].name} ${vendedor[0].lastName || ''}`.trim() : 'N/A'
          console.log(`    Vendedor #${userId} (${nome}): ${individual[0].total} oportunidades`)
        }
      }
    }

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await connection.end()
  }
}

checkTimezone()

