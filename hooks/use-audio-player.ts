"use client"

import { useCallback, useRef, useEffect } from 'react'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isInitializedRef = useRef(false)

  // Inicializar AudioContext na primeira interação do usuário
  const initAudioContext = useCallback(() => {
    if (!isInitializedRef.current && typeof window !== 'undefined') {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
        audioContextRef.current = new AudioContextClass()
        isInitializedRef.current = true
      } catch (error) {
        // Fallback silencioso
      }
    }
  }, [])

  // Tentar inicializar no primeiro clique do usuário
  useEffect(() => {
    const handleFirstInteraction = () => {
      initAudioContext()
      // Remover listener após primeira interação
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }

    document.addEventListener('click', handleFirstInteraction)
    document.addEventListener('touchstart', handleFirstInteraction)

    return () => {
      document.removeEventListener('click', handleFirstInteraction)
      document.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [initAudioContext])

  const playAudio = useCallback((audioPath: string, volume: number = 0.7) => {
    try {
      // Garantir que AudioContext está inicializado
      initAudioContext()

      // Criar novo áudio a cada chamada para evitar conflitos
      const audio = new Audio(audioPath)
      audio.volume = Math.max(0, Math.min(1, volume))
      audio.preload = 'auto'
      
      // Tentar tocar com várias estratégias
      const playPromise = audio.play()
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            // Som tocado com sucesso
          })
          .catch(() => {
            // Fallback: tentar novamente após pequeno delay
            setTimeout(() => {
              audio.play().catch(() => {
                // Silencioso - usuário pode não ter interagido ainda
              })
            }, 100)
          })
      }
      
    } catch (error) {
      // Fallback silencioso
    }
  }, [initAudioContext])

  const playBellSound = useCallback(() => {
    playAudio('/audio/bell.wav', 0.7)
  }, [playAudio])

  return {
    playAudio,
    playBellSound
  }
}
