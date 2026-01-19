"use client"

import { useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ArrowUpDown, ArrowUp, ArrowDown, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface Oportunidade {
  id: string
  title: string
  value: number
  createDate: string
  status: string
  vendedor_nome: string | null
  dias_aberta?: number | null
  coluna_nome?: string | null
  gain_date?: string | null
  lost_date?: string | null
  loss_reason?: string | null
}

interface TabelaOportunidadesModalProps {
  oportunidades: Oportunidade[]
}

type SortField = 'id' | 'title' | 'value' | 'createDate' | 'status' | 'dias_aberta'
type SortOrder = 'asc' | 'desc'

export function TabelaOportunidadesModal({ oportunidades }: TabelaOportunidadesModalProps) {
  const [busca, setBusca] = useState('')
  const [paginaAtual, setPaginaAtual] = useState(1)
  const [itensPorPagina, setItensPorPagina] = useState(10)
  const [sortField, setSortField] = useState<SortField>('createDate')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Filtrar por busca
  const oportunidadesFiltradas = useMemo(() => {
    if (!busca) return oportunidades

    const buscaLower = busca.toLowerCase()
    return oportunidades.filter(op => 
      op.id?.toLowerCase().includes(buscaLower) ||
      op.title?.toLowerCase().includes(buscaLower) ||
      op.vendedor_nome?.toLowerCase().includes(buscaLower) ||
      op.coluna_nome?.toLowerCase().includes(buscaLower)
    )
  }, [oportunidades, busca])

  // Ordenar
  const oportunidadesOrdenadas = useMemo(() => {
    const sorted = [...oportunidadesFiltradas]
    
    sorted.sort((a, b) => {
      let aVal: any = a[sortField]
      let bVal: any = b[sortField]

      // Tratar valores nulos
      if (aVal === null || aVal === undefined) return sortOrder === 'asc' ? 1 : -1
      if (bVal === null || bVal === undefined) return sortOrder === 'asc' ? -1 : 1

      // Converter datas para timestamp
      if (sortField === 'createDate') {
        aVal = new Date(aVal).getTime()
        bVal = new Date(bVal).getTime()
      }

      // Comparar
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
      return 0
    })

    return sorted
  }, [oportunidadesFiltradas, sortField, sortOrder])

  // Paginar
  const totalPaginas = Math.ceil(oportunidadesOrdenadas.length / itensPorPagina)
  const oportunidadesPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina
    const fim = inicio + itensPorPagina
    return oportunidadesOrdenadas.slice(inicio, fim)
  }, [oportunidadesOrdenadas, paginaAtual, itensPorPagina])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1" />
    return sortOrder === 'asc' 
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const traduzirStatus = (status: string) => {
    if (status === 'gain' || status === 'won') return 'Ganha'
    if (status === 'lost') return 'Perdida'
    return 'Aberta'
  }

  return (
    <div className="space-y-4">
      {/* Barra de busca e controles */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por ID, título, vendedor..."
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value)
              setPaginaAtual(1)
            }}
            className="pl-9"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {oportunidadesOrdenadas.length} resultado(s)
          </span>
          <Select
            value={itensPorPagina.toString()}
            onValueChange={(value) => {
              setItensPorPagina(parseInt(value))
              setPaginaAtual(1)
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 por pág</SelectItem>
              <SelectItem value="10">10 por pág</SelectItem>
              <SelectItem value="25">25 por pág</SelectItem>
              <SelectItem value="50">50 por pág</SelectItem>
              <SelectItem value="100">100 por pág</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => handleSort('id')}
                >
                  <div className="flex items-center">
                    ID {renderSortIcon('id')}
                  </div>
                </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('title')}
              >
                <div className="flex items-center">
                  Título {renderSortIcon('title')}
                </div>
              </TableHead>
              <TableHead 
                className="text-right cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center justify-end">
                  Valor {renderSortIcon('value')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('createDate')}
              >
                <div className="flex items-center">
                  Data Criação {renderSortIcon('createDate')}
                </div>
              </TableHead>
              <TableHead 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center">
                  Status {renderSortIcon('status')}
                </div>
              </TableHead>
              <TableHead>Vendedor</TableHead>
              <TableHead>Coluna</TableHead>
              <TableHead 
                className="text-center cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleSort('dias_aberta')}
              >
                <div className="flex items-center justify-center">
                  Dias Aberta {renderSortIcon('dias_aberta')}
                </div>
              </TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {oportunidadesPaginadas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma oportunidade encontrada
                </TableCell>
              </TableRow>
            ) : (
              oportunidadesPaginadas.map((oportunidade) => (
                <TableRow 
                  key={oportunidade.id}
                  className="hover:bg-muted/50 transition-colors"
                >
                  <TableCell className="font-mono text-xs">{oportunidade.id}</TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="truncate" title={oportunidade.title}>
                      {oportunidade.title || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(oportunidade.value)}
                  </TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {formatDate(oportunidade.createDate)}
                  </TableCell>
                  <TableCell>
                    <span className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap inline-block",
                      (oportunidade.status === 'gain' || oportunidade.status === 'won')
                        ? "bg-green-100 text-green-700"
                        : oportunidade.status === 'lost'
                        ? "bg-red-100 text-red-700"
                        : "bg-blue-100 text-blue-700"
                    )}>
                      {traduzirStatus(oportunidade.status)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {oportunidade.vendedor_nome || '-'}
                  </TableCell>
                  <TableCell className="max-w-[150px]">
                    <div className="truncate text-sm text-muted-foreground" title={oportunidade.coluna_nome || undefined}>
                      {oportunidade.coluna_nome || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-center text-sm">
                    {oportunidade.dias_aberta !== null && oportunidade.dias_aberta !== undefined
                      ? `${oportunidade.dias_aberta}d`
                      : '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => window.open(`/oportunidades/${oportunidade.id}`, '_blank')}
                      title="Abrir oportunidade"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        </div>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Página {paginaAtual} de {totalPaginas}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(1)}
              disabled={paginaAtual === 1}
            >
              Primeira
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(prev => Math.max(1, prev - 1))}
              disabled={paginaAtual === 1}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(prev => Math.min(totalPaginas, prev + 1))}
              disabled={paginaAtual === totalPaginas}
            >
              Próxima
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPaginaAtual(totalPaginas)}
              disabled={paginaAtual === totalPaginas}
            >
              Última
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
