import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Parsear vendedores da unidade
function parseJSON(value: any): any[] {
  if (!value) return []
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    return []
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = parseInt(params.id)
    const { searchParams } = new URL(request.url)
    const dataInicio = searchParams.get('data_inicio')
    const dataFim = searchParams.get('data_fim')
    const funilId = searchParams.get('funil_id')

    if (isNaN(unidadeId)) {
      return NextResponse.json(
        { success: false, message: 'ID de unidade inválido' },
        { status: 400 }
      )
    }

    // Buscar unidade e seus vendedores
    const unidade = await executeQuery(`
      SELECT 
        u.id, 
        COALESCE(u.nome, u.name) as nome, 
        u.users
      FROM unidades u
      WHERE u.id = ? AND u.ativo = 1
    `, [unidadeId]) as any[]

    if (!unidade || unidade.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    const parsedUsers = parseJSON(unidade[0].users)
    const userIds = parsedUsers
      .map((u: any) => typeof u === 'object' ? u.id : u)
      .filter((id: any) => typeof id === 'number')

    if (userIds.length === 0) {
      return NextResponse.json({
        success: true,
        oportunidades: []
      })
    }

    // Buscar vendedores ativos
    const todosVendedores = await executeQuery(`
      SELECT id FROM vendedores WHERE ativo = 1
    `) as any[]
    const vendedoresAtivosSet = new Set(todosVendedores.map(v => v.id))
    const vendedoresIds = userIds.filter((id: number) => vendedoresAtivosSet.has(id))

    if (vendedoresIds.length === 0) {
      return NextResponse.json({
        success: true,
        oportunidades: []
      })
    }

    // Construir filtros
    const placeholders = vendedoresIds.map(() => '?').join(',')
    const filtros: string[] = []
    const queryParams: any[] = []

    // Filtrar por vendedores - usar user diretamente (MySQL faz conversão automática)
    filtros.push(`o.user IN (${placeholders})`)
    queryParams.push(...vendedoresIds)

    // Oportunidades abertas - SEM filtro de período (mostrar todas as abertas)
    filtros.push('o.status IN (?, ?, ?)')
    queryParams.push('open', 'aberta', 'active')

    // NÃO aplicar filtro de período para oportunidades abertas
    // Mostrar todas as oportunidades abertas, independente de quando foram criadas

    // Filtro de funil
    let joinFunil = ''
    if (funilId) {
      joinFunil = 'LEFT JOIN colunas_funil cf ON o.coluna_funil_id = cf.id'
      filtros.push('cf.id_funil = ?')
      queryParams.push(parseInt(funilId))
    }

    // Buscar oportunidades abertas
    const oportunidades = await executeQuery(`
      SELECT 
        o.id,
        o.title as nome,
        o.value as valor,
        o.createDate as data_criacao,
        o.user as vendedor_id
      FROM oportunidades o
      ${joinFunil}
      WHERE ${filtros.join(' AND ')}
      ORDER BY o.createDate DESC, o.value DESC
    `, queryParams) as any[]

    // Buscar nomes dos vendedores separadamente
    const vendedoresIdsUnicos = Array.from(new Set(oportunidades.map(op => op.vendedor_id).filter(Boolean)))
    let vendedoresMap = new Map<number | string, string>()
    
    if (vendedoresIdsUnicos.length > 0) {
      const vendedoresPlaceholders = vendedoresIdsUnicos.map(() => '?').join(',')
      const vendedores = await executeQuery(`
        SELECT id, CONCAT(name, ' ', lastName) as nome_completo
        FROM vendedores
        WHERE id IN (${vendedoresPlaceholders})
      `, vendedoresIdsUnicos) as any[]
      
      vendedores.forEach(v => {
        vendedoresMap.set(v.id, v.nome_completo)
      })
    }

    return NextResponse.json({
      success: true,
      unidade: {
        id: unidade[0].id,
        nome: unidade[0].nome
      },
      oportunidades: oportunidades.map(op => {
        const vendedorId = op.vendedor_id
        const vendedorNome = vendedorId 
          ? (vendedoresMap.get(Number(vendedorId)) || vendedoresMap.get(String(vendedorId)) || 'Sem vendedor')
          : 'Sem vendedor'
        
        return {
          id: op.id,
          nome: op.nome,
          valor: Number(op.valor) || 0,
          data: op.data_criacao,
          dataCriacao: op.data_criacao,
          vendedorId: vendedorId,
          vendedorNome: vendedorNome
        }
      })
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido'
    const errorStack = error instanceof Error ? error.stack : undefined
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao buscar oportunidades abertas',
        error: errorMessage,
        stack: process.env.NODE_ENV === 'development' ? errorStack : undefined
      },
      { status: 500 }
    )
  }
}

