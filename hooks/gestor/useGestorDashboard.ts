import { useState, useEffect, useCallback } from "react"
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
  const [exportando, setExportando] = useState(false)

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
      const csvHeaders = [
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
        csvHeaders.push(`Fields - ${key}`)
      })

      // Adicionar headers dos campos dataLead (com prefixo "DataLead - ")
      Array.from(allDataLeadKeys).sort().forEach(key => {
        csvHeaders.push(`DataLead - ${key}`)
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

      const csvRows = oportunidades.map((opp: any) => {
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

        // Criar linha base
        const row: any[] = [
          opp.id,
          `"${opp.title?.replace(/"/g, '""') || '-'}"`,
          formatarValor(opp.value || 0),
          formatarStatus(opp.status),
          formatarData(opp.createDate),
          formatarData(opp.gain_date),
          formatarData(opp.lost_date),
          (() => {
            const nome = ((opp.vendedor_nome || '') + ' ' + (opp.vendedor_sobrenome || '')).trim()
            return nome ? `"${nome}"` : '-'
          })(),
          `"${opp.unidade_nome || '-'}"`,
          opp.crm_column || '-',
          `"${opp.loss_reason || '-'}"`,
          `"${opp.gain_reason || '-'}"`,
          `"${opp.sale_channel || '-'}"`,
          `"${opp.campaign || '-'}"`
        ]

        // Adicionar valores dos campos fields
        fieldsKeysArray.forEach(key => {
          const value = fieldsObj[key]
          if (value === null || value === undefined) {
            row.push('-')
          } else if (typeof value === 'object') {
            row.push(`"${JSON.stringify(value).replace(/"/g, '""')}"`)
          } else {
            row.push(`"${String(value).replace(/"/g, '""')}"`)
          }
        })

        // Adicionar valores dos campos dataLead
        dataLeadKeysArray.forEach(key => {
          const value = dataLeadObj[key]
          if (value === null || value === undefined) {
            row.push('-')
          } else if (typeof value === 'object') {
            row.push(`"${JSON.stringify(value).replace(/"/g, '""')}"`)
          } else {
            row.push(`"${String(value).replace(/"/g, '""')}"`)
          }
        })

        return row
      })

      const csvContent = [
        csvHeaders.join(','),
        ...csvRows.map((row: any[]) => row.join(','))
      ].join('\n')

      const BOM = '\uFEFF'
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
      
      const link = document.createElement('a')
      const urlBlob = URL.createObjectURL(blob)
      
      const nomeUnidade = gestor?.unidades.find(u => u.id === unidadeSelecionada)?.nome || 'Unidade'
      const nomeArquivo = `oportunidades_${nomeUnidade.replace(/\s+/g, '_')}_${dataInicio}_${dataFim}.csv`
      
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
    getPeriodoDatas,
    fetchStats,
    handleLogout,
    exportarOportunidades,
    exportando
  }
}

