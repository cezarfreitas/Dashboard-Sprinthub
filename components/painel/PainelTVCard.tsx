"use client"

import { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface PainelTVCardProps {
  titulo: string
  valor: string | number
  subtitulo?: string
  icon?: LucideIcon
  cor?: 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'amber'
  className?: string
}

const coresGradiente = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-green-500 to-green-700',
  red: 'from-red-500 to-red-700',
  orange: 'from-orange-500 to-orange-700',
  purple: 'from-purple-500 to-purple-700',
  amber: 'from-amber-500 to-amber-700',
}

const coresBorda = {
  blue: 'border-blue-600',
  green: 'border-green-600',
  red: 'border-red-600',
  orange: 'border-orange-600',
  purple: 'border-purple-600',
  amber: 'border-amber-600',
}

export function PainelTVCard({
  titulo,
  valor,
  subtitulo,
  icon: Icon,
  cor = 'blue',
  className
}: PainelTVCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-3xl shadow-2xl border-4 transition-all duration-300 hover:scale-105",
        `bg-gradient-to-br ${coresGradiente[cor]}`,
        coresBorda[cor],
        className
      )}
    >
      {/* Background decorativo */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-sm"></div>
      
      {/* Círculo decorativo */}
      <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
      
      {/* Conteúdo */}
      <div className="relative p-8 flex flex-col justify-between min-h-[220px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold uppercase tracking-wide text-white/90">
            {titulo}
          </h3>
          {Icon && (
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
              <Icon className="w-8 h-8 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Valor Principal */}
        <div className="flex-1 flex items-center">
          <p className="text-5xl font-black text-white leading-none tracking-tight">
            {valor}
          </p>
        </div>

        {/* Subtítulo */}
        {subtitulo && (
          <p className="text-lg text-white/80 font-semibold mt-2">
            {subtitulo}
          </p>
        )}

        {/* Linha decorativa */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>
      </div>
    </div>
  )
}
