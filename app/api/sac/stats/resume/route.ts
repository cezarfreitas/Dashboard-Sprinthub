import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Helper para parsear JSON com segurança
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

// Converter data YYYY-MM-DD para ISO 8601 (UTC)
function formatDateToISO(dateStr: string, isEnd: boolean = false): string {
  const date = new Date(dateStr + 'T00:00:00.000Z')
  if (isEnd) {
    date.setUTCHours(23, 59, 59, 999)
  } else {
    date.setUTCHours(3, 0, 0, 0) // 03:00:00.000Z (início do dia)
  }
  return date.toISOString()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidadeId')
    const dataInicio = searchParams.get('dataInicio')
    const dataFim = searchParams.get('dataFim')

    if (!unidadeId) {
      return NextResponse.json(
        { success: false, message: 'unidadeId é obrigatório' },
        { status: 400 }
      )
    }

    if (!dataInicio || !dataFim) {
      return NextResponse.json(
        { success: false, message: 'dataInicio e dataFim são obrigatórios' },
        { status: 400 }
      )
    }

    // Obter variáveis de ambiente
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Configuração da API não encontrada. Verifique as variáveis de ambiente (APITOKEN, I, URLPATCH).' 
        },
        { status: 500 }
      )
    }

    // Buscar unidade e vendedores
    const unidade = await executeQuery(`
      SELECT id, users
      FROM unidades
      WHERE id = ? AND ativo = 1
    `, [parseInt(unidadeId)]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    // Extrair IDs dos vendedores da unidade
    const parsedUsers = parseJSON(unidade[0].users)
    const userIds = parsedUsers
      .map((u: any) => typeof u === 'object' ? u.id : u)
      .filter((id: any) => typeof id === 'number')

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        vendedores: [],
        message: 'Nenhum vendedor encontrado na unidade'
      })
    }

    // Buscar informações dos vendedores
    const vendedoresInfo = await executeQuery(`
      SELECT id, name, lastName
      FROM vendedores
      WHERE id IN (${userIds.map(() => '?').join(',')})
    `, userIds) as Array<{ id: number; name: string; lastName: string }>

    // Converter datas para formato ISO
    const sinceISO = formatDateToISO(dataInicio, false)
    const untilISO = formatDateToISO(dataFim, true)

    // Buscar estatísticas de cada vendedor da API externa
    const vendedoresStats = await Promise.all(
      vendedoresInfo.map(async (vendedor) => {
        try {
          const sacUrl = `${urlPatch}/sac/stats/resume?&user=${vendedor.id}&until=${untilISO}&since=${sinceISO}&apitoken=${apiToken}&i=${groupId}`
          
          const response = await fetch(sacUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'CRM-by-INTELI/1.0'
            },
            cache: 'no-store'
          })

          if (!response.ok) {
            return {
              id: vendedor.id,
              nome: `${vendedor.name} ${vendedor.lastName || ''}`.trim(),
              iniciados: 0,
              finalizados: 0,
              ignorados: 0,
              enviadas: 0,
              recebidas: 0,
              transferidos: 0,
              error: `Erro HTTP: ${response.status}`
            }
          }

          const data = await response.json()
          
          // Mapear campos da API para nosso formato
          // A API pode retornar os dados diretamente ou em um objeto wrapper
          // Tentar diferentes estruturas possíveis
          const stats = data.data || data.stats || data || {}
          
          return {
            id: vendedor.id,
            nome: `${vendedor.name} ${vendedor.lastName || ''}`.trim(),
            iniciados: Number(stats.started || stats.iniciados || stats.startedCount || 0),
            finalizados: Number(stats.finished || stats.finalizados || stats.finishedCount || 0),
            ignorados: Number(stats.ignored || stats.ignorados || stats.ignoredCount || 0),
            enviadas: Number(stats.sentMessages || stats.sent || stats.enviadas || stats.sentCount || 0),
            recebidas: Number(stats.receivedMessages || stats.received || stats.recebidas || stats.receivedCount || 0),
            transferidos: Number(stats.transferred || stats.transferidos || stats.transferredCount || 0)
          }
        } catch (error) {
          return {
            id: vendedor.id,
            nome: `${vendedor.name} ${vendedor.lastName || ''}`.trim(),
            iniciados: 0,
            finalizados: 0,
            ignorados: 0,
            enviadas: 0,
            recebidas: 0,
            transferidos: 0,
            error: error instanceof Error ? error.message : 'Erro desconhecido'
          }
        }
      })
    )

    return NextResponse.json({
      success: true,
      vendedores: vendedoresStats,
      periodo: {
        dataInicio,
        dataFim,
        sinceISO,
        untilISO
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar estatísticas do SAC',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

