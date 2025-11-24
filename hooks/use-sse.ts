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
    setIsDialogOpen(true)
  }, [])

  const closeDialog = useCallback(() => {
    setIsDialogOpen(false)
  }, [])

  useEffect(() => {
    const eventSource = new EventSource('/api/events')
    
    eventSource.onopen = () => {
      setIsConnected(true)
    }

    eventSource.onmessage = (event) => {
      try {
        const data: SSEEvent = JSON.parse(event.data)
        setLastEvent(data)
        
        if (data.type === 'goal_achieved') {
          celebrate()
          playBellSound()
          openDialog()
        }
      } catch (error) {
        // Erro ao processar evento
      }
    }

    eventSource.onerror = () => {
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
