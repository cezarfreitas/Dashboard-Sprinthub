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
        <div className="grid grid-cols-1 lg:grid-cols-[20%_80%] gap-6 items-center">
          {/* Coluna 1: Velocímetro + Informações (20%) */}
          <div className="flex flex-col items-center justify-center h-full">
            {/* Velocímetro SVG Customizado */}
            <div className="flex-shrink-0 relative">
              <svg width="280" height="140" viewBox="0 50 300 120" className="drop-shadow-lg">
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
                fill={cores.texto}
              >
                {Math.round(percentualMeta)}%
              </text>
              <text
                x="150"
                y="142"
                textAnchor="middle"
                className="text-xs font-medium fill-gray-500"
              >
                da meta
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

            {/* Informações do Velocímetro */}
            <div className="w-full">
              {/* Linha única: Alcançado | Meta | Falta | Projeção/Status */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {/* Alcançado */}
                <div>
                  <div className="text-[8px] text-muted-foreground font-medium uppercase mb-0.5">Alcançado</div>
                  <div className="text-sm font-bold" style={{ color: cores.texto }}>
                    {formatCurrency(valorAtual)}
                  </div>
                </div>

                {/* Meta */}
                <div>
                  <div className="text-[8px] text-muted-foreground font-medium uppercase mb-0.5">Meta</div>
                  <div className="text-sm font-bold text-foreground">
                    {formatCurrency(meta)}
                  </div>
                </div>

                {/* Falta */}
                <div>
                  <div className="text-[8px] text-muted-foreground font-medium uppercase mb-0.5">Falta</div>
                  <div className="text-sm font-bold text-muted-foreground">
                    {formatCurrency(Math.max(0, meta - valorAtual))}
                  </div>
                </div>

                {/* Projeção ou Status */}
                <div>
                  {statusProjecao === 'atingido' ? (
                    <>
                      <div className="text-[8px] text-muted-foreground font-medium uppercase mb-0.5">Status</div>
                      <div className="flex items-center justify-center gap-1 px-1 py-0.5 rounded" style={{ backgroundColor: cores.bg }}>
                        <Trophy className="h-3 w-3" style={{ color: cores.texto }} />
                        <span className="text-[9px] font-bold" style={{ color: cores.texto }}>
                          Atingida!
                        </span>
                      </div>
                    </>
                  ) : statusProjecao !== 'fora-periodo' && projecaoValor > 0 ? (
                    <>
                      <div className="text-[8px] text-muted-foreground font-medium uppercase mb-0.5">Projeção</div>
                      <div className="text-sm font-bold" style={{ color: cores.texto }}>
                        {formatCurrency(projecaoValor)}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-[8px] text-muted-foreground font-medium uppercase mb-0.5">-</div>
                      <div className="text-sm font-bold text-muted-foreground">-</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Coluna 2: Cards de Estatísticas (80%) */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
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
