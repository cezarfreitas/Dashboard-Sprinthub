import { NextRequest, NextResponse } from 'next/server'
import { testConnection, executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Testar conexão
    const isConnected = await testConnection()
    
    if (!isConnected) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao conectar com o banco de dados',
          error: 'Connection failed'
        },
        { status: 500 }
      )
    }

    // Testar query simples
    const result = await executeQuery('SELECT 1 as test, NOW() as current_time')
    
    return NextResponse.json({
      success: true,
      message: 'Conexão com o banco de dados estabelecida!',
      data: {
        connection: 'OK',
        testQuery: result[0],
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Erro no teste de conexão:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query, params = [] } = body

    if (!query) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Query é obrigatória' 
        },
        { status: 400 }
      )
    }

    // Executar query personalizada
    const result = await executeQuery(query, params)
    
    return NextResponse.json({
      success: true,
      message: 'Query executada com sucesso!',
      data: result
    })

  } catch (error) {
    console.error('Erro ao executar query:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao executar query',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
