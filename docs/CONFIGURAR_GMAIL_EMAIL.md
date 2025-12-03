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

### Erro: "Invalid login"
- Verifique se a senha de app está correta
- Certifique-se de que a verificação em duas etapas está ativada
- Tente gerar uma nova senha de app

### Erro: "Connection timeout"
- Verifique sua conexão com a internet
- Gmail pode estar bloqueando conexões. Tente novamente em alguns minutos

### Email não chega
- Verifique a pasta de Spam
- Verifique se o email de destino está correto
- Verifique os logs do servidor para erros

## 📝 Notas Importantes

- **Senha de App**: Use sempre senha de app, nunca sua senha normal do Gmail
- **Segurança**: Mantenha as variáveis de ambiente seguras, nunca as commite no Git
- **Limites**: Gmail tem limite de 500 emails/dia para contas gratuitas
- **Domínio**: Se usar Gmail Workspace, pode usar seu domínio personalizado

