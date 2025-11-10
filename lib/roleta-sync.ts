import { executeQuery } from '@/lib/database'

/**
 * Sincroniza automaticamente a fila de uma roleta com os vendedores da unidade
 */
export async function sincronizarRoletaUnidade(unidadeId: number): Promise<void> {
  try {
    // Verificar se a roleta existe, se não existir, criar
    const roletas = await executeQuery(
      'SELECT id FROM roletas WHERE unidade_id = ?',
      [unidadeId]
    ) as any[]

    let roletaId: number

    if (roletas.length === 0) {
      // Criar roleta automaticamente se não existir
      const result = await executeQuery(
        'INSERT INTO roletas (unidade_id, ativo) VALUES (?, TRUE)',
        [unidadeId]
      ) as any
      roletaId = result.insertId
      console.log(`✅ Roleta criada automaticamente para unidade ${unidadeId}`)
    } else {
      roletaId = roletas[0].id
    }

    // Buscar todos os vendedores da unidade
    const vendedores = await executeQuery(`
      SELECT v.id, v.name, v.lastName
      FROM vendedores v
      JOIN vendedores_unidades vu ON v.id = vu.vendedor_id
      WHERE vu.unidade_id = ?
      ORDER BY v.name
    `, [unidadeId]) as any[]

    // Limpar fila atual
    await executeQuery('DELETE FROM fila_roleta WHERE roleta_id = ?', [roletaId])

    // Adicionar todos os vendedores na nova fila
    for (let i = 0; i < vendedores.length; i++) {
      await executeQuery(`
        INSERT INTO fila_roleta (roleta_id, vendedor_id, ordem)
        VALUES (?, ?, ?)
      `, [roletaId, vendedores[i].id, i + 1])
    }

    console.log(`🔄 Roleta ${roletaId} sincronizada com ${vendedores.length} vendedores`)
  } catch (error) {
    console.error(`❌ Erro ao sincronizar roleta da unidade ${unidadeId}:`, error)
    throw error
  }
}

/**
 * Sincroniza todas as roletas existentes
 */
export async function sincronizarTodasRoletas(): Promise<void> {
  try {
    const unidades = await executeQuery('SELECT id FROM unidades') as any[]
    
    console.log(`🔄 Sincronizando ${unidades.length} roletas...`)
    
    for (const unidade of unidades) {
      await sincronizarRoletaUnidade(unidade.id)
    }
    
    console.log('✅ Todas as roletas foram sincronizadas')
  } catch (error) {
    console.error('❌ Erro ao sincronizar todas as roletas:', error)
    throw error
  }
}

/**
 * Remove roleta de uma unidade (quando a unidade é deletada)
 */
export async function removerRoletaUnidade(unidadeId: number): Promise<void> {
  try {
    await executeQuery('DELETE FROM roletas WHERE unidade_id = ?', [unidadeId])
    console.log(`🗑️ Roleta removida da unidade ${unidadeId}`)
  } catch (error) {
    console.error(`❌ Erro ao remover roleta da unidade ${unidadeId}:`, error)
    throw error
  }
}
