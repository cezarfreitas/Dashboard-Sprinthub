"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  Home, 
  LogOut, 
  User, 
  ChevronLeft, 
  ChevronRight,
  BarChart3,
  Settings,
  Users,
  Activity,
  Building2,
  Trophy,
  ChevronDown,
  ChevronUp,
  Clock,
  Sun,
  Moon,
  CircleDot,
  LayoutDashboard
} from "lucide-react"
import { useAuth } from "@/hooks/use-auth"
import { useTheme } from "@/hooks/use-theme"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface SidebarProps {
  className?: string
}

const menuItems = [
  {
    title: "Dashboard",
    icon: Activity,
    href: "/"
  },
  {
    title: "Painel",
    icon: LayoutDashboard,
    href: "/painel",
    openInNewWindow: true
  },
  {
    title: "Analytics",
    icon: BarChart3,
    href: "/analytics",
    hasSubmenu: true,
    submenu: [
      {
        title: "Análise Unidade",
        href: "/analytics/unidade"
      },
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
      },
      {
        title: "API",
        href: "/configuracoes/api"
      }
    ]
  }
]

export function Sidebar({ className }: SidebarProps) {
  const { user, logout, loading } = useAuth()
  const { theme, toggleTheme, isLoading: themeLoading } = useTheme()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([])
  const pathname = usePathname()

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

  // Função para alternar submenu
  const toggleSubmenu = (itemTitle: string) => {
    setOpenSubmenus(prev => 
      prev.includes(itemTitle) 
        ? prev.filter(title => title !== itemTitle)
        : [...prev, itemTitle]
    )
  }

  // Auto-abrir submenu se rota está ativa
  const isSubmenuOpen = (itemTitle: string) => {
    const item = menuItems.find(i => i.title === itemTitle)
    if (item && isSubmenuActive(item)) {
      if (!openSubmenus.includes(itemTitle)) {
        setOpenSubmenus(prev => [...prev, itemTitle])
      }
      return true
    }
    return openSubmenus.includes(itemTitle)
  }

  if (loading) {
    return (
      <div className={cn(
        "pb-12 transition-all duration-300",
        isCollapsed ? "w-16" : "w-64",
        className
      )}>
        <div className="flex items-center justify-center h-full">
          <div className="text-sm text-muted-foreground">
            {!isCollapsed && "Carregando..."}
          </div>
        </div>
      </div>
    )
  }

  const SidebarButton = ({ item, children }: { item: any, children: React.ReactNode }) => {
    if (isCollapsed) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {children}
            </TooltipTrigger>
            <TooltipContent side="right" className="ml-2">
              <p>{item.title}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )
    }
    return children
  }

  return (
    <div className={cn(
      "pb-12 transition-all duration-300 border-r bg-sidebar/95 backdrop-blur supports-[backdrop-filter]:bg-sidebar/60",
      isCollapsed ? "w-16" : "w-64",
      className
    )}>
      <div className="flex h-full flex-col">
        {/* Header com botão de collapse */}
        <div className="flex items-center justify-between p-4 border-b">
          {isCollapsed ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-sidebar-foreground hover:text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>{process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <h2 className="text-xl font-display text-sidebar-foreground">
              {process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG'}
            </h2>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 p-0 text-sidebar-foreground hover:text-primary hover:bg-primary/10"
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 space-y-2 p-4">
          {menuItems.map((item) => (
            <div key={item.title}>
              {/* Item principal */}
              <SidebarButton item={item}>
                {item.hasSubmenu ? (
                  // Item com submenu
                  <Button
                    variant="ghost"
                    onClick={() => !isCollapsed && toggleSubmenu(item.title)}
                    className={cn(
                      "transition-all duration-200 text-sidebar-foreground hover:text-primary hover:bg-primary/10",
                      isCollapsed 
                        ? "w-8 h-8 p-0" 
                        : "w-full justify-between",
                      (isActiveRoute(item.href) || isSubmenuActive(item)) && "bg-primary/10 text-primary hover:bg-primary/20"
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon className={cn(
                        "h-4 w-4",
                        !isCollapsed && "mr-2"
                      )} />
                      {!isCollapsed && item.title}
                    </div>
                    {!isCollapsed && (
                      isSubmenuOpen(item.title) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )
                    )}
                  </Button>
                ) : (
                  // Item sem submenu
                  <Link href={item.href} target={item.openInNewWindow ? "_blank" : undefined} rel={item.openInNewWindow ? "noopener noreferrer" : undefined} className="w-full">
                    <Button
                      variant="ghost"
                      className={cn(
                        "transition-all duration-200 text-sidebar-foreground hover:text-primary hover:bg-primary/10",
                        isCollapsed 
                          ? "w-8 h-8 p-0" 
                          : "w-full justify-start",
                        isActiveRoute(item.href) && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4",
                        !isCollapsed && "mr-2"
                      )} />
                      {!isCollapsed && item.title}
                    </Button>
                  </Link>
                )}
              </SidebarButton>

              {/* Submenu */}
              {item.hasSubmenu && !isCollapsed && isSubmenuOpen(item.title) && (
                <div className="ml-6 mt-2 space-y-3">
                  {item.submenu?.map((subItem: any) => (
                    <Link key={subItem.title} href={subItem.href} className="w-full">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-sm h-8 text-sidebar-foreground hover:text-primary hover:bg-primary/10",
                          isExactRoute(subItem.href) && "bg-primary/10 text-primary hover:bg-primary/20"
                        )}
                      >
                        {subItem.title}
                      </Button>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Theme Toggle */}
        <div className="border-t p-4">
          {!isCollapsed ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleTheme}
              disabled={themeLoading}
              className="w-full justify-start text-sidebar-foreground hover:text-primary hover:bg-primary/10"
            >
              {theme === 'light' ? (
                <Moon className="mr-2 h-4 w-4" />
              ) : (
                <Sun className="mr-2 h-4 w-4" />
              )}
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleTheme}
                    disabled={themeLoading}
                    className="w-8 h-8 p-0 text-sidebar-foreground hover:text-primary hover:bg-primary/10"
                  >
                    {theme === 'light' ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="ml-2">
                  <p>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* User Section */}
        {user && (
          <div className="border-t p-4">
            {!isCollapsed ? (
              <div className="space-y-3">
                <div className="flex items-center space-x-3 px-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 text-sm">
                    <div className="font-semibold leading-none text-sidebar-foreground">
                      {user.name || user.username}
                    </div>
                    <div className="text-xs text-sidebar-foreground/70 mt-1 capitalize font-medium">
                      {user.role}
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="w-full justify-start text-sidebar-foreground hover:text-red-500 hover:bg-red-500/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-8 h-8 p-0 text-sidebar-foreground hover:text-primary hover:bg-primary/10"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <p>{user.name || user.username}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="w-8 h-8 p-0 text-sidebar-foreground hover:text-red-500 hover:bg-red-500/10"
                      >
                        <LogOut className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                      <p>Sair</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
