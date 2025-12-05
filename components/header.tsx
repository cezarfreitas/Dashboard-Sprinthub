"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  LogOut, 
  User, 
  BarChart3,
  Settings,
  Users,
  Activity,
  Building2,
  Trophy,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Menu,
  X
} from "lucide-react"
import { useAuthSistema } from "@/hooks/use-auth-sistema"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEmpresaConfig } from "@/hooks/use-empresa-config"
import { EmpresaLogo } from "@/components/empresa-logo"

interface HeaderProps {
  className?: string
  hideOnScroll?: boolean
}

const menuItems = [
  {
    title: "Dashboard",
    icon: Activity,
    href: "/"
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    hasSubmenu: true,
    submenu: [
      {
        title: "Motivos de Perda",
        href: "/analytics/motivos-perda"
      }
    ]
  },
  {
    title: "Ranking",
    icon: Trophy,
    href: "/ranking",
    hasSubmenu: true,
    submenu: [
      {
        title: "Vendedor",
        href: "/ranking"
      },
      {
        title: "Unidades",
        href: "/ranking/unidades"
      }
    ]
  },
  {
    title: "Metas",
    icon: CircleDot,
    href: "/metas",
    hasSubmenu: true,
    submenu: [
      {
        title: "Configurações",
        href: "/metas/config"
      }
    ]
  },
  {
    title: "Unidades",
    icon: Building2,
    href: "/unidades",
    hasSubmenu: true,
    submenu: [
      {
        title: "Gestão Unidades",
        href: "/unidades"
      },
      {
        title: "Grupos de Unidades",
        href: "/unidades/grupos"
      }
    ]
  },
  {
    title: "Vendedores",
    icon: Users,
    href: "/vendedores"
  },
      {
        title: "Configurações",
        icon: Settings,
        href: "/configuracoes",
        hasSubmenu: true,
        submenu: [
          {
            title: "Meu Perfil",
            href: "/configuracoes/perfil"
          },
          {
            title: "Usuários do Sistema",
            href: "/configuracoes/usuarios-sistema"
          },
          {
            title: "Geral",
            href: "/configuracoes"
          },
          {
            title: "API",
            href: "/configuracoes/api"
          }
        ]
      }
]

