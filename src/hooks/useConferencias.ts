"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Conferencia } from "@/types/database";

interface UseConferenciasResult {
    conferencias: Conferencia[];
    loading: boolean;
    error: string | null;
}

/**
 * Hook para obtener conferencias recientes desde Supabase (client-side).
 *
 * Actualizado: usa el schema plano post-R-3 (sin tabla multimedia).
 * Trae las últimas 20 conferencias ordenadas por fecha.
 */
export function useConferencias(): UseConferenciasResult {
    const [conferencias, setConferencias] = useState<Conferencia[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        async function fetchConferencias() {
            try {
                const supabase = createClient();

                const { data, error: fetchError } = await supabase
                    .from("conferencias")
                    .select(`
                        id,
                        slug,
                        titulo,
                        extracto,
                        descripcion,
                        fecha_impartida,
                        ponente_nombre,
                        ponente_rol,
                        audio_url,
                        audio_duracion,
                        pdf_url,
                        video_provider,
                        video_provider_id,
                        video_status,
                        video_fallback_provider,
                        video_fallback_url,
                        video_checked_at,
                        created_at,
                        updated_at
                    `)
                    .order("fecha_impartida", { ascending: false })
                    .limit(20);

                if (cancelled) return;

                if (fetchError) {
                    setError(fetchError.message);
                    setLoading(false);
                    return;
                }

                setConferencias((data ?? []) as Conferencia[]);
                setLoading(false);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Error desconocido");
                    setLoading(false);
                }
            }
        }

        fetchConferencias();
        return () => { cancelled = true; };
    }, []);

    return { conferencias, loading, error };
}
