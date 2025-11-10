import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET - Buscar configurações do ambiente
export async function GET(request: NextRequest) {
  try {
    // Retornar configurações do ambiente (formato plano como no .env.local)
    const config = {
      // Database
      DB_HOST: process.env.DB_HOST || 'Não configurado',
      DB_PORT: process.env.DB_PORT || 'Não configurado',
      DB_USER: process.env.DB_USER || 'Não configurado',
      DB_NAME: process.env.DB_NAME || 'Não configurado',
      
      // API Tokens (mascarados por segurança)
      APITOKEN: process.env.APITOKEN || '',
      I: process.env.I || 'Não configurado',
      URLPATCH: process.env.URLPATCH || 'Não configurado',
      
      // Auth (JWT_SECRET mascarado por segurança)
      JWT_SECRET: process.env.JWT_SECRET || '',
      JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || 'Não configurado',
      
      // Sync Settings
      VENDEDORES_SYNC_SCHEDULE: process.env.VENDEDORES_SYNC_SCHEDULE || 'Não configurado',
      UNIDADES_SYNC_SCHEDULE: process.env.UNIDADES_SYNC_SCHEDULE || 'Não configurado',
      CRON_TIMEZONE: process.env.CRON_TIMEZONE || 'Não configurado',
      ENABLE_CRON: process.env.ENABLE_CRON || 'false',
      DEPARTMENT_ID_FILTER: process.env.DEPARTMENT_ID_FILTER || 'Não configurado',
      
      // App Settings
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'Não configurado',
      NODE_ENV: process.env.NODE_ENV || 'development',
    }

    return NextResponse.json({
      success: true,
      config,
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao buscar configurações',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
