/**
 * CSRF Token Generation Endpoint
 * Gera tokens CSRF para proteção contra ataques CSRF
 */

import { NextResponse } from 'next/server'
import { generateCSRFToken } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const token = generateCSRFToken()
    
    return NextResponse.json({
      success: true,
      token,
      expiresIn: 3600 // 1 hora em segundos
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao gerar token CSRF'
      },
      { status: 500 }
    )
  }
}

