import bcrypt from 'bcryptjs'

async function gerarHash() {
  const senha = 'admin123'
  const hash = await bcrypt.hash(senha, 10)
  
  console.log('='.repeat(60))
  console.log('HASH DE SENHA GERADO')
  console.log('='.repeat(60))
  console.log(`\nSenha: ${senha}`)
  console.log(`Hash:  ${hash}\n`)
  console.log('Use este hash no script SQL:')
  console.log(`'${hash}'`)
  console.log('='.repeat(60))
}

gerarHash()

