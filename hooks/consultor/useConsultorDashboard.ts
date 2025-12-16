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

      // 4. Buscar GANHAS (filtrar por data de ganho no período selecionado)
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

  const exportarOportunidades = useCallback(async () => {
    if (!consultor) {
      return
    }

    try {
      setExportando(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      // Para consultor, filtrar por user_id
      const url = `/api/consultor/exportar?user_id=${consultor.id}&dataInicio=${dataInicio}&dataFim=${dataFim}&tipo=todas`
      
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

        // Criar linha base
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
      
      const nomeVendedor = `${consultor.name}_${consultor.lastName}`.replace(/\s+/g, '_')
      const nomeArquivo = `oportunidades_${nomeVendedor}_${dataInicio}_${dataFim}.xlsx`
      
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
  }, [consultor, getPeriodoDatas])

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
    exportarOportunidades,
    cardsData,
    loadingCards,
    fetchCardsData
  }
}

