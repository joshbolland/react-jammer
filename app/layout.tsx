import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Navbar } from '@/components/Navbar'
import { AuthProvider } from '@/components/AuthProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jammer - Find Musicians to Play With',
  description: 'Connect with local musicians for casual jams and form bands',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gradient-to-br from-[#f4f1ff] via-[#faf9ff] to-white text-slate-900`}
        suppressHydrationWarning
      >
        <AuthProvider>
          <div className="relative overflow-hidden">
            <Navbar />
            <main className="min-h-screen pt-24">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
