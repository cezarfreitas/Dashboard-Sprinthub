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

    if (!apiToken || !groupId) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Configuração da API não encontrada. Verifique as variáveis de ambiente.' 
        },
        { status: 500 }
      )
    }

    // Dados mock para teste da interface
    const mockVendedores: SprintHubUser[] = [
      {
        id: 235,
        name: "Alessandra",
        lastName: "Silva",
        email: "alessandra.silva@souatlas.com.br",
        cpf: "123.456.789-01",
        username: "alessandra",
        birthDate: "1983-07-21",
        telephone: "11973902905"
      },
      {
        id: 236,
        name: "Carlos",
        lastName: "Santos",
        email: "carlos.santos@souatlas.com.br",
        cpf: null,
        username: "carlos_santos",
        birthDate: "1990-03-15",
        telephone: "11987654321"
      },
      {
        id: 237,
        name: "Maria",
        lastName: "Oliveira",
        email: "maria.oliveira@souatlas.com.br",
        cpf: "987.654.321-09",
        username: "maria_oliveira",
        birthDate: "1985-12-08",
        telephone: "11912345678"
      },
      {
        id: 238,
        name: "João",
        lastName: "Ferreira",
        email: "joao.ferreira@souatlas.com.br",
        cpf: "456.789.123-45",
        username: "joao_ferreira",
        birthDate: "1988-09-22",
        telephone: "11956781234"
      },
      {
        id: 239,
        name: "Ana",
        lastName: "Costa",
        email: "ana.costa@souatlas.com.br",
        cpf: null,
        username: "ana_costa",
        birthDate: "1992-05-30",
        telephone: "11934567890"
      }
    ]

    console.log('🔍 Buscando vendedores na SprintHub...')

    // Fazer chamada real para a API da SprintHub
    const sprintHubUrl = `https://sprinthub-api-master.sprinthub.app/user?apitoken=${apiToken}&i=${groupId}`
    
    let vendedores: SprintHubUser[] = []
    let isUsingMock = false

    try {
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
        // Fallback para dados mock em caso de erro
        vendedores = mockVendedores
        isUsingMock = true
      } else {
        const data = await response.json()
        vendedores = Array.isArray(data) ? data : []
        console.log('✅ Dados recebidos da SprintHub:', vendedores.length, 'vendedores')
      }
    } catch (fetchError) {
      console.error('❌ Erro de conexão com SprintHub:', fetchError)
      // Fallback para dados mock em caso de erro de conexão
      vendedores = mockVendedores
      isUsingMock = true
    }
    
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
      message: `${vendedores.length} vendedores carregados com sucesso${isUsingMock ? ' (dados mock - API indisponível)' : ''}`
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

    if (!apiToken || !groupId) {
      return NextResponse.json(
        { success: false, message: 'Configuração da API não encontrada' },
        { status: 500 }
      )
    }

    const sprintHubUrl = `https://sprinthub-api-master.sprinthub.app/user?apitoken=${apiToken}&i=${groupId}`
    
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
