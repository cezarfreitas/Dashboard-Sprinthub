"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  RefreshCw, 
  Database, 
  Key,
  Clock,
  Link as LinkIcon
} from 'lucide-react'

interface EnvConfig {
  // Database
  DB_HOST: string
  DB_PORT: string
  DB_USER: string
  DB_NAME: string
  
  // API Tokens
  APITOKEN: string
  I: string
  URLPATCH: string
  
  // Auth
  JWT_SECRET: string
  JWT_EXPIRES_IN: string
  
  // Sync Settings
  VENDEDORES_SYNC_SCHEDULE: string
  UNIDADES_SYNC_SCHEDULE: string
  CRON_TIMEZONE: string
  ENABLE_CRON: string
  DEPARTMENT_ID_FILTER: string
  
  // App Settings
  NEXT_PUBLIC_BASE_URL: string
  NODE_ENV: string
}

export default function ConfiguracoesPage() {
  const [config, setConfig] = useState<EnvConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConfiguracoes()
  }, [])

  const loadConfiguracoes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracoes/env')
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
    } finally {
      setLoading(false)
    }
  }

  const maskValue = (value: string, type: 'password' | 'token' | 'normal' = 'normal') => {
    if (!value) return 'Não configurado'
    
    if (type === 'password' || type === 'token') {
      if (value.length <= 8) return '••••••••'
      return value.substring(0, 4) + '••••••••' + value.substring(value.length - 4)
    }
    
    return value
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-muted-foreground">
          Erro ao carregar configurações
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Configurações do Sistema</h1>
          <p className="text-muted-foreground">
            Variáveis de ambiente e configurações ativas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Database */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Banco de Dados</span>
            </CardTitle>
            <CardDescription>
              Configurações de conexão com o banco de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Host</Label>
              <p className="text-sm font-mono">{config.DB_HOST}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Porta</Label>
              <p className="text-sm font-mono">{config.DB_PORT}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Usuário</Label>
              <p className="text-sm font-mono">{config.DB_USER}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Database</Label>
              <p className="text-sm font-mono">{config.DB_NAME}</p>
            </div>
          </CardContent>
        </Card>

        {/* API Tokens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>API e Autenticação</span>
            </CardTitle>
            <CardDescription>
              Tokens e credenciais da API
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">API Token</Label>
              <p className="text-sm font-mono">{maskValue(config.APITOKEN, 'token')}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Group ID (I)</Label>
              <p className="text-sm font-mono">{config.I}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">URL Patch</Label>
              <p className="text-sm font-mono break-all">{config.URLPATCH}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">JWT Secret</Label>
              <p className="text-sm font-mono">{maskValue(config.JWT_SECRET, 'password')}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">JWT Expira Em</Label>
              <p className="text-sm font-mono">{config.JWT_EXPIRES_IN}</p>
            </div>
          </CardContent>
        </Card>

        {/* Cron Jobs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>Sincronizações Automáticas</span>
            </CardTitle>
            <CardDescription>
              Configurações de sincronização periódica
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Vendedores Sync Schedule</Label>
              <p className="text-sm font-mono">{config.VENDEDORES_SYNC_SCHEDULE}</p>
              <p className="text-xs text-muted-foreground">
                {config.VENDEDORES_SYNC_SCHEDULE === '0 8,14,20 * * *' ? 'Executa às 8h, 14h e 20h' : 'Padrão: 8h, 14h e 20h'}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Unidades Sync Schedule</Label>
              <p className="text-sm font-mono">{config.UNIDADES_SYNC_SCHEDULE}</p>
              <p className="text-xs text-muted-foreground">
                {config.UNIDADES_SYNC_SCHEDULE === '0 8,14,20 * * *' ? 'Executa às 8h, 14h e 20h' : 'Padrão: 8h, 14h e 20h'}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Timezone</Label>
              <p className="text-sm font-mono">{config.CRON_TIMEZONE}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">CRON Ativado</Label>
              <p className="text-sm font-mono">
                {config.ENABLE_CRON === 'true' ? '✓ Sim' : '✗ Não'}
              </p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Department ID Filter</Label>
              <p className="text-sm font-mono">{config.DEPARTMENT_ID_FILTER}</p>
            </div>
          </CardContent>
        </Card>

        {/* App Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <LinkIcon className="h-5 w-5" />
              <span>Aplicação</span>
            </CardTitle>
            <CardDescription>
              Configurações gerais da aplicação
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Base URL</Label>
              <p className="text-sm font-mono">{config.NEXT_PUBLIC_BASE_URL}</p>
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Ambiente</Label>
              <p className="text-sm font-mono">
                {config.NODE_ENV === 'production' ? '🚀 Produção' : '🔧 Desenvolvimento'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
