import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

/**
 * Função comum para verificar contato
 */
async function checkContato(wppFilial: string | null, wppContato: string | null, atendimento: string | null) {
  try {
    // Validações
    if (!wppFilial || !wppContato) {
      return NextResponse.json(
        {
          exists: false,
          error: 'Parâmetros obrigatórios: wpp_filial e wpp_contato'
        },
        { status: 400 }
      )
    }

    // Buscar contato
    const contatos = await executeQuery(
      `SELECT 
        id_contato,
        wpp_filial,
        wpp_contato,
        vendedor,
        vendedor_id,
        nome,
        ativo,
        observacoes,
        created_at,
        updated_at
      FROM contatos_whatsapp 
      WHERE wpp_filial = ? AND wpp_contato = ?`,
      [wppFilial, wppContato]
    ) as any[]

    // Se encontrou
    if (contatos.length > 0) {
      const contato = contatos[0]
      
      // Se atendimento foi fornecido, chamar API do SprintHub
      let sprinthubData = null
      
      if (atendimento) {
        const sprinthubUrl = 'https://sprinthub-api-master.sprinthub.app/sac360/relaction?i=grupointeli&apitoken=e24be9a5-c50d-44a6-8128-e21ab15e63af'
        
        const sprinthubPayload = {
          lead: contato.id_contato,
          attendance: atendimento
        }

        try {
          const sprinthubResponse = await fetch(sprinthubUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(sprinthubPayload)
          })

          const sprinthubStatusCode = sprinthubResponse.status
          
          // Tentar capturar resposta como JSON ou texto
          let sprinthubResponseData
          const contentType = sprinthubResponse.headers.get('content-type')
          if (contentType?.includes('application/json')) {
            sprinthubResponseData = await sprinthubResponse.json()
          } else {
            sprinthubResponseData = await sprinthubResponse.text()
          }

          sprinthubData = {
            success: sprinthubResponse.ok,
            called: true,
            status_code: sprinthubStatusCode,
            payload_sent: sprinthubPayload,
            response: sprinthubResponseData,
            error: sprinthubResponse.ok ? null : `SprintHub retornou status ${sprinthubStatusCode}`
          }
        } catch (error) {
          sprinthubData = {
            success: false,
            called: true,
            status_code: null,
            payload_sent: sprinthubPayload,
            response: null,
            error: error instanceof Error ? error.message : 'Erro ao chamar SprintHub'
          }
        }
      }
      
      // Retorno simplificado
      const response: any = {
        exists: true,
        id_contato: contato.id_contato,
        nome: contato.nome,
        vendedor_id: contato.vendedor_id
      }

      // Se chamou SprintHub, adicionar apenas a resposta
      if (sprinthubData) {
        response.sprinthub = sprinthubData.response
        response.sprinthub_success = sprinthubData.success
        response.sprinthub_status = sprinthubData.status_code
      }

      return NextResponse.json(response)
    }

    // Se não encontrou
    return NextResponse.json({
      exists: false,
      message: 'Contato não encontrado'
    })

  } catch (error) {
    console.error('❌ Erro ao verificar contato:', error)
    return NextResponse.json(
      {
        exists: false,
        error: error instanceof Error ? error.message : 'Erro ao verificar contato'
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/contatos/check
 * Body: { "wpp_filial": "...", "wpp_contato": "...", "atendimento": "..." }
 * 
 * Verifica se existe um contato específico em uma filial
 * Se 'atendimento' for fornecido, chama automaticamente a API do SprintHub
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    const wppFilial = body.wpp_filial || null
    const wppContato = body.wpp_contato || null
    const atendimento = body.atendimento || null

    return await checkContato(wppFilial, wppContato, atendimento)
  } catch (error) {
    console.error('❌ Erro ao processar POST:', error)
    return NextResponse.json(
      {
        exists: false,
        error: 'Erro ao processar requisição. Verifique se o body está em formato JSON válido.'
      },
      { status: 400 }
    )
  }
}

/**
 * GET /api/contatos/check?wpp_filial=5527981920127&wpp_contato=5511989882867&atendimento=15454
 * 
 * Verifica se existe um contato específico em uma filial (compatibilidade)
 * Se 'atendimento' for fornecido, chama automaticamente a API do SprintHub
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const wppFilial = searchParams.get('wpp_filial')
  const wppContato = searchParams.get('wpp_contato')
  const atendimento = searchParams.get('atendimento')

  return await checkContato(wppFilial, wppContato, atendimento)
}
