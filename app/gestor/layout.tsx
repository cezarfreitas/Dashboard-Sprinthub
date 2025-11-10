import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Área do Gestor - Dash Inteli',
  description: 'Área administrativa para gestores de unidade',
}

export default function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
}
