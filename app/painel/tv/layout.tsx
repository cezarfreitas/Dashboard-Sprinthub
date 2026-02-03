import { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Painel TV - Dashboard Comercial',
  description: 'Dashboard otimizado para TVs em modo retrato 1080x1920',
}

export default function TVLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
