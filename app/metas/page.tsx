"use client"

import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import CompactFilters, { FilterState } from '@/components/compact-filters'
import { MetaConfig } from '@/components/meta-config'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { 
  Target, 
  TrendingUp, 
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Percent,
  Award,
  RefreshCw,
  Building2,
  User,
  Settings
} from 'lucide-react'

interface Vendedor {
  id: number
  name: string
  lastName: string
  email: string
  username: string
  telephone?: string
  unidade_id?: number
}

interface Unidade {
  id: number
  nome: string
  gerente: string
  vendedores: Vendedor[]
}

interface MetaMensal {
  vendedorId: number
  mes: number
  ano: number
  meta: number
  realizado: number
  percentual: number
}

interface MetaUnidade {
  unidadeId: number
  nome: string
  gerente: string
  vendedores: number
  metaTotal: number
  realizadoTotal: number
  percentualTotal: number
  metas: MetaMensal[]
}

// Badge component inline temporário
const BadgeComponent = ({ children, variant = 'default', className = '' }: { 
  children: React.ReactNode, 
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success',
  className?: string 
}) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    outline: 'border border-input bg-background',
    success: 'bg-green-100 text-green-800 border-green-200'
  }
  return (
    <div className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${variants[variant]} ${className}`}>
      {children}
    </div>
  )
}

// Função para formatar valores monetários - sem decimais, valores por extenso
const formatCurrency = (value: number): string => {
  // Garantir que value é um número inteiro
  const numValue = Math.round(Number(value) || 0)
  
  // Sempre mostrar valor completo com pontos como separador de milhares
  return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

// Função para formatar percentual
const formatPercentage = (value: number): string => {
  return `${Math.round(value)}%`
}

export default function MetasPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [metas, setMetas] = useState<MetaMensal[]>([])
  const [metasUnidade, setMetasUnidade] = useState<MetaUnidade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [anoAtual] = useState(new Date().getFullYear())
  const [mesAtual] = useState(new Date().getMonth() + 1)
  const [filters, setFilters] = useState<FilterState>({
    periodo: {
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear()
    }
  })

  const meses = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ]

  const fetchData = async () => {
    setLoading(true)
    setError('')
    
    try {
      // Buscar unidades e vendedores em paralelo
      const [unidadesResponse, vendedoresResponse] = await Promise.all([
        fetch('/api/unidades'),
        fetch('/api/vendedores/mysql')
      ])

      const unidadesData = await unidadesResponse.json()
      const vendedoresData = await vendedoresResponse.json()
      
      if (!unidadesResponse.ok) {
        throw new Error(unidadesData.message || 'Erro ao carregar unidades')
      }
      
      if (!vendedoresResponse.ok) {
        throw new Error(vendedoresData.message || 'Erro ao carregar vendedores')
      }
      
      const unidadesList = unidadesData.unidades || []
      const vendedoresList = vendedoresData.vendedores || []
      
      setUnidades(unidadesList)
      setVendedores(vendedoresList)
      
      // Gerar metas mock baseadas nos dados reais
      const metasMock = generateMockMetas(vendedoresList)
      const metasUnidadeMock = generateMetasUnidadeMock(unidadesList)
      
      setMetas(metasMock)
      setMetasUnidade(metasUnidadeMock)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setVendedores([])
      setUnidades([])
      setMetas([])
      setMetasUnidade([])
    } finally {
      setLoading(false)
    }
  }

  const generateMockMetas = (vendedoresList: Vendedor[]): MetaMensal[] => {
    const metasArray: MetaMensal[] = []
    
    vendedoresList.forEach(vendedor => {
      for (let mes = 1; mes <= 12; mes++) {
        // Gerar metas em múltiplos de 1000 para valores mais limpos
        const metaBase = 250000 + (vendedor.id * 5000) // Meta base maior e mais limpa
        const variacaoMil = Math.floor((Math.random() - 0.5) * 40) * 1000 // Variação em milhares
        const meta = Math.max(200000, metaBase + variacaoMil) // Mínimo 200k
        
        // Realizado (simulado) - para meses passados, também em múltiplos de 1000
        let realizado = 0
        if (mes < mesAtual || (mes === mesAtual && anoAtual === new Date().getFullYear())) {
          const performanceBase = 0.7 + (Math.random() * 0.6) // 70% a 130% da meta
          const realizadoBruto = meta * performanceBase
          realizado = Math.round(realizadoBruto / 1000) * 1000 // Arredondar para milhares
        }
        
        const percentual = meta > 0 ? (realizado / meta) * 100 : 0
        
        metasArray.push({
          vendedorId: vendedor.id,
          mes,
          ano: anoAtual,
          meta: meta,
          realizado: realizado,
          percentual: Math.round(percentual)
        })
      }
    })
    
    return metasArray
  }

  const generateMetasUnidadeMock = (unidadesList: Unidade[]): MetaUnidade[] => {
    return unidadesList.map(unidade => {
      const vendedoresCount = unidade.vendedores.length
      const metaBase = vendedoresCount * 250000 // Meta base maior por unidade
      const realizadoBase = metaBase * (0.8 + Math.random() * 0.4) // 80% a 120% da meta
      
      // Gerar metas mensais para a unidade em múltiplos de 1000
      const metasMensais: MetaMensal[] = []
      for (let mes = 1; mes <= 12; mes++) {
        const variacaoMil = Math.floor((Math.random() - 0.5) * 50) * 1000 // Variação em milhares
        const metaMensal = Math.max(200000, metaBase + variacaoMil)
        
        let realizadoMensal = 0
        if (mes < mesAtual) {
          const realizadoBruto = metaMensal * (0.7 + Math.random() * 0.6)
          realizadoMensal = Math.round(realizadoBruto / 1000) * 1000 // Arredondar para milhares
        }
        
        metasMensais.push({
          vendedorId: unidade.id, // Usando ID da unidade
          mes,
          ano: anoAtual,
          meta: metaMensal,
          realizado: realizadoMensal,
          percentual: metaMensal > 0 ? Math.round((realizadoMensal / metaMensal) * 100) : 0
        })
      }
      
      // Arredondar totais para milhares também
      const metaTotalLimpa = Math.round(metaBase / 1000) * 1000
      const realizadoTotalLimpo = Math.round(realizadoBase / 1000) * 1000
      
      return {
        unidadeId: unidade.id,
        nome: unidade.nome,
        gerente: unidade.gerente,
        vendedores: vendedoresCount,
        metaTotal: metaTotalLimpa,
        realizadoTotal: realizadoTotalLimpo,
        percentualTotal: metaTotalLimpa > 0 ? Math.round((realizadoTotalLimpo / metaTotalLimpa) * 100) : 0,
        metas: metasMensais
      }
    })
  }

  const getMetaVendedor = (vendedorId: number, mes: number) => {
    return metas.find(m => m.vendedorId === vendedorId && m.mes === mes)
  }

  // Organizar vendedores por unidade para exibição com filtros
  const organizarVendedoresPorUnidade = () => {
    let vendedoresFiltrados = vendedores
    let unidadesFiltradas = unidades

    // Aplicar filtros
    if (filters.unidadeId) {
      unidadesFiltradas = unidades.filter(u => u.id === filters.unidadeId)
      vendedoresFiltrados = vendedores.filter(v => v.unidade_id === filters.unidadeId)
    }

    if (filters.vendedorId) {
      vendedoresFiltrados = vendedoresFiltrados.filter(v => v.id.toString() === filters.vendedorId)
    }

    if (unidadesFiltradas.length === 0) {
      // Se não há unidades, mostrar todos os vendedores sem agrupamento
      return [{
        unidade: null,
        vendedores: vendedoresFiltrados
      }]
    }

    const grupos: Array<{unidade: Unidade | null, vendedores: Vendedor[]}> = []
    
    // Agrupar vendedores por unidade
    unidadesFiltradas.forEach(unidade => {
      const vendedoresUnidade = vendedoresFiltrados.filter(v => v.unidade_id === unidade.id)
      if (vendedoresUnidade.length > 0) {
        grupos.push({
          unidade: unidade,
          vendedores: vendedoresUnidade
        })
      }
    })
    
    // Vendedores sem unidade
    const vendedoresSemUnidade = vendedoresFiltrados.filter(v => !v.unidade_id)
    if (vendedoresSemUnidade.length > 0) {
      grupos.push({
        unidade: null,
        vendedores: vendedoresSemUnidade
      })
    }
    
    return grupos
  }

  // Calcular resumo de uma unidade
  const calcularResumoUnidade = (vendedoresUnidade: Vendedor[], mes: number) => {
    let metaTotal = 0
    let realizadoTotal = 0
    
    vendedoresUnidade.forEach(vendedor => {
      const meta = getMetaVendedor(vendedor.id, mes)
      if (meta) {
        metaTotal += meta.meta
        realizadoTotal += meta.realizado
      }
    })
    
    const percentual = metaTotal > 0 ? (realizadoTotal / metaTotal) * 100 : 0
    
    return {
      metaTotal,
      realizadoTotal,
      percentual
    }
  }

  const getPerformanceBadge = (percentual: number, mes: number) => {
    if (mes > mesAtual) {
      return <BadgeComponent variant="outline">Planejado</BadgeComponent>
    }
    
    if (percentual >= 100) {
      return <BadgeComponent variant="success">✓ {percentual}%</BadgeComponent>
    } else if (percentual >= 80) {
      return <BadgeComponent variant="secondary">{percentual}%</BadgeComponent>
    } else if (percentual > 0) {
      return <BadgeComponent variant="destructive">{percentual}%</BadgeComponent>
    }
    
    return <BadgeComponent variant="outline">0%</BadgeComponent>
  }


  const calcularEstatisticas = () => {
    // Usar o mês e ano dos filtros
    const mesFiltrado = filters.periodo.mes
    const anoFiltrado = filters.periodo.ano
    
    let metasFiltradas = metas.filter(m => m.mes === mesFiltrado && m.ano === anoFiltrado)
    
    // Aplicar filtros de vendedor se necessário
    if (filters.vendedorId) {
      metasFiltradas = metasFiltradas.filter(m => m.vendedorId.toString() === filters.vendedorId)
    } else if (filters.unidadeId) {
      // Filtrar por unidade através dos vendedores
      const vendedoresUnidade = vendedores.filter(v => v.unidade_id === filters.unidadeId)
      const idsVendedores = vendedoresUnidade.map(v => v.id)
      metasFiltradas = metasFiltradas.filter(m => idsVendedores.includes(m.vendedorId))
    }
    
    const totalMeta = metasFiltradas.reduce((sum, m) => sum + m.meta, 0)
    const totalRealizado = metasFiltradas.reduce((sum, m) => sum + m.realizado, 0)
    const percentualGeral = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0
    
    const vendedoresAcimaMeta = metasFiltradas.filter(m => m.percentual >= 100).length
    const vendedoresAbaixoMeta = metasFiltradas.filter(m => m.percentual < 100 && m.percentual > 0).length
    
    return {
      totalMeta,
      totalRealizado,
      percentualGeral: Math.round(percentualGeral),
      vendedoresAcimaMeta,
      vendedoresAbaixoMeta,
      mesFiltrado,
      anoFiltrado
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const stats = calcularEstatisticas()

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-white rounded-lg border p-4">
                <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="animate-pulse">
          <div className="bg-white rounded-lg border h-96"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-display">Metas {stats.mesFiltrado && stats.anoFiltrado ? `${stats.anoFiltrado}` : anoAtual}</h1>
          <p className="text-muted-foreground font-body">
            Gerencie e acompanhe as metas mensais da equipe de vendas
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <CompactFilters
            onFiltersChange={setFilters}
            initialFilters={filters}
            showPeriodo={true}
            showUnidades={true}
            showVendedores={true}
          />
          
          <BadgeComponent variant="outline">
            <Calendar className="h-3 w-3 mr-1" />
            {meses[stats.mesFiltrado ? stats.mesFiltrado - 1 : mesAtual - 1]} {stats.anoFiltrado || anoAtual}
          </BadgeComponent>
          <Button onClick={fetchData} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Sistema de Abas */}
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-center space-x-2 text-red-700">
              <Target className="h-4 w-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Meta Total ({meses[stats.mesFiltrado ? stats.mesFiltrado - 1 : mesAtual - 1]})</p>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalMeta)}</p>
              </div>
              <Target className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Realizado</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalRealizado)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Performance Geral</p>
                <p className="text-2xl font-bold">{stats.percentualGeral}%</p>
              </div>
              <Percent className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Acima da Meta</p>
                <p className="text-2xl font-bold text-green-600">{stats.vendedoresAcimaMeta}</p>
              </div>
              <Award className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Matriz Única de Metas com Agrupamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5" />
            <span>Matriz de Metas</span>
            <BadgeComponent variant="secondary">
              {vendedores.length} vendedores
            </BadgeComponent>
            {unidades.length > 0 && (
              <BadgeComponent variant="outline">
                {unidades.length} unidades
              </BadgeComponent>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {vendedores.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">Nenhum vendedor encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Sincronize os vendedores primeiro para definir metas
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-6 text-center">Unidade</TableHead>
                    <TableHead className="w-48">Vendedor</TableHead>
                    {meses.map((mes, index) => (
                      <TableHead key={index} className="text-center min-w-24">
                        <div className="flex flex-col items-center">
                          <span>{mes}</span>
                          {index + 1 === mesAtual && (
                            <BadgeComponent variant="default" className="mt-1 text-xs">
                              Atual
                            </BadgeComponent>
                          )}
                        </div>
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {organizarVendedoresPorUnidade().map((grupo, grupoIndex) => (
                    <React.Fragment key={grupoIndex}>
                      {/* Vendedores do grupo */}
                      {grupo.vendedores.map((vendedor, vendedorIndex) => (
                        <TableRow key={vendedor.id}>
                          {/* Coluna da Unidade (só no primeiro vendedor com rowspan) */}
                          {vendedorIndex === 0 && (
                            <TableCell 
                              rowSpan={grupo.vendedores.length + 1} 
                              className={`${grupo.unidade ? 'bg-blue-100 border-blue-300' : 'bg-gray-100 border-gray-300'} border-r-2 text-center align-middle px-0 py-0.5 min-w-0`}
                              style={{ width: '10px', maxWidth: '10px' }}
                            >
                              <div className="h-full flex items-center justify-center">
                                <div className="transform -rotate-90 whitespace-nowrap">
                                  <span className={`font-bold text-lg tracking-wide ${grupo.unidade ? 'text-blue-900' : 'text-gray-900'}`}>
                                    {grupo.unidade ? grupo.unidade.nome.toUpperCase() : 'SEM UNIDADE'}
                                  </span>
                                </div>
                              </div>
                            </TableCell>
                          )}
                          
                          {/* Coluna do Vendedor */}
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-medium text-primary">
                                  {vendedor.name.charAt(0)}{vendedor.lastName.charAt(0)}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium text-sm">
                                  {vendedor.name} {vendedor.lastName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {vendedor.email}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          {Array.from({ length: 12 }, (_, mesIndex) => {
                            const meta = getMetaVendedor(vendedor.id, mesIndex + 1)
                            const percentual = meta?.percentual || 0
                            
                            let badgeVariant: 'success' | 'default' | 'destructive' = 'default'
                            if (percentual >= 100) badgeVariant = 'success'
                            else if (percentual >= 80) badgeVariant = 'default'
                            else if (percentual > 0) badgeVariant = 'destructive'
                            
                            return (
                              <TableCell key={mesIndex} className="text-center p-2">
                                <div className="space-y-1">
                                  {meta && meta.realizado > 0 ? (
                                    <>
                                      <div className="flex justify-center">
                                        <BadgeComponent variant={badgeVariant} className="text-xs font-bold px-1.5 py-0">
                                          {formatPercentage(percentual)}
                                        </BadgeComponent>
                                      </div>
                                      <div className="text-xs text-muted-foreground space-y-0.5">
                                        <div className="font-semibold text-green-700">{formatCurrency(meta.realizado)}</div>
                                        <div className="text-gray-500">{formatCurrency(meta.meta)}</div>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex justify-center">
                                        <BadgeComponent variant="outline" className="text-xs font-bold px-1.5 py-0">
                                          0%
                                        </BadgeComponent>
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        {meta ? formatCurrency(meta.meta) : '-'}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      ))}
                      
                      {/* Linha de resumo ABAIXO dos vendedores */}
                      <TableRow className={`${grupo.unidade ? 'bg-blue-200/50' : 'bg-gray-200/50'} font-semibold`}>
                        {/* Não precisa da coluna da unidade aqui pois está mesclada */}
                        <TableCell>
                          <div className="flex items-center space-x-2 py-1">
                            <div className={`w-6 h-6 rounded-full ${grupo.unidade ? 'bg-blue-300' : 'bg-gray-300'} flex items-center justify-center`}>
                              <span className="text-xs font-bold text-white">📊</span>
                            </div>
                            <div>
                              <div className={`font-bold text-sm ${grupo.unidade ? 'text-blue-900' : 'text-gray-900'}`}>
                                Resumo {grupo.unidade ? grupo.unidade.nome : 'Sem Unidade'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        {Array.from({ length: 12 }, (_, mesIndex) => {
                          const resumo = calcularResumoUnidade(grupo.vendedores, mesIndex + 1)
                          
                          let badgeVariant: 'success' | 'default' | 'destructive' = 'default'
                          if (resumo.percentual >= 100) badgeVariant = 'success'
                          else if (resumo.percentual >= 80) badgeVariant = 'default'
                          else if (resumo.percentual > 0) badgeVariant = 'destructive'
                          
                          const textColor = grupo.unidade ? 'text-blue-700' : 'text-gray-700'
                          const bgColor = grupo.unidade ? 'text-blue-600' : 'text-gray-600'
                          
                          return (
                            <TableCell key={mesIndex} className="text-center p-2">
                              <div className="space-y-1">
                                {resumo.realizadoTotal > 0 ? (
                                  <>
                                    <div className="flex justify-center">
                                      <BadgeComponent variant={badgeVariant} className="text-xs font-bold px-1.5 py-0">
                                        {formatPercentage(resumo.percentual)}
                                      </BadgeComponent>
                                    </div>
                                    <div className={`text-xs font-semibold space-y-0.5 ${textColor}`}>
                                      <div className="text-green-700">{formatCurrency(resumo.realizadoTotal)}</div>
                                      <div className="text-gray-600">{formatCurrency(resumo.metaTotal)}</div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex justify-center">
                                      <BadgeComponent variant="outline" className="text-xs font-bold px-1.5 py-0">
                                        0%
                                      </BadgeComponent>
                                    </div>
                                    <div className={`text-xs font-semibold ${bgColor}`}>
                                      {resumo.metaTotal > 0 ? formatCurrency(resumo.metaTotal) : '-'}
                                    </div>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          )
                        })}
                      </TableRow>
                      
                      {/* Espaço entre grupos */}
                      {grupoIndex < organizarVendedoresPorUnidade().length - 1 && (
                        <TableRow>
                          <TableCell colSpan={14} className="h-3 p-0 border-0"></TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))}

                  {/* Resumo Geral - Total de todas as unidades */}
                  <TableRow className="bg-gray-800 text-white font-bold border-t-2 border-gray-600">
                    <TableCell className="text-center align-middle p-2">
                      <div className="flex items-center justify-center">
                        <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center mr-2">
                          <span className="text-xs font-bold text-white">🏆</span>
                        </div>
                        <div className="font-bold text-sm text-white">
                          RESUMO GERAL
                        </div>
                      </div>
                    </TableCell>
                    {Array.from({ length: 12 }, (_, mesIndex) => {
                      // Calcular totais de todas as unidades para o mês
                      const totalMeta = organizarVendedoresPorUnidade().reduce((total, grupo) => {
                        const resumoGrupo = calcularResumoUnidade(grupo.vendedores, mesIndex + 1)
                        return total + resumoGrupo.metaTotal
                      }, 0)
                      
                      const totalRealizado = organizarVendedoresPorUnidade().reduce((total, grupo) => {
                        const resumoGrupo = calcularResumoUnidade(grupo.vendedores, mesIndex + 1)
                        return total + resumoGrupo.realizadoTotal
                      }, 0)
                      
                      const percentualGeral = totalMeta > 0 ? (totalRealizado / totalMeta) * 100 : 0
                      
                      let badgeVariant: 'success' | 'default' | 'destructive' = 'default'
                      if (percentualGeral >= 100) badgeVariant = 'success'
                      else if (percentualGeral >= 80) badgeVariant = 'default'
                      else if (percentualGeral > 0) badgeVariant = 'destructive'
                      
                      return (
                        <TableCell key={mesIndex} className="text-center p-2">
                          <div className="space-y-1">
                            {totalRealizado > 0 ? (
                              <>
                                <div className="flex justify-center">
                                  <BadgeComponent variant={badgeVariant} className="text-xs font-bold px-1.5 py-0">
                                    {formatPercentage(percentualGeral)}
                                  </BadgeComponent>
                                </div>
                                <div className="text-xs font-semibold space-y-0.5 text-white">
                                  <div className="text-green-300">{formatCurrency(totalRealizado)}</div>
                                  <div className="text-gray-300">{formatCurrency(totalMeta)}</div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="flex justify-center">
                                  <BadgeComponent variant="outline" className="text-xs font-bold px-1.5 py-0">
                                    0%
                                  </BadgeComponent>
                                </div>
                                <div className="text-xs font-semibold text-gray-300">
                                  {totalMeta > 0 ? formatCurrency(totalMeta) : '-'}
                                </div>
                              </>
                            )}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legenda */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <BadgeComponent variant="success">✓ 100%+</BadgeComponent>
              <span>Meta atingida ou superada</span>
            </div>
            <div className="flex items-center space-x-2">
              <BadgeComponent variant="secondary">80-99%</BadgeComponent>
              <span>Próximo da meta</span>
            </div>
            <div className="flex items-center space-x-2">
              <BadgeComponent variant="destructive">&lt;80%</BadgeComponent>
              <span>Abaixo da meta</span>
            </div>
            <div className="flex items-center space-x-2">
              <BadgeComponent variant="outline">Planejado</BadgeComponent>
              <span>Meses futuros</span>
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <MetaConfig />
        </TabsContent>
      </Tabs>
    </div>
  )
}
