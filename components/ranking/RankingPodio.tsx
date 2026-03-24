'use client'

import React, { memo } from 'react'
import { formatCurrency } from '@/lib/date-utils'

export interface PodioItem {
  id: number
  nome: string
  subtitulo?: string
  total_realizado: number
  total_oportunidades: number
  medalha: 'ouro' | 'prata' | 'bronze' | null
}

interface RankingPodioProps {
  items: PodioItem[]
  keyPrefix?: string
}

function getInitials(nome: string) {
  const parts = nome.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Configuração visual de cada posição
const PODIO = {
  ouro: {
    pos: '1º',
    avatarSize: 'w-14 h-14',
    avatarText: 'text-lg',
    avatarRing: 'ring-4 ring-yellow-400 ring-offset-2',
    avatarBg: 'bg-gradient-to-br from-yellow-400 to-amber-500',
    nameSize: 'text-sm',
    valueSize: 'text-base',
    platform: 'h-24 bg-gradient-to-t from-yellow-500 to-yellow-400',
    platformText: 'text-2xl',
    cardPadding: 'px-3 pb-0 pt-4',
    badge: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    valueColor: 'text-yellow-700',
    order: 'order-2',  // centro
    scale: 'scale-105',
    zIndex: 'z-10',
    shadow: 'shadow-xl shadow-yellow-100',
    border: 'border-yellow-200',
    icon: '🥇',
  },
  prata: {
    pos: '2º',
    avatarSize: 'w-12 h-12',
    avatarText: 'text-base',
    avatarRing: 'ring-4 ring-slate-300 ring-offset-2',
    avatarBg: 'bg-gradient-to-br from-slate-300 to-slate-500',
    nameSize: 'text-xs',
    valueSize: 'text-sm',
    platform: 'h-16 bg-gradient-to-t from-slate-400 to-slate-300',
    platformText: 'text-xl',
    cardPadding: 'px-3 pb-0 pt-3',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    valueColor: 'text-slate-600',
    order: 'order-1',  // esquerda
    scale: '',
    zIndex: 'z-0',
    shadow: 'shadow-md shadow-slate-100',
    border: 'border-slate-200',
    icon: '🥈',
  },
  bronze: {
    pos: '3º',
    avatarSize: 'w-12 h-12',
    avatarText: 'text-base',
    avatarRing: 'ring-4 ring-orange-400 ring-offset-2',
    avatarBg: 'bg-gradient-to-br from-orange-400 to-orange-600',
    nameSize: 'text-xs',
    valueSize: 'text-sm',
    platform: 'h-12 bg-gradient-to-t from-orange-600 to-orange-500',
    platformText: 'text-xl',
    cardPadding: 'px-3 pb-0 pt-3',
    badge: 'bg-orange-100 text-orange-700 border-orange-200',
    valueColor: 'text-orange-600',
    order: 'order-3',  // direita
    scale: '',
    zIndex: 'z-0',
    shadow: 'shadow-md shadow-orange-100',
    border: 'border-orange-200',
    icon: '🥉',
  },
}

function RankingPodioComponent({ items, keyPrefix = 'podio' }: RankingPodioProps) {
  const top3 = items.slice(0, 3)
  if (top3.length === 0) return null

  // Pódio: exibir na ordem visual [prata, ouro, bronze]
  const visualOrder: Array<PodioItem | null> = [
    top3[1] ?? null,   // 2º lugar — esquerda
    top3[0] ?? null,   // 1º lugar — centro
    top3[2] ?? null,   // 3º lugar — direita
  ]

  const cfgOrder = [PODIO.prata, PODIO.ouro, PODIO.bronze]

  return (
    <div className="flex items-end justify-center gap-2 sm:gap-3">
      {visualOrder.map((item, vi) => {
        if (!item) return <div key={`${keyPrefix}-empty-${vi}`} className="flex-1" />
        const cfg = cfgOrder[vi]
        const isGold = item.medalha === 'ouro'

        return (
          <div
            key={`${keyPrefix}-${item.id}`}
            className={`flex-1 flex flex-col items-center ${cfg.order} ${cfg.zIndex} ${cfg.scale}`}
          >
            {/* Card superior */}
            <div className={`
              w-full rounded-t-2xl border-2 ${cfg.cardPadding}
              ${cfg.border} ${cfg.shadow}
              bg-white flex flex-col items-center gap-2
            `}>
              {/* Ícone da medalha */}
              <span className="text-xl leading-none">{cfg.icon}</span>

              {/* Avatar */}
              <div className={`
                ${cfg.avatarSize} rounded-full flex items-center justify-center
                ${cfg.avatarBg} ${cfg.avatarRing}
                text-white font-bold ${cfg.avatarText}
                shadow-md flex-shrink-0
              `}>
                {getInitials(item.nome)}
              </div>

              {/* Nome */}
              <div className={`font-bold ${cfg.nameSize} text-gray-900 text-center leading-tight line-clamp-2 w-full px-1`}>
                {item.nome}
              </div>
              {item.subtitulo && (
                <div className="text-[10px] text-muted-foreground text-center leading-tight">{item.subtitulo}</div>
              )}

              {/* Valor */}
              <div className={`font-extrabold ${cfg.valueSize} ${cfg.valueColor} text-center`}>
                {formatCurrency(item.total_realizado)}
              </div>

              {/* Ops */}
              <div className={`
                text-[10px] font-semibold px-2 py-0.5 rounded-full border mb-2
                ${cfg.badge}
              `}>
                {item.total_oportunidades} op{item.total_oportunidades !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Plataforma */}
            <div className={`w-full ${cfg.platform} rounded-b-xl flex items-center justify-center`}>
              <span className={`text-white font-black ${cfg.platformText} drop-shadow`}>
                {cfg.pos}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export const RankingPodio = memo(RankingPodioComponent)
