import { memo } from 'react'
import { Users, Database, GitBranch, XCircle, Columns, Target } from 'lucide-react'
import { SprintHubStatCard } from './SprintHubStatCard'

interface Stats {
  vendedores: number
  unidades: number
  funis: number
  motivosPerda: number
  colunasFunil: number
  oportunidades: number
}

interface SprintHubStatsProps {
  stats: Stats | null
  loading: boolean
}

const STATS_CONFIG = [
  {
    key: 'vendedores' as const,
    icon: Users,
    label: 'Vendedores',
    colorClass: 'bg-blue-100 text-blue-600'
  },
  {
    key: 'unidades' as const,
    icon: Database,
    label: 'Unidades',
    colorClass: 'bg-green-100 text-green-600'
  },
  {
    key: 'funis' as const,
    icon: GitBranch,
    label: 'Funis',
    colorClass: 'bg-purple-100 text-purple-600'
  },
  {
    key: 'motivosPerda' as const,
    icon: XCircle,
    label: 'Motivos Perda',
    colorClass: 'bg-red-100 text-red-600'
  },
  {
    key: 'colunasFunil' as const,
    icon: Columns,
    label: 'Colunas Funil',
    colorClass: 'bg-orange-100 text-orange-600'
  },
  {
    key: 'oportunidades' as const,
    icon: Target,
    label: 'Oportunidades',
    colorClass: 'bg-cyan-100 text-cyan-600'
  }
] as const

export const SprintHubStats = memo(function SprintHubStats({ stats, loading }: SprintHubStatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {STATS_CONFIG.map((config) => (
        <SprintHubStatCard
          key={config.key}
          icon={config.icon}
          label={config.label}
          value={stats?.[config.key] || 0}
          loading={loading}
          colorClass={config.colorClass}
        />
      ))}
    </div>
  )
})

