import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

// Máximo de tentativas permitidas
const MAX_ATTEMPTS = 5

// POST - Verificar código OTP
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = body

    // Validação de entrada
    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'Email e código são obrigatórios' },
        { status: 400 }
      )
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Email inválido' },
        { status: 400 }
      )
    }

    // Validar formato do código (6 dígitos)
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { success: false, message: 'Código deve conter 6 dígitos' },
        { status: 400 }
      )
    }

    // Buscar código OTP no banco
    const otpRecords = await executeQuery(`
      SELECT 
        id,
        vendedor_id,
        expires_at,
        verified,
        attempts
      FROM otp_codes
      WHERE email = ?
        AND code = ?
      ORDER BY created_at DESC
      LIMIT 1
    `, [email, code]) as Array<{
      id: number
      vendedor_id: number
      expires_at: Date
      verified: number
      attempts: number
    }>

    if (otpRecords.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Código inválido ou expirado' },
        { status: 401 }
      )
    }

    const otpRecord = otpRecords[0]

    // Verificar se o código já foi usado
    if (otpRecord.verified === 1) {
      return NextResponse.json(
        { success: false, message: 'Este código já foi utilizado' },
        { status: 401 }
      )
    }

    // Verificar se expirou
    const now = new Date()
    const expiresAt = new Date(otpRecord.expires_at)
    if (now > expiresAt) {
      return NextResponse.json(
        { success: false, message: 'Código expirado. Solicite um novo código' },
        { status: 401 }
      )
    }

    // Verificar número de tentativas
    if (otpRecord.attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Número máximo de tentativas excedido. Solicite um novo código' 
        },
        { status: 429 }
      )
    }

    // Incrementar número de tentativas
    await executeQuery(`
      UPDATE otp_codes
      SET attempts = attempts + 1
      WHERE id = ?
    `, [otpRecord.id])

    // Buscar dados completos do vendedor/consultor
    const vendedores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.username,
        v.email,
        v.telephone,
        v.ativo,
        v.status,
        v.unidade_id,
        u.id as unidade_id_join,
        COALESCE(u.name, u.nome) as unidade_nome,
        u.responsavel as unidade_responsavel
      FROM vendedores v
      LEFT JOIN unidades u ON v.unidade_id = u.id
      WHERE v.id = ?
      LIMIT 1
    `, [otpRecord.vendedor_id]) as Array<{
      id: number
      name: string
      lastName: string
      username: string
      email: string
      telephone: string
      ativo: number
      status: string
      unidade_id: number | null
      unidade_id_join: number | null
      unidade_nome: string | null
      unidade_responsavel: string | null
    }>

    if (vendedores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Vendedor não encontrado' },
        { status: 404 }
      )
    }

    const vendedor = vendedores[0]

    // Marcar código como verificado
    await executeQuery(`
      UPDATE otp_codes
      SET verified = 1,
          verified_at = NOW()
      WHERE id = ?
    `, [otpRecord.id])

    // Retornar dados do consultor autenticado
    return NextResponse.json({
      success: true,
      message: 'Login realizado com sucesso',
      consultor: {
        id: vendedor.id,
        name: vendedor.name,
        lastName: vendedor.lastName,
        username: vendedor.username,
        email: vendedor.email,
        telephone: vendedor.telephone,
        unidade_id: vendedor.unidade_id || vendedor.unidade_id_join || null,
        unidade_nome: vendedor.unidade_nome || null,
        unidade_responsavel: vendedor.unidade_responsavel || null
      }
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

