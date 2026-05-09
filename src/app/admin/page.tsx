import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Metric {
  label: string
  value: string | number
  detail: string
}

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [totalRes, activosRes, pendientesRes] = await Promise.all([
    supabase
      .from('conferencias')
      .select('*', { count: 'exact', head: true }),
    supabase
      .from('conferencias')
      .select('*', { count: 'exact', head: true })
      .eq('video_status', 'active'),
    supabase
      .from('conferencias')
      .select('*', { count: 'exact', head: true })
      .eq('video_status', 'pending'),
  ])

  const metrics: Metric[] = [
    {
      label: 'Total conferencias',
      value: totalRes.count ?? 0,
      detail: 'Registros en el archivo',
    },
    {
      label: 'Videos activos',
      value: activosRes.count ?? 0,
      detail: 'Disponibles para el público',
    },
    {
      label: 'Videos pendientes',
      value: pendientesRes.count ?? 0,
      detail: 'En espera de procesamiento',
    },
  ]

  return (
    <div>
      <header className="mb-10">
        <div className="inline-flex items-center gap-3 mb-4">
          <span className="block w-8 h-px bg-[#C8A843]/40" />
          <span
            className="
              font-[family-name:var(--font-dm-sans)]
              text-xs font-medium tracking-[0.25em] uppercase
              text-[#C8A843]/70
            "
          >
            Panel de control
          </span>
        </div>
        <h1
          className="
            font-[family-name:var(--font-cormorant)]
            text-3xl font-light text-white/95 tracking-wide
          "
        >
          Bienvenido al Archivo
        </h1>
        <p
          className="
            font-[family-name:var(--font-dm-sans)]
            text-sm text-white/60 mt-2
          "
        >
          Estado actual del acervo patrimonial.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="
              border border-white/[0.08] bg-white/[0.02]
              rounded-sm p-6
              transition-all duration-300
              hover:border-white/[0.14] hover:bg-white/[0.035]
            "
          >
            <p
              className="
                font-[family-name:var(--font-dm-sans)]
                text-xs font-medium tracking-[0.18em] uppercase
                text-white/60 mb-3
              "
            >
              {metric.label}
            </p>
            <p
              className="
                font-[family-name:var(--font-cormorant)]
                text-4xl font-light text-[#C8A843]/90
                leading-none mb-2
              "
            >
              {metric.value}
            </p>
            <p
              className="
                font-[family-name:var(--font-dm-sans)]
                text-xs text-white/50
              "
            >
              {metric.detail}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 border border-dashed border-white/[0.08] rounded-sm p-8 text-center">
        <p
          className="
            font-[family-name:var(--font-dm-sans)]
            text-sm text-white/40 tracking-wide
          "
        >
          El módulo CRUD de conferencias se construirá en la siguiente iteración.
        </p>
      </div>
    </div>
  )
}
