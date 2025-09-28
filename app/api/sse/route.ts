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
      
      // Cleanup quando conexão fechar
      const cleanup = () => {
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
