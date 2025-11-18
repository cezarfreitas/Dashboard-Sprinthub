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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const unidadeId = searchParams.get('unidade_id')
    const grupoId = searchParams.get('grupo_id')
    const funilId = searchParams.get('funil_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')

    // Priorizar data customizada se fornecida, senão usar mês/ano
    const usarDataCustomizada = dataInicio && dataFim
    
    // Usar mês e ano atual se não fornecidos e não houver data customizada
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Construir filtros para unidades
    const unidadeFiltros: string[] = ['u.ativo = 1', '(u.nome IS NOT NULL OR u.name IS NOT NULL)']
    const unidadeParams: any[] = []

    if (unidadeId) {
      unidadeFiltros.push('u.id = ?')
      unidadeParams.push(parseInt(unidadeId))
    }

    if (grupoId) {
      unidadeFiltros.push('u.grupo_id = ?')
      unidadeParams.push(parseInt(grupoId))
    }

    // Buscar todas as unidades ativas com filtros
    const unidades = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome, 
        u.users,
        u.grupo_id
      FROM unidades u
      WHERE ${unidadeFiltros.join(' AND ')}
      ORDER BY COALESCE(u.nome, u.name)
    `, unidadeParams) as any[]

    // Buscar todos os vendedores uma vez
    const todosVendedores = await executeQuery(`
      SELECT id FROM vendedores WHERE ativo = 1
    `) as any[]
    const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))

    // Preparar mapa de IDs de vendedores por unidade
    const unidadeVendedoresMap = new Map<number, number[]>()
    
    unidades.forEach(unidade => {
      const parsedUsers = parseJSON(unidade.users)
      const userIds = parsedUsers
        .map((u: any) => typeof u === 'object' ? u.id : u)
        .filter((id: any) => typeof id === 'number' && vendedoresAtivosSet.has(id))
      
      if (userIds.length > 0) {
        unidadeVendedoresMap.set(unidade.id, userIds)
      }
    })

    // Coletar todos os vendedores únicos de todas as unidades
    const todosVendedoresIds = Array.from(new Set(
      Array.from(unidadeVendedoresMap.values()).flat()
    ))

    if (todosVendedoresIds.length === 0) {
      // Sem vendedores, retornar unidades vazias
      return NextResponse.json({
        success: true,
        unidades: unidades.map(u => ({
          id: u.id,
          nome: u.nome,
          nome_exibicao: u.nome,
          oportunidades_abertas: 0,
          oportunidades_ganhas: 0,
          oportunidades_perdidas: 0,
          valor_ganho: 0
        }))
      })
    }

    // Buscar oportunidades de todos os vendedores de uma vez
    const placeholders = todosVendedoresIds.map(() => '?').join(',')
    
    // Construir filtros adicionais para oportunidades
    const oportunidadeFiltros: string[] = []
    const oportunidadeParams: any[] = []
    let joinFunil = ''

    if (funilId) {
      joinFunil = 'LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id'
      oportunidadeFiltros.push('cf.id_funil = ?')
      oportunidadeParams.push(parseInt(funilId))
    }

    const oportunidadeFiltroSQL = oportunidadeFiltros.length > 0 
      ? `AND ${oportunidadeFiltros.join(' AND ')}` 
      : ''
    
    const [abertas, ganhas, perdidas] = await Promise.all([
      // Oportunidades abertas (sem filtro de data - todas as abertas no momento)
      // Excluir oportunidades arquivadas
      executeQuery(`
        SELECT o.user, COUNT(*) as total
        FROM oportunidades o
        ${joinFunil}
        WHERE o.user IN (${placeholders})
          AND o.status IN ('open', 'aberta', 'active')
          AND (o.archived IS NULL OR o.archived = 0)
          ${oportunidadeFiltroSQL}
        GROUP BY o.user
      `, [...todosVendedoresIds, ...oportunidadeParams]) as Promise<any[]>,
      
      // Oportunidades ganhas no período especificado
      // Usar gain_date como critério principal (mais confiável que status)
      executeQuery(`
        SELECT 
          o.user,
          COUNT(*) as total,
          COALESCE(SUM(o.value), 0) as valor
        FROM oportunidades o
        ${joinFunil}
        WHERE o.user IN (${placeholders})
          AND o.gain_date IS NOT NULL
          ${usarDataCustomizada 
            ? 'AND DATE(o.gain_date) BETWEEN ? AND ?' 
            : 'AND MONTH(o.gain_date) = ? AND YEAR(o.gain_date) = ?'
          }
          ${oportunidadeFiltroSQL}
        GROUP BY o.user
      `, [
        ...todosVendedoresIds, 
        ...(usarDataCustomizada ? [dataInicio, dataFim] : [mesAtual, anoAtual]),
        ...oportunidadeParams
      ]) as Promise<any[]>,
      
      // Oportunidades perdidas no período especificado
      // Usar lost_date como critério principal (mais confiável que status)
      executeQuery(`
        SELECT o.user, COUNT(*) as total
        FROM oportunidades o
        ${joinFunil}
        WHERE o.user IN (${placeholders})
          AND o.lost_date IS NOT NULL
          ${usarDataCustomizada 
            ? 'AND DATE(o.lost_date) BETWEEN ? AND ?' 
            : 'AND MONTH(o.lost_date) = ? AND YEAR(o.lost_date) = ?'
          }
          ${oportunidadeFiltroSQL}
        GROUP BY o.user
      `, [
        ...todosVendedoresIds,
        ...(usarDataCustomizada ? [dataInicio, dataFim] : [mesAtual, anoAtual]),
        ...oportunidadeParams
      ]) as Promise<any[]>
    ])

    // Criar mapas para acesso rápido
    // Converter user para número para garantir compatibilidade
    const abertasMap = new Map<number, number>()
    abertas.forEach(o => {
      const userId = typeof o.user === 'string' ? parseInt(o.user) : Number(o.user)
      if (!isNaN(userId)) {
        const currentTotal = abertasMap.get(userId) || 0
        abertasMap.set(userId, currentTotal + Number(o.total || 0))
      }
    })

    const ganhasMap = new Map<number, { total: number; valor: number }>()
    ganhas.forEach(o => {
      const userId = typeof o.user === 'string' ? parseInt(o.user) : Number(o.user)
      if (!isNaN(userId)) {
        const current = ganhasMap.get(userId) || { total: 0, valor: 0 }
        ganhasMap.set(userId, {
          total: current.total + Number(o.total || 0),
          valor: current.valor + Number(o.valor || 0)
        })
      }
    })

    const perdidasMap = new Map<number, number>()
    perdidas.forEach(o => {
      const userId = typeof o.user === 'string' ? parseInt(o.user) : Number(o.user)
      if (!isNaN(userId)) {
        const currentTotal = perdidasMap.get(userId) || 0
        perdidasMap.set(userId, currentTotal + Number(o.total || 0))
      }
    })

    // Remover duplicatas de unidades antes de processar
    const unidadesUnicas = Array.from(
      new Map(unidades.map(u => [u.id, u])).values()
    )
    
    // Processar cada unidade
    const unidadesComOportunidades = unidadesUnicas.map(unidade => {
      const vendedoresIds = unidadeVendedoresMap.get(unidade.id) || []
      
      if (vendedoresIds.length === 0) {
        return {
          id: unidade.id,
          nome: unidade.nome,
          nome_exibicao: unidade.nome,
          grupo_id: unidade.grupo_id || null,
          oportunidades_abertas: 0,
          oportunidades_ganhas: 0,
          oportunidades_perdidas: 0,
          valor_ganho: 0
        }
      }

      // Somar estatísticas dos vendedores da unidade
      let totalAbertas = 0
      let totalGanhas = 0
      let totalPerdidas = 0
      let totalValor = 0

      vendedoresIds.forEach(vendedorId => {
        // Garantir que o vendedorId é um número
        const userId = typeof vendedorId === 'string' ? parseInt(vendedorId) : Number(vendedorId)
        if (isNaN(userId)) return

        // Somar oportunidades abertas
        const abertasCount = abertasMap.get(userId) || 0
        totalAbertas += abertasCount
        
        // Somar oportunidades ganhas
        const ganho = ganhasMap.get(userId)
        if (ganho) {
          totalGanhas += Number(ganho.total) || 0
          totalValor += Number(ganho.valor) || 0
        }
        
        // Somar oportunidades perdidas
        const perdidasCount = perdidasMap.get(userId) || 0
        totalPerdidas += perdidasCount
      })

      return {
        id: unidade.id,
        nome: unidade.nome,
        nome_exibicao: unidade.nome,
        grupo_id: unidade.grupo_id || null,
        oportunidades_abertas: Number(totalAbertas) || 0,
        oportunidades_ganhas: Number(totalGanhas) || 0,
        oportunidades_perdidas: Number(totalPerdidas) || 0,
        valor_ganho: Number(totalValor) || 0
      }
    })

    return NextResponse.json({
      success: true,
      unidades: unidadesComOportunidades
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar unidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
