// Cache simples para requisições API
interface CacheEntry {
  data: any
  timestamp: number
}

class APICache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly TTL = 5000 // 5 segundos

  generateKey(url: string): string {
    return url
  }

  get(url: string): any | null {
    const key = this.generateKey(url)
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    const now = Date.now()
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }
    
    return entry.data
  }

  set(url: string, data: any): void {
    const key = this.generateKey(url)
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
  }

  clear(): void {
    this.cache.clear()
  }

  clearByPrefix(prefix: string): void {
    const keysToDelete: string[] = []
    this.cache.forEach((_, key) => {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key)
      }
    })
    keysToDelete.forEach(key => this.cache.delete(key))
  }
}

export const apiCache = new APICache()

// Hook para fetch com cache
export async function fetchWithCache(url: string, options?: RequestInit): Promise<any> {
  // Verificar cache
  const cached = apiCache.get(url)
  if (cached) {
    console.log('📦 [CACHE HIT]', url)
    return cached
  }

  console.log('🌐 [FETCHING]', url)
  
  // Fazer requisição
  const response = await fetch(url, options)
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  
  const data = await response.json()
  
  // Armazenar em cache
  apiCache.set(url, data)
  
  return data
}




