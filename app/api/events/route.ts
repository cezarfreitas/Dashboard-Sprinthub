import { NextRequest } from 'next/server'
import { addConnection, removeConnection } from '@/lib/sse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  // Para build, retornar uma resposta simples
  if (process.env.NODE_ENV === 'production' && !request.headers.get('accept')?.includes('text/event-stream')) {
    return new Response('Server-Sent Events endpoint', {
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  let controller: ReadableStreamDefaultController
  
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl
      // Adiciona a conexão à lista
      addConnection(controller)
      
      // Envia um evento de conexão
      const data = `data: ${JSON.stringify({ type: 'connected', message: 'Conectado ao servidor' })}\n\n`
      controller.enqueue(new TextEncoder().encode(data))
      
      // Remove a conexão quando fechada
      request.signal.addEventListener('abort', () => {
        removeConnection(controller)
      })
    },
    cancel() {
      if (controller) {
        removeConnection(controller)
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  })
}
