"use client"

import { useEffect, useState } from 'react'
import { useGlobalNotifications } from '@/hooks/use-global-notifications'
import CelebrationDialog from '@/components/celebration-dialog'

export default function GlobalNotifications() {
  const { lastEvent, isConnected } = useGlobalNotifications()
  const [showCelebration, setShowCelebration] = useState(false)
  const [celebrationData, setCelebrationData] = useState<any>(null)

  useEffect(() => {
    if (lastEvent && lastEvent.type === 'nova_venda') {
      setCelebrationData(lastEvent.data)
      setShowCelebration(true)
    }
  }, [lastEvent])

  return (
    <>
      {/* Indicador de conexão (opcional - pode ser removido) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 z-50">
          <div className={`px-2 py-1 rounded text-xs ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
              : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
          }`}>
            {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
          </div>
        </div>
      )}
      
      {/* Dialog de celebração */}
      <CelebrationDialog
        isOpen={showCelebration}
        onClose={() => setShowCelebration(false)}
        data={celebrationData}
      />
    </>
  )
}
