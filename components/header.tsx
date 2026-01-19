"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  LogOut, 
  User, 
  BarChart3,
  Settings,
  Users,
  Activity,
  Building2,
  Trophy,
  ChevronDown,
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
import type { LucideIcon } from "lucide-react"

interface HeaderProps {
  className?: string
  hideOnScroll?: boolean
}

interface SubMenuItem {
  title: string
  href: string
  icon?: LucideIcon
}

interface MenuItem {
  title: string
  icon: LucideIcon
  href: string
  hasSubmenu?: boolean
  submenu?: SubMenuItem[]
  openInNewWindow?: boolean
  requiredPermission?: string
}

const menuItems: MenuItem[] = [
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
      { title: "Motivos de Perda", href: "/analytics/motivos-perda" },
      { title: "Resultados / Meta", href: "/analytics/resultados-meta" },
      { title: "Receita Mensal", href: "/analytics/receita-mensal" },
      { title: "Acumulado Mês", href: "/analytics/acumulado-mes" }
    ]
  },
  {
    title: "Ranking",
    icon: Trophy,
    href: "/ranking",
    hasSubmenu: true,
    submenu: [
      { title: "Vendedor", href: "/ranking" },
      { title: "Unidades", href: "/ranking/unidades" }
    ]
  },
  {
    title: "Metas",
    icon: CircleDot,
    href: "/metas",
    hasSubmenu: true,
    submenu: [
      { title: "Configurações", href: "/metas/config" }
    ]
  },
  {
    title: "Unidades",
    icon: Building2,
    href: "/unidades",
    hasSubmenu: true,
    submenu: [
      { title: "Gestão Unidades", href: "/unidades" },
      { title: "Grupos de Unidades", href: "/unidades/grupos" }
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
      { title: "Meu Perfil", href: "/configuracoes/perfil" },
      { title: "Usuários do Sistema", href: "/configuracoes/usuarios-sistema" },
      { title: "Importação", href: "/configuracoes/importacao" },
      { title: "Geral", href: "/configuracoes" },
      { title: "API", href: "/configuracoes/api" }
    ]
  }
]

// Componente memoizado para item de submenu
const SubMenuLink = memo(function SubMenuLink({ 
  item, 
  isActive 
}: { 
  item: SubMenuItem
  isActive: boolean 
}) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white cursor-pointer",
        isActive && "bg-white/10"
      )}
    >
      {item.icon && <item.icon className="h-4 w-4 mr-2" />}
      {item.title}
    </Link>
  )
})

