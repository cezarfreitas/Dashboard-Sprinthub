"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Mail, Lock, Loader2, Eye, EyeOff } from "lucide-react"
import { useEmpresaConfig } from "@/hooks/use-empresa-config"
import { EmpresaLogo } from "@/components/empresa-logo"

export default function GestorLogin() {
  const { config: empresaConfig } = useEmpresaConfig()
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/gestor/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha }),
      })

      const data = await response.json()

      if (data.success) {
        // Salvar dados do gestor no localStorage
        localStorage.setItem('gestor', JSON.stringify({
          id: data.gestor.id,
          name: data.gestor.name,
          lastName: data.gestor.lastName,
          username: data.gestor.username,
          email: data.gestor.email,
          unidades: data.gestor.unidades,
          unidade_principal: data.gestor.unidade_principal
        }))
        
        // Redirecionar para dashboard do gestor
        router.push('/gestor/dashboard')
      } else {
        setError(data.message || 'Erro no login')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
          <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-gray-50 to-white">
            <div className="flex justify-center">
              <EmpresaLogo
                src={empresaConfig?.logotipo}
                alt={empresaConfig?.nome}
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="space-y-1">
              <CardDescription className="text-gray-600 text-center text-sm font-medium">
                Área do Gestor
              </CardDescription>
              <p className="text-xs text-gray-500 text-center pt-1">
                Faça login para acessar seu painel
              </p>
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
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-gray-700" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Digite seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-gray-700 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-gray-700 font-medium text-xs">Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-gray-700" />
                  <Input
                    id="senha"
                    name="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="Digite sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-gray-700 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none transition-all"
                    disabled={loading}
                  >
                    {showSenha ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link 
                  href="/gestor/forgot-password" 
                  className="text-xs text-gray-600 hover:text-gray-800 hover:underline font-medium"
                >
                  Esqueci minha senha
                </Link>
              </div>
              
              <Button 
                type="submit" 
                className="w-full h-11 bg-gray-700 text-white hover:bg-gray-800 hover:scale-[1.01] font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>
            
            <div className="mt-4 pt-4 border-t border-gray-200 text-center">
              <p className="text-xs text-gray-600">
                Não tem acesso? Entre em contato com o administrador.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
