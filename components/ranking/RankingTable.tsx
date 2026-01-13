'use client'

import React, { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
  itemLabel?: string // "vendedor" ou "unidade"
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-semibold text-gray-900">{titulo}</h3>
        </div>
        <Badge variant="secondary" className="hidden sm:inline-flex">
          {items.length} {pluralLabel}
        </Badge>
      </div>
      <div className="rounded-xl border bg-white overflow-x-auto">
        <Table className="min-w-[640px]">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="text-center w-16">Pos</TableHead>
              <TableHead>{itemLabel === 'vendedor' ? 'Vendedor' : itemLabel === 'unidade' ? 'Unidade' : 'Nome'}</TableHead>
              <TableHead className="text-right">Total Vendas</TableHead>
              <TableHead className="text-center">Ops</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, idx) => (
              <TableRow 
                key={`${keyPrefix}-table-${item.id}`}
                className={[
                  'hover:bg-gray-50',
                  idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40',
                  item.posicao <= 3 ? 'bg-amber-50/40' : ''
                ].join(' ')}
              >
                <TableCell className="text-center">
                  <div className="flex items-center justify-center">
                    {item.posicao <= 3 ? (
                      getMedalIcon(item.medalha)
                    ) : (
                      <span className="font-semibold text-gray-600">
                        #{item.posicao}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium text-sm text-gray-900">
                    {item.nome}
                  </div>
                  {item.subtitulo && (
                    <div className="text-xs text-muted-foreground">{item.subtitulo}</div>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono text-sm font-bold text-green-600">
                  {formatCurrency(item.total_realizado)}
                </TableCell>
                <TableCell className="text-center">
                  <span className="font-semibold">{item.total_oportunidades}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export const RankingTable = memo(RankingTableComponent)
