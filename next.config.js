// Forçar carregamento de variáveis de ambiente
const dotenv = require("dotenv");
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Habilitar output standalone para Docker (reduz tamanho)
  output: 'standalone',
  
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
    // Otimizar CSS
    optimizeCss: true,
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
  
  // Evitar geração estática de rotas API específicas
  async generateBuildId() {
    return 'build-' + Date.now()
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
