import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * GET /api/wpp/meta/[vendedor_id]
 * Webhook para retornar dados de meta do vendedor do mês atual
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { vendedor_id: string } }
) {
  try {
    const vendedorId = params.vendedor_id

    if (!vendedorId || isNaN(parseInt(vendedorId))) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'ID do vendedor inválido' 
        },
        { status: 400 }
      )
    }

    // Obter mês e ano atual
    const now = new Date()
    const mesAtual = now.getMonth() + 1
    const anoAtual = now.getFullYear()
    const diaAtual = now.getDate()
    const ultimoDiaMes = new Date(anoAtual, mesAtual, 0).getDate()

    // 1. Buscar meta do vendedor para o mês atual
    const metaQuery = `
      SELECT 
        meta_valor,
        mes,
        ano
      FROM metas_mensais
      WHERE vendedor_id = ?
        AND mes = ?
        AND ano = ?
      LIMIT 1
    `

    const metaResult = await executeQuery(metaQuery, [vendedorId, mesAtual, anoAtual]) as Array<{
      meta_valor: number
      mes: number
      ano: number
    }>

    const metaValor = metaResult.length > 0 ? Number(metaResult[0].meta_valor) : 0

    // 2. Buscar valor atingido no mês (oportunidades ganhas no mês atual)
    // Considera a data de ganho (gain_date) ao invés da data de criação (createDate)
    const vendasQuery = `
      SELECT 
        COALESCE(SUM(value), 0) as valor_total,
        COUNT(*) as total_oportunidades
      FROM oportunidades
      WHERE user = ?
        AND status = 'gain'
        AND gain_date IS NOT NULL
        AND MONTH(gain_date) = ?
        AND YEAR(gain_date) = ?
    `

    const vendasResult = await executeQuery(vendasQuery, [vendedorId, mesAtual, anoAtual]) as Array<{
      valor_total: number
      total_oportunidades: number
    }>

    const valorAtingido = vendasResult.length > 0 ? Number(vendasResult[0].valor_total) : 0
    const totalOportunidades = vendasResult.length > 0 ? Number(vendasResult[0].total_oportunidades) : 0

    // 3. Calcular percentual atingido
    const percentualAtingido = metaValor > 0 ? (valorAtingido / metaValor) * 100 : 0

    // 4. Calcular projeção linear baseada nos dias decorridos
    let projecaoValor = 0
    let projecaoPercentual = 0
    let status = 'sem-meta'

    if (metaValor > 0 && diaAtual > 0) {
      projecaoValor = (valorAtingido / diaAtual) * ultimoDiaMes
      projecaoPercentual = (projecaoValor / metaValor) * 100

      // Determinar status da projeção
      if (percentualAtingido >= 100) {
        status = 'meta-atingida'
      } else if (projecaoPercentual >= 100) {
        status = 'no-caminho'
      } else if (projecaoPercentual >= 80) {
        status = 'atencao'
      } else {
        status = 'risco'
      }
    } else if (metaValor > 0) {
      status = 'aguardando-vendas'
    }

    // 5. Buscar informações do vendedor (nome)
    const vendedorQuery = `
      SELECT 
        name,
        lastName,
        username,
        email
      FROM vendedores
      WHERE id = ?
      LIMIT 1
    `

    const vendedorResult = await executeQuery(vendedorQuery, [vendedorId]) as Array<{
      name: string
      lastName: string
      username: string
      email: string
    }>

    const vendedorInfo = vendedorResult.length > 0 ? vendedorResult[0] : null

    // 6. Retornar dados formatados
    return NextResponse.json({
      success: true,
      data: {
        vendedor: {
          id: parseInt(vendedorId),
          nome: vendedorInfo ? `${vendedorInfo.name} ${vendedorInfo.lastName}`.trim() : 'Vendedor não encontrado',
          username: vendedorInfo?.username || null,
          email: vendedorInfo?.email || null
        },
        periodo: {
          mes: mesAtual,
          ano: anoAtual,
          dia_atual: diaAtual,
          total_dias_mes: ultimoDiaMes,
          percentual_mes_decorrido: ((diaAtual / ultimoDiaMes) * 100).toFixed(1)
        },
        meta: {
          valor: metaValor,
          formatado: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(metaValor)
        },
        atingido: {
          valor: valorAtingido,
          formatado: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(valorAtingido),
          total_oportunidades: totalOportunidades,
          percentual: percentualAtingido.toFixed(2)
        },
        projecao: {
          valor: projecaoValor,
          formatado: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(projecaoValor),
          percentual: projecaoPercentual.toFixed(2),
          status: status,
          mensagem: getStatusMensagem(status)
        },
        falta_atingir: {
          valor: Math.max(0, metaValor - valorAtingido),
          formatado: new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }).format(Math.max(0, metaValor - valorAtingido)),
          percentual: metaValor > 0 ? ((Math.max(0, metaValor - valorAtingido) / metaValor) * 100).toFixed(2) : '0.00'
        }
      }
    })

  } catch (error) {
    console.error('❌ Erro no webhook /api/wpp/meta/[vendedor_id]:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Função auxiliar para obter mensagem de status
function getStatusMensagem(status: string): string {
  switch (status) {
    case 'meta-atingida':
      return '🎉 Meta atingida! Parabéns!'
    case 'no-caminho':
      return '✅ No caminho para bater a meta'
    case 'atencao':
      return '⚠️ Atenção: ritmo abaixo do esperado'
    case 'risco':
      return '🚨 Risco: ritmo muito abaixo da meta'
    case 'aguardando-vendas':
      return 'ℹ️ Aguardando primeiras vendas do mês'
    default:
      return 'ℹ️ Sem meta cadastrada para este mês'
  }
}

