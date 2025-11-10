import { NextRequest, NextResponse } from 'next/server'
import { syncUnidadesFromSprintHub } from '@/lib/unidades-sync'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Iniciando sincronização manual de unidades...')

    const result = await syncUnidadesFromSprintHub('manual')

    return NextResponse.json({
      success: true,
      message: 'Sincronização concluída com sucesso',
      stats: result
    })

  } catch (error) {
    console.error('❌ Erro na sincronização:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor durante a sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET para verificar status da sincronização
export async function GET(request: NextRequest) {
  try {
    const { executeQuery } = await import('@/lib/database')
    
    // Verificar se a tabela existe
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() AND table_name = 'unidades'
    `) as any[]

    if (tableExists[0]?.count === 0) {
      return NextResponse.json({
        success: true,
        message: 'Tabela de unidades não existe. Execute a sincronização para criar.',
        stats: {
          table_exists: false,
          total: 0,
          last_sync: null
        }
      })
    }

    // Buscar estatísticas
    const totalResult = await executeQuery('SELECT COUNT(*) as total FROM unidades WHERE ativo = 1') as any[]
    const total = totalResult[0]?.total || 0

    const lastSyncResult = await executeQuery(`
      SELECT MAX(synced_at) as last_sync 
      FROM unidades
    `) as any[]
    const lastSync = lastSyncResult[0]?.last_sync

    return NextResponse.json({
      success: true,
      message: 'Status da sincronização obtido com sucesso',
      stats: {
        table_exists: true,
        total,
        last_sync: lastSync
      }
    })

  } catch (error) {
    console.error('❌ Erro ao verificar status:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao verificar status da sincronização',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

