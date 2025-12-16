/**
 * Script para corrigir o caminho do logotipo no banco de dados
 * Atualiza para o arquivo mais recente existente em public/uploads/logos/
 */

const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function fixLogoPath() {
  let connection

  try {
    // Conectar ao banco
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bancointeli',
      port: parseInt(process.env.DB_PORT || '3306')
    })

    console.log('✅ Conectado ao banco de dados')

    // Buscar configuração atual
    const [currentConfig] = await connection.execute(
      'SELECT chave, valor FROM configuracoes WHERE chave = ?',
      ['empresa_logotipo']
    )

    console.log('\n📄 Configuração atual:')
    if (currentConfig.length > 0) {
      console.log(`   Logotipo: ${currentConfig[0].valor}`)
    } else {
      console.log('   Nenhuma configuração encontrada')
    }

    // Verificar arquivos disponíveis
    const logosDir = path.join(process.cwd(), 'public', 'uploads', 'logos')
    
    if (!fs.existsSync(logosDir)) {
      console.error('\n❌ Diretório de logos não encontrado:', logosDir)
      return
    }

    const files = fs.readdirSync(logosDir)
      .filter(file => /\.(png|jpg|jpeg|svg|webp)$/i.test(file))
      .map(file => {
        const stats = fs.statSync(path.join(logosDir, file))
        return {
          name: file,
          time: stats.mtime.getTime()
        }
      })
      .sort((a, b) => b.time - a.time) // Mais recente primeiro

    if (files.length === 0) {
      console.error('\n❌ Nenhum arquivo de logo encontrado em:', logosDir)
      return
    }

    console.log('\n📁 Logos disponíveis:')
    files.forEach((file, idx) => {
      console.log(`   ${idx + 1}. ${file.name} (${new Date(file.time).toLocaleString('pt-BR')})`)
    })

    // Selecionar o mais recente
    const latestLogo = files[0].name
    const newLogoPath = `/api/uploads/logos/${latestLogo}`

    console.log(`\n🎯 Selecionado: ${latestLogo}`)
    console.log(`   Novo caminho: ${newLogoPath}`)

    // Verificar se já está atualizado
    if (currentConfig.length > 0 && currentConfig[0].valor === newLogoPath) {
      console.log('\n✅ O logotipo já está atualizado!')
      return
    }

    // Atualizar banco de dados
    if (currentConfig.length > 0) {
      await connection.execute(
        'UPDATE configuracoes SET valor = ?, updated_at = NOW() WHERE chave = ?',
        [newLogoPath, 'empresa_logotipo']
      )
      console.log('\n✅ Logotipo atualizado com sucesso!')
    } else {
      await connection.execute(
        'INSERT INTO configuracoes (chave, valor, descricao, tipo, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
        ['empresa_logotipo', newLogoPath, 'URL do logotipo da empresa', 'string']
      )
      console.log('\n✅ Configuração de logotipo criada com sucesso!')
    }

    // Verificar atualização
    const [updatedConfig] = await connection.execute(
      'SELECT chave, valor FROM configuracoes WHERE chave = ?',
      ['empresa_logotipo']
    )

    console.log('\n📄 Nova configuração:')
    console.log(`   Logotipo: ${updatedConfig[0].valor}`)

    console.log('\n🎉 Processo concluído!')
    console.log('\n💡 Próximos passos:')
    console.log('   1. Recarregue a página no navegador (Ctrl+Shift+R)')
    console.log('   2. O logo deve aparecer corretamente agora')

  } catch (error) {
    console.error('\n❌ Erro:', error.message)
    if (error.code === 'ECONNREFUSED') {
      console.error('\n💡 Verifique se o MySQL está rodando e as credenciais no .env estão corretas')
    }
    throw error
  } finally {
    if (connection) {
      await connection.end()
      console.log('\n🔌 Desconectado do banco de dados')
    }
  }
}

// Executar
fixLogoPath()
  .catch(error => {
    console.error('Erro fatal:', error)
    process.exit(1)
  })

