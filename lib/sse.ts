// Manter conexões ativas
const connections = new Set<ReadableStreamDefaultController>()

// Função para enviar evento para todas as conexões
export function broadcastEvent(event: any) {
  if (connections.size === 0) {
    // Nenhuma conexão ativa - evento será perdido
    return
  }
  
  const data = `data: ${JSON.stringify(event)}\n\n`
  
  connections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(data))
    } catch (error) {
      connections.delete(controller)
    }
  })
}

// Função para obter número de conexões ativas (para debug)
export function getActiveConnectionsCount(): number {
  return connections.size
}

// Função para adicionar conexão
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
}

// Função para remover conexão
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
}