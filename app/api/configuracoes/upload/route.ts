import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir, access, constants } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { jwtVerify } from 'jose'

export const dynamic = 'force-dynamic'

// POST - Upload de logotipo
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Não autenticado' },
        { status: 401 }
      )
    }

    const secret = new TextEncoder().encode(
      process.env.JWT_SECRET || 'seu-secret-super-secreto'
    )

    await jwtVerify(token, secret)

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: 'Tipo de arquivo não permitido. Use: JPG, PNG, SVG ou WEBP' },
        { status: 400 }
      )
    }

    // Validar tamanho (máximo 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Tamanho máximo: 2MB' },
        { status: 400 }
      )
    }

    // Criar diretório se não existir
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'logos')
    
    try {
      if (!existsSync(uploadDir)) {
        await mkdir(uploadDir, { recursive: true, mode: 0o755 })
      }
      
      // Verificar permissões de escrita
      try {
        await access(uploadDir, constants.W_OK)
      } catch (permError) {
        console.error('Sem permissão de escrita no diretório:', uploadDir)
        console.error('process.cwd():', process.cwd())
        return NextResponse.json(
          { 
            success: false, 
            message: 'Sem permissão de escrita na pasta public/uploads/logos. Verifique as permissões no servidor.',
            error: 'Permission denied'
          },
          { status: 500 }
        )
      }
    } catch (mkdirError) {
      console.error('Erro ao criar/verificar diretório de upload:', mkdirError)
      console.error('Caminho tentado:', uploadDir)
      console.error('process.cwd():', process.cwd())
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao criar diretório de upload. Verifique as permissões da pasta public/uploads.',
          error: mkdirError instanceof Error ? mkdirError.message : 'Erro desconhecido'
        },
        { status: 500 }
      )
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now()
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png'
    const fileName = `logo-${timestamp}.${extension}`
    const filePath = join(uploadDir, fileName)

    try {
      // Converter File para Buffer e salvar
      const bytes = await file.arrayBuffer()
      const buffer = Buffer.from(bytes)
      await writeFile(filePath, buffer, { mode: 0o644 })
      
      // Verificar se o arquivo foi salvo corretamente
      const { existsSync: checkExists } = await import('fs')
      if (!checkExists(filePath)) {
        throw new Error('Arquivo não foi salvo corretamente')
      }
    } catch (writeError) {
      console.error('Erro ao salvar arquivo:', writeError)
      console.error('Caminho tentado:', filePath)
      console.error('Diretório existe:', existsSync(uploadDir))
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao salvar arquivo. Verifique as permissões da pasta public/uploads/logos.',
          error: writeError instanceof Error ? writeError.message : 'Erro desconhecido'
        },
        { status: 500 }
      )
    }

    // Retornar URL do arquivo
    const fileUrl = `/uploads/logos/${fileName}`

    return NextResponse.json({
      success: true,
      url: fileUrl,
      message: 'Logotipo enviado com sucesso'
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro ao fazer upload do logotipo',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}

