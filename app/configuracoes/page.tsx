"use client"

import { useState, useEffect, useRef } from 'react'
import { Settings, Upload, Image as ImageIcon, Palette, Mail, Building2, Save, RefreshCw, FileText } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import Image from 'next/image'

interface EmpresaConfig {
  nome: string
  email: string
  descricao: string
  logotipo: string
  corPrincipal: string
}

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [config, setConfig] = useState<EmpresaConfig>({
    nome: '',
    email: '',
    descricao: '',
    logotipo: '',
    corPrincipal: '#3b82f6'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConfig()
  }, [])

  const loadConfig = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/configuracoes/empresa')
      const data = await response.json()
      
      if (data.success) {
        setConfig(data.config)
      } else {
        setError(data.message || 'Erro ao carregar configurações')
      }
    } catch (error) {
      setError('Erro ao carregar configurações')
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUploading(true)
      setError('')

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/configuracoes/upload', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setConfig(prev => ({ ...prev, logotipo: data.url }))
        setSuccess('Logotipo enviado com sucesso!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Erro ao fazer upload do logotipo')
      }
    } catch (error) {
      setError('Erro ao fazer upload do logotipo')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/configuracoes/empresa', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Configurações salvas com sucesso!')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Erro ao salvar configurações')
      }
    } catch (error) {
      setError('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Carregando configurações...</span>
        </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Configurações Gerais</h1>
          <p className="text-muted-foreground">
            Configure as informações da sua empresa
          </p>
        </div>
      </div>

      {/* Alertas */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
          <AlertDescription className="text-green-800 dark:text-green-200">
            {success}
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
            <CardDescription>
              Configure os dados básicos da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nome da Empresa */}
            <div className="space-y-2">
              <Label htmlFor="nome">Nome da Empresa *</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="nome"
                  type="text"
                  placeholder="Nome da sua empresa"
                  value={config.nome}
                  onChange={(e) => setConfig(prev => ({ ...prev, nome: e.target.value }))}
                  className="pl-10"
                  required
                />
            </div>
            </div>
            
            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="contato@empresa.com"
                  value={config.email}
                  onChange={(e) => setConfig(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
            </div>
            </div>
            
            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Textarea
                  id="descricao"
                  placeholder="Descreva sua empresa..."
                  value={config.descricao}
                  onChange={(e) => setConfig(prev => ({ ...prev, descricao: e.target.value }))}
                  className="pl-10 min-h-[100px]"
                  rows={4}
                />
            </div>
              <p className="text-xs text-muted-foreground">
                Descrição da empresa (usada como meta description para SEO e compartilhamento)
              </p>
            </div>
            
            {/* Upload Logotipo */}
            <div className="space-y-2">
              <Label htmlFor="logotipo">Logotipo</Label>
              <div className="space-y-4">
                {config.logotipo && (
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden bg-gray-50">
                    <Image
                      src={config.logotipo}
                      alt="Logotipo"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="logotipo"
                    accept="image/jpeg,image/jpg,image/png,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        {config.logotipo ? 'Alterar Logotipo' : 'Enviar Logotipo'}
                      </>
                    )}
                  </Button>
                  {config.logotipo && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setConfig(prev => ({ ...prev, logotipo: '' }))}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              <p className="text-xs text-muted-foreground">
                  Formatos aceitos: JPG, PNG, SVG, WEBP. Tamanho máximo: 2MB
              </p>
            </div>
            </div>
            
            {/* Cor Principal */}
            <div className="space-y-2">
              <Label htmlFor="corPrincipal">Cor Principal</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Palette className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    id="corPrincipal"
                    type="color"
                    value={config.corPrincipal}
                    onChange={(e) => setConfig(prev => ({ ...prev, corPrincipal: e.target.value }))}
                    className="pl-10 h-12 w-32 cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={config.corPrincipal}
                  onChange={(e) => setConfig(prev => ({ ...prev, corPrincipal: e.target.value }))}
                  placeholder="#3b82f6"
                  className="flex-1 font-mono"
                  maxLength={7}
                />
                <div
                  className="w-12 h-12 rounded border"
                  style={{ backgroundColor: config.corPrincipal }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Selecione a cor principal da sua empresa (formato hexadecimal)
              </p>
            </div>
            
            {/* Botão Salvar */}
            <div className="pt-4">
              <Button type="submit" className="w-full" disabled={saving}>
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
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}
