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
    funisSelecionados: [] as number[],
    gruposSelecionados: [] as number[],
  }))

  const funilIdParam = filtros.funisSelecionados.length > 0 ? filtros.funisSelecionados.join(',') : undefined
  const grupoIdParam = filtros.gruposSelecionados.length > 0 ? filtros.gruposSelecionados.join(',') : undefined

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
    <div className="h-screen w-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      {/* Header Compacto - Otimizado 1080x1920 */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 py-6 px-8 shadow-2xl sticky top-0 z-50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-5xl font-black uppercase tracking-tight leading-none truncate">
              Dashboard
            </h1>
            <p className="text-2xl text-blue-100 mt-1 font-bold truncate">
              {mesNome} {anoAtual}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 text-blue-100 flex-shrink-0">
            <RefreshCw className="w-8 h-8 animate-spin-slow" />
            <span className="text-xl font-bold whitespace-nowrap">
              {ultimaAtualizacao.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Barra de Progresso Meta */}
        <div className="overflow-hidden -mx-2">
          <PainelBarraProgressoMeta
            unidadesIds={filtros.unidadesSelecionadas}
            periodoInicio={filtros.periodoInicio}
            periodoFim={filtros.periodoFim}
            funilId={funilIdParam}
          />
        </div>

        {/* Cards de Estatísticas - 1 Coluna (empilhados verticalmente) */}
        <div className="space-y-3">
          <div className="overflow-hidden">
            <PainelHojeCard 
              unidadesIds={filtros.unidadesSelecionadas}
              funilId={funilIdParam}
              grupoId={grupoIdParam}
            />
          </div>
          <div className="overflow-hidden">
            <PainelOportunidadesAbertasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
          </div>
          <div className="overflow-hidden">
            <PainelOportunidadesGanhasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
          </div>
          <div className="overflow-hidden">
            <PainelOportunidadesPerdidasCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
          </div>
          <div className="overflow-hidden">
            <PainelTaxaConversaoCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
          </div>
          <div className="overflow-hidden">
            <PainelTicketMedioCard 
              unidadesIds={filtros.unidadesSelecionadas}
              periodoInicio={filtros.periodoInicio}
              periodoFim={filtros.periodoFim}
              funilId={funilIdParam}
            />
          </div>
        </div>

        {/* Grid de Unidades - Versão TV */}
        <div className="mt-6">
          <h2 className="text-3xl font-black mb-4 text-white flex items-center gap-2 truncate">
            <div className="w-1.5 h-8 bg-blue-500 rounded-full flex-shrink-0"></div>
            <span className="truncate">Unidades</span>
          </h2>
          <div className="overflow-hidden">
            <div className="tv-unidades-grid">
              <PainelUnidadesGrid 
                filtros={filtros}
                mesAtual={mesAtual}
                anoAtual={anoAtual}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer Minimalista */}
      <div className="bg-slate-900/50 py-4 text-center text-slate-300 text-lg border-t-2 border-slate-700 font-semibold px-4">
        <div className="truncate">
          Atualização: {ultimaAtualizacao.toLocaleTimeString('pt-BR')} • Auto-refresh: 5min
        </div>
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
        
        /* AJUSTES FINAIS PARA CARDS DE UNIDADES */
        .tv-unidades-grid * {
          font-size: inherit !important;
        }
        
        /* Grid de 3 colunas - layout fixo */
        .tv-unidades-grid [class*="grid-cols-3"] {
          display: grid !important;
          grid-template-columns: 1fr 1fr 1fr !important;
          gap: 0.25rem !important;
          width: 100% !important;
        }
        
        /* Células individuais do grid */
        .tv-unidades-grid [class*="grid-cols-3"] > div {
          padding: 0.25rem !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
          justify-content: center !important;
          min-width: 0 !important;
          overflow: hidden !important;
        }
        
        /* Todos os textos dentro do grid de métricas */
        .tv-unidades-grid [class*="grid-cols-3"] div,
        .tv-unidades-grid [class*="grid-cols-3"] span,
        .tv-unidades-grid [class*="grid-cols-3"] p {
          font-size: 0.625rem !important;
          line-height: 1.2 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          max-width: 100% !important;
          text-align: center !important;
        }
        
        /* Números grandes (contadores) */
        .tv-unidades-grid [class*="grid-cols-3"] [class*="text-2xl"],
        .tv-unidades-grid [class*="grid-cols-3"] [class*="text-3xl"] {
          font-size: 1rem !important;
          font-weight: 700 !important;
        }
      `}</style>
    </div>
  )
}
