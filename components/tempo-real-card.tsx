"use client"

import { useState, useEffect } from "react"
import { RefreshCw, TrendingDown as TrendingDownIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface TempoRealCardProps {
  title: string
  status?: string
  endpoint: string
  refreshInterval?: number
  periodo?: 'atual' | 'anual' | null
  dateField?: 'gain_date' | 'lost_date' | 'created_at'
}

interface OportunidadeData {
  id: number
  user: string
  value: number
  gain_date: string
  created_at: string
  status?: string
}

export default function TempoRealCard({ 
  title, 
  status, 
  endpoint, 
  refreshInterval = 30000,
  periodo = null,
  dateField = 'gain_date'
}: TempoRealCardProps) {
  const [count, setCount] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)


  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Construir URL com parâmetros
      const params = new URLSearchParams()
      
      if (status) {
        params.append('status', status)
      }
      
      if (periodo === 'atual') {
        const now = new Date()
        params.append('mes', (now.getMonth() + 1).toString())
        params.append('ano', now.getFullYear().toString())
        params.append('dateField', dateField)
      }
      
      const url = params.toString() ? `${endpoint}?${params.toString()}` : endpoint
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`)
      }
      
      const data = await response.json()
      
      const oportunidades = data.oportunidades || []
      
      setCount(oportunidades.length)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  // Atualização automática
  useEffect(() => {
    fetchData()
    
    const interval = setInterval(fetchData, refreshInterval)
    
    return () => clearInterval(interval)
  }, [endpoint, status, refreshInterval, periodo, dateField])

  return (
    <div className={cn(
      "w-fit min-w-[200px] p-4 border border-white/20 rounded-lg transition-all duration-300 hover:border-white/40",
      "bg-transparent backdrop-blur-sm"
    )}>
      <div className="mb-3">
        <h3 className="text-sm font-medium text-white/80">
          {title}
        </h3>
      </div>
      
      <div>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <RefreshCw className="h-4 w-4 animate-spin mr-2 text-white/60" />
            <span className="text-white/60 text-sm">Carregando...</span>
          </div>
        ) : error ? (
          <div className="text-center py-6">
            <div className="mb-3">
              <TrendingDownIcon className="h-8 w-8 mx-auto mb-2 text-red-400" />
              <p className="text-sm text-white/60 mb-3">{error}</p>
            </div>
            <button 
              onClick={fetchData} 
              className="text-xs text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-3 py-1 rounded transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="text-3xl font-bold text-white">
              {count.toLocaleString('pt-BR')}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
