import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface TableAnalysis {
  [tableName: string]: {
    info: any
    columns: any[]
    indexes: any[]
    rowCount: number
    sampleData: any[]
  }
}

// GET - Analisar estrutura e uso das tabelas
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Analisando estrutura das tabelas...')
    
    // 1. Verificar quais tabelas existem
    const [existingTables] = await executeQuery(`
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
      FROM information_schema.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME LIKE '%meta%'
      ORDER BY TABLE_NAME
    `) as any[]
    
    console.log('📋 Tabelas encontradas:', existingTables)
    
    // 2. Analisar estrutura de cada tabela
    const tableAnalysis: TableAnalysis = {}
    
    for (const table of existingTables) {
      const tableName = table.TABLE_NAME
      
      // Estrutura das colunas
      const [columns] = await executeQuery(`
        SELECT 
          COLUMN_NAME,
          DATA_TYPE,
          IS_NULLABLE,
          COLUMN_DEFAULT,
          EXTRA,
          COLUMN_KEY
        FROM information_schema.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        ORDER BY ORDINAL_POSITION
      `, [tableName]) as any[]
      
      // Índices
      const [indexes] = await executeQuery(`
        SHOW INDEX FROM ${tableName}
      `) as any[]
      
      // Estatísticas de uso
      const [rowCount] = await executeQuery(`
        SELECT COUNT(*) as total_rows FROM ${tableName}
      `) as any[]
      
      // Dados de exemplo (se houver)
      const [sampleData] = await executeQuery(`
        SELECT * FROM ${tableName} LIMIT 3
      `) as any[]
      
      tableAnalysis[tableName] = {
        info: table,
        columns,
        indexes,
        rowCount: rowCount[0]?.total_rows || 0,
        sampleData: sampleData.slice(0, 2) // Apenas 2 registros de exemplo
      }
    }
    
    // 3. Verificar relacionamentos e foreign keys
    const [foreignKeys] = await executeQuery(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
      AND TABLE_NAME LIKE '%meta%'
    `) as any[]
    
    // 4. Análise de uso - verificar se tabelas estão sendo usadas
    const usageAnalysis: Record<string, any> = {}
    
    // Verificar metas_mensais
    if (tableAnalysis.metas_mensais) {
      const [recentMetas] = await executeQuery(`
        SELECT 
          COUNT(*) as total_metas,
          COUNT(DISTINCT vendedor_id) as vendedores_com_meta,
          COUNT(DISTINCT unidade_id) as unidades_com_meta,
          MIN(created_at) as primeira_meta,
          MAX(created_at) as ultima_meta,
          SUM(meta_valor) as valor_total_metas
        FROM metas_mensais
        WHERE status = 'ativa'
      `) as any[]
      
      usageAnalysis.metas_mensais = recentMetas[0]
    }
    
    // Verificar metas_historico
    if (tableAnalysis.metas_historico) {
      const [historicoStats] = await executeQuery(`
        SELECT 
          COUNT(*) as total_registros,
          COUNT(DISTINCT meta_id) as metas_com_historico,
          MIN(created_at) as primeiro_registro,
          MAX(created_at) as ultimo_registro,
          GROUP_CONCAT(DISTINCT acao) as acoes_realizadas
        FROM metas_historico
      `) as any[]
      
      usageAnalysis.metas_historico = historicoStats[0]
    }
    
    // Verificar metas_config (se existir)
    if (tableAnalysis.metas_config) {
      const [configStats] = await executeQuery(`
        SELECT 
          COUNT(*) as total_configs,
          MIN(created_at) as primeira_config,
          MAX(created_at) as ultima_config
        FROM metas_config
      `) as any[]
      
      usageAnalysis.metas_config = configStats[0]
    }
    
    // 5. Recomendações
    const recommendations = []
    
    // Verificar se metas_historico está sendo usado
    if (tableAnalysis.metas_historico && usageAnalysis.metas_historico?.total_registros === 0) {
      recommendations.push({
        type: 'warning',
        table: 'metas_historico',
        message: 'Tabela metas_historico não possui registros. Considerar remoção se não for necessária.',
        action: 'DROP TABLE metas_historico'
      })
    }
    
    // Verificar se metas_config existe e está sendo usada
    if (tableAnalysis.metas_config && usageAnalysis.metas_config?.total_configs === 0) {
      recommendations.push({
        type: 'warning',
        table: 'metas_config',
        message: 'Tabela metas_config não possui registros. Considerar remoção se não for necessária.',
        action: 'DROP TABLE metas_config'
      })
    }
    
    // Verificar colunas desnecessárias
    if (tableAnalysis.metas_mensais) {
      const columns = tableAnalysis.metas_mensais.columns
      const hasUnusedColumns = columns.some(col => 
        ['created_at', 'updated_at'].includes(col.COLUMN_NAME) && 
        !col.COLUMN_DEFAULT
      )
      
      if (hasUnusedColumns) {
        recommendations.push({
          type: 'info',
          table: 'metas_mensais',
          message: 'Considerar adicionar timestamps automáticos se necessário.',
          action: 'ALTER TABLE metas_mensais ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
        })
      }
    }
    
    return NextResponse.json({
      success: true,
      analysis: {
        existingTables: existingTables.map((t: any) => t.TABLE_NAME),
        tableAnalysis,
        foreignKeys,
        usageAnalysis,
        recommendations,
        summary: {
          totalTables: existingTables.length,
          tablesWithData: Object.keys(usageAnalysis).filter(key => 
            usageAnalysis[key] && Object.values(usageAnalysis[key]).some((val: any) => val > 0)
          ).length,
          recommendationsCount: recommendations.length
        }
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('❌ Erro ao analisar tabelas:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao analisar tabelas',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
