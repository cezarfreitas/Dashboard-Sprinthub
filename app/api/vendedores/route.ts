import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SprintHubUser {
  id: number
  name: string
  lastName: string
  email: string
  cpf: string | null
  username: string
  birthDate: string
  telephone: string
}

export async function GET(request: NextRequest) {
  try {
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

    console.log('🔍 Buscando vendedores na SprintHub...')

    const sprintHubUrl = `${urlPatch}/user?apitoken=${apiToken}&i=${groupId}`
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-by-INTELI/1.0'
      },
      // Cache por 5 minutos
      next: { revalidate: 300 }
    })

    if (!response.ok) {
      console.error('❌ Erro na API SprintHub:', response.status, response.statusText)
      return NextResponse.json(
        { 
          success: false, 
          message: `Erro na API SprintHub: ${response.status} ${response.statusText}` 
        },
        { status: response.status }
      )
    }

    const data = await response.json()
    const vendedores = Array.isArray(data) ? data : []
    console.log('✅ Dados recebidos da SprintHub:', vendedores.length, 'vendedores')
    
    // Estatísticas
    const stats = {
      total: vendedores.length,
      comTelefone: vendedores.filter(v => v.telephone).length,
      comCPF: vendedores.filter(v => v.cpf).length,
      ultimaAtualizacao: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      vendedores,
      stats,
      message: `${vendedores.length} vendedores carregados com sucesso`
    })

  } catch (error) {
    console.error('❌ Erro ao buscar vendedores:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar vendedores',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

// Endpoint para buscar vendedor específico
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { vendedorId } = body

    if (!vendedorId) {
      return NextResponse.json(
        { success: false, message: 'ID do vendedor é obrigatório' },
        { status: 400 }
      )
    }

    // Buscar todos os vendedores e filtrar pelo ID
    const apiToken = process.env.APITOKEN
    const groupId = process.env.I
    const urlPatch = process.env.URLPATCH

    if (!apiToken || !groupId || !urlPatch) {
      return NextResponse.json(
        { success: false, message: 'Configuração da API não encontrada (APITOKEN, I, URLPATCH)' },
        { status: 500 }
      )
    }

    const sprintHubUrl = `${urlPatch}/user?apitoken=${apiToken}&i=${groupId}`
    
    const response = await fetch(sprintHubUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: 'Erro na API SprintHub' },
        { status: response.status }
      )
    }

    const data = await response.json()
    const vendedores: SprintHubUser[] = Array.isArray(data) ? data : []
    
    const vendedor = vendedores.find(v => v.id === parseInt(vendedorId))

    if (!vendedor) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      vendedor,
      message: 'Vendedor encontrado com sucesso'
    })

  } catch (error) {
    console.error('❌ Erro ao buscar vendedor específico:', error)
    
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
