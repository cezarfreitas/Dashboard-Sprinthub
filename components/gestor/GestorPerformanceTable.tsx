import { memo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { VendedorStats } from "@/hooks/gestor/useGestorDashboard"

interface GestorPerformanceTableProps {
  vendedores: VendedorStats[]
  onVerOportunidades: (vendedor: VendedorStats) => void
}

export const GestorPerformanceTable = memo(function GestorPerformanceTable({
  vendedores,
  onVerOportunidades
}: GestorPerformanceTableProps) {
  const formatCurrency = useCallback((value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }, [])

  if (!vendedores || vendedores.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Performance da Equipe</CardTitle>
      </CardHeader>
      <CardContent className="pt-1">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Vendedor</th>
                <th className="text-center py-3 px-2">Criadas</th>
                <th className="text-center py-3 px-2">Ganhas</th>
                <th className="text-right py-3 px-2">Valor Ganho</th>
                <th className="text-center py-3 px-2">Perdidas</th>
                <th className="text-center py-3 px-2">Abertas</th>
                <th className="text-right py-3 px-2">Meta</th>
                <th className="text-center py-3 px-2">% Meta</th>
                <th className="text-center py-3 px-2">Ações</th>
              </tr>
            </thead>
            <tbody>
              {vendedores.map((vendedor) => {
                const percentMeta = vendedor.meta > 0 
                  ? (vendedor.valor_ganho / vendedor.meta) * 100 
                  : 0
                
                return (
                  <tr key={vendedor.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium">
                      {vendedor.name} {vendedor.lastName}
                    </td>
                    <td className="text-center py-3 px-2">
                      {vendedor.oportunidades_criadas}
                    </td>
                    <td className="text-center py-3 px-2 text-emerald-600 font-semibold">
                      {vendedor.oportunidades_ganhas}
                    </td>
                    <td className="text-right py-3 px-2 text-emerald-600">
                      {formatCurrency(vendedor.valor_ganho)}
                    </td>
                    <td className="text-center py-3 px-2 text-red-600">
                      {vendedor.oportunidades_perdidas}
                    </td>
                    <td className="text-center py-3 px-2 text-yellow-600">
                      {vendedor.oportunidades_abertas}
                    </td>
                    <td className="text-right py-3 px-2">
                      {vendedor.meta > 0 ? formatCurrency(vendedor.meta) : '-'}
                    </td>
                    <td className="text-center py-3 px-2">
                      {vendedor.meta > 0 ? (
                        <Badge 
                          variant={percentMeta >= 100 ? "default" : "outline"}
                          className={
                            percentMeta >= 100 
                              ? "bg-emerald-600" 
                              : percentMeta >= 75 
                              ? "bg-yellow-500 text-white border-yellow-500" 
                              : "text-gray-600"
                          }
                        >
                          {percentMeta.toFixed(0)}%
                        </Badge>
                      ) : '-'}
                    </td>
                    <td className="text-center py-3 px-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onVerOportunidades(vendedor)}
                        className="h-8 w-8 p-0 hover:bg-purple-50 hover:text-purple-600"
                        title="Ver oportunidades"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
})


