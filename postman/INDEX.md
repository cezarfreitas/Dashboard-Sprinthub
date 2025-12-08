# 📚 Postman Collection - Índice

Bem-vindo à documentação completa da API do Gestor do Dashboard SprintHub!

## 📁 Arquivos Disponíveis

### 🔧 Arquivos de Configuração

| Arquivo | Descrição | Como Usar |
|---------|-----------|-----------|
| [`Gestor-API-Collection.json`](./Gestor-API-Collection.json) | Collection completa com 11 endpoints | Importar no Postman |
| [`Gestor-Environment.json`](./Gestor-Environment.json) | Variáveis de ambiente pré-configuradas | Importar no Postman |

### 📖 Documentação

| Arquivo | Descrição | Para Quem |
|---------|-----------|-----------|
| [`QUICK_START.md`](./QUICK_START.md) | ⚡ Guia rápido de 3 passos | Iniciantes |
| [`README.md`](./README.md) | 📋 Documentação completa de todas APIs | Desenvolvedores |
| [`INDEX.md`](./INDEX.md) | 📚 Este arquivo (navegação) | Todos |

---

## 🚀 Como Começar

### Para Iniciantes
1. Leia o [`QUICK_START.md`](./QUICK_START.md)
2. Importe os arquivos `.json` no Postman
3. Faça o primeiro login
4. Comece a testar!

### Para Desenvolvedores
1. Importe a collection: `Gestor-API-Collection.json`
2. Importe o environment: `Gestor-Environment.json`
3. Consulte [`README.md`](./README.md) para documentação detalhada
4. Configure as variáveis conforme seu ambiente

---

## 📋 APIs Disponíveis

### 🔑 Autenticação (2 endpoints)
- ✅ Login do Gestor
- ✅ Verificar Autenticação

### 📊 Estatísticas (1 endpoint)
- ✅ Obter Estatísticas da Unidade
  - Oportunidades (criadas, ganhas, perdidas, abertas)
  - Valores e metas
  - Estatísticas por vendedor
  - Distribuição por etapas do funil

### 🏢 Unidades (1 endpoint)
- ✅ Obter Dados da Unidade
  - Informações básicas
  - Vendedores na fila
  - Vendedores fora da fila
  - Configuração da roleta

### 🔄 Fila de Leads (3 endpoints)
- ✅ Listar Filas
- ✅ Atualizar Ordem de Vendedores
- ✅ Alternar Status da Fila

### 🚫 Ausências (3 endpoints)
- ✅ Listar Ausências da Unidade
- ✅ Criar Nova Ausência
- ✅ Remover Ausência

### 📝 Logs (1 endpoint)
- ✅ Obter Logs de Distribuição
  - Histórico completo
  - Paginação
  - Filtros por data

**Total: 11 endpoints completos**

---

## 🎯 Casos de Uso Comuns

### 1. Dashboard do Gestor
```
Login → Estatísticas → Listar Filas
```

### 2. Gerenciar Fila
```
Listar Filas → Atualizar Ordem → Ver Logs
```

### 3. Gerenciar Ausências
```
Listar Ausências → Criar Ausência → (quando retornar) → Remover Ausência
```

### 4. Análise de Performance
```
Estatísticas da Unidade → Logs de Distribuição → Estatísticas por Vendedor
```

---

## 🔧 Configuração Rápida

### Variáveis Principais

| Variável | Onde Obter | Exemplo |
|----------|------------|---------|
| `gestor_id` | Resposta do Login | `254` |
| `unidade_id` | Resposta do Login | `92` |
| `gestor_email` | Cadastro do vendedor | `gestor@email.com` |

### URLs Base

| Ambiente | URL |
|----------|-----|
| **Local** | `http://localhost:3000` |
| **Produção** | `https://seu-dominio.com` |

---

## 📊 Estrutura da Collection

```
Gestor API Collection
├── 🔑 Autenticação
│   ├── Login Gestor (POST)
│   └── Verificar Autenticação (GET)
│
├── 📊 Estatísticas
│   └── Obter Estatísticas da Unidade (GET)
│
├── 🏢 Unidades
│   └── Obter Dados da Unidade (GET)
│
├── 🔄 Fila de Leads
│   ├── Listar Filas (GET)
│   ├── Atualizar Fila de Vendedores (PUT)
│   └── Alternar Status da Fila (PATCH)
│
├── 🚫 Ausências
│   ├── Listar Ausências da Unidade (GET)
│   ├── Criar Ausência (POST)
│   └── Remover Ausência (DELETE)
│
└── 📝 Logs de Distribuição
    └── Obter Logs de Distribuição (GET)
```

---

## 🎨 Features Especiais

### ✅ Suporte a Múltiplos Gestores
- Campo `user_gestao` aceita JSON array: `[254, 323]`
- Backward compatible com número único: `254`
- Todas as APIs adaptadas

### ✅ Filtros Avançados
- Datas: `dataInicio` e `dataFim`
- Busca: `search`
- Paginação: `page` e `limit`

### ✅ Validações Completas
- Campos obrigatórios
- Formatos de data
- Limites de valores
- Verificação de permissões

### ✅ Respostas Padronizadas
```json
{
  "success": true|false,
  "message": "...",
  "data": {...}
}
```

---

## 🐛 Troubleshooting

### Problema: Collection não carrega
**Solução:** Verifique se a versão do Postman é compatível (v10+)

### Problema: Variáveis não funcionam
**Solução:** Certifique-se de ter selecionado o environment "Gestor - Local Development"

### Problema: Erro 403 em todas requisições
**Solução:** Faça login novamente e atualize o `gestor_id`

### Problema: Nenhuma fila aparece
**Solução:** Adicione o header `x-gestor-id` na requisição

---

## 📚 Documentação Adicional

### Arquivos no Projeto

- **Schema do Banco:** `../banco.sql`
- **Código das APIs:** `../app/api/gestor/` e `../app/api/fila/`
- **Components:** `../components/gestor/`
- **Hooks:** `../hooks/gestor/` e `../hooks/fila/`

### URLs da Aplicação

- **Home Gestor:** http://localhost:3000/gestor
- **Fila de Leads:** http://localhost:3000/gestor/fila
- **Dashboard:** http://localhost:3000/gestor/dashboard

---

## 🔄 Atualizações

### v1.0.0 (2024-12-08)
- ✅ Collection completa criada
- ✅ 11 endpoints documentados
- ✅ Environment pré-configurado
- ✅ Guias de uso completos
- ✅ Suporte a `user_gestao` como JSON array

---

## 💡 Dicas

1. **Use o environment:** Facilita a troca entre ambientes (dev, prod)
2. **Salve suas variáveis:** Use scripts para salvar respostas automaticamente
3. **Organize testes:** Crie testes automáticos para validar respostas
4. **Documente mudanças:** Se adicionar endpoints, atualize a collection

---

## 🆘 Suporte

**Problemas ou dúvidas?**

1. Consulte [`README.md`](./README.md) para documentação detalhada
2. Veja [`QUICK_START.md`](./QUICK_START.md) para guia rápido
3. Verifique logs do servidor no terminal
4. Entre em contato com o time de desenvolvimento

---

## 📝 Licença

Este projeto é parte do **Dashboard SprintHub - CRM by INTELI**

---

**Bons testes! 🚀**

