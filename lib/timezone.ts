/**
 * Timezone Utils - GMT-3 (America/Sao_Paulo)
 * 
 * Funções globais para garantir que todas as datas sejam tratadas
 * no timezone de São Paulo (GMT-3).
 */

// Timezone padrão configurável via .env
export const DEFAULT_TIMEZONE = process.env.NEXT_PUBLIC_TIMEZONE || 'America/Sao_Paulo'

/**
 * Converte uma data para o timezone de São Paulo (GMT-3)
 * @param date - Data a ser convertida (Date, string ou timestamp)
 * @returns Date ajustada para GMT-3
 */
export function toSaoPauloTime(date: Date | string | number): Date {
  const d = new Date(date)
  
  // Converte para string no timezone de São Paulo
  const saoPauloString = d.toLocaleString('en-US', {
    timeZone: DEFAULT_TIMEZONE
  })
  
  return new Date(saoPauloString)
}

/**
 * Formata uma data no formato brasileiro (DD/MM/YYYY)
 * @param date - Data a ser formatada
 * @returns String formatada no padrão brasileiro
 */
export function formatDateBR(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = toSaoPauloTime(date)
    
    return d.toLocaleDateString('pt-BR', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  } catch {
    return '-'
  }
}

/**
 * Formata uma data e hora no formato brasileiro (DD/MM/YYYY HH:mm:ss)
 * @param date - Data a ser formatada
 * @returns String formatada com data e hora
 */
