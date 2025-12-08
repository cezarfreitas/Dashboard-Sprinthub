# 📊 API: Oportunidades Paradas

## Endpoint

```
GET /api/oportunidades-paradas
```

---

## 🔐 Autenticação

**Requer:** Token de autenticação (cookie `auth-token`)

---

## 📝 Parâmetros (Query String)

| Parâmetro | Tipo | Padrão | Descrição |
|-----------|------|--------|-----------|
| `dias` | number | 7 | Dias mínimos sem atualização |
| `unidade_id` | number | - | Filtrar por unidade específica |
| `vendedor` | string | - | Filtrar por nome do vendedor (LIKE) |

### Exemplos:

```
GET /api/oportunidades-paradas?dias=15
GET /api/oportunidades-paradas?dias=7&unidade_id=5
GET /api/oportunidades-paradas?vendedor=João&dias=10
```

---

## 📦 Estrutura da Resposta

```typescript
{
  success: boolean
  filtros: {
    dias_minimo: number
    unidade_id?: string
    vendedor?: string
  }
  resumo: {
    total_oportunidades: number
    valor_total: number
    valor_medio: number
    media_dias_parados: number
    max_dias_parados: number
  }
  estatisticas: {
    total_vendedores_com_paradas: number
    total_unidades_afetadas: number
    oportunidades_criticas: number  // >= 30 dias
    taxa_criticidade: number        // % de críticas
  }
  oportunidades: Array<{
    id: number
    title: string
    value: number
    user: string
    crm_column: string
    dias_parada: number
    ultima_atualizacao: string
    unidade_nome: string
  }>
  distribuicao: Array<{
    faixa: '0-7' | '8-15' | '16-30' | '30+'
    quantidade: number
    valor_total: number
    percentual: number
  }>
  alertas_vendedor: Array<{
    vendedor: string
    total_paradas: number
    valor_em_risco: number
    media_dias_parados: number
    pior_caso_dias: number
  }>
  heatmap: Array<{
    vendedor: string
    unidade: string
    quantidade: number
    valor: number
    media_dias: number
    nivel_alerta: 'baixo' | 'medio' | 'alto' | 'critico'
  }>
}
```

---

## 📊 Exemplo de Resposta Completa

```json
{
  "success": true,
  "filtros": {
    "dias_minimo": 7,
    "unidade_id": null,
    "vendedor": null
  },
  "resumo": {
    "total_oportunidades": 47,
    "valor_total": 234500.00,
    "valor_medio": 4989.36,
    "media_dias_parados": 18,
    "max_dias_parados": 45
  },
  "estatisticas": {
    "total_vendedores_com_paradas": 8,
    "total_unidades_afetadas": 5,
    "oportunidades_criticas": 12,
    "taxa_criticidade": 26
  },
  "oportunidades": [
    {
      "id": 12345,
      "title": "Venda Produto X - Empresa ABC",
      "value": 15000.00,
      "user": "João Silva",
      "crm_column": "Proposta Enviada",
      "dias_parada": 45,
      "ultima_atualizacao": "2024-10-24T10:30:00",
      "unidade_nome": "São Paulo"
    },
    {
      "id": 12346,
      "title": "Projeto Y - Cliente XYZ",
      "value": 8500.00,
      "user": "Maria Santos",
      "crm_column": "Negociação",
      "dias_parada": 32,
      "ultima_atualizacao": "2024-11-06T14:20:00",
      "unidade_nome": "Rio de Janeiro"
    }
  ],
  "distribuicao": [
    {
      "faixa": "0-7",
      "quantidade": 10,
      "valor_total": 45000.00,
      "percentual": 21
    },
    {
      "faixa": "8-15",
      "quantidade": 15,
      "valor_total": 78000.00,
      "percentual": 32
    },
    {
      "faixa": "16-30",
      "quantidade": 10,
      "valor_total": 55500.00,
      "percentual": 21
    },
    {
      "faixa": "30+",
      "quantidade": 12,
      "valor_total": 56000.00,
      "percentual": 26
    }
  ],
  "alertas_vendedor": [
    {
      "vendedor": "João Silva",
      "total_paradas": 8,
      "valor_em_risco": 67500.00,
      "media_dias_parados": 25,
      "pior_caso_dias": 45
    },
    {
      "vendedor": "Maria Santos",
      "total_paradas": 6,
      "valor_em_risco": 45000.00,
      "media_dias_parados": 18,
      "pior_caso_dias": 32
    }
  ],
  "heatmap": [
    {
      "vendedor": "João Silva",
      "unidade": "São Paulo",
      "quantidade": 5,
      "valor": 45000.00,
      "media_dias": 28,
      "nivel_alerta": "alto"
    },
    {
      "vendedor": "Maria Santos",
      "unidade": "Rio de Janeiro",
      "quantidade": 4,
      "valor": 32000.00,
      "media_dias": 16,
      "nivel_alerta": "medio"
    },
    {
      "vendedor": "Pedro Costa",
      "unidade": "São Paulo",
      "quantidade": 7,
      "valor": 58000.00,
      "media_dias": 35,
      "nivel_alerta": "critico"
    }
  ]
}
```

---

## 🎨 Uso no Frontend

### 1. **Card de Resumo**

