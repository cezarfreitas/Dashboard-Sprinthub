"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UserCog, Loader2, AlertCircle } from "lucide-react"
import { HeaderGestor } from "@/components/header_gestor"
import { ConsultorPeriodoFilter } from "@/components/consultor/ConsultorPeriodoFilter"
import { ConsultorBarraProgressoMeta } from "@/components/consultor/ConsultorBarraProgressoMeta"
import { ConsultorOportunidadesDiarias } from "@/components/consultor/ConsultorOportunidadesDiarias"
import { ConsultorMatrizMotivosPerda } from "@/components/consultor/ConsultorMatrizMotivosPerda"
import { ConsultorFunilEtapas } from "@/components/consultor/ConsultorFunilEtapas"

interface Consultor {
  id: number
  name: string
  lastName: string
  username: string
  email: string
  unidade_id: number
  unidade_nome: string
}

interface GestorData {
  id: number
  name: string
  lastName: string
  email: string
  unidades: Array<{
    id: number
    nome: string
    dpto_gestao: number | null
  }>
}

type PeriodoFiltro = 'hoje' | 'ontem' | 'esta-semana' | 'semana-passada' | 'este-mes' | 'mes-passado' | 'personalizado'

export default function GestorConsultoresPage() {
  const router = useRouter()
  const [gestor, setGestor] = useState<GestorData | null>(null)
  const [consultores, setConsultores] = useState<Consultor[]>([])
  const [selectedConsultor, setSelectedConsultor] = useState<Consultor | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  
  // Estados de filtro (mesmos do useConsultorDashboard)
  const [periodoFiltro, setPeriodoFiltro] = useState<PeriodoFiltro>('este-mes')
  const [dataInicioPersonalizada, setDataInicioPersonalizada] = useState<Date | undefined>(undefined)
  const [dataFimPersonalizada, setDataFimPersonalizada] = useState<Date | undefined>(undefined)
  const [funilSelecionado, setFunilSelecionado] = useState<string | null>(null)
  const [cardsData, setCardsData] = useState<any>(null)
  const [loadingCards, setLoadingCards] = useState(false)

  // Verificar autenticação do gestor
  useEffect(() => {
    const savedGestor = localStorage.getItem('gestor')
    if (!savedGestor) {
      router.push('/gestor')
      return
    }

    try {
      const gestorData = JSON.parse(savedGestor)
      setGestor(gestorData)
      loadConsultores(gestorData.unidades.map((u: any) => u.id))
    } catch (error) {
      console.error('Erro ao carregar gestor:', error)
      router.push('/gestor')
    }
  }, [router])

  const loadConsultores = async (unidadeIds: number[]) => {
    try {
      setLoading(true)
      setError("")

      const response = await fetch(`/api/vendedores/lista?unidades=${unidadeIds.join(',')}`)
      const data = await response.json()

      if (data.success) {
        const unidades = data.unidades || []
        const vendedoresIdsSet = new Set<number>()
        const vendedoresUnidadeMap = new Map<number, { id: number, nome: string }>()
        
        unidades.forEach((unidade: any) => {
          if (unidade.vendedores && Array.isArray(unidade.vendedores)) {
            unidade.vendedores.forEach((vendedor: any) => {
              vendedoresIdsSet.add(vendedor.id)
              if (!vendedoresUnidadeMap.has(vendedor.id)) {
                vendedoresUnidadeMap.set(vendedor.id, {
                  id: unidade.id,
                  nome: unidade.nome
                })
              }
            })
          }
        })

        if (vendedoresIdsSet.size === 0) {
          setConsultores([])
          setLoading(false)
          return
        }

        const vendedoresIds = Array.from(vendedoresIdsSet)
        const vendedoresResponse = await fetch(`/api/vendedores/mysql?ids=${vendedoresIds.join(',')}`)
        const vendedoresData = await vendedoresResponse.json()

        if (vendedoresData.success) {
          const consultoresList = (vendedoresData.vendedores || []).map((v: any) => {
            const unidadeInfo = vendedoresUnidadeMap.get(v.id)
            return {
              id: v.id,
              name: v.name,
              lastName: v.lastName,
              username: v.username,
              email: v.email,
              unidade_id: unidadeInfo?.id || 0,
              unidade_nome: unidadeInfo?.nome || 'Sem unidade'
            }
          })

          setConsultores(consultoresList)
          if (consultoresList.length > 0) {
            setSelectedConsultor(consultoresList[0])
          }
        } else {
          setError('Erro ao buscar dados dos vendedores')
        }
      } else {
        setError(data.message || 'Erro ao carregar consultores')
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error)
      setError('Erro ao carregar consultores')
    } finally {
      setLoading(false)
    }
  }

  // Função getPeriodoDatas (mesma do hook)
  const getPeriodoDatas = () => {
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
  }

  // Função fetchCardsData (mesma do hook, mas usa selectedConsultor)
  const fetchCardsData = async () => {
    if (!selectedConsultor) {
      setCardsData(null)
      setLoadingCards(false)
      return
    }

    try {
      setLoadingCards(true)
      const { dataInicio, dataFim } = getPeriodoDatas()
      
      const baseParams = new URLSearchParams()
      baseParams.append('user_id', selectedConsultor.id.toString())
      
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

      // 5. Buscar GANHOS DO MÊS
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

      // 6. Buscar META
      const metaParams = new URLSearchParams()
      metaParams.append('vendedor_id', selectedConsultor.id.toString())
      metaParams.append('mes', mesMeta.toString())
      metaParams.append('ano', anoMeta.toString())
      const metaResponse = await fetch(`/api/meta/stats?${metaParams.toString()}`)
      const metaData = metaResponse.ok ? await metaResponse.json() : null
      const metaTotal = metaData?.success ? Number(metaData.data?.meta_valor) || 0 : 0

      // Processar dados
      const cards: any = {
        criadasHoje: hojeData?.data?.hoje?.criadas?.total || 0,
        valorCriadasHoje: hojeData?.data?.hoje?.criadas?.valor_total || 0,
        criadasOntem: hojeData?.data?.ontem?.criadas?.total || 0,
        valorCriadasOntem: hojeData?.data?.ontem?.criadas?.valor_total || 0,
        ganhasHoje: hojeData?.data?.hoje?.ganhas?.total || 0,
        valorGanhasHoje: hojeData?.data?.hoje?.ganhas?.valor_total || 0,
        abertasTotal: abertasData?.data?.total_abertas_geral || abertasData?.data?.total_abertas || 0,
        abertasValorTotal: abertasData?.data?.valor_abertas || 0,
        abertasCriadasNoPeriodo: abertasData?.data?.total_abertas_periodo || 0,
        abertasValorCriadasNoPeriodo: abertasData?.data?.valor_abertas_periodo || 0,
        abertasCriadasOutrosPeriodos: abertasData?.data?.total_abertas_fora_periodo || 0,
        abertasValorCriadasOutrosPeriodos: abertasData?.data?.valor_abertas_fora_periodo || 0,
        perdidasTotal: perdidasData?.data?.total_perdidas_periodo || perdidasData?.data?.total_perdidas || 0,
        perdidasCriadasDentro: perdidasData?.data?.total_perdidas_dentro_createDate || 0,
        perdidasValorCriadasDentro: perdidasData?.data?.valor_perdidas_dentro_createDate || 0,
        perdidasCriadasFora: perdidasData?.data?.total_perdidas_fora_createDate || 0,
        perdidasValorCriadasFora: perdidasData?.data?.valor_perdidas_fora_createDate || 0,
        ganhosValorTotal: ganhasData?.data?.valor_ganhas_periodo || ganhasData?.data?.valor_ganhas || 0,
        ganhosTotalOportunidades: ganhasData?.data?.total_ganhas_periodo || ganhasData?.data?.total_ganhas || 0,
        ganhosCriadasDentro: ganhasData?.data?.total_ganhas_dentro_createDate || 0,
        ganhosValorCriadasDentro: ganhasData?.data?.valor_ganhas_dentro_createDate || 0,
        ganhosCriadasFora: ganhasData?.data?.total_ganhas_fora_createDate || 0,
        ganhosValorCriadasFora: ganhasData?.data?.valor_ganhas_fora_createDate || 0,
        ganhosMeta: metaTotal,
        ganhosValorTotalMes: ganhasMesData?.data?.valor_ganhas || 0,
        taxaCriadas: ganhasData?.data?.total_criadas_periodo || 0,
        taxaGanhas: ganhasData?.data?.total_ganhas_periodo || 0,
        ticketTotalVendas: ganhasData?.data?.total_ganhas_periodo || ganhasData?.data?.total_ganhas || 0,
        ticketValorTotal: ganhasData?.data?.valor_ganhas_periodo || ganhasData?.data?.valor_ganhas || 0,
        criadasTotal: ganhasData?.data?.total_criadas_periodo || 0,
        valorCriadasTotal: ganhasData?.data?.valor_criadas_periodo || 0
      }

      setCardsData(cards)
    } catch (error) {
      console.error('Erro ao buscar dados:', error)
      setCardsData(null)
    } finally {
      setLoadingCards(false)
    }
  }

  // Atualizar dados quando filtros mudarem
  useEffect(() => {
    if (selectedConsultor) {
      fetchCardsData()
    }
  }, [selectedConsultor, periodoFiltro, dataInicioPersonalizada, dataFimPersonalizada, funilSelecionado])

  if (loading) {
    return (
      <>
        <HeaderGestor />
        <div className="flex items-center justify-center min-h-[calc(100vh-3.5rem)]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Carregando consultores...</p>
          </div>
        </div>
      </>
    )
  }

  const valorVendido = cardsData?.ganhosValorTotalMes || 0
  const meta = cardsData?.ganhosMeta || 0
  const percentualMeta = meta > 0 ? (valorVendido / meta) * 100 : 0

  return (
    <>
      <HeaderGestor />
      <div className="max-w-[1800px] w-full mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-2 sm:py-3 space-y-3 sm:space-y-4">
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                <p className="text-sm font-medium">{error}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {consultores.length === 0 && !error ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <UserCog className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum consultor encontrado nas suas unidades.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Seletor de Consultor */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
                <UserCog className="h-4 w-4" />
                Consultor:
              </span>
              {consultores.map((consultor) => (
                <button
                  key={consultor.id}
                  onClick={() => setSelectedConsultor(consultor)}
                  className={`
                    px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${selectedConsultor?.id === consultor.id
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-secondary hover:bg-secondary/80'
                    }
                  `}
                  title={consultor.unidade_nome}
                >
                  {consultor.name} {consultor.lastName}
                </button>
              ))}
            </div>

            {/* Dashboard do Consultor */}
            {selectedConsultor && getPeriodoDatas() && (
              <>
                <ConsultorPeriodoFilter
                  periodoFiltro={periodoFiltro}
                  setPeriodoFiltro={setPeriodoFiltro}
                  dataInicioPersonalizada={dataInicioPersonalizada}
                  setDataInicioPersonalizada={setDataInicioPersonalizada}
                  dataFimPersonalizada={dataFimPersonalizada}
                  setDataFimPersonalizada={setDataFimPersonalizada}
                  funilSelecionado={funilSelecionado}
                  setFunilSelecionado={setFunilSelecionado}
                  vendedorId={selectedConsultor.id}
                  onSyncComplete={fetchCardsData}
                />

                {loadingCards ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-gray-500">Carregando dados...</div>
                  </div>
                ) : (
                  <>
                    <ConsultorBarraProgressoMeta
                      valorAtual={valorVendido}
                      meta={meta}
                      vendedorId={selectedConsultor.id}
                      mes={new Date().getMonth() + 1}
                      ano={new Date().getFullYear()}
                      criadasHoje={cardsData?.criadasHoje || 0}
                      valorCriadasHoje={cardsData?.valorCriadasHoje || 0}
                      abertasTotal={cardsData?.abertasTotal || 0}
                      abertasValorTotal={cardsData?.abertasValorTotal || 0}
                      ganhosTotalOportunidades={cardsData?.ganhosTotalOportunidades || 0}
                      ganhosValorTotal={cardsData?.ganhosValorTotal || 0}
                      perdidasTotal={cardsData?.perdidasTotal || 0}
                      perdidasValorTotal={(cardsData?.perdidasValorCriadasDentro || 0) + (cardsData?.perdidasValorCriadasFora || 0)}
                      ticketMedio={cardsData?.ganhosTotalOportunidades > 0 ? (cardsData?.ganhosValorTotal || 0) / cardsData.ganhosTotalOportunidades : 0}
                    />

                    <ConsultorFunilEtapas
                      vendedorId={selectedConsultor.id}
                      dataInicio={getPeriodoDatas().dataInicio}
                      dataFim={getPeriodoDatas().dataFim}
                      funilSelecionado={funilSelecionado}
                    />

                    <ConsultorOportunidadesDiarias 
                      unidadeId={selectedConsultor.unidade_id}
                      vendedorId={selectedConsultor.id}
                      dataInicio={getPeriodoDatas().dataInicio}
                      dataFim={getPeriodoDatas().dataFim}
                      funilSelecionado={funilSelecionado}
                    />

                    <ConsultorMatrizMotivosPerda
                      unidadeId={selectedConsultor.unidade_id}
                      vendedorId={selectedConsultor.id}
                      dataInicio={getPeriodoDatas().dataInicio}
                      dataFim={getPeriodoDatas().dataFim}
                      funilSelecionado={funilSelecionado}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
