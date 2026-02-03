"use client"

import { memo, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Target, TrendingUp, TrendingDown, Minus } from "lucide-react"
import { cn } from "@/lib/utils"
import { TabelaOportunidadesModal } from "./TabelaOportunidadesModal"

interface VendedorMeta {
  vendedor_id: number
  vendedor_nome: string
  meta_valor: number
  realizado: number
  diferenca: number
  percentual: number
  quantidade_vendas: number
  quantidade_oportunidades: number
  quantidade_abertas: number
  quantidade_perdidas: number
  quantidade_vendas_criadas_no_mes: number
  taxa_conversao: number
}

interface GestorMetaVendedoresProps {
  unidadeId: number | null
  mes?: number
  ano?: number
  metaTotal: number
  realizadoTotal: number
  funilId?: string | null
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

interface Oportunidade {
  id: string
  title: string
  value: number
  createDate: string
  status: string
  vendedor_nome: string | null
  dias_aberta?: number | null
  coluna_nome?: string | null
  gain_date?: string | null
  lost_date?: string | null
}

export const GestorMetaVendedores = memo(function GestorMetaVendedores({
  unidadeId,
  mes,
  ano,
  metaTotal,
  realizadoTotal,
  funilId
}: GestorMetaVendedoresProps) {
  const [loading, setLoading] = useState(false)
  const [vendedores, setVendedores] = useState<VendedorMeta[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [tituloModal, setTituloModal] = useState<string>('')
  const [loadingModal, setLoadingModal] = useState(false)

  const currentDate = new Date()
  const targetMes = mes ?? currentDate.getMonth() + 1
  const targetAno = ano ?? currentDate.getFullYear()

  // Buscar detalhes dos vendedores quando parâmetros mudarem
  useEffect(() => {
    if (!unidadeId) return

    const fetchDetalhes = async () => {
      try {
        setLoading(true)

        // Calcular período do mês
        const primeiroDiaMes = new Date(targetAno, targetMes - 1, 1)
        const ultimoDiaMes = new Date(targetAno, targetMes, 0)

        const formatarData = (data: Date) => {
          const ano = data.getFullYear()
          const mes = String(data.getMonth() + 1).padStart(2, '0')
          const dia = String(data.getDate()).padStart(2, '0')
          return `${ano}-${mes}-${dia}`
        }

        const dataInicio = formatarData(primeiroDiaMes)
        const dataFim = formatarData(ultimoDiaMes)

        // OTIMIZAÇÃO: Usar API consolidada em vez de N+1 chamadas individuais
        const params = new URLSearchParams()
        params.append('unidade_id', unidadeId.toString())
        params.append('data_inicio', dataInicio)
        params.append('data_fim', dataFim)
        if (funilId) {
          params.append('funil_id', funilId)
        }
        
        const response = await fetch(`/api/gestor/vendedores-stats?${params.toString()}`)
        const data = await response.json()

        if (data.success && Array.isArray(data.vendedores)) {
          setVendedores(data.vendedores)
        } else {
          setVendedores([])
        }
      } catch {
        setVendedores([])
      } finally {
        setLoading(false)
      }
    }

    fetchDetalhes()
  }, [unidadeId, targetMes, targetAno, metaTotal, funilId])

  const handleCelulaClick = async (vendedorId: number, vendedorNome: string, tipo: 'criadas' | 'abertas' | 'ganhas' | 'perdidas', quantidade: number) => {
    if (quantidade === 0) return
    
    setLoadingModal(true)
    setModalAberto(true)
    setOportunidadesModal([])
    
    const primeiroDiaMes = new Date(targetAno, targetMes - 1, 1)
    const ultimoDiaMes = new Date(targetAno, targetMes, 0)
    
    const formatarData = (data: Date) => {
      const ano = data.getFullYear()
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const dia = String(data.getDate()).padStart(2, '0')
      return `${ano}-${mes}-${dia}`
    }

    const dataInicio = formatarData(primeiroDiaMes)
    const dataFim = formatarData(ultimoDiaMes)

    let url = ''
    
    if (tipo === 'criadas') {
      url = `/api/oportunidades/listar?user_id=${vendedorId}&status=all&created_date_start=${dataInicio}&created_date_end=${dataFim}`
      setTituloModal(`${quantidade} oportunidade(s) criada(s) - ${vendedorNome}`)
    } else if (tipo === 'abertas') {
      url = `/api/oportunidades/listar?user_id=${vendedorId}&status=open`
      setTituloModal(`${quantidade} oportunidade(s) aberta(s) - ${vendedorNome}`)
    } else if (tipo === 'ganhas') {
      url = `/api/oportunidades/listar?user_id=${vendedorId}&status=gain&gain_date_start=${dataInicio}&gain_date_end=${dataFim}`
      setTituloModal(`${quantidade} oportunidade(s) ganha(s) - ${vendedorNome}`)
    } else if (tipo === 'perdidas') {
      url = `/api/oportunidades/listar?user_id=${vendedorId}&status=lost&lost_date_start=${dataInicio}&lost_date_end=${dataFim}`
      setTituloModal(`${quantidade} oportunidade(s) perdida(s) - ${vendedorNome}`)
    }

    // Adicionar filtro de funil se selecionado
    if (funilId) {
      url += `&funil_id=${funilId}`
    }

    try {
      const response = await fetch(url)
      const data = await response.json()

      if (data.success && data.oportunidades) {
        setOportunidadesModal(data.oportunidades)
      }
    } catch {
      // Silently handle error
    } finally {
      setLoadingModal(false)
    }
  }

  // Não mostrar se não houver unidade
  if (!unidadeId) {
    return null
  }

  const mesNome = new Date(targetAno, targetMes - 1).toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const percentualTotal = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0
  const diferencaTotal = realizadoTotal - metaTotal

  return (
    <Card className="border-primary border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="card-header-brand">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="card-header-brand-icon" />
              <div>
                <div className="card-header-brand-title">
                  Metas por Vendedor - {mesNome}
                </div>
                <div className="card-header-brand-subtitle">
                  {vendedores.length} vendedor(es) • Meta Total: {formatCurrency(metaTotal)}
                </div>
              </div>
            </div>
          {metaTotal > 0 && (
            <div className={cn(
              "px-4 py-2 rounded-lg",
              percentualTotal >= 100 
                ? "bg-green-100 text-green-700" 
                : percentualTotal >= 80 
                ? "bg-yellow-100 text-yellow-700" 
                : "bg-red-100 text-red-700"
            )}>
              <span className="text-2xl font-bold">{percentualTotal.toFixed(1)}%</span>
            </div>
          )}
        </div>
      </div>

      <CardContent className="p-0">
        {/* Tabela de Vendedores */}
        {loading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full bg-gray-100" />
            ))}
          </div>
        ) : vendedores.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            Nenhum vendedor encontrado para esta unidade
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-blue-200">
                  <TableHead className="sticky left-0 z-20 bg-gradient-to-r from-slate-50 to-slate-100 w-[50px] text-center font-bold text-xs text-gray-700 uppercase border-r-2 border-blue-200 h-10 px-3">#</TableHead>
                  <TableHead className="sticky left-[50px] z-20 bg-gradient-to-r from-slate-50 to-slate-100 font-bold text-xs text-gray-700 uppercase border-r-2 border-blue-200 h-10 px-3 min-w-[150px]">Vendedor</TableHead>
                  <TableHead className="text-right font-bold text-xs text-gray-700 uppercase h-10 px-3 min-w-[110px]">Meta</TableHead>
                  <TableHead className="text-right font-bold text-xs text-gray-700 uppercase h-10 px-3 min-w-[110px]">Realizado</TableHead>
                  <TableHead className="text-right font-bold text-xs text-gray-700 uppercase h-10 px-3 min-w-[110px]">Diferença</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-3 min-w-[100px]">Progresso</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-2 min-w-[90px] border-l-2 border-blue-300">Criadas</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-2 min-w-[80px] border-l border-slate-200">Abertas</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-2 min-w-[80px] border-l border-slate-200">Ganhas</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-2 min-w-[80px] border-l border-slate-200">Perdidas</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-2 min-w-[100px] border-l border-slate-200">Taxa Conv.</TableHead>
                  <TableHead className="text-center font-bold text-xs text-gray-700 uppercase h-10 px-2 min-w-[110px] border-l border-slate-200">Ticket Médio</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {vendedores.map((vendedor, index) => {
                  const ticketMedio = vendedor.quantidade_vendas > 0 ? vendedor.realizado / vendedor.quantidade_vendas : 0
                  
                  return (
                    <TableRow 
                      key={vendedor.vendedor_id}
                      className={cn(
                        "hover:bg-slate-50/80 border-b transition-colors",
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/40"
                      )}
                    >
                      {/* Ranking */}
                      <TableCell className="sticky left-0 z-10 bg-inherit text-center border-r-2 border-slate-200 py-2.5 px-3">
                        <span className={cn(
                          "inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                          index === 0 ? "bg-yellow-400 text-yellow-900" :
                          index === 1 ? "bg-gray-300 text-gray-700" :
                          index === 2 ? "bg-orange-400 text-orange-900" :
                          "bg-gray-200 text-gray-600"
                        )}>
                          {index + 1}
                        </span>
                      </TableCell>
                      
                      {/* Nome */}
                      <TableCell className="sticky left-[50px] z-10 bg-inherit font-semibold border-r-2 border-slate-200 py-2.5 px-3 text-xs">
                        <div className="flex items-center gap-2">
                          {vendedor.vendedor_nome}
                          {vendedor.meta_valor === 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                              Sem meta
                            </span>
                          )}
                        </div>
                      </TableCell>
                      
                      {/* Meta */}
                      <TableCell className="text-right font-medium py-2.5 px-3 text-xs">
                        {vendedor.meta_valor > 0 ? formatCurrency(vendedor.meta_valor) : <span className="text-gray-400">-</span>}
                      </TableCell>
                      
                      {/* Realizado */}
                      <TableCell className="text-right font-bold text-green-600 py-2.5 px-3 text-xs">
                        {formatCurrency(vendedor.realizado)}
                      </TableCell>
                      
                      {/* Diferença */}
                      <TableCell className="text-right py-2.5 px-3">
                        <span className={cn(
                          "inline-flex items-center gap-1 font-bold text-xs",
                          vendedor.diferenca >= 0 ? "text-green-600" : "text-red-600"
                        )}>
                          {vendedor.diferenca > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : vendedor.diferenca < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {vendedor.diferenca >= 0 ? '+' : ''}{formatCurrency(vendedor.diferenca)}
                        </span>
                      </TableCell>
                      
                      {/* Progresso */}
                      <TableCell className="py-2.5 px-3">
                        {vendedor.meta_valor > 0 ? (
                          <div className="flex flex-col items-center gap-1">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md font-bold text-[10px] min-w-[50px] text-center",
                              vendedor.percentual >= 100 
                                ? "bg-green-200 text-green-800" 
                                : vendedor.percentual >= 80 
                                ? "bg-yellow-200 text-yellow-800"
                                : "bg-red-200 text-red-800"
                            )}>
                              {vendedor.percentual.toFixed(1)}%
                            </span>
                            <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-500 rounded-full",
                                  vendedor.percentual >= 100 
                                    ? "bg-gradient-to-r from-green-400 to-green-500" 
                                    : vendedor.percentual >= 80 
                                    ? "bg-gradient-to-r from-yellow-400 to-yellow-500"
                                    : "bg-gradient-to-r from-red-400 to-red-500"
                                )}
                                style={{ width: `${Math.min(100, vendedor.percentual)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">Sem meta</span>
                        )}
                      </TableCell>
                      
                      {/* Quantidade Criadas no Mês */}
                      <TableCell 
                        className={cn(
                          "text-center text-xs py-2.5 px-1 font-bold border-l-2 border-blue-300",
                          vendedor.quantidade_oportunidades > 0 
                            ? "text-purple-600 cursor-pointer hover:bg-purple-50 transition-colors"
                            : "text-gray-400"
                        )}
                        onClick={() => vendedor.quantidade_oportunidades > 0 && handleCelulaClick(vendedor.vendedor_id, vendedor.vendedor_nome, 'criadas', vendedor.quantidade_oportunidades)}
                      >
                        {vendedor.quantidade_oportunidades > 0 ? vendedor.quantidade_oportunidades : '-'}
                      </TableCell>
                      
                      {/* Quantidade Abertas */}
                      <TableCell 
                        className={cn(
                          "text-center text-xs py-2.5 px-1 font-bold border-l border-slate-200",
                          vendedor.quantidade_abertas > 0 
                            ? "text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors"
                            : "text-gray-400"
                        )}
                        onClick={() => vendedor.quantidade_abertas > 0 && handleCelulaClick(vendedor.vendedor_id, vendedor.vendedor_nome, 'abertas', vendedor.quantidade_abertas)}
                      >
                        {vendedor.quantidade_abertas > 0 ? vendedor.quantidade_abertas : '-'}
                      </TableCell>
                      
                      {/* Quantidade Ganhas */}
                      <TableCell 
                        className={cn(
                          "text-center text-xs py-2.5 px-1 font-bold border-l border-slate-200",
                          vendedor.quantidade_vendas > 0 
                            ? "text-green-600 cursor-pointer hover:bg-green-50 transition-colors"
                            : "text-gray-400"
                        )}
                        onClick={() => vendedor.quantidade_vendas > 0 && handleCelulaClick(vendedor.vendedor_id, vendedor.vendedor_nome, 'ganhas', vendedor.quantidade_vendas)}
                      >
                        {vendedor.quantidade_vendas > 0 ? vendedor.quantidade_vendas : '-'}
                      </TableCell>
                      
                      {/* Quantidade Perdidas */}
                      <TableCell 
                        className={cn(
                          "text-center text-xs py-2.5 px-1 font-bold border-l border-slate-200",
                          vendedor.quantidade_perdidas > 0 
                            ? "text-red-600 cursor-pointer hover:bg-red-50 transition-colors"
                            : "text-gray-400"
                        )}
                        onClick={() => vendedor.quantidade_perdidas > 0 && handleCelulaClick(vendedor.vendedor_id, vendedor.vendedor_nome, 'perdidas', vendedor.quantidade_perdidas)}
                      >
                        {vendedor.quantidade_perdidas > 0 ? vendedor.quantidade_perdidas : '-'}
                      </TableCell>
                      
                      {/* Taxa de Conversão */}
                      <TableCell className="text-center py-2.5 px-1 border-l border-slate-200">
                        <span className={cn(
                          "inline-flex items-center justify-center px-2 py-0.5 rounded-full font-bold text-[10px]",
                          vendedor.taxa_conversao >= 30 
                            ? "bg-green-100 text-green-700" 
                            : vendedor.taxa_conversao >= 15 
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {vendedor.taxa_conversao.toFixed(1)}%
                        </span>
                      </TableCell>
                      
                      {/* Ticket Médio */}
                      <TableCell className="text-center font-semibold text-xs py-2.5 px-2 border-l border-slate-200">
                        {ticketMedio > 0 ? formatCurrency(ticketMedio) : '-'}
                      </TableCell>
                    </TableRow>
                  )
                })}
                
                {/* Linha de Resumo/Total */}
                <TableRow className="bg-blue-50 border-t-2 border-blue-300 font-bold hover:bg-blue-100 transition-colors">
                  <TableCell className="sticky left-0 z-10 bg-blue-50 text-center border-r-2 border-slate-200"></TableCell>
                  <TableCell className="sticky left-[50px] z-10 bg-blue-50 font-extrabold text-xs uppercase border-r-2 border-slate-200 py-3 px-3 text-blue-800">TOTAL</TableCell>
                  
                  {/* Meta Total */}
                  <TableCell className="text-right font-bold text-xs py-3 px-3 text-blue-800">
                    {formatCurrency(vendedores.reduce((acc, v) => acc + v.meta_valor, 0))}
                  </TableCell>
                  
                  {/* Realizado Total */}
                  <TableCell className="text-right font-extrabold text-xs py-3 px-3 text-green-700">
                    {formatCurrency(vendedores.reduce((acc, v) => acc + v.realizado, 0))}
                  </TableCell>
                  
                  {/* Diferença Total */}
                  <TableCell className="text-right py-3 px-3">
                    {(() => {
                      const diferencaTotal = vendedores.reduce((acc, v) => acc + v.diferenca, 0)
                      return (
                        <span className={cn(
                          "inline-flex items-center gap-1 font-bold text-xs",
                          diferencaTotal >= 0 ? "text-green-700" : "text-red-700"
                        )}>
                          {diferencaTotal > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : diferencaTotal < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          {diferencaTotal >= 0 ? '+' : ''}{formatCurrency(diferencaTotal)}
                        </span>
                      )
                    })()}
                  </TableCell>
                  
                  {/* Progresso Total */}
                  <TableCell className="text-center py-3 px-3">
                    {(() => {
                      const metaTotal = vendedores.reduce((acc, v) => acc + v.meta_valor, 0)
                      const realizadoTotal = vendedores.reduce((acc, v) => acc + v.realizado, 0)
                      const percentualTotal = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0
                      
                      if (metaTotal === 0) {
                        return <span className="text-gray-400 text-xs">-</span>
                      }
                      
                      return (
                        <span className={cn(
                          "px-2 py-1 rounded-md font-bold text-[10px]",
                          percentualTotal >= 100 
                            ? "bg-green-200 text-green-800" 
                            : percentualTotal >= 80 
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-red-200 text-red-800"
                        )}>
                          {percentualTotal.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </TableCell>
                  
                  {/* Total Criadas no Mês */}
                  <TableCell className="text-center py-3 px-1 border-l-2 border-blue-300">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-purple-200 text-purple-800 rounded-full font-bold text-xs">
                      {vendedores.reduce((acc, v) => acc + v.quantidade_oportunidades, 0)}
                    </span>
                  </TableCell>
                  
                  {/* Total Abertas */}
                  <TableCell className="text-center py-3 px-1 border-l border-slate-200">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-blue-200 text-blue-800 rounded-full font-bold text-xs">
                      {vendedores.reduce((acc, v) => acc + v.quantidade_abertas, 0)}
                    </span>
                  </TableCell>
                  
                  {/* Total Ganhas */}
                  <TableCell className="text-center py-3 px-1 border-l border-slate-200">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-green-200 text-green-800 rounded-full font-bold text-xs">
                      {vendedores.reduce((acc, v) => acc + v.quantidade_vendas, 0)}
                    </span>
                  </TableCell>
                  
                  {/* Total Perdidas */}
                  <TableCell className="text-center py-3 px-1 border-l border-slate-200">
                    <span className="inline-flex items-center justify-center px-2 py-1 bg-red-200 text-red-800 rounded-full font-bold text-xs">
                      {vendedores.reduce((acc, v) => acc + v.quantidade_perdidas, 0)}
                    </span>
                  </TableCell>
                  
                  {/* Taxa de Conversão Média */}
                  <TableCell className="text-center py-3 px-1 border-l border-slate-200">
                    {(() => {
                      const totalOportunidades = vendedores.reduce((acc, v) => acc + v.quantidade_oportunidades, 0)
                      const totalVendasGanhas = vendedores.reduce((acc, v) => acc + v.quantidade_vendas, 0)
                      const taxaMedia = totalOportunidades > 0 ? (totalVendasGanhas / totalOportunidades) * 100 : 0
                      
                      return (
                        <span className={cn(
                          "inline-flex items-center justify-center px-2 py-1 rounded-full font-bold text-xs",
                          taxaMedia >= 30 
                            ? "bg-green-200 text-green-800" 
                            : taxaMedia >= 15 
                            ? "bg-yellow-200 text-yellow-800"
                            : "bg-red-200 text-red-800"
                        )}>
                          {taxaMedia.toFixed(1)}%
                        </span>
                      )
                    })()}
                  </TableCell>
                  
                  {/* Ticket Médio Geral */}
                  <TableCell className="text-center font-bold text-xs py-3 px-2 border-l border-slate-200">
                    {(() => {
                      const realizadoTotal = vendedores.reduce((acc, v) => acc + v.realizado, 0)
                      const vendasTotal = vendedores.reduce((acc, v) => acc + v.quantidade_vendas, 0)
                      const ticketMedioGeral = vendasTotal > 0 ? realizadoTotal / vendasTotal : 0
                      return ticketMedioGeral > 0 ? formatCurrency(ticketMedioGeral) : '-'
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Modal de Detalhes */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-[90vw] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle className="text-lg font-bold">{tituloModal}</DialogTitle>
          </DialogHeader>

          {loadingModal ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-muted-foreground">Carregando oportunidades...</div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <TabelaOportunidadesModal oportunidades={oportunidadesModal} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  )
})
