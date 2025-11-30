import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * POST /api/contatos/relaction
 * 
 * 1. Verifica se o contato existe (wpp_filial + wpp_contato)
 * 2. Se existir, chama a API do SprintHub com o id_contato e atendimento
 * 
 * Body:
 * {
 *   "wpp_filial": "5527981920127",
 *   "wpp_contato": "5511989882867",
 *   "atendimento": "15454"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { wpp_filial, wpp_contato, atendimento } = body

    // Validações
    if (!wpp_filial || !wpp_contato || !atendimento) {
      return NextResponse.json(
        {
          success: false,
          message: 'Campos obrigatórios: wpp_filial, wpp_contato, atendimento',
          example: {
            wpp_filial: '5527981920127',
            wpp_contato: '5511989882867',
            atendimento: '15454'
          }
        },
        { status: 400 }
      )
    }

    // 1. Verificar se contato existe
    const contatos = await executeQuery(
      `SELECT 
        id_contato,
        wpp_filial,
        wpp_contato,
        vendedor,
        vendedor_id,
        nome,
        ativo
      FROM contatos_whatsapp 
      WHERE wpp_filial = ? AND wpp_contato = ?`,
      [wpp_filial, wpp_contato]
    ) as any[]

    // Se não existe, retornar erro
    if (contatos.length === 0) {
      return NextResponse.json(
        {
          success: false,
          exists: false,
          message: `Contato ${wpp_contato} não encontrado na filial ${wpp_filial}`,
          parametros: {
            wpp_filial,
            wpp_contato,
            atendimento
          }
        },
        { status: 404 }
      )
    }

    const contato = contatos[0]

    // 2. Chamar API do SprintHub
    const sprinthubUrl = 'https://sprinthub-api-master.sprinthub.app/sac360/relaction?i=grupointeli&apitoken=e24be9a5-c50d-44a6-8128-e21ab15e63af'
    
    const sprinthubPayload = {
      lead: contato.id_contato,
      attendance: atendimento
    }

    let sprinthubResponse: any = null
    let sprinthubSuccess = false
    let sprinthubError: string | null = null
    let sprinthubStatus: number | null = null

    try {
      const response = await fetch(sprinthubUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sprinthubPayload)
      })

      sprinthubStatus = response.status

      // Tentar capturar resposta como JSON
      const contentType = response.headers.get('content-type')
      if (contentType?.includes('application/json')) {
        sprinthubResponse = await response.json()
      } else {
        sprinthubResponse = await response.text()
      }

      sprinthubSuccess = response.ok

      if (!response.ok) {
        sprinthubError = `SprintHub API retornou status ${response.status}`
      }
    } catch (error) {
      sprinthubError = error instanceof Error ? error.message : 'Erro ao chamar API do SprintHub'
      sprinthubSuccess = false
    }

    // 3. Retornar resultado completo
    return NextResponse.json({
      success: true,
      exists: true,
      message: 'Contato encontrado e API SprintHub chamada',
      parametros: {
        wpp_filial,
        wpp_contato,
        atendimento
      },
      contato: {
        id_contato: contato.id_contato,
        nome: contato.nome,
        vendedor: contato.vendedor,
        vendedor_id: contato.vendedor_id,
        ativo: Boolean(contato.ativo)
      },
      sprinthub: {
        success: sprinthubSuccess,
        called: true,
        status_code: sprinthubStatus,
        payload_sent: sprinthubPayload,
        response: sprinthubResponse,
        error: sprinthubError
      }
    })

  } catch (error) {
    console.error('❌ Erro no processo relaction:', error)
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao processar requisição',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

