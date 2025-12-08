"use client"

import { useState } from "react"
import Image from "next/image"
import { Building2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmpresaLogoProps {
  src?: string | null
  alt?: string
  empresaNome?: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
  showFallbackIcon?: boolean
}

export function EmpresaLogo({
  src,
  alt,
  empresaNome,
  className,
  width = 0,
  height = 0,
  priority = false,
  showFallbackIcon = true
}: EmpresaLogoProps) {
  const [imageError, setImageError] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  // Se não tem src ou teve erro, mostrar fallback
  const shouldShowFallback = !src || imageError

  if (shouldShowFallback) {
    // Fallback: mostrar nome da empresa (e ícone se habilitado)
    const fallbackText = empresaNome || 'Grupo Inteli'
    
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {showFallbackIcon && (
          <Building2 className="h-6 w-6 text-primary flex-shrink-0" />
        )}
        <span className="font-semibold text-lg truncate">
          {fallbackText}
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Fallback enquanto carrega - skeleton suave */}
      {!imageLoaded && (
        <div className={cn("flex items-center gap-2", className)}>
          {showFallbackIcon && (
            <Building2 className="h-6 w-6 text-primary flex-shrink-0 animate-pulse" />
          )}
          <span className="font-semibold text-lg truncate animate-pulse">
            {empresaNome || 'Grupo Inteli'}
          </span>
        </div>
      )}
      
      {/* Imagem */}
      <Image
        src={src}
        alt={alt || empresaNome || 'Logo'}
        width={width}
        height={height}
        className={cn(
          className,
          !imageLoaded && "hidden"
        )}
        priority={priority}
        unoptimized
        onError={() => {
          setImageError(true)
        }}
        onLoad={() => {
          setImageLoaded(true)
        }}
      />
    </>
  )
}

