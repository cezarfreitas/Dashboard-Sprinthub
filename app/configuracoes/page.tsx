"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { 
  Settings, 
  Save, 
  RefreshCw, 
  Database, 
  Bell, 
  Shield,
  Globe,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface Configuracao {
  id: number
  chave: string
  valor: string
  descricao?: string
  tipo: string
  created_at: string
  updated_at: string
}

interface ConfiguracoesForm {
  sistema_nome: string
  sistema_versao: string
  notificacoes_email: boolean
  notificacoes_push: boolean
  backup_automatico: boolean
  backup_intervalo: number
  log_retention_days: number
  theme_default: string
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const [configuracoes, setConfiguracoes] = useState<ConfiguracoesForm>({
    sistema_nome: 'CRM by INTELI',
    sistema_versao: '1.0.0',
    notificacoes_email: true,
    notificacoes_push: true,
    backup_automatico: true,
    backup_intervalo: 24,
    log_retention_days: 30,
    theme_default: 'light'
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    loadConfiguracoes()
  }, [])

  const loadConfiguracoes = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/configuracoes')
      const data = await response.json()
      
      if (data.success) {
        // Converter array de configurações para objeto
        const configsObj: any = {}
        data.configuracoes.forEach((config: Configuracao) => {
          configsObj[config.chave] = config.tipo === 'boolean' 
            ? config.valor === 'true' 
            : config.tipo === 'number' 
            ? parseInt(config.valor) 
            : config.valor
        })
        
        // Mesclar com valores padrão
        setConfiguracoes(prev => ({
          ...prev,
          ...configsObj
        }))
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error)
      setMessage({ type: 'error', text: 'Erro ao carregar configurações' })
    } finally {
      setLoading(false)
    }
  }

  const saveConfiguracoes = async () => {
    try {
      setSaving(true)
      setMessage(null)
      
      // Salvar cada configuração individualmente
      const promises = Object.entries(configuracoes).map(([chave, valor]) => {
        return fetch('/api/configuracoes', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chave, valor: valor.toString() }),
        })
      })

      const responses = await Promise.all(promises)
      const results = await Promise.all(responses.map(r => r.json()))
      
      const allSuccess = results.every(r => r.success)
      
      if (allSuccess) {
        setMessage({ type: 'success', text: 'Configurações salvas com sucesso!' })
      } else {
        setMessage({ type: 'error', text: 'Algumas configurações não foram salvas' })
      }
    } catch (error) {
      console.error('Erro ao salvar configurações:', error)
      setMessage({ type: 'error', text: 'Erro de conexão. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof ConfiguracoesForm, value: string | boolean | number) => {
    setConfiguracoes(prev => ({
      ...prev,
      [field]: value
    }))
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do sistema
          </p>
        </div>
      </div>

      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
          {message.type === 'success' ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Globe className="h-5 w-5" />
              <span>Sistema</span>
            </CardTitle>
            <CardDescription>
              Configurações básicas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sistema_nome">Nome do Sistema</Label>
              <Input
                id="sistema_nome"
                value={configuracoes.sistema_nome}
                onChange={(e) => handleInputChange('sistema_nome', e.target.value)}
                placeholder="Nome do sistema"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sistema_versao">Versão</Label>
              <Input
                id="sistema_versao"
                value={configuracoes.sistema_versao}
                onChange={(e) => handleInputChange('sistema_versao', e.target.value)}
                placeholder="Versão do sistema"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme_default">Tema Padrão</Label>
              <select
                id="theme_default"
                value={configuracoes.theme_default}
                onChange={(e) => handleInputChange('theme_default', e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="light">Claro</option>
                <option value="dark">Escuro</option>
                <option value="system">Sistema</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Notificações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Notificações</span>
            </CardTitle>
            <CardDescription>
              Configure as notificações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações por Email</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações por email
                </p>
              </div>
              <Switch
                checked={configuracoes.notificacoes_email}
                onCheckedChange={(checked) => handleInputChange('notificacoes_email', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Notificações Push</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificações push no navegador
                </p>
              </div>
              <Switch
                checked={configuracoes.notificacoes_push}
                onCheckedChange={(checked) => handleInputChange('notificacoes_push', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Backup e Segurança */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Backup e Segurança</span>
            </CardTitle>
            <CardDescription>
              Configurações de backup e retenção de dados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Backup Automático</Label>
                <p className="text-sm text-muted-foreground">
                  Executar backup automático do banco de dados
                </p>
              </div>
              <Switch
                checked={configuracoes.backup_automatico}
                onCheckedChange={(checked) => handleInputChange('backup_automatico', checked)}
              />
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="backup_intervalo">Intervalo de Backup (horas)</Label>
              <Input
                id="backup_intervalo"
                type="number"
                min="1"
                max="168"
                value={configuracoes.backup_intervalo}
                onChange={(e) => handleInputChange('backup_intervalo', parseInt(e.target.value))}
                placeholder="24"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="log_retention_days">Retenção de Logs (dias)</Label>
              <Input
                id="log_retention_days"
                type="number"
                min="1"
                max="365"
                value={configuracoes.log_retention_days}
                onChange={(e) => handleInputChange('log_retention_days', parseInt(e.target.value))}
                placeholder="30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Ações */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5" />
              <span>Ações</span>
            </CardTitle>
            <CardDescription>
              Ações administrativas do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={saveConfiguracoes}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Configurações
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={loadConfiguracoes}
              disabled={loading}
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Recarregar
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
