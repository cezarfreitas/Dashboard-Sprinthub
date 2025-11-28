#!/usr/bin/env node

/**
 * Script para verificar oportunidades do dia 27/11/2025
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function checkOportunidades() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    console.log('\n📊 VERIFICANDO OPORTUNIDADES DE 27/11/2025\n')
    console.log('=' .repeat(80))

    // Oportunidades criadas em 27/11/2025
    const [criadas] = await connection.execute(`
      SELECT 
        DATE(createDate) as data,
        COUNT(*) as total,
        CAST(user AS UNSIGNED) as vendedor_id
      FROM oportunidades
      WHERE DATE(createDate) = '2025-11-27'
        AND archived = 0
      GROUP BY DATE(createDate), vendedor_id
      ORDER BY vendedor_id
    `)

    console.log(`\n✅ Oportunidades CRIADAS em 27/11/2025: ${criadas.length} registros`)
    
    if (criadas.length > 0) {
      console.log('\nPOR VENDEDOR:')
      for (const row of criadas) {
        // Buscar nome do vendedor
        const [vendedor] = await connection.execute(
          'SELECT name, lastName FROM vendedores WHERE id = ?',
          [row.vendedor_id]
        )
        const vendedorNome = vendedor[0] 
          ? `${vendedor[0].name} ${vendedor[0].lastName || ''}`.trim()
          : 'Sem nome'
        
        console.log(`  - Vendedor #${row.vendedor_id} (${vendedorNome}): ${row.total} oportunidades`)
      }
    } else {
      console.log('\n⚠️  NENHUMA oportunidade criada em 27/11/2025!')
    }

    // Total geral de criadas em 27/11
    const [totalCriadas] = await connection.execute(`
      SELECT 
        COUNT(*) as total
      FROM oportunidades
      WHERE DATE(createDate) = '2025-11-27'
        AND archived = 0
    `)
    console.log(`\n📈 TOTAL GERAL: ${totalCriadas[0].total} oportunidades criadas`)

    // Verificar período completo (últimos 7 dias)
    const [ultimos7dias] = await connection.execute(`
      SELECT 
        DATE(createDate) as data,
        COUNT(*) as total
      FROM oportunidades
      WHERE DATE(createDate) >= DATE_SUB('2025-11-27', INTERVAL 7 DAY)
        AND DATE(createDate) <= '2025-11-27'
        AND archived = 0
      GROUP BY DATE(createDate)
      ORDER BY data DESC
    `)

    console.log('\n📅 ÚLTIMOS 7 DIAS:')
    console.log('=' .repeat(80))
    ultimos7dias.forEach(row => {
      console.log(`  ${row.data}: ${row.total} oportunidades`)
    })

    // Verificar se há datas futuras (problemas de timezone)
    const [futuras] = await connection.execute(`
      SELECT 
        DATE(createDate) as data,
        COUNT(*) as total
      FROM oportunidades
      WHERE DATE(createDate) > '2025-11-27'
        AND archived = 0
      GROUP BY DATE(createDate)
      ORDER BY data ASC
      LIMIT 5
    `)

    if (futuras.length > 0) {
      console.log('\n⚠️  ATENÇÃO: Há oportunidades com datas futuras:')
      futuras.forEach(row => {
        console.log(`  ${row.data}: ${row.total} oportunidades`)
      })
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Verificação concluída!\n')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
  } finally {
    await connection.end()
  }
}

checkOportunidades()

