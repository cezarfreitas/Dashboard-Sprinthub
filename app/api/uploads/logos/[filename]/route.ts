import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// GET - Servir arquivo de logotipo
export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  try {
    const { filename } = params

    // Validar nome do arquivo (prevenir path traversal)
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, message: 'Nome de arquivo inválido' },
        { status: 400 }
      )
    }

    // Caminho do arquivo
    const filePath = join(process.cwd(), 'public', 'uploads', 'logos', filename)

    // Verificar se o arquivo existe
    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    // Ler arquivo
    const fileBuffer = await readFile(filePath)

    // Determinar content-type baseado na extensão
    const extension = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'webp': 'image/webp',
      'gif': 'image/gif'
    }
    const contentType = contentTypeMap[extension || ''] || 'application/octet-stream'

    // Retornar arquivo com headers apropriados
    // Converter Buffer para Uint8Array para compatibilidade com NextResponse
    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString()
      }
    })

  } catch (error) {
    console.error('Erro ao servir arquivo de logotipo:', error)
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao servir arquivo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

