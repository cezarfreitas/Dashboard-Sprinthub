import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

export interface GestorData {
  id: number
  name: string
  lastName: string
  email: string
  unidades: Array<{
    id: number
    nome: string
    dpto_gestao: number | null
  }>
  unidade_principal: {
    id: number
    nome: string
    dpto_gestao: number | null
  }
}

export interface VendedorStats {
  id: number
  name: string
  lastName: string
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  meta: number
}

export interface UnidadeResumo {
  meta: number
  realizado: number
  criadas: number
  criadas_periodo_anterior: number
  abertas_atual: number
  abertas_anterior: number
  ganhas_atual: number
  ganhas_anterior: number
  perdidas_atual: number
  perdidas_anterior: number
  percentual_vs_mes_anterior: number
  vendedores: VendedorStats[]
}

export interface GestorStats {
  total_vendedores: number
  oportunidades_criadas: number
  oportunidades_ganhas: number
  valor_ganho: number
  oportunidades_perdidas: number
  oportunidades_abertas: number
  vendedores: VendedorStats[]
  meta_total: number
  etapas_funil: Array<{
    id: number
    nome_coluna: string
    sequencia: number
    total_oportunidades: number
    valor_total: number
  }>
}

export type PeriodoFiltro = 'hoje' | 'ontem' | 'esta-semana' | 'semana-passada' | 'este-mes' | 'mes-passado' | 'personalizado'

