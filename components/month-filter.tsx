"use client"

import { useState, useEffect } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Calendar, Users, Building2 } from "lucide-react"

interface Vendedor {
  id: number
  name: string
  lastName: string
}

interface Unidade {
  id: number
  nome: string
}

interface MonthFilterProps {
  mes: number
  ano: number
  vendedorId?: number | null
  unidadeId?: number | null
  onMesChange: (mes: number) => void
  onAnoChange: (ano: number) => void
  onVendedorChange?: (vendedorId: number | null) => void
  onUnidadeChange?: (unidadeId: number | null) => void
}

export default function MonthFilter({ 
  mes, 
  ano, 
  vendedorId, 
  unidadeId, 
  onMesChange, 
  onAnoChange,
  onVendedorChange,
  onUnidadeChange
}: MonthFilterProps) {
  const [vendedores, setVendedores] = useState<Vendedor[]>([])
  const [unidades, setUnidades] = useState<Unidade[]>([])
  const [loading, setLoading] = useState(false)

  const meses = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ]

  // Gerar anos (ano atual e últimos 2 anos)
  const anoAtual = new Date().getFullYear()
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2]

  // Buscar vendedores e unidades
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // Buscar vendedores do MySQL
        const vendedoresRes = await fetch('/api/vendedores/mysql')
        if (vendedoresRes.ok) {
          const vendedoresData = await vendedoresRes.json()
          if (vendedoresData.success) {
            setVendedores(vendedoresData.vendedores || [])
          }
        }

        // Buscar unidades
        const unidadesRes = await fetch('/api/unidades')
        if (unidadesRes.ok) {
          const unidadesData = await unidadesRes.json()
          if (unidadesData.success) {
            setUnidades(unidadesData.unidades || [])
          }
        }
      } catch (error) {
        console.error('Erro ao buscar filtros:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    <Card className="p-3">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Período */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Período:</span>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={mes.toString()} onValueChange={(value) => onMesChange(parseInt(value))}>
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Selecione o mês" />
            </SelectTrigger>
            <SelectContent>
              {meses.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ano.toString()} onValueChange={(value) => onAnoChange(parseInt(value))}>
            <SelectTrigger className="w-[90px] h-9">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {anos.map((a) => (
                <SelectItem key={a} value={a.toString()}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Separador */}
        <div className="h-6 w-px bg-border"></div>

        {/* Unidade */}
        {onUnidadeChange && (
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={unidadeId?.toString() || "all"} 
              onValueChange={(value) => onUnidadeChange(value === "all" ? null : parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue placeholder="Todas unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Unidades</SelectItem>
                {unidades.map((u) => (
                  <SelectItem key={u.id} value={u.id.toString()}>
                    {u.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Vendedor */}
        {onVendedorChange && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <Select 
              value={vendedorId?.toString() || "all"} 
              onValueChange={(value) => onVendedorChange(value === "all" ? null : parseInt(value))}
              disabled={loading}
            >
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Todos vendedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Vendedores</SelectItem>
                {vendedores.map((v) => (
                  <SelectItem key={v.id} value={v.id.toString()}>
                    {v.name} {v.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </Card>
  )
}

