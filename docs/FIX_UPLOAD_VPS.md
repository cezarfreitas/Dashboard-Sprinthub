# 🔧 Fix: Upload de Logotipo não Funciona no VPS

## 🔍 Problema

O upload de logotipo não está salvando no VPS. Os arquivos não são persistidos na pasta `public/uploads/logos`.

## ✅ Soluções Implementadas

### 1. Verificação de Permissões
- Adicionada verificação de permissões de escrita antes de salvar
- Logs detalhados para debug
- Mensagens de erro mais específicas

### 2. Estrutura de Pastas
- Criado arquivo `.gitkeep` em `public/uploads/logos/` para garantir que a estrutura existe no repositório

## 🛠️ Como Corrigir no VPS

### ✅ Solução Implementada

O código já foi atualizado para:
- ✅ Verificar permissões antes de salvar
- ✅ Criar diretório automaticamente se não existir
- ✅ Logs detalhados para debug
- ✅ Dockerfile atualizado para criar pasta com permissões corretas
- ✅ Docker Compose com volume persistente

### Opção 1: Se usar Docker Compose (Recomendado)

O `docker-compose.production.yml` já está configurado com volume persistente. Apenas execute:

```bash
# Criar pasta no host antes de subir o container
mkdir -p ./public/uploads/logos
chmod -R 755 ./public/uploads

# Subir os containers
docker-compose -f docker-compose.production.yml up -d
```

### Opção 2: Criar Pasta Manualmente (Sem Docker)

No servidor VPS, execute:

```bash
# Navegar até o diretório do projeto
cd /caminho/do/projeto

# Criar estrutura de pastas
mkdir -p public/uploads/logos

# Dar permissões de escrita
chmod 755 public/uploads
chmod 755 public/uploads/logos

# Se usar Docker, pode precisar ajustar o usuário
chown -R nextjs:nodejs public/uploads  # usuário do container
```

### Opção 3: Executar Script de Correção

Execute o script fornecido:

```bash
chmod +x scripts/fix-upload-permissions.sh
./scripts/fix-upload-permissions.sh
```

## 🔍 Verificar se Está Funcionando

1. **Testar upload** na página de configurações
2. **Verificar logs** do servidor para erros
3. **Verificar pasta** no VPS:
   ```bash
   ls -la public/uploads/logos/
   ```

## 📝 Notas Importantes

- A pasta `public/uploads` não deve estar no `.gitignore` (apenas os arquivos dentro)
- Em ambientes Docker, pode ser necessário usar volumes persistentes
- Verifique as permissões do usuário que executa a aplicação Node.js

## 🚨 Troubleshooting

### Erro: "Permission denied"
```bash
# Dar permissões
chmod -R 755 public/uploads
```

### Erro: "Diretório não existe"
```bash
# Criar manualmente
mkdir -p public/uploads/logos
```

### Arquivos são perdidos após rebuild
- Use volumes persistentes no Docker
- Ou configure armazenamento externo (S3, etc.)

