import type { LucideIcon } from 'lucide-react'
import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

type QuickAccessButtonProps = {
  href: string
  icon: LucideIcon
  label: string
  sublabel: string
}

export function QuickAccessButton({
  href,
  icon: Icon,
  label,
  sublabel,
}: QuickAccessButtonProps) {
  return (
    <Link
      href={href}
      className="group flex min-h-[80px] items-center gap-4 rounded-xl border border-[rgba(200,168,67,0.18)] bg-[rgba(200,168,67,0.05)] px-4 py-3 text-[#E8DCC8] transition-colors hover:border-[rgba(223,192,106,0.5)] hover:bg-[rgba(200,168,67,0.1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DFC06A]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[rgba(200,168,67,0.12)] text-[#DFC06A]">
        <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={1.6} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-sm font-semibold">{label}</span>
        <span className="text-xs leading-5 text-[rgba(232,220,200,0.55)]">
          {sublabel}
        </span>
      </span>
      <ArrowRight
        aria-hidden="true"
        className="h-4 w-4 shrink-0 text-[rgba(232,220,200,0.45)] transition-transform group-hover:translate-x-1 group-hover:text-[#DFC06A]"
        strokeWidth={1.6}
      />
    </Link>
  )
}
