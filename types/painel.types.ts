export interface PainelUnidade {
  id: number
  nome?: string
  name?: string
  nome_exibicao?: string
  grupo_id?: number | null
  oportunidades_abertas: number
  oportunidades_ganhas: number
  oportunidades_perdidas: number
  valor_aberto: number
  valor_ganho: number
  valor_perdido: number
  meta_valor: number
}

export interface PainelFiltros {
  unidadeSelecionada: string
  periodoTipo: string
  periodoInicio: string
  periodoFim: string
  funilSelecionado: string
  grupoSelecionado: string
}

// Tipos adicionais para usePainelData
export interface Unidade extends PainelUnidade {}

export interface OportunidadeRecente {
  id: number
  nome: string
  valor: number
  status: string
  dataCriacao: string
  vendedor: string
  unidade: string
  cor?: string | null
  oportunidadeId?: number
  consultadoEm?: string | null
}

export interface DadoGrafico {
  dia: number
  total_criadas?: number
  valor_total?: number
}

export interface PainelStats {
  criadasHoje: number
  criadasOntem: number
  totalCriadasMes: number
  crescimentoPercentual: number
  ganhasHoje: number
  ganhasOntem: number
  totalGanhasMes: number
  valorTotalGanhasMes: number
  crescimentoGanhasPercentual: number
  acumuladoMes: number
  acumuladoMesAnterior: number
  metaMes: number
  metaVsMesAnterior: number
  perdidasMes: number
  taxaConversao: number
  ticketMedio: number
}

export interface Filtros {
  unidadeSelecionada: string
  periodoInicio: string
  periodoFim: string
  statusOportunidade: string
}