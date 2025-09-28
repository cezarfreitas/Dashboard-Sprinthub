"use client"

import { useCallback } from 'react'
import confetti from 'canvas-confetti'

export function useCelebration() {
  const playSuccessSound = useCallback(() => {
    try {
      // Cria um contexto de áudio
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Função para criar um sininho
      const createBell = (frequency: number, startTime: number, duration: number) => {
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        const filter = audioContext.createBiquadFilter()
        
        // Conecta os nós
        oscillator.connect(filter)
        filter.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        // Configura o oscilador (sininho)
        oscillator.frequency.setValueAtTime(frequency, startTime)
        oscillator.type = 'sine'
        
        // Configura o filtro para som mais suave
        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(2000, startTime)
        filter.Q.setValueAtTime(1, startTime)
        
        // Configura o volume (envelope de sininho)
        gainNode.gain.setValueAtTime(0, startTime)
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.01)
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
        
        // Toca o sininho
        oscillator.start(startTime)
        oscillator.stop(startTime + duration)
      }
      
      const now = audioContext.currentTime
      
      // Sequência de sininhos (escala musical)
      const bellFrequencies = [
        523.25, // C5
        587.33, // D5
        659.25, // E5
        698.46, // F5
        783.99, // G5
      ]
      
      // Toca os sininhos em sequência
      bellFrequencies.forEach((freq, index) => {
        createBell(freq, now + (index * 0.15), 0.8)
      })
      
      // Sininho final mais agudo
      setTimeout(() => {
        createBell(1046.50, audioContext.currentTime, 1.2) // C6
      }, 800)
      
    } catch (error) {
      console.log('Erro ao reproduzir som de sininho:', error)
    }
  }, [])

  const triggerConfetti = useCallback(() => {
    // Fogos de artifício múltiplos
    const duration = 3000
    const animationEnd = Date.now() + duration

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      // Fogos do centro
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2
        }
      })

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2
        }
      })
    }, 250)

    // Fogos especiais no final
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      })
    }, 500)
  }, [])

  const celebrate = useCallback(() => {
    console.log('🎉 Iniciando celebração!')
    // playSuccessSound() // Removido - apenas fogos
    triggerConfetti()
  }, [triggerConfetti])

  return {
    celebrate,
    playSuccessSound,
    triggerConfetti
  }
}
