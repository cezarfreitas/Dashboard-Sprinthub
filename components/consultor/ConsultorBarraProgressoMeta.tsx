"use client"

import { memo, useMemo } from "react"
import { Target, TrendingUp, Trophy } from "lucide-react"

interface ConsultorBarraProgressoMetaProps {
  valorAtual: number
  meta: number
  vendedorId?: number
  mes?: number
  ano?: number
  // Cards de estatísticas
  criadasHoje?: number
  valorCriadasHoje?: number
  abertasTotal?: number
  abertasValorTotal?: number
  ganhosTotalOportunidades?: number
  ganhosValorTotal?: number
  perdidasTotal?: number
  perdidasValorTotal?: number
  ticketMedio?: number
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

// Funções auxiliares para o velocímetro
const startAngle = -180
const endAngle = 0

const percentualParaAngulo = (percent: number): number => {
  const angulo = startAngle + (percent / 100) * (endAngle - startAngle)
  return angulo
}

const criarArco = (
  raio: number,
  anguloInicio: number,
  anguloFim: number
): string => {
  const radianos = (angulo: number) => (angulo * Math.PI) / 180
  const x1 = 150 + raio * Math.cos(radianos(anguloInicio))
  const y1 = 150 + raio * Math.sin(radianos(anguloInicio))
  const x2 = 150 + raio * Math.cos(radianos(anguloFim))
  const y2 = 150 + raio * Math.sin(radianos(anguloFim))
  
  const largeArcFlag = anguloFim - anguloInicio > 180 ? 1 : 0
  
  return `M ${x1} ${y1} A ${raio} ${raio} 0 ${largeArcFlag} 1 ${x2} ${y2}`
}

export const ConsultorBarraProgressoMeta = memo(function ConsultorBarraProgressoMeta({
  valorAtual,
  meta,
  vendedorId,
  mes,
  ano,
  criadasHoje = 0,
  valorCriadasHoje = 0,
  abertasTotal = 0,
  abertasValorTotal = 0,
  ganhosTotalOportunidades = 0,
  ganhosValorTotal = 0,
  perdidasTotal = 0,
  perdidasValorTotal = 0,
  ticketMedio = 0
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

  // Função para obter cores
  const getCores = (cor: string) => {
    switch (cor) {
      case 'gold':
        return {
          primaria: '#eab308',
          secundaria: '#fbbf24',
          texto: '#ca8a04',
          bg: '#fef9c3'
        }
      case 'green':
        return {
          primaria: '#16a34a',
          secundaria: '#22c55e',
          texto: '#15803d',
          bg: '#dcfce7'
        }
      case 'yellow':
        return {
          primaria: '#ea580c',
          secundaria: '#fb923c',
          texto: '#c2410c',
          bg: '#ffedd5'
        }
      case 'red':
        return {
          primaria: '#dc2626',
          secundaria: '#ef4444',
          texto: '#b91c1c',
          bg: '#fee2e2'
        }
      default:
        return {
          primaria: '#2563eb',
          secundaria: '#3b82f6',
          texto: '#1d4ed8',
          bg: '#dbeafe'
        }
    }
  }

  const cores = getCores(corBarra)

  // Calcular ângulos para o velocímetro (180° = semicírculo)
  const startAngle = -180
  const endAngle = 0
  const percentualParaAngulo = (percent: number) => {
    const angulo = startAngle + (percent / 100) * (endAngle - startAngle)
    return angulo
  }

  // Criar path do arco
  const criarArco = (
    raio: number,
    anguloInicio: number,
    anguloFim: number
  ) => {
    const radianos = (angulo: number) => (angulo * Math.PI) / 180
    const x1 = 150 + raio * Math.cos(radianos(anguloInicio))
    const y1 = 150 + raio * Math.sin(radianos(anguloInicio))
    const x2 = 150 + raio * Math.cos(radianos(anguloFim))
    const y2 = 150 + raio * Math.sin(radianos(anguloFim))
    
    const largeArcFlag = anguloFim - anguloInicio > 180 ? 1 : 0
    
    return `M ${x1} ${y1} A ${raio} ${raio} 0 ${largeArcFlag} 1 ${x2} ${y2}`
  }

  if (meta === 0) {
    return (
      <div className="w-full p-3">
        <div className="flex items-center gap-3">
          <Target className="w-6 h-6 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-bold text-gray-900">
              Minhas Vendas do Mês: {formatCurrency(valorAtual)}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              Sem meta cadastrada
            </div>
          </div>
        </div>
      </div>
    )
  }

  const anguloAtual = percentualParaAngulo(Math.min(percentualMeta, 100))
  const anguloProjecao = percentualParaAngulo(Math.min(projecao, 100))

  return (
    <div className="w-full">
      <div className="p-3">
        <div className="grid grid-cols-1 lg:grid-cols-[25%_75%] gap-6 items-center">
          {/* Coluna 1: Velocímetro (25%) */}
          <div className="flex items-center justify-center">
            {/* Velocímetro SVG Customizado */}
            <div className="w-full max-w-sm">
              <svg width="100%" height="180" viewBox="0 40 300 140" className="drop-shadow-lg">
                {/* Fundo do velocímetro */}
                <path
                  d={criarArco(100, startAngle, endAngle)}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="20"
                  strokeLinecap="round"
                />
                
                {/* Marcações do velocímetro */}
                {[0, 25, 50, 75, 100].map((marca) => {
                const angulo = percentualParaAngulo(marca)
                const radianos = (angulo * Math.PI) / 180
                const x1 = 150 + 85 * Math.cos(radianos)
                const y1 = 150 + 85 * Math.sin(radianos)
                const x2 = 150 + 95 * Math.cos(radianos)
                const y2 = 150 + 95 * Math.sin(radianos)
                
                return (
                  <g key={marca}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#9ca3af"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <text
                      x={150 + 70 * Math.cos(radianos)}
                      y={150 + 70 * Math.sin(radianos)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-[10px] font-semibold fill-gray-500"
                    >
                      {marca}%
                    </text>
                  </g>
                )
              })}
              
              {/* Arco da projeção (se aplicável) */}
              {statusProjecao !== 'atingido' && statusProjecao !== 'fora-periodo' && projecao > percentualMeta && (
                <path
                  d={criarArco(100, anguloAtual, anguloProjecao)}
                  fill="none"
                  stroke="#d1d5db"
                  strokeWidth="20"
                  strokeLinecap="round"
                  opacity="0.6"
                />
              )}
              
              {/* Arco principal (alcançado) */}
              <path
                d={criarArco(100, startAngle, anguloAtual)}
                fill="none"
                stroke={cores.primaria}
                strokeWidth="20"
                strokeLinecap="round"
              >
                <animate
                  attributeName="stroke-dasharray"
                  from="0 1000"
                  to="1000 1000"
                  dur="1.5s"
                  fill="freeze"
                />
              </path>
              
              {/* Ponteiro */}
              <g transform={`rotate(${anguloAtual + 90} 150 150)`}>
                <path
                  d="M 150 150 L 145 155 L 150 55 L 155 155 Z"
                  fill={cores.texto}
                  className="drop-shadow-md"
                />
                <circle cx="150" cy="150" r="8" fill={cores.primaria} stroke="white" strokeWidth="2" />
              </g>
              
              {/* Texto central */}
              <text
                x="150"
                y="125"
                textAnchor="middle"
                className="text-2xl font-bold"
                fill="#1e40af"
              >
                {Math.round(percentualMeta)}%
              </text>
              
              {/* Mensagem motivacional */}
              <text
                x="150"
                y="145"
                textAnchor="middle"
                className="text-[10px] font-medium"
                fill="#6b7280"
              >
                {percentualMeta >= 100 ? '🎉 Meta atingida!' : 
                 percentualMeta >= 75 ? '🚀 Quase lá!' :
                 percentualMeta >= 50 ? '💪 Continue assim!' :
                 percentualMeta >= 25 ? '⚡ Acelere!' :
                 '🔥 Vamos lá!'}
              </text>
              
              {/* Ícone de status */}
              {statusProjecao === 'atingido' && (
                <g transform="translate(125, 165)">
                  <circle cx="25" cy="10" r="15" fill={cores.bg} />
                  <text x="25" y="15" textAnchor="middle" className="text-xl">🏆</text>
                </g>
              )}
            </svg>
            </div>
          </div>

          {/* Coluna 2: Cards de Estatísticas (75%) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Card Resumo Meta */}
            <div className="bg-white border-2 border-blue-600 rounded-lg p-3 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-[10px] font-bold text-blue-600 uppercase mb-2 text-center">Meta do Mês</div>
              <div className="grid grid-cols-2 gap-3">
                {/* Coluna 1 */}
                <div className="space-y-2">
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Alcançado</div>
                    <div className="text-sm font-bold text-green-600">{formatCurrency(valorAtual)}</div>
                  </div>
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Meta</div>
                    <div className="text-sm font-bold text-blue-600">{formatCurrency(meta)}</div>
                  </div>
                </div>
                
                {/* Coluna 2 */}
                <div className="space-y-2">
                  <div>
                    <div className="text-[8px] text-muted-foreground uppercase">Falta</div>
                    <div className="text-sm font-bold text-orange-600">{formatCurrency(Math.max(0, meta - valorAtual))}</div>
                  </div>
                  {statusProjecao !== 'fora-periodo' && projecaoValor > 0 && (
                    <div>
                      <div className="text-[8px] text-muted-foreground uppercase">Projeção</div>
                      <div className="text-sm font-bold" style={{ color: cores.texto }}>{formatCurrency(projecaoValor)}</div>
                      <div className="text-[7px] text-muted-foreground mt-0.5">
                        {projecaoValor >= meta ? '🚀 No caminho!' : '💪 Acelere!'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Criadas Hoje */}
            <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase opacity-90 mb-2">Criadas Hoje</div>
                  <div className="text-3xl font-bold">{criadasHoje}</div>
                  <div className="text-sm opacity-90 mt-1">{formatCurrency(valorCriadasHoje)}</div>
                </div>
                <div className="text-4xl opacity-20">📝</div>
              </div>
            </div>

            {/* Abertas */}
            <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase opacity-90 mb-2">Abertas</div>
                  <div className="text-3xl font-bold">{abertasTotal}</div>
                  <div className="text-sm opacity-90 mt-1">{formatCurrency(abertasValorTotal)}</div>
                </div>
                <div className="text-4xl opacity-20">📂</div>
              </div>
            </div>

            {/* Ganhas */}
            <div className="bg-gradient-to-br from-green-500 to-green-700 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase opacity-90 mb-2">Ganhas</div>
                  <div className="text-3xl font-bold">{formatCurrency(ganhosValorTotal)}</div>
                  <div className="text-sm opacity-90 mt-1">{ganhosTotalOportunidades} ops</div>
                </div>
                <div className="text-4xl opacity-20">✅</div>
              </div>
            </div>

            {/* Perdidas */}
            <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-lg p-3 text-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase opacity-90 mb-2">Perdidas</div>
                  <div className="text-3xl font-bold">{perdidasTotal}</div>
                  <div className="text-sm opacity-90 mt-1">{formatCurrency(perdidasValorTotal)}</div>
                </div>
                <div className="text-4xl opacity-20">❌</div>
              </div>
            </div>

            {/* Ticket Médio */}
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase opacity-90 mb-2">Ticket Médio</div>
                  <div className="text-3xl font-bold">{formatCurrency(ticketMedio)}</div>
                  <div className="text-sm opacity-90 mt-1">{ganhosTotalOportunidades} vendas</div>
                </div>
                <div className="text-4xl opacity-20">💰</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
})
