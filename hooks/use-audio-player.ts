"use client"

import { useCallback, useRef } from 'react'
import { useAudioPermission } from './use-audio-permission'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { playAudio: playAudioWithPermission } = useAudioPermission()

  const playAudio = useCallback((audioPath: string, volume: number = 0.5) => {
    try {
      // Cria um elemento de áudio se não existir
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      const audio = audioRef.current
      
      // Configura o áudio
      audio.src = audioPath
      audio.volume = volume
      audio.preload = 'auto'
      
      // Toca o áudio
      audio.play().catch(error => {
        console.log('Erro ao reproduzir áudio:', error)
      })
      
    } catch (error) {
      console.log('Erro ao configurar áudio:', error)
    }
  }, [])

  const playBellSound = useCallback(() => {
    console.log('🔔 Tocando bell.wav...')
    
    try {
      const audio = new Audio('/audio/bell.wav')
      audio.volume = 0.6
      
      audio.play().then(() => {
        console.log('✅ bell.wav tocando!')
      }).catch((error) => {
        console.log('❌ Erro ao tocar bell.wav:', error)
      })
      
    } catch (error) {
      console.log('❌ Erro geral:', error)
    }
  }, [])

  const playBellTwice = useCallback(async () => {
    console.log('🔔 Hook: Tocando bell.wav duas vezes...')
    
    // Primeira vez
    console.log('🔔 Hook: Tocando primeira vez...')
    const firstSuccess = await playAudioWithPermission('/audio/bell.wav', 0.6)
    if (firstSuccess) {
      console.log('✅ Hook: bell.wav primeira vez!')
    } else {
      console.log('❌ Hook: Erro primeira vez')
    }
    
    // Segunda vez (após 1 segundo)
    setTimeout(async () => {
      console.log('🔔 Hook: Tocando segunda vez...')
      const secondSuccess = await playAudioWithPermission('/audio/bell.wav', 0.6)
      if (secondSuccess) {
        console.log('✅ Hook: bell.wav segunda vez!')
      } else {
        console.log('❌ Hook: Erro segunda vez')
      }
    }, 1000)
  }, [playAudioWithPermission])

  const playSuccessSound = useCallback(() => {
    // Toca um som de sucesso (você pode substituir por seu arquivo MP3)
    playAudio('/audio/success.mp3', 0.7)
  }, [playAudio])

  const playCelebrationSound = useCallback(() => {
    // Toca um som de celebração (você pode substituir por seu arquivo MP3)
    playAudio('/audio/celebration.mp3', 0.8)
  }, [playAudio])

  return {
    playAudio,
    playBellSound,
    playBellTwice,
    playSuccessSound,
    playCelebrationSound
  }
}
