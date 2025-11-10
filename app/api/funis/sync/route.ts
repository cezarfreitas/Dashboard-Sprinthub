import { NextResponse } from 'next/server'
import { syncFunis } from '@/lib/funis-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('🚀 Iniciando sincronização manual de funis...')
    
    const result = await syncFunis()
    
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
    console.error('❌ Erro na sincronização de funis:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

