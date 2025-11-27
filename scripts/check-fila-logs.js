#!/usr/bin/env node

/**
 * Script para verificar logs da fila de leads
 * Verifica se há dados na tabela fila_leads_log
 */

require('dotenv').config({ path: '.env.local' })
require('dotenv').config()

const mysql = require('mysql2/promise')

async function checkFilaLogs() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '3306'),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  })

  try {
    console.log('\n📊 VERIFICANDO LOGS DA FILA DE LEADS\n')
    console.log('=' .repeat(80))

    // Total de logs
    const [totalResult] = await connection.execute(
      'SELECT COUNT(*) as total FROM fila_leads_log'
    )
    console.log(`\n✅ Total de logs: ${totalResult[0].total}`)

    if (totalResult[0].total === 0) {
      console.log('\n⚠️  ATENÇÃO: Nenhum log encontrado!')
      console.log('   Isso significa que ainda não houve distribuições de leads.')
      console.log('   Os logs só são criados quando um lead é distribuído via /api/filav2')
      connection.end()
      return
    }

    // Logs por unidade
    const [byUnidade] = await connection.execute(`
      SELECT 
        u.id as unidade_id,
        u.name as unidade_nome,
        COUNT(*) as total_distribuicoes,
        MAX(fll.distribuido_em) as ultima_distribuicao
      FROM fila_leads_log fll
      LEFT JOIN unidades u ON fll.unidade_id = u.id
      GROUP BY u.id, u.name
      ORDER BY total_distribuicoes DESC
    `)

    console.log('\n📈 LOGS POR UNIDADE:')
    console.log('=' .repeat(80))
    byUnidade.forEach((row) => {
      console.log(`\n  ID: #${row.unidade_id}`)
      console.log(`  Nome: ${row.unidade_nome || 'N/A'}`)
      console.log(`  Distribuições: ${row.total_distribuicoes}`)
      console.log(`  Última: ${row.ultima_distribuicao || 'N/A'}`)
    })

    // Últimos 10 logs
    const [recentLogs] = await connection.execute(`
      SELECT 
        fll.id,
        fll.unidade_id,
        fll.vendedor_id,
        fll.lead_id,
        fll.posicao_fila,
        fll.total_fila,
        fll.distribuido_em,
        u.name as unidade_nome,
        CONCAT(v.name, ' ', COALESCE(v.lastName, '')) as vendedor_nome
      FROM fila_leads_log fll
      LEFT JOIN unidades u ON fll.unidade_id = u.id
      LEFT JOIN vendedores v ON fll.vendedor_id = v.id
      ORDER BY fll.distribuido_em DESC
      LIMIT 10
    `)

    console.log('\n📝 ÚLTIMOS 10 LOGS:')
    console.log('=' .repeat(80))
    recentLogs.forEach((log) => {
      console.log(`\n  ID: #${log.id}`)
      console.log(`  Unidade: ${log.unidade_nome} (#${log.unidade_id})`)
      console.log(`  Vendedor: ${log.vendedor_nome} (#${log.vendedor_id})`)
      console.log(`  Lead: #${log.lead_id || 'N/A'}`)
      console.log(`  Posição: ${log.posicao_fila} de ${log.total_fila}`)
      console.log(`  Data: ${log.distribuido_em}`)
    })

    console.log('\n' + '='.repeat(80))
    console.log('✅ Verificação concluída!\n')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
  } finally {
    await connection.end()
  }
}

checkFilaLogs()