// Componente memoizado para item do menu desktop com submenu
const DesktopMenuItemWithSubmenu = memo(function DesktopMenuItemWithSubmenu({
  item,
  isSubmenuActive,
  isExactRoute
}: {
  item: MenuItem
  isSubmenuActive: boolean
  isExactRoute: (href: string) => boolean
}) {
  const Icon = item.icon
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-10 px-4 py-2 text-sm font-medium transition-colors text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none",
            isSubmenuActive && "bg-white/10"
          )}
        >
          <Icon className="h-4 w-4 mr-2" />
          {item.title}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1 bg-primary border-white/20">
        <div className="space-y-1">
          {item.submenu?.map((subItem) => (
            <SubMenuLink
              key={subItem.href}
              item={subItem}
              isActive={isExactRoute(subItem.href)}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
})

// Componente memoizado para item do menu desktop sem submenu
const DesktopMenuItemSimple = memo(function DesktopMenuItemSimple({
  item,
  isActive
}: {
  item: MenuItem
  isActive: boolean
}) {
  const Icon = item.icon
  
  return (
    <Link 
      href={item.href} 
      target={item.openInNewWindow ? "_blank" : undefined} 
      rel={item.openInNewWindow ? "noopener noreferrer" : undefined}
    >
      <Button
        variant="ghost"
        className={cn(
          "h-10 px-4 py-2 text-sm font-medium transition-colors text-white hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white focus:outline-none",
          isActive && "bg-white/10"
        )}
      >
        <Icon className="h-4 w-4 mr-2" />
        {item.title}
      </Button>
    </Link>
  )
})

// Componente memoizado para menu mobile
const MobileMenuItem = memo(function MobileMenuItem({
  item,
  isActiveRoute,
  isExactRoute,
  onNavigate
}: {
  item: MenuItem
  isActiveRoute: (href: string) => boolean
  isExactRoute: (href: string) => boolean
  onNavigate: () => void
}) {
  const Icon = item.icon

  if (item.hasSubmenu) {
    return (
      <div className="space-y-2">
        <div className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-white">
          <Icon className="h-4 w-4" />
          <span>{item.title}</span>
        </div>
        <div className="ml-6 space-y-1">
          {item.submenu?.map((subItem) => (
            <Link
              key={subItem.href}
              href={subItem.href}
              className={cn(
                "block px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white",
                isExactRoute(subItem.href) && "bg-white/10"
              )}
              onClick={onNavigate}
            >
              <span className="inline-flex items-center gap-2">
                {subItem.icon && <subItem.icon className="h-4 w-4" />}
                {subItem.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Link
      href={item.href}
      target={item.openInNewWindow ? "_blank" : undefined}
      rel={item.openInNewWindow ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center space-x-2 px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white",
        isActiveRoute(item.href) && "bg-white/10"
      )}
      onClick={onNavigate}
    >
      <Icon className="h-4 w-4" />
      <span>{item.title}</span>
    </Link>
  )
})

// Componente memoizado para o menu do usuário
const UserMenu = memo(function UserMenu({
  user,
  hasPermission,
  onLogout
}: {
  user: { nome?: string; email?: string; role?: string }
  hasPermission: (permission: string) => boolean
  onLogout: () => void
}) {
  const userInitial = useMemo(() => 
    (user.nome || 'U').charAt(0).toUpperCase(),
    [user.nome]
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-8 w-8 rounded-full text-white hover:bg-white/10"
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-black text-white">
              {userInitial}
            </AvatarFallback>
          </Avatar>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2 bg-primary border-white/20" align="end">
        <div className="flex items-center gap-3 p-3 mb-2">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-black text-white text-lg">
              {userInitial}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-1 leading-none min-w-0">
            <p className="font-medium text-sm text-white truncate">
              {user.nome}
            </p>
            {user.email && (
              <p className="text-xs text-white/70 truncate">
                {user.email}
              </p>
            )}
            <p className="text-xs text-white/70 capitalize">
              {user.role || 'Usuário'}
            </p>
          </div>
        </div>
        <div className="border-t border-white/20 my-2" />
        <div className="space-y-1">
          <Link 
            href="/configuracoes/perfil" 
            className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white cursor-pointer"
          >
            <User className="mr-2 h-4 w-4" />
            <span>Meu Perfil</span>
          </Link>
          {hasPermission('configuracoes') && (
            <Link 
              href="/configuracoes" 
              className="flex items-center px-3 py-2 text-sm rounded-md transition-colors text-white hover:bg-white/10 hover:text-white cursor-pointer"
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </Link>
          )}
          <button 
            onClick={onLogout} 
            className="flex items-center w-full px-3 py-2 text-sm rounded-md transition-colors text-red-300 hover:bg-red-500/20 hover:text-red-200 cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sair</span>
          </button>
        </div>
      </PopoverContent>
    </Popover>
  )
})

export function Header({ className, hideOnScroll = false }: HeaderProps) {
  const { user, loading, hasPermission } = useAuthSistema()
  const { config: empresaConfig } = useEmpresaConfig()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const pathname = usePathname()

  // Scroll handler otimizado com useCallback
  useEffect(() => {
    if (!hideOnScroll) {
      setIsVisible(true)
      return
    }

    let lastScrollY = 0
    let ticking = false

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY

          if (currentScrollY === 0) {
            setIsVisible(false)
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false)
          } else {
            setIsVisible(true)
          }

          lastScrollY = currentScrollY
          ticking = false
        })
        ticking = true
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    
    if (window.scrollY === 0) {
      setIsVisible(false)
    }

    return () => window.removeEventListener('scroll', handleScroll)
  }, [hideOnScroll])

  // Funções memoizadas para verificação de rotas
  const isActiveRoute = useCallback((href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }, [pathname])

  const isExactRoute = useCallback((href: string) => {
    return pathname === href
  }, [pathname])

  const isSubmenuActive = useCallback((item: MenuItem) => {
    if (!item.submenu) return false
    return item.submenu.some((subItem) => isExactRoute(subItem.href))
  }, [isExactRoute])

  // Função para verificar permissão de menu
  const shouldShowMenuItem = useCallback((item: MenuItem) => {
    if (!user) return false
    if (item.requiredPermission) {
      return hasPermission(item.requiredPermission)
    }
    return true
  }, [user, hasPermission])

  // Itens de menu filtrados (memoizado)
  const filteredMenuItems = useMemo(() => 
    menuItems.filter(shouldShowMenuItem),
    [shouldShowMenuItem]
  )

  // Handler de logout memoizado
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/sistema', { method: 'DELETE' })
    } finally {
      localStorage.removeItem('user')
      window.location.href = '/sistema/login'
    }
  }, [])

  // Handler para fechar menu mobile
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false)
  }, [])

  // Toggle do menu mobile
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev)
  }, [])

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
        <Link 
          href="/painel" 
          className="mr-4 flex items-center text-white hover:text-white/80"
        >
          <EmpresaLogo
            src={empresaConfig?.logotipo}
            alt={empresaConfig?.nome || 'Logo'}
            className="h-auto max-h-10 w-auto object-contain"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        {user && (
          <nav className="hidden md:flex flex-1 justify-center">
            <div className="flex items-center space-x-1">
              {filteredMenuItems.map((item) => (
                <div key={item.title}>
                  {item.hasSubmenu ? (
                    <DesktopMenuItemWithSubmenu
                      item={item}
                      isSubmenuActive={isSubmenuActive(item)}
                      isExactRoute={isExactRoute}
                    />
                  ) : (
                    <DesktopMenuItemSimple
                      item={item}
                      isActive={isActiveRoute(item.href)}
                    />
                  )}
                </div>
              ))}
            </div>
          </nav>
        )}

        {/* Right Side - User Menu */}
        <div className="flex items-center space-x-2 ml-auto">
          {user && (
            <UserMenu
              user={user}
              hasPermission={hasPermission}
              onLogout={handleLogout}
            />
          )}

          {/* Mobile Menu Toggle */}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden h-8 w-8 p-0 text-white hover:bg-white/10 hover:text-white"
              onClick={toggleMobileMenu}
              aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
            >
              {isMobileMenuOpen ? (
                <X className="h-4 w-4" />
              ) : (
                <Menu className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && user && (
        <div className="md:hidden border-t border-white/20 bg-primary">
          <div className="container py-4">
            <nav className="flex flex-col space-y-2">
              {filteredMenuItems.map((item) => (
                <MobileMenuItem
                  key={item.title}
                  item={item}
                  isActiveRoute={isActiveRoute}
                  isExactRoute={isExactRoute}
                  onNavigate={closeMobileMenu}
                />
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}
