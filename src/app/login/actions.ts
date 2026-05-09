'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface LoginState {
  error: string | null
}

export async function login(
  _prevState: LoginState | null,
  formData: FormData
): Promise<LoginState> {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const redirectTo = formData.get('redirectTo') as string

  if (!email || !password) {
    return { error: 'Correo y contraseña son obligatorios.' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'Credenciales inválidas. Verifique sus datos.' }
  }

  const safePath =
    redirectTo && redirectTo.startsWith('/admin') ? redirectTo : '/admin'

  redirect(safePath)
}
