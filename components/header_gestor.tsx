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
  Users,
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
  const [gestor, setGestor] = useState<GestorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
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
        console.error('Erro ao carregar gestor:', error)
      } finally {
        setLoading(false)
      }
    }

    loadGestor()
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
      localStorage.removeItem('gestor')
      router.push('/gestor')
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      localStorage.removeItem('gestor')
      router.push('/gestor')
    }
  }

  if (loading) {
    return (
      <header className={cn(
        "sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}>
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex">
            <Building2 className="h-6 w-6 mr-2" />
            <span className="font-bold">{process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG'}</span>
          </div>
          <div className="flex-1 flex justify-center">
            <span className="text-sm text-muted-foreground">Carregando...</span>
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
      "sticky top-0 z-50 w-full border-b border-gray-800 bg-black transition-transform duration-300 ease-in-out",
      hideOnScroll && !isVisible && "-translate-y-full",
      className
    )}>
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/gestor/dashboard" className="flex items-center space-x-2 text-white hover:text-gray-300">
            <Building2 className="h-6 w-6" />
            <span className="font-bold">{process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG'}</span>
          </Link>
        </div>

        {/* Unidade Selector e Fila de Atendimento */}
        {gestor && (
          <div className="flex items-center space-x-2 mr-4">
            {gestor.unidades.length > 1 && unidadeSelecionada !== undefined && setUnidadeSelecionada && (
              <div className="hidden md:flex">
                <Select
                  value={unidadeSelecionada?.toString() || ''}
                  onValueChange={(value) => setUnidadeSelecionada(parseInt(value))}
                >
                  <SelectTrigger className="h-8 w-[200px] bg-white/5 border-white/20 text-white hover:bg-white/10">
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
            <Link href="/gestor/fila" className="hidden md:block">
              <Button
                variant="ghost"
                className={cn(
                  "h-10 px-4 py-2 text-sm font-medium transition-colors text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none",
                  pathname === '/gestor/fila' && "bg-white/10 text-white"
                )}
              >
                <Users className="h-4 w-4 mr-2" />
                Fila de Atendimento
              </Button>
            </Link>
          </div>
        )}

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* User Menu */}
          {gestor && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
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
      {isMobileMenuOpen && gestor && (
        <div className="md:hidden border-t border-gray-800 bg-black">
          <div className="container py-4">
            {/* Unidade Selector Mobile */}
            {gestor.unidades.length > 1 && unidadeSelecionada !== undefined && setUnidadeSelecionada && (
              <div className="mb-4 px-3">
                <Select
                  value={unidadeSelecionada?.toString() || ''}
                  onValueChange={(value) => setUnidadeSelecionada(parseInt(value))}
                >
                  <SelectTrigger className="w-full bg-white/5 border-white/20 text-white">
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
                href="/gestor/fila"
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white",
                  pathname === '/gestor/fila' && "bg-white/10 text-white"
                )}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Users className="h-4 w-4" />
                <span>Fila de Atendimento</span>
              </Link>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}

