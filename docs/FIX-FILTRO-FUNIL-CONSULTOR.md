# Correção: Filtro de Funil no Dashboard do Consultor

## Problema Identificado

O filtro de funil não estava funcionando nos componentes do dashboard do consultor. Os componentes sempre mostravam dados do funil de vendas (ID 4), independente do funil selecionado no filtro.

**Componentes afetados:**
- `ConsultorFunilEtapas` - Oportunidades por Etapa do Funil
- `ConsultorOportunidadesDiarias` - Oportunidades Diárias
- `ConsultorMatrizMotivosPerda` - Matriz de Motivos de Perda

## Causa Raiz

Os componentes tinham valores **hardcoded** para o funil ID 4 e não recebiam o `funilSelecionado` como prop:

### Exemplo do problema no `ConsultorFunilEtapas`:

```typescript
// ANTES - Linha 121
const colunasResponse = await fetch('/api/funil/colunas?funil_id=4')

// ANTES - Linha 139
const oportResponse = await fetch(
  `/api/consultor/oportunidades-por-coluna?vendedor_id=${vendedorId}&funil_id=4`
)
```

## Solução Implementada

### 1. Adicionado `funilSelecionado` como prop opcional

Para cada componente, adicionei a prop `funilSelecionado` como opcional:

```typescript
interface ConsultorFunilEtapasProps {
  vendedorId: number
  dataInicio: string
  dataFim: string
  funilSelecionado?: string | null  // ✅ Nova prop
}
```

### 2. Usar funil selecionado ou funil de vendas como padrão

```typescript
// Usar funil selecionado ou funil de vendas (ID 4) como padrão
const funilId = funilSelecionado || '4'

const colunasResponse = await fetch(`/api/funil/colunas?funil_id=${funilId}`)
const oportResponse = await fetch(
  `/api/consultor/oportunidades-por-coluna?vendedor_id=${vendedorId}&funil_id=${funilId}`
)
```

### 3. Adicionar filtro de funil nas queries condicionalmente

Para componentes que fazem múltiplas requisições (como `ConsultorOportunidadesDiarias`):

```typescript
const paramsCriadas = new URLSearchParams()
paramsCriadas.append('tipo', 'criadas')
paramsCriadas.append('data_inicio', dataInicio)
paramsCriadas.append('data_fim', dataFim)
paramsCriadas.append('user_id', vendedorId.toString())
paramsCriadas.append('all', '1')

// ✅ Adicionar filtro de funil se selecionado
if (funilSelecionado) {
  paramsCriadas.append('funil_id', funilSelecionado)
}
```

### 4. Adicionar `funilSelecionado` nas dependências do useEffect

```typescript
// ANTES
useEffect(() => {
  fetchData()
}, [vendedorId, dataInicio, dataFim])

// DEPOIS
useEffect(() => {
  fetchData()
}, [vendedorId, dataInicio, dataFim, funilSelecionado])  // ✅ Adicionado
```

### 5. Passar `funilSelecionado` da página para os componentes

No `app/consultor/dashboard/page.tsx`:

```typescript
<ConsultorFunilEtapas
  vendedorId={consultor.id}
  dataInicio={getPeriodoDatas().dataInicio}
  dataFim={getPeriodoDatas().dataFim}
  funilSelecionado={funilSelecionado}  // ✅ Passando a prop
/>

<ConsultorOportunidadesDiarias
  unidadeId={consultor.unidade_id || 0}
  vendedorId={consultor.id}
  dataInicio={getPeriodoDatas().dataInicio}
  dataFim={getPeriodoDatas().dataFim}
  funilSelecionado={funilSelecionado}  // ✅ Passando a prop
/>

<ConsultorMatrizMotivosPerda
  unidadeId={consultor.unidade_id || 0}
  vendedorId={consultor.id}
  dataInicio={getPeriodoDatas().dataInicio}
  dataFim={getPeriodoDatas().dataFim}
  funilSelecionado={funilSelecionado}  // ✅ Passando a prop
/>
```

## Comportamento Esperado

### Quando nenhum funil é selecionado (filtro "Todos"):
- `funilSelecionado` é `null`
- Os componentes usam o **funil de vendas (ID 4) como padrão**
- Mantém compatibilidade com comportamento anterior

### Quando um funil específico é selecionado:
- `funilSelecionado` contém o ID do funil (ex: "5", "6")
- Todos os componentes filtram os dados apenas para aquele funil
- As APIs recebem o parâmetro `funil_id` na query string

## Arquivos Modificados

### 1. **`components/consultor/ConsultorFunilEtapas.tsx`**
   - Adicionada prop `funilSelecionado?: string | null`
   - Alterado de `funil_id=4` para `funil_id=${funilId}`
   - Adicionado fallback: `const funilId = funilSelecionado || '4'`
   - Adicionado `funilSelecionado` nas dependências do useEffect

