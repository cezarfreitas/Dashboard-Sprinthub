"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  Menu,
  X,
  Users,
  UserCog,
  LayoutDashboard,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useEmpresaConfig } from "@/hooks/use-empresa-config"
import { EmpresaLogo } from "@/components/empresa-logo"

interface HeaderGestorProps {
  className?: string
  hideOnScroll?: boolean
  unidadeSelecionada?: number | null
  setUnidadeSelecionada?: (id: number) => void
}

interface GestorData {
  id: number
  name: string
  lastName: string
  email: string
  unidades: Array<{
    id: number
    nome: string
    dpto_gestao: number | null
  }>
  unidade_principal: {
    id: number
    nome: string
    dpto_gestao: number | null
  }
}

export function HeaderGestor({ 
  className, 
  hideOnScroll = false,
  unidadeSelecionada,
  setUnidadeSelecionada
}: HeaderGestorProps) {
  const { config: empresaConfig } = useEmpresaConfig()
  const [gestor, setGestor] = useState<GestorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const lastScrollYRef = useRef(0)
  const pathname = usePathname()
  const router = useRouter()

  // Carregar dados do gestor
  useEffect(() => {
    const loadGestor = () => {
      try {
        const savedGestor = localStorage.getItem('gestor')
        if (savedGestor) {
          setGestor(JSON.parse(savedGestor))
        }
      } catch (error) {
        // Silencioso: manter o header funcionando mesmo se localStorage falhar
      } finally {
        setLoading(false)
      }
    }

    loadGestor()
  }, [])

  // Fechar menu mobile ao trocar de rota
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Efeito para controlar visibilidade do header com scroll
  useEffect(() => {
    if (!hideOnScroll) {
      setIsVisible(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const lastScrollY = lastScrollYRef.current

      // No topo: sempre visível
      if (currentScrollY <= 0) {
        setIsVisible(true)
        lastScrollYRef.current = 0
        return
      }

      const scrollingDown = currentScrollY > lastScrollY
      if (scrollingDown && currentScrollY > 80) {
        setIsVisible(false)
      } else {
        setIsVisible(true)
      }

      lastScrollYRef.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // Estado inicial
    handleScroll()

    return () => window.removeEventListener('scroll', handleScroll)
  }, [hideOnScroll])

  const handleLogout = async () => {
    try {
      localStorage.removeItem('gestor')
      router.push('/gestor')
    } catch (error) {
      // Silencioso: forçar logout mesmo com erro
      localStorage.removeItem('gestor')
      router.push('/gestor')
    }
  }

  if (loading) {
    return (
      <header className={cn(
        "sticky top-0 z-50 w-full border-b border-primary/20 bg-primary",
        className
      )}>
        <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center">
          <div className="flex-1 flex justify-center">
            <span className="text-sm text-primary-foreground/80">Carregando...</span>
          </div>
        </div>
      </header>
    )
  }

  const gestorName = gestor ? `${gestor.name} ${gestor.lastName}`.trim() : 'Gestor'
  const gestorInitials = gestor 
    ? `${gestor.name?.charAt(0) || ''}${gestor.lastName?.charAt(0) || ''}`.toUpperCase() || 'G'
    : 'G'

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-primary/20 bg-primary transition-transform duration-300 ease-in-out",
      hideOnScroll && !isVisible && "-translate-y-full",
      className
    )}>
      <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 flex h-14 items-center gap-3">
        {/* Logo */}
        <Link href="/gestor/dashboard" className="flex items-center gap-2 text-primary-foreground hover:text-primary-foreground/90">
          <EmpresaLogo
            src={empresaConfig?.logotipo}
            empresaNome={empresaConfig?.nome}
            className="h-auto max-h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Menu de Navegação */}
        {gestor && (
          <div className="flex items-center gap-2 min-w-0">
            {gestor.unidades.length > 1 && unidadeSelecionada !== undefined && setUnidadeSelecionada && (
              <div className="hidden md:flex">
                <Select
                  value={unidadeSelecionada?.toString() || ''}
                  onValueChange={(value) => setUnidadeSelecionada(parseInt(value))}
                >
                  <SelectTrigger className="h-9 w-[240px] bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 focus:ring-2 focus:ring-primary-foreground/30">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {gestor.unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id.toString()}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/gestor/dashboard">
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 px-3 text-sm font-medium transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30",
                    pathname === '/gestor/dashboard' && "bg-primary-foreground/10"
                  )}
                  aria-current={pathname === '/gestor/dashboard' ? 'page' : undefined}
                >
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Link href="/gestor/fila">
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 px-3 text-sm font-medium transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30",
                    pathname === '/gestor/fila' && "bg-primary-foreground/10"
                  )}
                  aria-current={pathname === '/gestor/fila' ? 'page' : undefined}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Fila
                </Button>
              </Link>
              <Link href="/gestor/consultores">
                <Button
                  variant="ghost"
                  className={cn(
                    "h-9 px-3 text-sm font-medium transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30",
                    pathname === '/gestor/consultores' && "bg-primary-foreground/10"
                  )}
                  aria-current={pathname === '/gestor/consultores' ? 'page' : undefined}
                >
                  <UserCog className="h-4 w-4 mr-2" />
                  Consultores
                </Button>
              </Link>
            </nav>
          </div>
        )}

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* User Menu */}
          {gestor && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary-foreground/15 text-white">
                      {gestorInitials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="flex items-center gap-3 p-3 mb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {gestorInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{gestorName}</p>
                    {gestor.email && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {gestor.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Gestor de {gestor.unidades.length} {gestor.unidades.length === 1 ? 'unidade' : 'unidades'}
                    </p>
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
          {gestor && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-9 w-9 p-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-foreground/30"
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
      {isMobileMenuOpen && gestor && (
        <div className="md:hidden border-t border-primary-foreground/20 bg-primary">
          <div className="max-w-[1900px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {/* Unidade Selector Mobile */}
            {gestor.unidades.length > 1 && unidadeSelecionada !== undefined && setUnidadeSelecionada && (
              <div className="mb-4 px-3">
                <Select
                  value={unidadeSelecionada?.toString() || ''}
                  onValueChange={(value) => setUnidadeSelecionada(parseInt(value))}
                >
                  <SelectTrigger className="w-full bg-primary-foreground/5 border-primary-foreground/20 text-primary-foreground">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent className="z-[100]">
                    {gestor.unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id.toString()}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <nav className="flex flex-col space-y-2">
              <Link
                href="/gestor/dashboard"
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  pathname === '/gestor/dashboard' && "bg-primary-foreground/10 text-primary-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <LayoutDashboard className="h-4 w-4" />
                <span>Dashboard</span>
              </Link>
              <Link
                href="/gestor/fila"
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  pathname === '/gestor/fila' && "bg-primary-foreground/10 text-primary-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="h-4 w-4" />
                <span>Fila de Atendimento</span>
              </Link>
              <Link
                href="/gestor/consultores"
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                  pathname === '/gestor/consultores' && "bg-primary-foreground/10 text-primary-foreground"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <UserCog className="h-4 w-4" />
                <span>Consultores</span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

