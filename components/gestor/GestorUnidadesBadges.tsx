import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Building2 } from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Unidade {
  id: number
  nome: string
  dpto_gestao: number | null
}

interface Funil {
  id: number
  funil_nome: string
}

interface GestorUnidadesBadgesProps {
  unidades: Unidade[]
  unidadeSelecionada: number | null
  onSelectUnidade: (id: number) => void
  funilSelecionado?: string | null
  setFunilSelecionado?: (funilId: string | null) => void
}

export function GestorUnidadesBadges({
  unidades,
  unidadeSelecionada,
  onSelectUnidade,
  funilSelecionado,
  setFunilSelecionado
}: GestorUnidadesBadgesProps) {
  const handleFunilChange = (value: string) => {
    if (!setFunilSelecionado) return
    const newValue = value === "todos" ? null : value
    setFunilSelecionado(newValue)
  }
  const [funis, setFunis] = useState<Funil[]>([])
  const [loadingFunis, setLoadingFunis] = useState(true)

  useEffect(() => {
    const fetchFunis = async () => {
      try {
        setLoadingFunis(true)
        const response = await fetch('/api/funis')
        const data = await response.json()
        if (data.success && data.funis && Array.isArray(data.funis)) {
          setFunis(data.funis)
        } else {
          console.warn('Funis não encontrados ou formato inválido:', data)
        }
      } catch (err) {
        setFunis([])
      } finally {
        setLoadingFunis(false)
      }
    }
    fetchFunis()
  }, [])

  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-[1900px] mx-auto px-20 py-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-gray-700">Unidades:</span>
            {unidades.map((unidade) => (
              <Badge 
                key={unidade.id}
                variant={unidade.id === unidadeSelecionada ? "default" : "outline"}
                className={`flex items-center gap-1 cursor-pointer transition-all text-xs h-6 px-2 ${
                  unidade.id === unidadeSelecionada 
                    ? "bg-purple-600 text-white border-purple-600" 
                    : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                }`}
                onClick={() => onSelectUnidade(unidade.id)}
              >
                <Building2 className="h-3 w-3" />
                {unidade.nome}
              </Badge>
            ))}
          </div>
          
          {setFunilSelecionado && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-gray-700 whitespace-nowrap">Funil:</span>
              {loadingFunis ? (
                <div className="h-7 w-[200px] bg-gray-100 rounded-md animate-pulse" />
              ) : (
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
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


