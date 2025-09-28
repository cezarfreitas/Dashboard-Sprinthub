// Script para testar o login completo
const testLogin = async () => {
  try {
    console.log('🔐 Testando login...')
    
    // Fazer login
    const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin@1234'
      }),
      credentials: 'include'
    })

    const loginData = await loginResponse.json()
    console.log('✅ Login response:', loginData)

    if (loginData.success) {
      // Testar verificação de autenticação
      const meResponse = await fetch('http://localhost:3000/api/auth/me', {
        credentials: 'include'
      })

      const meData = await meResponse.json()
      console.log('✅ Me response:', meData)

      if (meData.success) {
        console.log('🎉 Login funcionando perfeitamente!')
        console.log('👤 Usuário logado:', meData.user.username)
      } else {
        console.log('❌ Erro na verificação:', meData.message)
      }
    } else {
      console.log('❌ Erro no login:', loginData.message)
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

testLogin()
