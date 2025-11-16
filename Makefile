# =============================================================================
# Makefile - Comandos rápidos para Docker e Deploy
# =============================================================================

.PHONY: help build start stop restart logs status clean deploy backup test security

# Variáveis
COMPOSE_FILE := docker-compose.production.yml
APP_NAME := dash-inteli
VERSION := $(shell git rev-parse --short HEAD 2>/dev/null || echo "latest")

# Cores
RED := \033[0;31m
GREEN := \033[0;32m
YELLOW := \033[1;33m
BLUE := \033[0;34m
NC := \033[0m

# -----------------------------------------------------------------------------
# Help
# -----------------------------------------------------------------------------
help: ## Mostra esta mensagem de ajuda
	@echo "$(BLUE)╔═══════════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║     🚀 DASH INTELI - COMANDOS DE DEPLOY             ║$(NC)"
	@echo "$(BLUE)╚═══════════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(GREEN)Comandos disponíveis:$(NC)"
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# -----------------------------------------------------------------------------
# Build e Desenvolvimento
# -----------------------------------------------------------------------------
build: ## Build da imagem Docker
	@echo "$(BLUE)Building $(APP_NAME):$(VERSION)...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build \
		--build-arg NODE_ENV=production \
		--build-arg NEXT_TELEMETRY_DISABLED=1
	@docker tag $(APP_NAME):latest $(APP_NAME):$(VERSION)
	@echo "$(GREEN)✓ Build concluído$(NC)"

build-no-cache: ## Build sem cache
	@echo "$(BLUE)Building sem cache...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) build --no-cache
	@echo "$(GREEN)✓ Build concluído$(NC)"

dev: ## Roda ambiente de desenvolvimento com Docker
	@docker-compose -f docker-compose.dev.yml up

# -----------------------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------------------
start: ## Inicia todos os serviços
	@echo "$(BLUE)Iniciando serviços...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) up -d
	@make status
	@echo "$(GREEN)✓ Serviços iniciados$(NC)"

stop: ## Para todos os serviços
	@echo "$(YELLOW)Parando serviços...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) stop
	@echo "$(GREEN)✓ Serviços parados$(NC)"

restart: ## Reinicia todos os serviços
	@make stop
	@make start

down: ## Para e remove todos os containers
	@echo "$(YELLOW)Removendo containers...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) down
	@echo "$(GREEN)✓ Containers removidos$(NC)"

# -----------------------------------------------------------------------------
# Logs e Status
# -----------------------------------------------------------------------------
logs: ## Mostra logs da aplicação (Ctrl+C para sair)
	@docker-compose -f $(COMPOSE_FILE) logs -f app

logs-all: ## Mostra logs de todos os serviços
	@docker-compose -f $(COMPOSE_FILE) logs -f

logs-mysql: ## Mostra logs do MySQL
	@docker-compose -f $(COMPOSE_FILE) logs -f mysql

status: ## Mostra status dos serviços
	@echo "$(BLUE)Status dos serviços:$(NC)"
	@docker-compose -f $(COMPOSE_FILE) ps
	@echo ""
	@echo "$(BLUE)Health checks:$(NC)"
	@docker ps --filter "name=$(APP_NAME)" --format "table {{.Names}}\t{{.Status}}"

stats: ## Mostra estatísticas de uso (CPU, RAM)
	@docker stats --no-stream

# -----------------------------------------------------------------------------
# Deploy
# -----------------------------------------------------------------------------
deploy: ## Deploy completo com backup e health check
	@bash scripts/deploy.sh

deploy-fast: ## Deploy rápido (sem backup)
	@bash scripts/deploy.sh --skip-backup

deploy-no-build: ## Deploy sem rebuild (usa imagem existente)
	@bash scripts/deploy.sh --skip-build

rollback: ## Rollback para versão anterior
	@bash scripts/deploy.sh --rollback

# -----------------------------------------------------------------------------
# Database
# -----------------------------------------------------------------------------
db-backup: ## Backup manual do banco de dados
	@echo "$(BLUE)Criando backup...$(NC)"
	@mkdir -p ./backups
	@docker-compose -f $(COMPOSE_FILE) exec -T mysql \
		mysqldump -u root -p$(MYSQL_ROOT_PASSWORD) $(DB_NAME) \
		| gzip > ./backups/backup-$(shell date +%Y%m%d-%H%M%S).sql.gz
	@echo "$(GREEN)✓ Backup criado em ./backups/$(NC)"

db-restore: ## Restaura backup (uso: make db-restore FILE=backup.sql.gz)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Erro: especifique o arquivo com FILE=backup.sql.gz$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)Restaurando backup: $(FILE)$(NC)"
	@gunzip < $(FILE) | docker-compose -f $(COMPOSE_FILE) exec -T mysql \
		mysql -u root -p$(MYSQL_ROOT_PASSWORD) $(DB_NAME)
	@echo "$(GREEN)✓ Backup restaurado$(NC)"

db-shell: ## Abre shell do MySQL
	@docker-compose -f $(COMPOSE_FILE) exec mysql \
		mysql -u root -p$(MYSQL_ROOT_PASSWORD) $(DB_NAME)

db-migrate: ## Executa migrações do banco
	@echo "$(BLUE)Executando migrações...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) exec app npm run setup-db
	@echo "$(GREEN)✓ Migrações executadas$(NC)"

# -----------------------------------------------------------------------------
# Manutenção
# -----------------------------------------------------------------------------
clean: ## Remove containers, volumes e imagens não utilizadas
	@echo "$(YELLOW)Limpando recursos Docker...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) down -v
	@docker system prune -f
	@echo "$(GREEN)✓ Limpeza concluída$(NC)"

clean-all: ## Limpeza completa (CUIDADO: remove volumes)
	@echo "$(RED)⚠️  ATENÇÃO: Isso vai remover TODOS os dados!$(NC)"
	@read -p "Tem certeza? [y/N] " -n 1 -r; \
	echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose -f $(COMPOSE_FILE) down -v --rmi all; \
		rm -rf ./data ./backups; \
		echo "$(GREEN)✓ Limpeza completa$(NC)"; \
	fi

update-images: ## Atualiza imagens base (MySQL, Redis)
	@echo "$(BLUE)Atualizando imagens...$(NC)"
	@docker-compose -f $(COMPOSE_FILE) pull
	@echo "$(GREEN)✓ Imagens atualizadas$(NC)"

# -----------------------------------------------------------------------------
# Shell e Debug
# -----------------------------------------------------------------------------
shell: ## Abre shell no container da aplicação
	@docker-compose -f $(COMPOSE_FILE) exec app sh

shell-root: ## Abre shell como root
	@docker-compose -f $(COMPOSE_FILE) exec -u root app sh

inspect: ## Inspeciona configuração do container
	@docker inspect $(APP_NAME)-app

# -----------------------------------------------------------------------------
# Testes
# -----------------------------------------------------------------------------
test: ## Executa testes
	@docker-compose -f $(COMPOSE_FILE) exec app npm test

test-coverage: ## Executa testes com coverage
	@docker-compose -f $(COMPOSE_FILE) exec app npm run test:coverage

health-check: ## Verifica health da aplicação
	@curl -f http://localhost:3000/api/health || echo "$(RED)✗ Health check falhou$(NC)"

# -----------------------------------------------------------------------------
# Segurança
# -----------------------------------------------------------------------------
security-scan: ## Scan de segurança na imagem
	@echo "$(BLUE)Executando scan de segurança...$(NC)"
	@docker scan $(APP_NAME):latest || echo "$(YELLOW)Docker scan não disponível$(NC)"

security-audit: ## Audit de dependências npm
	@docker-compose -f $(COMPOSE_FILE) exec app npm audit

security-fix: ## Corrige vulnerabilidades (se possível)
	@docker-compose -f $(COMPOSE_FILE) exec app npm audit fix

generate-secrets: ## Gera secrets de segurança
	@docker-compose -f $(COMPOSE_FILE) exec app npm run generate-secrets

# -----------------------------------------------------------------------------
# Monitoring
# -----------------------------------------------------------------------------
monitor: ## Monitora em tempo real
	@watch -n 2 'docker stats --no-stream && echo "" && docker-compose -f $(COMPOSE_FILE) ps'

disk-usage: ## Mostra uso de disco do Docker
	@docker system df

# -----------------------------------------------------------------------------
# CI/CD
# -----------------------------------------------------------------------------
ci-build: ## Build para CI/CD
	@docker build -t $(APP_NAME):$(VERSION) \
		--build-arg NODE_ENV=production \
		--build-arg NEXT_TELEMETRY_DISABLED=1 \
		--target runner \
		.

ci-test: ## Testes para CI/CD
	@docker run --rm $(APP_NAME):$(VERSION) npm test

ci-push: ## Push da imagem (requer configuração de registry)
	@docker tag $(APP_NAME):$(VERSION) registry.example.com/$(APP_NAME):$(VERSION)
	@docker push registry.example.com/$(APP_NAME):$(VERSION)

# -----------------------------------------------------------------------------
# Instalação Inicial
# -----------------------------------------------------------------------------
setup: ## Setup inicial completo
	@echo "$(BLUE)╔═══════════════════════════════════════════════════╗$(NC)"
	@echo "$(BLUE)║     🚀 SETUP INICIAL - DASH INTELI              ║$(NC)"
	@echo "$(BLUE)╚═══════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(YELLOW)1. Verificando pré-requisitos...$(NC)"
	@command -v docker >/dev/null 2>&1 || { echo "$(RED)✗ Docker não instalado$(NC)"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "$(RED)✗ Docker Compose não instalado$(NC)"; exit 1; }
	@echo "$(GREEN)✓ Docker e Docker Compose instalados$(NC)"
	@echo ""
	@echo "$(YELLOW)2. Criando estrutura de diretórios...$(NC)"
	@mkdir -p data/mysql data/mysql-logs data/redis backups
	@echo "$(GREEN)✓ Diretórios criados$(NC)"
	@echo ""
	@echo "$(YELLOW)3. Configurando .env...$(NC)"
	@if [ ! -f .env.production ]; then \
		cp .env.security.example .env.production; \
		echo "$(GREEN)✓ Arquivo .env.production criado$(NC)"; \
		echo "$(RED)⚠️  Configure as variáveis antes de continuar!$(NC)"; \
	else \
		echo "$(GREEN)✓ .env.production já existe$(NC)"; \
	fi
	@echo ""
	@echo "$(YELLOW)4. Gerando secrets...$(NC)"
	@bash -c 'source .env.production && npm run generate-secrets'
	@echo ""
	@echo "$(GREEN)╔═══════════════════════════════════════════════════╗$(NC)"
	@echo "$(GREEN)║     ✓ Setup concluído!                           ║$(NC)"
	@echo "$(GREEN)╚═══════════════════════════════════════════════════╝$(NC)"
	@echo ""
	@echo "$(BLUE)Próximos passos:$(NC)"
	@echo "  1. Revisar e configurar .env.production"
	@echo "  2. make build"
	@echo "  3. make start"
	@echo ""

# Default target
.DEFAULT_GOAL := help

