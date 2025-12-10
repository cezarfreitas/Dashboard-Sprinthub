# 📋 Status da Duplicação Gestor → Consultor

## ✅ Arquivos Criados

### Estrutura de Rotas
- ✅ `app/consultor/layout.tsx` - Layout da área do consultor
- ✅ `app/consultor/page.tsx` - Página de login do consultor
- ✅ `app/consultor/dashboard/page.tsx` - Dashboard principal

### Hooks
- ✅ `hooks/consultor/useConsultorDashboard.ts` - Hook principal com lógica do dashboard

### Componentes Base
- ✅ `components/header_consultor.tsx` - Header específico do consultor
- ✅ `components/consultor/ConsultorPeriodoFilter.tsx` - Filtro de período

### Scripts
- ✅ `scripts/duplicar-gestor-para-consultor.sh` - Script bash para automação (não funciona no Windows)

---

## ⏳ Componentes que Precisam Ser Criados

Para que o dashboard funcione, os seguintes componentes precisam ser criados em `components/consultor/`:

### Componentes de Cards
1. `ConsultorEstatisticasCards.tsx` - Container de todos os cards
2. `ConsultorCardHoje.tsx` - Card de oportunidades hoje
3. `ConsultorCardAbertas.tsx` - Card de oportunidades abertas
4. `ConsultorCardPerdidas.tsx` - Card de oportunidades perdidas
5. `ConsultorCardGanhos.tsx` - Card de oportunidades ganhas
6. `ConsultorCardTaxaConversao.tsx` - Card de taxa de conversão
7. `ConsultorCardTicketMedio.tsx` - Card de ticket médio

### Componentes de Visualização
8. `ConsultorBarraProgressoMeta.tsx` - Barra de progresso da meta
9. `ConsultorOportunidadesDiarias.tsx` - Gráfico de oportunidades por dia
10. `ConsultorGanhosDiarios.tsx` - Gráfico de ganhos por dia
11. `ConsultorMatrizMotivosPerda.tsx` - Matriz de motivos de perda

---

## 🔧 Diferenças Principais: Gestor vs Consultor

### Gestor
- Visualiza **múltiplas unidades**
- Tem **seletor de unidade** no header
- Vê dados de **todos os vendedores** da unidade
- Acesso à **fila de atendimento**
- APIs usam: `unidade_id`

### Consultor
- Visualiza **apenas sua unidade**
- Mostra **badge da unidade** (não selecionável)
- Vê apenas **suas próprias oportunidades**
- Sem acesso à fila
- APIs usam: `unidade_id` + `vendedor_id`

---

## 🎯 Próximos Passos

### 1. Criar Componentes Faltantes

**Opção A - Manual (Windows):**
```powershell
# Para cada componente de gestor, criar versão consultor
$componentes = @(
  "GestorEstatisticasCards",
  "GestorBarraProgressoMeta",
  "GestorCardHoje",
  "GestorCardAbertas",
  "GestorCardPerdidas",
  "GestorCardGanhos",
  "GestorCardTaxaConversao",
  "GestorCardTicketMedio",
  "GestorOportunidadesDiarias",
  "GestorGanhosDiarios",
  "GestorMatrizMotivosPerda"
)

foreach ($comp in $componentes) {
  $origem = "components/gestor/$comp.tsx"
  $destino = "components/consultor/$($comp -replace 'Gestor','Consultor').tsx"
  
  if (Test-Path $origem) {
    $conteudo = Get-Content $origem -Raw
    $conteudo = $conteudo -replace 'Gestor','Consultor'
    $conteudo = $conteudo -replace 'gestor','consultor'
    $conteudo | Set-Content $destino
    Write-Host "✅ Criado: $destino"
  }
}
```

**Opção B - Criar Stubs Primeiro:**
Criar versões mínimas que renderizam mensagem "Em desenvolvimento"

### 2. Ajustar Lógica de Filtros

Nos componentes do consultor, adicionar `vendedor_id` nos params das APIs:

```typescript
// Gestor
const params = new URLSearchParams()
params.append('unidade_id', unidadeId.toString())

// Consultor
const params = new URLSearchParams()
params.append('unidade_id', unidadeId.toString())
params.append('vendedor_id', vendedorId.toString()) // ← ADICIONAR ISTO
```

### 3. Verificar APIs Existentes

Confirmar que as APIs suportam filtro por `vendedor_id`:
- ✅ `/api/oportunidades/today`
- ✅ `/api/oportunidades/stats`
- ⚠️ `/api/meta/vendedor` - Verificar se existe
- ⚠️ Outras APIs de gráficos

### 4. Testar Fluxo Completo

1. Login em `/consultor`
2. Redirecionamento para `/consultor/dashboard`
3. Carregar dados do consultor
4. Filtros funcionando
5. Cards exibindo dados corretos
6. Gráficos renderizando

---

## 📝 Notas Técnicas

### LocalStorage
- **Gestor:** `localStorage.getItem('gestor')`
- **Consultor:** `localStorage.getItem('consultor')`

### Cores do Tema
- **Gestor:** Primary color (padrão do tema)
- **Consultor:** Blue-600 (diferenciação visual)

### Rotas de API
- **Gestor:** `/api/auth/gestor` (POST) - Login apenas com email
- **Consultor:** `/api/auth/consultor` (POST) - ✅ **Login apenas com email** (atualizado)

---

## ⚠️ Atenção

### ✅ API de Autenticação do Consultor - ATUALIZADA

A API `/api/auth/consultor` foi **atualizada** para funcionar apenas com **email**, igual ao gestor.

**Funcionamento:**
```typescript
POST /api/auth/consultor
Body: { "email": "consultor@exemplo.com" }
```

**Validações implementadas:**
- ✅ Email obrigatório
- ✅ Formato de email válido
- ✅ Consultor ativo (`ativo = 1` e `status = 'active'`)
- ✅ Unidade vinculada (obrigatório)

### Isolamento de Componentes

**CRÍTICO:** Os componentes de `consultor` devem ser **totalmente independentes** de `gestor`.

❌ **Não fazer:**
```typescript
import { GestorCardHoje } from "@/components/gestor/GestorCardHoje"
```

✅ **Fazer:**
```typescript
import { ConsultorCardHoje } from "@/components/consultor/ConsultorCardHoje"
```

---

## 🚀 Comando Rápido para Criar Stubs (PowerShell)

```powershell
$componentes = @(
  "ConsultorEstatisticasCards",
  "ConsultorBarraProgressoMeta",
  "ConsultorCardHoje",
  "ConsultorCardAbertas",
  "ConsultorCardPerdidas",
  "ConsultorCardGanhos",
  "ConsultorCardTaxaConversao",
  "ConsultorCardTicketMedio",
  "ConsultorOportunidadesDiarias",
  "ConsultorGanhosDiarios",
  "ConsultorMatrizMotivosPerda"
)

foreach ($comp in $componentes) {
  $stub = @"
export function $comp() {
  return (
    <div className="p-4 border border-gray-300 rounded-lg bg-gray-50">
      <p className="text-sm text-gray-600">Componente $comp em desenvolvimento</p>
    </div>
  )
}
"@
  
  $stub | Set-Content "components/consultor/$comp.tsx"
  Write-Host "✅ Criado stub: $comp.tsx"
}
```

---

**Última atualização:** 10 de dezembro de 2025  
**Status:** 🟡 Em andamento (30% completo)

