# 📧 Como Configurar Gmail para Sistema OTP

## ❌ Erro Atual

```
Erro ao enviar email. Verifique as configurações de email.
```

**Causa:** Variáveis `GMAIL_USER` e `GMAIL_PASSWORD` não estão configuradas.

---

## ✅ Solução Passo a Passo

### 1️⃣ Gerar Senha de App do Gmail

O Gmail requer uma **senha de app** (não a senha normal da conta) para enviar emails via SMTP.

#### Passo a Passo:

1. **Ativar Verificação em Duas Etapas:**
   - Acesse: https://myaccount.google.com/security
   - Clique em "Verificação em duas etapas"
   - Siga as instruções para ativar

2. **Gerar Senha de App:**
   - Acesse: https://myaccount.google.com/apppasswords
   - Faça login com sua conta do Gmail
   - Selecione: "Outro (nome personalizado)"
   - Digite: "Dash Inteli OTP"
   - Clique em "Gerar"
   - **Copie a senha de 16 caracteres** (exemplo: `abcd efgh ijkl mnop`)

3. **⚠️ IMPORTANTE:**
   - A senha será exibida apenas uma vez
   - Anote ou copie imediatamente
   - Não compartilhe com ninguém

---

### 2️⃣ Adicionar Variáveis no .env.local

Abra o arquivo `.env.local` e adicione/atualize:

```env
# Configurações de Email (Gmail SMTP - Obrigatório)
GMAIL_USER=seu-email@gmail.com
GMAIL_PASSWORD=abcdefghijklmnop
EMAIL_FROM=Sistema Dash Inteli <seu-email@gmail.com>
```

**Substitua:**
- `seu-email@gmail.com` pelo seu email Gmail
- `abcdefghijklmnop` pela senha de app gerada (remova espaços)

**Exemplo Real:**
```env
GMAIL_USER=contato@minhaempresa.com.br
GMAIL_PASSWORD=xpto1234abcd5678
EMAIL_FROM=Dash Inteli <contato@minhaempresa.com.br>
```

---

### 3️⃣ Reiniciar o Servidor

Após salvar o `.env.local`, reinicie o servidor:

```bash
# Parar servidor atual (Ctrl+C no terminal)
# Depois executar:
npm run dev
```

---

### 4️⃣ Testar o Sistema OTP

1. Acesse: http://localhost:3000/consultor
2. Digite um email de vendedor cadastrado
3. Clique em "Enviar Código"
4. Verifique seu email ✅

---

## 🔍 Troubleshooting

### Erro: "Invalid login" ou "EAUTH"

**Causa:** Senha incorreta ou verificação em duas etapas não ativada.

**Solução:**
1. Verifique se a verificação em duas etapas está ativada
2. Gere uma nova senha de app
3. Certifique-se de usar a senha de app (não a senha da conta)

---

### Erro: "Application-specific password required"

**Causa:** Tentando usar senha normal ao invés de senha de app.

**Solução:**
1. Gere uma senha de app em: https://myaccount.google.com/apppasswords
2. Use essa senha no `GMAIL_PASSWORD`

---

### Erro: "Connection timeout"

**Causa:** Firewall bloqueando porta 465/587.

**Solução:**
1. Verifique firewall
2. Tente em outra rede
3. Verifique se Gmail SMTP está acessível

---

### Email não chega (nenhum erro)

**Causa:** Email pode estar na pasta Spam.

**Solução:**
1. Verifique pasta Spam/Lixo Eletrônico
2. Adicione seu email aos contatos
3. Marque como "Não é spam"

---

## 📋 Checklist Final

Antes de testar, verifique:

- [ ] Verificação em duas etapas do Gmail ativada
- [ ] Senha de app gerada e copiada
- [ ] `GMAIL_USER` configurado no `.env.local`
- [ ] `GMAIL_PASSWORD` configurado no `.env.local` (sem espaços)
- [ ] `EMAIL_FROM` configurado (opcional)
- [ ] Servidor reiniciado após alterações
- [ ] Email de teste cadastrado no banco (tabela `vendedores`)

---

## 🧪 Teste Manual da Configuração

Para testar se o Gmail está configurado corretamente, execute:

```bash
node scripts/test-gmail-config.js
```

---

## 🆘 Precisa de Ajuda?

Se ainda não funcionar:

1. Verifique os logs do servidor (terminal onde roda `npm run dev`)
2. Procure por mensagens de erro relacionadas a "email" ou "gmail"
3. Verifique se o email do vendedor existe no banco:
   ```sql
   SELECT id, name, lastName, email 
   FROM vendedores 
   WHERE email = 'seu-email@example.com';
   ```

---

## 📞 Alternativas ao Gmail

Se não conseguir usar Gmail, outras opções:

### SendGrid (Gratuito até 100 emails/dia)
- https://sendgrid.com
- Requer configuração diferente

### AWS SES (Pago)
- https://aws.amazon.com/ses/
- Mais complexo de configurar

### Mailgun (Gratuito até 100 emails/dia)
- https://www.mailgun.com
- Requer configuração diferente

---

**⚠️ ATENÇÃO:** Por enquanto, o sistema está configurado apenas para Gmail. Para usar outros provedores, será necessário modificar o código em `lib/email.ts`.

---

**Última atualização:** 15 de Dezembro de 2024

