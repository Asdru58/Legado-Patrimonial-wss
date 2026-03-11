"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ConferenciaConMultimedia, Multimedia } from "@/types";

interface UseConferenciasResult {
    conferencias: ConferenciaConMultimedia[];
    loading: boolean;
    error: string | null;
}

/**
 * Hook para obtener conferencias con su multimedia vinculada
 * desde Supabase (client-side).
 */
export function useConferencias(): UseConferenciasResult {
    const [conferencias, setConferencias] = useState<ConferenciaConMultimedia[]>([]);
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
            titulo,
            fecha_impartida,
            lugar,
            created_at,
            multimedia (
              id,
              conferencia_id,
              audio_url,
              video_url,
              pdf_url
            )
          `)
                    .order("fecha_impartida", { ascending: false });

                if (cancelled) return;

                if (fetchError) {
                    setError(fetchError.message);
                    setLoading(false);
                    return;
                }

                // Supabase returns multimedia as array; take the first item
                const mapped: ConferenciaConMultimedia[] = (data ?? []).map((item) => {
                    const multimediaRaw = item.multimedia;
                    let multimedia: Multimedia | null = null;

                    if (Array.isArray(multimediaRaw) && multimediaRaw.length > 0) {
                        multimedia = multimediaRaw[0] as Multimedia;
                    } else if (multimediaRaw && !Array.isArray(multimediaRaw)) {
                        multimedia = multimediaRaw as Multimedia;
                    }

                    return {
                        id: item.id,
                        titulo: item.titulo,
                        fecha_impartida: item.fecha_impartida,
                        lugar: item.lugar,
                        created_at: item.created_at,
                        multimedia,
                    };
                });

                setConferencias(mapped);
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
