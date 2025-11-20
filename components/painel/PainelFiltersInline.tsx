'use client'

import PainelUnidadeMultiSelect from './PainelUnidadeMultiSelect'

interface PainelFiltersInlineProps {
  filtros: {
    unidadesSelecionadas: number[]
    periodoTipo: string
    periodoInicio: string
    periodoFim: string
    funilSelecionado: string
    grupoSelecionado: string
  }
  setFiltros: (filtros: any) => void
  unidadesList: Array<{ id: number; nome: string }>
  funis: Array<{ id: number; funil_nome: string }>
  grupos: Array<{ id: number; nome: string }>
  periodoInicial: { inicio: string; fim: string }
  filtrosAtivos: boolean
}

export default function PainelFiltersInline({
  filtros,
  setFiltros,
  unidadesList,
  funis,
  grupos,
  periodoInicial,
  filtrosAtivos
}: PainelFiltersInlineProps) {
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

