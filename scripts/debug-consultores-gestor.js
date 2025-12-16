/**
 * Script para debugar consultores do gestor
 */

const mysql = require('mysql2/promise')
require('dotenv').config()

async function debugConsultores() {
  let connection

  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bancointeli',
      port: parseInt(process.env.DB_PORT || '3306')
    })

    console.log('✅ Conectado ao banco de dados\n')

    // 1. Buscar todos os gestores
    console.log('=== GESTORES NO SISTEMA ===')
    const [gestores] = await connection.execute(`
      SELECT id, name, lastName, email 
      FROM vendedores 
      WHERE ativo = 1
      ORDER BY name
    `)
    
    console.log(`Total de vendedores ativos: ${gestores.length}\n`)
    gestores.slice(0, 5).forEach(g => {
      console.log(`  ID: ${g.id} - ${g.name} ${g.lastName} (${g.email})`)
    })
    
    if (gestores.length > 5) {
      console.log(`  ... e mais ${gestores.length - 5} vendedores`)
    }

    // 2. Buscar unidades e seus relacionamentos
    console.log('\n=== UNIDADES E VENDEDORES ===')
    const [unidades] = await connection.execute(`
      SELECT id, nome, name, users, user_gestao, ativo
      FROM unidades
      WHERE ativo = 1
      ORDER BY nome, name
    `)

    console.log(`Total de unidades ativas: ${unidades.length}\n`)

    for (const unidade of unidades.slice(0, 10)) {
      const nomeUnidade = unidade.nome || unidade.name || 'Sem nome'
      console.log(`\nUnidade ${unidade.id}: ${nomeUnidade}`)
      
      // Parsear users
      let users = []
      try {
        if (unidade.users) {
          users = JSON.parse(unidade.users)
        }
      } catch (e) {
        console.log('  ⚠️  Erro ao parsear users')
      }

      // Parsear user_gestao
      let userGestao = []
      try {
        if (unidade.user_gestao) {
          userGestao = JSON.parse(unidade.user_gestao)
        }
      } catch (e) {
        console.log('  ⚠️  Erro ao parsear user_gestao')
      }

      console.log(`  - Vendedores (users): ${users.length > 0 ? users.join(', ') : 'Nenhum'}`)
      console.log(`  - Gestores (user_gestao): ${userGestao.length > 0 ? userGestao.join(', ') : 'Nenhum'}`)

      // Buscar vendedores por unidade_id
      const [vendedores] = await connection.execute(`
        SELECT id, name, lastName, unidade_id, ativo
        FROM vendedores
        WHERE unidade_id = ? AND ativo = 1
      `, [unidade.id])

      console.log(`  - Vendedores (tabela vendedores.unidade_id): ${vendedores.length}`)
      vendedores.forEach(v => {
        console.log(`    * ${v.id} - ${v.name} ${v.lastName}`)
      })
    }

    // 3. Verificar estrutura de dados do localStorage (exemplo)
    console.log('\n=== EXEMPLO DE ESTRUTURA ESPERADA DO GESTOR ===')
    console.log(`{
  "id": 123,
  "name": "João",
  "lastName": "Silva",
  "email": "joao@example.com",
  "unidades": [
    { "id": 90, "nome": "Unidade A", "dpto_gestao": null },
    { "id": 91, "nome": "Unidade B", "dpto_gestao": null }
  ]
}`)

    console.log('\n=== DIAGNÓSTICO ===')
    console.log('✅ Para a página funcionar corretamente:')
    console.log('1. O gestor deve estar autenticado (dados no localStorage)')
    console.log('2. O gestor deve ter unidades associadas (campo "unidades")')
    console.log('3. As unidades devem ter vendedores com unidade_id correspondente')
    console.log('4. Os vendedores devem estar ativos (ativo = 1)')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    throw error
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Desconectado do banco de dados')
    }
  }
}

// Executar
debugConsultores()
  .catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })

