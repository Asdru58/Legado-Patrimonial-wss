import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Crea un cliente Supabase para Server Components / Route Handlers.
 * Utiliza `next/headers` para gestionar cookies de sesión,
 * habilitando SSR, SEO y metadata dinámica de forma segura.
 *
 * ⚠️ Solo llamar desde contextos de servidor (Server Components,
 *    Route Handlers, Server Actions).
 */
export async function createServerSupabaseClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // Llamado desde un Server Component de solo lectura.
                        // Se puede ignorar si el middleware refresca las sesiones.
                    }
                },
            },
        }
    );
}
