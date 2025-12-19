"use client"

import { memo, useMemo } from "react"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import { Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface VendedorMeta {
  vendedor_id: number
  vendedor_nome: string
  receita: number
  meta: number
  conversao: number
  valor_faltante: number
}

interface UnidadeMetaCardProps {
  unidadeId: number
  unidadeNome: string
  valorAtual: number
  meta: number
  mes?: number
  ano?: number
  vendedores?: VendedorMeta[]
  posicao?: number
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

const formatPercent = (value: number): string => {
  return `${value.toFixed(1)}%`
}

const getPrimeiroNome = (nomeCompleto: string): string => {
  return nomeCompleto.split(' ')[0] || nomeCompleto
}

export const UnidadeMetaCard = memo(function UnidadeMetaCard({
  unidadeNome,
  valorAtual,
  meta,
  mes,
  ano,
  vendedores = [],
  posicao
}: UnidadeMetaCardProps) {
  const { percentualMeta, percentualReal, projecao, projecaoValor, corBarra, statusProjecao } = useMemo(() => {
    if (meta === 0) return { percentualMeta: 0, percentualReal: 0, projecao: 0, projecaoValor: 0, corBarra: 'blue', statusProjecao: 'sem-meta' }
    
    // Percentual real (pode ser > 100%)
    const percentualRealCalc = (valorAtual / meta) * 100
    // Percentual para exibição no velocímetro (limitado a 100%)
    const percentual = Math.min(100, percentualRealCalc)
    
    // Calcular projeção baseada no dia do mês
    const now = new Date()
    const targetMes = mes ?? now.getMonth() + 1
    const targetAno = ano ?? now.getFullYear()
    
    // Se for mês diferente do atual, não faz projeção
    if (targetMes !== now.getMonth() + 1 || targetAno !== now.getFullYear()) {
      // Determinar cor baseado no percentual real
      let cor: string
      let status: string
      
      if (percentualRealCalc >= 100) {
        cor = 'gold'
        status = 'atingido'
      } else if (percentualRealCalc >= 90) {
        cor = 'green'
        status = 'quase-la'
      } else if (percentualRealCalc >= 70) {
        cor = 'yellow'
        status = 'atencao'
      } else {
        cor = 'red'
        status = 'abaixo'
      }
      
      return {
        percentualMeta: percentual,
        percentualReal: percentualRealCalc,
        projecao: percentualRealCalc,
        projecaoValor: valorAtual,
        corBarra: cor,
        statusProjecao: status
      }
    }
    
    // Calcular dia atual e total de dias no mês
    const diaAtual = now.getDate()
    const ultimoDiaMes = new Date(targetAno, targetMes, 0).getDate()
    const diasDecorridos = diaAtual
    
    // Calcular projeção linear
    const projecaoVal = diasDecorridos > 0 ? (valorAtual / diasDecorridos) * ultimoDiaMes : 0
    const projecaoPercentual = (projecaoVal / meta) * 100
    
    // Determinar cor da barra baseado no percentual REAL (não na projeção)
    let cor: string
    let status: string
    
    if (percentualRealCalc >= 100) {
      cor = 'gold'
      status = 'atingido'
    } else if (percentualRealCalc >= 95) {
      // Muito perto de bater (falta menos de 5%)
      cor = 'green'
      status = 'quase-la'
    } else if (projecaoPercentual >= 100) {
      cor = 'green'
      status = 'no-caminho'
    } else if (projecaoPercentual >= 80) {
      cor = 'yellow'
      status = 'atencao'
    } else {
      cor = 'red'
      status = 'risco'
    }
    
    return {
      percentualMeta: percentual,
      percentualReal: percentualRealCalc,
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

  const anguloAtual = percentualParaAngulo(Math.min(percentualMeta, 100))
  const anguloProjecao = percentualParaAngulo(Math.min(projecao, 100))

  const statusLabel =
    statusProjecao === 'atingido'
      ? '🎉 Meta atingida!'
      : statusProjecao === 'quase-la'
      ? '🔥 Quase lá!'
      : statusProjecao === 'no-caminho'
      ? '✅ No caminho'
      : statusProjecao === 'atencao'
      ? '⚠️ Atenção'
      : statusProjecao === 'risco'
      ? '❌ Em risco'
      : statusProjecao === 'abaixo'
      ? '📉 Abaixo'
      : 'Sem meta'

  const isTop3 = posicao !== undefined && posicao <= 3

  // Determinar gradiente baseado no status
  const getStatusGradient = () => {
    switch (statusProjecao) {
      case 'atingido':
        return 'from-yellow-500 to-amber-600' // Dourado para meta batida
      case 'quase-la':
        return 'from-green-500 to-emerald-600' // Verde para quase lá
      case 'no-caminho':
        return 'from-teal-500 to-cyan-600' // Teal para no caminho
      case 'atencao':
        return 'from-orange-500 to-amber-600' // Laranja para atenção
      case 'risco':
      case 'abaixo':
        return 'from-red-500 to-rose-600' // Vermelho para risco
      default:
        return 'from-gray-500 to-slate-600'
    }
  }

  const headerGradient = getStatusGradient()

  return (
    <Card className={`relative h-full overflow-hidden border-0 shadow-lg`}>
      {/* Header com gradiente de cor baseado no STATUS */}
      <div className={`bg-gradient-to-r ${headerGradient} px-4 py-3`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
              {posicao && (
                <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-black ${isTop3 ? 'bg-yellow-400 text-black' : 'bg-white/20 text-white'}`}>
                  {posicao}
                </span>
              )}
              <span className="truncate uppercase tracking-wide" title={unidadeNome}>{unidadeNome}</span>
            </CardTitle>
          </div>

          <Badge
            className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5 bg-white/20 text-white border-white/30"
          >
            {statusLabel}
          </Badge>
        </div>
      </div>

      <CardContent className="px-4 py-3">
        <div className="space-y-3">
          {/* Velocímetro */}
          <div className="relative rounded-xl border bg-gradient-to-b from-background to-muted/20 p-2">
            <div className="flex items-center justify-center">
              <div className="w-full max-w-[280px]">
                <svg width="100%" height="135" viewBox="0 40 300 140" className="drop-shadow-sm">
                {/* Fundo do velocímetro */}
                <path
                  d={criarArco(100, startAngle, endAngle)}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="18"
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
                        className="text-[9px] font-semibold fill-gray-500"
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
                    strokeWidth="18"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                )}
                
                {/* Arco principal (alcançado) */}
                <path
                  d={criarArco(100, startAngle, anguloAtual)}
                  fill="none"
                  stroke={cores.primaria}
                  strokeWidth="18"
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
                  y="118"
                  textAnchor="middle"
                  className="text-2xl font-bold"
                  fill={percentualReal >= 100 ? "#ca8a04" : percentualReal >= 95 ? "#16a34a" : "#1e40af"}
                >
                  {percentualReal >= 100 ? Math.round(percentualReal) : Math.round(percentualMeta)}%
                </text>
                
                {/* Mensagem motivacional */}
                <text
                  x="150"
                  y="137"
                  textAnchor="middle"
                  className="text-[10px] font-medium"
                  fill="#6b7280"
                >
                  {percentualReal >= 100 ? '🎉 Meta batida!' : 
                   percentualReal >= 95 ? '🔥 Quase lá!' :
                   percentualReal >= 75 ? 'Continue assim!' :
                   percentualReal >= 50 ? 'Acelere!' :
                   'Vamos lá!'}
                </text>
                </svg>
              </div>
            </div>
          </div>

          {/* Informações da meta */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="space-y-1 rounded-lg border bg-muted/20 p-2">
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                Meta
              </div>
              <div className="font-semibold text-foreground">{formatCurrency(meta)}</div>
            </div>
            <div className="space-y-1 rounded-lg border bg-muted/20 p-2">
              <div className="text-xs text-muted-foreground">Alcançado</div>
              <div className="font-semibold text-foreground">{formatCurrency(valorAtual)}</div>
            </div>
            <div className="space-y-1 rounded-lg border bg-muted/20 p-2">
              <div className="text-xs text-muted-foreground">Falta</div>
              <div className="font-semibold text-foreground">{formatCurrency(Math.max(0, meta - valorAtual))}</div>
            </div>
            <div className="space-y-1 rounded-lg border bg-muted/20 p-2">
              <div className="text-xs text-muted-foreground">Projeção</div>
              <div className="font-semibold text-foreground">{formatCurrency(projecaoValor)}</div>
            </div>
          </div>

          {/* Tabela de Vendedores */}
          {vendedores.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Vendedores
                </div>
                <div className="text-[11px] text-muted-foreground tabular-nums">
                  {vendedores.length} com meta
                </div>
              </div>

              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="max-h-36 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                      <TableHead className="text-[11px] font-semibold h-8 px-2">Vendedor</TableHead>
                      <TableHead className="text-[11px] font-semibold h-8 px-2 text-right">Receita</TableHead>
                      <TableHead className="text-[11px] font-semibold h-8 px-2 text-right">Meta</TableHead>
                      <TableHead className="text-[11px] font-semibold h-8 px-2 text-center">Conversão</TableHead>
                      <TableHead className="text-[11px] font-semibold h-8 px-2 text-right">Faltante</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vendedores.map((vendedor) => {
                      const conversao = vendedor.meta > 0 ? (vendedor.receita / vendedor.meta) * 100 : 0
                      const faltante = Math.max(0, vendedor.meta - vendedor.receita)
                      
                      return (
                        <TableRow key={vendedor.vendedor_id} className="hover:bg-muted/50">
                          <TableCell className="text-xs py-2 px-2 font-medium">
                            <div className="truncate max-w-[120px]" title={vendedor.vendedor_nome}>
                              {getPrimeiroNome(vendedor.vendedor_nome)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 text-right tabular-nums font-medium">
                            {formatCurrency(vendedor.receita)}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 text-right tabular-nums">
                            {formatCurrency(vendedor.meta)}
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 text-center">
                            <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums ${
                              conversao >= 100 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : conversao >= 80
                                ? 'bg-green-100 text-green-700'
                                : conversao >= 50
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {formatPercent(conversao)}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs py-2 px-2 text-right tabular-nums">
                            {faltante > 0 ? (
                              <span className="text-muted-foreground">{formatCurrency(faltante)}</span>
                            ) : (
                              <span className="text-green-600 font-medium">Atingiu</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
})

