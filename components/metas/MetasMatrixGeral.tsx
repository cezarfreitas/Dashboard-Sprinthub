'use client'

import { memo, useMemo } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Building2 } from 'lucide-react'
import { MetasCell } from './MetasCell'
import type { Vendedor } from '@/hooks/metas/useMetasConfig'

interface MetasMatrixGeralProps {
  vendedores: Vendedor[]
  selectedAno: number
  getMetaValue: (vendedorId: number, mesIndex: number, unidadeId?: number) => number
  editingCell: { vendedorId: number; mesIndex: number; unidadeId?: number } | null
  editValue: string
  startInlineEdit: (vendedorId: number, mesIndex: number, unidadeId?: number) => void
  saveInlineEdit: () => Promise<void>
  cancelInlineEdit: () => void
  setEditValue: (value: string) => void
}

const MESES = [
  { numero: 1, nome: 'Jan' }, { numero: 2, nome: 'Fev' }, { numero: 3, nome: 'Mar' },
  { numero: 4, nome: 'Abr' }, { numero: 5, nome: 'Mai' }, { numero: 6, nome: 'Jun' },
  { numero: 7, nome: 'Jul' }, { numero: 8, nome: 'Ago' }, { numero: 9, nome: 'Set' },
  { numero: 10, nome: 'Out' }, { numero: 11, nome: 'Nov' }, { numero: 12, nome: 'Dez' }
]

const formatCurrency = (value: number): string => {
  if (!value || isNaN(value)) {
    return 'R$ 0,00'
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

interface VendedorAgrupado {
  id: number
  name: string
  lastName: string
  username: string
  unidades: Array<{
    unidade_id: number
    unidade_nome: string
  }>
}

export const MetasMatrixGeral = memo(function MetasMatrixGeral({
  vendedores,
  selectedAno,
  getMetaValue,
  editingCell,
  editValue,
  startInlineEdit,
  saveInlineEdit,
  cancelInlineEdit,
  setEditValue
}: MetasMatrixGeralProps) {
  const vendedoresAgrupados = useMemo(() => {
    const agrupados = vendedores.reduce((acc, vendedor) => {
      if (!acc[vendedor.id]) {
        acc[vendedor.id] = {
          id: vendedor.id,
          name: vendedor.name,
          lastName: vendedor.lastName,
          username: vendedor.username,
          unidades: []
        }
      }
      acc[vendedor.id].unidades.push({
        unidade_id: vendedor.unidade_id,
        unidade_nome: vendedor.unidade_nome
      })
      return acc
    }, {} as Record<number, VendedorAgrupado>)

    return Object.values(agrupados)
  }, [vendedores])

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <Users className="h-5 w-5 mr-2" />
        <h2 className="text-2xl font-semibold">Matriz Geral - Ano {selectedAno}</h2>
      </div>
      
      <div className="space-y-4">
        {vendedoresAgrupados.map((vendedor) => {
          const totalAnual = vendedor.unidades.reduce((total, unidade) => {
            return total + MESES.reduce((sum, _mes, index) => 
              sum + getMetaValue(vendedor.id, index, unidade.unidade_id), 0
            )
          }, 0)

          return (
            <Card key={vendedor.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50/30 to-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900 text-sm" title={`${vendedor.name} ${vendedor.lastName}`}>
                        {vendedor.name}
                      </h3>
                      <div className="flex gap-1">
                        {vendedor.unidades.map((unidade, index) => (
                          <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5 text-blue-700 bg-blue-100 border border-blue-200">
                            {unidade.unidade_nome}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="text-sm font-bold text-green-600">
                      {totalAnual > 0 ? formatCurrency(totalAnual) : 'R$ 0,00'}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {vendedor.unidades.length === 1 ? (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-gray-200">
                            {MESES.map(mes => (
                              <th key={mes.numero} className="text-center px-2 py-2 font-semibold text-xs text-gray-600 min-w-[60px]">
                                {mes.nome}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {MESES.map((_mes, index) => {
                              const metaValue = getMetaValue(vendedor.id, index, vendedor.unidades[0].unidade_id)
                              const isEditing = editingCell?.vendedorId === vendedor.id && 
                                               editingCell?.mesIndex === index &&
                                               editingCell?.unidadeId === vendedor.unidades[0].unidade_id
                              
                              return (
                                <td key={index} className="px-1 py-2 text-center">
                                  <MetasCell
                                    value={metaValue}
                                    isEditing={isEditing}
                                    editValue={editValue}
                                    onStartEdit={() => startInlineEdit(vendedor.id, index, vendedor.unidades[0].unidade_id)}
                                    onEditChange={setEditValue}
                                    onSave={saveInlineEdit}
                                    onCancel={cancelInlineEdit}
                                  />
                                </td>
                              )
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {vendedor.unidades.map((unidade, unidadeIndex) => (
                      <div key={unidadeIndex} className="bg-gray-50 rounded-lg p-3">
                        <div className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
                          <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                          {unidade.unidade_nome}
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="border-b border-gray-200">
                                {MESES.map(mes => (
                                  <th key={mes.numero} className="text-center px-2 py-2 font-semibold text-xs text-gray-600 min-w-[60px]">
                                    {mes.nome}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                {MESES.map((_mes, index) => {
                                  const metaValue = getMetaValue(vendedor.id, index, unidade.unidade_id)
                                  const isEditing = editingCell?.vendedorId === vendedor.id && 
                                                   editingCell?.mesIndex === index &&
                                                   editingCell?.unidadeId === unidade.unidade_id
                                  
                                  return (
                                    <td key={index} className="px-1 py-2 text-center">
                                      <MetasCell
                                        value={metaValue}
                                        isEditing={isEditing}
                                        editValue={editValue}
                                        onStartEdit={() => startInlineEdit(vendedor.id, index, unidade.unidade_id)}
                                        onEditChange={setEditValue}
                                        onSave={saveInlineEdit}
                                        onCancel={cancelInlineEdit}
                                      />
                                    </td>
                                  )
                                })}
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
})

