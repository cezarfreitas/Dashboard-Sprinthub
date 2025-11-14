import { NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Descrever estrutura da tabela
    const structure = await executeQuery('DESCRIBE unidades') as any[]
    
    // Buscar uma unidade de exemplo
    const sample = await executeQuery('SELECT * FROM unidades LIMIT 1') as any[]
    
    return NextResponse.json({
      success: true,
      structure,
      sample: sample[0] || null,
      columns: structure.map(s => s.Field)
    })
  } catch (error) {
    console.error('Erro:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}




















