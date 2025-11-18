import { memo } from "react"
import { Button } from "@/components/ui/button"
import { UserCircle, LogOut } from "lucide-react"

interface GestorHeaderProps {
  gestorName: string
  gestorLastName: string
  totalUnidades: number
  onLogout: () => void
}

export const GestorHeader = memo(function GestorHeader({
  gestorName,
  gestorLastName,
  totalUnidades,
  onLogout
}: GestorHeaderProps) {
  return (
    <div className="bg-white border-b">
      <div className="max-w-[1900px] mx-auto px-20">
        <div className="flex justify-between items-center py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <UserCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-semibold leading-tight">
                {gestorName} {gestorLastName}
              </h1>
              <p className="text-xs text-muted-foreground">
                Gestor de {totalUnidades} {totalUnidades === 1 ? 'unidade' : 'unidades'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={onLogout} 
              className="flex items-center gap-1.5 h-8"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})


