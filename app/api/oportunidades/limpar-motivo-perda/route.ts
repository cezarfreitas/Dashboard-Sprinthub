import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// POST - Limpar campo loss_reason, removendo "Motivo " e deixando apenas o ID numérico
export async function POST(request: NextRequest) {
  try {
    // Validar autenticação (opcional - pode adicionar validação de token se necessário)
    const { searchParams } = new URL(request.url)
    const apitoken = searchParams.get('apitoken')
    const i = searchParams.get('i')

    if (!apitoken || !i) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Autenticação necessária',
          error: 'Parâmetros "apitoken" e "i" são obrigatórios'
        },
        { status: 401 }
      )
    }

    // Validar contra variáveis de ambiente
    if (apitoken !== process.env.APITOKEN || i !== process.env.I) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Credenciais inválidas',
          error: 'Token ou ID de grupo inválidos'
        },
        { status: 403 }
      )
    }

    // Contar quantos registros precisam ser atualizados
    const countResult = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades 
      WHERE loss_reason LIKE 'Motivo %'
        AND loss_reason REGEXP '^Motivo [0-9]+$'
    `) as any[]

    const totalParaAtualizar = countResult[0]?.total || 0

    if (totalParaAtualizar === 0) {
      return NextResponse.json({
        success: true,
        message: 'Nenhum registro precisa ser atualizado',
        stats: {
          total_atualizados: 0,
          total_antes: 0
        }
      })
    }

    // Atualizar loss_reason removendo "Motivo " do início e deixando apenas o número
    await executeQuery(`
      UPDATE oportunidades 
      SET loss_reason = TRIM(REPLACE(loss_reason, 'Motivo ', '')),
          updateDate = NOW()
      WHERE loss_reason LIKE 'Motivo %'
        AND loss_reason REGEXP '^Motivo [0-9]+$'
    `)

    // Verificar quantos foram atualizados
    const updatedResult = await executeQuery(`
      SELECT COUNT(*) as total
      FROM oportunidades 
      WHERE loss_reason REGEXP '^[0-9]+$'
        AND loss_reason IS NOT NULL
    `) as any[]

    const totalAtualizados = updatedResult[0]?.total || 0

    return NextResponse.json({
      success: true,
      message: `Limpeza concluída: ${totalParaAtualizar} registros atualizados`,
      stats: {
        total_atualizados: totalParaAtualizar,
        total_com_id_numerico: totalAtualizados
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao limpar motivos de perda',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

