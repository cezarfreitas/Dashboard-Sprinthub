# 📦 Configurar Volume Mount para Uploads no Easypanel

## 🎯 Objetivo

Configurar um volume persistente para armazenar os arquivos de upload (logotipos) no Easypanel, garantindo que os arquivos não sejam perdidos quando o container for reiniciado.

## 📋 Passo a Passo

### 1. Acessar a Seção de Mounts

1. No painel do Easypanel, vá para o seu projeto
2. Navegue até a seção **"Mounts"** ou **"Volumes"**
3. Você verá a interface de configuração de mounts

### 2. Configurar o Volume Mount

⚠️ **IMPORTANTE**: O volume mount deve ser configurado **manualmente na interface do Easypanel**, não via arquivo JSON.

#### Passo a Passo:

1. **Remover o volume existente** (se houver):
   - Clique no botão **"Remove"** ao lado do volume "upload" existente

2. **Criar novo Volume Mount**:
   - Clique no botão **"Add Volume Mount"**
   - Você verá dois campos para preencher

3. **Configurar os campos**:

   **Primeiro campo (Volume Name):**
   ```
   uploads
   ```
   *(Nome do volume Docker que será criado - use apenas letras minúsculas e sem espaços)*

   **Segundo campo (Container Path):**
   ```
   /app/public/uploads
   ```
   ⚠️ **ATENÇÃO**: O caminho **DEVE** começar com `/` (barra) e ser um caminho absoluto.
   
   *(Caminho dentro do container onde o volume será montado - deve ser absoluto)*

4. **Salvar**:
   - Clique em **"Save"** ou **"Apply"**
   - Aguarde a confirmação de que o mount foi criado

#### ⚠️ Erro Comum: "invalid mount target, must be an absolute path"

Se você receber este erro, verifique:
- ✅ O caminho começa com `/` (ex: `/app/public/uploads`)
- ✅ Não há espaços no início ou fim do caminho
- ✅ O caminho não contém caracteres especiais inválidos
- ✅ O caminho está no formato Linux (não Windows)

## ✅ Configuração Correta

Após configurar, você deve ter:

- **Volume Name**: `uploads`
- **Container Path**: `/app/public/uploads`

## 🔍 Verificar se Está Funcionando

### 1. Verificar no Container

Após o deploy, você pode verificar se o volume está montado corretamente:

```bash
# Entrar no container (se tiver acesso SSH)
docker exec -it <container-name> ls -la /app/public/uploads

# Deve mostrar a estrutura de pastas, incluindo:
# - logos/
```

### 2. Testar Upload

1. Acesse a página de configurações: `/configuracoes`
2. Faça upload de um logotipo
3. Verifique se o arquivo aparece corretamente
4. Reinicie o container e verifique se o arquivo ainda está lá

## 📝 Notas Importantes

- ✅ O volume será criado automaticamente pelo Docker/Easypanel
- ✅ Os arquivos serão persistidos mesmo após reiniciar o container
- ✅ O caminho `/app/public/uploads` é o caminho **dentro do container**
- ✅ O volume `uploads` será gerenciado pelo Docker

## 🚨 Troubleshooting

### Volume não está montando

1. Verifique se o caminho está correto: `/app/public/uploads`
2. Verifique se o nome do volume não tem espaços ou caracteres especiais
3. Tente remover e recriar o volume mount

### Arquivos não aparecem após upload

1. Verifique as permissões do volume
2. Verifique os logs do container para erros
3. Confirme que o caminho no código está correto: `/app/public/uploads/logos`

### Erro de permissão

O Dockerfile já está configurado para criar a pasta com as permissões corretas. Se ainda houver problemas:

1. Verifique se o usuário do container tem permissão de escrita
2. O Dockerfile já configura: `chown -R nextjs:nodejs /app/public/uploads`

## 📚 Referências

- [Docker Volumes Documentation](https://docs.docker.com/storage/volumes/)
- [Easypanel Documentation](https://easypanel.io/docs)

