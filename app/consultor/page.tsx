"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Mail, ShieldCheck, ArrowLeft, Loader2 } from "lucide-react"
import { useEmpresaConfig } from "@/hooks/use-empresa-config"
import { EmpresaLogo } from "@/components/empresa-logo"

export default function ConsultorLogin() {
  const { config: empresaConfig } = useEmpresaConfig()
  const [email, setEmail] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [step, setStep] = useState<"email" | "otp">("email")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [resendTimer, setResendTimer] = useState(0)
  const router = useRouter()

  // Timer para reenvio de código
  const startResendTimer = () => {
    setResendTimer(120) // 2 minutos
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // Enviar código OTP por email
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Código enviado com sucesso! Verifique seu email.')
        setStep("otp")
        startResendTimer()
      } else {
        setError(data.message || 'Erro ao enviar código')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Verificar código OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: otpCode }),
      })

      const data = await response.json()

      if (data.success) {
        // Salvar dados do consultor no localStorage
        localStorage.setItem('consultor', JSON.stringify({
          id: data.consultor.id,
          name: data.consultor.name,
          lastName: data.consultor.lastName,
          username: data.consultor.username,
          email: data.consultor.email,
          unidade_id: data.consultor.unidade_id,
          unidade_nome: data.consultor.unidade_nome
        }))
        
        // Redirecionar para dashboard do consultor
        router.push('/consultor/dashboard')
      } else {
        setError(data.message || 'Código inválido')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Voltar para a tela de email
  const handleBack = () => {
    setStep("email")
    setOtpCode("")
    setError("")
    setSuccess("")
  }

  // Reenviar código
  const handleResend = async () => {
    if (resendTimer > 0) return
    
    setLoading(true)
    setError("")
    setSuccess("")

    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Novo código enviado!')
        setOtpCode("")
        startResendTimer()
      } else {
        setError(data.message || 'Erro ao reenviar código')
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-100 p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl bg-white border border-gray-200 overflow-hidden">
          <CardHeader className="space-y-3 pb-4 pt-6 bg-gradient-to-br from-blue-50 to-white">
            <div className="flex justify-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                {step === "email" ? (
                  <Mail className="h-6 w-6 text-white" />
                ) : (
                  <ShieldCheck className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold text-center text-gray-900">
                {empresaConfig?.nome || 'Grupo Inteli'}
              </CardTitle>
              <CardDescription className="text-gray-600 text-center text-sm font-medium">
                Área do Consultor
              </CardDescription>
              <p className="text-xs text-gray-500 text-center pt-1">
                {step === "email" 
                  ? "Faça login para acessar seu painel"
                  : "Digite o código enviado para seu email"
                }
              </p>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-2 pb-6">
            {step === "email" ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{error}</span>
                  </div>
                )}
                
                {success && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-green-700">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{success}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 font-medium text-xs">Email</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-600" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Digite seu email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-10 bg-gray-50 text-gray-900 text-sm border-2 border-gray-200 focus:border-blue-600 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-gray-400 rounded-lg font-medium transition-all"
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.01] font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Código'
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 flex items-center gap-2 text-red-700">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{error}</span>
                  </div>
                )}
                
                {success && (
                  <div className="p-3 rounded-lg bg-green-50 border border-green-200 flex items-center gap-2 text-green-700">
                    <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                    <span className="text-xs font-medium">{success}</span>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-gray-700 font-medium text-xs">Código de Verificação</Label>
                  <div className="relative">
                    <ShieldCheck className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="otp"
                      name="otp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="pl-10 h-12 text-center text-2xl tracking-[0.5em] font-bold bg-gray-50 border-2 border-gray-200 focus:border-blue-600 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0"
                      required
                      autoComplete="one-time-code"
                    />
                  </div>
                  <p className="text-xs text-gray-500 text-center">
                    Código enviado para <strong>{email}</strong>
                  </p>
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full h-11 bg-blue-600 text-white hover:bg-blue-700 hover:scale-[1.01] font-semibold text-sm rounded-lg shadow-md hover:shadow-lg transition-all duration-200" 
                  disabled={loading || otpCode.length !== 6}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar e Entrar'
                  )}
                </Button>
                
                <div className="flex items-center justify-between pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleBack}
                    className="text-xs"
                  >
                    <ArrowLeft className="mr-1 h-3 w-3" />
                    Voltar
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={resendTimer > 0 || loading}
                    className="text-xs"
                  >
                    {resendTimer > 0 
                      ? `Reenviar (${Math.floor(resendTimer / 60)}:${(resendTimer % 60).toString().padStart(2, '0')})`
                      : "Reenviar código"
                    }
                  </Button>
                </div>
              </form>
            )}
            
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
