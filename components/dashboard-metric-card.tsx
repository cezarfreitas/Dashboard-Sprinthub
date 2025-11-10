"use client"

import { ReactNode } from "react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon, ArrowDownRight, ArrowUpRight } from "lucide-react"

interface Highlight {
  label: string
  value: ReactNode
  emphasize?: boolean
}

interface Trend {
  value: string
  direction: "up" | "down"
}

interface DashboardMetricCardProps {
  title: string
  icon: LucideIcon
  iconColorClass: string
  value: ReactNode
  subtitle: string
  highlights: Highlight[]
  trend?: Trend
  className?: string
  variant?: "default" | "colored"
}

export function DashboardMetricCard({
  title,
  icon: Icon,
  iconColorClass,
  value,
  subtitle,
  highlights,
  trend,
  className,
  variant = "default"
}: DashboardMetricCardProps) {
  // Extrair a cor do background baseado no iconColorClass
  const getBgColorClass = (colorClass: string) => {
    if (colorClass.includes('blue')) return 'bg-blue-50'
    if (colorClass.includes('emerald') || colorClass.includes('green')) return 'bg-emerald-50'
    if (colorClass.includes('red')) return 'bg-red-50'
    if (colorClass.includes('amber') || colorClass.includes('yellow')) return 'bg-amber-50'
    return 'bg-slate-50'
  }

  // Obter gradiente para variant colored
  const getGradientClass = (colorClass: string) => {
    if (colorClass.includes('blue')) return 'bg-gradient-to-br from-blue-500 to-blue-600'
    if (colorClass.includes('emerald') || colorClass.includes('green')) return 'bg-gradient-to-br from-green-500 to-green-600'
    if (colorClass.includes('red')) return 'bg-gradient-to-br from-red-500 to-red-600'
    if (colorClass.includes('amber') || colorClass.includes('yellow')) return 'bg-gradient-to-br from-orange-500 to-orange-600'
    return 'bg-gradient-to-br from-slate-500 to-slate-600'
  }

  // Variant colorida
  if (variant === "colored") {
    const TrendIcon = trend?.direction === "down" ? ArrowDownRight : ArrowUpRight

    return (
      <Card
        className={cn(
          "border-0 transition-all hover:shadow-lg rounded-[10px] text-white",
          getGradientClass(iconColorClass),
          className
        )}
      >
        <div className="flex h-full flex-col p-4">
          {/* Header - título simplificado */}
          <h3 className="mb-2 text-[12px] font-bold uppercase leading-4 tracking-[0.3px] text-white/90">
            {title}
          </h3>

          {/* Valor principal */}
          <div className="mb-1">
            <p className="text-[30px] font-bold leading-[30px] text-white">
              {value}
            </p>
          </div>

          {/* Trend inline (variação) */}
          {trend && (
            <div className="mb-3 flex items-center gap-1 text-white/90">
              <TrendIcon className="h-4 w-4 text-white" />
              <span className="text-xs">{trend.value} este mês</span>
            </div>
          )}

          {/* Subtítulo */}
          <p className="mb-3 text-[11px] leading-[13.75px] text-white/90">
            {subtitle}
          </p>

          {/* Highlights */}
          {highlights.length > 0 && (
            <div className="mt-auto space-y-1.5 border-t border-white/20 pt-3 text-white/90">
              {highlights.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  className="flex items-center justify-between"
                >
                  <span className="text-[11px] leading-[13.75px] text-white/85">
                    {item.label}
                  </span>
                  <span className="text-[12px] font-bold leading-4 text-white">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Variant default
  return (
    <Card
      className={cn(
        "border border-gray-200 bg-white transition-all hover:shadow-md rounded-[10px]",
        className
      )}
    >
      <div className="flex h-full flex-col p-4">
        {/* Header com ícone e título */}
        <div className="mb-4 flex items-center gap-2">
          <div className={cn("flex h-8 w-8 items-center justify-center rounded-[10px]", getBgColorClass(iconColorClass))}>
            <Icon className={cn("h-4 w-4", iconColorClass)} />
          </div>
          <h3 className="text-[12px] font-bold uppercase leading-4 tracking-[0.3px] text-[#364153]">
            {title}
          </h3>
        </div>

        {/* Valor principal */}
        <div className="mb-1">
          <p className="text-[30px] font-bold leading-[30px] text-[#101828]">
            {value}
          </p>
        </div>

        {/* Subtítulo */}
        <p className="mb-3 text-[11px] leading-[13.75px] text-[#6a7282]">{subtitle}</p>

        {/* Trend (variação) */}
        {trend && (
          <div className="mb-3 flex items-center gap-1.5">
            <span
              className={cn(
                "text-[12px] font-bold leading-4",
                trend.direction === "down" ? "text-[#fb2c36]" : "text-emerald-600"
              )}
            >
              {trend.direction === "up" ? "↗ " : "↘ "}
              {trend.value}
            </span>
            <span className="text-[10px] leading-[15px] text-[#6a7282]">
              Mesmo período mês anterior:
            </span>
          </div>
        )}

        {/* Highlights */}
        <div className="mt-auto space-y-1.5 border-t border-gray-100 pt-3">
          {highlights.map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center justify-between">
              <span className="text-[11px] leading-[13.75px] text-[#4a5565]">{item.label}</span>
              <span className="text-[12px] font-bold leading-4 text-[#101828]">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  )
}

