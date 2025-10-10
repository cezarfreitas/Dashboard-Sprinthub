# 🎯 Sistema de Metas - Configuração do Banco de Dados

Este documento explica como configurar o banco de dados para o sistema de metas do Dash Inteli.

## 📋 Pré-requisitos

- MySQL 5.7+ ou MariaDB 10.3+
- Node.js 18+
- Variáveis de ambiente configuradas

## 🔧 Configuração

### 1. Variáveis de Ambiente

Certifique-se de que as seguintes variáveis estão configuradas no seu arquivo `.env`:

```env
# Banco de Dados
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=sua_senha
DB_NAME=dash_inteli

# Outras variáveis necessárias
DATABASE_URL=mysql://root:sua_senha@localhost:3306/dash_inteli
```

### 2. Criar Banco de Dados

```sql
CREATE DATABASE dash_inteli CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Executar Script de Configuração

#### Opção A: Script Automático (Recomendado)

```bash
# Instalar dependências se necessário
npm install mysql2

# Executar script de configuração
node scripts/run-setup-metas.js
```

#### Opção B: Manual

```bash
# Conectar ao MySQL
mysql -u root -p dash_inteli

# Executar o script SQL
source scripts/setup-metas-database.sql
```

## 📊 Estrutura das Tabelas

### 1. `unidades`
- Gerencia as unidades/filiais da empresa
- Campos: id, nome, responsavel, ativo, created_at, updated_at

### 2. `vendedores`
- Cadastro de vendedores
- Campos: id, name, lastName, email, username, telephone, cpf, birthDate, ativo, created_at, updated_at

### 3. `vendedores_unidades`
- Relacionamento many-to-many entre vendedores e unidades
- Campos: id, vendedor_id, unidade_id, ativo, created_at, updated_at

### 4. `metas_mensais`
- Metas mensais por vendedor/unidade
- Campos: id, vendedor_id, unidade_id, mes, ano, meta_valor, meta_descricao, status, created_at, updated_at

### 5. `metas_historico`
- Histórico de alterações nas metas
- Campos: id, meta_id, vendedor_id, unidade_id, mes, ano, valor_anterior, valor_novo, descricao_anterior, descricao_nova, acao, usuario_alteracao, created_at

## 🚀 Funcionalidades

### ✅ Implementadas
- ✅ Criação automática de tabelas
- ✅ Inserção de dados de exemplo
- ✅ API REST completa (GET, POST, PUT, DELETE)
- ✅ Validações de dados
- ✅ Histórico de alterações
- ✅ Soft delete (cancelamento em vez de exclusão)
- ✅ Índices otimizados para performance
- ✅ Foreign keys para integridade referencial

### 🎯 Recursos da Interface
- ✅ Matriz de metas por unidade
- ✅ Matriz de metas geral
- ✅ Edição inline de metas
- ✅ Exportação CSV
- ✅ Validação de valores
- ✅ Interface responsiva

## 📝 Consultas Úteis

### Buscar metas de um vendedor específico
```sql
SELECT m.*, v.name, v.lastName, u.nome as unidade_nome
FROM metas_mensais m
JOIN vendedores v ON m.vendedor_id = v.id
JOIN unidades u ON m.unidade_id = u.id
WHERE v.id = 1 AND m.ano = 2024;
```

### Buscar metas por unidade
```sql
SELECT m.*, v.name, v.lastName
FROM metas_mensais m
JOIN vendedores v ON m.vendedor_id = v.id
WHERE m.unidade_id = 1 AND m.ano = 2024;
```

### Calcular total de metas por mês
```sql
SELECT mes, SUM(meta_valor) as total_metas
FROM metas_mensais
WHERE ano = 2024 AND status = 'ativa'
GROUP BY mes
ORDER BY mes;
```

### Histórico de alterações
```sql
SELECT h.*, v.name as vendedor_nome, u.nome as unidade_nome
FROM metas_historico h
JOIN vendedores v ON h.vendedor_id = v.id
JOIN unidades u ON h.unidade_id = u.id
WHERE h.meta_id = 1
ORDER BY h.created_at DESC;
```

## 🔍 Verificação

Após a configuração, verifique se tudo está funcionando:

1. **Acesse a interface**: http://localhost:3000/metas/config
2. **Teste a criação de metas**: Clique em "+ Meta" em qualquer célula
3. **Teste a edição**: Clique em uma meta existente para editar
4. **Verifique a matriz por unidade**: Use o botão "Por Unidade"
5. **Teste a exportação**: Clique em "Exportar CSV"

## 🐛 Solução de Problemas

### Erro de Conexão
```
ER_ACCESS_DENIED_ERROR
```
**Solução**: Verifique as credenciais do banco nas variáveis de ambiente.

### Banco Não Existe
```
ER_BAD_DB_ERROR
```
**Solução**: Crie o banco de dados primeiro:
```sql
CREATE DATABASE dash_inteli;
```

### Tabelas Não Criadas
**Solução**: Execute o script SQL manualmente:
```bash
mysql -u root -p dash_inteli < scripts/setup-metas-database.sql
```

### Dados Não Aparecem
**Solução**: Verifique se há vendedores e unidades cadastrados:
```sql
SELECT COUNT(*) FROM vendedores WHERE ativo = 1;
SELECT COUNT(*) FROM unidades WHERE ativo = 1;
```

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs do console do navegador
2. Verifique os logs do servidor Node.js
3. Execute as consultas de verificação acima
4. Confirme que todas as variáveis de ambiente estão corretas

## 🎉 Pronto!

Após seguir estes passos, o sistema de metas estará totalmente funcional com persistência no banco de dados!
