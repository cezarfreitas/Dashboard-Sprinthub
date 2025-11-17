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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center">
              <UserCircle className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">
                {gestorName} {gestorLastName}
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestor de {totalUnidades} {totalUnidades === 1 ? 'unidade' : 'unidades'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={onLogout} 
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
})


