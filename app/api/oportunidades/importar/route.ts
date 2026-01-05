import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

interface OportunidadeImport {
  id?: string | number
  createDate?: string
  gain_date?: string
  lost_date?: string
  title: string
  value?: number
  status?: 'open' | 'won' | 'lost'
  user?: string
  unidade?: string
  loss_reason?: string
  gain_reason?: string
}

// Gerar ID único no formato YYYYMMDD + código único de 6 dígitos
function generateUniqueId(): bigint {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  
  // Gerar código único de 6 dígitos baseado em timestamp + random
  const timestamp = now.getTime() % 1000000 // últimos 6 dígitos do timestamp
  const random = Math.floor(Math.random() * 1000) // 3 dígitos aleatórios
  const uniqueCode = String((timestamp + random) % 1000000).padStart(6, '0')
  
  // Formato: YYYYMMDD + 6 dígitos = 14 dígitos total
  const idString = `${year}${month}${day}${uniqueCode}`
  return BigInt(idString)
}

// Converter string de data para formato MySQL
function parseDate(dateStr: string | undefined | null): string | null {
  if (!dateStr) return null
  
  try {
    // Se já é uma data ISO
    if (dateStr.includes('T')) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 19).replace('T', ' ')
      }
    }
    
    // Formato DD/MM/YYYY
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        const year = parseInt(parts[2], 10)
        const date = new Date(year, month - 1, day)
        if (!isNaN(date.getTime())) {
          return date.toISOString().slice(0, 19).replace('T', ' ')
        }
      }
    }
    
    // Formato YYYY-MM-DD
    if (dateStr.includes('-')) {
      const date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 19).replace('T', ' ')
      }
    }
    
    return null
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token_sistema')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { success: false, message: 'Token inválido' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { oportunidades } = body as { oportunidades: OportunidadeImport[] }

    if (!oportunidades || !Array.isArray(oportunidades) || oportunidades.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhuma oportunidade para importar' },
        { status: 400 }
      )
    }

    const errors: { row: number; message: string }[] = []
    let imported = 0
    let failed = 0
    
    // Tamanho do lote para processamento
    const BATCH_SIZE = 100

    // Processar cada oportunidade
    for (let i = 0; i < oportunidades.length; i++) {
      const op = oportunidades[i]
      
      try {
        // Validar título obrigatório
        if (!op.title || op.title.trim() === '') {
          errors.push({ row: i + 1, message: 'Título é obrigatório' })
          failed++
          continue
        }

        // Usar ID da planilha ou gerar ID único
        let uniqueId: bigint | string
        if (op.id && String(op.id).trim() !== '') {
          // Usar ID fornecido (pode ser string ou número)
          uniqueId = String(op.id).trim()
        } else {
          // Gerar ID único automaticamente
          uniqueId = generateUniqueId()
        }
        
        // Determinar status
        let status = op.status || 'open'
        if (!op.status) {
          if (op.gain_date) {
            status = 'won'
          } else if (op.lost_date) {
            status = 'lost'
          }
        }

        // Converter datas
        const createDate = parseDate(op.createDate) || new Date().toISOString().slice(0, 19).replace('T', ' ')
        const gainDate = status === 'won' ? parseDate(op.gain_date) : null
        const lostDate = status === 'lost' ? parseDate(op.lost_date) : null

        // Converter valor
        let value = 0
        if (op.value !== undefined && op.value !== null) {
          value = typeof op.value === 'number' ? op.value : parseFloat(String(op.value).replace(/[^\d.,]/g, '').replace(',', '.')) || 0
        }

        // Inserir no banco
        const insertQuery = `
          INSERT INTO oportunidades (
            id,
            title,
            value,
            status,
            user,
            sale_channel,
            loss_reason,
            gain_reason,
            gain_date,
            lost_date,
            createDate,
            updateDate,
            created_at,
            archived
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), 0)
        `

        await executeQuery(insertQuery, [
          uniqueId.toString(),
          op.title.trim(),
          value,
          status,
          op.user ? op.user.trim() : null,
          op.unidade ? op.unidade.trim() : null,
          status === 'lost' ? (op.loss_reason || null) : null,
          status === 'won' ? (op.gain_reason || null) : null,
          gainDate,
          lostDate,
          createDate
        ])

        imported++
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido'
        errors.push({ row: i + 1, message: errorMessage })
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${imported} importadas, ${failed} falharam`,
      imported,
      failed,
      errors: errors.slice(0, 50) // Limitar erros retornados
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao processar importação',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

