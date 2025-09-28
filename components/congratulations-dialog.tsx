"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Trophy, Star } from "lucide-react"

interface CongratulationsDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function CongratulationsDialog({ isOpen, onClose }: CongratulationsDialogProps) {
  console.log('CongratulationsDialog renderizado, isOpen:', isOpen)
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100">
            <Trophy className="h-8 w-8 text-yellow-600" />
          </div>
          <DialogTitle className="text-2xl font-bold text-green-600">
            🎉 Parabéns! 🎉
          </DialogTitle>
          <DialogDescription className="text-base">
            Você alcançou seu objetivo! Continue assim!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <div className="flex space-x-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
          
          <p className="text-center text-sm text-muted-foreground">
            Seu progresso foi registrado com sucesso!
          </p>
        </div>
        
        <div className="flex justify-center">
          <Button onClick={onClose} className="w-full">
            Continuar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
