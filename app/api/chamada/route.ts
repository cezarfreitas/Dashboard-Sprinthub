import { NextRequest, NextResponse } from 'next/server'
import { broadcastEvent } from '@/lib/sse'

export const dynamic = 'force-dynamic'

interface ChamadaData {
  vendedor: string
  valor: number
  cliente?: string
  produto?: string
}

// POST - Receber uma nova chamada/venda
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ChamadaData
    
    const chamadaEvent = {
      type: 'nova_venda',
      timestamp: new Date().toISOString(),
      data: {
        vendedor: body.vendedor || 'Vendedor Teste',
        valor: body.valor || Math.floor(Math.random() * 50000) + 10000,
        cliente: body.cliente || 'Cliente Exemplo',
        produto: body.produto || 'Produto Premium',
        id: Date.now().toString()
      }
    }
    
    console.log('Nova chamada recebida:', chamadaEvent)
    
    // Broadcast para todas as conexões SSE
    broadcastEvent(chamadaEvent)
    
    return NextResponse.json({
      success: true,
      message: 'Chamada recebida com sucesso',
      event: chamadaEvent
    })
    
  } catch (error) {
    console.error('Erro ao processar chamada:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar chamada',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// GET - Simular chamada automática (para testes)
export async function GET() {
  try {
    console.log('GET /api/chamada - Simulando chamada...')
    
    const vendedores = ['João Silva', 'Maria Santos', 'Pedro Oliveira', 'Ana Costa']
    const clientes = ['Empresa ABC', 'Loja XYZ', 'Corporação 123', 'Negócios Plus']
    const produtos = ['Plano Premium', 'Pacote Completo', 'Serviço Especial', 'Solução Avançada']
    
    const chamadaEvent = {
      type: 'nova_venda',
      timestamp: new Date().toISOString(),
      data: {
        vendedor: vendedores[Math.floor(Math.random() * vendedores.length)],
        valor: Math.floor(Math.random() * 100000) + 5000,
        cliente: clientes[Math.floor(Math.random() * clientes.length)],
        produto: produtos[Math.floor(Math.random() * produtos.length)],
        id: Date.now().toString()
      }
    }
    
    console.log('Evento gerado:', chamadaEvent)
    
    // Broadcast para todas as conexões SSE
    broadcastEvent(chamadaEvent)
    
    return NextResponse.json({
      success: true,
      message: 'Chamada simulada gerada',
      event: chamadaEvent
    })
    
  } catch (error) {
    console.error('Erro ao simular chamada:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao simular chamada',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
