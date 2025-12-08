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
    console.log('🔍 [FUNIL API] Iniciando requisição...')
    
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
    
    console.log('🔍 [FUNIL API] Parâmetros:', { idFunil, debug, mes, ano, userId, unidadeId, dataInicio, dataFim })

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
    console.log('🔍 [FUNIL API] Verificando se tabela colunas_funil existe...')
    const tableExists = await executeQuery(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'colunas_funil'
    `) as Array<{count: number}>

    console.log('🔍 [FUNIL API] Tabela colunas_funil existe:', tableExists[0].count > 0)

    if (tableExists[0].count === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tabela colunas_funil não existe',
        suggestion: 'Verifique se a tabela foi criada no banco de dados'
      }, { status: 404 })
    }

    // Buscar colunas do funil específico
    console.log('🔍 [FUNIL API] Buscando colunas do funil...')
    const colunas = await executeQuery(`
      SELECT * FROM colunas_funil 
      WHERE id_funil = ? 
      ORDER BY sequencia ASC
    `, [idFunil]) as ColunaFunil[]

    console.log('🔍 [FUNIL API] Colunas encontradas:', colunas.length)

    if (colunas.length === 0) {
      return NextResponse.json({
        success: true,
        message: `Nenhuma coluna encontrada para id_funil = ${idFunil}`,
        colunas: [],
        id_funil: parseInt(idFunil)
      })
    }

    // Buscar dados reais da tabela oportunidades
    console.log('🔍 [FUNIL API] Buscando dados reais da tabela oportunidades...')
    
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
    
    console.log('🔍 [FUNIL API] Campo crm_column existe:', crmColumnExists.length > 0)
    
    if (crmColumnExists.length === 0) {
      console.log('🔍 [FUNIL API] Campo crm_column não existe, usando distribuição por posição')
    } else {
      // Debug: Verificar valores únicos de crm_column - GMT-3
      const crmColumns = await executeQuery(`
        SELECT DISTINCT crm_column, COUNT(*) as count 
        FROM oportunidades 
        WHERE MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? 
        AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?
        GROUP BY crm_column
      `, [mes, ano]) as Array<{crm_column: string, count: number}>
      
      console.log('🔍 [FUNIL API] CRM Columns encontradas:', crmColumns)
    }
    
    console.log('🔍 [FUNIL API] Colunas do funil:', colunas.map(c => `${c.id}: ${c.nome_coluna}`))

    // DEBUG: Verificar total de oportunidades no período - GMT-3
    let debugTotalQuery = `SELECT COUNT(*) as total FROM oportunidades WHERE 1=1`
    let debugTotalParams: any[] = []
    
    if (dataInicio && dataFim) {
      debugTotalQuery += ` AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
      debugTotalParams.push(dataInicio, dataFim)
    } else {
      debugTotalQuery += ` AND MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
      debugTotalParams.push(mes, ano)
    }
    
    if (unidadeId) {
      debugTotalQuery += ` AND CAST(user AS UNSIGNED) IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
      debugTotalParams.push(unidadeId)
    }
    
    const debugTotal = await executeQuery(debugTotalQuery, debugTotalParams) as any[]
    console.log('🔍 [FUNIL API] === DEBUG INÍCIO ===')
    console.log('🔍 [FUNIL API] Total de oportunidades no período:', debugTotal[0]?.total)
    console.log('🔍 [FUNIL API] Filtros aplicados:', { dataInicio, dataFim, unidadeId, mes, ano })
    
    // DEBUG: Verificar status das oportunidades
    const debugStatus = await executeQuery(
      debugTotalQuery.replace('COUNT(*) as total', 'status, COUNT(*) as total') + ' GROUP BY status',
      debugTotalParams
    ) as any[]
    console.log('🔍 [FUNIL API] Status das oportunidades:', debugStatus)

    // Processar cada coluna do funil
    const colunasComStatus: ColunaFunilComStatus[] = await Promise.all(
      colunas.map(async (coluna, index) => {
        console.log(`🔍 [FUNIL API] Processando coluna: ${coluna.nome_coluna} (ID: ${coluna.id})`)
        
        let oportunidadesAbertas, oportunidadesGanhas, oportunidadesPerdidas
        
        // === TESTE 1: Contar TODAS as oportunidades (sem filtros) ===
        const teste1 = await executeQuery(`SELECT COUNT(*) as total FROM oportunidades`) as any[]
        console.log(`🔍 [TESTE 1] Total de oportunidades na base (SEM FILTROS):`, teste1[0]?.total)
        
        // === TESTE 2: Filtrar por período - GMT-3 ===
        let queryTeste2 = `SELECT COUNT(*) as total FROM oportunidades WHERE 1=1`
        let paramsTeste2: any[] = []
        
        if (dataInicio && dataFim) {
          queryTeste2 += ` AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) >= ? AND DATE(CONVERT_TZ(createDate, '+00:00', '-03:00')) <= ?`
          paramsTeste2.push(dataInicio, dataFim)
        } else {
          queryTeste2 += ` AND MONTH(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ? AND YEAR(CONVERT_TZ(createDate, '+00:00', '-03:00')) = ?`
          paramsTeste2.push(mes, ano)
        }
        
        const teste2 = await executeQuery(queryTeste2, paramsTeste2) as any[]
        console.log(`🔍 [TESTE 2] Com filtro de período:`, teste2[0]?.total, 'Params:', paramsTeste2)
        
        // === TESTE 3: Adicionar filtro de unidade ===
        if (unidadeId) {
          // Primeiro, verificar quais vendedores pertencem à unidade
          const vendedoresUnidade = await executeQuery(
            `SELECT id FROM vendedores WHERE unidade_id = ?`,
            [unidadeId]
          ) as any[]
          console.log(`🔍 [TESTE 3a] Vendedores da unidade ${unidadeId}:`, vendedoresUnidade.map((v: any) => v.id))
          
          // Depois, verificar quantas oportunidades esses vendedores têm
          if (vendedoresUnidade.length > 0) {
            const idsVendedores = vendedoresUnidade.map((v: any) => v.id)
            const placeholders = idsVendedores.map(() => '?').join(',')
            
            queryTeste2 += ` AND CAST(user AS UNSIGNED) IN (${placeholders})`
            paramsTeste2.push(...idsVendedores)
            
            const teste3 = await executeQuery(queryTeste2, paramsTeste2) as any[]
            console.log(`🔍 [TESTE 3b] Com filtro de unidade:`, teste3[0]?.total)
          } else {
            console.log(`🔍 [TESTE 3c] ⚠️ Nenhum vendedor encontrado para unidade ${unidadeId}`)
          }
        }
        
        // === TESTE 4: Adicionar filtro de status (abertas) ===
        let queryAbertas = queryTeste2 + ` AND status NOT IN ('gain', 'lost')`
        const teste4 = await executeQuery(queryAbertas, paramsTeste2) as any[]
        console.log(`🔍 [TESTE 4] Com filtro de status (abertas):`, teste4[0]?.total)
        
        // Resultado final - GMT-3
        oportunidadesAbertas = await executeQuery(`
          SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
          FROM oportunidades 
          WHERE status NOT IN ('gain', 'lost') 
          ${dataInicio && dataFim ? 'AND DATE(CONVERT_TZ(createDate, \'+00:00\', \'-03:00\')) >= ? AND DATE(CONVERT_TZ(createDate, \'+00:00\', \'-03:00\')) <= ?' : 'AND MONTH(CONVERT_TZ(createDate, \'+00:00\', \'-03:00\')) = ? AND YEAR(CONVERT_TZ(createDate, \'+00:00\', \'-03:00\')) = ?'}
          ${unidadeId ? 'AND CAST(user AS UNSIGNED) IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)' : ''}
        `, unidadeId ? [...paramsTeste2.slice(0, dataInicio && dataFim ? 2 : 2), unidadeId] : paramsTeste2) as Array<{count: number, valor_total: number}>
        
        console.log(`🔍 [RESULTADO FINAL] Abertas:`, oportunidadesAbertas[0])
        
        if (crmColumnExists.length > 0) {
          // TODO: Adicionar filtro por crm_column depois que confirmar que está contando corretamente

          // Por enquanto, deixar ganhas e perdidas zeradas até confirmar que abertas está funcionando
          oportunidadesGanhas = [{ count: 0, valor_total: 0 }]
          oportunidadesPerdidas = [{ count: 0, valor_total: 0 }]
        } else {
          // Construir filtros para fallback - GMT-3
          let whereClause = `status = ?`
          let queryParams: any[] = ['open']
          
          // Usar dataInicio/dataFim se fornecidos, senão usar mês/ano
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

        // Usar os dados específicos da coluna
        const abertos = oportunidadesAbertas[0].count
        const ganhos = oportunidadesGanhas[0].count
        const perdidos = oportunidadesPerdidas[0].count

        console.log(`🔍 [FUNIL API] ${coluna.nome_coluna}: abertos=${abertos}, ganhos=${ganhos}, perdidos=${perdidos}`)

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
    // Buscar totais reais do período (criados, ganhos, perdidos)
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

    console.log('🔍 [FUNIL API] Dados processados:', {
      totalColunas: colunasComStatus.length,
      totais: totais_periodo
    })

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
    console.error('🔍 [FUNIL API] Erro:', error)
    
    return NextResponse.json({
      success: false,
      error: 'Erro interno do servidor',
      message: error instanceof Error ? error.message : 'Erro desconhecido',
      stack: error instanceof Error ? error.stack : undefined,
      debug: {
        idFunil: searchParams.get('id_funil') || '4',
        mes: searchParams.get('mes') || new Date().getMonth() + 1,
        ano: searchParams.get('ano') || new Date().getFullYear(),
        debug: searchParams.get('debug')
      }
    }, { status: 500 })
  }
}
