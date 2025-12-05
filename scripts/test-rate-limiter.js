/**
 * Teste simples do Rate Limiter
 * Verifica se o rate limiting está funcionando corretamente
 */

class RateLimiter {
  constructor(maxRequests = 50, windowMs = 60000) {
    this.requests = []
    this.maxRequests = maxRequests
    this.windowMs = windowMs
  }

  async waitIfNeeded() {
    const now = Date.now()
    this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs)
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0]
      const waitTime = this.windowMs - (now - oldestRequest) + 100
      
      if (waitTime > 0) {
        console.log(`⏳ Rate limit atingido (${this.maxRequests} req/min). Aguardando ${Math.ceil(waitTime / 1000)}s...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        const newNow = Date.now()
        this.requests = this.requests.filter(timestamp => newNow - timestamp < this.windowMs)
      }
    }
    
    this.requests.push(Date.now())
  }
}

async function testRateLimiter() {
  console.log('🧪 Testando Rate Limiter (50 req/min)\n')
  
  const rateLimiter = new RateLimiter(50, 60000)
  const startTime = Date.now()
  
  console.log('📊 Executando 60 requisições (deveria limitar após 50)...\n')
  
  for (let i = 1; i <= 60; i++) {
    const before = Date.now()
    await rateLimiter.waitIfNeeded()
    const after = Date.now()
    const waitTime = after - before
    
    if (waitTime > 100) {
      console.log(`   Requisição ${i}: ⏳ Aguardou ${(waitTime / 1000).toFixed(2)}s`)
    } else {
      console.log(`   Requisição ${i}: ✅ Imediata`)
    }
    
    // Pequeno delay para visualizar melhor
    if (i % 10 === 0) {
      console.log(`   ... ${i}/60 requisições processadas\n`)
    }
  }
  
  const endTime = Date.now()
  const totalTime = ((endTime - startTime) / 1000).toFixed(2)
  
  console.log(`\n✅ Teste concluído em ${totalTime}s`)
  console.log(`📊 Total de requisições: 60`)
  console.log(`⏱️  Tempo médio por requisição: ${(totalTime / 60).toFixed(2)}s`)
  console.log(`\n💡 O rate limiter deve ter limitado após 50 requisições`)
}

testRateLimiter().catch(console.error)

