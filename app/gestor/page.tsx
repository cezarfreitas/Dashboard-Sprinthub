"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Building2, LogIn, ArrowLeft } from 'lucide-react'

export default function GestorPage() {
  const router = useRouter()

  useEffect(() => {
    // Verificar se já está autenticado
    const authData = localStorage.getItem('gestor_auth')
    if (authData) {
      router.push('/gestor/dashboard')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-8 w-8 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Área do Gestor
          </h1>
          <p className="text-gray-600 mt-2">
            Acesse sua área administrativa
          </p>
        </div>

        {/* Card de Acesso */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              Acesso Restrito
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>Esta área é exclusiva para gestores de unidade.</p>
              <p className="mt-2">Faça login com suas credenciais para continuar.</p>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => router.push('/gestor/login')}
                className="w-full"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Fazer Login
              </Button>
              
              <Button 
                variant="outline" 
                onClick={() => router.push('/')}
                className="w-full"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Sistema
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Sistema de gerenciamento de vendedores e filas de oportunidades
          </p>
        </div>
      </div>
    </div>
  )
}
