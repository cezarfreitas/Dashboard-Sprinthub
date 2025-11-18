"use client"

import { useCallback, useRef, useEffect, useState } from 'react'

export function useAudioPlayer() {
  const audioBufferRef = useRef<ArrayBuffer | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const [isReady, setIsReady] = useState(false)
  const isInitializingRef = useRef(false)

  // Preload do áudio imediatamente
  useEffect(() => {
    const preloadAudio = async () => {
      try {
        const response = await fetch('/audio/bell.wav')
        const arrayBuffer = await response.arrayBuffer()
        audioBufferRef.current = arrayBuffer
      } catch (error) {
        // Fallback silencioso
      }
    }
    
    preloadAudio()
  }, [])

  // Inicializar AudioContext automaticamente
  const initAudioContext = useCallback(async () => {
    if (isInitializingRef.current || isReady) return true
    if (typeof window === 'undefined') return false

    try {
      isInitializingRef.current = true
      
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass()
      }

      // Tentar retomar contexto se estiver suspenso
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume()
      }

      setIsReady(true)
      return true
    } catch (error) {
      return false
    } finally {
      isInitializingRef.current = false
    }
  }, [isReady])

  // Listener universal para inicializar áudio com qualquer interação
  useEffect(() => {
    const events = ['click', 'touchstart', 'touchend', 'mousedown', 'keydown']
    
    const handleInteraction = () => {
      initAudioContext()
    }

    // Adicionar listeners em todos os eventos possíveis
    events.forEach(event => {
      document.addEventListener(event, handleInteraction, { once: true, passive: true })
    })

    // Tentar inicializar imediatamente (pode falhar, mas tentamos)
    initAudioContext()

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleInteraction)
      })
    }
  }, [initAudioContext])

  const playAudio = useCallback(async (audioPath: string, volume: number = 0.7) => {
    try {
      // Garantir que está inicializado
      const ready = await initAudioContext()
      if (!ready) {
        // Fallback: tentar HTML5 Audio
        const audio = new Audio(audioPath)
        audio.volume = volume
        audio.play().catch(() => {
          // Silencioso
        })
        return
      }

      // Usar Web Audio API com buffer pré-carregado
      const context = audioContextRef.current
      if (!context) return

      const source = context.createBufferSource()
      const gainNode = context.createGain()
      
      // Se temos buffer pré-carregado e é o bell.wav
      if (audioBufferRef.current && audioPath.includes('bell.wav')) {
        const audioBuffer = await context.decodeAudioData(audioBufferRef.current.slice(0))
        source.buffer = audioBuffer
      } else {
        // Carregar on-demand
        const response = await fetch(audioPath)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await context.decodeAudioData(arrayBuffer)
        source.buffer = audioBuffer
      }

      gainNode.gain.value = Math.max(0, Math.min(1, volume))
      
      source.connect(gainNode)
      gainNode.connect(context.destination)
      
      source.start(0)
    } catch (error) {
      // Fallback final: HTML5 Audio
      try {
        const audio = new Audio(audioPath)
        audio.volume = volume
        audio.play().catch(() => {
          // Silencioso
        })
      } catch {
        // Falhou completamente
      }
    }
  }, [initAudioContext])

  const playBellSound = useCallback(() => {
    playAudio('/audio/bell.wav', 0.7)
  }, [playAudio])

  return {
    playAudio,
    playBellSound,
    isReady // Expor estado de prontidão
  }
}
