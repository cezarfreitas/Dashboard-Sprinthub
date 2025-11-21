import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parsear JSON com segurança
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// Função para extrair IDs de vendedores de uma unidade
function extractUserIds(users: any): number[] {
  const parsedUsers = parseJSON(users)
  const userIds: number[] = []
  
  parsedUsers.forEach((u: any) => {
    let id: any = null
    
    if (typeof u === 'object' && u !== null) {
      id = u.id || u.user_id || u.vendedor_id
    } else if (typeof u === 'number') {
      id = u
    } else if (typeof u === 'string') {
      const parsed = parseInt(u.trim())
      if (!isNaN(parsed)) id = parsed
    }
    
    if (id != null && !isNaN(Number(id))) {
      userIds.push(Number(id))
    }
  })
  
  return userIds
}

// GET - Buscar resumo de oportunidades por unidade
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const dateStart = searchParams.get('date_start') || searchParams.get('createDate_start') // formato: YYYY-MM-DD (suporta ambos para compatibilidade)
    const dateEnd = searchParams.get('date_end') || searchParams.get('createDate_end') // formato: YYYY-MM-DD (suporta ambos para compatibilidade)
    const unidadeIdParam = searchParams.get('unidade_id') // Filtrar por unidade(s) específica(s)
    const grupoIdParam = searchParams.get('grupo_id') // Filtrar por grupo(s) de unidades
    const funilIdParam = searchParams.get('funil_id') // Filtrar por funil(is)
    
    // Buscar todas as unidades ativas
    let queryUnidades = `
      SELECT 
        id, 
        COALESCE(nome, name) as nome, 
        users,
        grupo_id
      FROM unidades 
      WHERE ativo = 1
    `
    const paramsUnidades: any[] = []
    
    // Se filtrar por unidade específica
    if (unidadeIdParam) {
      const unidadeIds = unidadeIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      
      if (unidadeIds.length > 0) {
        const placeholders = unidadeIds.map(() => '?').join(',')
        queryUnidades += ` AND id IN (${placeholders})`
        paramsUnidades.push(...unidadeIds)
      }
    }
    
    // Se filtrar por grupo
    if (grupoIdParam && grupoIdParam !== 'todos' && grupoIdParam !== 'undefined') {
      const grupoIds = grupoIdParam
        .split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id) && id > 0)
      
      if (grupoIds.length > 0) {
        const placeholders = grupoIds.map(() => '?').join(',')
        queryUnidades += ` AND grupo_id IN (${placeholders})`
        paramsUnidades.push(...grupoIds)
      }
    }
    
    queryUnidades += ' ORDER BY nome'
    
    const unidades = await executeQuery(queryUnidades, paramsUnidades) as any[]
    
    // Buscar todos os vendedores ativos uma vez
    const todosVendedoresAtivos = await executeQuery(
      'SELECT id FROM vendedores WHERE ativo = 1'
    ) as any[]
    const vendedoresAtivosSet = new Set(todosVendedoresAtivos.map(v => v.id))
    
    // Processar cada unidade
    const unidadesComResumo = await Promise.all(unidades.map(async (unidade) => {
      // Extrair IDs de vendedores da unidade
      const userIds = extractUserIds(unidade.users)
      
      // Filtrar apenas vendedores ativos
      const vendedoresAtivosIds = userIds.filter(id => vendedoresAtivosSet.has(id))
      
      if (vendedoresAtivosIds.length === 0) {
        // Unidade sem vendedores ativos
        return {
          unidade_id: unidade.id,
          unidade_nome: unidade.nome,
          abertas: {
            quantidade: 0,
            valor: 0
          },
          ganhas: {
            quantidade: 0,
            valor: 0
          },
          perdidas: {
            quantidade: 0,
            valor: 0
          },
          meta: {
            valor: 0
          },
          atingido: {
            percentual: 0,
            valor: 0
          }
        }
      }
      
      const placeholders = vendedoresAtivosIds.map(() => '?').join(',')
      const baseWhere = `o.archived = 0 AND CAST(o.user AS UNSIGNED) IN (${placeholders})`
      
      // Construir filtro de funil (se fornecido)
      let funilIds: number[] = []
      let funilFilter = ''
      if (funilIdParam && funilIdParam !== 'todos' && funilIdParam !== 'undefined') {
        funilIds = funilIdParam
          .split(',')
          .map(id => parseInt(id.trim()))
          .filter(id => !isNaN(id) && id > 0)
        
        if (funilIds.length > 0) {
          const funilPlaceholders = funilIds.map(() => '?').join(',')
          funilFilter = `AND EXISTS (
            SELECT 1 FROM colunas_funil cf 
            WHERE cf.id = o.coluna_funil_id 
            AND cf.id_funil IN (${funilPlaceholders})
          )`
        }
      }
      
      // Query para oportunidades ABERTAS (status='open' - SEM filtro de createDate, pois são todas as abertas)
      const queryAbertas = `
        SELECT 
          COUNT(*) as quantidade,
          COALESCE(SUM(o.value), 0) as valor
        FROM oportunidades o
        WHERE ${baseWhere}
          AND o.status = 'open'
          AND o.gain_date IS NULL 
          AND o.lost_date IS NULL
          ${funilFilter}
      `
      const paramsAbertas: (string | number)[] = [...vendedoresAtivosIds, ...funilIds]
      
      // Query para oportunidades GANHAS (filtradas por gain_date no período, se fornecido)
      let queryGanhas = `
        SELECT 
          COUNT(*) as quantidade,
          COALESCE(SUM(o.value), 0) as valor
        FROM oportunidades o
        WHERE ${baseWhere}
          AND o.gain_date IS NOT NULL
          ${funilFilter}
      `
      let paramsGanhas: (string | number)[] = [...vendedoresAtivosIds, ...funilIds]
      if (dateStart && dateEnd) {
        // Filtrar por gain_date (quando foi ganha) no período
        queryGanhas += ` AND o.gain_date >= ? AND o.gain_date <= ?`
        paramsGanhas.push(dateStart + ' 00:00:00', dateEnd + ' 23:59:59')
      }
      
      // Query para oportunidades PERDIDAS (filtradas por lost_date no período, se fornecido)
      let queryPerdidas = `
        SELECT 
          COUNT(*) as quantidade,
          COALESCE(SUM(o.value), 0) as valor
        FROM oportunidades o
        WHERE ${baseWhere}
          AND o.lost_date IS NOT NULL
          ${funilFilter}
      `
      let paramsPerdidas: (string | number)[] = [...vendedoresAtivosIds, ...funilIds]
      if (dateStart && dateEnd) {
        // Filtrar por lost_date (quando foi perdida) no período
        queryPerdidas += ` AND o.lost_date >= ? AND o.lost_date <= ?`
        paramsPerdidas.push(dateStart + ' 00:00:00', dateEnd + ' 23:59:59')
      }
      
      // Executar queries em paralelo
      const [resultAbertas, resultGanhas, resultPerdidas] = await Promise.all([
        executeQuery(queryAbertas, paramsAbertas) as Promise<any[]>,
        executeQuery(queryGanhas, paramsGanhas) as Promise<any[]>,
        executeQuery(queryPerdidas, paramsPerdidas) as Promise<any[]>
      ])
      
      const abertas = {
        quantidade: Number(resultAbertas[0]?.quantidade || 0),
        valor: Number(resultAbertas[0]?.valor || 0)
      }
      
      const ganhas = {
        quantidade: Number(resultGanhas[0]?.quantidade || 0),
        valor: Number(resultGanhas[0]?.valor || 0)
      }
      
      const perdidas = {
        quantidade: Number(resultPerdidas[0]?.quantidade || 0),
        valor: Number(resultPerdidas[0]?.valor || 0)
      }
      
      // Buscar meta do mês (se houver filtro de data, usar mês/ano da data inicial)
      let mesMeta = null
      let anoMeta = null
      if (dateStart) {
        const dataInicioObj = new Date(dateStart + 'T00:00:00')
        mesMeta = dataInicioObj.getMonth() + 1
        anoMeta = dataInicioObj.getFullYear()
      } else {
        const hoje = new Date()
        mesMeta = hoje.getMonth() + 1
        anoMeta = hoje.getFullYear()
      }
      
      // Buscar meta da unidade para o mês/ano
      const queryMeta = `
        SELECT COALESCE(SUM(meta_valor), 0) as meta_total
        FROM metas_mensais
        WHERE unidade_id = ? 
          AND mes = ? 
          AND ano = ?
          AND status = 'ativa'
      `
      const resultMeta = await executeQuery(queryMeta, [unidade.id, mesMeta, anoMeta]) as any[]
      const metaValor = Number(resultMeta[0]?.meta_total || 0)
      
      // Calcular percentual atingido
      const valorAtingido = ganhas.valor
      const percentualAtingido = metaValor > 0 
        ? Number(((valorAtingido / metaValor) * 100).toFixed(2))
        : 0
      
      return {
        unidade_id: unidade.id,
        unidade_nome: unidade.nome,
        abertas,
        ganhas,
        perdidas,
        meta: {
          valor: metaValor
        },
        atingido: {
          percentual: percentualAtingido,
          valor: valorAtingido
        }
      }
    }))
    
    return NextResponse.json({
      success: true,
      periodo: dateStart && dateEnd ? {
        data_inicio: dateStart,
        data_fim: dateEnd
      } : null,
      filtros: {
        ...(unidadeIdParam ? { unidade_id: unidadeIdParam } : {}),
        ...(grupoIdParam && grupoIdParam !== 'todos' ? { grupo_id: grupoIdParam } : {}),
        ...(funilIdParam && funilIdParam !== 'todos' ? { funil_id: funilIdParam } : {})
      },
      unidades: unidadesComResumo
    })
    
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar resumo de oportunidades por unidade',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

