# Painel TV - Modo Retrato

Dashboard otimizado para exibição em TVs em modo retrato (vertical).

## URL de Acesso

```
http://localhost:3000/painel/tv
```

## Características

### Layout Otimizado
- **Design vertical**: Layout de uma coluna otimizado para telas em orientação retrato
- **Cards grandes**: Estatísticas exibidas em cards maiores e mais legíveis
- **Fontes ampliadas**: Textos dimensionados para visualização à distância
- **Cores vibrantes**: Background escuro com gradientes coloridos para melhor contraste

### Funcionalidades

1. **Auto-refresh**: Atualização automática a cada 5 minutos
2. **Sem interação**: Interface read-only, ideal para displays
3. **Período fixo**: Sempre exibe dados do mês atual
4. **Todas as unidades**: Mostra consolidado de todas as unidades

### Componentes Exibidos

- **Barra de Progresso da Meta**
- **Cards de Estatísticas** (2 colunas):
  - Criadas Hoje
  - Abertas
  - Ganhas
  - Perdidas
  - Taxa de Conversão
  - Ticket Médio
- **Grid de Unidades**: Desempenho detalhado por unidade

## Configuração de TV

### Recomendações de Hardware
- **Resolução**: 1080x1920 (Full HD retrato) ou superior
- **Orientação**: Retrato (90° ou 270°)
- **Navegador**: Chrome ou Edge em modo kiosk

### Modo Kiosk (Chrome)

**Windows:**
```bash
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --app=http://localhost:3000/painel/tv
```

**Linux:**
```bash
chromium-browser --kiosk --app=http://localhost:3000/painel/tv
```

**Mac:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --kiosk --app=http://localhost:3000/painel/tv
```

### Auto-start (Windows)

1. Criar atalho do Chrome com parâmetros kiosk
2. Colocar atalho em: `C:\ProgramData\Microsoft\Windows\Start Menu\Programs\StartUp`
3. Configurar TV para ligar automaticamente

### Raspberry Pi

Criar arquivo `/home/pi/start-dashboard.sh`:

```bash
#!/bin/bash
export DISPLAY=:0
xset s off
xset -dpms
xset s noblank
chromium-browser --kiosk --noerrdialogs --disable-infobars --app=http://IP_SERVIDOR:3000/painel/tv &
```

Adicionar ao crontab:
```bash
@reboot /home/pi/start-dashboard.sh
```

## Diferenças com Painel Normal

| Recurso | Painel Normal | Painel TV |
|---------|--------------|-----------|
| **Filtros** | ✅ Disponíveis | ❌ Fixo (mês atual) |
| **Gráficos** | ✅ Sim | ❌ Removidos |
| **Header** | ✅ Completo | ⚡ Minimalista |
| **Footer** | ✅ Completo | ⚡ Minimalista |
| **Auto-refresh** | ❌ Manual | ✅ 5 minutos |
| **Interação** | ✅ Total | ❌ Read-only |
| **Layout** | 📱 Responsivo | 📺 Otimizado vertical |

## Customizações

### Alterar tempo de refresh

Editar `app/painel/tv/page.tsx`, linha 43:

```typescript
const interval = setInterval(() => {
  setUltimaAtualizacao(new Date())
  window.location.reload()
}, 5 * 60 * 1000) // Alterar aqui (em milissegundos)
```

### Alterar cores do tema

Editar `app/painel/tv/page.tsx`, background:

```typescript
<div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
```

### Adicionar logo da empresa

Editar header em `app/painel/tv/page.tsx`:

```tsx
<div className="flex items-center gap-4">
  <img src="/logo.png" alt="Logo" className="h-12" />
  <h1 className="text-4xl font-black">Dashboard Comercial</h1>
</div>
```

## Troubleshooting

### TV não atualiza
- Verificar conexão de rede
- Verificar se servidor está acessível
- Verificar logs do navegador (F12)

### Layout quebrado
- Verificar resolução da TV
- Testar com `http://IP:3000/painel/tv` direto
- Limpar cache do navegador

### Performance lenta
- Reduzir tempo de auto-refresh
- Verificar recursos do dispositivo
- Otimizar queries no backend

## Suporte

Para problemas ou sugestões, contate o time de desenvolvimento.
