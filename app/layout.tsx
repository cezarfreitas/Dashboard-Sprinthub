import type { Metadata } from 'next'
import { Inter, Poppins, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthLayout } from '@/components/auth-layout'
import GlobalNotifications from '@/components/global-notifications'
import { ThemeProvider } from '@/components/theme-provider'

// Fonte principal - Poppins (moderna e limpa)
const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap'
})

// Fonte para código - JetBrains Mono
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap'
})

// Fallback para Inter
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap'
})

export const metadata: Metadata = {
  title: 'Dashboard Inteli',
  description: 'Dashboard com sidebar usando shadcn/ui',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" className={`${poppins.variable} ${jetbrainsMono.variable} ${inter.variable}`}>
      <body className="font-poppins antialiased bg-background text-foreground">
        <ThemeProvider>
          <AuthLayout>
            {children}
          </AuthLayout>
          <GlobalNotifications />
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
