/**
 * Utilitários de data para o sistema de ranking
 * Usa fuso horário de São Paulo (GMT-3)
 */

export interface PeriodoData {
  inicio: string // YYYY-MM-DD
  fim: string    // YYYY-MM-DD
}

/**
 * Obtém a data atual no fuso horário de São Paulo (GMT-3)
 */
export function getDataSaoPaulo(): Date {
  const now = new Date()
  const saoPauloOffset = -3 * 60 // -3 horas em minutos
  const localOffset = now.getTimezoneOffset()
  const diffMinutes = localOffset + saoPauloOffset
  return new Date(now.getTime() + diffMinutes * 60 * 1000)
}

/**
 * Formata uma data como YYYY-MM-DD
 */
export function formatDateISO(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Formata uma data ISO (YYYY-MM-DD) para exibição (DD/MM/YYYY)
 */
export function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

/**
 * Calcula período baseado no tipo selecionado
 * Usa fuso horário de São Paulo (GMT-3)
 */
export function calcularPeriodoPorTipo(tipo: string): PeriodoData {
  const hoje = getDataSaoPaulo()
  
  const ano = hoje.getFullYear()
  const mes = hoje.getMonth()
  const dia = hoje.getDate()
  const diaSemana = hoje.getDay()

  let inicioDate: Date
  let fimDate: Date

  switch (tipo) {
    case 'este-mes':
      inicioDate = new Date(ano, mes, 1)
      fimDate = new Date(ano, mes, dia)
      break
      
    case 'mes-passado':
      // Mês passado: do dia 1 ao último dia do mês anterior
      inicioDate = new Date(ano, mes - 1, 1)
      fimDate = new Date(ano, mes, 0) // Dia 0 do mês atual = último dia do mês anterior
      break
      
    case 'esta-semana':
      // Domingo a hoje
      inicioDate = new Date(ano, mes, dia - diaSemana)
      fimDate = new Date(ano, mes, dia)
      break
      
    case 'semana-passada': {
      // Domingo a sábado da semana passada
      const domingoPassado = dia - diaSemana - 7
      inicioDate = new Date(ano, mes, domingoPassado)
      fimDate = new Date(ano, mes, domingoPassado + 6)
      break
    }
    
    case 'este-ano':
      inicioDate = new Date(ano, 0, 1)
      fimDate = new Date(ano, mes, dia)
      break
      
    case 'ano-anterior':
      inicioDate = new Date(ano - 1, 0, 1)
      fimDate = new Date(ano - 1, 11, 31)
      break
      
    default:
      return { inicio: '', fim: '' }
  }

  return {
    inicio: formatDateISO(inicioDate),
    fim: formatDateISO(fimDate)
  }
}

/**
 * Extrai o ano de uma string de data ISO
 */
export function getAnoFromDateStr(dateStr: string | undefined | null): number {
  if (dateStr) {
    return new Date(dateStr + 'T00:00:00').getFullYear()
  }
  return new Date().getFullYear()
}

/**
 * Formata valor monetário em Real brasileiro
 * Usa Intl.NumberFormat para melhor performance e localização
 */
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0
})

export function formatCurrency(value: number | string | null | undefined): string {
  const numValue = Math.round(Number(value) || 0)
  return currencyFormatter.format(numValue)
}

/**
 * Converte data de São Paulo para UTC (para queries no banco)
 */
export function formatDateSaoPauloToUTC(dateStr: string, isEnd: boolean = false): string {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateStr
  }
  
  const [year, month, day] = dateStr.split('-').map(Number)
  const dateSP = new Date(year, month - 1, day, isEnd ? 23 : 0, isEnd ? 59 : 0, isEnd ? 59 : 0, 0)
  
  // Adicionar 3 horas para converter de São Paulo (GMT-3) para UTC (GMT+0)
  const dateUTC = new Date(dateSP.getTime() + (3 * 60 * 60 * 1000))
  
  const yearUTC = dateUTC.getFullYear()
  const monthUTC = String(dateUTC.getMonth() + 1).padStart(2, '0')
  const dayUTC = String(dateUTC.getDate()).padStart(2, '0')
  const hours = String(dateUTC.getHours()).padStart(2, '0')
  const minutes = String(dateUTC.getMinutes()).padStart(2, '0')
  const seconds = String(dateUTC.getSeconds()).padStart(2, '0')
  
  return `${yearUTC}-${monthUTC}-${dayUTC} ${hours}:${minutes}:${seconds}`
}
