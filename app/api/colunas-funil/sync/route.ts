import { NextResponse } from 'next/server'
import { syncColunasFunil } from '@/lib/colunas-funil-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('🚀 Iniciando sincronização manual de colunas de funil...')
    
    const result = await syncColunasFunil()
    
    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        stats: result.stats
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          message: result.message
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Erro na sincronização de colunas de funil:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

