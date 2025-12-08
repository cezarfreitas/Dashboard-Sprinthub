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

    // 1. BUSCAR VENDEDORES
    let queryVendedores = `
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
      queryVendedores += ' AND v.unidade_id = ?'
      params.push(parseInt(unidadeId))
    }

    // Filtrar por ativo se fornecido
    if (ativo !== null && ativo !== undefined) {
      queryVendedores += ' AND v.ativo = ?'
      params.push(ativo === 'true' || ativo === '1' ? 1 : 0)
    }

    queryVendedores += ' ORDER BY v.name, v.lastName'

    console.log('🔍 Query Vendedores:', queryVendedores)
    console.log('📦 Params:', params)

    const vendedores = await executeQuery(queryVendedores, params) as Vendedor[]

    console.log(`✅ ${vendedores.length} vendedores encontrados`)

    // 2. BUSCAR UNIDADES COM VENDEDORES
    const unidadeIds = [...new Set(vendedores.map(v => v.unidade_id).filter(id => id !== null))]
    
    let unidades: any[] = []
    if (unidadeIds.length > 0) {
      const queryUnidades = `
        SELECT 
          u.id,
          COALESCE(u.nome, u.name) as nome,
          u.responsavel,
          u.ativo,
          u.grupo_id,
          COUNT(v.id) as total_vendedores,
          SUM(CASE WHEN v.ativo = 1 THEN 1 ELSE 0 END) as vendedores_ativos
        FROM unidades u
        LEFT JOIN vendedores v ON v.unidade_id = u.id
        WHERE u.id IN (${unidadeIds.join(',')})
        GROUP BY u.id, u.nome, u.name, u.responsavel, u.ativo, u.grupo_id
        ORDER BY COALESCE(u.nome, u.name)
      `
      
      console.log('🔍 Query Unidades:', queryUnidades)
      unidades = await executeQuery(queryUnidades)
      console.log(`✅ ${unidades.length} unidades encontradas`)
    }

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
      unidades,
      por_unidade: porUnidade,
      stats,
      message: `${vendedores.length} vendedores encontrados em ${unidades.length} unidades`
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