export function formatDateTimeBR(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = toSaoPauloTime(date)
    
    return d.toLocaleString('pt-BR', {
      timeZone: DEFAULT_TIMEZONE,
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '-'
  }
}

/**
 * Formata apenas a hora no formato brasileiro (HH:mm:ss)
 * @param date - Data a ser formatada
 * @returns String formatada com apenas a hora
 */
export function formatTimeBR(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const d = toSaoPauloTime(date)
    
    return d.toLocaleTimeString('pt-BR', {
      timeZone: DEFAULT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  } catch {
    return '-'
  }
}

/**
 * Converte data para formato MySQL (YYYY-MM-DD HH:mm:ss) em GMT-3
 * @param date - Data a ser convertida
 * @returns String no formato MySQL
 */
export function toMySQLDateTime(date: Date | string | number = new Date()): string {
  const d = toSaoPauloTime(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')
  const seconds = String(d.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * Converte data para formato MySQL Date (YYYY-MM-DD) em GMT-3
 * @param date - Data a ser convertida
 * @returns String no formato MySQL Date
 */
export function toMySQLDate(date: Date | string | number = new Date()): string {
  const d = toSaoPauloTime(date)
  
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

/**
 * Retorna a data/hora atual em São Paulo
 * @returns Date atual em GMT-3
 */
export function nowSaoPaulo(): Date {
  return toSaoPauloTime(new Date())
}

/**
 * Retorna a data/hora atual no formato ISO em GMT-3
 * @returns String ISO com timezone de São Paulo
 */
export function nowSaoPauloISO(): string {
  const now = nowSaoPaulo()
  return now.toLocaleString('sv-SE', { timeZone: DEFAULT_TIMEZONE }).replace(' ', 'T')
}

/**
 * Calcula diferença em dias entre duas datas (considerando GMT-3)
 * @param date1 - Data inicial
 * @param date2 - Data final
 * @returns Número de dias de diferença
 */
export function diffDays(
  date1: Date | string | number,
  date2: Date | string | number = new Date()
): number {
  const d1 = toSaoPauloTime(date1)
  const d2 = toSaoPauloTime(date2)
  
  // Zera as horas para comparar apenas datas
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  
  const diffMs = d2.getTime() - d1.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

/**
 * Calcula diferença em horas entre duas datas (considerando GMT-3)
 * @param date1 - Data inicial
 * @param date2 - Data final
 * @returns Número de horas de diferença
 */
export function diffHours(
  date1: Date | string | number,
  date2: Date | string | number = new Date()
): number {
  const d1 = toSaoPauloTime(date1)
  const d2 = toSaoPauloTime(date2)
  
  const diffMs = d2.getTime() - d1.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60))
}

/**
 * Retorna início do dia em GMT-3
 * @param date - Data de referência
 * @returns Date com horário 00:00:00 em GMT-3
 */
export function startOfDay(date: Date | string | number = new Date()): Date {
  const d = toSaoPauloTime(date)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Retorna fim do dia em GMT-3
 * @param date - Data de referência
 * @returns Date com horário 23:59:59 em GMT-3
 */
export function endOfDay(date: Date | string | number = new Date()): Date {
  const d = toSaoPauloTime(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Retorna início do mês em GMT-3
 * @param date - Data de referência
 * @returns Date com primeiro dia do mês às 00:00:00 em GMT-3
 */
export function startOfMonth(date: Date | string | number = new Date()): Date {
  const d = toSaoPauloTime(date)
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Retorna fim do mês em GMT-3
 * @param date - Data de referência
 * @returns Date com último dia do mês às 23:59:59 em GMT-3
 */
export function endOfMonth(date: Date | string | number = new Date()): Date {
  const d = toSaoPauloTime(date)
  d.setMonth(d.getMonth() + 1)
  d.setDate(0)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Adiciona dias a uma data (considerando GMT-3)
 * @param date - Data base
 * @param days - Número de dias a adicionar (negativo para subtrair)
 * @returns Nova data com dias adicionados
 */
export function addDays(date: Date | string | number, days: number): Date {
  const d = toSaoPauloTime(date)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * Adiciona meses a uma data (considerando GMT-3)
 * @param date - Data base
 * @param months - Número de meses a adicionar (negativo para subtrair)
 * @returns Nova data com meses adicionados
 */
export function addMonths(date: Date | string | number, months: number): Date {
  const d = toSaoPauloTime(date)
  d.setMonth(d.getMonth() + months)
  return d
}

/**
 * Verifica se uma data é hoje (considerando GMT-3)
 * @param date - Data a verificar
 * @returns true se for hoje
 */
export function isToday(date: Date | string | number): boolean {
  const d = toSaoPauloTime(date)
  const today = nowSaoPaulo()
  
  return d.getDate() === today.getDate() &&
         d.getMonth() === today.getMonth() &&
         d.getFullYear() === today.getFullYear()
}

/**
 * Formata período de tempo de forma humanizada
 * @param date - Data inicial
 * @returns String formatada (ex: "2 dias", "3 meses", "1 ano")
 */
export function formatTimePeriod(date: Date | string | number | null | undefined): string {
  if (!date) return '-'
  
  try {
    const days = diffDays(date, new Date())
    
    if (days < 0) return '0 dias'
    if (days === 0) return 'Hoje'
    if (days === 1) return '1 dia'
    if (days < 30) return `${days} dias`
    
    const months = Math.floor(days / 30)
    if (months === 1) return '1 mês'
    if (months < 12) return `${months} meses`
    
    const years = Math.floor(months / 12)
    return years === 1 ? '1 ano' : `${years} anos`
  } catch {
    return '-'
  }
}

/**
 * Parseia string de data no formato brasileiro (DD/MM/YYYY) para Date
 * @param dateStr - String no formato DD/MM/YYYY
 * @returns Date parseada em GMT-3
 */
export function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null
  
  try {
    const parts = dateStr.split('/')
    if (parts.length !== 3) return null
    
    const day = parseInt(parts[0], 10)
    const month = parseInt(parts[1], 10) - 1 // Month é 0-indexed
    const year = parseInt(parts[2], 10)
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) return null
    
    // Criar data em GMT-3
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00`
    return toSaoPauloTime(dateString)
  } catch {
    return null
  }
}

