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
  dataFim
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
      console.error('Erro ao buscar oportunidades:', error)
    } finally {
      setLoadingModal(false)
    }
  }

  useEffect(() => {
    console.log('🔍 ConsultorFunilEtapas montado', { vendedorId, dataInicio, dataFim })
    
    if (!vendedorId || !dataInicio || !dataFim) {
      console.log('❌ ConsultorFunilEtapas: Faltam parâmetros')
      return
    }

    const fetchData = async () => {
      try {
        console.log('📡 ConsultorFunilEtapas: Iniciando busca...')
        setLoading(true)
        setError(null)

        // 1. Buscar todas as colunas do funil de vendas (ID 4)
        const colunasResponse = await fetch('/api/funil/colunas?funil_id=4')
        const colunasData = await colunasResponse.json()
        console.log('📊 Colunas do funil:', colunasData)

        if (!colunasData.success || !colunasData.colunas || colunasData.colunas.length === 0) {
          console.log('⚠️ Nenhuma coluna encontrada')
          setEtapas([])
          return
        }

        // 2. Buscar oportunidades abertas do vendedor agrupadas por coluna
        const oportResponse = await fetch(`/api/consultor/oportunidades-por-coluna?vendedor_id=${vendedorId}&funil_id=4`)
        const oportData = await oportResponse.json()
        console.log('📊 Oportunidades por coluna:', oportData)

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

        console.log('📊 Dados por coluna:', Array.from(dadosPorColuna.entries()))

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
        console.log('✅ ConsultorFunilEtapas: Dados processados', { 
          totalEtapas: etapasArray.length, 
          etapas: etapasArray.map(e => ({ id: e.coluna_id, nome: e.nome_coluna }))
        })
        setEtapas(etapasArray)

      } catch (err) {
        console.error('❌ ConsultorFunilEtapas: Erro ao buscar dados', err)
        setError('Erro ao buscar dados das etapas do funil')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [vendedorId, dataInicio, dataFim])

  if (loading) {
    console.log('⏳ ConsultorFunilEtapas: Renderizando loading...')
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
    console.log('❌ ConsultorFunilEtapas: Renderizando erro...', error)
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
    console.log('⚠️ ConsultorFunilEtapas: Nenhuma etapa encontrada, não renderizando')
    return null
  }
  
  console.log('🎨 ConsultorFunilEtapas: Renderizando tabela com', etapas.length, 'etapas')

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
      <Card className="border-gray-300 shadow-sm">
      <CardHeader className="bg-blue-100 py-2.5 px-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-blue-600" />
              Minhas Oportunidades por Etapa do Funil
            </CardTitle>
            <CardDescription className="text-[10px] mt-0.5">
              Distribuição de oportunidades nas etapas do funil de vendas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="sticky left-0 z-20 bg-background min-w-[100px] border-r h-10 px-3 text-xs font-medium text-muted-foreground">
                  Status
                </TableHead>
                {etapas.map((etapa) => (
                  <TableHead
                    key={etapa.coluna_id}
                    className="text-center min-w-[120px] h-10 px-2 text-xs font-medium text-muted-foreground"
                  >
                    <div className="truncate" title={etapa.nome_coluna}>
                      {etapa.nome_coluna}
                    </div>
                  </TableHead>
                ))}
                <TableHead className="text-center bg-blue-100 min-w-[100px] border-l-2 border-blue-300 h-10 px-3 text-xs font-semibold text-gray-700">
                  Total
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Linha 1: Todas as Oportunidades Abertas */}
              <TableRow className="hover:bg-blue-50/50 bg-white">
                <TableCell className="sticky left-0 z-10 bg-white border-r border-gray-300 font-semibold text-xs px-3 py-2 text-blue-700">
                  Abertas
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className="text-center text-sm py-2 px-2 font-bold text-blue-700 cursor-pointer hover:bg-blue-100 transition-colors border-l border-gray-200"
                    onClick={() => etapa.total_abertas > 0 && handleCelulaClick(etapa, 'todas')}
                  >
                    {etapa.total_abertas > 0 ? etapa.total_abertas : <span className="text-gray-400">-</span>}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-100 font-bold border-l-2 border-blue-300 px-3 py-2 text-sm text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors"
                  onClick={() => totalAbertas > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, 'todas')}
                >
                  {totalAbertas}
                </TableCell>
              </TableRow>

              {/* Linha 2: Abertas com Valor > 0 (Qtd + Valor) */}
              <TableRow className="hover:bg-green-50 bg-green-50/30 border-t-2 border-gray-200">
                <TableCell className="sticky left-0 z-10 bg-green-50/30 border-r border-gray-300 font-semibold text-xs px-3 py-2 text-green-700">
                  Com Valor
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className="text-center py-2 px-1 cursor-pointer hover:bg-green-100 transition-colors border-l border-gray-200"
                    onClick={() => etapa.total_com_valor > 0 && handleCelulaClick(etapa, 'com_valor')}
                  >
                    {etapa.total_com_valor > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-bold text-green-700">{etapa.total_com_valor}</span>
                        <span className="text-[10px] font-semibold text-green-700">{formatCurrency(etapa.valor_total_com_valor)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-green-100 font-bold border-l-2 border-green-300 px-3 py-2 cursor-pointer hover:bg-green-200 transition-colors"
                  onClick={() => totalComValor > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, 'com_valor')}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm text-green-800">{totalComValor}</span>
                    <span className="text-[10px] text-green-800">{formatCurrency(valorTotalComValor)}</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* Linha 3: Abertas há + de 10 dias */}
              <TableRow className="hover:bg-orange-50/50 bg-orange-50/20 border-t-2 border-gray-200">
                <TableCell className="sticky left-0 z-10 bg-orange-50/20 border-r border-gray-300 font-semibold text-xs px-3 py-2 text-orange-700">
                  Abertas +10 dias
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className="text-center py-2 px-1 cursor-pointer hover:bg-orange-100 transition-colors border-l border-gray-200"
                    onClick={() => etapa.total_abertas_10_dias > 0 && handleCelulaClick(etapa, '10_dias' as any)}
                  >
                    {etapa.total_abertas_10_dias > 0 ? (
                      <span className="text-sm font-bold text-orange-700">{etapa.total_abertas_10_dias}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-orange-100 font-bold border-l-2 border-orange-300 px-3 py-2 cursor-pointer hover:bg-orange-200 transition-colors"
                  onClick={() => totalAbertas10Dias > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, '10_dias' as any)}
                >
                  <span className="text-sm text-orange-800">{totalAbertas10Dias}</span>
                </TableCell>
              </TableRow>

              {/* Linha 4: Abertas há + de 30 dias */}
              <TableRow className="hover:bg-red-50/50 bg-red-50/20 border-t border-gray-200">
                <TableCell className="sticky left-0 z-10 bg-red-50/20 border-r border-gray-300 font-semibold text-xs px-3 py-2 text-red-700">
                  Abertas +30 dias
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className="text-center py-2 px-1 cursor-pointer hover:bg-red-100 transition-colors border-l border-gray-200"
                    onClick={() => etapa.total_abertas_30_dias > 0 && handleCelulaClick(etapa, '30_dias' as any)}
                  >
                    {etapa.total_abertas_30_dias > 0 ? (
                      <span className="text-sm font-bold text-red-700">{etapa.total_abertas_30_dias}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-red-100 font-bold border-l-2 border-red-300 px-3 py-2 cursor-pointer hover:bg-red-200 transition-colors"
                  onClick={() => totalAbertas30Dias > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, '30_dias' as any)}
                >
                  <span className="text-sm text-red-800">{totalAbertas30Dias}</span>
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
                          onClick={() => window.open(`https://app.sprinthub.com.br/oportunidades/${op.id}`, '_blank')}
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

