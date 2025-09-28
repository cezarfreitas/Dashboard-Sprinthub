"use client"

import { useState, useEffect, useCallback } from 'react'

export function useAudioPermission() {
  const [hasPermission, setHasPermission] = useState(false)
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null)

  const requestPermission = useCallback(async () => {
    try {
      // Cria um contexto de áudio para "desbloquear" o áudio
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Se estiver suspenso, resume
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      
      setAudioContext(ctx)
      setHasPermission(true)
      console.log('✅ Permissão de áudio concedida!')
      
      return true
    } catch (error) {
      console.log('❌ Erro ao solicitar permissão de áudio:', error)
      return false
    }
  }, [])

  const playAudio = useCallback(async (src: string, volume: number = 0.6) => {
    if (!hasPermission) {
      console.log('⚠️ Sem permissão de áudio, solicitando...')
      const granted = await requestPermission()
      if (!granted) {
        console.log('❌ Permissão de áudio negada')
        return false
      }
    }

    try {
      const audio = new Audio(src)
      audio.volume = volume
      
      await audio.play()
      console.log('✅ Áudio tocando:', src)
      return true
    } catch (error) {
      console.log('❌ Erro ao tocar áudio:', error)
      return false
    }
  }, [hasPermission, requestPermission])

  // Solicita permissão na primeira interação
  useEffect(() => {
    const handleFirstInteraction = () => {
      requestPermission()
      // Remove os listeners após a primeira interação
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('keydown', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('keydown', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [requestPermission])

  return {
    hasPermission,
    requestPermission,
    playAudio
  }
}
