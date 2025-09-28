// Teste específico para verificar cookies
const testCookie = async () => {
  try {
    console.log('🔐 Testando login e cookie...')
    
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
    console.log('✅ Login response:', loginData.success)

    if (loginData.success) {
      // Extrair cookie
      const setCookieHeader = loginResponse.headers.get('set-cookie')
      console.log('🍪 Set-Cookie header:', setCookieHeader)
      
      // Extrair apenas o valor do cookie
      const cookieMatch = setCookieHeader?.match(/auth-token=([^;]+)/)
      const cookieValue = cookieMatch ? cookieMatch[1] : null
      console.log('🍪 Cookie value:', cookieValue ? 'ENCONTRADO' : 'NÃO ENCONTRADO')
      
      if (cookieValue) {
        // Testar acesso à página principal com cookie
        const homeResponse = await fetch('http://localhost:3000/', {
          method: 'GET',
          headers: {
            'Cookie': `auth-token=${cookieValue}`
          }
        })

        console.log('🏠 Home response status:', homeResponse.status)
        
        if (homeResponse.status === 200) {
          const homeText = await homeResponse.text()
          console.log('🏠 Home content length:', homeText.length)
          
          if (homeText.includes('Dashboard') && !homeText.includes('Digite seu usuário')) {
            console.log('🎉 SUCESSO: Dashboard carregado!')
          } else if (homeText.includes('Digite seu usuário')) {
            console.log('❌ PROBLEMA: Ainda mostra login')
          } else {
            console.log('🤔 Status: Conteúdo não identificado')
          }
        } else {
          console.log('❌ Erro ao acessar página principal:', homeResponse.status)
        }
      }
    }

  } catch (error) {
    console.error('❌ Erro no teste:', error)
  }
}

testCookie()
