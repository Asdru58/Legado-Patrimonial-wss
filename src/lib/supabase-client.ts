import { createClient } from '@supabase/supabase-js';

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente Supabase para Client Components (browser).
 * Singleton reutilizable — no crea instancias duplicadas.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
