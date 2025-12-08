import { useState, useEffect } from 'react'
import { hexToHsl, isValidHexColor } from '@/lib/color-utils'
import { normalizeLogoUrl } from '@/lib/logo-utils'

interface EmpresaConfig {
  nome: string
  logotipo: string
  corPrincipal: string
}

export function useEmpresaConfig() {
  const [config, setConfig] = useState<EmpresaConfig | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/configuracoes/empresa/public', {
          cache: 'no-store'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            const corPrincipal = data.config.corPrincipal || '#3b82f6'
            
            setConfig({
              nome: data.config.nome || 'Grupo Inteli',
              logotipo: normalizeLogoUrl(data.config.logotipo),
              corPrincipal
            })

            // Aplicar cor principal no CSS
            if (isValidHexColor(corPrincipal)) {
              const root = document.documentElement
              const hsl = hexToHsl(corPrincipal)
              root.style.setProperty('--primary', hsl)
              root.style.setProperty('--ring', hsl)
            }
          } else {
            // Se API retornou erro, usar config padrão
            setConfig({
              nome: 'Grupo Inteli',
              logotipo: '',
              corPrincipal: '#3b82f6'
            })
          }
        } else {
          // Se API não respondeu OK, usar config padrão
          setConfig({
            nome: 'Grupo Inteli',
            logotipo: '',
            corPrincipal: '#3b82f6'
          })
        }
      } catch (error) {
        // Se falhou completamente, usar config padrão
        setConfig({
          nome: 'Grupo Inteli',
          logotipo: '',
          corPrincipal: '#3b82f6'
        })
      } finally {
        setLoading(false)
      }
    }

    loadConfig()
  }, [])

  return { config, loading }
}

