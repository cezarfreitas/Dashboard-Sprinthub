#!/usr/bin/env node

/**
 * Script para testar a API /api/oportunidades/diaria com parâmetros específicos
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function testAPIDiaria() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    console.log('\n🧪 TESTE DA API /api/oportunidades/diaria\n')
    console.log('=' .repeat(80))

    // Simular parâmetros que a tela do Gestor envia
    const dataInicio = '2025-11-01'
    const dataFim = '2025-11-30'
    const tipo = 'criadas'

    // Listar todas as unidades
    const [unidades] = await connection.execute(`
      SELECT id, COALESCE(nome, name) as nome
      FROM unidades
      WHERE ativo = 1
      ORDER BY nome
    `)

    console.log(`\n✅ Total de unidades ativas: ${unidades.length}`)

    // Testar para cada unidade
    for (const unidade of unidades.slice(0, 10)) { // Primeiras 10 unidades
      console.log(`\n📍 Testando Unidade #${unidade.id} (${unidade.nome})`)
      console.log('─'.repeat(80))

      // Buscar vendedores da unidade
      const [unidadeData] = await connection.execute(`
        SELECT users FROM unidades WHERE id = ?
      `, [unidade.id])

      if (!unidadeData[0] || !unidadeData[0].users) {
        console.log('   ⚠️  Sem vendedores configurados')
        continue
      }

      let userIds = []
      try {
        const users = JSON.parse(unidadeData[0].users)
        userIds = users.map(u => typeof u === 'object' ? u.id : u).filter(id => id)
      } catch (e) {
        console.log('   ⚠️  Erro ao parsear users')
        continue
      }

      if (userIds.length === 0) {
        console.log('   ⚠️  Nenhum vendedor ativo')
        continue
      }

      // Query similar à API
      const placeholders = userIds.map(() => '?').join(',')
      const [resultados] = await connection.execute(`
        SELECT 
          DATE(createDate) as data,
          DAY(createDate) as dia,
          MONTH(createDate) as mes,
          YEAR(createDate) as ano,
          COUNT(*) as total
        FROM oportunidades o
        WHERE o.archived = 0
          AND DATE(createDate) >= DATE(?)
          AND DATE(createDate) <= DATE(?)
          AND CAST(o.user AS UNSIGNED) IN (${placeholders})
        GROUP BY DATE(createDate), DAY(createDate), MONTH(createDate), YEAR(createDate)
        HAVING DATE(createDate) = '2025-11-27'
        ORDER BY data ASC
      `, [dataInicio, dataFim, ...userIds])

      if (resultados.length > 0) {
        console.log(`   ✅ ENCONTRADO! ${resultados[0].total} oportunidades em 27/11`)
        console.log(`   Vendedores: ${userIds.length} vendedores na unidade`)
        
        // Detalhar por vendedor
        const [porVendedor] = await connection.execute(`
          SELECT 
            CAST(o.user AS UNSIGNED) as vendedor_id,
            CONCAT(v.name, ' ', COALESCE(v.lastName, '')) as vendedor_nome,
            COUNT(*) as total
          FROM oportunidades o
          LEFT JOIN vendedores v ON CAST(o.user AS UNSIGNED) = v.id
          WHERE o.archived = 0
            AND DATE(createDate) = '2025-11-27'
            AND CAST(o.user AS UNSIGNED) IN (${placeholders})
          GROUP BY vendedor_id, vendedor_nome
        `, userIds)

        porVendedor.forEach(v => {
          console.log(`      - ${v.vendedor_nome}: ${v.total} oportunidades`)
        })
      } else {
        console.log('   ❌ NENHUMA oportunidade em 27/11 para esta unidade')
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('✅ Teste concluído!\n')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    console.error(error.stack)
  } finally {
    await connection.end()
  }
}

testAPIDiaria()

