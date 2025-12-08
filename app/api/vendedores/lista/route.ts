import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  cpf: string | null
  username: string
  telephone: string | null
  unidade_id: number | null
  unidade_nome: string | null
  ativo: boolean
  status: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const unidadeId = searchParams.get('unidade_id')
    const ativo = searchParams.get('ativo')

    console.log('📋 Lista Vendedores - Parâmetros:', { unidadeId, ativo })

    // Construir query base
    let query = `
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.email,
        v.cpf,
        v.username,
        v.telephone,
        v.unidade_id,
        COALESCE(u.nome, u.name) as unidade_nome,
        v.ativo,
        v.status
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE 1=1
    `

    const params: any[] = []

    // Filtrar por unidade se fornecido
    if (unidadeId && !isNaN(parseInt(unidadeId))) {
      query += ' AND v.unidade_id = ?'
      params.push(parseInt(unidadeId))
    }

    // Filtrar por ativo se fornecido
    if (ativo !== null && ativo !== undefined) {
      query += ' AND v.ativo = ?'
      params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
    }

    query += ' ORDER BY v.name, v.lastName'

    console.log('🔍 Query:', query)
    console.log('📦 Params:', params)

    const vendedores = await executeQuery(query, params) as Vendedor[]

    console.log(`✅ ${vendedores.length} vendedores encontrados`)

    // Agrupar por unidade
    const porUnidade = vendedores.reduce((acc, vendedor) => {
      const unidadeKey = vendedor.unidade_nome || 'Sem Unidade'
      if (!acc[unidadeKey]) {
        acc[unidadeKey] = []
      }
      acc[unidadeKey].push(vendedor)
      return acc
    }, {} as Record<string, Vendedor[]>)

    // Estatísticas
    const stats = {
      total: vendedores.length,
      ativos: vendedores.filter(v => v.ativo).length,
      inativos: vendedores.filter(v => !v.ativo).length,
      com_unidade: vendedores.filter(v => v.unidade_id !== null).length,
      sem_unidade: vendedores.filter(v => v.unidade_id === null).length,
      unidades: Object.keys(porUnidade).length
    }

    return NextResponse.json({
      success: true,
      vendedores,
      por_unidade: porUnidade,
      stats,
      message: `${vendedores.length} vendedores encontrados`
    })

  } catch (error) {
    console.error('❌ Erro ao listar vendedores:', error)
    
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao listar vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

