// Teste completo do fluxo de login
const testLoginFlow = async () => {
  try {
    console.log('🔐 Testando fluxo completo de login...')
    
    // Simular login com cookies
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
      // Extrair cookies da resposta
      const cookies = loginResponse.headers.get('set-cookie')
      console.log('🍪 Cookies recebidos:', cookies)

      // Testar acesso à página principal com cookies
      const homeResponse = await fetch('http://localhost:3000/', {
        credentials: 'include',
        headers: {
          'Cookie': cookies || ''
        }
      })

      console.log('🏠 Home response status:', homeResponse.status)
      console.log('🏠 Home response headers:', Object.fromEntries(homeResponse.headers.entries()))
      
      if (homeResponse.status === 200) {
        const homeText = await homeResponse.text()
        console.log('🏠 Home content preview:', homeText.substring(0, 200) + '...')
        
        if (homeText.includes('Dashboard') && !homeText.includes('Login')) {
          console.log('🎉 SUCESSO: Página principal carregada corretamente!')
        } else {
          console.log('❌ PROBLEMA: Página ainda mostra login')
        }
      } else {
        console.log('❌ PROBLEMA: Não conseguiu acessar página principal')
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

testLoginFlow()
