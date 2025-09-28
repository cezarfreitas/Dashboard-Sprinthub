"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, User, DollarSign, Package } from "lucide-react"
import confetti from 'canvas-confetti'

interface CelebrationData {
  vendedor: string
  valor: number
  cliente: string
  produto: string
  id: string
}

interface CelebrationDialogProps {
  isOpen: boolean
  onClose: () => void
  data: CelebrationData | null
}

export default function CelebrationDialog({ isOpen, onClose, data }: CelebrationDialogProps) {
  const formatCurrency = (value: number): string => {
    const numValue = Math.round(Number(value) || 0)
    return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
  }

  const fireConfetti = () => {
    // Confetti da esquerda
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 0, y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b']
    })
    
    // Confetti da direita
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { x: 1, y: 0.6 },
      colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b']
    })
    
    // Confetti do centro (explosão)
    setTimeout(() => {
      confetti({
        particleCount: 200,
        spread: 120,
        origin: { x: 0.5, y: 0.5 },
        colors: ['#ffd700', '#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24']
      })
    }, 300)
    
    // Chuva de confetti
    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 180,
        origin: { x: 0.5, y: 0.1 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#f0932b', '#eb4d4b']
      })
    }, 600)
    
    // Confetti contínuo por alguns segundos
    const duration = 3000
    const end = Date.now() + duration
    
    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ['#ff6b6b', '#4ecdc4', '#45b7d1']
      })
      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ['#f9ca24', '#f0932b', '#eb4d4b']
      })

      if (Date.now() < end) {
        requestAnimationFrame(frame)
      }
    }
    frame()
  }

  useEffect(() => {
    if (isOpen && data) {
      // Tocar som
      const audio = new Audio('/audio/bell.wav')
      audio.play().catch(console.error)
      
      // Disparar confetti
      fireConfetti()
      
      // Fechar automaticamente após 5 segundos
      const timer = setTimeout(() => {
        onClose()
      }, 5000)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, data, onClose])

  if (!data) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <div className="text-center space-y-6 p-6">
          {/* Ícone principal */}
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <TrendingUp className="h-10 w-10 text-green-600" />
            </div>
          </div>
          
          {/* Título */}
          <div>
            <h2 className="text-2xl font-bold text-green-600 mb-2">
              🎉 Nova Venda! 🎉
            </h2>
            <p className="text-muted-foreground">
              Parabéns pela conquista!
            </p>
          </div>
          
          {/* Informações da venda */}
          <div className="space-y-4">
            {/* Valor */}
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-1">
                {formatCurrency(data.valor)}
              </div>
              <Badge variant="secondary" className="text-xs">
                Valor da Venda
              </Badge>
            </div>
            
            {/* Detalhes */}
            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <User className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Vendedor:</span>
                <span>{data.vendedor}</span>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <DollarSign className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Cliente:</span>
                <span>{data.cliente}</span>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                <Package className="h-4 w-4 text-orange-600" />
                <span className="font-medium">Produto:</span>
                <span>{data.produto}</span>
              </div>
            </div>
          </div>
          
          {/* Auto-close indicator */}
          <div className="text-xs text-muted-foreground">
            Fechará automaticamente em alguns segundos...
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
