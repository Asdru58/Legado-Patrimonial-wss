import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginForm } from './login-form'

export const dynamic = 'force-dynamic'

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { redirectTo } = await searchParams

  const supabase = await createClient()
  const { data } = await supabase.auth.getClaims()

  if (data?.claims?.app_metadata?.role === 'admin') {
    const safePath =
      redirectTo && redirectTo.startsWith('/admin') ? redirectTo : '/admin'
    redirect(safePath)
  }

  return (
    <main className="min-h-screen bg-[#0A0A0B] relative flex items-center justify-center overflow-hidden selection:bg-[#C8A843]/20 selection:text-[#C8A843]">
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 40%, rgba(180,145,50,0.045) 0%, transparent 70%)',
        }}
      />

      <div
        className="absolute inset-0 opacity-[0.018] pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-[420px] px-6">
        <header className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-8">
            <span className="block w-10 h-px bg-[#C8A843]/30" />
            <span
              className="
                font-[family-name:var(--font-dm-sans)]
                text-[10px] font-medium tracking-[0.35em] uppercase
                text-[#C8A843]/50
              "
            >
              Acceso Restringido
            </span>
            <span className="block w-10 h-px bg-[#C8A843]/30" />
          </div>

          <h1
            className="
              font-[family-name:var(--font-cormorant)]
              text-[2.5rem] leading-none font-light
              text-white/90 tracking-wide
            "
          >
            Legado Patrimonial
          </h1>

          <p
            className="
              font-[family-name:var(--font-cormorant)]
              text-lg font-light text-white/25
              mt-2 tracking-[0.4em]
            "
          >
            W. S. S.
          </p>
        </header>

        <div
          className="
            border border-white/[0.06]
            bg-white/[0.015] backdrop-blur-sm
            rounded-sm p-8
          "
        >
          <LoginForm redirectTo={redirectTo} />
        </div>

        <footer className="text-center mt-10">
          <p
            className="
              font-[family-name:var(--font-dm-sans)]
              text-[10px] text-white/15 tracking-[0.2em]
            "
          >
            Sesión protegida por JWT &middot; Supabase Auth
          </p>
        </footer>
      </div>
    </main>
  )
}
