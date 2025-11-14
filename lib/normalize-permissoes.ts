/**
 * Normaliza permissões de diferentes formatos para um array de strings
 * Aceita: array, string JSON, string CSV, objeto com campo valor/permissoes
 * Retorna: array de strings limpo
 */
export function normalizePermissoes(raw: unknown): string[] {
  // nada? devolve vazio
  if (raw == null) return []

  // já é array? mapeia para string + trim
  if (Array.isArray(raw)) {
    return raw.map(String).map(s => s.trim()).filter(Boolean)
  }

  // veio como string? tenta JSON primeiro; se falhar, faz split
  if (typeof raw === 'string') {
    const s = raw.trim()
    if (!s) return []
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(x => x.trim()).filter(Boolean)
      }
    } catch {
      // não era JSON válido — tenta CSV simples
      return s
        .replace(/^\[|\]$/g, '')          // remove colchetes soltos
        .split(',')                        // separa por vírgula
        .map(x => x.replace(/^"|"$/g, '')) // tira aspas
        .map(x => x.trim())
        .filter(Boolean)
    }
  }

  // veio como objeto com chaves conhecidas?
  if (typeof raw === 'object' && raw) {
    const obj = raw as Record<string, unknown>
    if (Array.isArray(obj.valor)) {
      return obj.valor.map(String).map(s => s.trim()).filter(Boolean)
    }
    if (Array.isArray(obj.permissoes)) {
      return obj.permissoes.map(String).map(s => s.trim()).filter(Boolean)
    }
  }

  // fallback seguro
  return []
}

/**
 * Parseia permissões vindas do banco de dados
 * O banco pode retornar JSON nativo ou string
 */
export function parsePermissoesFromDB(dbValue: unknown): string[] {
  if (!dbValue) return []
  
  // Se já é array (MySQL pode retornar JSON como objeto)
  if (Array.isArray(dbValue)) {
    return dbValue.map(String).map(s => s.trim()).filter(Boolean)
  }
  
  // Se é string, tenta parsear como JSON
  if (typeof dbValue === 'string') {
    const s = dbValue.trim()
    if (!s) return []
    try {
      const parsed = JSON.parse(s)
      if (Array.isArray(parsed)) {
        return parsed.map(String).map(s => s.trim()).filter(Boolean)
      }
    } catch {
      return []
    }
  }
  
  return []
}

