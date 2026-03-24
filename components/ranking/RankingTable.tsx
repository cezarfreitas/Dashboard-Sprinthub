'use client'

import React, { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { FaCrown, FaTrophy, FaMedal } from 'react-icons/fa'
import { formatCurrency } from '@/lib/date-utils'

export interface RankingTableItem {
  id: number
  nome: string
  subtitulo?: string
  total_realizado: number
  total_oportunidades: number
  posicao: number
  medalha: 'ouro' | 'prata' | 'bronze' | null
}

interface RankingTableProps {
  items: RankingTableItem[]
  titulo: string
  icon?: React.ReactNode
  keyPrefix?: string
  itemLabel?: string
}

const MEDAL_STYLES = {
  ouro: {
    icon: <FaCrown className="h-4 w-4 text-yellow-500" />,
    rowBg: 'bg-gradient-to-r from-yellow-50/80 to-transparent',
    posBg: 'bg-yellow-100 text-yellow-700',
  },
  prata: {
    icon: <FaTrophy className="h-4 w-4 text-slate-400" />,
    rowBg: 'bg-gradient-to-r from-slate-50/80 to-transparent',
    posBg: 'bg-slate-100 text-slate-600',
  },
  bronze: {
    icon: <FaMedal className="h-4 w-4 text-orange-500" />,
    rowBg: 'bg-gradient-to-r from-orange-50/60 to-transparent',
    posBg: 'bg-orange-100 text-orange-700',
  },
}

function getInitials(nome: string) {
  const parts = nome.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-violet-500', 'bg-emerald-500', 'bg-rose-500',
  'bg-amber-500', 'bg-cyan-500', 'bg-pink-500', 'bg-teal-500',
]

function RankingTableComponent({
  items,
  titulo,
  icon,
  keyPrefix = 'ranking',
  itemLabel = 'item'
}: RankingTableProps) {
  const pluralLabel = items.length !== 1
    ? (itemLabel === 'vendedor' ? 'vendedores' : itemLabel === 'unidade' ? 'unidades' : `${itemLabel}s`)
    : itemLabel

  const maxValue = items[0]?.total_realizado || 1

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-sm font-semibold text-gray-700">{titulo}</h3>
        </div>
        <Badge variant="secondary" className="text-xs">
          {items.length} {pluralLabel}
        </Badge>
      </div>

      <div className="space-y-1.5">
        {items.map((item, idx) => {
          const medalStyle = item.medalha ? MEDAL_STYLES[item.medalha] : null
          const progressPct = Math.max(4, (item.total_realizado / maxValue) * 100)
          const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length]

          return (
            <div
              key={`${keyPrefix}-row-${item.id}`}
              className={`
                relative flex items-center gap-3 px-3 py-2.5 rounded-xl
                border transition-all duration-200 hover:shadow-sm hover:scale-[1.005]
                ${medalStyle ? medalStyle.rowBg + ' border-transparent' : 'bg-white border-gray-100'}
              `}
            >
              {/* Barra de progresso de fundo */}
              <div
                className="absolute inset-0 rounded-xl opacity-[0.07] pointer-events-none"
                style={{
                  background: `linear-gradient(to right, #3b82f6 ${progressPct}%, transparent ${progressPct}%)`
                }}
              />

              {/* Posição */}
              <div className="w-8 flex-shrink-0 flex items-center justify-center">
                {medalStyle ? (
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${medalStyle.posBg}`}>
                    {medalStyle.icon}
                  </div>
                ) : (
                  <span className="text-xs font-bold text-gray-400 w-7 text-center">
                    #{item.posicao}
                  </span>
                )}
              </div>

              {/* Avatar */}
              <div className={`
                w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                ${avatarColor} text-white text-xs font-bold shadow-sm
              `}>
                {getInitials(item.nome)}
              </div>

              {/* Nome e subtítulo */}
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm text-gray-900 truncate">{item.nome}</div>
                {item.subtitulo && (
                  <div className="text-[10px] text-muted-foreground truncate">{item.subtitulo}</div>
                )}
              </div>

              {/* Métricas */}
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground">Ops</span>
                  <span className="text-xs font-bold text-gray-700">{item.total_oportunidades}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">Total</span>
                  <span className="text-sm font-extrabold text-emerald-600 tabular-nums">
                    {formatCurrency(item.total_realizado)}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const RankingTable = memo(RankingTableComponent)
