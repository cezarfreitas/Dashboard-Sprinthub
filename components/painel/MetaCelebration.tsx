"use client"

import { useState, useEffect, useCallback, memo, useRef } from "react"
import confetti from "canvas-confetti"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Trophy, PartyPopper, Sparkles, Volume2, VolumeX } from "lucide-react"
import { cn } from "@/lib/utils"

interface MetaCelebrationProps {
  isMetaBatida: boolean
  percentualAtingido: number
  valorAtingido: number
  meta: number
  periodoLabel?: string
}

const STORAGE_KEY = "painel-meta-celebration-dismissed"
const SOUND_ENABLED_KEY = "painel-meta-celebration-sound"

// Som de aplausos local
const APPLAUSE_SOUND_URL = "/audio/applause.mp3"

// Formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

// Função para tocar som de aplausos
function playApplauseSound(volume: number = 0.6): HTMLAudioElement | null {
  try {
    const audio = new Audio(APPLAUSE_SOUND_URL)
    audio.volume = volume
    audio.preload = "auto"
    
    // Tentar tocar
    const playPromise = audio.play()
    
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log("Autoplay bloqueado, aguardando interação:", error.message)
      })
    }
    
    return audio
  } catch (error) {
    console.log("Erro ao criar áudio:", error)
    return null
  }
}

// Função para disparar confetes
function fireConfetti(withSound: boolean = true) {
  const duration = 4000
  const animationEnd = Date.now() + duration
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

  function randomInRange(min: number, max: number) {
    return Math.random() * (max - min) + min
  }

  // Tocar som de aplausos
  if (withSound) {
    playApplauseSound(0.5)
  }

  const interval = setInterval(() => {
    const timeLeft = animationEnd - Date.now()

    if (timeLeft <= 0) {
      clearInterval(interval)
      return
    }

    const particleCount = 50 * (timeLeft / duration)

    // Confetes dos dois lados
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors: ["#22c55e", "#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"],
    })
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors: ["#22c55e", "#10b981", "#34d399", "#6ee7b7", "#fbbf24", "#f59e0b"],
    })
  }, 250)

  // Fogos de artifício no centro
  setTimeout(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0.5, y: 0.5 },
      colors: ["#22c55e", "#fbbf24", "#ffffff"],
      zIndex: 9999,
    })
  }, 300)

  setTimeout(() => {
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { x: 0.5, y: 0.4 },
      colors: ["#10b981", "#f59e0b", "#fef3c7"],
      zIndex: 9999,
    })
  }, 600)
}

