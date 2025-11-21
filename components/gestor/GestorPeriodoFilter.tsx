import { memo, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { PeriodoFiltro } from "@/hooks/gestor/useGestorDashboard"

interface Funil {
  id: number
  funil_nome: string
}

interface GestorPeriodoFilterProps {
  periodoFiltro: PeriodoFiltro
  setPeriodoFiltro: (periodo: PeriodoFiltro) => void
  dataInicioPersonalizada: Date | undefined
  setDataInicioPersonalizada: (data: Date | undefined) => void
  dataFimPersonalizada: Date | undefined
  setDataFimPersonalizada: (data: Date | undefined) => void
  funilSelecionado?: string | null
  setFunilSelecionado?: (funilId: string | null) => void
}

export const GestorPeriodoFilter = memo(function GestorPeriodoFilter({
  periodoFiltro,
  setPeriodoFiltro,
  dataInicioPersonalizada,
  setDataInicioPersonalizada,
  dataFimPersonalizada,
  setDataFimPersonalizada,
  funilSelecionado,
  setFunilSelecionado
}: GestorPeriodoFilterProps) {
  const [popoverPersonalizadoOpen, setPopoverPersonalizadoOpen] = useState(false)
  const [funis, setFunis] = useState<Funil[]>([])
  
  const handleFunilChange = (value: string) => {
    const newValue = value === "todos" ? null : value
    if (setFunilSelecionado) {
      setFunilSelecionado(newValue)
    }
  }

  useEffect(() => {
    const fetchFunis = async () => {
      try {
        const response = await fetch('/api/funis')
        const data = await response.json()
        if (data.success && data.funis) {
          setFunis(data.funis)
        }
      } catch (err) {
        setFunis([])
      }
    }
    fetchFunis()
  }, [])

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-20 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-700">Período:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant={periodoFiltro === 'hoje' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('hoje')}
              className="h-7 text-xs px-2.5"
            >
              Hoje
            </Button>
            <Button
              variant={periodoFiltro === 'ontem' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('ontem')}
              className="h-7 text-xs px-2.5"
            >
              Ontem
            </Button>
            <Button
              variant={periodoFiltro === 'esta-semana' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('esta-semana')}
              className="h-7 text-xs px-2.5"
            >
              Esta Semana
            </Button>
            <Button
              variant={periodoFiltro === 'semana-passada' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('semana-passada')}
              className="h-7 text-xs px-2.5"
            >
              Semana Passada
            </Button>
            <Button
              variant={periodoFiltro === 'este-mes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('este-mes')}
              className="h-7 text-xs px-2.5"
            >
              Este Mês
            </Button>
            <Button
              variant={periodoFiltro === 'mes-passado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('mes-passado')}
              className="h-7 text-xs px-2.5"
            >
              Mês Passado
            </Button>
            <Popover open={popoverPersonalizadoOpen} onOpenChange={(open) => {
              setPopoverPersonalizadoOpen(open)
              if (open) {
                setPeriodoFiltro('personalizado')
              }
            }}>
              <PopoverTrigger asChild>
                <Button
                  variant={periodoFiltro === 'personalizado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setPeriodoFiltro('personalizado')
                    setPopoverPersonalizadoOpen(true)
                  }}
                  className="h-7 text-xs px-2.5"
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4" align="start">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Início:</label>
                    <Input
                      type="date"
                      value={dataInicioPersonalizada ? dataInicioPersonalizada.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number)
                          const date = new Date(year, month - 1, day, 0, 0, 0, 0)
                          setDataInicioPersonalizada(date)
                          if (dataFimPersonalizada && date > dataFimPersonalizada) {
                            setDataFimPersonalizada(undefined)
                          }
                        } else {
                          setDataInicioPersonalizada(undefined)
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data Fim:</label>
                    <Input
                      type="date"
                      value={dataFimPersonalizada ? dataFimPersonalizada.toISOString().split('T')[0] : ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          const [year, month, day] = e.target.value.split('-').map(Number)
                          const date = new Date(year, month - 1, day, 0, 0, 0, 0)
                          if (dataInicioPersonalizada && date < dataInicioPersonalizada) {
                            return
                          }
                          setDataFimPersonalizada(date)
                        } else {
                          setDataFimPersonalizada(undefined)
                        }
                      }}
                      min={dataInicioPersonalizada ? dataInicioPersonalizada.toISOString().split('T')[0] : undefined}
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setPopoverPersonalizadoOpen(false)
                      }}
                      variant="outline"
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => {
                        if (dataInicioPersonalizada && dataFimPersonalizada) {
                          setPeriodoFiltro('personalizado')
                          setPopoverPersonalizadoOpen(false)
                        }
                      }}
                      disabled={!dataInicioPersonalizada || !dataFimPersonalizada}
                      className="flex-1"
                    >
                      Aplicar
                    </Button>
                  </div>
                  {(!dataInicioPersonalizada || !dataFimPersonalizada) && (
                    <p className="text-xs text-gray-500 text-center">
                      Preencha ambas as datas para aplicar o filtro
                    </p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-700">Funil:</span>
            <Select
              value={funilSelecionado || "todos"}
              onValueChange={handleFunilChange}
            >
              <SelectTrigger className="h-7 text-xs w-[200px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="z-[100]" position="popper">
                <SelectItem value="todos">Todos</SelectItem>
                {funis.length > 0 && funis.map((funil) => (
                  <SelectItem key={funil.id} value={funil.id.toString()}>
                    {funil.funil_nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  )
})

