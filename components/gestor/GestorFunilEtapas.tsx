"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { GitBranch, ExternalLink } from "lucide-react"

interface EtapaFunil {
  coluna_id: number
  nome_coluna: string
  sequencia: number
  total_abertas: number
  total_com_valor: number
  valor_total_com_valor: number
  total_perdidas_mes: number
  valor_perdidas_mes: number
  total_ganhas_mes: number
  valor_ganhas_mes: number
}

interface GestorFunilEtapasProps {
  unidadeId: number | null
  dataInicio?: string | null
  dataFim?: string | null
  funilId?: number | null
}

interface Oportunidade {
  id: string
  title: string
  value: number
  createDate: string
  crm_column: string
  status: string
  vendedor_nome: string | null
  dias_aberta: number
}

interface Vendedor {
  id: number
  name: string
  lastName: string
}

export function GestorFunilEtapas({
  unidadeId,
  dataInicio,
  dataFim,
  funilId
}: GestorFunilEtapasProps) {
  const [loading, setLoading] = useState(true)
  const [etapas, setEtapas] = useState<EtapaFunil[]>([])
  const [modalAberto, setModalAberto] = useState(false)
  const [oportunidadesModal, setOportunidadesModal] = useState<Oportunidade[]>([])
  const [colunaModal, setColunaModal] = useState<{ nome: string; total: number } | null>(null)
  const [loadingModal, setLoadingModal] = useState(false)
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [vendedorSelecionado, setVendedorSelecionado] = useState<string>('todos')

  // Buscar vendedores da unidade
  useEffect(() => {
    const fetchVendedores = async () => {
      if (!unidadeId) {
        setVendedores([])
        return
      }

      try {
        const response = await fetch(`/api/vendedores/lista?unidade_id=${unidadeId}&ativo=1`)
        const data = await response.json()
        
        console.log('📋 Vendedores carregados:', data)
        
        if (data.success && Array.isArray(data.vendedores)) {
          setVendedores(data.vendedores)
          console.log('✅ Vendedores definidos:', data.vendedores.length, 'vendedores')
        } else {
          console.warn('⚠️ Resposta da API não tem vendedores:', data)
          setVendedores([])
        }
      } catch (error) {
        console.error('❌ Erro ao buscar vendedores:', error)
        setVendedores([])
      }
    }

    fetchVendedores()
  }, [unidadeId])

  useEffect(() => {
    const fetchEtapas = async () => {
      if (!unidadeId) {
        setLoading(false)
        return
      }

      try {
        setLoading(true)

        // Usar funil selecionado ou funil de vendas (ID 4) como padrão
        const funilIdFinal = funilId || 4

        // 1. Buscar todas as colunas do funil
        const colunasResponse = await fetch(`/api/funil/colunas?funil_id=${funilIdFinal}`)

        if (!colunasResponse.ok) {
          throw new Error(`Erro ao buscar colunas: ${colunasResponse.status}`)
        }

        const colunasData = await colunasResponse.json()

        if (!colunasData.success || !colunasData.colunas || colunasData.colunas.length === 0) {
          setEtapas([])
          setLoading(false)
          return
        }

        // 2. Buscar oportunidades abertas da unidade agrupadas por coluna
        const vendedorIdParam = vendedorSelecionado !== 'todos' ? `&vendedor_id=${vendedorSelecionado}` : ''
        const oportResponse = await fetch(`/api/gestor/oportunidades-por-coluna?unidade_id=${unidadeId}&funil_id=${funilIdFinal}${vendedorIdParam}`)

        if (!oportResponse.ok) {
          throw new Error(`Erro ao buscar oportunidades: ${oportResponse.status}`)
        }

        const oportData = await oportResponse.json()

        console.log('📊 Resposta API oportunidades-por-coluna:', oportData)

        if (!oportData.success) {
          throw new Error(oportData.message || 'Erro ao buscar oportunidades por coluna')
        }

        // 3. Criar mapa de dados por coluna
        const dadosPorColuna = new Map<number, { 
          total: number; 
          totalComValor: number; 
          valorTotal: number;
          totalPerdidasMes: number;
          valorPerdidasMes: number;
          totalGanhasMes: number;
          valorGanhasMes: number;
        }>()

        if (oportData.success && Array.isArray(oportData.data)) {
          console.log('📋 Dados recebidos da API:', oportData.data.length, 'registros')
          oportData.data.forEach((item: any) => {
            dadosPorColuna.set(item.coluna_funil_id, {
              total: Number(item.total) || 0,
              totalComValor: Number(item.total_com_valor) || 0,
              valorTotal: Number(item.valor_total_com_valor) || 0,
              totalPerdidasMes: Number(item.total_perdidas_mes) || 0,
              valorPerdidasMes: Number(item.valor_perdidas_mes) || 0,
              totalGanhasMes: Number(item.total_ganhas_mes) || 0,
              valorGanhasMes: Number(item.valor_ganhas_mes) || 0
            })
          })
          console.log('🗺️ Mapa de dados por coluna:', Array.from(dadosPorColuna.entries()))
        }

        // 4. Montar dados combinando todas as colunas com suas contagens
        const etapasArray: EtapaFunil[] = colunasData.colunas.map((coluna: any) => {
          const dados = dadosPorColuna.get(coluna.id)
          return {
            coluna_id: coluna.id,
            nome_coluna: coluna.nome_coluna,
            sequencia: coluna.sequencia,
            total_abertas: dados?.total || 0,
            total_com_valor: dados?.totalComValor || 0,
            valor_total_com_valor: dados?.valorTotal || 0,
            total_perdidas_mes: dados?.totalPerdidasMes || 0,
            valor_perdidas_mes: dados?.valorPerdidasMes || 0,
            total_ganhas_mes: dados?.totalGanhasMes || 0,
            valor_ganhas_mes: dados?.valorGanhasMes || 0
          }
        }).sort((a: EtapaFunil, b: EtapaFunil) => a.sequencia - b.sequencia)

        console.log('✅ Etapas montadas:', etapasArray)
        setEtapas(etapasArray)
      } catch (error) {
        console.error('Erro ao carregar etapas do funil:', error)
        setEtapas([])
      } finally {
        setLoading(false)
      }
    }

    fetchEtapas()
  }, [unidadeId, funilId, vendedorSelecionado])

  // Função para abrir modal com oportunidades da coluna
  const handleCelulaClick = async (etapa: EtapaFunil | { coluna_id: null; nome_coluna: string; total_abertas?: number; total_perdidas_mes?: number; total_ganhas_mes?: number }, tipo: 'todas' | 'com_valor' | 'perdidas' | 'ganhas') => {
    try {
      setLoadingModal(true)
      setModalAberto(true)
      
      let total = 0
      if (etapa.coluna_id === null) {
        if (tipo === 'perdidas') total = totalPerdidasMes
        else if (tipo === 'ganhas') total = totalGanhasMes
        else if (tipo === 'com_valor') total = totalComValor
        else total = totalAbertas
      } else {
        const etapaCompleta = etapa as EtapaFunil
        if (tipo === 'perdidas') total = etapaCompleta.total_perdidas_mes
        else if (tipo === 'ganhas') total = etapaCompleta.total_ganhas_mes
        else if (tipo === 'com_valor') total = etapaCompleta.total_com_valor
        else total = etapaCompleta.total_abertas
      }
      setColunaModal({ nome: etapa.nome_coluna, total })
      setOportunidadesModal([])

      const params = new URLSearchParams()
      params.append('unidade_id', unidadeId!.toString())
      
      // Se houver vendedor selecionado, adicionar ao filtro
      if (vendedorSelecionado !== 'todos') {
        params.append('vendedor_id', vendedorSelecionado)
      }
      
      // Se coluna_id for null, não adiciona o filtro (busca de todas as colunas)
      if (etapa.coluna_id !== null) {
        params.append('coluna_funil_id', etapa.coluna_id.toString())
      }
      
      if (tipo === 'com_valor') {
        params.append('status', 'open')
        params.append('com_valor', '1')
      } else if (tipo === 'perdidas') {
        params.append('status', 'lost')
      } else if (tipo === 'ganhas') {
        params.append('status', 'gain')
      } else {
        params.append('status', 'open')
      }

      const response = await fetch(`/api/gestor/oportunidades-detalhes?${params.toString()}`)
      const data = await response.json()

      if (data.success && Array.isArray(data.data)) {
        setOportunidadesModal(data.data)
      }
    } catch (error) {
      console.error('Erro ao buscar oportunidades:', error)
    } finally {
      setLoadingModal(false)
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const traduzirStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
      'open': 'Aberta',
      'aberta': 'Aberta',
      'active': 'Ativa',
      'gain': 'Ganha',
      'won': 'Ganha',
      'ganho': 'Ganha',
      'ganhos': 'Ganha',
      'lost': 'Perdida',
      'loss': 'Perdida',
      'perdido': 'Perdida',
      'perdidos': 'Perdida'
    }
    return statusMap[status.toLowerCase()] || status
  }

  // Calcular totais
  const totalAbertas = etapas.reduce((acc, etapa) => acc + (etapa.total_abertas || 0), 0)
  const totalComValor = etapas.reduce((acc, etapa) => acc + (etapa.total_com_valor || 0), 0)
  const valorTotalComValor = etapas.reduce((acc, etapa) => acc + (etapa.valor_total_com_valor || 0), 0)
  const totalPerdidasMes = etapas.reduce((acc, etapa) => acc + (etapa.total_perdidas_mes || 0), 0)
  const valorPerdidasMes = etapas.reduce((acc, etapa) => acc + (etapa.valor_perdidas_mes || 0), 0)
  const totalGanhasMes = etapas.reduce((acc, etapa) => acc + (etapa.total_ganhas_mes || 0), 0)
  const valorGanhasMes = etapas.reduce((acc, etapa) => acc + (etapa.valor_ganhas_mes || 0), 0)

  if (loading) {
    return (
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
                  Carregando...
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-0">
          <div className="p-6 space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full bg-gray-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (etapas.length === 0) {
    return (
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
                  Nenhuma oportunidade encontrada
                </div>
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8 text-gray-500 text-sm">
            Nenhuma oportunidade no funil
          </div>
        </CardContent>
      </Card>
    )
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
        {/* Abas de vendedores */}
        {unidadeId && (
          <div className="px-6 pt-4 border-b bg-muted/30">
            <Tabs value={vendedorSelecionado} onValueChange={setVendedorSelecionado}>
              <TabsList className="h-auto p-1 bg-muted/50 overflow-x-auto flex-wrap">
                <TabsTrigger 
                  value="todos" 
                  className="px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                >
                  Todos
                </TabsTrigger>
                {vendedores.length > 0 ? (
                  vendedores.map((vendedor) => (
                    <TabsTrigger
                      key={vendedor.id}
                      value={vendedor.id.toString()}
                      className="px-3 py-1.5 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground whitespace-nowrap"
                    >
                      {vendedor.name} {vendedor.lastName}
                    </TabsTrigger>
                  ))
                ) : (
                  <span className="px-3 py-1.5 text-xs text-muted-foreground">Carregando vendedores...</span>
                )}
              </TabsList>
            </Tabs>
          </div>
        )}
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
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => totalComValor > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas' } as any, 'com_valor')}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-700">{totalComValor}</span>
                    <span className="text-[10px] font-medium text-green-600">{formatCurrency(valorTotalComValor)}</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* Linha 3: Ganhas no Mês (Qtd + Valor) */}
              <TableRow className="hover:bg-slate-50/80 bg-green-50/20 border-b transition-colors">
                <TableCell className="sticky left-0 z-10 bg-green-50/20 border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-green-700">
                  Ganhas no Mês
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className={`text-center py-2.5 px-1 border-l border-slate-200 ${
                      etapa.total_ganhas_mes > 0 
                        ? 'cursor-pointer hover:bg-green-50 transition-colors' 
                        : ''
                    }`}
                    onClick={() => etapa.total_ganhas_mes > 0 && handleCelulaClick(etapa, 'ganhas')}
                  >
                    {etapa.total_ganhas_mes > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-green-600">{etapa.total_ganhas_mes}</span>
                        <span className="text-[10px] font-medium text-green-600">{formatCurrency(etapa.valor_ganhas_mes)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => totalGanhasMes > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas', total_ganhas_mes: totalGanhasMes } as any, 'ganhas')}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-green-700">{totalGanhasMes}</span>
                    <span className="text-[10px] font-medium text-green-600">{formatCurrency(valorGanhasMes)}</span>
                  </div>
                </TableCell>
              </TableRow>

              {/* Linha 4: Perdidas no Mês (Qtd + Valor) */}
              <TableRow className="hover:bg-slate-50/80 bg-red-50/20 border-b transition-colors">
                <TableCell className="sticky left-0 z-10 bg-red-50/20 border-r-2 border-slate-200 font-bold text-xs px-3 py-2.5 text-red-700">
                  Perdidas no Mês
                </TableCell>
                {etapas.map((etapa) => (
                  <TableCell
                    key={etapa.coluna_id}
                    className={`text-center py-2.5 px-1 border-l border-slate-200 ${
                      etapa.total_perdidas_mes > 0 
                        ? 'cursor-pointer hover:bg-red-50 transition-colors' 
                        : ''
                    }`}
                    onClick={() => etapa.total_perdidas_mes > 0 && handleCelulaClick(etapa, 'perdidas')}
                  >
                    {etapa.total_perdidas_mes > 0 ? (
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-red-600">{etapa.total_perdidas_mes}</span>
                        <span className="text-[10px] font-medium text-red-600">{formatCurrency(etapa.valor_perdidas_mes)}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                ))}
                <TableCell 
                  className="text-center bg-blue-50 font-extrabold border-l-2 border-blue-300 px-2 py-2.5 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => totalPerdidasMes > 0 && handleCelulaClick({ coluna_id: null, nome_coluna: 'Todas as Etapas', total_perdidas_mes: totalPerdidasMes } as any, 'perdidas')}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-red-700">{totalPerdidasMes}</span>
                    <span className="text-[10px] font-medium text-red-600">{formatCurrency(valorPerdidasMes)}</span>
                  </div>
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
                    <TableHead className="w-[100px]">Status</TableHead>
                    <TableHead className="w-[120px]">Dias em Aberto</TableHead>
                    <TableHead className="w-[180px]">Vendedor</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {oportunidadesModal.map((op) => (
                    <TableRow key={op.id} className="hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium">{op.id}</TableCell>
                      <TableCell>{op.title}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {op.value > 0 ? formatCurrency(op.value) : '-'}
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {new Date(op.createDate).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          op.status === 'open' || op.status === 'aberta' || op.status === 'active'
                            ? 'bg-blue-100 text-blue-800'
                            : op.status === 'gain' || op.status === 'won' || op.status === 'ganho'
                            ? 'bg-green-100 text-green-800'
                            : op.status === 'lost' || op.status === 'loss' || op.status === 'perdido'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {traduzirStatus(op.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground">
                        {op.dias_aberta !== null && op.dias_aberta !== undefined ? `${op.dias_aberta} dias` : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {op.vendedor_nome || '-'}
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
}
