"use client"

import { useEffect, useState, useCallback } from 'react'
import { useCelebration } from './use-celebration'
import { useAudioPlayer } from './use-audio-player'

interface SSEEvent {
  type: string
  message: string
  data?: any
  timestamp: string
}

export function useSSE() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState<SSEEvent | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const { celebrate } = useCelebration()
  const { playBellSound } = useAudioPlayer()

  const openDialog = useCallback(() => {
    console.log('Abrindo dialog via SSE')
    setIsDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  useEffect(() => {
    const eventSource = new EventSource('/api/events')
    
    eventSource.onopen = () => {
      console.log('SSE conectado')
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data)
        console.log('📡 Evento SSE recebido:', data)
        setLastEvent(data)
        
        if (data.type === 'goal_achieved') {
          console.log('🎯 Objetivo alcançado via SSE - iniciando celebração')
          console.log('🎉 Chamando celebrate()...')
          celebrate() // 🎉 Apenas fogos (sem sons sintéticos)
          console.log('🔔 Chamando playBellSound()...')
          playBellSound() // 🔔 bell.wav
          console.log('📱 Chamando openDialog()...')
          openDialog()
        }
      } catch (error) {
        console.error('❌ Erro ao processar evento SSE:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('Erro na conexão SSE:', error)
      setIsConnected(false)
    }

    return () => {
      eventSource.close()
      setIsConnected(false)
    }
  }, [openDialog])

  return {
    isConnected,
    lastEvent,
    isDialogOpen,
    openDialog,
    closeDialog
  }
}
