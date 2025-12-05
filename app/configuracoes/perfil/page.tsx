"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthSistema } from '@/hooks/use-auth-sistema'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, RefreshCw } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface UserProfile {
  id: number
  nome: string
  email: string
  whatsapp: string | null
}

interface Country {
  code: string
  name: string
  flag: string
  dialCode: string
  format: (value: string) => string
  maxLength: number
}

const countries: Country[] = [
  {
    code: 'BR',
    name: 'Brasil',
    flag: '🇧🇷',
    dialCode: '55',
    format: (value: string) => {
      // Assume que value já vem com o código do país (55)
      // Limita a 13 dígitos (55 + 2 DDD + 9 + 8 dígitos)
      const formatted = value.length > 13 ? value.slice(0, 13) : value
      
      // Aplica máscara: +55 (XX) 9XXXX-XXXX
      if (formatted.length <= 2) {
        return formatted ? `+${formatted}` : ''
      } else if (formatted.length <= 4) {
        // +55 (11
        return `+${formatted.slice(0, 2)} (${formatted.slice(2)}`
      } else if (formatted.length <= 5) {
        // +55 (11) 9
        return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4)}`
      } else if (formatted.length <= 9) {
        // +55 (11) 98988
        return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4)}`
      } else {
        // +55 (11) 98988-2867 (até 13 dígitos)
        return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4, 9)}-${formatted.slice(9)}`
      }
    },
    maxLength: 18
  },
  {
    code: 'US',
    name: 'Estados Unidos',
    flag: '🇺🇸',
    dialCode: '1',
    format: (value: string) => {
      const numbers = value.replace(/\D/g, '')
      let formatted = numbers
      if (numbers.length > 0 && !numbers.startsWith('1')) {
        formatted = '1' + numbers
      }
      formatted = formatted.slice(0, 11)
      
      if (formatted.length <= 1) {
        return formatted ? `+${formatted}` : ''
      } else if (formatted.length <= 4) {
        return `+${formatted.slice(0, 1)} (${formatted.slice(1)}`
      } else if (formatted.length <= 7) {
        return `+${formatted.slice(0, 1)} (${formatted.slice(1, 4)}) ${formatted.slice(4)}`
      } else {
        return `+${formatted.slice(0, 1)} (${formatted.slice(1, 4)}) ${formatted.slice(4, 7)}-${formatted.slice(7)}`
      }
    },
    maxLength: 16
  },
  {
    code: 'AR',
    name: 'Argentina',
    flag: '🇦🇷',
    dialCode: '54',
    format: (value: string) => {
      const numbers = value.replace(/\D/g, '')
      let formatted = numbers
      if (numbers.length > 0 && !numbers.startsWith('54')) {
        formatted = '54' + numbers
      }
      formatted = formatted.slice(0, 12)
      
      if (formatted.length <= 2) {
        return formatted ? `+${formatted}` : ''
      } else if (formatted.length <= 4) {
        return `+${formatted.slice(0, 2)} (${formatted.slice(2)}`
      } else if (formatted.length <= 7) {
        return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4)}`
      } else {
        return `+${formatted.slice(0, 2)} (${formatted.slice(2, 4)}) ${formatted.slice(4, 7)}-${formatted.slice(7)}`
      }
    },
    maxLength: 16
  },
  {
    code: 'PT',
    name: 'Portugal',
    flag: '🇵🇹',
    dialCode: '351',
    format: (value: string) => {
      const numbers = value.replace(/\D/g, '')
      let formatted = numbers
      if (numbers.length > 0 && !numbers.startsWith('351')) {
        formatted = '351' + numbers
      }
      formatted = formatted.slice(0, 12)
      
      if (formatted.length <= 3) {
        return formatted ? `+${formatted}` : ''
      } else if (formatted.length <= 6) {
        return `+${formatted.slice(0, 3)} ${formatted.slice(3)}`
      } else {
        return `+${formatted.slice(0, 3)} ${formatted.slice(3, 6)} ${formatted.slice(6)}`
      }
    },
    maxLength: 15
  },
  {
    code: 'ES',
    name: 'Espanha',
    flag: '🇪🇸',
    dialCode: '34',
    format: (value: string) => {
      const numbers = value.replace(/\D/g, '')
      let formatted = numbers
      if (numbers.length > 0 && !numbers.startsWith('34')) {
        formatted = '34' + numbers
      }
      formatted = formatted.slice(0, 11)
      
      if (formatted.length <= 2) {
        return formatted ? `+${formatted}` : ''
      } else if (formatted.length <= 5) {
        return `+${formatted.slice(0, 2)} ${formatted.slice(2)}`
      } else {
        return `+${formatted.slice(0, 2)} ${formatted.slice(2, 5)} ${formatted.slice(5)}`
      }
    },
    maxLength: 14
  }
]