export function Header({ className, hideOnScroll = false }: HeaderProps) {
  const { user, loading, hasPermission } = useAuthSistema()
  const { config: empresaConfig } = useEmpresaConfig()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const pathname = usePathname()

  // Efeito para controlar visibilidade do header com scroll
  useEffect(() => {
    if (!hideOnScroll) {
      setIsVisible(true)
      return
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      // Se estiver no topo, esconder o header
      if (currentScrollY === 0) {
        setIsVisible(false)
        setIsScrolled(false)
      } else {
        setIsScrolled(true)
        // Se estiver rolando para baixo, esconder
        // Se estiver rolando para cima, mostrar
        if (currentScrollY > lastScrollY && currentScrollY > 100) {
          setIsVisible(false)
        } else {
          setIsVisible(true)
        }
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    // Inicialmente escondido se estiver no topo
    if (window.scrollY === 0) {
      setIsVisible(false)
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [hideOnScroll, lastScrollY])

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/sistema', { method: 'DELETE' })
      localStorage.removeItem('user')
      window.location.href = '/sistema/login'
    } catch (error) {
      console.error('Erro ao fazer logout:', error)
      localStorage.removeItem('user')
      window.location.href = '/sistema/login'
    }
  }

  // Função para verificar se um item do menu deve ser exibido baseado em permissões
  const shouldShowMenuItem = (item: any) => {
    // Se não há usuário autenticado, não mostrar nada
    if (!user) return false
    
    // Itens que precisam de permissão específica
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission)
    }
    
    // Por padrão, mostrar todos os itens para usuários autenticados
    return true
  }

  // Função para verificar se a rota está ativa
  const isActiveRoute = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  // Função específica para verificar rotas exatas (usado no submenu)
  const isExactRoute = (href: string) => {
    return pathname === href
  }

  // Função para verificar se um item com submenu está ativo
  const isSubmenuActive = (item: any) => {
    if (!item.submenu) return false
    return item.submenu.some((subItem: any) => isExactRoute(subItem.href))
  }

  if (loading) {
    return (
      <header className={cn(
        "sticky top-0 z-50 w-full border-b border-gray-800 bg-black",
        className
      )}>
        <div className="container flex h-14 items-center">
          <div className="flex-1 flex justify-center">
            <span className="text-sm text-gray-400">Carregando...</span>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-primary/20 bg-primary transition-transform duration-300 ease-in-out",
      hideOnScroll && !isVisible && "-translate-y-full",
      className
    )}>
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/painel" className="mr-4 flex items-center text-primary-foreground hover:text-primary-foreground/80">
          <EmpresaLogo
            src={empresaConfig?.logotipo}
            empresaNome={empresaConfig?.nome}
            className="h-auto max-h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-1">
              {menuItems.filter(shouldShowMenuItem).map((item) => (
              <div key={item.title}>
                {item.hasSubmenu ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        className={cn(
                          "h-10 px-4 py-2 text-sm font-medium transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus:bg-primary-foreground/10 focus:text-primary-foreground focus:outline-none",
                          isSubmenuActive(item) && "bg-primary-foreground/10 text-primary-foreground"
                        )}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.title}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1 bg-primary border-primary-foreground/20">
                      <div className="space-y-1">
                        {item.submenu?.map((subItem: any) => (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer",
                              isExactRoute(subItem.href) && "bg-primary-foreground/10 text-primary-foreground"
                            )}
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Link href={item.href} target={(item as any).openInNewWindow ? "_blank" : undefined} rel={(item as any).openInNewWindow ? "noopener noreferrer" : undefined}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-10 px-4 py-2 text-sm font-medium transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus:bg-primary-foreground/10 focus:text-primary-foreground focus:outline-none",
                        isActiveRoute(item.href) && "bg-primary-foreground/10 text-primary-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 mr-2" />
                      {item.title}
                    </Button>
                  </Link>
                )}
              </div>
              ))}
            </div>
          </nav>
        )}

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* User Menu */}
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-black text-white">
                      {(user.nome || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2 bg-primary border-primary-foreground/20" align="end">
                <div className="flex items-center gap-3 p-3 mb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-black text-white text-lg">
                      {(user.nome || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm text-primary-foreground">{user.nome}</p>
                    {user.email && (
                      <p className="text-xs text-primary-foreground/70 truncate max-w-[180px]">
                        {user.email}
                      </p>
                    )}
                    <p className="text-xs text-primary-foreground/70 capitalize">
                      {user.role || 'Usuário'}
                    </p>
                  </div>
                </div>
                <div className="border-t border-primary-foreground/20 my-2"></div>
                <div className="space-y-1">
                  <Link href="/configuracoes/perfil" className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    <span>Meu Perfil</span>
                  </Link>
                  {hasPermission('configuracoes') && (
                    <Link href="/configuracoes" className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors text-red-300 hover:bg-red-500/20 hover:text-red-200 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* Mobile Menu Toggle */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-8 w-8 p-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
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
      {isMobileMenuOpen && user && (
        <div className="md:hidden border-t border-primary-foreground/20 bg-primary">
          <div className="container py-4">
            <nav className="flex flex-col space-y-2">
              {menuItems.filter(shouldShowMenuItem).map((item) => (
                <div key={item.title}>
                  {item.hasSubmenu ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-primary-foreground">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      <div className="ml-6 space-y-1">
                        {item.submenu?.map((subItem: any) => (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                              isExactRoute(subItem.href) && "bg-primary-foreground/10 text-primary-foreground"
                            )}
                            onClick={() => setIsMobileMenuOpen(false)}
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      target={(item as any).openInNewWindow ? "_blank" : undefined}
                      rel={(item as any).openInNewWindow ? "noopener noreferrer" : undefined}
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground",
                        isActiveRoute(item.href) && "bg-primary-foreground/10 text-primary-foreground"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  )}
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
