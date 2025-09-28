"use client"

import { useState, useEffect } from "react"
import { RefreshCw } from "lucide-react"

interface ColunaFunil {
  id: number
  nome_coluna: string
  id_funil: number
  total_oportunidades: number
  valor_total: number
  sequencia: number
  abertos: number
  ganhos: number
  perdidos: number
  valor_abertos: number
  valor_ganhos: number
  valor_perdidos: number
}

interface FunilData {
  success: boolean
  colunas: ColunaFunil[]
  id_funil: number
  totais_periodo: {
    total_criados: number
    valor_total_criados: number
    total_ganhos: number
    valor_total_ganhos: number
    total_perdidos: number
    valor_total_perdidos: number
  }
}

export default function FunilSimples() {
  const [funilData, setFunilData] = useState<FunilData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchFunilData = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/funil?id_funil=4')
      const data = await response.json()

      if (data.success) {
        setFunilData(data)
      } else {
        setError(data.error || 'Erro ao carregar dados do funil')
      }
    } catch (err) {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFunilData()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchFunilData, 30000)
    
    return () => clearInterval(interval)
  }, [])

  const formatCurrency = (value: number): string => {
    const numValue = Math.round(Number(value) || 0)
    return `R$ ${numValue.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
  }

  if (loading) {
    return (
      <div className="p-6 border border-white/20 rounded-lg bg-transparent backdrop-blur-sm">
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin mr-2 text-white/60" />
          <span className="text-white/60">Carregando funil...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 border border-white/20 rounded-lg bg-transparent backdrop-blur-sm">
        <div className="text-center py-8">
          <p className="text-white/60 mb-4">{error}</p>
          <button 
            onClick={fetchFunilData}
            className="text-white/80 hover:text-white border border-white/20 hover:border-white/40 px-4 py-2 rounded transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    )
  }

  if (!funilData || funilData.colunas.length === 0) {
    return (
      <div className="p-6 border border-white/20 rounded-lg bg-transparent backdrop-blur-sm">
        <div className="text-center py-8">
          <p className="text-white/60">Nenhuma coluna encontrada para o funil 4</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 border border-white/20 rounded-lg bg-transparent backdrop-blur-sm">
      <h3 className="text-lg font-medium text-white/80 mb-4">Funil de Vendas</h3>
      
      {/* Funil Visual - Formato de Funil */}
      <div className="flex flex-col items-center gap-4">
        {funilData.colunas.map((coluna, index) => {
          // Larguras simbólicas para criar visual de funil
          const largurasSimbolicas = [100, 75, 50, 25] // Larguras fixas
          const larguraAtual = largurasSimbolicas[index] || 25 // Fallback para 25%

          return (
            <div key={coluna.id}>
              {/* Etapa do Funil */}
              <div 
                className="border-2 border-white/30 rounded-lg bg-gradient-to-br from-white/5 to-white/10 backdrop-blur-sm shadow-lg hover:border-white/50 transition-all duration-300"
                style={{ width: `${larguraAtual}%` }}
              >
                <div className="p-4 text-center">
                  <h4 className="text-sm font-semibold text-white">{coluna.nome_coluna}</h4>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
