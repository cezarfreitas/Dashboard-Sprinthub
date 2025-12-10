import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Área do Consultor - Dash Inteli',
  description: 'Área administrativa para consultores de vendas',
}

export default function ConsultorLayout({
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

