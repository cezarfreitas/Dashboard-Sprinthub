"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, User, Eye, EyeOff, Heart as HeartOutline } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/use-empresa-config'
import { EmpresaLogo } from '@/components/empresa-logo'

interface LoginFormProps {
  onSuccess?: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { config: empresaConfig } = useEmpresaConfig()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      })

      const data = await response.json()

      if (data.success) {
        // Login bem-sucedido
        if (onSuccess) {
          onSuccess()
        } else {
          // Redirecionar diretamente para a página principal
          window.location.href = '/'
        }
      } else {
        setError(data.message || 'Erro no login')
      }
    } catch (error) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
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
              <CardTitle className="text-xl font-bold text-center text-gray-900">
                Bem-vindo
              </CardTitle>
              <CardDescription className="text-center font-body text-gray-600 text-sm">
                {empresaConfig?.nome ? `Faça login para acessar o ${empresaConfig.nome}` : 'Faça login para acessar o sistema'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-gray-700 font-medium text-xs">Usuário</Label>
                <div className="relative group">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Digite seu usuário"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-primary focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 font-medium text-xs">Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-primary" />
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-primary focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none transition-all"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-red-50 border border-red-200 py-2">
                  <AlertDescription className="text-red-700 font-medium text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                className="w-full h-10 bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-[1.01] font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Entrando...
                  </div>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-4 pt-4 border-t border-gray-200 text-center text-xs text-gray-600">
              <p className="font-semibold mb-1.5 text-gray-700">Credenciais padrão:</p>
              <div className="flex flex-col gap-1">
                <p>Usuário: <code className="bg-gray-100 px-2 py-1 rounded text-gray-900 font-semibold text-xs">admin</code></p>
                <p>Senha: <code className="bg-gray-100 px-2 py-1 rounded text-gray-900 font-semibold text-xs">admin@1234</code></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          <p className="flex items-center justify-center gap-1">
            Feito com 
            <HeartOutline 
              className="h-4 w-4 text-red-500 animate-pulse hover:animate-bounce fill-red-500" 
              style={{
                animation: 'heartbeat 1.5s ease-in-out infinite'
              }}
            />
            por <span className="font-medium">IDE</span> | Negócios Digitais
          </p>
        </div>
      </div>
    </div>
  )
}
