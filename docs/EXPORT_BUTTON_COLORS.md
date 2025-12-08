# 🎨 Guia de Cores - Botão Exportar Excel

## 🖌️ Esquemas de Cores Disponíveis

O componente `ExportToExcelButton` agora possui 4 esquemas de cores diferentes para melhor contraste e aparência, especialmente em dialogs escuros.

---

## 📋 Opções de `colorScheme`

### 1. **Emerald (Padrão)** ✅
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  colorScheme="emerald" // ou omitir (padrão)
/>
```

**Cores:**
- Normal: `bg-emerald-600` (verde esmeralda)
- Hover: `bg-emerald-700` (verde mais escuro)
- Texto: `text-white` (branco)
- Border: `border-emerald-600/700`

**Quando usar:** Padrão recomendado para ações de exportação/download.

---

### 2. **Blue** 🔵
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  colorScheme="blue"
/>
```

**Cores:**
- Normal: `bg-blue-600` (azul)
- Hover: `bg-blue-700` (azul mais escuro)
- Texto: `text-white`
- Border: `border-blue-600/700`

**Quando usar:** Para ações primárias ou quando o design já usa verde em outro contexto.

---

### 3. **Purple** 🟣
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  colorScheme="purple"
/>
```

**Cores:**
- Normal: `bg-purple-600` (roxo)
- Hover: `bg-purple-700` (roxo mais escuro)
- Texto: `text-white`
- Border: `border-purple-600/700`

**Quando usar:** Para diferenciação especial ou branding específico.

---

### 4. **Default** ⚪
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  colorScheme="default"
/>
```

**Cores:** Usa as cores padrão do variant (outline, ghost, default)

**Quando usar:** Quando você quer manter o estilo padrão dos botões do sistema.

---

## 🎯 Estado Desabilitado

Todos os esquemas de cores usam o mesmo estilo quando desabilitado:

```css
disabled:bg-gray-700
disabled:text-gray-400
disabled:border-gray-700
disabled:cursor-not-allowed
disabled:opacity-50
```

**Aparência:** Cinza escuro com texto acinzentado e opacidade reduzida.

---

## 📝 Exemplos de Uso

### Exemplo 1: Dialog Escuro (Recomendado)
```typescript
// PainelUnidadeDialog.tsx
<ExportToExcelButton
  data={oportunidades}
  filename={`oportunidades_${unidadeNome}`}
  sheetName="Oportunidades"
  colorScheme="emerald" // Verde destaca bem em fundo escuro
  variant="outline"
  size="sm"
/>
```

### Exemplo 2: Página Clara
```typescript
// VendedoresPage.tsx
<ExportToExcelButton
  data={vendedores}
  filename="vendedores"
  colorScheme="blue" // Azul funciona bem em fundo claro
  variant="default"
  size="default"
/>
```

### Exemplo 3: Múltiplos Botões (Diferenciação)
```typescript
<div className="flex gap-2">
  <ExportToExcelButton
    data={abertas}
    filename="abertas"
    colorScheme="blue"
  />
  
  <ExportToExcelButton
    data={ganhas}
    filename="ganhas"
    colorScheme="emerald"
  />
  
  <ExportToExcelButton
    data={perdidas}
    filename="perdidas"
    colorScheme="purple"
  />
</div>
```

### Exemplo 4: Estilo Padrão do Sistema
```typescript
<ExportToExcelButton
  data={dados}
  filename="dados"
  colorScheme="default" // Mantém o estilo padrão
  variant="outline"
/>
```

---

## 🎨 Preview Visual

### Emerald (Verde) - Padrão
```
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-emerald-600
└─────────────────────────┘
        ↓ hover
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-emerald-700
└─────────────────────────┘
```

### Blue (Azul)
```
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-blue-600
└─────────────────────────┘
        ↓ hover
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-blue-700
└─────────────────────────┘
```

### Purple (Roxo)
```
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-purple-600
└─────────────────────────┘
        ↓ hover
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-purple-700
└─────────────────────────┘
```

### Desabilitado (Qualquer Cor)
```
┌─────────────────────────┐
│ 📊 Exportar Excel       │  ← bg-gray-700 (disabled)
└─────────────────────────┘
```

