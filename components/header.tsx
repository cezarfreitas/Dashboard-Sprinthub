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
  Sun,
  Moon,
  CircleDot,
  Menu,
  X
} from "lucide-react"
import { useAuthSistema } from "@/hooks/use-auth-sistema"
import { useTheme } from "@/hooks/use-theme"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface HeaderProps {
  className?: string
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
    href: "/analytics"
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
    href: "/unidades"
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
        title: "Usuários do Sistema",
        href: "/configuracoes/usuarios-sistema"
      },
      {
        title: "Geral",
        href: "/configuracoes"
      }
    ]
  }
]

export function Header({ className }: HeaderProps) {
  const { user, loading, hasPermission } = useAuthSistema()
  const { theme, toggleTheme, isLoading: themeLoading } = useTheme()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

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

  return (
    <header className={cn(
      "sticky top-0 z-50 w-full border-b border-gray-800 bg-black",
      className
    )}>
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <div className="mr-4 flex">
          <Link href="/" className="flex items-center space-x-2 text-white hover:text-gray-300">
            <Building2 className="h-6 w-6" />
            <span className="font-bold">{process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG'}</span>
          </Link>
        </div>

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
                          "h-10 px-4 py-2 text-sm font-medium transition-colors text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none",
                          isSubmenuActive(item) && "bg-white/10 text-white"
                        )}
                      >
                        <item.icon className="h-4 w-4 mr-2" />
                        {item.title}
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-1">
                      <div className="space-y-1">
                        {item.submenu?.map((subItem: any) => (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={cn(
                              "flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                              isExactRoute(subItem.href) && "bg-accent text-accent-foreground"
                            )}
                          >
                            {subItem.title}
                          </Link>
                        ))}
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Link href={item.href}>
                    <Button
                      variant="ghost"
                      className={cn(
                        "h-10 px-4 py-2 text-sm font-medium transition-colors text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none",
                        isActiveRoute(item.href) && "bg-white/10 text-white"
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

        {/* Right Side - User Menu & Theme Toggle */}
        <div className="flex items-center space-x-2 ml-auto">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            disabled={themeLoading}
            className="h-8 w-8 p-0 text-white hover:bg-white/10 hover:text-white"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Menu */}
          {user && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full text-white hover:bg-white/10 hover:text-white">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {(user.nome || user.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="end">
                <div className="flex items-center gap-3 p-3 mb-2">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                      {(user.nome || user.name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium text-sm">{user.nome || user.name}</p>
                    {user.email && (
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {user.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role || 'Usuário'}
                    </p>
                  </div>
                </div>
                <div className="border-t my-2"></div>
                <div className="space-y-1">
                  {hasPermission('configuracoes') && (
                    <Link href="/configuracoes" className="flex items-center px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer">
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configurações</span>
                    </Link>
                  )}
                  <button onClick={handleLogout} className="flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer text-red-600">
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
      {isMobileMenuOpen && user && (
        <div className="md:hidden border-t border-gray-800 bg-black">
          <div className="container py-4">
            <nav className="flex flex-col space-y-2">
              {menuItems.filter(shouldShowMenuItem).map((item) => (
                <div key={item.title}>
                  {item.hasSubmenu ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-400">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </div>
                      <div className="ml-6 space-y-1">
                        {item.submenu?.map((subItem: any) => (
                          <Link
                            key={subItem.title}
                            href={subItem.href}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white",
                              isExactRoute(subItem.href) && "bg-white/10 text-white"
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
                      className={cn(
                        "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white",
                        isActiveRoute(item.href) && "bg-white/10 text-white"
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
