import { cn } from "@/lib/utils"
import { RefreshCw } from "lucide-react"

interface LoadingProps {
  className?: string
  size?: "sm" | "md" | "lg"
  text?: string
}

export function Loading({ className, size = "md", text }: LoadingProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-6 w-6", 
    lg: "h-8 w-8"
  }

  return (
    <div className={cn("flex items-center justify-center space-x-2", className)}>
      <div className="relative">
        <RefreshCw className={cn("animate-spin text-muted-foreground", sizeClasses[size])} />
        <RefreshCw className={cn("animate-spin text-primary absolute top-0 left-0", sizeClasses[size])} style={{ animationDelay: '0.1s' }} />
      </div>
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  )
}

export function LoadingCard({ title = "Carregando...", description }: { title?: string, description?: string }) {
  return (
    <div className="rounded-lg border bg-card p-6">
      <div className="text-center space-y-4">
        <Loading size="lg" />
        <div>
          <h3 className="font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}
