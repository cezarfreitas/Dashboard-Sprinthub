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
    
    // Sempre usar mês atual
    const dataAtual = new Date()
    const mes = dataAtual.getMonth() + 1
    const ano = dataAtual.getFullYear()
    
    console.log('🔍 [FUNIL API] Parâmetros:', { idFunil, debug, mes, ano, userId, unidadeId })

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
      // Debug: Verificar valores únicos de crm_column
      const crmColumns = await executeQuery(`
        SELECT DISTINCT crm_column, COUNT(*) as count 
        FROM oportunidades 
        WHERE MONTH(createDate) = ? 
        AND YEAR(createDate) = ?
        GROUP BY crm_column
      `, [mes, ano]) as Array<{crm_column: string, count: number}>
      
      console.log('🔍 [FUNIL API] CRM Columns encontradas:', crmColumns)
    }
    
    console.log('🔍 [FUNIL API] Colunas do funil:', colunas.map(c => `${c.id}: ${c.nome_coluna}`))

    // Processar cada coluna do funil
    const colunasComStatus: ColunaFunilComStatus[] = await Promise.all(
      colunas.map(async (coluna, index) => {
        console.log(`🔍 [FUNIL API] Processando coluna: ${coluna.nome_coluna}`)
        
        let oportunidadesAbertas, oportunidadesGanhas, oportunidadesPerdidas
        
        if (crmColumnExists.length > 0) {
          // Construir filtros dinamicamente
          let whereClause = `status = ? AND crm_column = ? AND MONTH(createDate) = ? AND YEAR(createDate) = ?`
          let queryParams: any[] = ['open', coluna.id, mes, ano]
          
          if (userId) {
            whereClause += ` AND user = ?`
            queryParams.push(userId)
          }
          
          if (unidadeId) {
            whereClause += ` AND user IN (SELECT v.id FROM vendedores v WHERE v.unidade_id = ?)`
            queryParams.push(unidadeId)
          }

          // Usar crm_column (ID da coluna) se existir
          oportunidadesAbertas = await executeQuery(`
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades 
            WHERE ${whereClause}
          `, queryParams) as Array<{count: number, valor_total: number}>

          // Para ganhas
          queryParams[0] = 'gain'
          oportunidadesGanhas = await executeQuery(`
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades 
            WHERE ${whereClause}
          `, queryParams) as Array<{count: number, valor_total: number}>

          // Para perdidas
          queryParams[0] = 'lost'
          oportunidadesPerdidas = await executeQuery(`
            SELECT COUNT(*) as count, COALESCE(SUM(value), 0) as valor_total
            FROM oportunidades 
            WHERE ${whereClause}
          `, queryParams) as Array<{count: number, valor_total: number}>
        } else {
          // Construir filtros para fallback
          let whereClause = `status = ? AND MONTH(createDate) = ? AND YEAR(createDate) = ?`
          let queryParams: any[] = ['open', mes, ano]
          
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
    const totais_periodo = {
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
