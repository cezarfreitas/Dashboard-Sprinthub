import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Remover campo 'motivo' da tabela metas_mensais
export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Verificando se campo "motivo" existe na tabela metas_mensais...')
    
    // Verificar se o campo existe
    const columnExists = await executeQuery(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'metas_mensais'
        AND COLUMN_NAME = 'motivo'
    `) as any[]
    
    if (columnExists[0]?.count === 0) {
      return NextResponse.json({
        success: true,
        message: 'Campo "motivo" não existe na tabela metas_mensais. Nada a fazer.',
        removed: false
      })
    }
    
    // Remover o campo
    console.log('🗑️ Removendo campo "motivo" da tabela metas_mensais...')
    await executeQuery(`ALTER TABLE metas_mensais DROP COLUMN motivo`)
    
    console.log('✅ Campo "motivo" removido com sucesso!')
    
    return NextResponse.json({
      success: true,
      message: 'Campo "motivo" removido da tabela metas_mensais com sucesso',
      removed: true
    })
    
  } catch (error) {
    console.error('❌ Erro ao remover campo motivo:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao remover campo motivo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}