function MetaCelebration({
  isMetaBatida,
  percentualAtingido,
  valorAtingido,
  meta,
  periodoLabel = "do mês",
}: MetaCelebrationProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [dontShowAgain, setDontShowAgain] = useState(false)
  const [hasShownThisSession, setHasShownThisSession] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [pendingSound, setPendingSound] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Pré-carregar áudio
  useEffect(() => {
    const audio = new Audio(APPLAUSE_SOUND_URL)
    audio.preload = "auto"
    audio.load()
    audioRef.current = audio
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  // Carregar preferência de som
  useEffect(() => {
    const savedSound = localStorage.getItem(SOUND_ENABLED_KEY)
    if (savedSound !== null) {
      setSoundEnabled(savedSound === "true")
    }
  }, [])

  // Tocar som pendente após interação do usuário
  useEffect(() => {
    if (!pendingSound || !soundEnabled) return

    const playPendingSound = () => {
      if (audioRef.current && soundEnabled) {
        audioRef.current.currentTime = 0
        audioRef.current.volume = 0.5
        audioRef.current.play().catch(() => {})
        setPendingSound(false)
      }
      // Remover listener após tocar
      document.removeEventListener("click", playPendingSound)
      document.removeEventListener("keydown", playPendingSound)
    }

    // Tentar tocar imediatamente
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.volume = 0.5
      const playPromise = audioRef.current.play()
      
      if (playPromise) {
        playPromise
          .then(() => {
            setPendingSound(false)
          })
          .catch(() => {
            // Autoplay bloqueado - aguardar interação
            document.addEventListener("click", playPendingSound, { once: true })
            document.addEventListener("keydown", playPendingSound, { once: true })
          })
      }
    }

    return () => {
      document.removeEventListener("click", playPendingSound)
      document.removeEventListener("keydown", playPendingSound)
    }
  }, [pendingSound, soundEnabled])

  // Verificar se deve mostrar celebração
  useEffect(() => {
    if (!isMetaBatida || hasShownThisSession) return

    // Verificar localStorage
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      try {
        const dismissedData = JSON.parse(dismissed)
        const now = new Date()
        const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
        
        // Se foi dispensado neste mês, não mostrar
        if (dismissedData.month === currentMonth && dismissedData.dismissed) {
          return
        }
      } catch {
        // JSON inválido, ignorar
      }
    }

    // Verificar preferência de som
    const savedSound = localStorage.getItem(SOUND_ENABLED_KEY)
    const shouldPlaySound = savedSound !== "false"

    // Mostrar celebração com delay para carregar a página primeiro
    const timer = setTimeout(() => {
      setShowDialog(true)
      setHasShownThisSession(true)
      // Disparar confetes (sem som aqui, som é gerenciado separadamente)
      fireConfetti(false)
      // Marcar som como pendente (será tocado imediatamente ou após interação)
      if (shouldPlaySound) {
        setPendingSound(true)
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [isMetaBatida, hasShownThisSession])

  const handleClose = useCallback(() => {
    if (dontShowAgain) {
      const now = new Date()
      const currentMonth = `${now.getFullYear()}-${now.getMonth() + 1}`
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ dismissed: true, month: currentMonth })
      )
    }
    // Parar som se estiver tocando
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    setShowDialog(false)
  }, [dontShowAgain])

  const handleCelebrate = useCallback(() => {
    // Disparar confetes
    fireConfetti(false)
    // Tocar som (usuário já interagiu, então vai funcionar)
    if (soundEnabled && audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.volume = 0.5
      audioRef.current.play().catch(() => {})
    }
  }, [soundEnabled])

  const toggleSound = useCallback(() => {
    const newValue = !soundEnabled
    setSoundEnabled(newValue)
    localStorage.setItem(SOUND_ENABLED_KEY, String(newValue))
  }, [soundEnabled])

  if (!isMetaBatida) return null

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950 border-emerald-500/30 text-white">
        <DialogHeader className="text-center space-y-4">
          {/* Ícone animado */}
          <div className="mx-auto relative">
            <div className="absolute inset-0 animate-ping">
              <div className="h-20 w-20 rounded-full bg-emerald-500/20" />
            </div>
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-green-600 shadow-lg shadow-emerald-500/30">
              <Trophy className="h-10 w-10 text-white" />
            </div>
          </div>

          <DialogTitle className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 via-green-300 to-yellow-300">
            🎉 PARABÉNS! 🎉
          </DialogTitle>
          
          <DialogDescription className="text-lg text-emerald-100/90">
            Vocês bateram a meta {periodoLabel}!
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10 text-center">
              <div className="text-sm text-gray-400 mb-1">Meta</div>
              <div className="text-xl font-bold text-white">{formatCurrency(meta)}</div>
            </div>
            <div className="bg-emerald-500/10 rounded-xl p-4 border border-emerald-500/30 text-center">
              <div className="text-sm text-emerald-300 mb-1">Atingido</div>
              <div className="text-xl font-bold text-emerald-400">{formatCurrency(valorAtingido)}</div>
            </div>
          </div>

          {/* Percentual */}
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500/20 to-green-500/20 rounded-full border border-emerald-500/30">
              <Sparkles className="h-5 w-5 text-yellow-400" />
              <span className="text-2xl font-black text-emerald-300">
                {percentualAtingido.toFixed(1)}% da meta!
              </span>
              <Sparkles className="h-5 w-5 text-yellow-400" />
            </div>
          </div>

          {/* Mensagem motivacional */}
          <p className="text-center text-gray-300 text-sm">
            Excelente trabalho de toda a equipe! 
            Continuem assim e vamos superar ainda mais! 💪
          </p>
        </div>

        <DialogFooter className="flex-col gap-4 sm:flex-col">
          <div className="flex gap-3 w-full">
            <Button
              onClick={toggleSound}
              variant="outline"
              size="icon"
              className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
              title={soundEnabled ? "Desativar som" : "Ativar som"}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
            </Button>
            <Button
              onClick={handleCelebrate}
              variant="outline"
              className="flex-1 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 hover:text-emerald-200"
            >
              <PartyPopper className="h-4 w-4 mr-2" />
              Mais confetes!
            </Button>
            <Button
              onClick={handleClose}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-bold"
            >
              Continuar
            </Button>
          </div>

          {/* Checkbox para não mostrar novamente */}
          <div className="flex items-center justify-center gap-2 pt-2">
            <Checkbox
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
              className="border-gray-500 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
            />
            <label
              htmlFor="dont-show-again"
              className="text-sm text-gray-400 cursor-pointer select-none"
            >
              Não exibir novamente este mês
            </label>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default memo(MetaCelebration)

