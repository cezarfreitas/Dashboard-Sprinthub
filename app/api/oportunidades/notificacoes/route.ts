import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// GET - Buscar notificações de oportunidades
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '20') || 20))

    // Buscar notificações ordenadas por consultado_em (mais recente primeiro)
    const notificacoes = await executeQuery(`
      SELECT 
        id,
        oportunidade_id,
        nome,
        valor,
        status,
        data_criacao,
        vendedor,
        unidade,
        cor,
        consultado_em
      FROM notificacao_oportunidades
      ORDER BY consultado_em DESC
      LIMIT ${limit}
    `) as any[]

    return NextResponse.json({
      success: true,
      historico: notificacoes.map(item => {
        // Função helper para converter Date para formato MySQL (local time)
        const formatDateToMySQL = (date: Date | string | null | undefined): string | null => {
          if (!date) return null
          
          if (date instanceof Date) {
            // Converter para formato MySQL usando timezone local
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const seconds = String(date.getSeconds()).padStart(2, '0')
            return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
          }
          
          if (typeof date === 'string') {
            return date.trim() || null
          }
          
          return null
        }
        
        // Converter consultado_em para string no formato MySQL (local time)
        const consultadoEm = formatDateToMySQL(item.consultado_em)
        
        // Converter data_criacao também
        const dataCriacao = formatDateToMySQL(item.data_criacao)
        
        return {
          id: item.oportunidade_id,
          nome: item.nome,
          valor: parseFloat(item.valor || 0),
          status: item.status || 'open',
          dataCriacao: dataCriacao,
          vendedor: item.vendedor || 'Sem vendedor',
          unidade: item.unidade || 'Sem unidade',
          cor: item.cor || null,
          consultadoEm: consultadoEm
        }
      })
    })

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao buscar notificações de oportunidades',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

