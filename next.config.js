// Forçar carregamento de variáveis de ambiente
// Next.js já carrega .env.local automaticamente, mas vamos garantir
const dotenv = require("dotenv");
const path = require("path");

// Carregar .env.local primeiro (tem prioridade), depois .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config(); // .env como fallback

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Habilitar output standalone apenas se especificado
  // Para Docker/Easypanel, podemos usar npm start sem standalone
  output: process.env.NEXT_STANDALONE === 'true' ? 'standalone' : undefined,
  
  // Otimizações de build
  swcMinify: true, // Usar SWC para minificação (mais rápido que Terser)
  
  // Desabilitar source maps em produção (mais rápido e menor)
  productionBrowserSourceMaps: false,
  
  // Otimizar geração de páginas
  generateEtags: false,
  poweredByHeader: false,
  
  // Configuração para evitar problemas com geração estática
  experimental: {
    // Reduzir arquivos desnecessários no trace
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
        '.git/**/*',
        'node_modules/.cache/**/*',
      ],
    },
    // Usar workers paralelos para build mais rápido
    workerThreads: true,
    cpus: 4, // Usar 4 CPUs em paralelo
  },
  
  // Configurar compressão
  compress: true,
  
  // Otimizar imagens
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96],
    minimumCacheTTL: 60,
  },
  
  // Cache de build incremental
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  
  // Gerar BUILD_ID estável
  generateBuildId() {
    if (process.env.NODE_ENV !== 'production') {
      return String('dev-' + Date.now())
    }
    return String('prod-' + Date.now())
  },
  
  // Otimizar webpack
  webpack: (config, { isServer }) => {
    // Otimizações de build
    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      minimize: true,
    }
    
    // Reduzir warnings desnecessários
    config.infrastructureLogging = {
      level: 'error',
    }
    
    return config
  },
}

module.exports = nextConfig
