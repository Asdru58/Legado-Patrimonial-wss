'use client'

import { useActionState, useState } from 'react'
import { login, type LoginState } from './actions'

interface LoginFormProps {
  redirectTo?: string
}

export function LoginForm({ redirectTo }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState<LoginState | null, FormData>(
    login,
    null
  )
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="redirectTo" value={redirectTo ?? ''} />

      {state?.error && (
        <div
          role="alert"
          className="
            flex items-center gap-3 px-4 py-3
            border border-red-500/20 bg-red-500/[0.06] rounded-sm
            font-[family-name:var(--font-dm-sans)] text-sm text-red-400/90
          "
        >
          <svg
            className="w-4 h-4 shrink-0 text-red-400/70"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
            />
          </svg>
          {state.error}
        </div>
      )}

      <div className="space-y-2">
        <label
          htmlFor="email"
          className="
            block font-[family-name:var(--font-dm-sans)]
            text-[11px] font-medium tracking-[0.15em] uppercase text-white/40
          "
        >
          Correo electrónico
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="admin@legadowss.org"
          disabled={isPending}
          className="
            w-full px-4 py-3
            bg-white/[0.03] border border-white/[0.08]
            rounded-sm text-white/90 placeholder:text-white/15
            font-[family-name:var(--font-dm-sans)] text-sm
            outline-none transition-all duration-300
            focus:border-[#C8A843]/40 focus:bg-white/[0.05]
            focus:ring-1 focus:ring-[#C8A843]/20
            disabled:opacity-40 disabled:cursor-not-allowed
          "
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="
            block font-[family-name:var(--font-dm-sans)]
            text-[11px] font-medium tracking-[0.15em] uppercase text-white/40
          "
        >
          Contraseña
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="current-password"
            disabled={isPending}
            className="
              w-full px-4 py-3 pr-16
              bg-white/[0.03] border border-white/[0.08]
              rounded-sm text-white/90
              font-[family-name:var(--font-dm-sans)] text-sm
              outline-none transition-all duration-300
              focus:border-[#C8A843]/40 focus:bg-white/[0.05]
              focus:ring-1 focus:ring-[#C8A843]/20
              disabled:opacity-40 disabled:cursor-not-allowed
            "
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword(!showPassword)}
            className="
              absolute right-3 top-1/2 -translate-y-1/2
              font-[family-name:var(--font-dm-sans)]
              text-[10px] font-medium tracking-[0.1em] uppercase
              text-white/25 hover:text-[#C8A843]/60
              transition-colors duration-200
            "
          >
            {showPassword ? 'Ocultar' : 'Mostrar'}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="
          relative w-full py-3.5 mt-2
          bg-[#C8A843]/10 border border-[#C8A843]/25
          rounded-sm overflow-hidden group
          font-[family-name:var(--font-dm-sans)]
          text-sm font-medium tracking-[0.15em] uppercase
          text-[#C8A843]/80
          transition-all duration-500
          hover:bg-[#C8A843]/[0.18] hover:border-[#C8A843]/40
          hover:text-[#C8A843]
          disabled:opacity-40 disabled:cursor-not-allowed
          disabled:hover:bg-[#C8A843]/10 disabled:hover:border-[#C8A843]/25
        "
      >
        <span
          className="
            absolute inset-0 -translate-x-full
            bg-gradient-to-r from-transparent via-[#C8A843]/[0.07] to-transparent
            group-hover:translate-x-full transition-transform duration-1000
            pointer-events-none
          "
        />
        <span className="relative z-10">
          {isPending ? (
            <span className="inline-flex items-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12" cy="12" r="10"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Verificando
            </span>
          ) : (
            'Ingresar'
          )}
        </span>
      </button>
    </form>
  )
}
