import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/database'
import { sendEmail, getOTPEmailTemplate } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Gerar código OTP de 6 dígitos
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// POST - Enviar código OTP para email do consultor
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validação de entrada
    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email é obrigatório' },
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

    // Buscar vendedor/consultor no banco por email
    const vendedores = await executeQuery(`
      SELECT 
        v.id,
        v.name,
        v.lastName,
        v.email,
        v.ativo,
        v.status
      FROM vendedores v
      WHERE v.email = ?
      LIMIT 1
    `, [email]) as Array<{
      id: number
      name: string
      lastName: string
      email: string
      ativo: number
      status: string
    }>

    if (vendedores.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Email não encontrado' },
        { status: 404 }
      )
    }

    const vendedor = vendedores[0]

    // Verificar se há um código OTP válido recente (últimos 2 minutos)
    const recentOTP = await executeQuery(`
      SELECT id, created_at
      FROM otp_codes
      WHERE email = ?
        AND verified = 0
        AND expires_at > NOW()
        AND created_at > DATE_SUB(NOW(), INTERVAL 2 MINUTE)
      ORDER BY created_at DESC
      LIMIT 1
    `, [email]) as Array<{ id: number; created_at: Date }>

    if (recentOTP.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Um código já foi enviado recentemente. Por favor, aguarde 2 minutos antes de solicitar um novo código.',
          retryAfter: 120
        },
        { status: 429 }
      )
    }

    // Gerar novo código OTP
    const otpCode = generateOTP()
    const expiresInMinutes = 5
    
    // Obter informações da requisição
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Salvar código no banco de dados
    await executeQuery(`
      INSERT INTO otp_codes (
        email,
        code,
        vendedor_id,
        expires_at,
        ip_address,
        user_agent
      ) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), ?, ?)
    `, [email, otpCode, vendedor.id, expiresInMinutes, ipAddress, userAgent])

    // Enviar email com o código OTP
    const userName = `${vendedor.name} ${vendedor.lastName}`
    const htmlTemplate = await getOTPEmailTemplate(otpCode, userName, expiresInMinutes)
    
    const emailResult = await sendEmail({
      to: email,
      subject: `Código de Acesso - ${otpCode}`,
      html: htmlTemplate
    })

    if (!emailResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao enviar email. Verifique as configurações de email.',
          error: emailResult.error?.message
        },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Código enviado com sucesso! Verifique seu email.',
      expiresIn: expiresInMinutes * 60
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

