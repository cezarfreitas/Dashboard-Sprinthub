# =============================================================================
# Dockerfile Otimizado para Next.js em VPS
# Multi-stage build com cache otimizado, segurança e health checks
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Base Image com dependências do sistema
# -----------------------------------------------------------------------------
FROM node:18-alpine AS base

# Metadata
LABEL maintainer="DevOps Team"
LABEL version="2.0.0"
LABEL description="Dashboard Inteligente - Production Ready"

# Build arguments
ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1

# Instalar dependências do sistema e ferramentas de segurança
RUN apk add --no-cache \
    libc6-compat \
    dumb-init \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Configurar timezone
ENV TZ=America/Sao_Paulo

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Dependencies - Instalar dependências do projeto
# -----------------------------------------------------------------------------
FROM base AS deps

# Copiar apenas arquivos de dependências (melhor cache)
COPY package.json package-lock.json* ./

# Limpar cache do npm antes da instalação
RUN npm cache clean --force

# Instalar dependências de produção e desenvolvimento
RUN npm ci --prefer-offline --no-audit

# Instalar apenas dependências de produção em camada separada
FROM base AS prod-deps

COPY package.json package-lock.json* ./

RUN npm ci --only=production --prefer-offline --no-audit \
    && npm cache clean --force

# -----------------------------------------------------------------------------
# Stage 3: Builder - Build da aplicação
# -----------------------------------------------------------------------------
FROM base AS builder

# Variáveis de ambiente para build
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp

WORKDIR /app

# Copiar dependências
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Criar diretórios necessários
RUN mkdir -p .next prisma/migrations

# Build da aplicação com otimizações
RUN npm run build

# Remover arquivos desnecessários após build
RUN rm -rf \
    .git \
    .github \
    .vscode \
    node_modules/.cache \
    **/*.md \
    **/*.test.* \
    **/*.spec.* \
    **/tests

# -----------------------------------------------------------------------------
# Stage 4: Runner - Imagem final de produção
# -----------------------------------------------------------------------------
FROM base AS runner

# Metadata de runtime
LABEL stage="production"
LABEL security.level="high"

WORKDIR /app

# Variáveis de ambiente de produção
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Criar usuário não-privilegiado para segurança
RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 nextjs \
    && chown -R nextjs:nodejs /app

# Copiar apenas arquivos necessários para produção
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar arquivos de configuração necessários
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

# Criar diretório para cache com permissões corretas
RUN mkdir -p .next/cache \
    && chown -R nextjs:nodejs .next

# Health check nativo do Docker
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Mudar para usuário não-privilegiado
USER nextjs

# Expor porta
EXPOSE 3000

# Usar dumb-init para gerenciamento correto de processos
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Comando de inicialização
CMD ["node", "server.js"]

# -----------------------------------------------------------------------------
# Stage 5: Development (opcional - para dev com Docker)
# -----------------------------------------------------------------------------
FROM base AS development

ENV NODE_ENV=development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
