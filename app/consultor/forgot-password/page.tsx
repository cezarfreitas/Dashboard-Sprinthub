"use client"

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Mail, CheckCircle2, Loader2 } from 'lucide-react'
import { useEmpresaConfig } from '@/hooks/use-empresa-config'
import { EmpresaLogo } from '@/components/empresa-logo'

export default function ConsultorForgotPasswordPage() {
  const { config: empresaConfig } = useEmpresaConfig()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/consultor/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(true)
      } else {
        setError(data.message || 'Erro ao processar solicitação')
      }
    } catch (error) {
      setError('Erro ao processar solicitação. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
            <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-blue-50 to-white text-center">
              <div className="flex justify-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-gray-900">Email Enviado!</h2>
                <CardDescription className="text-gray-600 text-sm">
                  Verifique sua caixa de entrada
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 pt-2 pb-6">
              <div className="text-center text-sm text-gray-600 space-y-2">
                <p>
                  Se o email <strong>{email}</strong> estiver cadastrado, você receberá instruções para recuperar sua senha.
                </p>
                <p className="text-xs text-gray-500">
                  Não se esqueça de verificar a pasta de spam/lixo eletrônico.
                </p>
              </div>

              <Link href="/consultor" className="block">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para o Login
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
          <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex justify-center">
              <EmpresaLogo
                src={empresaConfig?.logotipo}
                alt={empresaConfig?.nome}
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="space-y-1 text-center">
              <h2 className="text-xl font-bold text-gray-900">Esqueceu a senha?</h2>
              <CardDescription className="text-gray-600 text-sm">
                Digite seu email para receber instruções de recuperação
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
                <Label htmlFor="email" className="text-gray-700 font-medium text-xs">Email</Label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite seu email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-blue-600 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                    required
                    disabled={loading}
                    autoFocus
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Instruções'
                )}
              </Button>

              <Link href="/consultor" className="block">
                <Button variant="ghost" className="w-full text-xs" type="button">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar para o Login
                </Button>
              </Link>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

