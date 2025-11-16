#!/bin/bash

# =============================================================================
# Script de Deploy Automatizado - VPS
# Zero-downtime deployment com health checks e rollback automático
# =============================================================================

set -e  # Exit on error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
APP_NAME="dash-inteli"
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_DIR="./backups"
MAX_WAIT_TIME=120 # 2 minutos

# Funções de utilidade
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar pré-requisitos
check_prerequisites() {
    log_info "Verificando pré-requisitos..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose não está instalado"
        exit 1
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        log_error "Arquivo $ENV_FILE não encontrado"
        log_info "Copie o arquivo .env.production.example e configure as variáveis"
        exit 1
    fi
    
    log_success "Pré-requisitos verificados"
}

# Criar backup antes do deploy
create_backup() {
    log_info "Criando backup..."
    
    mkdir -p "$BACKUP_DIR"
    
    BACKUP_FILE="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).sql"
    
    docker-compose -f $COMPOSE_FILE exec -T mysql \
        mysqladmin ping -h localhost -u root -p${MYSQL_ROOT_PASSWORD} &> /dev/null
    
    if [ $? -eq 0 ]; then
        docker-compose -f $COMPOSE_FILE exec -T mysql \
            mysqldump -u root -p${MYSQL_ROOT_PASSWORD} ${DB_NAME:-dashinteli} \
            > "$BACKUP_FILE"
        
        gzip "$BACKUP_FILE"
        log_success "Backup criado: $BACKUP_FILE.gz"
    else
        log_warning "MySQL não está rodando, pulando backup"
    fi
}

# Build da nova imagem
build_image() {
    log_info "Building nova imagem..."
    
    # Definir tag da versão
    VERSION=${1:-$(git rev-parse --short HEAD 2>/dev/null || echo "latest")}
    export VERSION
    
    log_info "Versão: $VERSION"
    
    # Build com cache
    docker-compose -f $COMPOSE_FILE build \
        --build-arg NODE_ENV=production \
        --build-arg NEXT_TELEMETRY_DISABLED=1
    
    if [ $? -ne 0 ]; then
        log_error "Falha no build da imagem"
        exit 1
    fi
    
    # Tagear imagem
    docker tag ${APP_NAME}:latest ${APP_NAME}:${VERSION}
    docker tag ${APP_NAME}:latest ${APP_NAME}:previous
    
    log_success "Imagem construída: ${APP_NAME}:${VERSION}"
}

# Health check
wait_for_healthy() {
    local service=$1
    local max_wait=$MAX_WAIT_TIME
    local wait_time=0
    
    log_info "Aguardando $service ficar saudável..."
    
    while [ $wait_time -lt $max_wait ]; do
        if docker-compose -f $COMPOSE_FILE ps $service | grep -q "healthy"; then
            log_success "$service está saudável!"
            return 0
        fi
        
        sleep 5
        wait_time=$((wait_time + 5))
        echo -n "."
    done
    
    echo ""
    log_error "$service não ficou saudável após ${max_wait}s"
    return 1
}

# Deploy com zero downtime
deploy() {
    log_info "Iniciando deploy..."
    
    # Pull das imagens base (se houver atualizações)
    docker-compose -f $COMPOSE_FILE pull mysql redis 2>/dev/null || true
    
    # Up dos serviços de infraestrutura primeiro
    log_info "Iniciando serviços de infraestrutura..."
    docker-compose -f $COMPOSE_FILE up -d mysql redis
    
    # Aguardar MySQL ficar saudável
    if ! wait_for_healthy mysql; then
        log_error "MySQL falhou ao iniciar"
        exit 1
    fi
    
    # Deploy da aplicação (recreate para forçar nova imagem)
    log_info "Atualizando aplicação..."
    docker-compose -f $COMPOSE_FILE up -d --force-recreate --no-deps app
    
    # Aguardar app ficar saudável
    if ! wait_for_healthy app; then
        log_error "Aplicação falhou health check"
        log_warning "Iniciando rollback..."
        rollback
        exit 1
    fi
    
    log_success "Deploy concluído com sucesso!"
    
    # Limpar imagens antigas
    log_info "Limpando imagens antigas..."
    docker image prune -f
    
    # Mostrar status
    show_status
}

# Rollback para versão anterior
rollback() {
    log_warning "Executando rollback..."
    
    # Reverter para imagem anterior
    docker tag ${APP_NAME}:previous ${APP_NAME}:latest
    
    # Redeployar versão anterior
    docker-compose -f $COMPOSE_FILE up -d --force-recreate --no-deps app
    
    # Aguardar ficar saudável
    if wait_for_healthy app; then
        log_success "Rollback concluído"
    else
        log_error "Rollback falhou! Intervenção manual necessária"
        docker-compose -f $COMPOSE_FILE logs --tail=100 app
    fi
}

# Mostrar status dos serviços
show_status() {
    log_info "Status dos serviços:"
    echo ""
    docker-compose -f $COMPOSE_FILE ps
    echo ""
    
    log_info "Logs recentes:"
    docker-compose -f $COMPOSE_FILE logs --tail=20 app
}

# Função principal
main() {
    echo ""
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║         🚀 DEPLOY AUTOMATIZADO - DASH INTELI             ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo ""
    
    # Parse argumentos
    SKIP_BACKUP=false
    SKIP_BUILD=false
    VERSION="latest"
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --skip-backup)
                SKIP_BACKUP=true
                shift
                ;;
            --skip-build)
                SKIP_BUILD=true
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --rollback)
                rollback
                exit 0
                ;;
            --status)
                show_status
                exit 0
                ;;
            *)
                log_error "Argumento desconhecido: $1"
                echo "Uso: $0 [--skip-backup] [--skip-build] [--version VERSION] [--rollback] [--status]"
                exit 1
                ;;
        esac
    done
    
    # Executar deploy
    check_prerequisites
    
    if [ "$SKIP_BACKUP" = false ]; then
        create_backup
    fi
    
    if [ "$SKIP_BUILD" = false ]; then
        build_image "$VERSION"
    fi
    
    deploy
    
    echo ""
    log_success "🎉 Deploy finalizado!"
    echo ""
    log_info "Comandos úteis:"
    echo "  • Ver logs:     docker-compose -f $COMPOSE_FILE logs -f app"
    echo "  • Ver status:   $0 --status"
    echo "  • Rollback:     $0 --rollback"
    echo ""
}

# Executar
main "$@"