export function useGestorDashboard() {
  const router = useRouter()
  const [gestor, setGestor] = useState<GestorData | null>(null)
  const [unidadeSelecionada, setUnidadeSelecionada] = useState<number | null>(null)
  const [stats, setStats] = useState<GestorStats | null>(null)
  const [unidadeResumo, setUnidadeResumo] = useState<UnidadeResumo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('este-mes')
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | undefined>(undefined)
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | undefined>(undefined)
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [cardsData, setCardsData] = useState<any>(null)
  const [loadingCards, setLoadingCards] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

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

  const fetchStats = useCallback(async () => {
    if (!gestor || unidadeSelecionada == null) {
      return
    }

    try {
      setLoading(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      // Buscar stats do gestor e resumo da unidade em paralelo
      const [statsResponse, resumoResponse] = await Promise.all([
        fetch(`/api/gestor/stats?gestorId=${gestor.id}&unidadeId=${unidadeSelecionada}&dataInicio=${dataInicio}&dataFim=${dataFim}`),
        fetch(`/api/unidades/resumo?unidadeId=${unidadeSelecionada}&dataInicio=${dataInicio}&dataFim=${dataFim}`)
      ])

      if (!statsResponse.ok) {
        throw new Error(`Erro HTTP: ${statsResponse.status}`)
      }

      const data = await statsResponse.json()

      if (data.success) {
        setStats(data.stats)
        setError("")
      } else {
        setError(data.message || 'Erro ao carregar estatísticas')
      }
      
      // Processar dados do resumo da unidade
      if (resumoResponse.ok) {
        const resumoData = await resumoResponse.json()
        if (resumoData.success && resumoData.unidades && resumoData.unidades.length > 0) {
          const unidade = resumoData.unidades[0]
          setUnidadeResumo({
            meta: Number(unidade.meta) || 0,
            realizado: Number(unidade.realizado) || 0,
            criadas: Number(unidade.criadas) || 0,
            criadas_periodo_anterior: Number(unidade.criadas_periodo_anterior) || 0,
            abertas_atual: Number(unidade.abertas_atual) || 0,
            abertas_anterior: Number(unidade.abertas_anterior) || 0,
            ganhas_atual: Number(unidade.ganhas_atual) || 0,
            ganhas_anterior: Number(unidade.ganhas_anterior) || 0,
            perdidas_atual: Number(unidade.perdidas_atual) || 0,
            perdidas_anterior: Number(unidade.perdidas_anterior) || 0,
            percentual_vs_mes_anterior: Number(unidade.percentual_vs_mes_anterior) || 0,
            vendedores: unidade.vendedores || []
          })
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro de conexão')
    } finally {
      setLoading(false)
    }
  }, [gestor, unidadeSelecionada, getPeriodoDatas])

  const fetchCardsData = useCallback(async (signal?: AbortSignal) => {
    if (!unidadeSelecionada) {
      setCardsData(null)
      return
    }

    try {
      setLoadingCards(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      // Construir parâmetros base
      const baseParams = new URLSearchParams()
      baseParams.append('unidade_id', unidadeSelecionada.toString())
      
      if (funilSelecionado) {
        baseParams.append('funil_id', funilSelecionado)
      }

      // Determinar mês/ano para meta baseado no período selecionado
      let mesMeta: number
      let anoMeta: number
      
      if (periodoFiltro === 'mes-passado') {
        const hoje = new Date()
        if (hoje.getMonth() === 0) {
          mesMeta = 12
          anoMeta = hoje.getFullYear() - 1
        } else {
          mesMeta = hoje.getMonth()
          anoMeta = hoje.getFullYear()
        }
      } else if (periodoFiltro === 'personalizado' && dataInicioPersonalizada) {
        const dataInicioDate = new Date(dataInicioPersonalizada)
        mesMeta = dataInicioDate.getMonth() + 1
        anoMeta = dataInicioDate.getFullYear()
      } else {
        const hoje = new Date()
        mesMeta = hoje.getMonth() + 1
        anoMeta = hoje.getFullYear()
      }

      // Preparar parâmetros para todas as chamadas
      const hojeParams = new URLSearchParams(baseParams)

      const abertasParams = new URLSearchParams(baseParams)
      abertasParams.append('status', 'open')
      abertasParams.append('created_date_start', dataInicio)
      abertasParams.append('created_date_end', dataFim)
      abertasParams.append('all', '1')

      const perdidasParams = new URLSearchParams(baseParams)
      perdidasParams.append('status', 'lost')
      perdidasParams.append('lost_date_start', dataInicio)
      perdidasParams.append('lost_date_end', dataFim)
      perdidasParams.append('all', '1')

      const ganhasParams = new URLSearchParams(baseParams)
      ganhasParams.append('status', 'won')
      ganhasParams.append('gain_date_start', dataInicio)
      ganhasParams.append('gain_date_end', dataFim)
      ganhasParams.append('all', '1')

      const metaStatsParams = new URLSearchParams()
      metaStatsParams.append('unidade_id', unidadeSelecionada.toString())
      metaStatsParams.append('mes', mesMeta.toString())
      metaStatsParams.append('ano', anoMeta.toString())

      const primeiroDiaMes = new Date(anoMeta, mesMeta - 1, 1)
      const ultimoDiaMes = new Date(anoMeta, mesMeta, 0)
      const formatarData = (data: Date) => {
        const ano = data.getFullYear()
        const mes = String(data.getMonth() + 1).padStart(2, '0')
        const dia = String(data.getDate()).padStart(2, '0')
        return `${ano}-${mes}-${dia}`
      }
      const dataInicioMes = formatarData(primeiroDiaMes)
      const dataFimMes = formatarData(ultimoDiaMes)

      const ganhasMesParams = new URLSearchParams(baseParams)
      ganhasMesParams.append('status', 'won')
      ganhasMesParams.append('gain_date_start', dataInicioMes)
      ganhasMesParams.append('gain_date_end', dataFimMes)

      // OTIMIZAÇÃO: Executar TODAS as chamadas em paralelo com Promise.all + AbortController
      const [
        hojeResponse,
        abertasResponse,
        perdidasResponse,
        ganhasResponse,
        metaStatsResponse,
        ganhasMesResponse
      ] = await Promise.all([
        fetch(`/api/oportunidades/today?${hojeParams.toString()}`, { signal }),
        fetch(`/api/oportunidades/stats?${abertasParams.toString()}`, { signal }),
        fetch(`/api/oportunidades/stats?${perdidasParams.toString()}`, { signal }),
        fetch(`/api/oportunidades/stats?${ganhasParams.toString()}`, { signal }),
        fetch(`/api/meta/stats?${metaStatsParams.toString()}`, { signal }),
        fetch(`/api/oportunidades/stats?${ganhasMesParams.toString()}`, { signal })
      ])

      // Processar respostas em paralelo
      const [hojeData, abertasData, perdidasData, ganhasData, metaStatsData, ganhasMesData] = await Promise.all([
        hojeResponse.ok ? hojeResponse.json() : null,
        abertasResponse.ok ? abertasResponse.json() : null,
        perdidasResponse.ok ? perdidasResponse.json() : null,
        ganhasResponse.ok ? ganhasResponse.json() : null,
        metaStatsResponse.ok ? metaStatsResponse.json() : null,
        ganhasMesResponse.ok ? ganhasMesResponse.json() : null
      ])

      // Extrair meta total da unidade
      const metaTotal = metaStatsData?.success && metaStatsData?.estatisticas
        ? Number(metaStatsData.estatisticas.meta_total) || 0
        : 0

      // Processar dados
      const cards: any = {
        // HOJE
        criadasHoje: hojeData?.data?.hoje?.criadas?.total || 0,
        valorCriadasHoje: hojeData?.data?.hoje?.criadas?.valor_total || 0,
        criadasOntem: hojeData?.data?.ontem?.criadas?.total || 0,
        valorCriadasOntem: hojeData?.data?.ontem?.criadas?.valor_total || 0,
        ganhasHoje: hojeData?.data?.hoje?.ganhas?.total || 0,
        valorGanhasHoje: hojeData?.data?.hoje?.ganhas?.valor_total || 0,
        
        // ABERTAS
        abertasTotal: abertasData?.data?.total_abertas_geral || abertasData?.data?.total_abertas || 0,
        abertasValorTotal: abertasData?.data?.valor_abertas || 0,
        abertasCriadasNoPeriodo: abertasData?.data?.total_abertas_periodo || 0,
        abertasValorCriadasNoPeriodo: abertasData?.data?.valor_abertas_periodo || 0,
        abertasCriadasOutrosPeriodos: abertasData?.data?.total_abertas_fora_periodo || 0,
        abertasValorCriadasOutrosPeriodos: abertasData?.data?.valor_abertas_fora_periodo || 0,
        
        // PERDIDAS
        perdidasTotal: perdidasData?.data?.total_perdidas_periodo || perdidasData?.data?.total_perdidas || 0,
        perdidasCriadasDentro: perdidasData?.data?.total_perdidas_dentro_createDate || 0,
        perdidasValorCriadasDentro: perdidasData?.data?.valor_perdidas_dentro_createDate || 0,
        perdidasCriadasFora: perdidasData?.data?.total_perdidas_fora_createDate || 0,
        perdidasValorCriadasFora: perdidasData?.data?.valor_perdidas_fora_createDate || 0,
        
        // GANHAS (do período selecionado)
        ganhosValorTotal: ganhasData?.data?.valor_ganhas_periodo || ganhasData?.data?.valor_ganhas || 0,
        ganhosTotalOportunidades: ganhasData?.data?.total_ganhas_periodo || ganhasData?.data?.total_ganhas || 0,
        ganhosCriadasDentro: ganhasData?.data?.total_ganhas_dentro_createDate || 0,
        ganhosValorCriadasDentro: ganhasData?.data?.valor_ganhas_dentro_createDate || 0,
        ganhosCriadasFora: ganhasData?.data?.total_ganhas_fora_createDate || 0,
        ganhosValorCriadasFora: ganhasData?.data?.valor_ganhas_fora_createDate || 0,
        
        // META E GANHOS DO MÊS ATUAL (para barra de progresso)
        ganhosMeta: metaTotal,
        ganhosValorTotalMes: ganhasMesData?.data?.valor_ganhas || 0,
        
        // TAXA DE CONVERSÃO
        taxaCriadas: ganhasData?.data?.total_criadas_periodo || 0,
        taxaGanhas: ganhasData?.data?.total_ganhas_periodo || 0,
        
        // TICKET MÉDIO
        ticketTotalVendas: ganhasData?.data?.total_ganhas_periodo || ganhasData?.data?.total_ganhas || 0,
        ticketValorTotal: ganhasData?.data?.valor_ganhas_periodo || ganhasData?.data?.valor_ganhas || 0
      }

      setCardsData(cards)
    } catch (error) {
      // Ignorar erros de abort (esperados quando componente desmonta ou filtros mudam)
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }
      setCardsData(null)
    } finally {
      setLoadingCards(false)
    }
  }, [unidadeSelecionada, funilSelecionado, getPeriodoDatas, periodoFiltro, dataInicioPersonalizada])

  useEffect(() => {
    // Cancelar requisição anterior se houver
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    // Criar novo AbortController
    abortControllerRef.current = new AbortController()
    
    fetchCardsData(abortControllerRef.current.signal)
    
    // Cleanup: cancelar requisição ao desmontar ou quando deps mudarem
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [fetchCardsData])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('gestor')
    router.push('/gestor')
  }, [router])

  const exportarOportunidades = useCallback(async () => {
    if (!unidadeSelecionada) {
      return
    }

    try {
      setExportando(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      const url = `/api/oportunidades/exportar?unidade_id=${unidadeSelecionada}&dataInicio=${dataInicio}&dataFim=${dataFim}&tipo=todas`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Erro ao exportar oportunidades')
      }

      const result = await response.json()
      
      if (!result.success || !result.data) {
        throw new Error(result.message || 'Erro ao exportar oportunidades')
      }

      const oportunidades = result.data
      
      if (oportunidades.length === 0) {
        alert('Nenhuma oportunidade encontrada para o período selecionado.')
        return
      }

      // Processar campos JSON (fields e dataLead) para extrair todas as chaves
      const allFieldsKeys = new Set<string>()
      const allDataLeadKeys = new Set<string>()
      
      oportunidades.forEach((opp: any) => {
        // Processar fields
        if (opp.fields) {
          try {
            const fields = typeof opp.fields === 'string' ? JSON.parse(opp.fields) : opp.fields
            if (fields && typeof fields === 'object') {
              Object.keys(fields).forEach(key => allFieldsKeys.add(key))
            }
          } catch (e) {
            // Ignorar erro ao parsear
          }
        }
        
        // Processar dataLead
        if (opp.dataLead) {
          try {
            const dataLead = typeof opp.dataLead === 'string' ? JSON.parse(opp.dataLead) : opp.dataLead
            if (dataLead && typeof dataLead === 'object') {
              Object.keys(dataLead).forEach(key => allDataLeadKeys.add(key))
            }
          } catch (e) {
            // Ignorar erro ao parsear
          }
        }
      })

      // Criar headers base
      const excelHeaders = [
        'ID',
        'Título',
        'Valor',
        'Status',
        'Data Criação',
        'Data Ganho',
        'Data Perda',
        'Vendedor',
        'Unidade',
        'Coluna CRM',
        'Motivo Perda',
        'Motivo Ganho',
        'Canal Venda',
        'Campanha'
      ]

      // Adicionar headers dos campos fields (com prefixo "Fields - ")
      Array.from(allFieldsKeys).sort().forEach(key => {
        excelHeaders.push(`Fields - ${key}`)
      })

      // Adicionar headers dos campos dataLead (com prefixo "DataLead - ")
      Array.from(allDataLeadKeys).sort().forEach(key => {
        excelHeaders.push(`DataLead - ${key}`)
      })

      const formatarData = (data: string | null) => {
        if (!data) return '-'
        const d = new Date(data)
        return d.toLocaleDateString('pt-BR')
      }

      const formatarValor = (valor: number) => {
        return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }

      const formatarStatus = (status: string) => {
        const statusMap: Record<string, string> = {
          'open': 'Aberta',
          'gain': 'Ganha',
          'lost': 'Perdida'
        }
        return statusMap[status] || status
      }

      // Converter Sets para Arrays ordenados para manter consistência
      const fieldsKeysArray = Array.from(allFieldsKeys).sort()
      const dataLeadKeysArray = Array.from(allDataLeadKeys).sort()

      const excelRows = oportunidades.map((opp: any) => {
        // Parsear fields
        let fieldsObj: any = {}
        if (opp.fields) {
          try {
            fieldsObj = typeof opp.fields === 'string' ? JSON.parse(opp.fields) : opp.fields
            if (!fieldsObj || typeof fieldsObj !== 'object') {
              fieldsObj = {}
            }
          } catch (e) {
            fieldsObj = {}
          }
        }

        // Parsear dataLead
        let dataLeadObj: any = {}
        if (opp.dataLead) {
          try {
            dataLeadObj = typeof opp.dataLead === 'string' ? JSON.parse(opp.dataLead) : opp.dataLead
            if (!dataLeadObj || typeof dataLeadObj !== 'object') {
              dataLeadObj = {}
            }
          } catch (e) {
            dataLeadObj = {}
          }
        }

        // Criar linha base (sem formatação de CSV, valores diretos)
        const row: any[] = [
          opp.id,
          opp.title || '-',
          opp.value || 0, // Valor numérico para Excel
          formatarStatus(opp.status),
          formatarData(opp.createDate),
          formatarData(opp.gain_date),
          formatarData(opp.lost_date),
          (() => {
            const nome = ((opp.vendedor_nome || '') + ' ' + (opp.vendedor_sobrenome || '')).trim()
            return nome || '-'
          })(),
          opp.unidade_nome || '-',
          opp.crm_column || '-',
          opp.loss_reason || '-',
          opp.gain_reason || '-',
          opp.sale_channel || '-',
          opp.campaign || '-'
        ]

        // Adicionar valores dos campos fields
        fieldsKeysArray.forEach(key => {
          const value = fieldsObj[key]
          if (value === null || value === undefined) {
            row.push('-')
          } else if (typeof value === 'object') {
            row.push(JSON.stringify(value))
          } else {
            row.push(String(value))
          }
        })

        // Adicionar valores dos campos dataLead
        dataLeadKeysArray.forEach(key => {
          const value = dataLeadObj[key]
          if (value === null || value === undefined) {
            row.push('-')
          } else if (typeof value === 'object') {
            row.push(JSON.stringify(value))
          } else {
            row.push(String(value))
          }
        })

        return row
      })

      // Importar xlsx dinamicamente (client-side)
      const XLSX = await import('xlsx')
      
      // Preparar dados para Excel (headers + rows)
      const excelData = [
        excelHeaders,
        ...excelRows
      ]

      // Criar workbook e worksheet
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.aoa_to_sheet(excelData)
      
      // Ajustar largura das colunas
      const colWidths = excelHeaders.map((header: string, idx: number) => {
        const maxLength = Math.max(
          header.length,
          ...excelData.slice(1).map((row: any[]) => {
            const cell = row[idx]
            return cell ? String(cell).length : 0
          })
        )
        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
      })
      ws['!cols'] = colWidths
      
      // Adicionar worksheet ao workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Oportunidades')
      
      // Gerar arquivo Excel
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      
      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)
      
      const nomeUnidade = gestor?.unidades.find(u => u.id === unidadeSelecionada)?.nome || 'Unidade'
      const nomeArquivo = `oportunidades_${nomeUnidade.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.xlsx`
      
      link.setAttribute('href', urlBlob)
      link.setAttribute('download', nomeArquivo)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      
      setTimeout(() => {
        document.body.removeChild(link)
        URL.revokeObjectURL(urlBlob)
      }, 100)

    } catch (error) {
      alert(`Erro ao exportar oportunidades: ${error instanceof Error ? error.message : 'Erro desconhecido'}`)
    } finally {
      setExportando(false)
    }
  }, [unidadeSelecionada, getPeriodoDatas, gestor])

  useEffect(() => {
    const gestorData = localStorage.getItem('gestor')
    
    if (!gestorData) {
      router.push('/gestor')
      return
    }

    try {
      const parsedGestor = JSON.parse(gestorData)
      setGestor(parsedGestor)
      setUnidadeSelecionada(parsedGestor.unidade_principal.id)
    } catch {
      router.push('/gestor')
    }
  }, [router])

  useEffect(() => {
    if (gestor && unidadeSelecionada != null) {
      fetchStats()
    }
  }, [gestor, unidadeSelecionada, fetchStats])

  return {
    gestor,
    unidadeSelecionada,
    setUnidadeSelecionada,
    stats,
    unidadeResumo,
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
    fetchStats,
    handleLogout,
    exportarOportunidades,
    exportando,
    cardsData,
    loadingCards
  }
}

