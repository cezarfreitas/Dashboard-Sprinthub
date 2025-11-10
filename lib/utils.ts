import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formata data para o timezone de São Paulo, Brasil
 */
export function formatDateBR(
  dateString: string | Date | null, 
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return 'Nunca'
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }
  
  return new Date(dateString).toLocaleString('pt-BR', {
    ...defaultOptions,
    ...options
  })
}

/**
 * Formata apenas a data (sem hora) para o timezone de São Paulo
 */
export function formatDateOnlyBR(dateString: string | Date | null): string {
  if (!dateString) return 'Nunca'
  
  return new Date(dateString).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formata apenas a hora (sem data) para o timezone de São Paulo
 */
export function formatTimeOnlyBR(dateString: string | Date | null): string {
  if (!dateString) return 'Nunca'
  
  return new Date(dateString).toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}