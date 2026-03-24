import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface ColunaFunil {
  id: number
  nome_coluna: string
  id_funil: number
  total_oportunidades: number
  valor_total: number
  sequencia: number
  created_at?: string
  updated_at?: string
}

interface ColunaFunilComStatus {
  id: number
  nome_coluna: string
  id_funil: number
  total_oportunidades: number
  valor_total: number
  sequencia: number
  abertos: number
  ganhos: number
  perdidos: number
  valor_abertos: number
  valor_ganhos: number
  valor_perdidos: number
  created_at?: string
  updated_at?: string
}

// GET - Buscar dados do funil baseado apenas na tabela colunas_funil
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  try {
    const idFunil = searchParams.get('id_funil') || '4'
    const debug = searchParams.get('debug')
    const userId = searchParams.get('user_id')
    const unidadeId = searchParams.get('unidade_id')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    // Determinar mês/ano para compatibilidade com código existente
    let mes: number
    let ano: number

    if (dataInicio) {
      const dataInicioObj = new Date(dataInicio + ' 00:00:00')
      mes = dataInicioObj.getMonth() + 1
      ano = dataInicioObj.getFullYear()
    } else {
      const dataAtual = new Date()
      mes = dataAtual.getMonth() + 1
      ano = dataAtual.getFullYear()
    }

    // Se debug=structure, mostrar estrutura da tabela
    if (debug === 'structure') {
      try {
        const structure = await executeQuery(`
          DESCRIBE colunas_funil
        `) as any[]

        return NextResponse.json({
          success: true,
          debug: 'table_structure',
          structure
        })
      } catch (error) {
        return NextResponse.json({
          success: false,
          error: 'Tabela colunas_funil não encontrada',
          message: error instanceof Error ? error.message : 'Erro desconhecido'
        }, { status: 404 })
      }
    }

    // Se debug=test, retornar dados básicos
    if (debug === 'test') {
      return NextResponse.json({
        success: true,
        debug: 'test',
        message: 'API funcionando',
        params: { idFunil, mes, ano }
      })
    }

    // Verificar se a tabela colunas_funil existe
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'colunas_funil'
    `) as Array<{count: number}>

    if (tableExists[0].count === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tabela colunas_funil não existe',
        suggestion: 'Verifique se a tabela foi criada no banco de dados'
      }, { status: 404 })
    }

    // Buscar colunas do funil específico
    const colunas = await executeQuery(`
      SELECT * FROM colunas_funil
      WHERE id_funil = ?
      ORDER BY sequencia ASC
    `, [idFunil]) as ColunaFunil[]

    if (colunas.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Nenhuma coluna encontrada para id_funil = ${idFunil}`,
        colunas: [],
        id_funil: parseInt(idFunil)
      })
    }

    // Verificar se a tabela oportunidades existe
    const oportunidadesTableExists = await executeQuery(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'oportunidades'
    `) as Array<{count: number}>

    if (oportunidadesTableExists[0].count === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tabela oportunidades não existe',
        suggestion: 'Verifique se a tabela foi criada no banco de dados'
      }, { status: 404 })
    }

    // Verificar se coluna crm_column existe
    const crmColumnExists = await executeQuery(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'oportunidades'
      AND COLUMN_NAME = 'crm_column'
    `) as any[]

    // Processar cada coluna do funil
    const colunasComStatus: ColunaFunilComStatus[] = await Promise.all(
      colunas.map(async (coluna, index) => {
        let oportunidadesAbertas, oportunidadesGanhas, oportunidadesPerdidas

        if (crmColumnExists.length > 0) {
          // TODO: Adicionar filtro por crm_column depois que confirmar que está contando corretamente
          // Por enquanto, contar abertas sem filtro de coluna e deixar ganhas/perdidas zeradas
          let queryAbertas = `
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades
            WHERE status NOT IN ('gain', 'lost')
          `
          let paramsAbertas: any[] = []

          if (dataInicio && dataFim) {
            queryAbertas += ` AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
            paramsAbertas.push(dataInicio, dataFim)
          } else {
            queryAbertas += ` AND MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
            paramsAbertas.push(mes, ano)
          }

          if (unidadeId) {
            queryAbertas += ` AND CAST(user AS UNSIGNED) IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
            paramsAbertas.push(unidadeId)
          }

          oportunidadesAbertas = await executeQuery(queryAbertas, paramsAbertas) as Array<{count: number, valor_total: number}>
          oportunidadesGanhas = [{ count: 0, valor_total: 0 }]
          oportunidadesPerdidas = [{ count: 0, valor_total: 0 }]
        } else {
          // Construir filtros para fallback - GMT-3
          let whereClause = `status = ?`
          let queryParams: any[] = ['open']

          if (dataInicio && dataFim) {
            whereClause += ` AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
            queryParams.push(dataInicio, dataFim)
          } else {
            whereClause += ` AND MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
            queryParams.push(mes, ano)
          }

          if (userId) {
            whereClause += ` AND user = ?`
            queryParams.push(userId)
          }

          if (unidadeId) {
            whereClause += ` AND user IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
            queryParams.push(unidadeId)
          }

          // Buscar todas as oportunidades do mês e distribuir por posição
          const totalAbertas = await executeQuery(`
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades
            WHERE ${whereClause}
          `, queryParams) as Array<{count: number, valor_total: number}>

          // Para ganhas
          queryParams[0] = 'gain'
          const totalGanhas = await executeQuery(`
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades
            WHERE ${whereClause}
          `, queryParams) as Array<{count: number, valor_total: number}>

          // Para perdidas
          queryParams[0] = 'lost'
          const totalPerdidas = await executeQuery(`
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades
            WHERE ${whereClause}
          `, queryParams) as Array<{count: number, valor_total: number}>

          // Distribuir baseado na posição da etapa
          const fatorAbertos = Math.max(0.1, 0.8 - (index * 0.1))
          const fatorGanhos = Math.min(0.3, 0.1 + (index * 0.02))
          const fatorPerdidos = 1 - fatorAbertos - fatorGanhos

          oportunidadesAbertas = [{ count: Math.round(totalAbertas[0].count * fatorAbertos), valor_total: totalAbertas[0].valor_total * fatorAbertos }]
          oportunidadesGanhas = [{ count: Math.round(totalGanhas[0].count * fatorGanhos), valor_total: totalGanhas[0].valor_total * fatorGanhos }]
          oportunidadesPerdidas = [{ count: Math.round(totalPerdidas[0].count * fatorPerdidos), valor_total: totalPerdidas[0].valor_total * fatorPerdidos }]
        }

        const abertos = oportunidadesAbertas[0].count
        const ganhos = oportunidadesGanhas[0].count
        const perdidos = oportunidadesPerdidas[0].count

        return {
          ...coluna,
          abertos,
          ganhos,
          perdidos,
          valor_abertos: Number(oportunidadesAbertas[0].valor_total),
          valor_ganhos: Number(oportunidadesGanhas[0].valor_total),
          valor_perdidos: Number(oportunidadesPerdidas[0].valor_total)
        }
      })
    )

    // Calcular totais do período
    let totalCriadosQuery = ''
    let totalCriadosParams: any[] = []
    let totalGanhosQuery = ''
    let totalGanhosParams: any[] = []
    let totalPerdidosQuery = ''
    let totalPerdidosParams: any[] = []

    if (dataInicio && dataFim) {
      totalCriadosQuery = `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor FROM oportunidades WHERE DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
      totalCriadosParams = [dataInicio, dataFim]
      totalGanhosQuery = `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor FROM oportunidades WHERE status = 'gain' AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
      totalGanhosParams = [dataInicio, dataFim]
      totalPerdidosQuery = `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor FROM oportunidades WHERE status = 'lost' AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
      totalPerdidosParams = [dataInicio, dataFim]
    } else {
      totalCriadosQuery = `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor FROM oportunidades WHERE MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
      totalCriadosParams = [mes, ano]
      totalGanhosQuery = `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor FROM oportunidades WHERE status = 'gain' AND MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
      totalGanhosParams = [mes, ano]
      totalPerdidosQuery = `SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor FROM oportunidades WHERE status = 'lost' AND MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
      totalPerdidosParams = [mes, ano]
    }

    if (userId) {
      totalCriadosQuery += ` AND user = ?`
      totalCriadosParams.push(userId)
      totalGanhosQuery += ` AND user = ?`
      totalGanhosParams.push(userId)
      totalPerdidosQuery += ` AND user = ?`
      totalPerdidosParams.push(userId)
    }

    if (unidadeId) {
      totalCriadosQuery += ` AND user IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
      totalCriadosParams.push(unidadeId)
      totalGanhosQuery += ` AND user IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
      totalGanhosParams.push(unidadeId)
      totalPerdidosQuery += ` AND user IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
      totalPerdidosParams.push(unidadeId)
    }

    const totalCriados = await executeQuery(totalCriadosQuery, totalCriadosParams) as Array<{count: number, valor: number}>
    const totalGanhos = await executeQuery(totalGanhosQuery, totalGanhosParams) as Array<{count: number, valor: number}>
    const totalPerdidos = await executeQuery(totalPerdidosQuery, totalPerdidosParams) as Array<{count: number, valor: number}>

    const totais_periodo = {
      total_criados: totalCriados[0]?.count || 0,
      total_ganhos: totalGanhos[0]?.count || 0,
      total_perdidos: totalPerdidos[0]?.count || 0,
      valor_total_criados: Number(totalCriados[0]?.valor) || 0,
      valor_total_ganhos: Number(totalGanhos[0]?.valor) || 0,
      valor_total_perdidos: Number(totalPerdidos[0]?.valor) || 0,
      total_oportunidades: colunasComStatus.reduce((sum, col) => sum + col.abertos + col.ganhos + col.perdidos, 0),
      valor_total: colunasComStatus.reduce((sum, col) => sum + col.valor_abertos + col.valor_ganhos + col.valor_perdidos, 0)
    }

    return NextResponse.json({
      success: true,
      colunas: colunasComStatus,
      id_funil: parseInt(idFunil),
      total_colunas: colunasComStatus.length,
      periodo: {
        mes: mes,
        ano: ano,
        descricao: `${mes.toString().padStart(2, '0')}/${ano}`
      },
      totais_periodo: totais_periodo
    })

  } catch (error) {
    console.error('[FUNIL API] Erro:', error)

    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 })
  }
}
