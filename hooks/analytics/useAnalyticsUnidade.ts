import { useState, useEffect, useCallback, useMemo } from "react"
import type { VendedorStats, GestorStats, PeriodoFiltro } from "@/hooks/gestor/useGestorDashboard"

interface Unidade {
  id: number
  nome: string
}

export function useAnalyticsUnidade() {
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null)
  const [stats, setStats] = useState<GestorStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('este-mes')
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | undefined>(undefined)
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | undefined>(undefined)
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null)

  const getPeriodoDatas = useCallback(() => {
    const agora = new Date()
    const hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate())
    
    let dataInicio: Date
    let dataFim: Date

    switch (periodoFiltro) {
      case 'hoje':
        dataInicio = new Date(hoje)
        dataFim = new Date(hoje)
        break
      
      case 'ontem':
        dataInicio = new Date(hoje)
        dataInicio.setDate(dataInicio.getDate() - 1)
        dataFim = new Date(hoje)
        dataFim.setDate(dataFim.getDate() - 1)
        break
      
      case 'esta-semana':
        const diaSemana = hoje.getDay()
        dataInicio = new Date(hoje)
        dataInicio.setDate(hoje.getDate() - diaSemana)
        dataFim = new Date(hoje)
        break
      
      case 'semana-passada':
        const diaSemanaAtual = hoje.getDay()
        dataInicio = new Date(hoje)
        dataInicio.setDate(hoje.getDate() - diaSemanaAtual - 7)
        dataFim = new Date(hoje)
        dataFim.setDate(hoje.getDate() - diaSemanaAtual - 1)
        break
      
      case 'este-mes':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        dataFim = new Date(hoje)
        break
      
      case 'mes-passado':
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
        break
      
      case 'personalizado':
        if (dataInicioPersonalizada && dataFimPersonalizada) {
          dataInicio = new Date(dataInicioPersonalizada)
          dataInicio.setHours(0, 0, 0, 0)
          dataFim = new Date(dataFimPersonalizada)
          dataFim.setHours(23, 59, 59, 999)
        } else {
          dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          dataFim = new Date(hoje)
        }
        break
      
      default:
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        dataFim = new Date(hoje)
    }

    const formatarData = (data: Date) => {
      const ano = data.getFullYear()
      const mes = String(data.getMonth() + 1).padStart(2, '0')
      const dia = String(data.getDate()).padStart(2, '0')
      return `${ano}-${mes}-${dia}`
    }

    return {
      dataInicio: formatarData(dataInicio),
      dataFim: formatarData(dataFim),
      dataInicioObj: dataInicio,
      dataFimObj: dataFim
    }
  }, [periodoFiltro, dataInicioPersonalizada, dataFimPersonalizada])

  // Buscar unidades disponíveis
  const fetchUnidades = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/simple')
      const data = await response.json()
      if (data.success && data.unidades) {
        const unidadesAtivas = data.unidades
          .filter((u: any) => u.ativo)
          .map((u: any) => ({ id: u.id, nome: u.nome }))
        setUnidades(unidadesAtivas)
        if (unidadesAtivas.length > 0 && !unidadeSelecionada) {
          setUnidadeSelecionada(unidadesAtivas[0].id)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar unidades')
    }
  }, [unidadeSelecionada])

  // Buscar stats da unidade
  const fetchStats = useCallback(async () => {
    if (!unidadeSelecionada) {
      return
    }

    try {
      setLoading(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      // Construir URL com filtros
      const resumoParams = new URLSearchParams()
      resumoParams.append('unidadeId', unidadeSelecionada.toString())
      resumoParams.append('dataInicio', dataInicio)
      resumoParams.append('dataFim', dataFim)
      if (funilSelecionado) {
        resumoParams.append('funilId', funilSelecionado)
      }
      
      // Buscar resumo da unidade
      const resumoResponse = await fetch(
        `/api/unidades/resumo?${resumoParams.toString()}`
      )

      if (!resumoResponse.ok) {
        throw new Error(`Erro HTTP: ${resumoResponse.status}`)
      }

      const resumoData = await resumoResponse.json()

      if (resumoData.success && resumoData.unidades && resumoData.unidades.length > 0) {
        const unidade = resumoData.unidades[0]
        const vendedores = unidade.vendedores || []
        
        // Calcular stats agregadas
        const totalVendedores = vendedores.length
        const oportunidadesCriadas = Number(unidade.criadas) || 0
        const oportunidadesGanhas = Number(unidade.ganhas_atual) || 0
        const valorGanho = Number(unidade.realizado) || 0
        const oportunidadesPerdidas = Number(unidade.perdidas_atual) || 0
        const oportunidadesAbertas = Number(unidade.abertas_atual) || 0
        const metaTotal = Number(unidade.meta) || 0

        // Buscar etapas do funil - usar API de stats com filtro de unidade
        // Buscar oportunidades abertas da unidade no período
        let etapasFunil: Array<{
          id: number
          nome_coluna: string
          sequencia: number
          total_oportunidades: number
          valor_total: number
        }> = []

        try {
          // Buscar todas as oportunidades abertas da unidade no período
          const funilParams = new URLSearchParams()
          funilParams.append('unidade_id', unidadeSelecionada.toString())
          funilParams.append('created_date_start', dataInicio)
          funilParams.append('created_date_end', dataFim)
          funilParams.append('status', 'open')
          funilParams.append('group_by', 'coluna_funil')
          if (funilSelecionado) {
            funilParams.append('funil_id', funilSelecionado)
          }
          
          const funilResponse = await fetch(
            `/api/oportunidades/stats?${funilParams.toString()}`
          )
          
          if (funilResponse.ok) {
            const funilData = await funilResponse.json()
            // Se a API retornar dados agrupados por coluna_funil, usar
            // Caso contrário, buscar diretamente do resumo da unidade se disponível
            if (funilData.success && funilData.grouped) {
              etapasFunil = Object.entries(funilData.grouped).map(([key, value]: [string, any]) => ({
                id: Number(key) || 0,
                nome_coluna: value.coluna_nome || value.nome_coluna || `Coluna ${key}`,
                sequencia: Number(value.sequencia) || Number(value.ordem) || 0,
                total_oportunidades: Number(value.count) || 0,
                valor_total: Number(value.valor_total) || 0
              })).sort((a, b) => a.sequencia - b.sequencia)
            }
          }
        } catch (err) {
          // Se falhar, deixar etapasFunil vazio
          console.warn('Erro ao buscar etapas do funil:', err)
        }

        // Mapear vendedores para o formato esperado
        const vendedoresStats: VendedorStats[] = vendedores.map((v: any) => ({
          id: v.id,
          name: v.name || '',
          lastName: v.lastName || '',
          oportunidades_criadas: Number(v.oportunidades_criadas) || 0,
          oportunidades_ganhas: Number(v.oportunidades_ganhas) || 0,
          valor_ganho: Number(v.valor_ganho) || 0,
          oportunidades_perdidas: Number(v.oportunidades_perdidas) || 0,
          oportunidades_abertas: Number(v.oportunidades_abertas) || 0,
          meta: Number(v.meta) || 0
        }))

        setStats({
          total_vendedores: totalVendedores,
          oportunidades_criadas: oportunidadesCriadas,
          oportunidades_ganhas: oportunidadesGanhas,
          valor_ganho: valorGanho,
          oportunidades_perdidas: oportunidadesPerdidas,
          oportunidades_abertas: oportunidadesAbertas,
          vendedores: vendedoresStats,
          meta_total: metaTotal,
          etapas_funil: etapasFunil
        })
        setError("")
      } else {
        setError(resumoData.message || 'Erro ao carregar estatísticas')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [unidadeSelecionada, funilSelecionado, getPeriodoDatas])

  // Carregar unidades na montagem
  useEffect(() => {
    fetchUnidades()
  }, [fetchUnidades])

  // Carregar stats quando unidade ou período mudar
  useEffect(() => {
    if (unidadeSelecionada) {
      fetchStats()
    }
  }, [unidadeSelecionada, fetchStats])

  return {
    unidades,
    unidadeSelecionada,
    setUnidadeSelecionada,
    stats,
    loading,
    error,
    periodoFiltro,
    setPeriodoFiltro,
    dataInicioPersonalizada,
    setDataInicioPersonalizada,
    dataFimPersonalizada,
    setDataFimPersonalizada,
    funilSelecionado,
    setFunilSelecionado,
    getPeriodoDatas,
    fetchStats
  }
}

