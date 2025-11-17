import { memo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Calendar as CalendarIcon, FileDown } from "lucide-react"
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
  onExportar?: () => void
  exportando?: boolean
}

export const GestorPeriodoFilter = memo(function GestorPeriodoFilter({
  periodoFiltro,
  setPeriodoFiltro,
  dataInicioPersonalizada,
  setDataInicioPersonalizada,
  dataFimPersonalizada,
  setDataFimPersonalizada,
  onExportar,
  exportando = false
}: GestorPeriodoFilterProps) {
  const [popoverPersonalizadoOpen, setPopoverPersonalizadoOpen] = useState(false)

  return (
    <div className="bg-white border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-700">Período:</span>
            <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant={periodoFiltro === 'hoje' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('hoje')}
            >
              Hoje
            </Button>
            <Button
              variant={periodoFiltro === 'ontem' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('ontem')}
            >
              Ontem
            </Button>
            <Button
              variant={periodoFiltro === 'esta-semana' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('esta-semana')}
            >
              Esta Semana
            </Button>
            <Button
              variant={periodoFiltro === 'semana-passada' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('semana-passada')}
            >
              Semana Passada
            </Button>
            <Button
              variant={periodoFiltro === 'este-mes' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('este-mes')}
            >
              Este Mês
            </Button>
            <Button
              variant={periodoFiltro === 'mes-passado' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriodoFiltro('mes-passado')}
            >
              Mês Passado
            </Button>
            <Popover open={popoverPersonalizadoOpen} onOpenChange={setPopoverPersonalizadoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={periodoFiltro === 'personalizado' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setPeriodoFiltro('personalizado')}
                >
                  <CalendarIcon className="h-4 w-4 mr-2" />
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
          
          {onExportar && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportar}
              disabled={exportando}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              {exportando ? 'Exportando...' : 'Exportar Excel'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})

