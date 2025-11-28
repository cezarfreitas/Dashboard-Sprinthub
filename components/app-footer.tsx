'use client'

import { memo } from 'react'
import { getAppVersion, formatVersionShort } from '@/lib/version'
import { Code2, GitBranch, Calendar } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { APP_TITLE } from '@/lib/app-config'

export const AppFooter = memo(function AppFooter() {
  const version = getAppVersion()
  
  const buildDate = new Date(version.buildDate).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <footer className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4 md:px-6">
        {/* Informações da Versão */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <TooltipProvider delayDuration={200}>
            {/* Versão */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Code2 className="h-3.5 w-3.5" />
                  <span className="font-mono">{formatVersionShort(version)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Versão da Aplicação</p>
                <p className="text-xs text-muted-foreground">Package: {version.version}</p>
              </TooltipContent>
            </Tooltip>

            {/* Build/Commit SHA */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden sm:flex items-center gap-1.5 cursor-help">
                  <GitBranch className="h-3.5 w-3.5" />
                  <span className="font-mono">{version.buildNumber}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Build / Commit</p>
                <p className="text-xs text-muted-foreground">SHA: {version.buildNumber}</p>
                <p className="text-xs text-muted-foreground">Ambiente: {version.environment}</p>
              </TooltipContent>
            </Tooltip>

            {/* Data do Build */}
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="hidden md:flex items-center gap-1.5 cursor-help">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{buildDate}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">Data do Build</p>
                <p className="text-xs text-muted-foreground">Último deploy</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Copyright */}
        <div className="text-xs text-muted-foreground">
          <span className="hidden sm:inline">© {new Date().getFullYear()} </span>
          <span className="font-medium">{APP_TITLE || 'Dashboard'}</span>
        </div>
      </div>
    </footer>
  )
})



