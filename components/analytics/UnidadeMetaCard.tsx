"use client"

import { memo, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Target } from "lucide-react"
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
  unidadeId,
  unidadeNome,
  valorAtual,
  meta,
  mes,
  ano,
  vendedores = []
}: UnidadeMetaCardProps) {
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
      cor = 'gold'
      status = 'atingido'
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
      ? 'Meta atingida'
      : statusProjecao === 'no-caminho'
      ? 'No caminho'
      : statusProjecao === 'atencao'
      ? 'Atenção'
      : statusProjecao === 'risco'
      ? 'Em risco'
      : statusProjecao === 'fora-periodo'
      ? 'Fora do período'
      : 'Sem meta'

  return (
    <Card className="relative h-full overflow-hidden">
      {/* Acento de cor do status */}
      <div className="h-1 w-full" style={{ backgroundColor: cores.primaria }} />

      <CardHeader className="px-4 py-3 bg-muted/10 border-b">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="truncate" title={unidadeNome}>{unidadeNome}</span>
            </CardTitle>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              Unidade #{unidadeId}
            </div>
          </div>

          <Badge
            variant="secondary"
            className="shrink-0 text-[11px] font-semibold rounded-full px-2 py-0.5"
            style={{
              backgroundColor: `${cores.bg}`,
              color: `${cores.texto}`,
              border: `1px solid rgba(0,0,0,0.06)`,
            }}
          >
            {statusLabel}
          </Badge>
        </div>
      </CardHeader>

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
                  fill="#1e40af"
                >
                  {Math.round(percentualMeta)}%
                </text>
                
                {/* Mensagem motivacional */}
                <text
                  x="150"
                  y="137"
                  textAnchor="middle"
                  className="text-[10px] font-medium"
                  fill="#6b7280"
                >
                  {percentualMeta >= 100 ? 'Meta atingida' : 
                   percentualMeta >= 75 ? 'Quase lá' :
                   percentualMeta >= 50 ? 'Continue assim' :
                   percentualMeta >= 25 ? 'Acelere' :
                   'Vamos lá'}
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

