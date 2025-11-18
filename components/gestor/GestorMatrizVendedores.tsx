"use client"

import { useEffect, useState, useMemo } from "react"
import { RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface MatrizDados {
  vendedor_id: number
  data: string
  dia: number
  total_criadas: number
  valor_total?: number
}

interface VendedorInfo {
  id: number
  name: string
  lastName: string
}

interface GestorMatrizVendedoresProps {
  unidadeId: number | null
  dataInicio: string
  dataFim: string
  vendedores: VendedorInfo[]
  tipo?: 'criadas' | 'ganhas' | 'perdidas'
}

export function GestorMatrizVendedores({
  unidadeId,
  dataInicio,
  dataFim,
  vendedores: vendedoresProp,
  tipo = 'criadas'
}: GestorMatrizVendedoresProps) {
  const [matrizDados, setMatrizDados] = useState<MatrizDados[]>([])
  const [vendedores, setVendedores] = useState<VendedorInfo[]>(vendedoresProp)
  const [loading, setLoading] = useState(false)

  // Calcular todas as datas do período
  const datasNoPeriodo = useMemo(() => {
    const inicio = new Date(dataInicio + 'T00:00:00')
    const fim = new Date(dataFim + 'T23:59:59')
    const datas: Array<{ data: string; dia: number; mes: number; label: string }> = []
    
    const current = new Date(inicio)
    while (current <= fim) {
      const dataStr = current.toISOString().split('T')[0]
      datas.push({
        data: dataStr,
        dia: current.getDate(),
        mes: current.getMonth() + 1,
        label: `${current.getDate()}/${current.getMonth() + 1}`
      })
      current.setDate(current.getDate() + 1)
    }
    
    return datas
  }, [dataInicio, dataFim])

  // Criar mapa de dados: vendedor_id -> data -> {total, valor}
  const dadosMap = useMemo(() => {
    const map = new Map<number, Map<string, { total: number; valor?: number }>>()
    
    matrizDados.forEach(item => {
      // Extrair apenas a parte da data (YYYY-MM-DD) sem o timestamp
      const dataKey = item.data.split('T')[0]
      
      if (!map.has(item.vendedor_id)) {
        map.set(item.vendedor_id, new Map())
      }
      map.get(item.vendedor_id)!.set(dataKey, {
        total: item.total_criadas,
        valor: item.valor_total
      })
    })
    
    return map
  }, [matrizDados])

  // Sincronizar vendedores da prop
  useEffect(() => {
    if (vendedoresProp.length > 0) {
      setVendedores(vendedoresProp)
    }
  }, [vendedoresProp])

  // Buscar dados da API
  useEffect(() => {
    if (!unidadeId) {
      setMatrizDados([])
      return
    }

    const fetchMatriz = async () => {
      try {
        setLoading(true)
        
        const params = new URLSearchParams({
          unidade_id: unidadeId.toString(),
          dataInicio,
          dataFim,
          tipo
        })
        
        const response = await fetch(`/api/oportunidades/matriz-vendedor-dia?${params}`)
        const result = await response.json()
        
        if (result.success) {
          if (result.dados) {
            setMatrizDados(result.dados)
          }
          
          // Se a API retornou vendedores e não temos vendedores da prop, usar os da API
          if (result.vendedores && result.vendedores.length > 0 && vendedores.length === 0) {
            setVendedores(result.vendedores)
          }
        } else {
          setMatrizDados([])
        }
      } catch {
        setMatrizDados([])
      } finally {
        setLoading(false)
      }
    }

    fetchMatriz()
  }, [unidadeId, dataInicio, dataFim, tipo, vendedores.length])

  // Não renderizar se não houver unidade
  if (!unidadeId) {
    return null
  }

  const titulo = 
    tipo === 'ganhas' ? 'Oportunidades Ganhas por Dia' :
    tipo === 'perdidas' ? 'Oportunidades Perdidas por Dia' :
    'Oportunidades Criadas por Dia'

  return (
    <div className="w-full">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs text-muted-foreground">Carregando...</span>
        </div>
      ) : vendedores.length === 0 ? (
        <div className="text-center text-muted-foreground py-6 text-xs">
          Nenhum vendedor encontrado.
        </div>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="sticky left-0 z-10 bg-muted/50 min-w-[120px] font-semibold text-xs h-8 px-2 py-1.5">
                    Vendedor
                  </TableHead>
                  {datasNoPeriodo.map(({ data, label }) => (
                    <TableHead 
                      key={data}
                      className="text-center min-w-[45px] whitespace-nowrap font-semibold text-xs h-8 px-1 py-1.5"
                      title={data}
                    >
                      {label}
                    </TableHead>
                  ))}
                  <TableHead className="text-center bg-muted sticky right-0 z-10 font-semibold text-xs h-8 px-2 py-1.5">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                  {vendedores.map((vendedor) => {
                    const vendedorDados = dadosMap.get(vendedor.id)
                    
                    // Calcular total e valor do vendedor
                    const { totalVendedor, valorVendedor } = datasNoPeriodo.reduce((acc, { data }) => {
                      const dados = vendedorDados?.get(data)
                      return {
                        totalVendedor: acc.totalVendedor + (dados?.total || 0),
                        valorVendedor: acc.valorVendedor + (dados?.valor || 0)
                      }
                    }, { totalVendedor: 0, valorVendedor: 0 })
                    
                    // SEMPRE mostrar o vendedor, mesmo sem dados
                    return (
                      <TableRow key={vendedor.id} className="hover:bg-muted/50">
                        <TableCell className="sticky left-0 z-10 bg-background font-medium whitespace-nowrap text-xs px-2 py-1.5">
                          {vendedor.name} {vendedor.lastName}
                        </TableCell>
                        {datasNoPeriodo.map(({ data }) => {
                          const dados = vendedorDados?.get(data)
                          const total = dados?.total || 0
                          const valor = dados?.valor || 0
                          
                          return (
                            <TableCell 
                              key={data}
                              className={`text-center text-xs px-1 py-1.5 ${
                                total > 0 
                                  ? 'text-primary font-semibold bg-primary/5' 
                                  : 'text-muted-foreground'
                              }`}
                              title={`${vendedor.name}: ${total} oportunidade(s) em ${data}${tipo === 'ganhas' && valor > 0 ? ` - R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}`}
                            >
                              {total > 0 ? (
                                <div className="flex flex-col gap-0 leading-none">
                                  <span className="font-semibold text-xs">{total}</span>
                                  {tipo === 'ganhas' && valor > 0 && (
                                    <span className="text-[9px] text-green-600 font-normal leading-tight">
                                      R$ {(valor / 1000).toFixed(1)}k
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-xs">-</span>
                              )}
                            </TableCell>
                          )
                        })}
                        <TableCell className="text-center font-bold bg-muted/50 sticky right-0 z-10 text-xs px-2 py-1.5">
                          <div className="flex flex-col gap-0 leading-none">
                            <span className="text-xs">{totalVendedor}</span>
                            {tipo === 'ganhas' && valorVendedor > 0 && (
                              <span className="text-[9px] text-green-600 font-normal leading-tight">
                                R$ {(valorVendedor / 1000).toFixed(1)}k
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  
                  {/* Linha de Total Geral - SEMPRE mostrar */}
                  <TableRow className="bg-muted font-bold border-t-2">
                    <TableCell className="sticky left-0 z-10 bg-muted font-bold text-xs px-2 py-1.5">
                      TOTAL
                    </TableCell>
                    {datasNoPeriodo.map(({ data }) => {
                      const { totalDia, valorDia } = vendedores.reduce((acc, v) => {
                        const vendedorDados = dadosMap.get(v.id)
                        const dados = vendedorDados?.get(data)
                        return {
                          totalDia: acc.totalDia + (dados?.total || 0),
                          valorDia: acc.valorDia + (dados?.valor || 0)
                        }
                      }, { totalDia: 0, valorDia: 0 })
                      
                      return (
                        <TableCell 
                          key={data}
                          className={`text-center text-xs px-1 py-1.5 ${
                            totalDia > 0 ? 'text-primary' : 'text-muted-foreground'
                          }`}
                        >
                          {totalDia > 0 ? (
                            <div className="flex flex-col gap-0 leading-none">
                              <span className="text-xs">{totalDia}</span>
                              {tipo === 'ganhas' && valorDia > 0 && (
                                <span className="text-[9px] text-green-700 font-normal leading-tight">
                                  R$ {(valorDia / 1000).toFixed(1)}k
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      )
                    })}
                    <TableCell className="text-center bg-muted sticky right-0 z-10 font-bold text-xs px-2 py-1.5">
                      <div className="flex flex-col gap-0 leading-none">
                        <span className="text-xs">
                          {vendedores.reduce((sum, v) => {
                            const vendedorDados = dadosMap.get(v.id)
                            return sum + datasNoPeriodo.reduce((s, { data }) => {
                              return s + (vendedorDados?.get(data)?.total || 0)
                            }, 0)
                          }, 0)}
                        </span>
                        {tipo === 'ganhas' && (
                          <span className="text-[9px] text-green-700 font-normal leading-tight">
                            R$ {(vendedores.reduce((sum, v) => {
                              const vendedorDados = dadosMap.get(v.id)
                              return sum + datasNoPeriodo.reduce((s, { data }) => {
                                return s + (vendedorDados?.get(data)?.valor || 0)
                              }, 0)
                            }, 0) / 1000).toFixed(1)}k
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
