import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, access, constants } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { jwtVerify } from 'jose'
import { executeQuery } from '@/lib/database'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const unidadeId = parseInt(params.id)
    if (isNaN(unidadeId)) {
      return NextResponse.json(
        { success: false, message: 'ID da unidade inválido' },
        { status: 400 }
      )
    }

    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'seu-secret-super-secreto')
    await jwtVerify(token, secret)

    // Validar se unidade existe
    const unidadeExiste = await executeQuery('SELECT id FROM unidades WHERE id = ?', [unidadeId]) as any[]
    if (!unidadeExiste || unidadeExiste.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Unidade não encontrada' },
        { status: 404 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Tipo de arquivo não permitido. Use: JPG, PNG, SVG ou WEBP.' },
        { status: 400 }
      )
    }

    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Tamanho máximo: 2MB' },
        { status: 400 }
      )
    }

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'unidades')

    try {
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true, mode: 0o755 })
      }

      await access(uploadDir, constants.W_OK)
    } catch (mkdirOrPermError) {
      return NextResponse.json(
        {
          success: false,
          message: 'Sem permissão de escrita na pasta public/uploads/unidades. Verifique as permissões no servidor.',
          error: mkdirOrPermError instanceof Error ? mkdirOrPermError.message : 'Permission denied'
        },
        { status: 500 }
      )
    }

    const timestamp = Date.now()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `unidade-${unidadeId}-${timestamp}.${extension}`
    const filePath = join(uploadDir, fileName)

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer, { mode: 0o644 })

    const fileUrl = `/api/uploads/unidades/${fileName}`

    await executeQuery('UPDATE unidades SET imagem = ? WHERE id = ?', [fileUrl, unidadeId])

    return NextResponse.json({
      success: true,
      url: fileUrl,
      message: 'Imagem enviada com sucesso'
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: 'Erro ao fazer upload da imagem',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}


