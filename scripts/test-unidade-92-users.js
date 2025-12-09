#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function test() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    console.log('\n🔍 PROBLEMA IDENTIFICADO: Campo `users` da unidade #92\n')
    console.log('='.repeat(80))

    const [unidade] = await connection.execute(
      'SELECT id, COALESCE(nome, name) as nome, users FROM unidades WHERE id = 92'
    )

    console.log(`✅ Unidade: ${unidade[0].nome || 'null'}`)
    console.log(`Campo users (tipo): ${typeof unidade[0].users}`)
    console.log(`Campo users (valor): "${unidade[0].users}"`)

    // Tentar parsear como JSON
    let userIds = []
    const usersValue = unidade[0].users

    try {
      const parsed = JSON.parse(usersValue)
      userIds = Array.isArray(parsed) ? parsed : []
      console.log(`\n✅ Parse JSON bem-sucedido: ${JSON.stringify(parsed)}`)
    } catch (e) {
      console.log(`\n❌ Parse JSON falhou: ${e.message}`)
      console.log(`\nℹ️  O campo não é JSON válido. Tentando split por vírgula...`)
      
      // Fallback: split por vírgula
      if (typeof usersValue === 'string') {
        userIds = usersValue.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        console.log(`✅ IDs extraídos: ${userIds.join(', ')}`)
      } else if (typeof usersValue === 'number') {
        console.log(`⚠️  Campo é um número: ${usersValue}`)
        // Tentar converter para string e split
        userIds = String(usersValue).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
        console.log(`✅ IDs extraídos (convertendo para string): ${userIds.join(', ')}`)
      }
    }

    if (userIds.length === 0) {
      console.log(`\n❌ NENHUM ID de vendedor extraído!`)
      console.log(`\n💡 CAUSA RAIZ: A função parseJSON da API NÃO lida com strings simples "220,250"`)
      console.log(`   Ela espera JSON: [220, 250] ou [{id: 220}, {id: 250}]`)
      await connection.end()
      return
    }

    console.log(`\n📋 IDs finais: ${userIds.join(', ')}`)

    // Verificar oportunidades do dia 27
    const placeholders = userIds.map(() => '?').join(',')
    const [ops27] = await connection.execute(`
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
    `, userIds)

    console.log(`\n📊 Oportunidades do dia 27/11:`)
    if (ops27.length > 0) {
      let total = 0
      ops27.forEach(o => {
        console.log(`  ✅ ${o.vendedor_nome} (ID: ${o.vendedor_id}): ${o.total} ops`)
        total += o.total
      })
      console.log(`\n  TOTAL: ${total} oportunidades`)
    } else {
      console.log(`  ❌ NENHUMA oportunidade encontrada`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('\n💡 SOLUÇÃO:')
    console.log('  1. Atualizar parseJSON da API para lidar com strings CSV ("220,250")')
    console.log('  2. OU migrar o campo users para JSON válido no banco')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
  } finally {
    await connection.end()
  }
}

test()


















