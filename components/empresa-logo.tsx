"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface EmpresaLogoProps {
  src?: string | null
  alt?: string
  className?: string
  width?: number
  height?: number
  priority?: boolean
}

export function EmpresaLogo({
  src,
  alt = "Logo",
  className,
  width = 0,
  height = 0,
  priority = true
}: EmpresaLogoProps) {
  if (!src) return null

  // Concatenar variável de ambiente + valor do banco
  const baseUrl = process.env.NEXT_PUBLIC_APP_LIVE || ''
  const logoUrl = `${baseUrl}${src}`

  return (
    <Image
      src={logoUrl}
      alt={alt}
      width={width}
      height={height}
      className={cn(className)}
      priority={priority}
      unoptimized
    />
  )
}
