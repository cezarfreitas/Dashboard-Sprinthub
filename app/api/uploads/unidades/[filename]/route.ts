import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

// GET - Servir arquivo de imagem da unidade
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

    const filePath = join(process.cwd(), 'public', 'uploads', 'unidades', filename)

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { success: false, message: 'Arquivo não encontrado' },
        { status: 404 }
      )
    }

    const fileBuffer = await readFile(filePath)

    const extension = filename.split('.').pop()?.toLowerCase()
    const contentTypeMap: Record<string, string> = {
      svg: 'image/svg+xml',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif'
    }
    const contentType = contentTypeMap[extension || ''] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Length': fileBuffer.length.toString(),
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    })
  } catch (error) {
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


