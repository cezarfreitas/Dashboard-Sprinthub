import { NextResponse } from 'next/server'
import { syncOportunidades } from '@/lib/oportunidades-sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutos para processar todas as oportunidades

export async function POST() {
  try {
    console.log('🔄 Iniciando sincronização manual de oportunidades...')
    
    const result = await syncOportunidades()
    
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
    console.error('Erro ao sincronizar oportunidades:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao sincronizar oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

