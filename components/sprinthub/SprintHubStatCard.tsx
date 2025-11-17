import { memo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'

interface SprintHubStatCardProps {
  icon: LucideIcon
  label: string
  value: number
  loading: boolean
  colorClass: string
}

export const SprintHubStatCard = memo(function SprintHubStatCard({
  icon: Icon,
  label,
  value,
  loading,
  colorClass
}: SprintHubStatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              {loading ? (
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold">{value}</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

