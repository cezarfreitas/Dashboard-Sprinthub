import { memo, useMemo } from "react"
import { Target } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConsultorBarraProgressoMetaProps {
  valorAtual: number
  meta: number
  vendedorId?: number
  mes?: number
  ano?: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const ConsultorBarraProgressoMeta = memo(function ConsultorBarraProgressoMeta({
  valorAtual,
  meta,
  vendedorId,
  mes,
  ano
}: ConsultorBarraProgressoMetaProps) {
  const { percentualMeta, projecao, projecaoValor, corBarra, statusProjecao } = useMemo(() => {
    if (meta === 0) return { percentualMeta: 0, projecao: 0, projecaoValor: 0, corBarra: 'blue', statusProjecao: 'sem-meta' }
    
    const percentual = Math.min(100, (valorAtual / meta) * 100)
    
    // Calcular projeção baseada no dia do mês
    const now = new Date()
    const targetMes = mes ?? now.getMonth() + 1
    const targetAno = ano ?? now.getFullYear()
    
    // Se for mês diferente do atual, não faz projeção
    if (targetMes !== now.getMonth() + 1 || targetAno !== now.getFullYear()) {
      return {
        percentualMeta: percentual,
        projecao: percentual,
        projecaoValor: valorAtual,
        corBarra: percentual >= 100 ? 'gold' : 'blue',
        statusProjecao: 'fora-periodo'
      }
    }
    
    // Calcular dia atual e total de dias no mês
    const diaAtual = now.getDate()
    const ultimoDiaMes = new Date(targetAno, targetMes, 0).getDate()
    const diasDecorridos = diaAtual
    const diasRestantes = ultimoDiaMes - diaAtual
    const percentualMesDecorrido = (diasDecorridos / ultimoDiaMes) * 100
    
    // Calcular projeção linear
    const projecaoVal = diasDecorridos > 0 ? (valorAtual / diasDecorridos) * ultimoDiaMes : 0
    const projecaoPercentual = (projecaoVal / meta) * 100
    
    // Determinar cor da barra baseado na projeção
    let cor: string
    let status: string
    
    if (percentual >= 100) {
      cor = 'gold' // Meta já atingida
      status = 'atingido'
    } else if (projecaoPercentual >= 100) {
      cor = 'green' // Projeção indica que vai bater a meta
      status = 'no-caminho'
    } else if (projecaoPercentual >= 80) {
      cor = 'yellow' // Projeção indica 80-99% - alerta
      status = 'atencao'
    } else {
      cor = 'red' // Projeção indica que não vai bater a meta
      status = 'risco'
    }
    
    return {
      percentualMeta: percentual,
      projecao: projecaoPercentual,
      projecaoValor: projecaoVal,
      corBarra: cor,
      statusProjecao: status
    }
  }, [valorAtual, meta, mes, ano])

  // Determinar mês e ano atual se não fornecidos
  const currentDate = new Date()
  const targetMes = mes ?? currentDate.getMonth() + 1
  const targetAno = ano ?? currentDate.getFullYear()

  // Função para obter classes de cor da barra
  const getBarraClasses = (cor: string) => {
    switch (cor) {
      case 'gold':
        return 'bg-gradient-to-r from-yellow-400 to-yellow-500'
      case 'green':
        return 'bg-gradient-to-r from-green-400 to-green-600'
      case 'yellow':
        return 'bg-gradient-to-r from-yellow-500 to-orange-500'
      case 'red':
        return 'bg-gradient-to-r from-red-400 to-red-600'
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600'
    }
  }

  // Função para obter classe de cor do texto
  const getTextoColor = (cor: string) => {
    switch (cor) {
      case 'gold':
        return 'text-yellow-600'
      case 'green':
        return 'text-green-600'
      case 'yellow':
        return 'text-orange-600'
      case 'red':
        return 'text-red-600'
      default:
        return 'text-blue-600'
    }
  }

  // Sempre renderizar (mostra mensagem se não houver meta)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4 shadow-sm">
      {/* Mobile: Layout vertical */}
      <div className="flex flex-col gap-3 md:hidden">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <span className="text-xs font-semibold text-gray-700">
            {meta === 0 ? 'Minhas Vendas:' : 'Minha Meta:'}
          </span>
        </div>
        
        {meta > 0 ? (
          <>
            {/* Barra de progresso mobile */}
            <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-center",
                  getBarraClasses(corBarra)
                )}
                style={{ width: `${Math.max(3, Math.min(100, percentualMeta))}%` }}
              >
                {percentualMeta > 10 && (
                  <span className="text-white text-[10px] font-bold">
                    {percentualMeta.toFixed(0)}%
                  </span>
                )}
              </div>
            </div>
            
            {/* Valores mobile */}
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-gray-500">Atual: </span>
                <span className="font-bold text-gray-900">{formatCurrency(valorAtual)}</span>
              </div>
              <div className="text-gray-300">/</div>
              <div>
                <span className="text-gray-500">Meta: </span>
                <span className="font-bold text-gray-900">{formatCurrency(meta)}</span>
              </div>
            </div>
            
            {statusProjecao !== 'atingido' && statusProjecao !== 'fora-periodo' && projecaoValor > 0 && (
              <div className="text-center text-xs">
                <span className="text-gray-500">Projeção: </span>
                <span className={cn("font-bold", getTextoColor(corBarra))}>
                  {formatCurrency(projecaoValor)} ({projecao.toFixed(0)}%)
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1 text-xs">
            <div>
              <span className="text-gray-500">Total: </span>
              <span className="font-bold text-gray-900">{formatCurrency(valorAtual)}</span>
            </div>
            <div className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-center">
              <span className="text-orange-600">Sem meta cadastrada</span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop: Layout horizontal (original) */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-2 flex-shrink-0">
          <Target className="w-5 h-5 text-blue-600" />
          <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
            {meta === 0 ? 'Minhas Vendas do Mês:' : 'Minha Meta do Mês:'}
          </span>
        </div>
        
        {meta > 0 ? (
          <div className="flex-1">
            <div className="flex items-center gap-4">
              {/* Barra de Progresso Grande */}
              <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden flex-1">
                <div 
                  className={cn(
                    "absolute inset-y-0 left-0 transition-all duration-700 rounded-full flex items-center justify-end pr-3",
                    getBarraClasses(corBarra)
                  )}
                  style={{ width: `${Math.max(3, Math.min(100, percentualMeta))}%` }}
                >
                  {percentualMeta > 15 && (
                    <span className="text-white text-xs font-bold">
                      {percentualMeta.toFixed(1)}%
                    </span>
                  )}
                </div>
                {percentualMeta <= 15 && percentualMeta > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-gray-600 text-xs font-bold">
                      {percentualMeta.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 flex-shrink-0">
                <div className="text-right">
                  <span className="text-xs text-gray-500">Atingido: </span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(valorAtual)}</span>
                </div>
                <div className="text-gray-300">/</div>
                <div className="text-right">
                  <span className="text-xs text-gray-500">Meta: </span>
                  <span className="text-sm font-bold text-gray-900">{formatCurrency(meta)}</span>
                </div>
                {statusProjecao !== 'atingido' && statusProjecao !== 'fora-periodo' && projecaoValor > 0 && (
                  <>
                    <div className="text-gray-300">/</div>
                    <div className="text-right">
                      <span className="text-xs text-gray-500">Projeção: </span>
                      <span className={cn("text-sm font-bold", getTextoColor(corBarra))}>
                        {formatCurrency(projecaoValor)}
                      </span>
                    </div>
                  </>
                )}
                <div className="text-right min-w-[80px]">
                  <div className="flex flex-col gap-0.5">
                    <span className={cn("text-sm font-bold", getTextoColor(corBarra))}>
                      {percentualMeta.toFixed(1)}%
                    </span>
                    {statusProjecao !== 'atingido' && statusProjecao !== 'fora-periodo' && projecao > 0 && (
                      <span className={cn("text-[10px] font-semibold", getTextoColor(corBarra))}>
                        Proj: {projecao.toFixed(0)}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <span className="text-xs text-gray-500">Total vendido: </span>
              <span className="text-sm font-bold text-gray-900">{formatCurrency(valorAtual)}</span>
            </div>
            <div className="px-3 py-1 bg-orange-50 border border-orange-200 rounded-md">
              <span className="text-xs text-orange-600">Sem meta cadastrada</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

