// Manter conexões ativas
const connections = new Set<ReadableStreamDefaultController>()

// Fila de notificações
const notificationQueue: any[] = []
let isProcessingQueue = false
const QUEUE_INTERVAL = 2500 // 2.5 segundos entre cada notificação

// Função para processar fila de notificações
async function processQueue() {
  if (isProcessingQueue || notificationQueue.length === 0) {
    return
  }

  isProcessingQueue = true

  while (notificationQueue.length > 0) {
    const event = notificationQueue.shift()
    
    if (event && connections.size > 0) {
      const data = `data: ${JSON.stringify(event)}\n\n`
      
      connections.forEach(controller => {
        try {
          controller.enqueue(new TextEncoder().encode(data))
        } catch (error) {
          connections.delete(controller)
        }
      })
    }
    
    // Aguardar intervalo antes de enviar próxima notificação
    if (notificationQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, QUEUE_INTERVAL))
    }
  }

  isProcessingQueue = false
}

// Função para enviar evento para todas as conexões (com fila)
export function broadcastEvent(event: any) {
  if (connections.size === 0) {
    // Nenhuma conexão ativa - evento será perdido
    return
  }
  
  // Adicionar à fila
  notificationQueue.push(event)
  
  // Iniciar processamento da fila se não estiver processando
  if (!isProcessingQueue) {
    processQueue()
  }
}

// Função para obter número de conexões ativas (para debug)
export function getActiveConnectionsCount(): number {
  return connections.size
}

// Função para obter tamanho da fila (para debug)
export function getQueueSize(): number {
  return notificationQueue.length
}

// Função para adicionar conexão
export function addConnection(controller: ReadableStreamDefaultController) {
  connections.add(controller)
}

// Função para remover conexão
export function removeConnection(controller: ReadableStreamDefaultController) {
  connections.delete(controller)
}