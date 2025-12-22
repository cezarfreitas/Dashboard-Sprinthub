import { NextRequest, NextResponse } from 'next/server'
import { executeQuery, executeMutation } from '@/lib/database'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // 60 segundos timeout

// POST - Importar matriz de metas do Excel
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const ano = formData.get('ano') as string || new Date().getFullYear().toString()

    if (!file) {
      return NextResponse.json(
        { success: false, message: 'Arquivo não fornecido' },
        { status: 400 }
      )
    }

    // Verificar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, message: 'Arquivo muito grande. Tamanho máximo: 10MB' },
        { status: 400 }
      )
    }

    // Verificar se é um arquivo Excel
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      return NextResponse.json(
        { success: false, message: 'Arquivo deve ser um Excel (.xlsx ou .xls)' },
        { status: 400 }
      )
    }

    // Ler arquivo Excel
    let buffer: ArrayBuffer
    let workbook: XLSX.WorkBook
    
    try {
      buffer = await file.arrayBuffer()
      workbook = XLSX.read(buffer, { type: 'buffer' })
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Erro ao ler arquivo Excel. Verifique se o arquivo não está corrompido.',
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        },
        { status: 400 }
      )
    }
    
    // Pegar primeira planilha
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    
    // Converter para JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (jsonData.length < 2) {
      return NextResponse.json(
        { success: false, message: 'Arquivo Excel está vazio ou tem formato inválido' },
        { status: 400 }
      )
    }

    // Verificar cabeçalho
    const header = jsonData[0]
    const expectedHeader = [
      'ID Vendedor',
      'Nome Vendedor',
      'ID Unidade',
      'Nome Unidade',
      'Ano',
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]

    if (header.length !== expectedHeader.length) {
      return NextResponse.json(
        { success: false, message: 'Formato do arquivo Excel inválido. Use o template de exportação.' },
        { status: 400 }
      )
    }

    // Processar dados
    const metasParaImportar = []
    const erros = []
    const sucessos = []

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      
      if (!row || row.length < expectedHeader.length) {
        erros.push(`Linha ${i + 1}: Dados incompletos`)
        continue
      }

      const vendedorId = parseInt(row[0])
      const unidadeId = parseInt(row[2])
      const anoLinha = parseInt(row[4])

      if (isNaN(vendedorId) || isNaN(unidadeId) || isNaN(anoLinha)) {
        erros.push(`Linha ${i + 1}: IDs inválidos`)
        continue
      }

      if (anoLinha !== parseInt(ano)) {
        erros.push(`Linha ${i + 1}: Ano não confere (esperado: ${ano}, encontrado: ${anoLinha})`)
        continue
      }

      // Processar cada mês (colunas 5 a 16)
      for (let mesIndex = 0; mesIndex < 12; mesIndex++) {
        const mes = mesIndex + 1
        const valorTexto = row[5 + mesIndex]
        
        // Tratar valores com vírgula (formato brasileiro)
        let valor = 0
        if (valorTexto && valorTexto !== '' && valorTexto !== '0' && valorTexto !== '0,00') {
          // Converter vírgula para ponto para parseFloat
          const valorLimpo = valorTexto.toString().replace(',', '.')
          valor = parseFloat(valorLimpo) || 0
        }

        if (valor > 0) {
          metasParaImportar.push({
            vendedor_id: vendedorId,
            unidade_id: unidadeId,
            mes: mes,
            ano: parseInt(ano),
            meta_valor: valor,
            meta_descricao: `Importado do Excel - ${row[1]}`
          })
        }
      }

      sucessos.push(`Linha ${i + 1}: ${row[1]} - Unidade ${unidadeId}`)
    }

    if (metasParaImportar.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhuma meta válida encontrada para importar' },
        { status: 400 }
      )
    }

    // Verificar se vendedores e unidades existem
    const vendedoresIds = Array.from(new Set(metasParaImportar.map(m => m.vendedor_id)))
    const unidadesIds = Array.from(new Set(metasParaImportar.map(m => m.unidade_id)))

    const vendedoresExistentes = await executeQuery(`
      SELECT id FROM vendedores WHERE id IN (${vendedoresIds.map(() => '?').join(',')})
    `, vendedoresIds) as any[]

    const unidadesExistentes = await executeQuery(`
      SELECT id FROM unidades WHERE id IN (${unidadesIds.map(() => '?').join(',')})
    `, unidadesIds) as any[]

    const vendedoresExistentesIds = vendedoresExistentes.map(v => v.id)
    const unidadesExistentesIds = unidadesExistentes.map(u => u.id)

    // Filtrar metas válidas
    const metasValidas = metasParaImportar.filter(meta => 
      vendedoresExistentesIds.includes(meta.vendedor_id) && 
      unidadesExistentesIds.includes(meta.unidade_id)
    )

    const metasInvalidas = metasParaImportar.filter(meta => 
      !vendedoresExistentesIds.includes(meta.vendedor_id) || 
      !unidadesExistentesIds.includes(meta.unidade_id)
    )

    metasInvalidas.forEach(meta => {
      erros.push(`Vendedor ID ${meta.vendedor_id} ou Unidade ID ${meta.unidade_id} não existe`)
    })

    if (metasValidas.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Nenhuma meta válida para importar. Verifique se os vendedores e unidades existem.' },
        { status: 400 }
      )
    }

    try {
      // Não precisa mais desativar metas - o UPSERT vai atualizar ou criar
      console.log(`[Import Excel] Processando metas para o ano ${ano} (UPSERT mode)`)

      // Inserir novas metas usando INSERT ... ON DUPLICATE KEY UPDATE
      let inseridas = 0
      let atualizadas = 0
      
      console.log(`[Import Excel] Processando ${metasValidas.length} metas válidas`)
      
      // Processar em batches menores para melhor performance e segurança
      const batchSize = 50
      
      for (let i = 0; i < metasValidas.length; i += batchSize) {
        const batch = metasValidas.slice(i, i + batchSize)
        
        // Processar cada meta do batch usando INSERT ... ON DUPLICATE KEY UPDATE
        for (const meta of batch) {
          try {
            const result = await executeMutation(`
              INSERT INTO metas_mensais (vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao)
              VALUES (?, ?, ?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE 
                meta_valor = VALUES(meta_valor),
                meta_descricao = VALUES(meta_descricao),
                updated_at = CURRENT_TIMESTAMP
            `, [meta.vendedor_id, meta.unidade_id, meta.mes, meta.ano, meta.meta_valor, meta.meta_descricao])
            
            // INSERT ... ON DUPLICATE KEY UPDATE no MySQL retorna:
            // - affectedRows = 1 quando insere nova linha
            // - affectedRows = 2 quando atualiza linha existente
            // - affectedRows = 0 quando não faz nada
            if (result.affectedRows === 1) {
              // Nova linha inserida
              inseridas++
            } else if (result.affectedRows === 2) {
              // Linha existente atualizada
              atualizadas++
            }
            // Se affectedRows = 0, não fazemos nada (já estava igual)
          } catch (error: any) {
            // Se der erro, tentar update direto
            if (error.code === 'ER_DUP_ENTRY' || error.code === 'ER_NO_REFERENCED_ROW_2') {
              try {
                const updateResult = await executeMutation(`
                  UPDATE metas_mensais 
                  SET meta_valor = ?, meta_descricao = ?, updated_at = CURRENT_TIMESTAMP
                  WHERE vendedor_id = ? AND unidade_id = ? AND mes = ? AND ano = ?
                `, [meta.meta_valor, meta.meta_descricao, meta.vendedor_id, meta.unidade_id, meta.mes, meta.ano])
                
                if (updateResult.affectedRows > 0) {
                  atualizadas++
                }
              } catch (updateError) {
                erros.push(`Erro ao processar meta do vendedor ${meta.vendedor_id}, mês ${meta.mes}: ${updateError instanceof Error ? updateError.message : 'Erro desconhecido'}`)
              }
            } else {
              const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido'
              const errorCode = (error as any)?.code || 'NO_CODE'
              console.error(`[Import Excel] Erro ao processar meta vendedor ${meta.vendedor_id}, unidade ${meta.unidade_id}, mês ${meta.mes}, ano ${meta.ano}:`, errorMsg, `(code: ${errorCode})`)
              erros.push(`Erro ao processar meta do vendedor ${meta.vendedor_id}, mês ${meta.mes}: ${errorMsg}`)
            }
          }
        }
      }
      
      if (inseridas === 0 && atualizadas === 0 && metasValidas.length > 0) {
        console.error('[Import Excel] NENHUMA meta foi inserida ou atualizada, mas havia metas válidas!')
        console.error(`[Import Excel] Metas válidas: ${metasValidas.length}, Inseridas: ${inseridas}, Atualizadas: ${atualizadas}`)
      }

      console.log(`[Import Excel] Finalizado: ${inseridas} inseridas, ${atualizadas} atualizadas`)
      
      return NextResponse.json({
        success: true,
        message: 'Importação realizada com sucesso',
        stats: {
          total_linhas: jsonData.length - 1,
          metas_inseridas: inseridas,
          metas_atualizadas: atualizadas,
          metas_validas: metasValidas.length,
          metas_invalidas: metasInvalidas.length,
          erros: erros.length,
          sucessos: sucessos.length
        },
        erros: erros.slice(0, 10), // Limitar a 10 erros
        sucessos: sucessos.slice(0, 10) // Limitar a 10 sucessos
      })

    } catch (error) {
      throw error
    }

  } catch (error) {
    // Log do erro para debug
    console.error('Erro ao importar Excel:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Erro interno do servidor ao importar Excel',
        error: error instanceof Error ? error.message : 'Erro desconhecido'
      },
      { status: 500 }
    )
  }
}
