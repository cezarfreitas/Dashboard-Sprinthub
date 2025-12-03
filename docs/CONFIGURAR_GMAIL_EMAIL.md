# 📧 Como Configurar Gmail para Enviar Emails de Recuperação de Senha

Este guia explica como configurar uma conta Gmail para enviar emails de recuperação de senha.

## 🔐 Passo 1: Criar Senha de App no Gmail

Para usar Gmail com aplicações externas, você precisa criar uma **Senha de App** (não use sua senha normal do Gmail).

### 1.1. Ativar Verificação em Duas Etapas

1. Acesse: https://myaccount.google.com/security
2. Ative a **Verificação em duas etapas** (obrigatório para criar senha de app)

### 1.2. Criar Senha de App

1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione **App**: "Outro (nome personalizado)"
3. Digite um nome: "Dashboard Sistema"
4. Clique em **Gerar**
5. **Copie a senha gerada** (16 caracteres, sem espaços)

⚠️ **IMPORTANTE**: Esta senha será usada apenas uma vez. Guarde-a com segurança!

## ⚙️ Passo 2: Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no seu arquivo `.env.local` ou no servidor:

```env
# Configurações de Email Gmail
GMAIL_USER=seu-email@gmail.com
GMAIL_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_FROM=Sistema <seu-email@gmail.com>
```

**Exemplo:**
```env
GMAIL_USER=contato@minhaempresa.com
GMAIL_PASSWORD=abcd efgh ijkl mnop
EMAIL_FROM=Sistema <contato@minhaempresa.com>
```

### Notas:
- `GMAIL_USER`: Seu email Gmail completo
- `GMAIL_PASSWORD`: A senha de app gerada (pode ter espaços, será removida automaticamente)
- `EMAIL_FROM`: Nome e email que aparecerá como remetente

## 🚀 Passo 3: Reiniciar a Aplicação

Após configurar as variáveis:

1. **Desenvolvimento**: Reinicie o servidor (`npm run dev`)
2. **Produção**: Reinicie o servidor ou faça redeploy

## ✅ Passo 4: Testar

1. Acesse a página de recuperação de senha
2. Digite um email cadastrado
3. Verifique se o email foi recebido

## ⚠️ Importante

**Apenas Gmail é suportado agora.** O sistema requer que `GMAIL_USER` e `GMAIL_PASSWORD` estejam configurados. Se não estiverem configurados, o envio de emails falhará com uma mensagem de erro clara.

## 🛠️ Troubleshooting

### Erro: "Application-specific password required" ou "Invalid login"

Este erro ocorre quando:
- A conta Gmail tem verificação em duas etapas ativada
- Você está usando a senha normal da conta ao invés de uma senha de app

**Solução:**
1. Acesse: https://myaccount.google.com/apppasswords
2. Selecione "Mail" e "Other (Custom name)"
3. Digite um nome (ex: "Dashboard Sistema")
4. Clique em "Generate"
5. Copie a senha gerada (16 caracteres, sem espaços)
6. Use essa senha no `GMAIL_PASSWORD` (não a senha normal da conta)

**Importante:**
- ⚠️ Use a **senha de app** (16 caracteres), não a senha normal
- ⚠️ A verificação em duas etapas **deve estar ativada** para gerar senhas de app
- ⚠️ Se a conta não tem verificação em duas etapas, ative primeiro em: https://myaccount.google.com/security

### Erro: "Invalid login" (sem mensagem de senha de app)
- Verifique se a senha de app está correta (copie exatamente, sem espaços)
- Certifique-se de que a verificação em duas etapas está ativada
- Tente gerar uma nova senha de app
- Tente gerar uma nova senha de app

### Erro: "Connection timeout"
- Verifique sua conexão com a internet
- Gmail pode estar bloqueando conexões. Tente novamente em alguns minutos

### Email não chega
- Verifique a pasta de Spam
- Verifique se o email de destino está correto
- Verifique os logs do servidor para erros

### Logotipo não aparece no email
- ⚠️ **Muitos clientes de email bloqueiam imagens externas por padrão** (Gmail, Outlook, etc.)
- O usuário precisa clicar em "Mostrar imagens" ou "Permitir imagens" no email
- Verifique se a URL do logotipo está acessível publicamente:
  - Acesse a URL diretamente no navegador
  - Deve retornar a imagem, não erro 404
- Verifique os logs do servidor para ver a URL gerada
- A URL deve ser absoluta (começar com `http://` ou `https://`)
- Certifique-se de que `NEXT_PUBLIC_APP_URL` está configurado corretamente no servidor

## 📝 Notas Importantes

- **Senha de App**: Use sempre senha de app, nunca sua senha normal do Gmail
- **Segurança**: Mantenha as variáveis de ambiente seguras, nunca as commite no Git
- **Limites**: Gmail tem limite de 500 emails/dia para contas gratuitas
- **Domínio**: Se usar Gmail Workspace, pode usar seu domínio personalizado

