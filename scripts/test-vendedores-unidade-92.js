#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function testVendedores() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    console.log('\n👥 VERIFICANDO VENDEDORES DA UNIDADE #92 (CE OUTDOOR)\n')
    console.log('='.repeat(80))

    // Buscar unidade
    const [unidade] = await connection.execute(
      'SELECT id, nome, users FROM unidades WHERE id = 92'
    )

    if (!unidade[0]) {
      console.log('❌ Unidade #92 não encontrada!')
      await connection.end()
      return
    }

    console.log(`✅ Unidade encontrada: ${unidade[0].nome}`)
    console.log(`Campo users (raw): ${unidade[0].users}`)

    // Tentar parsear users
    let usersArray = []
    try {
      usersArray = JSON.parse(unidade[0].users)
      console.log(`✅ Users parseado com sucesso: ${JSON.stringify(usersArray)}`)
    } catch (e) {
      console.log(`❌ Erro ao parsear users: ${e.message}`)
      
      // Tentar extrair IDs manualmente se não for JSON válido
      const matches = unidade[0].users.match(/\d+/g)
      if (matches) {
        usersArray = matches.map(id => parseInt(id))
        console.log(`⚠️  IDs extraídos manualmente: ${usersArray.join(', ')}`)
      }
    }

    const userIds = usersArray.map(u => typeof u === 'object' ? u.id : u).filter(id => id)
    console.log(`\n📋 IDs de vendedores da unidade: ${userIds.join(', ')}`)

    // Verificar se esses vendedores estão ativos
    for (const userId of userIds) {
      const [vendedor] = await connection.execute(
        'SELECT id, name, lastName, ativo FROM vendedores WHERE id = ?',
        [userId]
      )
      
      if (vendedor[0]) {
        const nome = `${vendedor[0].name} ${vendedor[0].lastName || ''}`.trim()
        const status = vendedor[0].ativo ? '✅ ATIVO' : '❌ INATIVO'
        console.log(`  ${status} - ID ${userId}: ${nome}`)
      } else {
        console.log(`  ❌ VENDEDOR ID ${userId} NÃO ENCONTRADO NO BANCO!`)
      }
    }

    // Buscar oportunidades do dia 27/11 para esses vendedores
    const placeholders = userIds.map(() => '?').join(',')
    const [oportunidades] = await connection.execute(`
      SELECT 
        CAST(user AS UNSIGNED) as vendedor_id,
        COALESCE(CONCAT(v.name, ' ', v.lastName), v.name) as vendedor_nome,
        COUNT(*) as total
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      WHERE DATE(createDate) = '2025-11-27'
        AND archived = 0
        AND CAST(o.user AS UNSIGNED) IN (${placeholders})
      GROUP BY CAST(o.user AS UNSIGNED), v.name, v.lastName
      ORDER BY total DESC
    `, userIds)

    console.log(`\n📊 Oportunidades criadas no dia 27/11 por vendedor:`)
    if (oportunidades.length > 0) {
      let totalGeral = 0
      oportunidades.forEach(o => {
        console.log(`  ${o.vendedor_nome || 'Sem nome'} (ID: ${o.vendedor_id}): ${o.total} oportunidades`)
        totalGeral += o.total
      })
      console.log(`\n  TOTAL: ${totalGeral} oportunidades`)
    } else {
      console.log(`  ❌ NENHUMA oportunidade encontrada para esses vendedores no dia 27/11!`)
      
      // Ver se há oportunidades do dia 27 para QUALQUER vendedor
      const [todasOps] = await connection.execute(`
        SELECT COUNT(*) as total
        FROM oportunidades
        WHERE DATE(createDate) = '2025-11-27'
          AND archived = 0
      `)
      console.log(`\n  ℹ️  Total de oportunidades no sistema para 27/11: ${todasOps[0].total}`)
    }

    // Testar a query EXATA da API
    console.log(`\n🔍 TESTANDO QUERY EXATA DA API:\n`)
    const queryAPI = `
      SELECT 
        DATE(o.createDate) as data,
        DAY(o.createDate) as dia,
        MONTH(o.createDate) as mes,
        YEAR(o.createDate) as ano,
        CAST(o.user AS UNSIGNED) as vendedor_id,
        COALESCE(CONCAT(v.name, ' ', v.lastName), v.name, 'Sem vendedor') as vendedor_nome,
        COUNT(*) as total
      FROM oportunidades o
      LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
      WHERE o.archived = 0
        AND DATE(o.createDate) >= DATE(?)
        AND DATE(o.createDate) <= DATE(?)
        AND CAST(o.user AS UNSIGNED) IN (${placeholders})
      GROUP BY DATE(o.createDate), DAY(o.createDate), MONTH(o.createDate), YEAR(o.createDate), CAST(o.user AS UNSIGNED), v.name, v.lastName
      ORDER BY data ASC, vendedor_nome ASC
    `

    const [resultadoAPI] = await connection.execute(queryAPI, ['2025-11-01', '2025-11-27', ...userIds])
    
    console.log(`Query retornou ${resultadoAPI.length} registros`)
    
    // Filtrar apenas dia 27
    const dia27 = resultadoAPI.filter(r => {
      const dataStr = r.data instanceof Date 
        ? r.data.toISOString().split('T')[0] 
        : String(r.data).split('T')[0]
      return dataStr === '2025-11-27'
    })

    if (dia27.length > 0) {
      console.log(`\n✅ Dia 27/11 ENCONTRADO na query da API:`)
      dia27.forEach(r => {
        const dataStr = r.data instanceof Date 
          ? r.data.toISOString().split('T')[0] 
          : String(r.data).split('T')[0]
        console.log(`  ${dataStr} - ${r.vendedor_nome}: ${r.total} oportunidades`)
      })
    } else {
      console.log(`\n❌ Dia 27/11 NÃO aparece na query da API!`)
      console.log(`\n📅 Últimas datas retornadas pela query:`)
      const ultimasDatas = resultadoAPI.slice(-5)
      ultimasDatas.forEach(r => {
        const dataStr = r.data instanceof Date 
          ? r.data.toISOString().split('T')[0] 
          : String(r.data).split('T')[0]
        console.log(`  ${dataStr} - ${r.vendedor_nome}: ${r.total} ops`)
      })
    }

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await connection.end()
  }
}

testVendedores()
















