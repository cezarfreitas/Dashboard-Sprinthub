export interface PainelUnidade {
  id: number
  nome?: string
  name?: string
  nome_exibicao?: string
  grupo_id?: number | null
  oportunidades_abertas: number
  oportunidades_ganhas: number
  oportunidades_perdidas: number
  valor_ganho: number
}

export interface PainelFiltros {
  unidadeSelecionada: string
  periodoTipo: string
  periodoInicio: string
  periodoFim: string
  funilSelecionado: string
  grupoSelecionado: string
}
