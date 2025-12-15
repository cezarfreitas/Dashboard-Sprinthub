#!/bin/bash

# Script para aplicar migration da tabela otp_codes
# Data: 2024-12-15

set -e

echo "======================================"
echo "Migration: Criar tabela otp_codes"
echo "======================================"
echo ""

# Carregar variáveis de ambiente
if [ -f .env.local ]; then
    export $(grep -v '^#' .env.local | xargs)
else
    echo "❌ Arquivo .env.local não encontrado!"
    exit 1
fi

# Validar variáveis necessárias
if [ -z "$DB_HOST" ] || [ -z "$DB_PORT" ] || [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Variáveis de ambiente do banco de dados não configuradas!"
    echo "Certifique-se de que DB_HOST, DB_PORT, DB_NAME, DB_USER e DB_PASSWORD estão definidas em .env.local"
    exit 1
fi

echo "📊 Conectando ao banco de dados..."
echo "Host: $DB_HOST"
echo "Port: $DB_PORT"
echo "Database: $DB_NAME"
echo ""

# Aplicar migration
echo "📝 Aplicando migration 009_create_otp_codes_table.sql..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < db/migrations/009_create_otp_codes_table.sql

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration aplicada com sucesso!"
    echo ""
    echo "Tabela 'otp_codes' criada com os seguintes campos:"
    echo "  - id (INT, AUTO_INCREMENT)"
    echo "  - email (VARCHAR 255)"
    echo "  - code (VARCHAR 6)"
    echo "  - vendedor_id (INT)"
    echo "  - expires_at (DATETIME)"
    echo "  - verified (TINYINT)"
    echo "  - verified_at (DATETIME)"
    echo "  - attempts (INT)"
    echo "  - ip_address (VARCHAR 45)"
    echo "  - user_agent (TEXT)"
    echo "  - created_at (TIMESTAMP)"
    echo ""
else
    echo ""
    echo "❌ Erro ao aplicar migration!"
    exit 1
fi

echo "======================================"
echo "Migration concluída!"
echo "======================================"

