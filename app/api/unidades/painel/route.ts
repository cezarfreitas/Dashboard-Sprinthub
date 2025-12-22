import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')
    const unidadeIdParam = searchParams.get('unidade_id')
    const grupoIdParam = searchParams.get('grupo_id')
    const funilIdParam = searchParams.get('funil_id')
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')

    // Filtrar valores inválidos
    const unidadeId = unidadeIdParam && unidadeIdParam !== 'undefined' && unidadeIdParam.trim() !== '' ? unidadeIdParam : null
    const grupoId = grupoIdParam && grupoIdParam !== 'undefined' && grupoIdParam.trim() !== '' ? grupoIdParam : null
    const funilId = funilIdParam && funilIdParam !== 'undefined' && funilIdParam.trim() !== '' ? funilIdParam : null

    // Priorizar data customizada se fornecida
    const usarDataCustomizada = dataInicio && dataFim
    
    // Usar mês e ano atual se não fornecidos
    const dataAtual = new Date()
    const mesAtual = mes ? parseInt(mes) : dataAtual.getMonth() + 1
    const anoAtual = ano ? parseInt(ano) : dataAtual.getFullYear()

    // Construir filtros para unidades
    const unidadeFiltros: string[] = ['u.ativo = 1', '(u.nome IS NOT NULL OR u.name IS NOT NULL)']
    const unidadeParams: any[] = []

    if (unidadeId) {
      const parsedUnidadeId = parseInt(unidadeId)
      if (!isNaN(parsedUnidadeId) && parsedUnidadeId > 0) {
        unidadeFiltros.push('u.id = ?')
        unidadeParams.push(parsedUnidadeId)
      }
    }

    if (grupoId) {
      const parsedGrupoId = parseInt(grupoId)
      if (!isNaN(parsedGrupoId) && parsedGrupoId > 0) {
        unidadeFiltros.push('u.grupo_id = ?')
        unidadeParams.push(parsedGrupoId)
      }
    }

    // Buscar unidades ativas
    const unidades = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome,
        u.grupo_id
      FROM unidades u
      WHERE ${unidadeFiltros.join(' AND ')}
      ORDER BY COALESCE(u.nome, u.name)
    `, unidadeParams) as any[]

    if (unidades.length === 0) {
      return NextResponse.json({
        success: true,
        unidades: []
      })
    }

    // Buscar metas mensais uma vez para todas as unidades
    const todasUnidadesIds = unidades.map(u => u.id)
    const metasPlaceholders = todasUnidadesIds.map(() => '?').join(',')
    
    const metas = await executeQuery(`
      SELECT 
        mm.unidade_id,
        COALESCE(SUM(mm.meta_valor), 0) as meta_total
      FROM metas_mensais mm
      WHERE mm.unidade_id IN (${metasPlaceholders})
        AND mm.mes = ?
        AND mm.ano = ?
      GROUP BY mm.unidade_id
    `, [...todasUnidadesIds, mesAtual, anoAtual]) as any[]

    const metasMap = new Map<number, number>()
    metas.forEach(m => {
      metasMap.set(Number(m.unidade_id), Number(m.meta_total || 0))
    })

    // Buscar estatísticas usando a API unificada para cada unidade
    const unidadesPromises = unidades.map(async (unidade) => {
      try {
        // Construir parâmetros para API /api/oportunidades/stats
        const statsParams = new URLSearchParams()
        statsParams.append('unidade_id', String(unidade.id))
        
        if (funilId) {
          statsParams.append('funil_id', funilId)
        }

        // Oportunidades abertas
        const abertasParams = new URLSearchParams(statsParams)
        abertasParams.append('status', 'open')
        
        // Oportunidades ganhas (com filtro de data)
        const ganhasParams = new URLSearchParams(statsParams)
        ganhasParams.append('status', 'won')
        if (usarDataCustomizada) {
          ganhasParams.append('gain_date_start', dataInicio!)
          ganhasParams.append('gain_date_end', dataFim!)
        } else {
          const primeiroDiaMes = new Date(anoAtual, mesAtual - 1, 1).toISOString().split('T')[0]
          const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).toISOString().split('T')[0]
          ganhasParams.append('gain_date_start', primeiroDiaMes)
          ganhasParams.append('gain_date_end', ultimoDiaMes)
        }
        
        // Oportunidades perdidas (com filtro de data)
        const perdidasParams = new URLSearchParams(statsParams)
        perdidasParams.append('status', 'lost')
        if (usarDataCustomizada) {
          perdidasParams.append('lost_date_start', dataInicio!)
          perdidasParams.append('lost_date_end', dataFim!)
        } else {
          const primeiroDiaMes = new Date(anoAtual, mesAtual - 1, 1).toISOString().split('T')[0]
          const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).toISOString().split('T')[0]
          perdidasParams.append('lost_date_start', primeiroDiaMes)
          perdidasParams.append('lost_date_end', ultimoDiaMes)
        }

        // Fazer requisições em paralelo
        const [abertasRes, ganhasRes, perdidasRes] = await Promise.all([
          fetch(`${request.nextUrl.origin}/api/oportunidades/stats?${abertasParams.toString()}`, {
            headers: request.headers
          }),
          fetch(`${request.nextUrl.origin}/api/oportunidades/stats?${ganhasParams.toString()}`, {
            headers: request.headers
          }),
          fetch(`${request.nextUrl.origin}/api/oportunidades/stats?${perdidasParams.toString()}`, {
            headers: request.headers
          })
        ])

        const [abertasData, ganhasData, perdidasData] = await Promise.all([
          abertasRes.json(),
          ganhasRes.json(),
          perdidasRes.json()
        ])

        return {
          id: unidade.id,
          nome: unidade.nome,
          nome_exibicao: unidade.nome,
          grupo_id: unidade.grupo_id || null,
          oportunidades_abertas: Number(abertasData.data?.total_abertas || 0),
          oportunidades_ganhas: Number(ganhasData.data?.total_ganhas || 0),
          oportunidades_perdidas: Number(perdidasData.data?.total_perdidas || 0),
          valor_aberto: Number(abertasData.data?.valor_abertas || 0),
          valor_ganho: Number(ganhasData.data?.valor_ganhas || 0),
          valor_perdido: Number(perdidasData.data?.valor_perdidas || 0),
          meta_valor: metasMap.get(unidade.id) || 0
        }
      } catch (error) {
        return {
          id: unidade.id,
          nome: unidade.nome,
          nome_exibicao: unidade.nome,
          grupo_id: unidade.grupo_id || null,
          oportunidades_abertas: 0,
          oportunidades_ganhas: 0,
          oportunidades_perdidas: 0,
          valor_aberto: 0,
          valor_ganho: 0,
          valor_perdido: 0,
          meta_valor: metasMap.get(unidade.id) || 0
        }
      }
    })

    const unidadesComOportunidades = await Promise.all(unidadesPromises)

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
