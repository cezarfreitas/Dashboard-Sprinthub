import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { PeriodoFiltro } from "@/hooks/gestor/useGestorDashboard"

interface GestorPeriodoFilterProps {
  periodoFiltro: PeriodoFiltro
  setPeriodoFiltro: (periodo: PeriodoFiltro) => void
  dataInicioPersonalizada: Date | undefined
  setDataInicioPersonalizada: (data: Date | undefined) => void
  dataFimPersonalizada: Date | undefined
  setDataFimPersonalizada: (data: Date | undefined) => void
}

export const GestorPeriodoFilter = memo(function GestorPeriodoFilter({
  periodoFiltro,
  setPeriodoFiltro,
  dataInicioPersonalizada,
  setDataInicioPersonalizada,
  dataFimPersonalizada,
  setDataFimPersonalizada
}: GestorPeriodoFilterProps) {
  const [popoverPersonalizadoOpen, setPopoverPersonalizadoOpen] = useState(false)

  return (
    <div className="bg-white border-b">
      <div className="max-w-[1900px] mx-auto px-20 py-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
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
            <Popover open={popoverPersonalizadoOpen} onOpenChange={setPopoverPersonalizadoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={periodoFiltro === 'personalizado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodoFiltro('personalizado')}
                  className="h-7 text-xs px-2.5"
                >
                  <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Início:</label>
                    <Calendar
                      mode="single"
                      selected={dataInicioPersonalizada}
                      onSelect={(date) => {
                        setDataInicioPersonalizada(date)
                        if (date && dataFimPersonalizada && date > dataFimPersonalizada) {
                          setDataFimPersonalizada(undefined)
                        }
                      }}
                      className="rounded-md border"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Data Fim:</label>
                    <Calendar
                      mode="single"
                      selected={dataFimPersonalizada}
                      onSelect={(date) => {
                        if (date && dataInicioPersonalizada && date < dataInicioPersonalizada) {
                          return
                        }
                        setDataFimPersonalizada(date)
                      }}
                      disabled={(date) => dataInicioPersonalizada ? date < dataInicioPersonalizada : false}
                      className="rounded-md border"
                    />
                  </div>
                  <Button
                    onClick={() => {
                      if (dataInicioPersonalizada && dataFimPersonalizada) {
                        setPopoverPersonalizadoOpen(false)
                      }
                    }}
                    disabled={!dataInicioPersonalizada || !dataFimPersonalizada}
                    className="w-full"
                  >
                    Aplicar
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          </div>
        </div>
      </div>
    </div>
  )
})

