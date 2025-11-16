import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

// GET - Exportar matriz de metas para Excel
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const ano = searchParams.get('ano') || new Date().getFullYear().toString()

    // Buscar unidades com campo users (JSON com IDs dos vendedores)
    const unidades = await executeQuery(`
      SELECT id, COALESCE(nome, name, 'Sem Nome') as nome, users FROM unidades WHERE ativo = 1 ORDER BY id
    `) as any[]

    // Buscar todos os vendedores ativos
    const todosVendedores = await executeQuery(`
      SELECT id, name, lastName, username FROM vendedores WHERE ativo = 1 AND status = 'active' ORDER BY name, lastName
    `) as any[]

    // Criar array de vendedores com suas unidades (baseado no campo users de cada unidade)
    const vendedores: any[] = []
    
    for (const unidade of unidades) {
      let userIds: number[] = []
      
      // Parsear o campo users (JSON)
      if (unidade.users) {
        try {
          userIds = typeof unidade.users === 'string' ? JSON.parse(unidade.users) : unidade.users
        } catch (e) {
          console.error('Erro ao parsear users da unidade', unidade.id, e)
          userIds = []
        }
      }
      
      // Se a unidade tem vendedores definidos, adicionar cada um
      if (userIds && userIds.length > 0) {
        for (const vendedorId of userIds) {
          const vendedor = todosVendedores.find(v => v.id === vendedorId)
          if (vendedor) {
            vendedores.push({
              id: vendedor.id,
              name: vendedor.name,
              lastName: vendedor.lastName,
              username: vendedor.username,
              unidade_id: unidade.id,
              unidade_nome: unidade.nome
            })
          }
        }
      }
    }

    // Buscar metas existentes
    const metas = await executeQuery(`
      SELECT 
        m.vendedor_id,
        m.unidade_id,
        m.mes,
        m.meta_valor,
        v.name as vendedor_nome,
        v.lastName as vendedor_lastName,
        u.nome as unidade_nome
      FROM metas_mensais m
      JOIN vendedores v ON m.vendedor_id = v.id
      JOIN unidades u ON m.unidade_id = u.id
      WHERE m.ano = ? AND m.status = 'ativa'
      ORDER BY u.nome, v.name, m.mes
    `, [parseInt(ano)]) as any[]

    // Criar matriz de dados
    const meses = [
      { numero: 1, nome: 'Janeiro' },
      { numero: 2, nome: 'Fevereiro' },
      { numero: 3, nome: 'Março' },
      { numero: 4, nome: 'Abril' },
      { numero: 5, nome: 'Maio' },
      { numero: 6, nome: 'Junho' },
      { numero: 7, nome: 'Julho' },
      { numero: 8, nome: 'Agosto' },
      { numero: 9, nome: 'Setembro' },
      { numero: 10, nome: 'Outubro' },
      { numero: 11, nome: 'Novembro' },
      { numero: 12, nome: 'Dezembro' }
    ]

    // Preparar dados para Excel
    const excelData = []

    // Cabeçalho
    const header = [
      'ID Vendedor',
      'Nome Vendedor',
      'ID Unidade',
      'Nome Unidade',
      'Ano',
      ...meses.map(mes => mes.nome)
    ]
    excelData.push(header)

    // Dados dos vendedores
    vendedores.forEach(vendedor => {
      const row = [
        vendedor.id,
        `${vendedor.name} ${vendedor.lastName}`,
        vendedor.unidade_id,
        vendedor.unidade_nome,
        parseInt(ano)
      ]

      // Adicionar valores dos meses (formatados com vírgula)
      meses.forEach(mes => {
        const meta = metas.find(m => 
          m.vendedor_id === vendedor.id && 
          m.unidade_id === vendedor.unidade_id && 
          m.mes === mes.numero
        )
        const valor = meta ? parseFloat(meta.meta_valor.toString()) : 0
        // Formatar com vírgula como separador decimal (formato brasileiro)
        const valorFormatado = isNaN(valor) ? '0,00' : valor.toFixed(2).replace('.', ',')
        row.push(valorFormatado)
      })

      excelData.push(row)
    })

    // Criar workbook
    const wb = XLSX.utils.book_new()
    
    // Criar worksheet
    const ws = XLSX.utils.aoa_to_sheet(excelData)

    // Configurar larguras das colunas
    const colWidths = [
      { wch: 12 }, // ID Vendedor
      { wch: 20 }, // Nome
      { wch: 12 }, // ID Unidade
      { wch: 20 }, // Nome Unidade
      { wch: 8 },  // Ano
      ...meses.map(() => ({ wch: 12 })) // Meses
    ]
    ws['!cols'] = colWidths

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, `Metas ${ano}`)

    // Gerar buffer do Excel
    const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

    // Configurar headers para download
    const filename = `matriz-metas-${ano}.xlsx`
    
    return new NextResponse(excelBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': excelBuffer.length.toString(),
      },
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao exportar Excel',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
