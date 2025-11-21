'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import PainelUnidadeMultiSelect from '../painel/PainelUnidadeMultiSelect'

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
  // Período inicial
  const periodoInicial = useMemo(() => {
    const inicio = new Date()
    const fim = new Date()
    inicio.setDate(1)
    inicio.setHours(0, 0, 0, 0)
    fim.setHours(23, 59, 59, 999)
    return {
      inicio: inicio.toISOString().split('T')[0],
      fim: fim.toISOString().split('T')[0]
    }
  }, [])

  const [filtros, setFiltros] = useState(() => ({
    unidadesSelecionadas: [] as number[],
    periodoTipo: 'este-mes' as string,
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos'
  }))

  const [funis, setFunis] = useState<Array<{ id: number; funil_nome: string }>>([])
  const [grupos, setGrupos] = useState<Array<{ id: number; nome: string }>>([])
  const [unidadesList, setUnidadesList] = useState<Array<{ id: number; nome: string }>>([])

  // Função para calcular datas baseado no tipo de período
  const calcularPeriodo = useMemo(() => {
    return (tipo: string) => {
      const hoje = new Date()
      const inicio = new Date()
      const fim = new Date()

      switch (tipo) {
        case 'este-mes':
          inicio.setDate(1)
          inicio.setHours(0, 0, 0, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'mes-passado':
          inicio.setMonth(hoje.getMonth() - 1, 1)
          inicio.setHours(0, 0, 0, 0)
          fim.setDate(0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'esta-semana':
          const diaSemana = hoje.getDay()
          inicio.setDate(hoje.getDate() - diaSemana)
          inicio.setHours(0, 0, 0, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'semana-passada':
          const diaSemanaAtual = hoje.getDay()
          inicio.setDate(hoje.getDate() - diaSemanaAtual - 7)
          inicio.setHours(0, 0, 0, 0)
          fim.setDate(hoje.getDate() - diaSemanaAtual - 1)
          fim.setHours(23, 59, 59, 999)
          break
        case 'este-ano':
          inicio.setMonth(0, 1)
          inicio.setHours(0, 0, 0, 0)
          fim.setHours(23, 59, 59, 999)
          break
        case 'ano-anterior':
          inicio.setFullYear(hoje.getFullYear() - 1, 0, 1)
          inicio.setHours(0, 0, 0, 0)
          fim.setFullYear(hoje.getFullYear() - 1, 11, 31)
          fim.setHours(23, 59, 59, 999)
          break
        default:
          return { inicio: '', fim: '' }
      }

      return {
        inicio: inicio.toISOString().split('T')[0],
        fim: fim.toISOString().split('T')[0]
      }
    }
  }, [])

  const filtrosAtivos = useMemo(() => {
    return filtros.unidadesSelecionadas.length > 0 ||
           filtros.periodoTipo !== 'este-mes' ||
           filtros.funilSelecionado !== 'todos' ||
           filtros.grupoSelecionado !== 'todos'
  }, [filtros])

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

  // Notificar mudanças nos filtros
  useEffect(() => {
    onFiltersChange({
      unidadesSelecionadas: filtros.unidadesSelecionadas,
      periodoInicio: filtros.periodoInicio,
      periodoFim: filtros.periodoFim,
      funilSelecionado: filtros.funilSelecionado,
      grupoSelecionado: filtros.grupoSelecionado
    })
  }, [filtros, onFiltersChange])

  return (
    <div className="flex items-center gap-3 mb-4 bg-gray-900/50 border border-gray-800 rounded-lg p-3">
      {/* Filtro de Unidade (Multi-select) */}
      <div className="flex items-center gap-2 flex-1">
        <label className="text-xs font-semibold text-gray-400 whitespace-nowrap">Unidades:</label>
        <PainelUnidadeMultiSelect
          unidadesList={unidadesList}
          selectedIds={filtros.unidadesSelecionadas}
          onChange={(ids) => setFiltros({ ...filtros, unidadesSelecionadas: ids })}
        />
      </div>

      {/* Filtro de Período */}
      <div className="flex items-center gap-2 flex-1">
        <label className="text-xs font-semibold text-gray-400 whitespace-nowrap">Período:</label>
        <select
          value={filtros.periodoTipo}
          onChange={(e) => setFiltros({ ...filtros, periodoTipo: e.target.value })}
          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="este-mes">Este Mês</option>
          <option value="mes-passado">Mês Passado</option>
          <option value="esta-semana">Esta Semana</option>
          <option value="semana-passada">Semana Passada</option>
          <option value="este-ano">Este Ano</option>
          <option value="ano-anterior">Ano Anterior</option>
          <option value="personalizado">Personalizado</option>
        </select>
      </div>

      {/* Datas Personalizadas (condicional) */}
      {filtros.periodoTipo === 'personalizado' && (
        <>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400 whitespace-nowrap">De:</label>
            <input
              type="date"
              value={filtros.periodoInicio}
              onChange={(e) => setFiltros({ ...filtros, periodoInicio: e.target.value })}
              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-400 whitespace-nowrap">Até:</label>
            <input
              type="date"
              value={filtros.periodoFim}
              onChange={(e) => setFiltros({ ...filtros, periodoFim: e.target.value })}
              className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {/* Filtro de Funil */}
      <div className="flex items-center gap-2 flex-1">
        <label className="text-xs font-semibold text-gray-400 whitespace-nowrap">Funil:</label>
        <select
          value={filtros.funilSelecionado}
          onChange={(e) => setFiltros({ ...filtros, funilSelecionado: e.target.value })}
          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="todos">Todos</option>
          {funis.map(funil => (
            <option key={funil.id} value={funil.id}>
              {funil.funil_nome}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro de Grupo */}
      <div className="flex items-center gap-2 flex-1">
        <label className="text-xs font-semibold text-gray-400 whitespace-nowrap">Grupo:</label>
        <select
          value={filtros.grupoSelecionado}
          onChange={(e) => setFiltros({ ...filtros, grupoSelecionado: e.target.value })}
          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="todos">Todos</option>
          {grupos.map(grupo => (
            <option key={grupo.id} value={grupo.id}>
              {grupo.nome}
            </option>
          ))}
        </select>
      </div>

      {/* Botão Limpar Filtros */}
      {filtrosAtivos && (
        <button
          onClick={() => setFiltros({
            unidadesSelecionadas: [],
            periodoTipo: 'este-mes',
            periodoInicio: periodoInicial.inicio,
            periodoFim: periodoInicial.fim,
            funilSelecionado: 'todos',
            grupoSelecionado: 'todos'
          })}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded transition-colors whitespace-nowrap"
        >
          Limpar
        </button>
      )}
    </div>
  )
}

