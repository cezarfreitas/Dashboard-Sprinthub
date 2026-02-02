import { ReactNode } from 'react'
import './globals.css'

export const metadata = {
  title: 'Painel TV - Dashboard Comercial',
  description: 'Dashboard otimizado para TVs em modo retrato 1080x1920',
}

export default function TVLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <style jsx global>{`
        /* Reset e configuração base para 1080x1920 */
        html, body {
          width: 1080px;
          height: 1920px;
          margin: 0;
          padding: 0;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        /* Container principal */
        .min-h-screen, .h-screen {
          width: 1080px !important;
          min-height: 1920px !important;
        }
        
        /* Cards de estatísticas - otimizado para vertical */
        [class*="bg-gradient-to-br"],
        [class*="bg-gradient-to-r"] {
          min-height: 140px !important;
          max-height: 180px !important;
          padding: 1.25rem 1rem !important;
          border-radius: 1rem !important;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3) !important;
          overflow: hidden !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        
        /* Ajuste específico para cards do painel */
        [class*="rounded-lg"],
        [class*="rounded-xl"],
        [class*="rounded-2xl"] {
          max-width: 100% !important;
          overflow: hidden !important;
        }
        
        /* CRÍTICO: Grid de 3 colunas (Abertas/Ganhas/Perdidas) */
        [class*="grid"][class*="grid-cols-3"] {
          width: 100% !important;
          display: grid !important;
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 0.25rem !important;
        }
        
        [class*="grid"][class*="grid-cols-3"] > * {
          min-width: 0 !important;
          width: 100% !important;
          overflow: hidden !important;
        }
        
        /* Valores R$ dentro do grid - SUPER COMPACTOS */
        [class*="grid-cols-3"] [class*="R$"],
        [class*="grid-cols-3"] *:contains("R$") {
          font-size: 0.5rem !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
        }
        
        /* Textos de valores - ajustados para não estourar */
        [class*="text-xs"] { font-size: 0.75rem !important; line-height: 1.2 !important; }
        [class*="text-sm"] { font-size: 0.875rem !important; line-height: 1.3 !important; }
        [class*="text-base"] { font-size: 1rem !important; line-height: 1.4 !important; }
        [class*="text-lg"] { font-size: 1.125rem !important; line-height: 1.4 !important; }
        [class*="text-xl"] { font-size: 1.25rem !important; line-height: 1.3 !important; }
        [class*="text-2xl"] { font-size: 1.5rem !important; line-height: 1.2 !important; }
        [class*="text-3xl"] { font-size: 1.875rem !important; line-height: 1.2 !important; }
        [class*="text-4xl"] { font-size: 2.25rem !important; line-height: 1.1 !important; }
        [class*="text-5xl"] { font-size: 2.75rem !important; line-height: 1.1 !important; }
        [class*="text-6xl"] { font-size: 3rem !important; line-height: 1 !important; }
        
        /* Ícones proporcionais */
        svg {
          width: 2rem !important;
          height: 2rem !important;
          flex-shrink: 0 !important;
        }
        
        /* Espaçamentos otimizados */
        .space-y-5 > * + * { margin-top: 1.5rem !important; }
        .space-y-6 > * + * { margin-top: 1.75rem !important; }
        .space-y-8 > * + * { margin-top: 2rem !important; }
        .gap-4 { gap: 1.25rem !important; }
        .gap-6 { gap: 1.5rem !important; }
        .p-2 { padding: 0.75rem !important; }
        .p-3 { padding: 1rem !important; }
        .p-4 { padding: 1.25rem !important; }
        .p-6 { padding: 1.5rem !important; }
        .p-8 { padding: 2rem !important; }
        
        /* Margens reduzidas */
        .mb-1, .mt-1 { margin: 0.375rem !important; }
        .mb-2, .mt-2 { margin: 0.5rem !important; }
        .mb-4, .mt-4 { margin: 0.75rem !important; }
        .mb-6, .mt-6 { margin: 1rem !important; }
        .mb-8, .mt-8 { margin: 1.25rem !important; }
        
        /* Prevenir overflow de texto */
        * {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        
        /* Truncar textos longos */
        h1, h2, h3, h4, h5, h6, p, span {
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        /* Container de cards com overflow controlado */
        [class*="rounded-"] {
          position: relative;
          overflow: hidden;
        }
        
        /* Bordas arredondadas */
        [class*="rounded-"] {
          border-radius: 1.5rem !important;
        }
        
        /* Scrollbar customizado */
        ::-webkit-scrollbar {
          width: 12px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 6px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.5);
        }
        
        /* Animações suaves */
        * {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Remove seleção de texto (para TV) */
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          user-select: none;
          cursor: default;
        }
        
        /* Grid de unidades - otimizado para portrait */
        [class*="grid-cols-"] {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 1rem !important;
        }
        
        /* Cards de unidades - mais compactos */
        [class*="rounded-2xl"] {
          padding: 1rem !important;
          border-radius: 1rem !important;
        }
        
        /* Layout interno dos cards de unidades */
        [class*="flex"][class*="items-center"] {
          gap: 0.75rem !important;
        }
        
        /* Números grandes nos cards de unidades */
        [class*="text-"][class*="font-bold"] {
          font-size: 1.5rem !important;
        }
        
        /* Títulos de seção */
        h2[class*="text-"] {
          font-size: 3.5rem !important;
          font-weight: 900 !important;
          letter-spacing: -0.02em !important;
        }
        
        /* Cards de progresso e barras */
        [class*="progress"] {
          height: 3rem !important;
          border-radius: 1.5rem !important;
        }
        
        /* Badges e tags */
        [class*="badge"], [class*="rounded-full"] {
          padding: 1rem 1.5rem !important;
          font-size: 1.5rem !important;
        }
      `}</style>
    </>
  )
}
