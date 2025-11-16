'use client'

import { memo, useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Building2 } from 'lucide-react'
import { MetasCell } from './MetasCell'
import type { MetaMensal, Vendedor } from '@/hooks/metas/useMetasConfig'

interface MetasMatrixUnidadeProps {
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

export const MetasMatrixUnidade = memo(function MetasMatrixUnidade({
  vendedores,
  selectedAno,
  getMetaValue,
  editingCell,
  editValue,
  startInlineEdit,
  saveInlineEdit,
  cancelInlineEdit,
  setEditValue
}: MetasMatrixUnidadeProps) {
  const vendedoresPorUnidade = useMemo(() => {
    return vendedores.reduce((acc, vendedor) => {
      const unidadeNome = vendedor.unidade_nome
      if (!acc[unidadeNome]) {
        acc[unidadeNome] = []
      }
      acc[unidadeNome].push(vendedor)
      return acc
    }, {} as Record<string, Vendedor[]>)
  }, [vendedores])

  return (
    <div className="space-y-6">
      {Object.entries(vendedoresPorUnidade).map(([unidadeNome, vendedoresUnidade]) => {
        const totalGeral = vendedoresUnidade.reduce((sum, vendedor) => 
          sum + MESES.reduce((sumMes, _mes, index) => 
            sumMes + getMetaValue(vendedor.id, index, vendedor.unidade_id), 0
          ), 0
        )

        return (
          <Card key={unidadeNome}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                {unidadeNome} - Ano {selectedAno}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-2 py-1.5 font-semibold text-sm">Vendedor</th>
                      {MESES.map(mes => (
                        <th key={mes.numero} className="text-center px-1 py-1.5 font-semibold text-xs min-w-[60px]">
                          {mes.nome}
                        </th>
                      ))}
                      <th className="text-center px-2 py-1.5 font-semibold text-sm">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendedoresUnidade.map(vendedor => {
                      const totalAnual = MESES.reduce((sum, _mes, index) => 
                        sum + getMetaValue(vendedor.id, index, vendedor.unidade_id), 0
                      )
                      
                      return (
                        <tr key={vendedor.id} className="border-b hover:bg-gray-50">
                          <td className="px-2 py-1">
                            <div>
                              <div className="font-medium text-[10px] truncate" title={`${vendedor.name} ${vendedor.lastName}`}>
                                {vendedor.name}
                              </div>
                            </div>
                          </td>
                          {MESES.map((_mes, index) => {
                            const metaValue = getMetaValue(vendedor.id, index, vendedor.unidade_id)
                            const isEditing = editingCell?.vendedorId === vendedor.id && 
                                             editingCell?.mesIndex === index &&
                                             editingCell?.unidadeId === vendedor.unidade_id
                            
                            return (
                              <td key={index} className="px-1 py-1 text-center">
                                <MetasCell
                                  value={metaValue}
                                  isEditing={isEditing}
                                  editValue={editValue}
                                  onStartEdit={() => startInlineEdit(vendedor.id, index, vendedor.unidade_id)}
                                  onEditChange={setEditValue}
                                  onSave={saveInlineEdit}
                                  onCancel={cancelInlineEdit}
                                />
                              </td>
                            )
                          })}
                          <td className="px-2 py-1 text-center font-semibold text-sm">
                            {totalAnual > 0 ? formatCurrency(totalAnual) : 'Meta'}
                          </td>
                        </tr>
                      )
                    })}
                    
                    <tr className="border-t-2 border-gray-300 bg-gray-50">
                      <td className="px-2 py-1">
                        <div className="font-semibold text-sm text-gray-700">
                          Total
                        </div>
                      </td>
                      {MESES.map((_mes, index) => {
                        const totalMes = vendedoresUnidade.reduce((sum, vendedor) => 
                          sum + getMetaValue(vendedor.id, index, vendedor.unidade_id), 0
                        )
                        return (
                          <td key={index} className="px-1 py-1 text-center">
                            <div className="w-20 h-6 flex items-center justify-center text-xs border border-gray-300 bg-gray-100 rounded font-semibold">
                              {totalMes > 0 ? formatCurrency(totalMes) : 'Meta'}
                            </div>
                          </td>
                        )
                      })}
                      <td className="px-2 py-1 text-center font-semibold text-sm">
                        {totalGeral > 0 ? formatCurrency(totalGeral) : 'Meta'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
})

