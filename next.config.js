// Forçar carregamento de variáveis de ambiente
const dotenv = require("dotenv");
dotenv.config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Habilitar output standalone para Docker
  output: 'standalone',
  // Configuração para evitar problemas com geração estática
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
  // Evitar geração estática de rotas API específicas
  async generateBuildId() {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig
