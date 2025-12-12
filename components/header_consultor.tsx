"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  User, 
  Building2,
  Menu,
  X,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEmpresaConfig } from "@/hooks/use-empresa-config"
import { EmpresaLogo } from "@/components/empresa-logo"

interface HeaderConsultorProps {
  className?: string
  hideOnScroll?: boolean
}

interface ConsultorData {
  id: number
  name: string
  lastName: string
  username: string
  email: string
  unidade_id: number | null
  unidade_nome: string | null
}

export function HeaderConsultor({ 
  className, 
  hideOnScroll = false
}: HeaderConsultorProps) {
  const { config: empresaConfig } = useEmpresaConfig()
  const [consultor, setConsultor] = useState<ConsultorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  // Carregar dados do consultor
  useEffect(() => {
    const loadConsultor = () => {
      try {
        const savedConsultor = localStorage.getItem('consultor')
        if (savedConsultor) {
          setConsultor(JSON.parse(savedConsultor))
        }
      } catch (error) {
        console.error('Erro ao carregar consultor:', error)
      } finally {
        setLoading(false)
      }
    }

    loadConsultor()
  }, [])

  // Efeito para controlar visibilidade do header com scroll
  useEffect(() => {
    if (!hideOnScroll) {
      setIsVisible(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY === 0) {
        setIsVisible(false)
        setIsScrolled(false)
      } else {
        setIsScrolled(true)
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false)
        } else {
          setIsVisible(true)
        }
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    if (window.scrollY === 0) {
      setIsVisible(false)
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [hideOnScroll, lastScrollY])

  const handleLogout = async () => {
    try {
      localStorage.removeItem('consultor')
      router.push('/consultor')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      localStorage.removeItem('consultor')
      router.push('/consultor')
    }
  }

  if (loading) {
    return (
      <header className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}>
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center">
          <div className="flex-1 flex justify-center">
            <span className="text-sm text-muted-foreground">Carregando...</span>
          </div>
        </div>
      </header>
    )
  }

  const consultorName = consultor ? `${consultor.name} ${consultor.lastName}`.trim() : 'Consultor'
  const consultorInitials = consultor 
    ? `${consultor.name?.charAt(0) || ''}${consultor.lastName?.charAt(0) || ''}`.toUpperCase() || 'C'
    : 'C'

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-blue-600/20 bg-blue-600 transition-transform duration-300 ease-in-out",
      hideOnScroll && !isVisible && "-translate-y-full",
      className
    )}>
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center">
        {/* Logo */}
        <Link href="/consultor/dashboard" className="mr-4 flex items-center text-white hover:text-white/80">
          <EmpresaLogo
            src={empresaConfig?.logotipo}
            empresaNome={empresaConfig?.nome}
            className="h-auto max-h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Nome do Vendedor */}
        {consultor && (
          <div className="hidden md:flex items-center gap-2 px-4 py-1.5 bg-blue-700/50 rounded-lg">
            <User className="h-4 w-4 text-white/80" />
            <span className="text-sm font-semibold text-white">
              {consultorName}
            </span>
          </div>
        )}

        {/* Espaço flexível */}
        <div className="flex-1"></div>

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* User Menu */}
          {consultor && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-800 text-white">
                      {consultorInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="flex items-center gap-3 p-3 mb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-blue-800 text-white text-lg">
                      {consultorInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{consultorName}</p>
                    {consultor.email && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {consultor.email}
                      </p>
                    )}
                  </div>
                </div>
                <div className="border-t my-2"></div>
                <div className="space-y-1">
                  <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer text-red-600">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Mobile Menu Toggle */}
          {consultor && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-8 w-8 p-0 text-white hover:bg-white/10 hover:text-white"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
              <span className="sr-only">Toggle menu</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && consultor && (
        <div className="md:hidden border-t border-blue-700/50 bg-blue-700 animate-in slide-in-from-top-2">
          <div className="max-w-[1900px] mx-auto px-4 py-3 space-y-2">
            {/* Info do vendedor no mobile */}
            <div className="flex items-center gap-3 p-3 bg-blue-800/50 rounded-lg">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-blue-900 text-white text-sm">
                  {consultorInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-semibold text-sm text-white">{consultorName}</p>
                {consultor.unidade_nome && (
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3 w-3 text-white/60" />
                    <p className="text-xs text-white/80">{consultor.unidade_nome}</p>
                  </div>
                )}
                {consultor.email && (
                  <p className="text-xs text-white/60 truncate mt-0.5">{consultor.email}</p>
                )}
              </div>
            </div>

            {/* Botão de Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center w-full gap-2 px-4 py-2.5 text-sm font-medium text-white bg-red-500/90 hover:bg-red-600 rounded-lg transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      )}

    </header>
  )
}

