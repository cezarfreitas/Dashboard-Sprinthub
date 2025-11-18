import { memo } from "react"
import { Badge } from "@/components/ui/badge"
import { Building2 } from "lucide-react"

interface Unidade {
  id: number
  nome: string
  dpto_gestao: number | null
}

interface GestorUnidadesBadgesProps {
  unidades: Unidade[]
  unidadeSelecionada: number | null
  onSelectUnidade: (id: number) => void
}

export const GestorUnidadesBadges = memo(function GestorUnidadesBadges({
  unidades,
  unidadeSelecionada,
  onSelectUnidade
}: GestorUnidadesBadgesProps) {
  return (
    <div className="bg-white border-b shadow-sm">
      <div className="max-w-[1900px] mx-auto px-20 py-2">
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
      </div>
    </div>
  )
})


