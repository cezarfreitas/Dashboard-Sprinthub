"use client"

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { HeaderGestor } from '@/components/header_gestor'
import { useFilaLeads } from '@/hooks/fila/useFilaLeads'
import type { FilaLeads, VendedorFila } from '@/hooks/fila/useFilaLeads'
import { GestorFilaHeader } from './components/GestorFilaHeader'
import { GestorFilaError } from './components/GestorFilaError'
import { GestorFilaEmpty } from './components/GestorFilaEmpty'
import { GestorFilaGrid } from './components/GestorFilaGrid'
import { GestorFilaLoading } from './components/GestorFilaLoading'
import { GestorFilaDialogs } from './components/GestorFilaDialogs'
import { AppFooter } from '@/components/app-footer'
import { RefreshCw } from 'lucide-react'

export default function GestorFilaPage() {
  const router = useRouter()
  const [authLoading, setAuthLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const {
    filas,
    loading,
    error,
    updateFilaVendedores
  } = useFilaLeads()

  useEffect(() => {
    const checkAuth = () => {
      try {
        const savedGestor = localStorage.getItem('gestor')
        if (savedGestor) {
          const gestor = JSON.parse(savedGestor)
          if (gestor && gestor.id) {
            setIsAuthenticated(true)
            setAuthLoading(false)
            return
          }
        }
        setIsAuthenticated(false)
        setAuthLoading(false)
        router.replace('/gestor')
      } catch (error) {
        setIsAuthenticated(false)
        setAuthLoading(false)
        router.replace('/gestor')
      }
    }

    checkAuth()
  }, [router])

  const [editingFila, setEditingFila] = useState<FilaLeads | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [ausenciasFila, setAusenciasFila] = useState<FilaLeads | null>(null)
  const [ausenciasDialogOpen, setAusenciasDialogOpen] = useState(false)
  const [logsFila, setLogsFila] = useState<FilaLeads | null>(null)
  const [logsDialogOpen, setLogsDialogOpen] = useState(false)

  const handleManageQueue = useCallback((fila: FilaLeads) => {
    setEditingFila(fila)
    setConfigDialogOpen(true)
  }, [])

  const handleSaveFila = useCallback(async (unidadeId: number, vendedores: VendedorFila[]) => {
    await updateFilaVendedores(unidadeId, vendedores)
  }, [updateFilaVendedores])

  const handleRegistroAusencia = useCallback((fila: FilaLeads) => {
    setAusenciasFila(fila)
    setAusenciasDialogOpen(true)
  }, [])

  const handleLogs = useCallback((fila: FilaLeads) => {
    setLogsFila(fila)
    setLogsDialogOpen(true)
  }, [])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecionando para login...</p>
        </div>
      </div>
    )
  }

  if (loading && filas.length === 0) {
    return (
      <>
        <HeaderGestor />
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-[1920px] px-6 py-8">
            <GestorFilaLoading />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <HeaderGestor />
      <div className="min-h-screen bg-background flex flex-col">
        <div className="mx-auto max-w-[1920px] px-6 py-8 flex-1">
          <GestorFilaHeader />

          {error && <GestorFilaError error={error} />}

          {filas.length === 0 ? (
            <GestorFilaEmpty />
          ) : (
            <GestorFilaGrid
              filas={filas}
              onManageQueue={handleManageQueue}
              onRegistroAusencia={handleRegistroAusencia}
              onLogs={handleLogs}
            />
          )}
        </div>
        <AppFooter />
      </div>

      <GestorFilaDialogs
        editingFila={editingFila}
        configDialogOpen={configDialogOpen}
        onConfigDialogChange={setConfigDialogOpen}
        onSaveFila={handleSaveFila}
        ausenciasFila={ausenciasFila}
        ausenciasDialogOpen={ausenciasDialogOpen}
        onAusenciasDialogChange={setAusenciasDialogOpen}
        logsFila={logsFila}
        logsDialogOpen={logsDialogOpen}
        onLogsDialogChange={setLogsDialogOpen}
      />
    </>
  )
}

