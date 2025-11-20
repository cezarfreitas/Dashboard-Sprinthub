import type { Metadata } from 'next'
import { Inter, Poppins, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthLayout } from '@/components/auth-layout'
import { ThemeProvider } from '@/components/theme-provider'

// Fonte principal - Inter (suave e moderna)
const inter = Inter({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap'
})

// Fonte alternativa - Poppins (para títulos)
const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap'
})

// Fonte para código - JetBrains Mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_TITLE || 'DASHBOARD SG',
  description: 'Dashboard com sidebar usando shadcn/ui',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${poppins.variable} ${jetbrainsMono.variable}`}>
      <body className="font-inter antialiased bg-background text-foreground">
        <ThemeProvider>
          <AuthLayout>
            {children}
          </AuthLayout>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
