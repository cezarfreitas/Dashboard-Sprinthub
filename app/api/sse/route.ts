import { NextRequest } from 'next/server'
import { addConnection, removeConnection } from '@/lib/sse'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      addConnection(controller)
      
      // Enviar evento inicial
      const initialData = `data: ${JSON.stringify({ type: 'connected' })}\n\n`
      controller.enqueue(new TextEncoder().encode(initialData))
      
      // Enviar heartbeat a cada 30 segundos para manter conexão ativa
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat', timestamp: new Date().toISOString() })}\n\n`
          controller.enqueue(new TextEncoder().encode(heartbeat))
        } catch (error) {
          clearInterval(heartbeatInterval)
          removeConnection(controller)
        }
      }, 30000)
      
      // Cleanup quando conexão fechar
      const cleanup = () => {
        clearInterval(heartbeatInterval)
        removeConnection(controller)
      }
      
      request.signal.addEventListener('abort', cleanup)
    },
    
    cancel() {
      removeConnection(this as any)
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  })
}
