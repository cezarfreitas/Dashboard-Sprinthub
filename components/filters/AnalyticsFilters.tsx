'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import PainelUnidadeMultiSelect from '../painel/PainelUnidadeMultiSelect'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'

interface AnalyticsFiltersProps {
  onFiltersChange: (filtros: {
    unidadesSelecionadas: number[]
    periodoInicio: string
    periodoFim: string
    funilSelecionado: string
    grupoSelecionado: string
  }) => void
}

export default function AnalyticsFilters({ onFiltersChange }: AnalyticsFiltersProps) {
  // Função para calcular datas baseado no tipo de período
  const calcularPeriodo = useMemo(() => {
    return (tipo: string) => {
      const hoje = new Date()
      let inicio: Date
      let fim: Date

      // Função helper para formatar data no formato YYYY-MM-DD (timezone local)
      const formatDate = (date: Date): string => {
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
      }

      switch (tipo) {
        case 'este-mes':
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
          inicio.setHours(0, 0, 0, 0)
          // Último dia do mês atual
          fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'mes-passado':
          inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
          inicio.setHours(0, 0, 0, 0)
          // Último dia do mês passado
          fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'esta-semana':
          const diaSemana = hoje.getDay()
          const diff = hoje.getDate() - diaSemana + (diaSemana === 0 ? -6 : 1) // Segunda-feira
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), diff)
          inicio.setHours(0, 0, 0, 0)
          fim = new Date(hoje)
          fim.setHours(23, 59, 59, 999)
          break
        case 'semana-passada':
          const diaSemanaAtual = hoje.getDay()
          const diffSemana = hoje.getDate() - diaSemanaAtual + (diaSemanaAtual === 0 ? -6 : 1)
          // Segunda-feira da semana passada
          inicio = new Date(hoje.getFullYear(), hoje.getMonth(), diffSemana - 7)
          inicio.setHours(0, 0, 0, 0)
          // Domingo da semana passada
          fim = new Date(inicio)
          fim.setDate(fim.getDate() + 6)
          fim.setHours(23, 59, 59, 999)
          break
        case 'este-ano':
          inicio = new Date(hoje.getFullYear(), 0, 1)
          inicio.setHours(0, 0, 0, 0)
          fim = new Date(hoje.getFullYear(), 11, 31)
          fim.setHours(23, 59, 59, 999)
          break
        case 'ano-anterior':
          inicio = new Date(hoje.getFullYear() - 1, 0, 1)
          inicio.setHours(0, 0, 0, 0)
          fim = new Date(hoje.getFullYear() - 1, 11, 31)
          fim.setHours(23, 59, 59, 999)
          break
        default:
          return { inicio: '', fim: '' }
      }

      return {
        inicio: formatDate(inicio),
        fim: formatDate(fim)
      }
    }
  }, [])

  // Período inicial (este mês)
  const periodoInicial = useMemo(() => {
    return calcularPeriodo('este-mes')
  }, [calcularPeriodo])

  const [filtros, setFiltros] = useState(() => {
    const periodo = calcularPeriodo('este-mes')
    return {
      unidadesSelecionadas: [] as number[],
      periodoTipo: 'este-mes' as string,
      periodoInicio: periodo.inicio,
      periodoFim: periodo.fim,
      funilSelecionado: 'todos',
      grupoSelecionado: 'todos'
    }
  })

  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])

  const filtrosAtivos = useMemo(() => {
    // Considerar filtros ativos apenas se houver menos unidades selecionadas que o total disponível
    const todasSelecionadas = unidadesList.length > 0 && 
      filtros.unidadesSelecionadas.length === unidadesList.length
    return !todasSelecionadas ||
           filtros.periodoTipo !== 'este-mes' ||
           filtros.funilSelecionado !== 'todos' ||
           filtros.grupoSelecionado !== 'todos'
  }, [filtros, unidadesList.length])

  const fetchFunis = useCallback(async () => {
    try {
      const response = await fetch('/api/funis')
      const data = await response.json()
      if (data.success && data.funis) {
        setFunis(data.funis)
      }
    } catch (err) {
      setFunis([])
    }
  }, [])

  const fetchGrupos = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/grupos')
      const data = await response.json()
      if (data.success && data.grupos) {
        setGrupos(data.grupos)
      }
    } catch (err) {
      setGrupos([])
    }
  }, [])

  const fetchUnidadesList = useCallback(async () => {
    try {
      const response = await fetch('/api/unidades/list')
      const data = await response.json()
      if (data.success && data.unidades) {
        setUnidadesList(data.unidades)
      }
    } catch (err) {
      setUnidadesList([])
    }
  }, [])

  // Carregar dados estáticos
  useEffect(() => {
    fetchFunis()
    fetchGrupos()
    fetchUnidadesList()
  }, [fetchFunis, fetchGrupos, fetchUnidadesList])

  // Selecionar todas as unidades por padrão quando forem carregadas
  useEffect(() => {
    if (unidadesList.length > 0 && filtros.unidadesSelecionadas.length === 0) {
      const todosIds = unidadesList.map(u => u.id)
      setFiltros(prev => ({
        ...prev,
        unidadesSelecionadas: todosIds
      }))
    }
  }, [unidadesList, filtros.unidadesSelecionadas.length])

  // Atualizar período quando o tipo mudar
  useEffect(() => {
    if (filtros.periodoTipo !== 'personalizado') {
      const { inicio, fim } = calcularPeriodo(filtros.periodoTipo)
      if (filtros.periodoInicio !== inicio || filtros.periodoFim !== fim) {
        setFiltros(prev => ({
          ...prev,
          periodoInicio: inicio,
          periodoFim: fim
        }))
      }
    }
  }, [filtros.periodoTipo, calcularPeriodo])

  // Notificar mudanças nos filtros (sempre que filtros mudarem)
  useEffect(() => {
    // Só notificar se houver datas válidas
    if (filtros.periodoInicio && filtros.periodoFim) {
      onFiltersChange({
        unidadesSelecionadas: filtros.unidadesSelecionadas,
        periodoInicio: filtros.periodoInicio,
        periodoFim: filtros.periodoFim,
        funilSelecionado: filtros.funilSelecionado,
        grupoSelecionado: filtros.grupoSelecionado
      })
    }
  }, [filtros.unidadesSelecionadas, filtros.periodoInicio, filtros.periodoFim, filtros.funilSelecionado, filtros.grupoSelecionado, onFiltersChange])

  return (
    <div className="flex items-center gap-3 flex-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">
      {/* Filtro de Unidade (Multi-select) */}
      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
        <Label htmlFor="unidades-filter" className="text-xs font-semibold whitespace-nowrap">
          Unidades:
        </Label>
        <div className="flex-1 min-w-[150px]">
          <PainelUnidadeMultiSelect
            unidadesList={unidadesList}
            selectedIds={filtros.unidadesSelecionadas}
            onChange={(ids) => setFiltros({ ...filtros, unidadesSelecionadas: ids })}
          />
        </div>
      </div>

      {/* Filtro de Período */}
      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
        <Label htmlFor="periodo-filter" className="text-xs font-semibold whitespace-nowrap">
          Período:
        </Label>
        <Select
          value={filtros.periodoTipo}
          onValueChange={(value) => setFiltros({ ...filtros, periodoTipo: value })}
        >
          <SelectTrigger id="periodo-filter" className="h-9 text-xs flex-1">
            <SelectValue placeholder="Selecione o período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="este-mes">Este Mês</SelectItem>
            <SelectItem value="mes-passado">Mês Passado</SelectItem>
            <SelectItem value="esta-semana">Esta Semana</SelectItem>
            <SelectItem value="semana-passada">Semana Passada</SelectItem>
            <SelectItem value="este-ano">Este Ano</SelectItem>
            <SelectItem value="ano-anterior">Ano Anterior</SelectItem>
            <SelectItem value="personalizado">Personalizado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Datas Personalizadas (condicional) */}
      {filtros.periodoTipo === 'personalizado' && (
        <>
          <div className="flex items-center gap-2">
            <Label htmlFor="data-inicio" className="text-xs font-semibold whitespace-nowrap">
              De:
            </Label>
            <Input
              id="data-inicio"
              type="date"
              value={filtros.periodoInicio}
              onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
              className="h-9 text-xs w-[140px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="data-fim" className="text-xs font-semibold whitespace-nowrap">
              Até:
            </Label>
            <Input
              id="data-fim"
              type="date"
              value={filtros.periodoFim}
              onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
              className="h-9 text-xs w-[140px]"
            />
          </div>
        </>
      )}

      {/* Filtro de Funil */}
      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
        <Label htmlFor="funil-filter" className="text-xs font-semibold whitespace-nowrap">
          Funil:
        </Label>
        <Select
          value={filtros.funilSelecionado}
          onValueChange={(value) => setFiltros({ ...filtros, funilSelecionado: value })}
        >
          <SelectTrigger id="funil-filter" className="h-9 text-xs flex-1">
            <SelectValue placeholder="Selecione o funil" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {funis.map(funil => (
              <SelectItem key={funil.id} value={String(funil.id)}>
                {funil.funil_nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro de Grupo */}
      <div className="flex items-center gap-2 flex-1 min-w-[180px]">
        <Label htmlFor="grupo-filter" className="text-xs font-semibold whitespace-nowrap">
          Grupo:
        </Label>
        <Select
          value={filtros.grupoSelecionado}
          onValueChange={(value) => setFiltros({ ...filtros, grupoSelecionado: value })}
        >
          <SelectTrigger id="grupo-filter" className="h-9 text-xs flex-1">
            <SelectValue placeholder="Selecione o grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            {grupos.map(grupo => (
              <SelectItem key={grupo.id} value={String(grupo.id)}>
                {grupo.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Botão Limpar Filtros */}
      {filtrosAtivos && (
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => {
            const periodo = calcularPeriodo('este-mes')
            const todosIdsUnidades = unidadesList.map(u => u.id)
            setFiltros({
              unidadesSelecionadas: todosIdsUnidades,
              periodoTipo: 'este-mes',
              periodoInicio: periodo.inicio,
              periodoFim: periodo.fim,
              funilSelecionado: 'todos',
              grupoSelecionado: 'todos'
            })
          }}
          className="h-9 text-xs whitespace-nowrap"
        >
          <X className="h-3 w-3 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  )
}

