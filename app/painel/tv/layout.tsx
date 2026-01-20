import { ReactNode } from 'react'

export const metadata = {
  title: 'Painel TV - Dashboard Comercial',
  description: 'Dashboard otimizado para TVs em modo retrato',
}

export default function TVLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style jsx global>{`
        /* Otimizações para TV em modo retrato */
        @media (orientation: portrait) {
          body {
            overflow-y: auto;
            overflow-x: hidden;
          }
          
          /* Cards maiores e mais legíveis */
          [class*="rounded-"] {
            border-radius: 1rem !important;
          }
          
          /* Fontes maiores para visualização à distância */
          h1 { font-size: 3.5rem !important; }
          h2 { font-size: 2.5rem !important; }
          h3 { font-size: 1.75rem !important; }
          
          /* Cards de estatísticas maiores */
          .bg-gradient-to-br {
            padding: 2rem !important;
            min-height: 200px;
          }
          
          /* Textos de valores maiores */
          [class*="text-3xl"], [class*="text-4xl"] {
            font-size: 3rem !important;
            line-height: 1.2;
          }
          
          /* Espaçamento generoso */
          .space-y-6 > * + * {
            margin-top: 2rem;
          }
          
          .gap-4 {
            gap: 1.5rem;
          }
        }
        
        /* Modo paisagem - layout horizontal */
        @media (orientation: landscape) {
          .grid-cols-2 {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        
        /* Animações suaves */
        * {
          transition: all 0.3s ease-in-out;
        }
        
        /* Remove seleção de texto (para TV) */
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
        }
      `}</style>
    </>
  )
}
