"use client"

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Lock, CheckCircle2, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/use-empresa-config'
import { EmpresaLogo } from '@/components/empresa-logo'

function ResetPasswordForm() {
  const { config: empresaConfig } = useEmpresaConfig()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [showConfirmarSenha, setShowConfirmarSenha] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Validações
    if (senha.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/gestor/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, senha })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.message || 'Erro ao redefinir senha')
      }
    } catch (error) {
      setError('Erro ao processar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Token inválido
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
            <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-red-50 to-white text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Link Inválido</h2>
                <CardDescription className="text-gray-600 text-sm">
                  O link de recuperação de senha é inválido ou expirou
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6">
              <Link href="/gestor/forgot-password" className="block">
                <Button className="w-full bg-gray-700 hover:bg-gray-800">
                  Solicitar Nova Recuperação
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Sucesso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
            <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-green-50 to-white text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Senha Alterada!</h2>
                <CardDescription className="text-gray-600 text-sm">
                  Sua senha foi redefinida com sucesso
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6">
              <p className="text-center text-sm text-gray-600">
                Você já pode fazer login com sua nova senha.
              </p>
              <Link href="/gestor" className="block">
                <Button className="w-full bg-gray-700 hover:bg-gray-800">
                  Ir para o Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Formulário
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
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold text-gray-900">Criar Nova Senha</h2>
              <CardDescription className="text-gray-600 text-sm">
                Digite sua nova senha abaixo
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-2 pb-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="senha" className="text-gray-700 font-medium text-xs">Nova Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-gray-700" />
                  <Input
                    id="senha"
                    type={showSenha ? "text" : "password"}
                    placeholder="Digite sua nova senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-gray-700 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none transition-all"
                  >
                    {showSenha ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmarSenha" className="text-gray-700 font-medium text-xs">Confirmar Senha</Label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-gray-700" />
                  <Input
                    id="confirmarSenha"
                    type={showConfirmarSenha ? "text" : "password"}
                    placeholder="Confirme sua nova senha"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="pl-10 pr-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-gray-700 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmarSenha(!showConfirmarSenha)}
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md focus:outline-none transition-all"
                  >
                    {showConfirmarSenha ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-gray-500">
                A senha deve ter no mínimo 6 caracteres.
              </p>

              <Button 
                type="submit" 
                className="w-full h-11 bg-gray-700 text-white hover:bg-gray-800 font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  'Salvar Nova Senha'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function GestorResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <Loader2 className="h-8 w-8 animate-spin text-gray-700" />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  )
}