---

## 🔧 Customização Adicional

### Sobrescrever com `className`

Se precisar de cores totalmente customizadas:

```typescript
<ExportToExcelButton
  data={dados}
  filename="custom"
  colorScheme="default" // Desativa cores predefinidas
  className="bg-red-600 hover:bg-red-700 text-white" // Suas cores
/>
```

### Combinar com `variant`

O `colorScheme` funciona melhor com `variant="outline"` ou `variant="default"`:

```typescript
// Outline + Emerald (recomendado)
<ExportToExcelButton
  colorScheme="emerald"
  variant="outline"
/>

// Default + Blue
<ExportToExcelButton
  colorScheme="blue"
  variant="default"
/>

// Ghost não funciona bem com colorScheme (use default)
<ExportToExcelButton
  colorScheme="default"
  variant="ghost"
/>
```

---

## 🌗 Contraste em Fundos Diferentes

### Fundo Escuro (ex: Dialog Gray-900)
✅ **Recomendados:**
- `emerald` - Excelente contraste
- `blue` - Bom contraste
- `purple` - Bom contraste

❌ **Evitar:**
- `default` com `variant="ghost"` - Pouco contraste

### Fundo Claro (ex: Página White)
✅ **Recomendados:**
- Todos funcionam bem
- `blue` é especialmente bom
- `emerald` também destaca

### Fundo Médio (ex: Gray-100)
✅ **Recomendados:**
- `emerald` - Ótimo contraste
- `blue` - Ótimo contraste
- `purple` - Bom contraste

---

## 📊 Onde Está Aplicado

Atualmente, o botão `ExportToExcelButton` é usado em:

1. **PainelUnidadeDialog** (`components/painel/PainelUnidadeDialog.tsx`)
   - Esquema: `emerald` (padrão)
   - Variante: `outline`
   - Contexto: Dialog escuro (bg-gray-900)

**Para adicionar em outros lugares:**
- Páginas de vendedores
- Páginas de unidades
- Dashboards
- Relatórios

---

## ✅ Recomendações

### Para Dialogs Escuros:
```typescript
colorScheme="emerald" // Melhor visibilidade
variant="outline"
```

### Para Páginas Claras:
```typescript
colorScheme="blue" // Profissional
variant="default"
```

### Para Ações Secundárias:
```typescript
colorScheme="default" // Discreto
variant="ghost"
```

### Para Ações Primárias:
```typescript
colorScheme="emerald" // Destaque
variant="default"
size="default"
```

---

## 🎨 Tailwind Classes Usadas

```css
/* Emerald */
bg-emerald-600 hover:bg-emerald-700
text-white
border-emerald-600 hover:border-emerald-700

/* Blue */
bg-blue-600 hover:bg-blue-700
text-white
border-blue-600 hover:border-blue-700

/* Purple */
bg-purple-600 hover:bg-purple-700
text-white
border-purple-600 hover:border-purple-700

/* Disabled (todos) */
disabled:bg-gray-700
disabled:text-gray-400
disabled:border-gray-700
disabled:cursor-not-allowed
disabled:opacity-50
```

---

## 🚀 Migração de Código Existente

Se você já estava usando o botão sem `colorScheme`:

**Antes:**
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  variant="outline"
/>
```

**Depois (sem mudança, continua funcionando):**
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  variant="outline"
  // colorScheme="emerald" é o padrão
/>
```

**Se quiser mudar a cor:**
```typescript
<ExportToExcelButton
  data={dados}
  filename="relatorio"
  variant="outline"
  colorScheme="blue" // Adicione esta prop
/>
```

---

## 📝 TypeScript

Interface atualizada:

```typescript
interface ExportToExcelButtonProps {
  data: any[]
  filename: string
  sheetName?: string
  columns?: {
    key: string
    label: string
    format?: (value: any, item?: any) => string
  }[]
  disabled?: boolean
  variant?: 'default' | 'outline' | 'ghost'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  colorScheme?: 'emerald' | 'blue' | 'purple' | 'default' // NOVO
}
```

---

**Atualizado em:** 08/12/2024  
**Versão:** 1.1.0  
**Status:** ✅ Implementado e testado

