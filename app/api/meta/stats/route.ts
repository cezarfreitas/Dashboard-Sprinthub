import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar estatísticas de meta filtrando por unidade ou vendedor
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidade_id = searchParams.get('unidade_id')
    const vendedor_id = searchParams.get('vendedor_id')
    const mes = searchParams.get('mes')
    const ano = searchParams.get('ano')

    // Usar mês e ano atual se não especificados
    const currentDate = new Date()
    const targetMes = mes ? parseInt(mes) : currentDate.getMonth() + 1
    const targetAno = ano ? parseInt(ano) : currentDate.getFullYear()

    // Validar mês e ano
    if (targetMes < 1 || targetMes > 12) {
      return NextResponse.json(
        { success: false, message: 'Mês deve estar entre 1 e 12' },
        { status: 400 }
      )
    }

    if (targetAno < 2020 || targetAno > 2030) {
      return NextResponse.json(
        { success: false, message: 'Ano deve estar entre 2020 e 2030' },
        { status: 400 }
      )
    }

    // Construir query base
    let query = `
      SELECT 
        m.id,
        m.vendedor_id,
        m.unidade_id,
        m.mes,
        m.ano,
        m.meta_valor,
        m.meta_descricao,
        v.name as vendedor_nome,
        v.lastName as vendedor_lastName,
        u.nome as unidade_nome
      FROM metas_mensais m
      JOIN vendedores v ON m.vendedor_id = v.id
      JOIN unidades u ON m.unidade_id = u.id
      WHERE m.mes = ? 
        AND m.ano = ? 
    `
    
    const params: any[] = [targetMes, targetAno]

    // Aplicar filtros - suportar múltiplas unidades
    if (unidade_id) {
      const unidadeIds = unidade_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      if (unidadeIds.length > 0) {
        query += ` AND m.unidade_id IN (${unidadeIds.map(() => '?').join(',')})`
        params.push(...unidadeIds)
      }
    }

    if (vendedor_id) {
      const vendedorIds = vendedor_id.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      if (vendedorIds.length > 0) {
        query += ` AND m.vendedor_id IN (${vendedorIds.map(() => '?').join(',')})`
        params.push(...vendedorIds)
      }
    }

    query += ' ORDER BY u.nome, v.name'

    const metas = await executeQuery(query, params) as Array<{
      id: number
      vendedor_id: number
      unidade_id: number
      mes: number
      ano: number
      meta_valor: number
      meta_descricao: string | null
      vendedor_nome: string
      vendedor_lastName: string
      unidade_nome: string
    }>

    // Calcular estatísticas agregadas
    const metaTotal = metas.reduce((sum, meta) => sum + Number(meta.meta_valor || 0), 0)
    const totalVendedores = metas.length
    const metaMedia = totalVendedores > 0 ? metaTotal / totalVendedores : 0

    // Agrupar por unidade (se filtrando por unidade_id)
    const metasPorUnidade = metas.reduce((acc, meta) => {
      const unidadeId = meta.unidade_id
      if (!acc[unidadeId]) {
        acc[unidadeId] = {
          unidade_id: unidadeId,
          unidade_nome: meta.unidade_nome,
          meta_total: 0,
          total_vendedores: 0,
          metas: []
        }
      }
      acc[unidadeId].meta_total += Number(meta.meta_valor || 0)
      acc[unidadeId].total_vendedores += 1
      acc[unidadeId].metas.push({
        vendedor_id: meta.vendedor_id,
        vendedor_nome: `${meta.vendedor_nome} ${meta.vendedor_lastName}`.trim(),
        meta_valor: Number(meta.meta_valor || 0),
        meta_descricao: meta.meta_descricao
      })
      return acc
    }, {} as Record<number, {
      unidade_id: number
      unidade_nome: string
      meta_total: number
      total_vendedores: number
      metas: Array<{
        vendedor_id: number
        vendedor_nome: string
        meta_valor: number
        meta_descricao: string | null
      }>
    }>)

    return NextResponse.json({
      success: true,
      data: {
        meta_valor: metaTotal,
        meta_total: metaTotal,
        total_vendedores: totalVendedores,
        meta_media: metaMedia,
        total_unidades: Object.keys(metasPorUnidade).length
      },
      periodo: {
        mes: targetMes,
        ano: targetAno,
        mes_nome: new Date(targetAno, targetMes - 1).toLocaleString('pt-BR', { month: 'long' })
      },
      filtros: {
        unidade_id: unidade_id || null,
        vendedor_id: vendedor_id || null
      },
      estatisticas: {
        meta_total: metaTotal,
        total_vendedores: totalVendedores,
        meta_media: metaMedia,
        total_unidades: Object.keys(metasPorUnidade).length
      },
      unidades: Object.values(metasPorUnidade),
      metas: metas.map(meta => ({
        id: meta.id,
        vendedor_id: meta.vendedor_id,
        vendedor_nome: `${meta.vendedor_nome} ${meta.vendedor_lastName}`.trim(),
        unidade_id: meta.unidade_id,
        unidade_nome: meta.unidade_nome,
        meta_valor: Number(meta.meta_valor || 0),
        meta_descricao: meta.meta_descricao
      }))
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar estatísticas de meta',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

