"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/use-empresa-config'
import { EmpresaLogo } from '@/components/empresa-logo'

export default function LoginSistemaPage() {
  const router = useRouter()
  const { config: empresaConfig } = useEmpresaConfig()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Verificar se já está logado
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/sistema')
      if (response.ok) {
        router.push('/')
      }
    } catch (error) {
      // Não está logado, continua na página de login
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/sistema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha })
      })

      const data = await response.json()

      if (data.success) {
        // Salvar usuário no localStorage para o hook useAuth
        localStorage.setItem('user', JSON.stringify(data.user))
        router.push('/')
        router.refresh()
      } else {
        setError(data.message || 'Erro ao fazer login')
      }
    } catch (error) {
      setError('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <div className="w-full max-w-md">
        {/* Card do formulário com cores claras */}
        <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
          <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-gray-50 to-white">
            {/* Logo dentro do card */}
            <div className="flex justify-center">
              <EmpresaLogo
                src={empresaConfig?.logotipo}
                alt={empresaConfig?.nome || 'Logo'}
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-center text-gray-900">Bem-vindo</CardTitle>
              <CardDescription className="text-gray-600 text-center text-sm">
                Entre com suas credenciais de acesso
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-xs font-medium">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 font-medium text-xs">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Digite seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-primary focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-gray-700 font-medium text-xs">Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                  <Input
                    id="senha"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-primary focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-all"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link 
                  href="/sistema/forgot-password" 
                  className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Esqueceu a senha?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Entrando...
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

