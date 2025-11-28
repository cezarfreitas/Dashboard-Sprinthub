#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function checkUsers() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    const [unidades] = await connection.execute(`
      SELECT id, nome, users, fila_leads
      FROM unidades
      WHERE ativo = 1
      LIMIT 5
    `)

    console.log('\n📊 CAMPO "users" DAS UNIDADES:\n')
    console.log('='.repeat(80))

    for (const un of unidades) {
      console.log(`\n#${un.id} - ${un.nome}`)
      console.log(`  users: ${un.users ? un.users.substring(0, 200) : 'NULL'}...`)
      console.log(`  fila_leads: ${un.fila_leads ? un.fila_leads.substring(0, 200) : 'NULL'}...`)
      
      // Tentar parsear
      if (un.users) {
        try {
          const parsed = JSON.parse(un.users)
          console.log(`  ✅ JSON válido! ${Array.isArray(parsed) ? parsed.length : 0} itens`)
        } catch (e) {
          console.log(`  ❌ JSON INVÁLIDO: ${e.message}`)
        }
      }
    }

    console.log('\n' + '='.repeat(80))

  } catch (error) {
    console.error('❌ Erro:', error.message)
  } finally {
    await connection.end()
  }
}

checkUsers()

