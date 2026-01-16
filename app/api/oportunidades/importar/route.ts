import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

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
function parseDate(dateStr: string | undefined | null | number): string | null {
  if (dateStr === null || dateStr === undefined || dateStr === '') return null
  
  // Se for número, pode ser data serial do Excel (dias desde 1900-01-01)
  if (typeof dateStr === 'number') {
    // Excel data serial: 1 = 1900-01-01
    // JavaScript Date usa milissegundos desde 1970-01-01
    // Converter: (serial - 1) * 86400000 + offset para 1970
    const excelEpoch = new Date(1899, 11, 30) // 1899-12-30 (Excel epoch)
    const date = new Date(excelEpoch.getTime() + (dateStr - 1) * 86400000)
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day} 00:00:00`
    }
    return null
  }
  
  // Remover espaços e converter para string
  const dateString = String(dateStr).trim()
  if (!dateString || dateString === '' || dateString === 'null' || dateString === 'undefined') {
    return null
  }
  
  try {
    // PRIORIDADE 1: Formato DD/MM/YYYY ou DD/MM/YY (formato brasileiro mais comum)
    if (dateString.includes('/')) {
      const parts = dateString.split('/').map(p => p.trim())
      if (parts.length === 3) {
        const part1 = parseInt(parts[0], 10)
        const part2 = parseInt(parts[1], 10)
        let year = parseInt(parts[2], 10)
        
        // Se o ano tem apenas 2 dígitos, converter para 4 dígitos
        if (year < 100) {
          // Assumir que anos 00-50 são 2000-2050, e anos 51-99 são 1951-1999
          year = year <= 50 ? 2000 + year : 1900 + year
        }
        
        // Detectar formato: DD/MM/YY ou M/D/YY (americano)
        // Se part1 > 12, é formato brasileiro (DD/MM)
        // Se part1 <= 12 e part2 > 12, é formato americano (M/D)
        // Se ambos <= 12, tentar ambos os formatos
        let day: number, month: number
        
        if (part1 > 12) {
          // Formato brasileiro: DD/MM/YY
          day = part1
          month = part2
        } else if (part2 > 12) {
          // Formato americano: M/D/YY
          month = part1
          day = part2
        } else {
          // Ambos <= 12, tentar formato brasileiro primeiro (mais comum no Brasil)
          // Se não funcionar, tentar americano
          day = part1
          month = part2
          
          // Validar se é data válida no formato brasileiro
          const dateBR = new Date(year, month - 1, day)
          if (isNaN(dateBR.getTime()) || 
              dateBR.getFullYear() !== year || 
              dateBR.getMonth() !== month - 1 || 
              dateBR.getDate() !== day) {
            // Tentar formato americano
            month = part1
            day = part2
          }
        }
        
        // Validar valores
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) && 
            day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day)
          // Verificar se a data é válida e corresponde aos valores fornecidos
          if (!isNaN(date.getTime()) && 
              date.getFullYear() === year && 
              date.getMonth() === month - 1 && 
              date.getDate() === day) {
            const yearStr = String(year)
            const monthStr = String(month).padStart(2, '0')
            const dayStr = String(day).padStart(2, '0')
            const result = `${yearStr}-${monthStr}-${dayStr} 00:00:00`
            console.log(`✅ Data parseada (${part1 > 12 ? 'DD/MM/YY' : 'M/D/YY'}): "${dateString}" -> "${result}"`)
            return result
          }
        }
        console.warn(`⚠️ Data inválida: "${dateString}"`)
      }
    }
    
    // PRIORIDADE 2: Se já é uma data ISO, verificar se foi interpretada incorretamente
    if (dateString.includes('T')) {
      const date = new Date(dateString)
      if (!isNaN(date.getTime())) {
        const year = date.getFullYear()
        const timestampMs = date.getTime() // timestamp em milissegundos
        
        // Se o timestamp é muito pequeno e o ano é 1970-1971, pode ser número serial do Excel
        // Números seriais do Excel para datas recentes (2000-2025) estão entre ~36526 e ~45658
        // Se foi interpretado incorretamente como milissegundos desde epoch Unix, seria entre ~36526 e ~45658 ms
        // Detectamos quando o timestamp está entre 30000 e 100000 ms (números seriais do Excel típicos)
        if (timestampMs > 30000 && timestampMs < 100000 && year >= 1970 && year <= 1971) {
          // Provavelmente é um número serial do Excel que foi interpretado como milissegundos Unix
          // O número serial do Excel está diretamente no timestamp em milissegundos
          // Usar UTC para evitar problemas de timezone
          const excelSerial = Math.round(timestampMs)
          // Excel epoch: 1899-12-30 (usando UTC)
          const excelEpochUTC = Date.UTC(1899, 11, 30)
          const correctDate = new Date(excelEpochUTC + (excelSerial - 1) * 86400000)
          if (!isNaN(correctDate.getTime())) {
            const correctYear = correctDate.getUTCFullYear()
            const correctMonth = String(correctDate.getUTCMonth() + 1).padStart(2, '0')
            const correctDay = String(correctDate.getUTCDate()).padStart(2, '0')
            console.log(`✅ Data corrigida de serial Excel: "${dateString}" (timestamp: ${timestampMs}ms, serial: ${excelSerial}) -> "${correctYear}-${correctMonth}-${correctDay} 00:00:00"`)
            return `${correctYear}-${correctMonth}-${correctDay} 00:00:00`
          }
        }
        
        // Se o ano está muito antigo (antes de 1950), pode ter sido interpretado incorretamente
        if (year < 1950) {
          console.warn(`⚠️ Data com ano suspeito (${year}): "${dateString}" - pode ter sido interpretada incorretamente`)
        }
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const hours = String(date.getHours()).padStart(2, '0')
        const minutes = String(date.getMinutes()).padStart(2, '0')
        const seconds = String(date.getSeconds()).padStart(2, '0')
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
      }
    }
    
    // PRIORIDADE 3: Formato YYYY-MM-DD ou YY-MM-DD
    if (dateString.includes('-')) {
      const parts = dateString.split('-').map(p => p.trim())
      if (parts.length === 3) {
        let year = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10)
        const day = parseInt(parts[2], 10)
        
        // Se o ano tem apenas 2 dígitos
        if (year < 100) {
          year = year <= 50 ? 2000 + year : 1900 + year
        }
        
        // Validar valores
        if (!isNaN(day) && !isNaN(month) && !isNaN(year) &&
            day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1900 && year <= 2100) {
          const date = new Date(year, month - 1, day)
          if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            const yearStr = String(year)
            const monthStr = String(month).padStart(2, '0')
            const dayStr = String(day).padStart(2, '0')
            return `${yearStr}-${monthStr}-${dayStr} 00:00:00`
          }
        }
      }
    }
    
    // PRIORIDADE 4: Tentar parsear como número serial do Excel (pode vir como string numérica)
    // Números seriais do Excel para datas entre 2000-2025 estão entre ~36526 e ~45658
    const numValue = parseFloat(dateString)
    if (!isNaN(numValue) && numValue > 0) {
      // Se for um número no range de datas do Excel (36526 a 45658 para 2000-2025)
      if (numValue >= 36526 && numValue <= 50000) {
        // Número serial do Excel (dias desde 1900-01-01)
        // Usar UTC para evitar problemas de timezone
        const excelEpochUTC = Date.UTC(1899, 11, 30) // 1899-12-30 (Excel epoch)
        const date = new Date(excelEpochUTC + (numValue - 1) * 86400000)
        if (!isNaN(date.getTime())) {
          const year = date.getUTCFullYear()
          const month = String(date.getUTCMonth() + 1).padStart(2, '0')
          const day = String(date.getUTCDate()).padStart(2, '0')
          console.log(`✅ Data serial do Excel parseada: "${dateString}" (${numValue}) -> "${year}-${month}-${day} 00:00:00"`)
          return `${year}-${month}-${day} 00:00:00`
        }
      } else if (numValue > 1000000000 && numValue < 1000000000000) {
        // Timestamp Unix em milissegundos
        const date = new Date(numValue)
        if (!isNaN(date.getTime())) {
          const year = date.getFullYear()
          const month = String(date.getMonth() + 1).padStart(2, '0')
          const day = String(date.getDate()).padStart(2, '0')
          const hours = String(date.getHours()).padStart(2, '0')
          const minutes = String(date.getMinutes()).padStart(2, '0')
          const seconds = String(date.getSeconds()).padStart(2, '0')
          return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
        }
      }
    }
    
    const jsDate = new Date(dateString)
    if (!isNaN(jsDate.getTime())) {
      const year = jsDate.getFullYear()
      // Se o ano está muito antigo, pode ter sido interpretado incorretamente
      if (year < 1950) {
        console.warn(`⚠️ Data com ano suspeito (${year}): "${dateString}"`)
      }
      const month = String(jsDate.getMonth() + 1).padStart(2, '0')
      const day = String(jsDate.getDate()).padStart(2, '0')
      const hours = String(jsDate.getHours()).padStart(2, '0')
      const minutes = String(jsDate.getMinutes()).padStart(2, '0')
      const seconds = String(jsDate.getSeconds()).padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
    
    console.warn(`⚠️ Não foi possível parsear data: "${dateString}"`)
    return null
  } catch (error) {
    console.error('❌ Erro ao parsear data:', dateStr, error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação - aceitar tanto auth-token (sistema) quanto auth_token_sistema
    const cookieStore = await cookies()
    const token = cookieStore.get('auth-token')?.value || cookieStore.get('auth_token_sistema')?.value
    
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autorizado' },
        { status: 401 }
      )
    }
    
    // Tentar verificar com verifyToken primeiro (para tokens do sistema antigo)
    let decoded = verifyToken(token)
    
    // Se não funcionou, tentar verificar com jose (para tokens do sistema novo)
    if (!decoded) {
      try {
        const secret = new TextEncoder().encode(
          process.env.JWT_SECRET || 'seu-secret-super-secreto'
        )
        const { payload } = await jwtVerify(token, secret)
        decoded = payload as any
      } catch (error) {
        // Token inválido
        decoded = null
      }
    }
    
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
    const BATCH_SIZE = 300

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

        // Converter datas - usar formato MySQL diretamente
        console.log(`📅 Processando datas para oportunidade ${uniqueId}:`)
        console.log(`   createDate original: "${op.createDate}" (tipo: ${typeof op.createDate})`)
        
        const parsedCreateDate = parseDate(op.createDate)
        console.log(`   createDate parseada: "${parsedCreateDate}"`)
        
        const createDate = parsedCreateDate || (() => {
          const now = new Date()
          const year = now.getFullYear()
          const month = String(now.getMonth() + 1).padStart(2, '0')
          const day = String(now.getDate()).padStart(2, '0')
          const defaultDate = `${year}-${month}-${day} 00:00:00`
          console.log(`   createDate usando padrão: "${defaultDate}"`)
          return defaultDate
        })()
        
        console.log(`   createDate final: "${createDate}"`)
        const gainDate = status === 'won' ? parseDate(op.gain_date) : null
        const lostDate = status === 'lost' ? parseDate(op.lost_date) : null

        // Converter valor - lidar com formatos como "R$ 200,00", "200,00", "200.00", etc.
        let value = 0
        if (op.value !== undefined && op.value !== null) {
          if (typeof op.value === 'number') {
            value = op.value
          } else {
            const valueStr = String(op.value).trim()
            // Remover "R$", espaços e outros caracteres não numéricos, exceto vírgula e ponto
            const cleaned = valueStr.replace(/[^\d.,]/g, '')
            // Se tem vírgula, assumir formato brasileiro (vírgula como decimal)
            // Se tem ponto e não vírgula, assumir formato americano
            if (cleaned.includes(',') && !cleaned.includes('.')) {
              // Formato brasileiro: 200,00
              value = parseFloat(cleaned.replace(',', '.')) || 0
            } else if (cleaned.includes('.') && !cleaned.includes(',')) {
              // Formato americano: 200.00
              value = parseFloat(cleaned) || 0
            } else if (cleaned.includes(',') && cleaned.includes('.')) {
              // Formato com milhares: 1.200,50 ou 1,200.50
              // Se a vírgula está depois do ponto, é formato brasileiro
              const lastComma = cleaned.lastIndexOf(',')
              const lastDot = cleaned.lastIndexOf('.')
              if (lastComma > lastDot) {
                // Formato brasileiro: 1.200,50
                value = parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0
              } else {
                // Formato americano: 1,200.50
                value = parseFloat(cleaned.replace(/,/g, '')) || 0
              }
            } else {
              // Apenas números
              value = parseFloat(cleaned) || 0
            }
          }
        }

        // Usar valores diretamente da planilha sem fazer buscas ou conversões
        // IMPORTANTE: Não fazer busca de vendedores, usar exatamente o valor da planilha
        const userValue = op.user && String(op.user).trim() !== '' ? String(op.user).trim() : null
        
        // Converter loss_reason e gain_reason para string (pode vir como número da planilha)
        const lossReason = op.loss_reason !== undefined && op.loss_reason !== null && String(op.loss_reason).trim() !== '' 
          ? String(op.loss_reason).trim() 
          : null
        const gainReason = op.gain_reason !== undefined && op.gain_reason !== null && String(op.gain_reason).trim() !== '' 
          ? String(op.gain_reason).trim() 
          : null

        // Inserir ou atualizar no banco (upsert)
        const upsertQuery = `
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
          ON DUPLICATE KEY UPDATE
            title = VALUES(title),
            value = VALUES(value),
            status = VALUES(status),
            user = VALUES(user),
            sale_channel = VALUES(sale_channel),
            loss_reason = VALUES(loss_reason),
            gain_reason = VALUES(gain_reason),
            gain_date = VALUES(gain_date),
            lost_date = VALUES(lost_date),
            createDate = VALUES(createDate),
            updateDate = NOW(),
            archived = VALUES(archived)
        `

        await executeQuery(upsertQuery, [
          uniqueId.toString(),
          op.title.trim(),
          value,
          status,
          userValue,
          op.unidade ? op.unidade.trim() : null,
          status === 'lost' ? lossReason : null,
          status === 'won' ? gainReason : null,
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
      message: `Importação concluída: ${imported} processadas (inseridas ou atualizadas), ${failed} falharam`,
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