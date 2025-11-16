export interface Unidade {
  id: number
  nome?: string
  name?: string
  nome_exibicao?: string
  oportunidades_abertas: number
  oportunidades_ganhas: number
  oportunidades_perdidas: number
  valor_ganho: number
}

export interface OportunidadeRecente {
  id: number
  nome: string
  valor: number
  status: 'gain' | 'lost' | 'open'
  dataCriacao: string
  vendedor: string
  unidade: string
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

export interface CardColor {
  bg: string
  text: string
}

