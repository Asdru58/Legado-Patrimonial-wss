import type { Metadata } from 'next'
import { Cormorant_Garamond, DM_Sans } from 'next/font/google'
import { AdminSidebar } from './admin-sidebar'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  variable: '--font-cormorant',
  display: 'swap',
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-sans',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Admin — Legado Patrimonial WSS',
  description: 'Panel de administración del archivo patrimonial.',
  robots: { index: false, follow: false },
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      className={`
        ${cormorant.variable} ${dmSans.variable}
        min-h-screen bg-[#0A0A0B]
      `}
    >
      <AdminSidebar />
      <main className="ml-[240px] min-h-screen">
        <div className="p-8 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}
