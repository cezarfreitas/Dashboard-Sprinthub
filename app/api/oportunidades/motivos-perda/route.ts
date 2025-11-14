import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar ranking dos motivos de perda
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mes = searchParams.get('mes') || new Date().getMonth() + 1
    const ano = searchParams.get('ano') || new Date().getFullYear()

    // Primeiro, verificar se existe coluna de motivo de perda
    const checkMotivoColumn = await executeQuery(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'oportunidades'
      AND COLUMN_NAME IN ('lost_reason', 'motivo_perda', 'reason', 'motivo')
    `) as any[]

    let motivosPerda: any[] = []

    if (checkMotivoColumn.length > 0) {
      // Se existe coluna de motivo, buscar ranking
      const motivoColumn = checkMotivoColumn[0].COLUMN_NAME
      
      motivosPerda = await executeQuery(`
        SELECT 
          ${motivoColumn} as motivo,
          COUNT(*) as quantidade,
          COALESCE(SUM(value), 0) as valor_perdido
        FROM oportunidades o
        WHERE o.status IN ('lost', 'perdida', 'closed')
          AND MONTH(o.lost_date) = ?
          AND YEAR(o.lost_date) = ?
          AND ${motivoColumn} IS NOT NULL
          AND ${motivoColumn} != ''
        GROUP BY ${motivoColumn}
        ORDER BY quantidade DESC, valor_perdido DESC
        LIMIT 10
      `, [mes, ano]) as any[]
    } else {
      // Se não existe coluna de motivo, criar motivos baseados em padrões
      // Primeiro, vamos verificar se existe alguma coluna de texto que possa conter motivo
      const textColumns = await executeQuery(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'oportunidades'
        AND DATA_TYPE IN ('TEXT', 'VARCHAR', 'LONGTEXT', 'MEDIUMTEXT')
        AND COLUMN_NAME NOT IN ('id', 'user', 'status')
      `) as any[]

      if (textColumns.length > 0) {
        // Usar a primeira coluna de texto encontrada
        const textColumn = textColumns[0].COLUMN_NAME
        
        motivosPerda = await executeQuery(`
          SELECT 
            CASE 
              WHEN ${textColumn} IS NULL OR ${textColumn} = '' THEN 'Sem motivo informado'
              ELSE ${textColumn}
            END as motivo,
            COUNT(*) as quantidade,
            COALESCE(SUM(value), 0) as valor_perdido
          FROM oportunidades o
          WHERE o.status IN ('lost', 'perdida', 'closed')
            AND MONTH(o.lost_date) = ?
            AND YEAR(o.lost_date) = ?
          GROUP BY 
            CASE 
              WHEN ${textColumn} IS NULL OR ${textColumn} = '' THEN 'Sem motivo informado'
              ELSE ${textColumn}
            END
          ORDER BY quantidade DESC, valor_perdido DESC
          LIMIT 10
        `, [mes, ano]) as any[]
      } else {
        // Se não há colunas de texto, criar motivos genéricos baseados em padrões
        motivosPerda = [
          { motivo: 'Sem motivo informado', quantidade: 0, valor_perdido: 0 }
        ]
      }
    }

    // Buscar total de oportunidades perdidas para calcular percentuais
    const totalPerdidas = await executeQuery(`
      SELECT 
        COUNT(*) as total_quantidade,
        COALESCE(SUM(value), 0) as total_valor
      FROM oportunidades o
      WHERE o.status IN ('lost', 'perdida', 'closed')
        AND MONTH(o.lost_date) = ?
        AND YEAR(o.lost_date) = ?
    `, [mes, ano]) as any[]

    const total = totalPerdidas[0] || { total_quantidade: 0, total_valor: 0 }

    // Adicionar percentuais aos motivos
    const motivosComPercentual = motivosPerda.map(motivo => ({
      ...motivo,
      percentual_quantidade: total.total_quantidade > 0 
        ? ((motivo.quantidade / total.total_quantidade) * 100).toFixed(1)
        : '0.0',
      percentual_valor: total.total_valor > 0 
        ? ((motivo.valor_perdido / total.total_valor) * 100).toFixed(1)
        : '0.0'
    }))

    return NextResponse.json({
      success: true,
      mes: Number(mes),
      ano: Number(ano),
      motivos: motivosComPercentual,
      total: {
        quantidade: total.total_quantidade,
        valor: total.total_valor
      },
      tem_coluna_motivo: checkMotivoColumn.length > 0,
      coluna_motivo: checkMotivoColumn.length > 0 ? checkMotivoColumn[0].COLUMN_NAME : null
    })

  } catch (error) {
    console.error('Erro ao buscar motivos de perda:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar motivos de perda',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

























