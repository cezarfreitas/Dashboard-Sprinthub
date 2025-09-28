// Manter conexões ativas
const connections = new Set<ReadableStreamDefaultController>()

// Função para enviar evento para todas as conexões
export function broadcastEvent(event: any) {
  console.log('Broadcasting event to', connections.size, 'connections')
  const data = `data: ${JSON.stringify(event)}\n\n`
  
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch (error) {
      console.error('Error broadcasting:', error)
      connections.delete(controller)
    }
  })
}

// Função para adicionar conexão
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
  console.log('New SSE connection. Total:', connections.size)
}

// Função para remover conexão
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
  console.log('SSE connection closed. Remaining:', connections.size)
}