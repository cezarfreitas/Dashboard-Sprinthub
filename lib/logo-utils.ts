/**
 * Normaliza a URL do logotipo para usar a rota API
 * Garante compatibilidade com URLs antigas (/uploads/logos/) e novas (/api/uploads/logos/)
 */
export function normalizeLogoUrl(url: string | null | undefined): string {
  if (!url) return ''
  
  // Se já é uma URL completa (http/https), retornar como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  
  // Se começa com /uploads/logos/, converter para /api/uploads/logos/
  if (url.startsWith('/uploads/logos/')) {
    return url.replace('/uploads/logos/', '/api/uploads/logos/')
  }
  
  // Se já começa com /api/uploads/logos/, retornar como está
  if (url.startsWith('/api/uploads/logos/')) {
    return url
  }
  
  // Se começa com /uploads/ mas não é logos, manter como está (outros uploads)
  if (url.startsWith('/uploads/')) {
    return url
  }
  
  // Para qualquer outro caminho relativo, retornar como está
  return url
}

