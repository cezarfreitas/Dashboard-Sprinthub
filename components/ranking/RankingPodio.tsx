'use client'

import React, { memo } from 'react'
import { FaCrown, FaTrophy, FaMedal } from 'react-icons/fa'
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

const getMedalIcon = (medalha: 'ouro' | 'prata' | 'bronze' | null) => {
  switch (medalha) {
    case 'ouro':
      return <FaCrown className="h-6 w-6 text-yellow-500 drop-shadow-lg" />
    case 'prata':
      return <FaTrophy className="h-6 w-6 text-gray-400 drop-shadow-lg" />
    case 'bronze':
      return <FaMedal className="h-6 w-6 text-orange-600 drop-shadow-lg" />
    default:
      return null
  }
}

const podioColors = [
  'border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20',
  'border-gray-400 bg-gray-50 dark:bg-gray-950/20',
  'border-orange-600 bg-orange-50 dark:bg-orange-950/20'
]

function RankingPodioComponent({ items, keyPrefix = 'podio' }: RankingPodioProps) {
  const top3 = items.slice(0, 3)
  
  if (top3.length === 0) {
    return null
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {top3.map((item, index) => (
          <div 
            key={`${keyPrefix}-${item.id}`}
            className={`
              text-center p-3 sm:p-4 rounded-xl border shadow-sm transition-all duration-300 hover:shadow-md
              ${podioColors[index] || ''}
            `}
          >
            <div className="h-full flex flex-col justify-between">
              <div className="flex justify-center mb-2">
                {getMedalIcon(item.medalha)}
              </div>
              <div className="space-y-2 flex-1 flex flex-col justify-center">
                <h4 className="font-bold text-sm">
                  {item.nome}
                </h4>
                {item.subtitulo && (
                  <p className="text-xs text-muted-foreground">{item.subtitulo}</p>
                )}
                <div className="space-y-1">
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(item.total_realizado)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {item.total_oportunidades} oportunidade{item.total_oportunidades !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const RankingPodio = memo(RankingPodioComponent)
