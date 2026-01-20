"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { PainelUnidadesGrid } from "@/components/painel/PainelUnidadesGrid"
import PainelHojeCard from "@/components/estatisticas/painel/PainelHojeCard"
import PainelOportunidadesAbertasCard from "@/components/estatisticas/painel/PainelOportunidadesAbertasCard"
import PainelOportunidadesPerdidasCard from "@/components/estatisticas/painel/PainelOportunidadesPerdidasCard"
import PainelOportunidadesGanhasCard from "@/components/estatisticas/painel/PainelOportunidadesGanhasCard"
import PainelTaxaConversaoCard from "@/components/estatisticas/painel/PainelTaxaConversaoCard"
import PainelTicketMedioCard from "@/components/estatisticas/painel/PainelTicketMedioCard"
import PainelBarraProgressoMeta from "@/components/painel/PainelBarraProgressoMeta"
import { RefreshCw } from "lucide-react"

export default function PainelTVPage() {
  const abortControllerRef = useRef<AbortController | null>(null)
  const [ultimaAtualizacao, setUltimaAtualizacao] = useState<Date>(new Date())
  
  // Período inicial (este mês)
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
  
  const [filtros] = useState(() => ({
    unidadesSelecionadas: [] as number[],
    periodoTipo: 'este-mes' as string,
    periodoInicio: periodoInicial.inicio,
    periodoFim: periodoInicial.fim,
    funilSelecionado: 'todos',
    grupoSelecionado: 'todos',
  }))

  const { mesAtual, anoAtual } = useMemo(() => {
    const dataAtual = new Date()
    return {
      mesAtual: dataAtual.getMonth() + 1,
      anoAtual: dataAtual.getFullYear()
    }
  }, [])

  // Auto-refresh a cada 5 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      setUltimaAtualizacao(new Date())
      window.location.reload()
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [])

  const mesNome = useMemo(() => {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ]
    return meses[new Date().getMonth()]
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header Compacto */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-6 px-8 shadow-2xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase tracking-tight">
              Dashboard Comercial
            </h1>
            <p className="text-xl text-blue-100 mt-1 font-semibold">
              {mesNome} {anoAtual}
            </p>
          </div>
          <div className="flex items-center gap-3 text-blue-100">
            <RefreshCw className="w-6 h-6 animate-spin-slow" />
            <span className="text-sm">
              {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Barra de Progresso Meta */}
        <PainelBarraProgressoMeta
          unidadesIds={filtros.unidadesSelecionadas}
          periodoInicio={filtros.periodoInicio}
          periodoFim={filtros.periodoFim}
          funilId={filtros.funilSelecionado}
        />

        {/* Cards de Estatísticas - Grid Vertical */}
        <div className="grid grid-cols-2 gap-4">
          <PainelHojeCard 
            unidadesIds={filtros.unidadesSelecionadas}
            funilId={filtros.funilSelecionado}
            grupoId={filtros.grupoSelecionado}
          />
          <PainelOportunidadesAbertasCard 
            unidadesIds={filtros.unidadesSelecionadas}
            periodoInicio={filtros.periodoInicio}
            periodoFim={filtros.periodoFim}
            funilId={filtros.funilSelecionado}
          />
          <PainelOportunidadesGanhasCard 
            unidadesIds={filtros.unidadesSelecionadas}
            periodoInicio={filtros.periodoInicio}
            periodoFim={filtros.periodoFim}
            funilId={filtros.funilSelecionado}
          />
          <PainelOportunidadesPerdidasCard 
            unidadesIds={filtros.unidadesSelecionadas}
            periodoInicio={filtros.periodoInicio}
            periodoFim={filtros.periodoFim}
            funilId={filtros.funilSelecionado}
          />
          <PainelTaxaConversaoCard 
            unidadesIds={filtros.unidadesSelecionadas}
            periodoInicio={filtros.periodoInicio}
            periodoFim={filtros.periodoFim}
            funilId={filtros.funilSelecionado}
          />
          <PainelTicketMedioCard 
            unidadesIds={filtros.unidadesSelecionadas}
            periodoInicio={filtros.periodoInicio}
            periodoFim={filtros.periodoFim}
            funilId={filtros.funilSelecionado}
          />
        </div>

        {/* Grid de Unidades - Versão TV */}
        <div className="mt-8">
          <h2 className="text-3xl font-bold mb-6 text-white flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
            Desempenho por Unidade
          </h2>
          <PainelUnidadesGrid 
            filtros={filtros}
            mesAtual={mesAtual}
            anoAtual={anoAtual}
          />
        </div>
      </div>

      {/* Footer Minimalista */}
      <div className="bg-slate-900/50 py-4 text-center text-slate-400 text-sm border-t border-slate-700">
        Atualização automática a cada 5 minutos • Última atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')}
      </div>

      <style jsx global>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .animate-spin-slow {
          animation: spin-slow 3s linear infinite;
        }
        
        /* Ocultar scrollbar mas manter funcionalidade */
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.3);
        }
      `}</style>
    </div>
  )
}
