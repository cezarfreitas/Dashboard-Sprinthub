"use client"

import { memo, useEffect, useState } from "react"
import { AlertCircle, GitBranch, ExternalLink, X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface EtapaFunil {
  coluna_id: number
  nome_coluna: string
  sequencia: number
  total_abertas: number
  valor_abertas: number
  total_com_valor: number
  valor_total_com_valor: number
  total_abertas_10_dias: number
  total_abertas_30_dias: number
}

interface ConsultorFunilEtapasProps {
  vendedorId: number
  dataInicio: string
  dataFim: string
  funilSelecionado?: string | null
}

interface Oportunidade {
  id: number
  title: string
  value: number
  createDate: string
  crm_column: string
}

export const ConsultorFunilEtapas = memo(function ConsultorFunilEtapas({
  vendedorId,
  dataInicio,
  dataFim,
  funilSelecionado
}: ConsultorFunilEtapasProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [etapas, setEtapas] = useState<EtapaFunil[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [colunaModal, setColunaModal] = useState<{ nome: string; total: number } | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)

  // Função para abrir modal com oportunidades da coluna
  const handleCelulaClick = async (etapa: EtapaFunil | { coluna_id: null; nome_coluna: string; total_abertas?: number; total_com_valor?: number }, tipo: 'todas' | 'com_valor' | '10_dias' | '30_dias') => {
    try {
      setLoadingModal(true)
      setModalAberto(true)
      
      let total = 0
      if (tipo === 'todas') {
        total = etapa.coluna_id === null ? totalAbertas : (etapa as EtapaFunil).total_abertas
      } else if (tipo === 'com_valor') {
        total = etapa.coluna_id === null ? totalComValor : (etapa as EtapaFunil).total_com_valor
      } else if (tipo === '10_dias') {
        total = etapa.coluna_id === null ? totalAbertas10Dias : (etapa as EtapaFunil).total_abertas_10_dias
      } else if (tipo === '30_dias') {
        total = etapa.coluna_id === null ? totalAbertas30Dias : (etapa as EtapaFunil).total_abertas_30_dias
      }
      
      setColunaModal({ nome: etapa.nome_coluna, total })
      setOportunidadesModal([])

      const params = new URLSearchParams()
      params.append('vendedor_id', vendedorId.toString())
      // Se coluna_id for null, não adiciona o filtro (busca de todas as colunas)
      if (etapa.coluna_id !== null) {
        params.append('coluna_funil_id', etapa.coluna_id.toString())
      }
      params.append('status', 'open')
      if (tipo === 'com_valor') {
        params.append('com_valor', '1')
      } else if (tipo === '10_dias') {
        params.append('dias_aberta', '10')
      } else if (tipo === '30_dias') {
        params.append('dias_aberta', '30')
      }

      const response = await fetch(`/api/consultor/oportunidades-detalhes?${params.toString()}`)
      const data = await response.json()

      if (data.success) {
        setOportunidadesModal(data.data)
      }
    } catch (error) {
      // Erro ao buscar oportunidades
    } finally {
      setLoadingModal(false)
    }
  }

  useEffect(() => {
    if (!vendedorId || !dataInicio || !dataFim) {
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Usar funil selecionado ou funil de vendas (ID 4) como padrão
        const funilId = funilSelecionado || '4'

        // 1. Buscar todas as colunas do funil
        const colunasResponse = await fetch(`/api/funil/colunas?funil_id=${funilId}`)
        
        if (!colunasResponse.ok) {
          throw new Error(`Erro ao buscar colunas: ${colunasResponse.status} ${colunasResponse.statusText}`)
        }
        
        const colunasData = await colunasResponse.json()

        if (!colunasData.success) {
          throw new Error(colunasData.message || 'Erro ao buscar colunas do funil')
        }
        
        if (!colunasData.colunas || colunasData.colunas.length === 0) {
          setEtapas([])
          return
        }

        // 2. Buscar oportunidades abertas do vendedor agrupadas por coluna
        const oportResponse = await fetch(`/api/consultor/oportunidades-por-coluna?vendedor_id=${vendedorId}&funil_id=${funilId}`)
        
        if (!oportResponse.ok) {
          throw new Error(`Erro ao buscar oportunidades: ${oportResponse.status} ${oportResponse.statusText}`)
        }
        
        const oportData = await oportResponse.json()
        
        if (!oportData.success) {
          throw new Error(oportData.message || 'Erro ao buscar oportunidades por coluna')
        }

        // 3. Criar mapa de dados por coluna
        const dadosPorColuna = new Map<number, { total: number; totalComValor: number; valorTotal: number; total10Dias: number; total30Dias: number }>()
        
        if (oportData.success && Array.isArray(oportData.data)) {
          oportData.data.forEach((item: any) => {
            dadosPorColuna.set(item.coluna_funil_id, {
              total: Number(item.total) || 0,
              totalComValor: Number(item.total_com_valor) || 0,
              valorTotal: Number(item.valor_total_com_valor) || 0,
              total10Dias: Number(item.total_abertas_10_dias) || 0,
              total30Dias: Number(item.total_abertas_30_dias) || 0
            })
          })
        }

        // 4. Montar dados combinando todas as colunas com suas contagens
        const etapasArray: EtapaFunil[] = colunasData.colunas.map((coluna: any) => {
          const dados = dadosPorColuna.get(coluna.id)
          return {
            coluna_id: coluna.id,
            nome_coluna: coluna.nome_coluna,
            sequencia: coluna.sequencia,
            total_abertas: dados?.total || 0,
            valor_abertas: 0,
            total_com_valor: dados?.totalComValor || 0,
            valor_total_com_valor: dados?.valorTotal || 0,
            total_abertas_10_dias: dados?.total10Dias || 0,
            total_abertas_30_dias: dados?.total30Dias || 0
          }
        }).sort((a: EtapaFunil, b: EtapaFunil) => a.sequencia - b.sequencia)
        setEtapas(etapasArray)

      } catch (err) {
        console.error('Erro detalhado ao buscar etapas do funil:', err)
        const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar dados das etapas do funil'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [vendedorId, dataInicio, dataFim, funilSelecionado])

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Carregando etapas do funil...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Se não houver dados, não mostrar
  if (etapas.length === 0) {
    return null
  }

  // Calcular totais
  const totalAbertas = etapas.reduce((acc, etapa) => acc + (etapa.total_abertas || 0), 0)
  const totalComValor = etapas.reduce((acc, etapa) => acc + (etapa.total_com_valor || 0), 0)
  const valorTotalComValor = etapas.reduce((acc, etapa) => acc + (etapa.valor_total_com_valor || 0), 0)
  const totalAbertas10Dias = etapas.reduce((acc, etapa) => acc + (etapa.total_abertas_10_dias || 0), 0)
  const totalAbertas30Dias = etapas.reduce((acc, etapa) => acc + (etapa.total_abertas_30_dias || 0), 0)

  // Função para formatar valor
  const formatCurrency = (value: number) => {
    const safeValue = Number(value) || 0
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(safeValue)
  }

  return (
    <>
      <Card className="border-primary border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
      <div className="card-header-brand">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="card-header-brand-icon" />
            <div>
              <div className="card-header-brand-title">
                Oportunidades por Etapa do Funil
              </div>
              <div className="card-header-brand-subtitle">
                {totalAbertas} oportunidades distribuídas em {etapas.length} etapas
              </div>
            </div>
          </div>
        </div>
      </div>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-gradient-to-r from-slate-50 to-slate-100 border-b-2 border-blue-200">
                <TableHead className="sticky left-0 z-20 bg-gradient-to-r from-slate-50 to-slate-100 min-w-[90px] border-r-2 border-blue-200 h-10 px-3 text-xs font-bold text-gray-700 uppercase">
                  Status
                </TableHead>
                {etapas.map((etapa) => (
                  <TableHead
                    key={etapa.coluna_id}
                    className="text-center min-w-[100px] h-10 px-2 text-xs font-bold text-gray-700"
                  >
                    <div className="truncate" title={etapa.nome_coluna}>
                      {etapa.sequencia}. {etapa.nome_coluna}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center bg-blue-50 min-w-[80px] border-l-2 border-blue-300 h-10 px-2 text-xs font-extrabold text-blue-800 uppercase">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Linha 1: Todas as Oportunidades Abertas */}
              <TableRow className="hover:bg-slate-50/80 bg-white border-b transition-colors">
                <TableCell className="sticky left-0 z-10 bg-white border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-slate-700">
                  Abertas
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className={`text-center text-sm py-2.5 px-1 font-bold border-l border-slate-200 ${
                      etapa.total_abertas > 0 
                        ? 'text-blue-600 cursor-pointer hover:bg-blue-50 transition-colors' 
                        : 'text-gray-400'
                    }`}
                    onClick={() => etapa.total_abertas > 0 && handleCelulaClick(etapa, 'todas')}
                  >
                    {etapa.total_abertas > 0 ? etapa.total_abertas : '-'}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 text-sm text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => totalAbertas > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, 'todas')}
                >
                  {totalAbertas}
                </TableCell>
              </TableRow>

              {/* Linha 2: Abertas com Valor > 0 (Qtd + Valor) */}
              <TableRow className="hover:bg-slate-50/80 bg-slate-50/40 border-b transition-colors">
                <TableCell className="sticky left-0 z-10 bg-slate-50/40 border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-slate-700">
                  Com Valor
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className={`text-center py-2.5 px-1 border-l border-slate-200 ${
                      etapa.total_com_valor > 0 
                        ? 'cursor-pointer hover:bg-green-50 transition-colors' 
                        : ''
                    }`}
                    onClick={() => etapa.total_com_valor > 0 && handleCelulaClick(etapa, 'com_valor')}
                  >
                    {etapa.total_com_valor > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-green-600">{etapa.total_com_valor}</span>
                        <span className="text-[10px] font-medium text-green-600">{formatCurrency(etapa.valor_total_com_valor)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 cursor-pointer hover:bg-blue-100 hover:scale-105 transition-all duration-200"
                  onClick={() => totalComValor > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, 'com_valor')}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-700">{totalComValor}</span>
                    <span className="text-[10px] font-medium text-green-600">{formatCurrency(valorTotalComValor)}</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* Linha 3: Abertas há + de 10 dias */}
              <TableRow className="hover:bg-slate-50/80 bg-white border-b transition-colors">
                <TableCell className="sticky left-0 z-10 bg-white border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-slate-700">
                  +10 dias
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className={`text-center text-sm py-2.5 px-2 font-bold border-l border-slate-200 ${
                      etapa.total_abertas_10_dias > 0 
                        ? 'text-orange-600 cursor-pointer hover:bg-orange-50 transition-colors' 
                        : 'text-gray-400'
                    }`}
                    onClick={() => etapa.total_abertas_10_dias > 0 && handleCelulaClick(etapa, '10_dias')}
                  >
                    {etapa.total_abertas_10_dias > 0 ? etapa.total_abertas_10_dias : '-'}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 text-sm text-orange-700 cursor-pointer hover:bg-blue-100 hover:scale-105 transition-all duration-200"
                  onClick={() => totalAbertas10Dias > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, '10_dias')}
                >
                  {totalAbertas10Dias}
                </TableCell>
              </TableRow>

              {/* Linha 4: Abertas há + de 30 dias */}
              <TableRow className="hover:bg-slate-50/80 bg-slate-50/40 transition-colors">
                <TableCell className="sticky left-0 z-10 bg-slate-50/40 border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-slate-700">
                  +30 dias
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className={`text-center text-sm py-2.5 px-2 font-bold border-l border-slate-200 ${
                      etapa.total_abertas_30_dias > 0 
                        ? 'text-red-600 cursor-pointer hover:bg-red-50 transition-colors' 
                        : 'text-gray-400'
                    }`}
                    onClick={() => etapa.total_abertas_30_dias > 0 && handleCelulaClick(etapa, '30_dias')}
                  >
                    {etapa.total_abertas_30_dias > 0 ? etapa.total_abertas_30_dias : '-'}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 text-sm text-red-700 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => totalAbertas30Dias > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, '30_dias')}
                >
                  {totalAbertas30Dias}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>

      {/* Modal com lista de oportunidades */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-blue-600" />
              {colunaModal?.nome}
            </DialogTitle>
            <DialogDescription>
              {colunaModal?.total} oportunidade(s) nesta etapa
            </DialogDescription>
          </DialogHeader>

          {loadingModal ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Carregando oportunidades...</div>
            </div>
          ) : oportunidadesModal.length > 0 ? (
            <div className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[60px]">ID</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead className="text-right w-[120px]">Valor</TableHead>
                    <TableHead className="text-center w-[120px]">Data Criação</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesModal.map((op) => (
                    <TableRow key={op.id}>
                      <TableCell className="font-medium">{op.id}</TableCell>
                      <TableCell>{op.title}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {op.value > 0 ? formatCurrency(op.value) : '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(op.createDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            const crmUrl = process.env.NEXT_PUBLIC_URL_PUBLIC || 'https://grupointeli.sprinthub.app'
                            window.open(`${crmUrl}/sh/crm?opportunityID=${op.id}`, '_blank')
                          }}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              Nenhuma oportunidade encontrada
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
})

