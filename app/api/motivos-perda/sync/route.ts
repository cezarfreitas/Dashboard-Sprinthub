import { NextResponse } from 'next/server'
import { syncMotivosPerda } from '@/lib/motivos-perda-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    console.log('🚀 Iniciando sincronização manual de motivos de perda...')
    
    const result = await syncMotivosPerda()
    
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
    console.error('❌ Erro na sincronização de motivos de perda:', error)
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