export default function PerfilPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthSistema()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  // Formulário de perfil
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]) // Brasil como padrão
  
  // Formulário de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaNovaConfirmacao, setSenhaNovaConfirmacao] = useState('')
  const [showSenhaAtual, setShowSenhaAtual] = useState(false)
  const [showSenhaNova, setShowSenhaNova] = useState(false)
  const [showSenhaNovaConfirmacao, setShowSenhaNovaConfirmacao] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/sistema/login')
    }
  }, [authLoading, user, router])

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  // Função para detectar país pelo número
  const detectCountryFromNumber = (number: string): Country => {
    const numbers = number.replace(/\D/g, '')
    for (const country of countries) {
      if (numbers.startsWith(country.dialCode)) {
        return country
      }
    }
    return countries[0] // Brasil como padrão
  }

  // Função para formatar WhatsApp com código do país
  const formatWhatsApp = (value: string, country: Country = selectedCountry): string => {
    // Se o valor está vazio, retorna vazio
    if (!value) return ''
    
    // Remove todos os caracteres não numéricos
    const numbers = value.replace(/\D/g, '')
    
    // Se não há números, retorna vazio
    if (!numbers) return ''
    
    // Se o número já começa com o código do país, mantém; senão, adiciona
    let formattedNumbers = numbers
    if (!formattedNumbers.startsWith(country.dialCode)) {
      formattedNumbers = country.dialCode + formattedNumbers
    }
    
    // Para Brasil: garante que não corte antes dos 13 dígitos completos
    if (country.code === 'BR') {
      // Não limita aqui, deixa a função format fazer isso
    }
    
    // Aplica a formatação do país
    return country.format(formattedNumbers)
  }

  // Função para remover máscara (apenas números)
  const unformatWhatsApp = (value: string): string => {
    return value.replace(/\D/g, '')
  }

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await fetch('/api/auth/sistema/perfil')
      const data = await response.json()

      if (data.success) {
        setProfile(data.user)
        setNome(data.user.nome)
        setEmail(data.user.email)
        // Formatar WhatsApp ao carregar
        const whatsappValue = data.user.whatsapp || ''
        if (whatsappValue) {
          const detectedCountry = detectCountryFromNumber(whatsappValue)
          setSelectedCountry(detectedCountry)
          setWhatsapp(formatWhatsApp(whatsappValue, detectedCountry))
        } else {
          setWhatsapp('')
        }
      } else {
        setError(data.message || 'Erro ao carregar perfil')
      }
    } catch (error) {
      setError('Erro ao carregar perfil')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/sistema/perfil', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome,
          email,
          whatsapp: whatsapp ? unformatWhatsApp(whatsapp) : null
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Perfil atualizado com sucesso!')
        await loadProfile()
        // Atualizar localStorage
        if (user) {
          const updatedUser = { ...user, nome, email }
          localStorage.setItem('user', JSON.stringify(updatedUser))
        }
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      setError('Erro ao atualizar perfil')
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setChangingPassword(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/auth/sistema/senha', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senhaAtual,
          senhaNova,
          senhaNovaConfirmacao
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess('Senha alterada com sucesso!')
        setSenhaAtual('')
        setSenhaNova('')
        setSenhaNovaConfirmacao('')
        setTimeout(() => setSuccess(''), 3000)
      } else {
        setError(data.message || 'Erro ao alterar senha')
      }
    } catch (error) {
      setError('Erro ao alterar senha')
    } finally {
      setChangingPassword(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const userInitials = (profile.nome || 'U').charAt(0).toUpperCase()

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <User className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Meu Perfil</h1>
          <p className="text-muted-foreground">
            Gerencie suas informações pessoais e senha
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card de Perfil */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-black text-white text-2xl">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize seus dados de contato
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="whatsapp">WhatsApp (opcional)</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="whatsapp"
                    type="tel"
                    placeholder="+55 (11) 98988-2867"
                    value={whatsapp}
                    onChange={(e) => {
                      const value = e.target.value
                      // Remove todos os caracteres não numéricos
                      const numbers = value.replace(/\D/g, '')
                      
                      // Detecta o país pelo código
                      let detectedCountry = selectedCountry
                      for (const country of countries) {
                        if (numbers.startsWith(country.dialCode)) {
                          detectedCountry = country
                          break
                        }
                      }
                      
                      // Se não começa com nenhum código conhecido, usa Brasil como padrão
                      if (!numbers || numbers.length < 2) {
                        detectedCountry = countries[0] // Brasil
                      }
                      
                      // Atualiza o país selecionado se mudou
                      if (detectedCountry.code !== selectedCountry.code) {
                        setSelectedCountry(detectedCountry)
                      }
                      
                      // Formata o número
                      const formatted = formatWhatsApp(value, detectedCountry)
                      setWhatsapp(formatted)
                    }}
                    maxLength={20}
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Formato: +55 (DDD) 9XXXX-XXXX (9 é obrigatório para celular)
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={saving}>
                {saving ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Card de Senha */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Lock className="h-5 w-5" />
              <div>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="senhaAtual">Senha Atual</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="senhaAtual"
                    name="current-password"
                    type={showSenhaAtual ? 'text' : 'password'}
                    placeholder="Digite sua senha atual"
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    autoComplete="current-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSenhaAtual(!showSenhaAtual)}
                  >
                    {showSenhaAtual ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="senhaNova">Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="senhaNova"
                    name="new-password"
                    type={showSenhaNova ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={senhaNova}
                    onChange={(e) => setSenhaNova(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSenhaNova(!showSenhaNova)}
                  >
                    {showSenhaNova ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="senhaNovaConfirmacao">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="senhaNovaConfirmacao"
                    name="new-password-confirm"
                    type={showSenhaNovaConfirmacao ? 'text' : 'password'}
                    placeholder="Digite a nova senha novamente"
                    value={senhaNovaConfirmacao}
                    onChange={(e) => setSenhaNovaConfirmacao(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowSenhaNovaConfirmacao(!showSenhaNovaConfirmacao)}
                  >
                    {showSenhaNovaConfirmacao ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={changingPassword}>
                {changingPassword ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Alterando...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 h-4 w-4" />
                    Alterar Senha
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

