# =============================================================================
# Dockerfile Ultra-Otimizado para Next.js em VPS
# Multi-stage build com cache BuildKit, paralelização e otimizações agressivas
# =============================================================================

# Habilitar BuildKit para cache avançado (adicione no docker-compose ou comando)
# syntax=docker/dockerfile:1.4

# -----------------------------------------------------------------------------
# Stage 1: Base Image com dependências do sistema
# -----------------------------------------------------------------------------
FROM node:18-alpine AS base

# Metadata
LABEL maintainer="DevOps Team"
LABEL version="3.0.0"
LABEL description="Dashboard Inteligente - Ultra Optimized"

# Build arguments
ARG NODE_ENV=production
ARG NEXT_TELEMETRY_DISABLED=1

# Instalar dependências do sistema otimizadas + fontes para sharp
RUN --mount=type=cache,target=/var/cache/apk \
    apk add --no-cache \
    libc6-compat \
    dumb-init \
    curl \
    fontconfig \
    ttf-dejavu \
    font-noto

# Configurar timezone
ENV TZ=America/Sao_Paulo

WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 2: Dependencies - Instalar dependências com cache
# -----------------------------------------------------------------------------
FROM base AS deps

# Forçar instalação de todas as dependências (incluindo dev)
ENV NODE_ENV=development

# Copiar apenas arquivos de dependências (cache layer)
COPY package.json package-lock.json* ./

# Usar cache mount do BuildKit para npm
# Instalar TODAS as dependências (incluindo devDependencies para o build)
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --include=dev --prefer-offline --no-audit --loglevel=error; \
    else \
      npm install --include=dev --no-audit --loglevel=error; \
    fi

# -----------------------------------------------------------------------------
# Stage 3: Production Dependencies (separado para melhor cache)
# -----------------------------------------------------------------------------
FROM base AS prod-deps

COPY package.json package-lock.json* ./

RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then \
      npm ci --only=production --prefer-offline --no-audit --loglevel=error; \
    else \
      npm install --only=production --no-audit --loglevel=error; \
    fi

# -----------------------------------------------------------------------------
# Stage 4: Builder - Build da aplicação com máxima otimização
# -----------------------------------------------------------------------------
FROM base AS builder

# Variáveis de ambiente para build otimizado
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_SHARP_PATH=/app/node_modules/sharp
ENV NODE_OPTIONS="--max-old-space-size=4096"

WORKDIR /app

# Copiar dependências (cache layer)
COPY --from=deps /app/node_modules ./node_modules

# Copiar apenas arquivos necessários para build
COPY package.json package-lock.json* ./
COPY next.config.js tsconfig.json ./
COPY tailwind.config.js postcss.config.js ./
COPY middleware.ts ./

# Copiar diretórios do projeto
COPY app ./app
COPY components ./components
COPY lib ./lib
COPY hooks ./hooks
COPY contexts ./contexts
COPY types ./types
COPY config ./config
COPY scripts ./scripts
COPY public ./public

# Build da aplicação para produção
# O build já está configurado no next.config.js para gerar standalone em produção
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build

# Limpeza pós-build (manter node_modules para npm start)
RUN find . -name "*.test.*" -o -name "*.spec.*" | xargs rm -rf 2>/dev/null || true && \
    rm -rf node_modules/.cache && \
    rm -rf .next/cache

# -----------------------------------------------------------------------------
# Stage 5: Runner - Imagem final para produção (DEFAULT)
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

# Criar usuário não-privilegiado
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar fontes customizadas para o sistema (antes de trocar para nextjs user)
USER root
COPY --from=builder /app/public/fonts/*.woff2 /usr/share/fonts/truetype/
RUN fc-cache -f -v

# Copiar arquivos necessários para produção
# Se usar standalone, copiar do .next/standalone
# Se usar npm start, copiar .next e node_modules
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=prod-deps --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/next.config.js ./
COPY --from=builder --chown=nextjs:nodejs /app/tsconfig.json ./

# Copiar script de entrypoint
COPY --chown=nextjs:nodejs scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Criar diretório de uploads com permissões corretas (antes de mudar para usuário nextjs)
RUN mkdir -p /app/public/uploads/logos && \
    chown -R nextjs:nodejs /app/public/uploads && \
    chmod -R 755 /app/public/uploads

# Health check otimizado
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=2 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Usuário não-privilegiado
USER nextjs

EXPOSE 3000

# Comando para produção usando script de entrypoint customizado
# O script garante que apenas uma instância rode e trata sinais corretamente
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/usr/local/bin/docker-entrypoint.sh"]