```tsx
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  <Card>
    <CardHeader>
      <CardTitle>Total Paradas</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold">
        {data.resumo.total_oportunidades}
      </div>
      <p className="text-sm text-muted-foreground">
        {data.resumo.media_dias_parados} dias em média
      </p>
    </CardContent>
  </Card>
  
  <Card>
    <CardHeader>
      <CardTitle>Valor em Risco</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-red-600">
        R$ {data.resumo.valor_total.toLocaleString('pt-BR')}
      </div>
      <p className="text-sm text-muted-foreground">
        Média R$ {data.resumo.valor_medio.toLocaleString('pt-BR')}
      </p>
    </CardContent>
  </Card>
</div>
```

### 2. **Gráfico de Distribuição (Pizza/Barras)**

```tsx
// Recharts PieChart
<PieChart width={400} height={300}>
  <Pie
    data={data.distribuicao}
    dataKey="quantidade"
    nameKey="faixa"
    cx="50%"
    cy="50%"
    label={(entry) => `${entry.faixa}: ${entry.percentual}%`}
  >
    {data.distribuicao.map((entry, index) => (
      <Cell key={index} fill={COLORS[index]} />
    ))}
  </Pie>
  <Tooltip />
</PieChart>
```

### 3. **Tabela de Oportunidades**

```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Título</TableHead>
      <TableHead>Vendedor</TableHead>
      <TableHead>Valor</TableHead>
      <TableHead>Dias Parada</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.oportunidades.map((op) => (
      <TableRow key={op.id}>
        <TableCell>{op.title}</TableCell>
        <TableCell>{op.user}</TableCell>
        <TableCell>R$ {op.value.toLocaleString('pt-BR')}</TableCell>
        <TableCell>
          <Badge variant={op.dias_parada >= 30 ? 'destructive' : 'warning'}>
            {op.dias_parada} dias
          </Badge>
        </TableCell>
        <TableCell>{op.crm_column}</TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### 4. **Heatmap de Negligência**

```tsx
// Grid com cores baseadas em nivel_alerta
<div className="grid grid-cols-1 md:grid-cols-3 gap-2">
  {data.heatmap.map((item, index) => (
    <Card 
      key={index}
      className={cn(
        'border-2',
        item.nivel_alerta === 'critico' && 'border-red-500 bg-red-50',
        item.nivel_alerta === 'alto' && 'border-orange-500 bg-orange-50',
        item.nivel_alerta === 'medio' && 'border-yellow-500 bg-yellow-50',
        item.nivel_alerta === 'baixo' && 'border-green-500 bg-green-50'
      )}
    >
      <CardContent className="p-4">
        <div className="font-semibold">{item.vendedor}</div>
        <div className="text-sm text-muted-foreground">{item.unidade}</div>
        <div className="mt-2 flex justify-between">
          <span>{item.quantidade} ops</span>
          <span className="font-bold">{item.media_dias}d</span>
        </div>
      </CardContent>
    </Card>
  ))}
</div>
```

### 5. **Alertas por Vendedor**

```tsx
<div className="space-y-2">
  {data.alertas_vendedor.map((alerta, index) => (
    <Alert key={index} variant={alerta.pior_caso_dias >= 30 ? 'destructive' : 'default'}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{alerta.vendedor}</AlertTitle>
      <AlertDescription>
        {alerta.total_paradas} oportunidades paradas há {alerta.media_dias_parados} dias em média.
        Valor em risco: R$ {alerta.valor_em_risco.toLocaleString('pt-BR')}
      </AlertDescription>
    </Alert>
  ))}
</div>
```

---

## 🎯 Interpretação dos Níveis de Alerta

| Nível | Dias | Cor | Ação Recomendada |
|-------|------|-----|------------------|
| **Baixo** | 0-7 dias | 🟢 Verde | Monitorar |
| **Médio** | 8-15 dias | 🟡 Amarelo | Atenção necessária |
| **Alto** | 16-30 dias | 🟠 Laranja | Ação imediata |
| **Crítico** | 30+ dias | 🔴 Vermelho | Intervenção urgente |

---

## 🔍 Regras de Negócio

1. **Oportunidade Parada:** status = 'open', archived = 0, sem atualização há X dias
2. **Alertas de Vendedor:** Mostrado apenas se >= 3 oportunidades paradas
3. **Heatmap:** Mostrado apenas se >= 2 oportunidades paradas por vendedor/unidade
4. **Valor em Risco:** Soma total de `value` de todas oportunidades paradas
5. **Taxa de Criticidade:** (Oportunidades >= 30 dias / Total paradas) * 100

---

## 📈 Métricas Chave

- **Total de Oportunidades Paradas**
- **Valor Total em Risco**
- **Média de Dias Parados**
- **Distribuição por Faixas**
- **Vendedores com Mais Negligência**
- **Unidades Mais Afetadas**
- **Taxa de Oportunidades Críticas**

---

## 🚨 Casos de Erro

### 401 - Não Autenticado

```json
{
  "success": false,
  "message": "Não autenticado"
}
```

### 500 - Erro Interno

```json
{
  "success": false,
  "message": "Erro ao buscar oportunidades paradas",
  "error": "Connection timeout"
}
```

---

**Criado em:** 8 de dezembro de 2024  
**Versão da API:** 1.0

