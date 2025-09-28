"use client"

import { useEffect, useState, useCallback } from 'react'

interface NotificationEvent {
  type: string
  timestamp: string
  data: {
    vendedor: string
    valor: number
    cliente: string
    produto: string
    id: string
  }
}

interface UseGlobalNotificationsReturn {
  isConnected: boolean
  lastEvent: NotificationEvent | null
  error: string | null
}

export function useGlobalNotifications(): UseGlobalNotificationsReturn {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<NotificationEvent | null>(null)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(() => {
    console.log('Conectando ao SSE...')
    
    const eventSource = new EventSource('/api/sse')
    
    eventSource.onopen = () => {
      console.log('SSE conectado')
      setIsConnected(true)
      setError(null)
    }
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        console.log('Evento SSE recebido:', data)
        
        if (data.type === 'nova_venda') {
          setLastEvent(data)
        }
      } catch (err) {
        console.error('Erro ao processar evento SSE:', err)
      }
    }
    
    eventSource.onerror = (err) => {
      console.error('Erro SSE:', err)
      setIsConnected(false)
      setError('Erro de conexão')
      
      // Tentar reconectar após 3 segundos
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          connect()
        }
      }, 3000)
    }
    
    return eventSource
  }, [])

  useEffect(() => {
    const eventSource = connect()
    
    return () => {
      console.log('Fechando conexão SSE')
      eventSource.close()
    }
  }, [connect])

  return {
    isConnected,
    lastEvent,
    error
  }
}