### 2. **`components/consultor/ConsultorOportunidadesDiarias.tsx`**
   - Adicionada prop `funilSelecionado?: string | null`
   - Adicionado filtro condicional em 3 lugares:
     - Busca de oportunidades criadas
     - Busca de oportunidades perdidas
     - Busca de oportunidades ganhas
   - Adicionado `funilSelecionado` nas dependências do useEffect

### 3. **`components/consultor/ConsultorMatrizMotivosPerda.tsx`**
   - Adicionada prop `funilSelecionado?: string | null`
   - Adicionado filtro condicional na busca de oportunidades perdidas
   - Adicionado `funilSelecionado` nas dependências do useEffect

### 4. **`app/consultor/dashboard/page.tsx`**
   - Passado `funilSelecionado` para os 3 componentes

## Como Testar

### Teste Manual

1. **Acesse o dashboard do consultor:**
   ```
   http://localhost:3000/consultor/dashboard
   ```

2. **Teste com "Todos" (padrão):**
   - Verifique se os componentes mostram dados (deve usar funil ID 4)
   - Confirme que as etapas do funil correspondem ao funil de vendas

3. **Selecione um funil específico no filtro:**
   - Escolha um funil diferente (ex: "Funil X")
   - Verifique se **todos** os componentes atualizam:
     - ✅ Etapas do funil mudaram
     - ✅ Oportunidades diárias refletem apenas aquele funil
     - ✅ Motivos de perda mostram apenas perdas daquele funil

4. **Volte para "Todos":**
   - Confirme que volta a mostrar dados do funil de vendas (ID 4)

### Teste com Console do Navegador

Abra o console (F12) e monitore as requisições de rede:

```javascript
// Quando "Todos" está selecionado, deve ver:
/api/funil/colunas?funil_id=4
/api/consultor/oportunidades-por-coluna?vendedor_id=1&funil_id=4
/api/oportunidades/diaria?tipo=criadas&...&user_id=1&all=1
// (sem funil_id na query de diaria quando "Todos")

// Quando funil específico está selecionado (ex: funil 5):
/api/funil/colunas?funil_id=5
/api/consultor/oportunidades-por-coluna?vendedor_id=1&funil_id=5
/api/oportunidades/diaria?tipo=criadas&...&user_id=1&all=1&funil_id=5
```

### Teste de Consistência

1. Selecione um funil específico
2. Compare os valores entre os componentes:
   - Total de oportunidades criadas (componente diário)
   - Total de oportunidades abertas (componente de etapas)
   - Total de oportunidades perdidas (componente de motivos de perda)
3. Os valores devem ser consistentes considerando os filtros de data

## APIs que Suportam o Filtro de Funil

Todas as APIs já suportavam o parâmetro `funil_id`, o problema era apenas que os componentes não estavam passando:

- ✅ `/api/funil/colunas` - Busca colunas de um funil específico
- ✅ `/api/consultor/oportunidades-por-coluna` - Agrupa oportunidades por coluna de funil
- ✅ `/api/oportunidades/diaria` - Filtra oportunidades diárias por funil
- ✅ `/api/oportunidades/lost` - Filtra oportunidades perdidas por funil

## Benefícios da Correção

1. ✅ **Filtro funcional**: O filtro de funil agora afeta todos os componentes do dashboard
2. ✅ **Retrocompatibilidade**: Quando "Todos" está selecionado, usa o funil de vendas (ID 4) como padrão
3. ✅ **Consistência**: Todos os componentes respeitam o mesmo filtro de funil
4. ✅ **Flexibilidade**: Fácil adicionar filtro de funil em novos componentes no futuro

## Notas Adicionais

### Por que funil ID 4 como padrão?

O funil de vendas (ID 4) é o funil principal do sistema. Quando o usuário não seleciona um funil específico, faz sentido mostrar dados do funil principal em vez de não mostrar nada ou mostrar dados de todos os funis misturados.

### Filtro "Todos" vs Sem Filtro

- **Filtro "Todos" (`funilSelecionado = null`)**: Usa funil ID 4 como padrão nos componentes
- **Sem passar `funil_id` na API**: A API retornaria dados de todos os funis misturados

Optamos por usar o funil de vendas como padrão porque:
1. É mais útil para o consultor ver dados do funil principal
2. Mantém compatibilidade com o comportamento anterior
3. É mais performático que buscar todos os funis

### Cards de Estatísticas (topo do dashboard)

Os cards no topo (Criadas Hoje, Abertas, Ganhas, Perdidas, etc.) **já respeitavam o filtro de funil** porque são gerenciados pelo hook `useConsultorDashboard.ts` que já passava o `funilSelecionado` nas requisições.

O problema era **apenas nos componentes de tabelas/gráficos** que estavam hardcoded para o funil ID 4.

## Relacionado

- Issue: Filtro de funil não funcionando no dashboard do consultor
- Componentes: `ConsultorFunilEtapas`, `ConsultorOportunidadesDiarias`, `ConsultorMatrizMotivosPerda`
- Hook relacionado: `useConsultorDashboard.ts` (já estava correto)
- Filtro: `ConsultorPeriodoFilter` (componente que renderiza os filtros)






