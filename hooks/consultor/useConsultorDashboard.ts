import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"

export interface ConsultorData {
  id: number
  name: string
  lastName: string
  username: string
  email: string
  unidade_id: number | null
  unidade_nome: string | null
}

export type PeriodoFiltro = 'hoje' | 'ontem' | 'esta-semana' | 'semana-passada' | 'este-mes' | 'mes-passado' | 'personalizado'

export function useConsultorDashboard() {
  const router = useRouter()
  const [consultor, setConsultor] = useState<ConsultorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('este-mes')
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | undefined>(undefined)
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | undefined>(undefined)
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  const [cardsData, setCardsData] = useState<any>(null)
  const [loadingCards, setLoadingCards] = useState(false)

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

  const fetchCardsData = useCallback(async () => {
    if (!consultor) {
      setCardsData(null)
      setLoadingCards(false)
      return
    }

    try {
      setLoadingCards(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      // Construir parâmetros base - Filtrar por user_id (ID do vendedor)
      const baseParams = new URLSearchParams()
      // As APIs esperam o parâmetro 'user_id' para filtrar pelo vendedor
      baseParams.append('user_id', consultor.id.toString()) // Filtro pelo ID do vendedor
      
      if (funilSelecionado) {
        baseParams.append('funil_id', funilSelecionado)
      }

      // 1. Buscar dados de HOJE
      const hojeParams = new URLSearchParams(baseParams)
      const hojeResponse = await fetch(`/api/oportunidades/today?${hojeParams.toString()}`)
      const hojeData = hojeResponse.ok ? await hojeResponse.json() : null

      // 2. Buscar ABERTAS
      const abertasParams = new URLSearchParams(baseParams)
      abertasParams.append('status', 'open')
      abertasParams.append('created_date_start', dataInicio)
      abertasParams.append('created_date_end', dataFim)
      abertasParams.append('all', '1')
      const abertasResponse = await fetch(`/api/oportunidades/stats?${abertasParams.toString()}`)
      const abertasData = abertasResponse.ok ? await abertasResponse.json() : null

      // 3. Buscar PERDIDAS
      const perdidasParams = new URLSearchParams(baseParams)
      perdidasParams.append('status', 'lost')
      perdidasParams.append('lost_date_start', dataInicio)
      perdidasParams.append('lost_date_end', dataFim)
      perdidasParams.append('all', '1')
      const perdidasResponse = await fetch(`/api/oportunidades/stats?${perdidasParams.toString()}`)
      const perdidasData = perdidasResponse.ok ? await perdidasResponse.json() : null

      // 4. Buscar GANHAS
      const ganhasParams = new URLSearchParams(baseParams)
      ganhasParams.append('status', 'won')
      ganhasParams.append('gain_date_start', dataInicio)
      ganhasParams.append('gain_date_end', dataFim)
      ganhasParams.append('all', '1')
      const ganhasResponse = await fetch(`/api/oportunidades/stats?${ganhasParams.toString()}`)
      const ganhasData = ganhasResponse.ok ? await ganhasResponse.json() : null

      // 5. Buscar GANHOS DO MÊS (para comparação com meta)
      const hoje = new Date()
      const mesMeta = hoje.getMonth() + 1
      const anoMeta = hoje.getFullYear()
      
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
      
      const ganhasMesResponse = await fetch(`/api/oportunidades/stats?${ganhasMesParams.toString()}`)
      const ganhasMesData = ganhasMesResponse.ok ? await ganhasMesResponse.json() : null

      // 6. Buscar META do vendedor (aqui usamos vendedor_id correto)
      const metaParams = new URLSearchParams()
      metaParams.append('vendedor_id', consultor.id.toString()) // Meta é por vendedor_id na tabela metas_mensais
      metaParams.append('mes', mesMeta.toString())
      metaParams.append('ano', anoMeta.toString())
      
      const metaResponse = await fetch(`/api/meta/stats?${metaParams.toString()}`)
      const metaData = metaResponse.ok ? await metaResponse.json() : null
      
      // A API /api/meta/stats retorna a meta em data.meta_valor
      const metaTotal = metaData?.success ? Number(metaData.data?.meta_valor) || 0 : 0

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
        
        // META E GANHOS DO MÊS ATUAL
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
      setCardsData(null)
    } finally {
      setLoadingCards(false)
    }
  }, [consultor, funilSelecionado, getPeriodoDatas])

  useEffect(() => {
    fetchCardsData()
  }, [fetchCardsData])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('consultor')
    router.push('/consultor')
  }, [router])

  useEffect(() => {
    const consultorData = localStorage.getItem('consultor')
    
    if (!consultorData) {
      router.push('/consultor')
      return
    }

    try {
      const parsedConsultor = JSON.parse(consultorData)
      setConsultor(parsedConsultor)
      setLoading(false)
    } catch {
      router.push('/consultor')
    }
  }, [router])

  return {
    consultor,
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
    handleLogout,
    exportando,
    cardsData,
    loadingCards
  }
}

