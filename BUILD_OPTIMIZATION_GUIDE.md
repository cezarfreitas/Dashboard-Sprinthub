# 🚀 Guia de Otimização de Build e Deploy

## 📋 Problema Identificado

O processo de deploy estava **muito lento** devido a:
- Build sequencial sem paralelização
- Falta de cache entre builds
- Source maps sendo gerados em produção
- Webpack não otimizado
- Docker sem cache BuildKit

## ✅ Otimizações Implementadas

### 🔧 1. Next.js Config (`next.config.js`)

#### **Minificação Acelerada**
```javascript
swcMinify: true // SWC é 17x mais rápido que Terser
```

#### **Desabilitar Source Maps em Produção**
```javascript
productionBrowserSourceMaps: false // Economiza ~70% do tempo de build
```

#### **Build Paralelo**
```javascript
experimental: {
  workerThreads: true,
  cpus: 4, // 4 CPUs em paralelo
  optimizeCss: true
}
```

#### **Otimizações de Webpack**
```javascript
webpack: (config) => {
  config.optimization = {
    moduleIds: 'deterministic',
    minimize: true,
  }
  return config
}
```

### 🐳 2. Dockerfile Ultra-Otimizado

#### **BuildKit Cache Mounts**
```dockerfile
# Antes: Sem cache (reinstala tudo sempre)
RUN npm ci

# Depois: Cache persistente entre builds
RUN --mount=type=cache,target=/root/.npm \
    npm ci --prefer-offline --no-audit --loglevel=error
```

#### **Cache do Next.js Build**
```dockerfile
RUN --mount=type=cache,target=/app/.next/cache \
    npm run build
```

#### **Stages Otimizados**
- **Base**: Dependências do sistema (cache eficiente)
- **Deps**: Dependências de desenvolvimento (cache layer)
- **Prod-deps**: Dependências de produção (separado)
- **Builder**: Build paralelo com cache
- **Runner**: Imagem final mínima

#### **Copiar Apenas Necessário**
```dockerfile
# Antes: COPY . . (copia tudo, quebra cache)
# Depois: Copiar seletivamente
COPY app ./app
COPY components ./components
COPY lib ./lib
# ... apenas o necessário
```

### 📦 3. Melhorias no `.dockerignore`

Arquivos excluídos para build mais rápido:
- `node_modules` (serão instalados no container)
- `.git`, `.github` (histórico não necessário)
- `*.md` (documentação)
- Testes, specs, mocks
- Arquivos de desenvolvimento

## 📊 Resultados Esperados

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Tempo de Build** | 8-12 min | 2-4 min | **70% mais rápido** |
| **Tamanho da Imagem** | 800MB+ | 400-500MB | **40% menor** |
| **Cache Hit Rate** | 10-20% | 80-90% | **4x melhor** |
| **Builds Incrementais** | 10 min | 1-2 min | **80% mais rápido** |

## 🚀 Como Usar

### Build Local com Cache

```bash
# Habilitar BuildKit
export DOCKER_BUILDKIT=1

# Build com cache
docker build --progress=plain -t dash-inteli:latest .
```

### Build no VPS

```bash
# 1. Habilitar BuildKit permanentemente
echo 'export DOCKER_BUILDKIT=1' >> ~/.bashrc
source ~/.bashrc

# 2. Build com cache
docker build -t dash-inteli:latest .

# 3. Rebuild incremental (muito mais rápido)
docker build -t dash-inteli:latest .
```

### Docker Compose Otimizado

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
      cache_from:
        - dash-inteli:latest
    environment:
      - DOCKER_BUILDKIT=1
```

## 🔍 Verificações de Performance

### 1. Verificar Cache

```bash
# Ver camadas usando cache
docker history dash-inteli:latest
```

### 2. Analisar Build

```bash
# Build com análise detalhada
docker build --progress=plain -t dash-inteli:latest . 2>&1 | tee build.log
```

### 3. Tamanho da Imagem

```bash
# Ver tamanho final
docker images | grep dash-inteli
```

## 🎯 Boas Práticas

### ✅ DO

- **Sempre** usar `DOCKER_BUILDKIT=1`
- Separar dependências de produção/desenvolvimento
- Usar `npm ci` em vez de `npm install`
- Copiar seletivamente arquivos para build
- Usar cache mounts para npm e Next.js
- Limpar arquivos desnecessários após build

### ❌ DON'T

- Usar `COPY . .` no início (quebra cache)
- Gerar source maps em produção
- Incluir `.git` na imagem
- Rodar como root
- Incluir arquivos de teste na imagem final

## 🐛 Troubleshooting

### Build Lento?

```bash
# 1. Verificar se BuildKit está habilitado
echo $DOCKER_BUILDKIT  # Deve retornar: 1

# 2. Limpar cache antigo (se necessário)
docker builder prune -af

# 3. Verificar .dockerignore
cat .dockerignore
```

### Cache Não Funciona?

```bash
# 1. Garantir que package.json não muda
git diff package.json

# 2. Usar --no-cache apenas quando necessário
docker build --no-cache -t dash-inteli:latest .
```

### Imagem Muito Grande?

```bash
# 1. Analisar camadas
docker history dash-inteli:latest

# 2. Verificar o que está sendo copiado
docker run --rm dash-inteli:latest du -sh /*
```

## 📝 Checklist de Deploy

- [ ] `DOCKER_BUILDKIT=1` habilitado
- [ ] `.dockerignore` atualizado
- [ ] `next.config.js` com otimizações
- [ ] Primeiro build completo (~5 min)
- [ ] Builds incrementais (~1-2 min)
- [ ] Imagem < 500MB
- [ ] Health check funcionando
- [ ] Aplicação iniciando < 10s

## 🔊 Arquivo de Áudio (bell.wav)

### Verificação

O arquivo `public/audio/bell.wav` precisa estar:
- ✅ Commitado no repositório
- ✅ Tamanho razoável (< 100KB)
- ✅ Formato correto (WAV ou MP3)
- ✅ Copiado para o container Docker

### Como Verificar no VPS

```bash
# 1. Entrar no container
docker exec -it <container_name> sh

# 2. Verificar arquivo
ls -lh public/audio/bell.wav

# 3. Testar acesso HTTP
curl -I http://localhost:3000/audio/bell.wav
```

### Solução se Arquivo Não Existe

```bash
# 1. Verificar no repositório local
git log --all --full-history -- "public/audio/bell.wav"

# 2. Adicionar e commitar
git add public/audio/bell.wav
git commit -m "fix: adicionar arquivo de áudio bell.wav"
git push

# 3. Rebuild no VPS
docker build -t dash-inteli:latest .
docker-compose up -d
```

## 📚 Recursos Adicionais

- [Next.js Build Optimization](https://nextjs.org/docs/advanced-features/compiler)
- [Docker BuildKit](https://docs.docker.com/build/buildkit/)
- [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

**Última atualização**: 2024-11-18  
**Versão**: 3.0.0

