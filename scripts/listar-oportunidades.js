require('dotenv').config()
const mysql = require('mysql2/promise')

async function listarOportunidades() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    })

    console.log('📊 Consultando últimas oportunidades no banco...\n')

    const [rows] = await conn.query(`
      SELECT 
        id, 
        title, 
        status, 
        value,
        createDate
      FROM oportunidades 
      ORDER BY id DESC 
      LIMIT 20
    `)

    if (rows.length === 0) {
      console.log('❌ Nenhuma oportunidade encontrada no banco')
    } else {
      console.log(`✅ ${rows.length} oportunidades encontradas:\n`)
      console.table(rows)
      
      console.log('\n📋 IDs disponíveis para teste:')
      rows.forEach((row, index) => {
        if (index < 5) {
          console.log(`  • ID ${row.id} - ${row.title} (${row.status})`)
        }
      })
      
      console.log(`\n🧪 Teste no browser: http://localhost:3000/api/oportunidades/${rows[0].id}`)
    }

    await conn.end()
  } catch (error) {
    console.error('❌ Erro:', error.message)
  }
}

listarOportunidades()

