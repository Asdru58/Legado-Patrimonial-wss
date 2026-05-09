# Auditoria Arquitectonica — Legado Patrimonial WSS
> Generado: 2026-03-24 11:39:17

---

## docs/MASTER_PLAN.md

```markdown
# 📜 MASTER PLAN — Legado Patrimonial WSS

> **Fase 5: Expansión Institucional y Optimización de Arquitectura**
> Fecha de inicio: 5 de marzo de 2026
> Estado: En planificación

---

## 1. Visión General

El proyecto **Legado Patrimonial WSS** escala de un catálogo de pruebas a un **portal web documental de alto rendimiento**. El archivo comprende material desde **1978 hasta 2026** en formatos de **Audio, Video y PDF**, lo que exige una arquitectura optimizada para consultas masivas y una experiencia de usuario premium.

### Design System (heredado)

| Token | Valor |
|-------|-------|
| Modo | **Dark Mode** obligatorio |
| Estilo visual | **Glassmorphism** |
| Color de acento | **Dorado** (`#D4AF37` / variantes HSL) |
| Tipografía | Inter / Outfit (Google Fonts) |

---

## 2. Arquitectura de Rutas (UI/UX)

Todas las secciones son accesibles desde un **Navbar centralizado** que respeta el Design System.

| Ruta | Sección | Descripción |
|------|---------|-------------|
| `/` | **Inicio** | Buscador global, feed "Continuar escuchando", últimas publicaciones |
| `/el-legado` | **El Legado (Quiénes somos)** | Identidad institucional y propósito del archivo |
| `/archivo` | **Archivo Cronológico** | Motor principal de BD — navegación jerárquica |
| `/estudios` | **Estudios Temáticos** | Colecciones agrupadas (Ej. Las Siete Edades, Los Sellos) |
| `/alabanza` | **Alabanza y Adoración** | Hub musical conectado al reproductor persistente |
| `/podcast` | **Podcast** | Estudios semanales en formato diálogo/entrevista sobre textos proféticos (audio y video) |
| `/blog` | **Blog** | Artículos y actualizaciones |
| `/admin` | **Panel de Administración** | Acceso privado: carga (upload) y gestión de metadatos en Supabase |

---

## 3. Reglas de Rendimiento y Base de Datos (Supabase)

> [!CAUTION]
> Quedan **estrictamente prohibidas** las consultas planas masivas (`SELECT * FROM conferencias`). Todo acceso a datos debe seguir las reglas a continuación.

### 3.1 Carga Jerárquica — Archivo Cronológico

La ruta `/archivo` implementa una navegación por **paneles progresivos**:

```
Década → Año → Mes → Conferencias
```

- **Panel 1 — Décadas**: Renderizado estático (1970s, 1980s, …, 2020s). Sin consulta a BD.
- **Panel 2 — Años**: Al seleccionar una década, consulta `DISTINCT año` filtrado por rango de década.
- **Panel 3 — Meses**: Al seleccionar un año, consulta `DISTINCT mes` filtrado por año.
- **Panel 4 — Conferencias**: Al seleccionar un mes, consulta la tabla `conferencias` filtrada por año + mes. **Esta es la única consulta que trae registros completos.**

### 3.2 Paginación

- Límite estricto: **20 tarjetas por carga**.
- Implementación: Infinite Scroll o paginación estándar con numeración.
- Cada página solicita `LIMIT 20 OFFSET n` al endpoint de Supabase.

### 3.3 Búsqueda Avanzada — Full-Text Search

- El buscador global utilizará **PostgreSQL Full-Text Search** nativo de Supabase.
- Se abandona el uso de filtros `ilike` por ineficiencia a escala.
- Requiere crear una columna `fts tsvector` en la tabla `conferencias` con un `GIN index`.
- La búsqueda se invoca con `textSearch()` del SDK de Supabase.

### 3.4 Indexación de Metadatos — Citas Bíblicas (Futuro)

- El esquema de BD debe contemplar una tabla o columna para **"Citas Bíblicas Clave"**.
- Caso de uso: Buscar "Apocalipsis 10" → devuelve conferencias asociadas.
- Estructura propuesta:

```sql
-- Tabla futura
CREATE TABLE citas_biblicas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conferencia_id UUID REFERENCES conferencias(id),
  libro TEXT NOT NULL,          -- Ej: "Apocalipsis"
  capitulo INT NOT NULL,        -- Ej: 10
  versiculo_inicio INT,         -- Ej: 1
  versiculo_fin INT,            -- Ej: 7
  texto_referencia TEXT          -- Ej: "Apocalipsis 10:1-7"
);

CREATE INDEX idx_citas_libro_cap ON citas_biblicas(libro, capitulo);
```

---

## 4. Innovaciones del Reproductor Persistente

### 4.1 Memoria de Estado — "Continuar Escuchando"

El componente `PersistentPlayer` **debe obligatoriamente** usar `localStorage` para persistir:

| Clave localStorage | Valor | Descripción |
|---------------------|-------|-------------|
| `lp_current_track` | `{ conferencia_id, titulo, url_audio }` | Conferencia actualmente cargada |
| `lp_playback_position` | `number` (segundos) | Timestamp exacto donde se pausó |
| `lp_playback_updated` | `ISO 8601 string` | Fecha/hora de la última actualización |

**Comportamiento esperado:**
1. Al pausar o cerrar la pestaña → se guarda automáticamente el `currentTime` del `<audio>`.
2. Al recargar la página o volver otro día → el reproductor recupera el estado y posiciona el audio en el segundo exacto.
3. El evento `beforeunload` del navegador se usa como respaldo para guardar el estado al cerrar.

### 4.2 Historial Espiritual

El sistema registra localmente los **últimos 20 mensajes escuchados** para alimentar el feed de la vista de "Inicio".

| Clave localStorage | Valor |
|---------------------|-------|
| `lp_history` | `Array<{ conferencia_id, titulo, fecha_escucha, progreso_pct }>` |

- Máximo 20 entradas (FIFO: al llegar a 20, se elimina la más antigua).
- Se actualiza cada vez que el usuario reproduce un audio durante más de 30 segundos.

---

## 5. Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 15 (App Router, Turbopack) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS + CSS custom |
| Estado global | Zustand |
| Backend/BD | Supabase (PostgreSQL) |
| Auth (futuro) | Supabase Auth |
| Hosting (futuro) | Vercel |
| Almacenamiento media | Supabase Storage |

---

## 6. Estructura de Carpetas (Proyección)

```
src/
├── app/
│   ├── page.tsx                    # Inicio
│   ├── layout.tsx                  # Layout global + PersistentPlayer
│   ├── el-legado/
│   │   └── page.tsx
│   ├── archivo/
│   │   ├── page.tsx                # Panel de décadas
│   │   └── [year]/
│   │       └── [month]/
│   │           └── page.tsx        # Lista de conferencias
│   ├── estudios/
│   │   ├── page.tsx
│   │   └── [coleccion]/
│   │       └── page.tsx
│   ├── alabanza/
│   │   └── page.tsx
│   ├── podcast/
│   │   ├── page.tsx
│   │   └── [episodio]/
│   │       └── page.tsx
│   ├── blog/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   └── admin/
│       ├── page.tsx
│       └── upload/
│           └── page.tsx
├── components/
│   ├── ui/                         # Componentes reutilizables
│   ├── player/                     # PersistentPlayer + controles
│   ├── archivo/                    # Paneles jerárquicos
│   └── layout/                     # Navbar, Footer, Sidebar
├── lib/
│   ├── supabase/                   # Clientes, queries, helpers
│   └── storage.ts                  # Helpers de localStorage
├── store/
│   └── playerStore.ts              # Zustand store
└── types/
    └── database.ts                 # Tipos de BD
```

---

## 7. Fases de Implementación

| Fase | Alcance | Estado |
|------|---------|--------|
| 5.1 | Documento Maestro (este archivo) | 🟡 En progreso |
| 5.2 | Navbar + Rutas base | ⬜ Pendiente |
| 5.3 | Archivo Cronológico (carga jerárquica) | ⬜ Pendiente |
| 5.4 | PersistentPlayer (memoria de estado + historial) | ⬜ Pendiente |
| 5.5 | Páginas de contenido (El Legado, Estudios, Alabanza, Podcast, Blog) | ⬜ Pendiente |
| 5.6 | Búsqueda Full-Text Search | ⬜ Pendiente |
| 5.7 | Panel de Administración | ⬜ Pendiente |
| 5.8 | Optimización y pruebas finales | ⬜ Pendiente |
```

---

## src/store/playerStore.ts

```typescript
"use client";

import { create } from "zustand";
import {
    createJSONStorage,
    persist,
    type StateStorage,
} from "zustand/middleware";

export const PLAYER_LOCAL_STORAGE_KEYS = {
    currentTrack: "lp_current_track",
    playbackPosition: "lp_playback_position",
    playbackUpdated: "lp_playback_updated",
    history: "lp_history",
} as const;

export const PLAYER_HISTORY_LIMIT = 20;
export const PLAYER_HISTORY_MIN_SECONDS = 30;

const PLAYER_PERSIST_NAME = "lp_player_store";
const PLAYER_PERSIST_VERSION = 1;

export type PlayerTrack = {
    conferencia_id: string;
    titulo: string;
    url_audio: string;
};

export type PlayerHistoryEntry = {
    conferencia_id: string;
    titulo: string;
    fecha_escucha: string;
    progreso_pct: number;
};

type PlayerPersistedState = {
    currentTrack: PlayerTrack | null;
    playbackPosition: number;
    playbackUpdated: string | null;
    history: PlayerHistoryEntry[];
};

type PersistEnvelope = {
    state: PlayerPersistedState;
    version: number;
};

export type PlayTrackOptions = {
    autoplay?: boolean;
    startAt?: number | null;
};

export type SyncPlaybackParams = {
    currentTime: number;
    duration?: number | null;
};

export type PlayerStoreState = PlayerPersistedState & {
    isPlaying: boolean;
    hasHydrated: boolean;
    hasRecordedHistoryForCurrentTrack: boolean;
    setHasHydrated: (value: boolean) => void;
    setCurrentTrack: (track: PlayerTrack | null) => void;
    playTrack: (track: PlayerTrack, options?: PlayTrackOptions) => void;
    clearCurrentTrack: () => void;
    setIsPlaying: (value: boolean) => void;
    play: () => void;
    pause: (position?: number) => void;
    togglePlayback: () => void;
    setPlaybackPosition: (position: number) => void;
    savePlaybackState: (position: number) => void;
    syncPlayback: (params: SyncPlaybackParams) => void;
    clearHistory: () => void;
    resetPlayer: () => void;
    hydrate: () => Promise<void>;
};

const INITIAL_PERSISTED_STATE: PlayerPersistedState = {
    currentTrack: null,
    playbackPosition: 0,
    playbackUpdated: null,
    history: [],
};

function canUseDOM(): boolean {
    return (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined"
    );
}

function nowIso(): string {
    return new Date().toISOString();
}

function safeJsonParse<T>(value: string | null): T | null {
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value) as T;
    } catch {
        return null;
    }
}

function sanitizeNonEmptyString(value: unknown): string | null {
    if (typeof value !== "string") {
        return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
}

function sanitizePosition(value: unknown): number {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number(value)
              : Number.NaN;

    if (!Number.isFinite(parsed) || parsed < 0) {
        return 0;
    }

    return parsed;
}

function sanitizeIsoString(value: unknown): string | null {
    const normalized = sanitizeNonEmptyString(value);

    if (!normalized) {
        return null;
    }

    const parsed = new Date(normalized);

    if (Number.isNaN(parsed.valueOf())) {
        return null;
    }

    return parsed.toISOString();
}

function sanitizeProgressPct(value: unknown): number {
    const parsed =
        typeof value === "number"
            ? value
            : typeof value === "string"
              ? Number(value)
              : Number.NaN;

    if (!Number.isFinite(parsed)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(parsed)));
}

function sanitizeTrack(value: unknown): PlayerTrack | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const conferenciaId = sanitizeNonEmptyString(record.conferencia_id);
    const titulo = sanitizeNonEmptyString(record.titulo);
    const urlAudio = sanitizeNonEmptyString(record.url_audio);

    if (!conferenciaId || !titulo || !urlAudio) {
        return null;
    }

    return {
        conferencia_id: conferenciaId,
        titulo,
        url_audio: urlAudio,
    };
}

function sanitizeHistoryEntry(value: unknown): PlayerHistoryEntry | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const record = value as Record<string, unknown>;
    const conferenciaId = sanitizeNonEmptyString(record.conferencia_id);
    const titulo = sanitizeNonEmptyString(record.titulo);
    const fechaEscucha = sanitizeIsoString(record.fecha_escucha);
    const progresoPct = sanitizeProgressPct(record.progreso_pct);

    if (!conferenciaId || !titulo || !fechaEscucha) {
        return null;
    }

    return {
        conferencia_id: conferenciaId,
        titulo,
        fecha_escucha: fechaEscucha,
        progreso_pct: progresoPct,
    };
}

function sanitizeHistory(value: unknown): PlayerHistoryEntry[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalized = value
        .map((entry) => sanitizeHistoryEntry(entry))
        .filter((entry): entry is PlayerHistoryEntry => entry !== null);

    return normalized.slice(-PLAYER_HISTORY_LIMIT);
}

function calculateProgressPct(
    currentTime: number,
    duration?: number | null,
): number {
    const safeCurrentTime = sanitizePosition(currentTime);
    const safeDuration =
        typeof duration === "number" && Number.isFinite(duration) && duration > 0
            ? duration
            : 0;

    if (safeDuration <= 0) {
        return 0;
    }

    const percentage = (safeCurrentTime / safeDuration) * 100;

    return sanitizeProgressPct(percentage);
}

function buildHistoryEntry(
    track: PlayerTrack,
    currentTime: number,
    duration?: number | null,
): PlayerHistoryEntry {
    return {
        conferencia_id: track.conferencia_id,
        titulo: track.titulo,
        fecha_escucha: nowIso(),
        progreso_pct: calculateProgressPct(currentTime, duration),
    };
}

function appendHistoryQueue(
    history: PlayerHistoryEntry[],
    entry: PlayerHistoryEntry,
): PlayerHistoryEntry[] {
    const nextHistory = [...history, entry];

    if (nextHistory.length <= PLAYER_HISTORY_LIMIT) {
        return nextHistory;
    }

    return nextHistory.slice(nextHistory.length - PLAYER_HISTORY_LIMIT);
}

function updateLatestMatchingHistoryEntry(
    history: PlayerHistoryEntry[],
    entry: PlayerHistoryEntry,
): PlayerHistoryEntry[] {
    const nextHistory = [...history];

    for (let index = nextHistory.length - 1; index >= 0; index -= 1) {
        if (nextHistory[index]?.conferencia_id === entry.conferencia_id) {
            nextHistory[index] = entry;
            return nextHistory;
        }
    }

    return appendHistoryQueue(nextHistory, entry);
}

function getPersistedSlice(state: PlayerStoreState): PlayerPersistedState {
    return {
        currentTrack: sanitizeTrack(state.currentTrack),
        playbackPosition: sanitizePosition(state.playbackPosition),
        playbackUpdated: sanitizeIsoString(state.playbackUpdated),
        history: sanitizeHistory(state.history),
    };
}

function readPersistedSnapshot(): PersistEnvelope | null {
    if (!canUseDOM()) {
        return null;
    }

    try {
        const rawCurrentTrack = window.localStorage.getItem(
            PLAYER_LOCAL_STORAGE_KEYS.currentTrack,
        );
        const rawPlaybackPosition = window.localStorage.getItem(
            PLAYER_LOCAL_STORAGE_KEYS.playbackPosition,
        );
        const rawPlaybackUpdated = window.localStorage.getItem(
            PLAYER_LOCAL_STORAGE_KEYS.playbackUpdated,
        );
        const rawHistory = window.localStorage.getItem(
            PLAYER_LOCAL_STORAGE_KEYS.history,
        );

        const hasAnyPersistedValue =
            rawCurrentTrack !== null ||
            rawPlaybackPosition !== null ||
            rawPlaybackUpdated !== null ||
            rawHistory !== null;

        if (!hasAnyPersistedValue) {
            return null;
        }

        const currentTrack = sanitizeTrack(
            safeJsonParse<unknown>(rawCurrentTrack),
        );
        const playbackPosition = sanitizePosition(rawPlaybackPosition);
        const playbackUpdated = sanitizeIsoString(rawPlaybackUpdated);
        const history = sanitizeHistory(safeJsonParse<unknown>(rawHistory));

        return {
            version: PLAYER_PERSIST_VERSION,
            state: {
                currentTrack,
                playbackPosition,
                playbackUpdated,
                history,
            },
        };
    } catch {
        return null;
    }
}

function writePersistedSnapshot(state: PlayerPersistedState): void {
    if (!canUseDOM()) {
        return;
    }

    try {
        if (state.currentTrack) {
            window.localStorage.setItem(
                PLAYER_LOCAL_STORAGE_KEYS.currentTrack,
                JSON.stringify(state.currentTrack),
            );
        } else {
            window.localStorage.removeItem(
                PLAYER_LOCAL_STORAGE_KEYS.currentTrack,
            );
        }

        window.localStorage.setItem(
            PLAYER_LOCAL_STORAGE_KEYS.playbackPosition,
            String(sanitizePosition(state.playbackPosition)),
        );

        if (state.playbackUpdated) {
            window.localStorage.setItem(
                PLAYER_LOCAL_STORAGE_KEYS.playbackUpdated,
                state.playbackUpdated,
            );
        } else {
            window.localStorage.removeItem(
                PLAYER_LOCAL_STORAGE_KEYS.playbackUpdated,
            );
        }

        window.localStorage.setItem(
            PLAYER_LOCAL_STORAGE_KEYS.history,
            JSON.stringify(sanitizeHistory(state.history)),
        );
    } catch {
        // Silencio deliberado: no bloquear la UI por fallos de localStorage.
    }
}

function clearPersistedSnapshot(): void {
    if (!canUseDOM()) {
        return;
    }

    try {
        window.localStorage.removeItem(PLAYER_LOCAL_STORAGE_KEYS.currentTrack);
        window.localStorage.removeItem(
            PLAYER_LOCAL_STORAGE_KEYS.playbackPosition,
        );
        window.localStorage.removeItem(
            PLAYER_LOCAL_STORAGE_KEYS.playbackUpdated,
        );
        window.localStorage.removeItem(PLAYER_LOCAL_STORAGE_KEYS.history);
    } catch {
        // Silencio deliberado: no bloquear la UI por fallos de localStorage.
    }
}

const multiKeyPlayerStorage: StateStorage = {
    getItem: async () => {
        const snapshot = readPersistedSnapshot();

        return snapshot ? JSON.stringify(snapshot) : null;
    },
    setItem: async (_name, value) => {
        const parsed = safeJsonParse<PersistEnvelope>(value);

        if (!parsed?.state) {
            return;
        }

        writePersistedSnapshot({
            currentTrack: sanitizeTrack(parsed.state.currentTrack),
            playbackPosition: sanitizePosition(parsed.state.playbackPosition),
            playbackUpdated: sanitizeIsoString(parsed.state.playbackUpdated),
            history: sanitizeHistory(parsed.state.history),
        });
    },
    removeItem: async () => {
        clearPersistedSnapshot();
    },
};

export const usePlayerStore = create<PlayerStoreState>()(
    persist(
        (set, get) => ({
            ...INITIAL_PERSISTED_STATE,
            isPlaying: false,
            hasHydrated: false,
            hasRecordedHistoryForCurrentTrack: false,

            setHasHydrated: (value) => {
                set({ hasHydrated: value });
            },

            setCurrentTrack: (track) => {
                set((state) => {
                    const nextTrack = sanitizeTrack(track);

                    if (!nextTrack) {
                        return {
                            currentTrack: null,
                            playbackPosition: 0,
                            playbackUpdated: null,
                            isPlaying: false,
                            hasRecordedHistoryForCurrentTrack: false,
                        };
                    }

                    const isSameTrack =
                        state.currentTrack?.conferencia_id ===
                        nextTrack.conferencia_id;

                    return {
                        currentTrack: nextTrack,
                        playbackPosition: isSameTrack
                            ? state.playbackPosition
                            : 0,
                        playbackUpdated: nowIso(),
                        isPlaying: false,
                        hasRecordedHistoryForCurrentTrack: isSameTrack
                            ? state.hasRecordedHistoryForCurrentTrack
                            : false,
                    };
                });
            },

            playTrack: (track, options) => {
                set((state) => {
                    const nextTrack = sanitizeTrack(track);

                    if (!nextTrack) {
                        return state;
                    }

                    const isSameTrack =
                        state.currentTrack?.conferencia_id ===
                        nextTrack.conferencia_id;

                    const nextPosition =
                        options?.startAt !== null &&
                        options?.startAt !== undefined
                            ? sanitizePosition(options.startAt)
                            : isSameTrack
                              ? state.playbackPosition
                              : 0;

                    return {
                        currentTrack: nextTrack,
                        playbackPosition: nextPosition,
                        playbackUpdated: nowIso(),
                        isPlaying: options?.autoplay ?? true,
                        hasRecordedHistoryForCurrentTrack: isSameTrack
                            ? state.hasRecordedHistoryForCurrentTrack
                            : false,
                    };
                });
            },

            clearCurrentTrack: () => {
                set({
                    currentTrack: null,
                    playbackPosition: 0,
                    playbackUpdated: null,
                    isPlaying: false,
                    hasRecordedHistoryForCurrentTrack: false,
                });
            },

            setIsPlaying: (value) => {
                set({ isPlaying: value });
            },

            play: () => {
                set({ isPlaying: true });
            },

            pause: (position) => {
                set((state) => ({
                    isPlaying: false,
                    playbackPosition:
                        position === undefined
                            ? state.playbackPosition
                            : sanitizePosition(position),
                    playbackUpdated: nowIso(),
                }));
            },

            togglePlayback: () => {
                set((state) => ({ isPlaying: !state.isPlaying }));
            },

            setPlaybackPosition: (position) => {
                set({
                    playbackPosition: sanitizePosition(position),
                    playbackUpdated: nowIso(),
                });
            },

            savePlaybackState: (position) => {
                set({
                    playbackPosition: sanitizePosition(position),
                    playbackUpdated: nowIso(),
                });
            },

            syncPlayback: ({ currentTime, duration }) => {
                set((state) => {
                    const nextPosition = sanitizePosition(currentTime);
                    const nextUpdated = nowIso();
                    const activeTrack = state.currentTrack;

                    if (!activeTrack) {
                        return {
                            playbackPosition: nextPosition,
                            playbackUpdated: nextUpdated,
                        };
                    }

                    if (nextPosition < PLAYER_HISTORY_MIN_SECONDS) {
                        return {
                            playbackPosition: nextPosition,
                            playbackUpdated: nextUpdated,
                        };
                    }

                    const historyEntry = buildHistoryEntry(
                        activeTrack,
                        nextPosition,
                        duration,
                    );

                    if (!state.hasRecordedHistoryForCurrentTrack) {
                        return {
                            playbackPosition: nextPosition,
                            playbackUpdated: nextUpdated,
                            history: appendHistoryQueue(
                                state.history,
                                historyEntry,
                            ),
                            hasRecordedHistoryForCurrentTrack: true,
                        };
                    }

                    return {
                        playbackPosition: nextPosition,
                        playbackUpdated: nextUpdated,
                        history: updateLatestMatchingHistoryEntry(
                            state.history,
                            historyEntry,
                        ),
                    };
                });
            },

            clearHistory: () => {
                set({ history: [] });
            },

            resetPlayer: () => {
                clearPersistedSnapshot();

                set({
                    ...INITIAL_PERSISTED_STATE,
                    isPlaying: false,
                    hasHydrated: true,
                    hasRecordedHistoryForCurrentTrack: false,
                });
            },

            hydrate: async () => {
                await usePlayerStore.persist.rehydrate();
            },
        }),
        {
            name: PLAYER_PERSIST_NAME,
            version: PLAYER_PERSIST_VERSION,
            storage: createJSONStorage(() => multiKeyPlayerStorage),
            partialize: (state) => getPersistedSlice(state),
            onRehydrateStorage: () => (state) => {
                state?.setHasHydrated(true);
            },
        },
    ),
);

function flushStoreSnapshotToLocalStorage(): void {
    writePersistedSnapshot(getPersistedSlice(usePlayerStore.getState()));
}

function registerPersistenceLifecycle(): void {
    if (!canUseDOM()) {
        return;
    }

    const guardedWindow = window as Window & {
        __lpPlayerStorePersistenceBound__?: boolean;
    };

    if (guardedWindow.__lpPlayerStorePersistenceBound__) {
        return;
    }

    const flush = () => {
        flushStoreSnapshotToLocalStorage();
    };

    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);

    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") {
            flush();
        }
    });

    guardedWindow.__lpPlayerStorePersistenceBound__ = true;
}

registerPersistenceLifecycle();
```

---

## src/components/player/PersistentPlayer.tsx

```tsx
"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
} from "react";
import { useShallow } from "zustand/react/shallow";
import { usePlayerStore } from "@/store/playerStore";

const SYNC_INTERVAL_SECONDS = 5;

function normalizeTime(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
        return 0;
    }

    return value;
}

function getAudioDuration(audio: HTMLAudioElement | null): number {
    if (!audio) {
        return 0;
    }

    return normalizeTime(audio.duration);
}

function formatTime(value: number): string {
    const totalSeconds = Math.floor(normalizeTime(value));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function PersistentPlayer() {
    const {
        currentTrack,
        playbackPosition,
        isPlaying,
        hasHydrated,
        hydrate,
        play,
        pause,
        clearCurrentTrack,
        setIsPlaying,
        savePlaybackState,
        syncPlayback,
    } = usePlayerStore(
        useShallow((state) => ({
            currentTrack: state.currentTrack,
            playbackPosition: state.playbackPosition,
            isPlaying: state.isPlaying,
            hasHydrated: state.hasHydrated,
            hydrate: state.hydrate,
            play: state.play,
            pause: state.pause,
            clearCurrentTrack: state.clearCurrentTrack,
            setIsPlaying: state.setIsPlaying,
            savePlaybackState: state.savePlaybackState,
            syncPlayback: state.syncPlayback,
        })),
    );

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const durationRef = useRef(0);
    const lastSyncedSecondRef = useRef(0);
    const pendingInitialSeekRef = useRef(false);
    const isEndingRef = useRef(false);

    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    useEffect(() => {
        if (!hasHydrated) {
            void hydrate();
        }
    }, [hasHydrated, hydrate]);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        if (!currentTrack) {
            setCurrentTime(0);
            setDuration(0);
            durationRef.current = 0;
            lastSyncedSecondRef.current = 0;
            pendingInitialSeekRef.current = false;

            if (audioRef.current && !audioRef.current.paused) {
                audioRef.current.pause();
            }

            return;
        }

        setCurrentTime(normalizeTime(playbackPosition));
        lastSyncedSecondRef.current = Math.floor(normalizeTime(playbackPosition));
        pendingInitialSeekRef.current = true;
    }, [hasHydrated, currentTrack?.conferencia_id, currentTrack?.url_audio, playbackPosition]);

    useEffect(() => {
        if (!hasHydrated || !currentTrack) {
            return;
        }

        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (audio.readyState < 1) {
            return;
        }

        const targetTime = normalizeTime(playbackPosition);
        const drift = Math.abs(audio.currentTime - targetTime);

        if (drift > 1.5) {
            audio.currentTime = targetTime;
            setCurrentTime(targetTime);
        }
    }, [hasHydrated, currentTrack?.conferencia_id, playbackPosition]);

    useEffect(() => {
        if (!hasHydrated || !currentTrack) {
            return;
        }

        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (isPlaying) {
            void audio.play().catch(() => {
                setIsPlaying(false);
            });

            return;
        }

        if (!audio.paused) {
            audio.pause();
        }
    }, [
        hasHydrated,
        currentTrack?.conferencia_id,
        currentTrack?.url_audio,
        isPlaying,
        setIsPlaying,
    ]);

    const flushPlaybackSnapshot = useCallback(() => {
        const audio = audioRef.current;

        if (!audio || !currentTrack) {
            return;
        }

        const nextCurrentTime = normalizeTime(audio.currentTime);
        const nextDuration = getAudioDuration(audio) || durationRef.current;

        savePlaybackState(nextCurrentTime);
        syncPlayback({
            currentTime: nextCurrentTime,
            duration: nextDuration,
        });

        setCurrentTime(nextCurrentTime);
        lastSyncedSecondRef.current = Math.floor(nextCurrentTime);
    }, [currentTrack, savePlaybackState, syncPlayback]);

    useEffect(() => {
        if (!hasHydrated) {
            return;
        }

        const handleBeforeUnload = () => {
            flushPlaybackSnapshot();
        };

        const handlePageHide = () => {
            flushPlaybackSnapshot();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                flushPlaybackSnapshot();
            }
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("pagehide", handlePageHide);
        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            flushPlaybackSnapshot();
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("pagehide", handlePageHide);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [flushPlaybackSnapshot, hasHydrated]);

    const handleLoadedMetadata = useCallback(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        const nextDuration = getAudioDuration(audio);
        durationRef.current = nextDuration;
        setDuration(nextDuration);

        if (!pendingInitialSeekRef.current) {
            return;
        }

        const nextPlaybackPosition = normalizeTime(playbackPosition);
        const restoreTo =
            nextDuration > 0
                ? Math.min(nextPlaybackPosition, nextDuration)
                : nextPlaybackPosition;

        if (restoreTo > 0) {
            audio.currentTime = restoreTo;
            setCurrentTime(restoreTo);
        }

        pendingInitialSeekRef.current = false;
    }, [playbackPosition]);

    const handleDurationChange = useCallback(() => {
        const audio = audioRef.current;
        const nextDuration = getAudioDuration(audio);

        durationRef.current = nextDuration;
        setDuration(nextDuration);
    }, []);

    const handleTimeUpdate = useCallback(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        const nextCurrentTime = normalizeTime(audio.currentTime);
        const nextDuration = getAudioDuration(audio) || durationRef.current;
        const wholeSeconds = Math.floor(nextCurrentTime);

        setCurrentTime(nextCurrentTime);

        if (Math.abs(wholeSeconds - lastSyncedSecondRef.current) >= SYNC_INTERVAL_SECONDS) {
            lastSyncedSecondRef.current = wholeSeconds;

            savePlaybackState(nextCurrentTime);
            syncPlayback({
                currentTime: nextCurrentTime,
                duration: nextDuration,
            });
        }
    }, [savePlaybackState, syncPlayback]);

    const handlePlay = useCallback(() => {
        setIsPlaying(true);
    }, [setIsPlaying]);

    const handlePause = useCallback(() => {
        if (isEndingRef.current) {
            isEndingRef.current = false;
            return;
        }

        const audio = audioRef.current;

        if (!audio) {
            pause(currentTime);
            return;
        }

        const nextCurrentTime = normalizeTime(audio.currentTime);
        const nextDuration = getAudioDuration(audio) || durationRef.current;

        pause(nextCurrentTime);
        syncPlayback({
            currentTime: nextCurrentTime,
            duration: nextDuration,
        });

        setCurrentTime(nextCurrentTime);
        lastSyncedSecondRef.current = Math.floor(nextCurrentTime);
    }, [currentTime, pause, syncPlayback]);

    const handleEnded = useCallback(() => {
        const audio = audioRef.current;
        const finalDuration = getAudioDuration(audio) || durationRef.current;

        isEndingRef.current = true;

        syncPlayback({
            currentTime: finalDuration,
            duration: finalDuration,
        });

        if (audio) {
            audio.currentTime = 0;
        }

        savePlaybackState(0);
        pause(0);
        setCurrentTime(0);
        lastSyncedSecondRef.current = 0;
    }, [pause, savePlaybackState, syncPlayback]);

    const handleProgressChange = useCallback(
        (event: ChangeEvent<HTMLInputElement>) => {
            const nextTime = normalizeTime(Number(event.target.value));
            const audio = audioRef.current;

            if (audio) {
                audio.currentTime = nextTime;
            }

            setCurrentTime(nextTime);
            savePlaybackState(nextTime);
            syncPlayback({
                currentTime: nextTime,
                duration: getAudioDuration(audio) || durationRef.current,
            });
            lastSyncedSecondRef.current = Math.floor(nextTime);
        },
        [savePlaybackState, syncPlayback],
    );

    const handleTogglePlayback = useCallback(() => {
        const audio = audioRef.current;

        if (!currentTrack || !audio) {
            return;
        }

        if (isPlaying) {
            pause(audio.currentTime);
            return;
        }

        play();
    }, [currentTrack, isPlaying, pause, play]);

    const handleRestart = useCallback(() => {
        const audio = audioRef.current;

        if (audio) {
            audio.currentTime = 0;
        }

        setCurrentTime(0);
        savePlaybackState(0);
        syncPlayback({
            currentTime: 0,
            duration: getAudioDuration(audio) || durationRef.current,
        });
        lastSyncedSecondRef.current = 0;
    }, [savePlaybackState, syncPlayback]);

    const handleClose = useCallback(() => {
        flushPlaybackSnapshot();

        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
        }

        clearCurrentTrack();
        setCurrentTime(0);
        setDuration(0);
        durationRef.current = 0;
        lastSyncedSecondRef.current = 0;
        pendingInitialSeekRef.current = false;
    }, [clearCurrentTrack, flushPlaybackSnapshot]);

    const progressMax = duration > 0 ? duration : 0;
    const progressValue = progressMax > 0 ? Math.min(currentTime, progressMax) : 0;

    const progressLabel = useMemo(() => {
        if (duration <= 0) {
            return "0%";
        }

        const pct = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
        return `${pct}%`;
    }, [currentTime, duration]);

    if (!hasHydrated || !currentTrack) {
        return null;
    }

    return (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 px-4">
            <div
                className="pointer-events-auto mx-auto max-w-6xl overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-xl"
                style={{
                    background: "rgba(12, 12, 28, 0.88)",
                    borderColor: "rgba(212, 175, 55, 0.18)",
                    boxShadow:
                        "0 20px 80px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.04)",
                }}
            >
                <audio
                    ref={audioRef}
                    src={currentTrack.url_audio}
                    preload="metadata"
                    onLoadedMetadata={handleLoadedMetadata}
                    onDurationChange={handleDurationChange}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={handlePlay}
                    onPause={handlePause}
                    onEnded={handleEnded}
                />

                <div className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)_auto] lg:items-center">
                    <div className="min-w-0">
                        <div className="flex items-start gap-3">
                            <div
                                className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
                                style={{
                                    background: "rgba(212, 175, 55, 0.08)",
                                    borderColor: "rgba(212, 175, 55, 0.2)",
                                    color: "var(--color-gold)",
                                }}
                            >
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 18V5l12-2v13" />
                                    <circle cx="6" cy="18" r="3" />
                                    <circle cx="18" cy="16" r="3" />
                                </svg>
                            </div>

                            <div className="min-w-0">
                                <p
                                    className="text-[11px] font-semibold uppercase tracking-[0.24em]"
                                    style={{ color: "var(--color-gold)" }}
                                >
                                    Reproductor persistente
                                </p>

                                <Link
                                    href={`/conferencia/${currentTrack.conferencia_id}`}
                                    className="mt-1 block truncate text-base font-semibold transition-opacity hover:opacity-85 md:text-lg"
                                    style={{ color: "var(--color-text-primary)" }}
                                >
                                    {currentTrack.titulo}
                                </Link>

                                <div
                                    className="mt-1 flex items-center gap-2 text-xs"
                                    style={{ color: "var(--color-text-muted)" }}
                                >
                                    <span>{isPlaying ? "Reproduciendo" : "En pausa"}</span>
                                    <span aria-hidden="true">•</span>
                                    <span>{formatTime(currentTime)}</span>
                                    <span aria-hidden="true">/</span>
                                    <span>{formatTime(duration)}</span>
                                    <span aria-hidden="true">•</span>
                                    <span>{progressLabel}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            <span
                                className="w-12 shrink-0 text-right text-xs tabular-nums"
                                style={{ color: "var(--color-text-muted)" }}
                            >
                                {formatTime(currentTime)}
                            </span>

                            <input
                                type="range"
                                min={0}
                                max={progressMax}
                                step={1}
                                value={progressValue}
                                onChange={handleProgressChange}
                                disabled={progressMax <= 0}
                                aria-label="Control de progreso del audio"
                                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-transparent disabled:cursor-not-allowed"
                                style={{ accentColor: "var(--color-gold)" }}
                            />

                            <span
                                className="w-12 shrink-0 text-xs tabular-nums"
                                style={{ color: "var(--color-text-muted)" }}
                            >
                                {formatTime(duration)}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={handleRestart}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderColor: "rgba(212, 175, 55, 0.14)",
                                color: "var(--color-text-secondary)",
                            }}
                            aria-label="Volver al inicio"
                            title="Volver al inicio"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <polyline points="11 17 6 12 11 7" />
                                <polyline points="18 17 13 12 18 7" />
                            </svg>
                        </button>

                        <button
                            type="button"
                            onClick={handleTogglePlayback}
                            className="inline-flex h-12 min-w-32 items-center justify-center gap-2 rounded-xl border px-4 font-semibold transition-all hover:-translate-y-0.5"
                            style={{
                                background: "var(--color-gold)",
                                borderColor: "rgba(212, 175, 55, 0.5)",
                                color: "#0a0a14",
                                boxShadow: "0 10px 30px rgba(212, 175, 55, 0.18)",
                            }}
                            aria-label={isPlaying ? "Pausar audio" : "Reproducir audio"}
                        >
                            {isPlaying ? (
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <rect x="6" y="4" width="4" height="16" rx="1" />
                                    <rect x="14" y="4" width="4" height="16" rx="1" />
                                </svg>
                            ) : (
                                <svg
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="currentColor"
                                    aria-hidden="true"
                                >
                                    <path d="M8 5v14l11-7-11-7Z" />
                                </svg>
                            )}
                            <span>{isPlaying ? "Pausar" : "Reproducir"}</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleClose}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border transition-all hover:-translate-y-0.5"
                            style={{
                                background: "rgba(255,255,255,0.03)",
                                borderColor: "rgba(212, 175, 55, 0.14)",
                                color: "var(--color-text-secondary)",
                            }}
                            aria-label="Cerrar reproductor"
                            title="Cerrar reproductor"
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

---

## src/app/layout.tsx

```tsx
import type { Metadata } from "next";
import "@/app/globals.css";
import { Navbar } from "@/components/layout";
import PersistentPlayer from "@/components/player/PersistentPlayer";

export const metadata: Metadata = {
    title: "Legado Patrimonial WSS",
    description: "Archivo documental cronológico de conferencias, audio, video y PDF.",
};

type RootLayoutProps = Readonly<{
    children: React.ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
    return (
        <html lang="es">
            <body
                style={{
                    background: "var(--color-bg-primary)",
                    color: "var(--color-text-primary)",
                }}
            >
                <Navbar />
                <main>{children}</main>
                <PersistentPlayer />
            </body>
        </html>
    );
}
```

---

## src/app/globals.css

```css
@import "tailwindcss";

/* ============================================
   Design System — Legado Patrimonial WSS
   Tema oscuro premium con acentos dorados
   ============================================ */

:root {
  /* Paleta principal */
  --color-bg-primary: #0a0a14;
  --color-bg-secondary: #1a1a2e;
  --color-bg-tertiary: #16213e;
  --color-bg-card: rgba(26, 26, 46, 0.6);
  --color-bg-glass: rgba(22, 33, 62, 0.4);

  /* Acentos */
  --color-gold: #e2b857;
  --color-gold-light: #f0d080;
  --color-gold-dark: #b8942e;

  /* Texto */
  --color-text-primary: #f0f0f5;
  --color-text-secondary: #a0a0b8;
  --color-text-muted: #6a6a82;

  /* Bordes y superficies */
  --color-border: rgba(226, 184, 87, 0.15);
  --color-border-hover: rgba(226, 184, 87, 0.35);
  --color-surface-hover: rgba(226, 184, 87, 0.08);

  /* Reproductor */
  --player-height: 88px;

  /* Radii */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 24px;

  /* Shadows */
  --shadow-card: 0 4px 24px rgba(0, 0, 0, 0.4);
  --shadow-glow-gold: 0 0 20px rgba(226, 184, 87, 0.25);
  --shadow-glow-gold-strong: 0 0 30px rgba(226, 184, 87, 0.4);

  /* Font */
  --font-primary: var(--font-inter), 'Inter', system-ui, sans-serif;
  --font-serif: var(--font-playfair), 'Playfair Display', Georgia, serif;
}

@theme inline {
  --color-background: var(--color-bg-primary);
  --color-foreground: var(--color-text-primary);
  --font-sans: var(--font-primary);
}

/* ============================================
   Base Styles
   ============================================ */

* {
  box-sizing: border-box;
}

html {
  scroll-behavior: smooth;
}

body {
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-family: var(--font-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

/* ============================================
   Glassmorphism Utilities
   ============================================ */

.glass {
  background: var(--color-bg-glass);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--color-border);
}

.glass-strong {
  background: rgba(16, 16, 32, 0.85);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid var(--color-border);
}

.glass-card {
  background: var(--color-bg-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.glass-card:hover {
  border-color: var(--color-border-hover);
  box-shadow: var(--shadow-card), var(--shadow-glow-gold);
  transform: translateY(-2px);
}

/* ============================================
   Animations & Keyframes
   ============================================ */

@keyframes glow-pulse {

  0%,
  100% {
    box-shadow: 0 0 15px rgba(226, 184, 87, 0.2);
  }

  50% {
    box-shadow: 0 0 30px rgba(226, 184, 87, 0.4);
  }
}

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }

  100% {
    background-position: 200% center;
  }
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0px);
  }

  50% {
    transform: translateY(-8px);
  }
}

@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes gradient-shift {
  0% {
    background-position: 0% 50%;
  }

  50% {
    background-position: 100% 50%;
  }

  100% {
    background-position: 0% 50%;
  }
}

@keyframes border-glow {

  0%,
  100% {
    border-color: rgba(226, 184, 87, 0.15);
  }

  50% {
    border-color: rgba(226, 184, 87, 0.4);
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.animate-glow {
  animation: glow-pulse 3s ease-in-out infinite;
}

.animate-shimmer {
  animation: shimmer 3s ease infinite;
}

.animate-float {
  animation: float 4s ease-in-out infinite;
}

.animate-fade-in-up {
  animation: fade-in-up 0.6s ease-out forwards;
}

.animate-gradient {
  animation: gradient-shift 6s ease infinite;
  background-size: 200% 200%;
}

.animate-border-glow {
  animation: border-glow 3s ease-in-out infinite;
}

.animate-spin-slow {
  animation: spin-slow 8s linear infinite;
}

/* Staggered fade-in for children */
.stagger-children>* {
  opacity: 0;
  animation: fade-in-up 0.5s ease-out forwards;
}

.stagger-children>*:nth-child(1) {
  animation-delay: 0.05s;
}

.stagger-children>*:nth-child(2) {
  animation-delay: 0.1s;
}

.stagger-children>*:nth-child(3) {
  animation-delay: 0.15s;
}

.stagger-children>*:nth-child(4) {
  animation-delay: 0.2s;
}

.stagger-children>*:nth-child(5) {
  animation-delay: 0.25s;
}

.stagger-children>*:nth-child(6) {
  animation-delay: 0.3s;
}

.stagger-children>*:nth-child(7) {
  animation-delay: 0.35s;
}

.stagger-children>*:nth-child(8) {
  animation-delay: 0.4s;
}

.stagger-children>*:nth-child(9) {
  animation-delay: 0.45s;
}

/* ============================================
   Button Utilities
   ============================================ */

.btn-gold {
  background: linear-gradient(135deg, var(--color-gold), var(--color-gold-dark));
  color: #0a0a14;
  font-weight: 700;
  border: none;
  border-radius: var(--radius-md);
  padding: 10px 20px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-gold:hover {
  box-shadow: var(--shadow-glow-gold-strong);
  transform: scale(1.03);
}

.btn-ghost {
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 8px 16px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.btn-ghost:hover {
  color: var(--color-gold);
  border-color: var(--color-gold);
  background: var(--color-surface-hover);
}

/* ============================================
   Gold Accent Utilities
   ============================================ */

.text-gold {
  color: var(--color-gold);
}

.bg-gradient-hero {
  background: linear-gradient(160deg,
      var(--color-bg-primary) 0%,
      var(--color-bg-secondary) 30%,
      var(--color-bg-tertiary) 60%,
      #0d1b3e 100%);
}

.border-gradient-gold {
  border-image: linear-gradient(135deg, var(--color-gold), transparent) 1;
}

/* ============================================
   Media icon badges
   ============================================ */

.media-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  background: rgba(226, 184, 87, 0.1);
  color: var(--color-gold);
  border: 1px solid rgba(226, 184, 87, 0.2);
  transition: all 0.2s ease;
}

.media-badge:hover {
  background: rgba(226, 184, 87, 0.2);
}

/* ============================================
   Scrollbar
   ============================================ */

::-webkit-scrollbar {
  width: 6px;
}

::-webkit-scrollbar-track {
  background: var(--color-bg-primary);
}

::-webkit-scrollbar-thumb {
  background: var(--color-bg-tertiary);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-gold-dark);
}

/* ============================================
   Range input (player slider)
   ============================================ */

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-gold);
  margin-top: -5px;
  box-shadow: 0 0 8px rgba(226, 184, 87, 0.4);
  transition: transform 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.3);
}

input[type="range"]::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.12);
}

input[type="range"]::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-gold);
  border: none;
  box-shadow: 0 0 8px rgba(226, 184, 87, 0.4);
}

/* ============================================
   Nav Highlight — Podcast & Estudios hover glow
   ============================================ */

.nav-highlight {
  transition: all 0.3s ease;
}

.nav-highlight:hover {
  color: var(--color-gold) !important;
  text-shadow: 0 0 12px rgba(226, 184, 87, 0.5), 0 0 24px rgba(226, 184, 87, 0.2);
  filter: brightness(1.2);
}

/* ============================================
   Particle decorations (hero)
   ============================================ */

.particle {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(226, 184, 87, 0.3);
  animation: float 6s ease-in-out infinite;
  pointer-events: none;
}

.particle:nth-child(2n) {
  animation-duration: 8s;
  animation-delay: -2s;
  background: rgba(226, 184, 87, 0.15);
}

.particle:nth-child(3n) {
  animation-duration: 10s;
  animation-delay: -4s;
  width: 3px;
  height: 3px;
}```

---

## src/app/page.tsx

```tsx
"use client";

import { HeroSection, DashboardGrid, ConferenceCard } from "@/components/ui";
import { useConferencias } from "@/hooks/useConferencias";
import { usePlayerStore } from "@/store";

export default function Home() {
  const { conferencias, loading, error } = useConferencias();
  const conferenciaActiva = usePlayerStore((s) => s.conferencia_activa);

  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg-primary)" }}>
      <HeroSection />

      {/* Dashboard Grid — Category Cards */}
      <DashboardGrid />

      {/* Catalog Section — Live from Supabase */}
      <section
        id="catalogo"
        className="mx-auto max-w-7xl px-6 py-16"
        style={{ paddingBottom: conferenciaActiva ? "calc(var(--player-height) + 2rem)" : "4rem" }}
      >
        {/* Section Header */}
        <div className="mb-10 flex items-end justify-between">
          <div>
            <h2
              className="text-2xl font-bold tracking-tight md:text-3xl"
              style={{ color: "var(--color-text-primary)" }}
            >
              Catálogo Reciente
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Explora las últimas conferencias añadidas al archivo
            </p>
          </div>
          <span
            className="hidden text-sm font-medium md:block"
            style={{ color: "var(--color-text-muted)" }}
          >
            {!loading && `${conferencias.length} conferencia${conferencias.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="glass-card h-64 animate-pulse"
                style={{ opacity: 1 - i * 0.1 }}
              >
                <div className="h-1 w-full" style={{ background: "rgba(226,184,87,0.1)" }} />
                <div className="flex flex-col gap-4 p-5">
                  <div className="h-5 w-3/4 rounded" style={{ background: "var(--color-bg-tertiary)" }} />
                  <div className="h-3 w-1/2 rounded" style={{ background: "var(--color-bg-tertiary)" }} />
                  <div className="flex gap-2">
                    <div className="h-6 w-16 rounded-full" style={{ background: "var(--color-bg-tertiary)" }} />
                    <div className="h-6 w-14 rounded-full" style={{ background: "var(--color-bg-tertiary)" }} />
                  </div>
                  <div className="mt-auto h-10 rounded-xl" style={{ background: "var(--color-bg-tertiary)" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="glass-card mx-auto max-w-md p-8 text-center">
            <div className="mb-4 text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-gold)" }}>
              Error de conexión
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              {error}
            </p>
          </div>
        )}

        {/* Conference Grid */}
        {!loading && !error && conferencias.length > 0 && (
          <div className="stagger-children grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {conferencias.map((conf, i) => (
              <ConferenceCard key={conf.id} conferencia={conf} index={i} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && conferencias.length === 0 && (
          <div className="glass-card mx-auto max-w-md p-8 text-center">
            <div className="mb-4 text-4xl">📭</div>
            <h3 className="text-lg font-semibold" style={{ color: "var(--color-text-primary)" }}>
              Aún no hay conferencias
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--color-text-muted)" }}>
              Las conferencias aparecerán aquí una vez que se inyecten datos en Supabase.
            </p>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer
        className="border-t px-6 py-8 text-center text-xs"
        style={{
          borderColor: "var(--color-border)",
          color: "var(--color-text-muted)",
          paddingBottom: conferenciaActiva ? "calc(var(--player-height) + 2rem)" : "2rem",
        }}
      >
        © {new Date().getFullYear()} Legado Patrimonial WSS · Preservando el legado espiritual
      </footer>
    </div>
  );
}
```

---

## src/app/archivo/page.tsx

```tsx
import ArchivoPageClient from "./ArchivoPageClient";
import { getArchivoCronologicoPage } from "@/services/conferences";
import type { FilterState } from "@/components/ui";

const PAGE_SIZE = 20;

type SortOrder = "reciente" | "antiguo" | "titulo";

type ArchivoPageProps = {
    searchParams: Promise<{
        page?: string;
        sort?: string;
        periodo?: string;
        formatos?: string | string[];
        temas?: string | string[];
        libroBiblico?: string;
    }>;
};

function normalizePage(value: string | undefined): number {
    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed < 1) {
        return 1;
    }

    return parsed;
}

function normalizeSort(value: string | undefined): SortOrder {
    if (value === "antiguo" || value === "titulo") {
        return value;
    }

    return "reciente";
}

function normalizeArrayParam(value: string | string[] | undefined): string[] {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter(Boolean);
    }

    return [value].filter(Boolean);
}

export default async function ArchivoPage({
    searchParams,
}: Readonly<ArchivoPageProps>) {
    const params = await searchParams;

    const page = normalizePage(params.page);
    const sort = normalizeSort(params.sort);

    const filters: FilterState = {
        periodo: typeof params.periodo === "string" ? params.periodo : null,
        formatos: normalizeArrayParam(params.formatos),
        temas: normalizeArrayParam(params.temas),
        libroBiblico:
            typeof params.libroBiblico === "string" ? params.libroBiblico : null,
    };

    const { data: conferencias, total } = await getArchivoCronologicoPage({
        page,
        limit: PAGE_SIZE,
        sort,
        filters,
    });

    return (
        <ArchivoPageClient
            conferencias={conferencias}
            totalResults={total}
            page={page}
            pageSize={PAGE_SIZE}
            initialFilters={filters}
            initialSort={sort}
        />
    );
}```

---

## src/app/conferencia/[id]/page.tsx

```tsx
"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import { Play, FileText, Video, CalendarDays, User2, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { usePlayerStore } from "@/store/playerStore";

type ProvisionalConferenceDetail = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  speaker: {
    name: string;
    role?: string | null;
  };
  dateLabel: string;
  durationLabel?: string | null;
  coverImageUrl?: string | null;
  audio: {
    id: string;
    title: string;
    url: string;
    duration?: number | null;
    coverImage?: string | null;
    artist?: string | null;
  } | null;
  pdf: {
    title: string;
    url: string;
  } | null;
  video: {
    provider: "youtube" | "external" | "none";
    youtubeVideoId?: string | null;
    // embedUrl eliminado por redundancia (Corrección Claude)
    fallbackUrl?: string | null;
    status?: "active" | "processing" | "unavailable";
  } | null;
};

const PROVISIONAL_CONFERENCES: Record<string, ProvisionalConferenceDetail> = {
  "1": {
    id: "1",
    slug: "legado-patrimonial-y-memoria-familiar",
    title: "Legado Patrimonial y Memoria Familiar",
    excerpt:
      "Una conferencia sobre preservación patrimonial, transmisión de valores y construcción de memoria intergeneracional.",
    description:
      "Exploramos cómo organizar, preservar y transmitir el patrimonio documental, audiovisual y espiritual de una familia. Esta conferencia presenta una visión estratégica para convertir recuerdos, testimonios y documentos en un archivo vivo, accesible y sostenible en el tiempo.",
    speaker: {
      name: "Dr. William Soto Santiago",
      role: "Conferencista",
    },
    dateLabel: "12 de febrero de 2026",
    durationLabel: "48 min",
    coverImageUrl:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1600&auto=format&fit=crop",
    audio: {
      id: "conf-1-audio",
      title: "Legado Patrimonial y Memoria Familiar",
      url: "https://storage.example.com/audio/conferencia-legado-patrimonial.mp3",
      duration: 2880,
      artist: "Dr. William Soto Santiago",
    },
    pdf: {
      title: "Material de apoyo de la conferencia",
      url: "https://storage.example.com/pdfs/conferencia-legado-patrimonial.pdf",
    },
    video: {
      provider: "youtube",
      youtubeVideoId: "dQw4w9WgXcQ",
      fallbackUrl: "https://pub-midominio.r2.dev/video-respaldo-1.mp4", // Fallback real a R2
      status: "active",
    },
  },
  "2": {
    id: "2",
    slug: "archivos-familiares-en-la-era-digital",
    title: "Archivos Familiares en la Era Digital",
    excerpt:
      "Buenas prácticas para digitalizar, clasificar y publicar colecciones familiares con criterio archivístico.",
    description:
      "Una sesión orientada a la organización práctica de fotografías, audios, documentos y testimonios. Se aborda estructura, nomenclatura, criterios de acceso y continuidad operativa para proyectos patrimoniales familiares.",
    speaker: {
      name: "Dr. William Soto Santiago",
      role: "Conferencista",
    },
    dateLabel: "28 de enero de 2026",
    durationLabel: "55 min",
    coverImageUrl:
      "https://images.unsplash.com/photo-1517842645767-c639042777db?q=80&w=1600&auto=format&fit=crop",
    audio: {
      id: "conf-2-audio",
      title: "Archivos Familiares en la Era Digital",
      url: "https://storage.example.com/audio/archivos-familiares-era-digital.mp3",
      duration: 3300,
      artist: "Dr. William Soto Santiago",
    },
    pdf: {
      title: "Guía de digitalización y organización",
      url: "https://storage.example.com/pdfs/guia-archivos-familiares.pdf",
    },
    video: {
      provider: "youtube",
      youtubeVideoId: "M7lc1UVf-VE",
      fallbackUrl: "https://pub-midominio.r2.dev/video-respaldo-2.mp4",
      status: "active",
    },
  },
};

function getConferenceById(id: string): ProvisionalConferenceDetail | null {
  return PROVISIONAL_CONFERENCES[id] ?? null;
}

function getConferenceBySlug(slug: string): ProvisionalConferenceDetail | null {
  return Object.values(PROVISIONAL_CONFERENCES).find((item) => item.slug === slug) ?? null;
}

function resolveConference(idParam: string): ProvisionalConferenceDetail | null {
  return getConferenceById(idParam) ?? getConferenceBySlug(idParam);
}

export default function ConferenceDetailPage() {
  const params = useParams<{ id: string }>();
  const playTrack = usePlayerStore((state) => state.playTrack);

  const conference = useMemo(() => {
    const rawId = Array.isArray(params?.id) ? params.id[0] : params?.id;
    return rawId ? resolveConference(rawId) : null;
  }, [params?.id]);

  if (!conference) {
    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white">
        <section className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-6 py-20 text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-[#151515]">
            <Video className="h-7 w-7 text-[#D4AF37]" />
          </div>

          <h1 className="text-3xl font-semibold tracking-tight">Conferencia no encontrada</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/70">
            El identificador solicitado no coincide con ningún registro provisional disponible.
          </p>

          <Link
            href="/archivo"
            className="mt-8 inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/30 bg-[#151515] px-5 py-3 text-sm font-medium text-[#F5E7B5] transition hover:border-[#D4AF37]/60 hover:bg-[#1a1a1a]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al archivo
          </Link>
        </section>
      </main>
    );
  }

  const handlePlayAudio = () => {
    if (!conference.audio) return;

    playTrack({
      conferencia_id: conference.id,
      titulo: conference.audio.title,
      url_audio: conference.audio.url,
    });
  };

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white">
      <section className="relative overflow-hidden border-b border-[#D4AF37]/15 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_32%),linear-gradient(to_bottom,rgba(255,255,255,0.02),rgba(255,255,255,0))]">
        <div className="mx-auto max-w-7xl px-6 py-8 md:px-8">
          <Link
            href="/archivo"
            className="inline-flex items-center gap-2 rounded-xl border border-[#D4AF37]/20 bg-white/[0.02] px-4 py-2 text-sm font-medium text-[#F5E7B5] transition hover:border-[#D4AF37]/45 hover:bg-white/[0.04]"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al archivo
          </Link>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-14 md:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#151515]/80 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em] text-[#E7C96C]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37]" />
              Conferencia
            </div>

            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              {conference.title}
            </h1>

            <p className="mt-5 max-w-3xl text-base leading-7 text-white/75 md:text-lg">
              {conference.excerpt}
            </p>

            <div className="mt-7 flex flex-wrap gap-3 text-sm text-white/70">
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                <User2 className="h-4 w-4 text-[#D4AF37]" />
                <span>{conference.speaker.name}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                <span>{conference.dateLabel}</span>
              </div>

              {conference.durationLabel ? (
                <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2">
                  <Play className="h-4 w-4 text-[#D4AF37]" />
                  <span>{conference.durationLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <button
                type="button"
                onClick={handlePlayAudio}
                disabled={!conference.audio}
                className="inline-flex items-center gap-3 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_10px_30px_rgba(212,175,55,0.22)] transition hover:bg-[#e3bf4f] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Play className="h-5 w-5 fill-current" />
                Reproducir audio
              </button>

              {conference.pdf ? (
                <a
                  href={conference.pdf.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 rounded-2xl border border-[#D4AF37]/25 bg-[#151515] px-6 py-4 text-sm font-semibold text-[#F5E7B5] transition hover:border-[#D4AF37]/55 hover:bg-[#1a1a1a]"
                >
                  <FileText className="h-5 w-5" />
                  Ver PDF
                </a>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-[#D4AF37]/20 bg-[#111111] p-3 shadow-2xl">
              <div className="aspect-video overflow-hidden rounded-[1.4rem] border border-white/10 bg-black">
                {/* Corrección Claude: iframe con loading lazy, URL construida dinámicamente y rel=0 */}
                {conference.video?.provider === "youtube" && conference.video.youtubeVideoId ? (
                  <iframe
                    src={`https://www.youtube.com/embed/${conference.video.youtubeVideoId}?rel=0`}
                    title={conference.title}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                    <div className="px-6 text-center">
                      <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full border border-[#D4AF37]/25 bg-[#171717]">
                        <Video className="h-6 w-6 text-[#D4AF37]" />
                      </div>
                      <p className="text-sm font-medium text-white/85">
                        Espacio listo para embed de video
                      </p>
                      <p className="mt-2 text-sm text-white/55">
                        Contrato provisional activo mientras definimos backend final.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-2 pb-1 pt-4">
                <div>
                  <p className="text-sm font-medium text-white/90">Video de la conferencia</p>
                  <p className="mt-1 text-xs text-white/50">
                    YouTube primario · fallback preparado
                  </p>
                </div>

                {conference.video?.fallbackUrl ? (
                  <a
                    href={conference.video.fallbackUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-xl border border-[#D4AF37]/20 px-3 py-2 text-xs font-medium text-[#F5E7B5] transition hover:border-[#D4AF37]/45 hover:bg-white/[0.03]"
                  >
                    Abrir externo
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 md:px-8 lg:grid-cols-[1fr_360px]">
        <article className="rounded-[2rem] border border-white/8 bg-[#121212] p-7 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
          <div className="mb-6 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">Descripción</h2>
          </div>

          <div className="space-y-5 text-[15px] leading-8 text-white/72">
            <p>{conference.description}</p>
          </div>
        </article>

        <aside className="space-y-6">
          <div className="rounded-[2rem] border border-[#D4AF37]/15 bg-[#121212] p-6">
            <h3 className="text-lg font-semibold text-white">Ficha rápida</h3>

            <div className="mt-5 space-y-4">
              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/45">Ponente</p>
                <p className="mt-2 text-sm font-medium text-white">{conference.speaker.name}</p>
                {conference.speaker.role ? (
                  <p className="mt-1 text-sm text-white/55">{conference.speaker.role}</p>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                <p className="text-xs uppercase tracking-[0.16em] text-white/45">Fecha</p>
                <p className="mt-2 text-sm font-medium text-white">{conference.dateLabel}</p>
              </div>

              {/* Corrección Claude: Eliminada la URL cruda para no exponer infraestructura */}
              {conference.audio ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Audio</p>
                  <p className="mt-2 text-sm font-medium text-white">Disponible</p>
                  <p className="mt-1 text-xs text-white/45">Formato MP3 Alta Calidad</p>
                </div>
              ) : null}

              {conference.pdf ? (
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-white/45">Documento</p>
                  <p className="mt-2 text-sm font-medium text-white">{conference.pdf.title}</p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-[2rem] border border-[#D4AF37]/15 bg-[linear-gradient(180deg,rgba(212,175,55,0.08),rgba(212,175,55,0.02))] p-6">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-[#E7C96C]">
              Contrato provisional
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Esta vista usa datos mockeados para no bloquear Fase 5.5. El reemplazo por Supabase puede
              hacerse luego sin alterar el layout ni la integración con el player.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}
```

---

## src/app/el-legado/page.tsx

```tsx
// src/app/el-legado/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  FileArchive,
  HeartHandshake,
  Landmark,
  Library,
  Mic2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "El Legado | Legado Patrimonial WSS",
  description:
    "Plataforma documental para custodiar, ordenar y transmitir el archivo histórico espiritual de la obra.",
};

const pillars = [
  {
    title: "Memoria viva",
    description:
      "Preservamos testimonios, enseñanzas y documentos para que el archivo no sea una colección muerta, sino una herencia activa para nuevas generaciones.",
    icon: Library,
  },
  {
    title: "Orden documental",
    description:
      "Cada pieza del legado se organiza con criterio archivístico para facilitar consulta, contexto y continuidad institucional.",
    icon: FileArchive,
  },
  {
    title: "Transmisión fiel",
    description:
      "Cuidamos el contenido doctrinal, histórico y espiritual para que la voz del archivo conserve integridad en el tiempo.",
    icon: ShieldCheck,
  },
];

const principles = [
  "Custodiar la memoria espiritual, histórica y documental con excelencia.",
  "Facilitar acceso claro, sobrio y reverente al contenido del archivo.",
  "Construir una plataforma preparada para crecimiento sostenido y consulta masiva.",
  "Honrar el legado recibido mientras se habilita su continuidad futura.",
];

const timeline = [
  {
    label: "Origen",
    title: "Nacimiento del archivo patrimonial",
    description:
      "El proyecto surge como respuesta a la necesidad de resguardar décadas de materiales en audio, video y documentos con una estructura durable.",
  },
  {
    label: "Consolidación",
    title: "Curaduría y organización progresiva",
    description:
      "La colección evoluciona desde un repositorio disperso hacia un sistema documental con criterios de clasificación, acceso y preservación.",
  },
  {
    label: "Expansión",
    title: "Portal institucional de alto rendimiento",
    description:
      "Legado Patrimonial WSS se proyecta como una plataforma robusta, preparada para navegación cronológica, hubs temáticos y continuidad editorial.",
  },
];

export default function ElLegadoPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section aria-label="Introducción al Legado" className="relative overflow-hidden border-b border-[#D4AF37]/15">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              El Legado
            </div>

            <h1 className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl">
              Una plataforma para custodiar, ordenar y transmitir la memoria del archivo.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Legado Patrimonial WSS existe para preservar con sobriedad y excelencia el
              patrimonio espiritual, histórico y documental de la obra. No es solo una biblioteca:
              es una infraestructura de memoria diseñada para continuidad, consulta y transmisión
              fiel.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar archivo
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/estudios"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Ver estudios temáticos
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                  <Landmark className="h-6 w-6 text-[#D4AF37]" />
                  <p className="mt-4 text-sm font-semibold text-white">Patrimonio institucional</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    La identidad del archivo se apoya en permanencia, contexto y continuidad.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5">
                  <Mic2 className="h-6 w-6 text-[#D4AF37]" />
                  <p className="mt-4 text-sm font-semibold text-white">Voz preservada</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Audio, video y documentos se integran bajo una misma visión documental.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:col-span-2">
                  <BookOpen className="h-6 w-6 text-[#D4AF37]" />
                  <p className="mt-4 text-sm font-semibold text-white">Propósito del archivo</p>
                  <p className="mt-2 text-sm leading-7 text-white/65">
                    Hacer accesible el legado sin trivializarlo: una experiencia elegante, estable
                    y reverente, preparada para crecimiento sostenido.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section aria-label="Pilares fundamentales" className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="grid gap-6 lg:grid-cols-3">
          {pillars.map(({ title, description, icon: Icon }) => (
            <article
              key={title}
              className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl"
            >
              <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                <Icon className="h-6 w-6 text-[#D4AF37]" />
              </div>

              <h2 className="mt-5 text-xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-label="Misión y principios" className="mx-auto grid max-w-7xl gap-8 px-6 py-4 md:px-8 lg:grid-cols-[0.95fr_1.05fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">Nuestra misión</h2>
          </div>

          <p className="mt-6 text-[15px] leading-8 text-white/72">
            Diseñar y sostener un sistema documental que resguarde el legado recibido, ordene su
            contenido con criterio técnico y lo ponga al servicio de la memoria espiritual e
            institucional de manera sobria, clara y durable.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/7 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E7C96C]">
              Enfoque rector
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Preservar no solo archivos, sino contexto, significado y continuidad.
            </p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 className="text-2xl font-semibold tracking-tight text-white">Principios</h2>
          </div>

          <ul className="mt-6 space-y-4">
            {principles.map((item) => (
              <li
                key={item}
                className="flex gap-4 rounded-[1.25rem] border border-white/8 bg-black/20 px-4 py-4"
              >
                <HeartHandshake className="mt-0.5 h-5 w-5 shrink-0 text-[#D4AF37]" />
                <span className="text-sm leading-7 text-white/70">{item}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section aria-labelledby="trayectoria-title" className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16">
        <div className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl md:p-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2 id="trayectoria-title" className="text-2xl font-semibold tracking-tight text-white">
              Trayectoria del proyecto
            </h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {timeline.map((item, index) => (
              <article
                key={item.title}
                className="relative rounded-[1.75rem] border border-white/10 bg-black/20 p-6"
              >
                <div className="absolute left-6 top-0 h-px w-16 bg-[#D4AF37]/50" />
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E7C96C]">
                  {String(index + 1).padStart(2, "0")} · {item.label}
                </p>
                <h3 className="mt-4 text-lg font-semibold text-white">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/68">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="exploracion-title" className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24">
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C]">
                Siguiente exploración
              </p>
              <h2 id="exploracion-title" className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">
                Continúa hacia las colecciones y el archivo documental.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Desde aquí, el recorrido natural sigue hacia los estudios temáticos y la navegación
                cronológica del archivo.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/estudios"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
              >
                Ir a Estudios
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Abrir Archivo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
```

---

## src/app/estudios/page.tsx

```tsx
// src/app/estudios/page.tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  BookMarked,
  BookOpen,
  FileText,
  Layers3,
  Library,
  ScrollText,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Estudios | Legado Patrimonial WSS",
  description:
    "Colecciones temáticas de estudios y series doctrinales organizadas para exploración clara, sobria y escalable dentro de Legado Patrimonial WSS.",
};

type StudyCollection = {
  slug: string;
  title: string;
  description: string;
  period: string;
  totalItems: number;
  category: string;
  featured: boolean;
};

type HighlightStat = {
  label: string;
  value: string;
  detail: string;
};

type Guideline = {
  title: string;
  description: string;
};

const STUDY_COLLECTIONS: StudyCollection[] = [
  {
    slug: "las-siete-edades",
    title: "Las Siete Edades",
    description:
      "Recorrido temático por las edades de la Iglesia con enfoque histórico, profético y doctrinal.",
    period: "Serie histórica",
    totalItems: 24,
    category: "Escatología",
    featured: true,
  },
  {
    slug: "los-sellos",
    title: "Los Sellos",
    description:
      "Colección centrada en la apertura de los sellos, su simbolismo y sus implicaciones para el creyente.",
    period: "Serie expositiva",
    totalItems: 18,
    category: "Apocalipsis",
    featured: true,
  },
  {
    slug: "daniel-setenta-semanas",
    title: "Daniel y las Setenta Semanas",
    description:
      "Estudios enfocados en cronología profética, dispensaciones y cumplimiento escritural.",
    period: "Serie temática",
    totalItems: 12,
    category: "Profecía bíblica",
    featured: false,
  },
  {
    slug: "fundamentos-de-la-fe",
    title: "Fundamentos de la Fe",
    description:
      "Mensajes para consolidar bases doctrinales, convicciones espirituales y comprensión bíblica.",
    period: "Serie formativa",
    totalItems: 30,
    category: "Doctrina",
    featured: false,
  },
  {
    slug: "tipologia-del-antiguo-testamento",
    title: "Tipología del Antiguo Testamento",
    description:
      "Lecturas y enseñanzas sobre tipos, sombras y figuras que apuntan a realidades mayores.",
    period: "Serie de estudio",
    totalItems: 16,
    category: "Tipología bíblica",
    featured: false,
  },
  {
    slug: "el-libro-de-apocalipsis",
    title: "El Libro de Apocalipsis",
    description:
      "Colección organizada para examinar visiones, símbolos, mensajeros y secuencias del texto profético.",
    period: "Serie exegética",
    totalItems: 22,
    category: "Profecía bíblica",
    featured: false,
  },
];

const HIGHLIGHT_STATS: HighlightStat[] = [
  {
    label: "Colecciones activas",
    value: "~06",
    detail: "Listas para navegación temática",
  },
  {
    label: "Mensajes indexados",
    value: "~122",
    detail: "Conteo provisional para desarrollo visual",
  },
  {
    label: "Cobertura",
    value: "Doctrina + Profecía",
    detail: "Organización pensada para expansión futura",
  },
];

const GUIDELINES: Guideline[] = [
  {
    title: "Exploración temática",
    description:
      "El hub agrupa series completas para facilitar continuidad de estudio y contexto doctrinal.",
  },
  {
    title: "Escalabilidad visual",
    description:
      "La estructura admite crecimiento sin romper el layout ni exigir definición inmediata de backend.",
  },
  {
    title: "Preparado para detalle",
    description:
      "Cada colección puede conectar luego con `/estudios/[coleccion]` sin rehacer esta portada.",
  },
];

const featuredCollections = STUDY_COLLECTIONS.filter((item) => item.featured);
// CORRECCIÓN CLAUDE: Filtrar las destacadas para evitar redundancia en el grid general
const regularCollections = STUDY_COLLECTIONS.filter((item) => !item.featured);

export default function EstudiosPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section
        aria-labelledby="estudios-hero-title"
        className="relative overflow-hidden border-b border-[#D4AF37]/15"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Estudios Temáticos
            </div>

            <h1
              id="estudios-hero-title"
              className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
            >
              Un hub doctrinal para recorrer colecciones, series y líneas de estudio con orden.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Esta sección reúne colecciones temáticas para consulta estructurada. El objetivo es
              ofrecer una navegación clara entre series doctrinales y proféticas sin bloquear el
              desarrollo visual por la definición final de la base de datos.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              {/* CORRECCIÓN CLAUDE: El CTA primario ancla al contenido de la página */}
              <Link
                href="#destacadas"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar colecciones
                <ArrowDown className="h-4 w-4" />
              </Link>

              <Link
                href="/el-legado"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Volver a El Legado
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                {HIGHLIGHT_STATS.map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:last:col-span-2"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#E7C96C]">
                      {stat.label}
                    </p>
                    <p className="mt-4 text-2xl font-semibold text-white">{stat.value}</p>
                    <p className="mt-2 text-sm leading-7 text-white/65">{stat.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="destacadas"
        aria-labelledby="estudios-featured-title"
        className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 scroll-mt-20"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2
            id="estudios-featured-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            Colecciones destacadas
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {featuredCollections.map((collection) => (
            <article
              key={collection.slug}
              className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <BookMarked className="h-6 w-6 text-[#D4AF37]" />
                </div>

                <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#E7C96C]">
                  Destacada
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-semibold text-white">{collection.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{collection.description}</p>

              <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  {collection.period}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  {collection.category}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  {/* CORRECCIÓN CLAUDE: Indicador visual de dato estimado */}
                  ~ {collection.totalItems} materiales
                </span>
              </div>

              <div className="mt-8">
                <Link
                  href={`/estudios/${collection.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-black/20 px-5 py-3 text-sm font-semibold text-[#F5E7B5] transition hover:border-[#D4AF37]/45 hover:bg-black/30"
                >
                  Ver colección
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="estudios-grid-title"
        className="mx-auto max-w-7xl px-6 py-4 md:px-8"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2
            id="estudios-grid-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            Todas las colecciones
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {/* CORRECCIÓN CLAUDE: Usamos regularCollections para no duplicar */}
          {regularCollections.map((collection) => (
            <article
              key={collection.slug}
              className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-2xl"
            >
              <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                <Layers3 className="h-5 w-5 text-[#D4AF37]" />
              </div>

              <h3 className="mt-5 text-xl font-semibold text-white">{collection.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{collection.description}</p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <dt className="text-white/52">Categoría</dt>
                  <dd className="font-medium text-white">{collection.category}</dd>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <dt className="text-white/52">Periodo</dt>
                  <dd className="font-medium text-white">{collection.period}</dd>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <dt className="text-white/52">Materiales</dt>
                  <dd className="font-medium text-white">~ {collection.totalItems}</dd>
                </div>
              </dl>

              <div className="mt-6">
                <Link
                  href={`/estudios/${collection.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5E7B5] transition hover:text-[#D4AF37]"
                >
                  Abrir detalle
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="estudios-guidelines-title"
        className="mx-auto grid max-w-7xl gap-8 px-6 py-12 md:px-8 md:py-16 lg:grid-cols-[0.95fr_1.05fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="estudios-guidelines-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Criterio del hub
            </h2>
          </div>

          <p className="mt-6 text-[15px] leading-8 text-white/72">
            La portada de Estudios prioriza claridad editorial y agrupación temática. Este nivel
            debe servir como entrada estable mientras se define el modelo real de colecciones,
            materiales relacionados y paginación.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-[#D4AF37]/15 bg-[#D4AF37]/7 p-5">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#E7C96C]">
              Contrato provisional
            </p>
            <p className="mt-3 text-sm leading-7 text-white/68">
              Los datos están mockeados y estructurados fuera del componente para no bloquear la
              construcción visual ni acoplar esta vista a un esquema SQL aún no confirmado.
            </p>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
              <Library className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Principios de construcción
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            {GUIDELINES.map((item) => (
              <article
                key={item.title}
                className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5"
              >
                <div className="flex items-start gap-3">
                  <ScrollText className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                  <div>
                    <h3 className="text-base font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/68">{item.description}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>
      </section>

      <section
        aria-labelledby="estudios-cta-title"
        className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24"
      >
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#E7C96C]">
                Navegación siguiente
              </p>
              <h2
                id="estudios-cta-title"
                className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl"
              >
                Continúa hacia el hub musical o vuelve al archivo principal.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                La secuencia lógica posterior en Fase 5.5 puede continuar con Alabanza como hub
                conectado al ecosistema de reproducción persistente.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/alabanza"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
              >
                Ir a Alabanza
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Abrir Archivo
              </Link>

              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                <FileText className="h-4 w-4" />
                Ver Blog
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
```

---

## src/app/alabanza/page.tsx

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ArrowDown,
  Disc3,
  Headphones,
  Mic2,
  Music2,
  Play,
  Radio,
  Sparkles,
  Waves,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Alabanza | Legado Patrimonial WSS",
  description:
    "Hub musical de Legado Patrimonial WSS para explorar colecciones de alabanzas, especiales y registros sonoros con una experiencia sobria, elegante y preparada para reproducción persistente.",
};

type MusicCollection = {
  slug: string;
  title: string;
  description: string;
  era: string;
  totalTracks: number;
  featured: boolean;
};

type FeaturedTrack = {
  conferencia_id: string;
  titulo: string;
  interprete: string;
  duracion: string;
  collectionSlug: string;
};

type HubMetric = {
  label: string;
  value: string;
  detail: string;
};

const MUSIC_COLLECTIONS: MusicCollection[] = [
  {
    slug: "himnos-clasicos",
    title: "Himnos Clásicos",
    description:
      "Colección de alabanzas de referencia para memoria congregacional, archivo histórico y continuidad musical.",
    era: "Patrimonio sonoro",
    totalTracks: 48,
    featured: true,
  },
  {
    slug: "especiales-vocales",
    title: "Especiales Vocales",
    description:
      "Selección de interpretaciones especiales preservadas para consulta y futura reproducción desde el hub.",
    era: "Registro especial",
    totalTracks: 26,
    featured: true,
  },
  {
    slug: "coros-congregacionales",
    title: "Coros Congregacionales",
    description:
      "Repertorio colectivo orientado a la participación y a la memoria sonora de la congregación.",
    era: "Vida congregacional",
    totalTracks: 34,
    featured: false,
  },
  {
    slug: "instrumentales",
    title: "Instrumentales",
    description:
      "Piezas instrumentales y fondos musicales organizados como apoyo para archivo y ambientación reverente.",
    era: "Colección instrumental",
    totalTracks: 18,
    featured: false,
  },
  {
    slug: "canticos-especiales",
    title: "Cánticos Especiales",
    description:
      "Material musical singular con valor devocional, documental y de preservación histórica.",
    era: "Serie temática",
    totalTracks: 21,
    featured: false,
  },
  {
    slug: "voces-del-archivo",
    title: "Voces del Archivo",
    description:
      "Grabaciones sonoras de alto valor patrimonial preparadas para futura integración al player persistente.",
    era: "Archivo sonoro",
    totalTracks: 15,
    featured: false,
  },
];

const FEATURED_TRACKS: FeaturedTrack[] = [
  {
    conferencia_id: "alb-001",
    titulo: "Sublime Gracia",
    interprete: "Coro Central",
    duracion: "04:32",
    collectionSlug: "himnos-clasicos",
  },
  {
    conferencia_id: "alb-002",
    titulo: "Cuán Grande es Él",
    interprete: "Grupo Vocal WSS",
    duracion: "05:10",
    collectionSlug: "especiales-vocales",
  },
  {
    conferencia_id: "alb-003",
    titulo: "Hay Poder en Jesús",
    interprete: "Congregación",
    duracion: "03:48",
    collectionSlug: "coros-congregacionales",
  },
];

const HUB_METRICS: HubMetric[] = [
  {
    label: "Colecciones",
    value: "~06",
    detail: "Hub musical listo para expansión",
  },
  {
    label: "Pistas indexadas",
    value: "~162",
    detail: "Conteo provisional para diseño visual",
  },
  {
    label: "Integración futura",
    value: "Persistent Player",
    detail: "Preparado para módulo de audio global",
  },
];

const featuredCollections = MUSIC_COLLECTIONS.filter((item) => item.featured);
const regularCollections = MUSIC_COLLECTIONS.filter((item) => !item.featured);

export default function AlabanzaPage() {
  return (
    <main className="min-h-screen bg-[#050505] text-white">
      <section
        aria-labelledby="alabanza-hero-title"
        className="relative overflow-hidden border-b border-[#D4AF37]/15"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.18),transparent_34%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0))]" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-6 py-16 md:px-8 md:py-24 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37] backdrop-blur-xl">
              <Sparkles className="h-4 w-4" />
              Hub de Alabanza
            </div>

            <h1
              id="alabanza-hero-title"
              className="mt-6 max-w-4xl text-4xl font-semibold tracking-tight text-white md:text-5xl lg:text-6xl"
            >
              Un espacio para custodiar, recorrer y activar el patrimonio musical del archivo.
            </h1>

            <p className="mt-6 max-w-3xl text-base leading-8 text-white/72 md:text-lg">
              Esta portada organiza el ecosistema musical de Legado Patrimonial WSS con un lenguaje
              visual sobrio y una estructura preparada para futura conexión directa con el reproductor
              persistente, preservando la memoria sonora de la congregación.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="#destacadas"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-sm font-semibold text-[#111111] shadow-[0_12px_40px_rgba(212,175,55,0.24)] transition hover:bg-[#e3bf4f]"
              >
                Explorar alabanzas
                <ArrowDown className="h-4 w-4" />
              </Link>

              <Link
                href="/podcast"
                className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-white/5 px-6 py-4 text-sm font-semibold text-[#F5E7B5] backdrop-blur-xl transition hover:border-[#D4AF37]/45 hover:bg-white/8"
              >
                Ir a Podcast
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-[#D4AF37]/10 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/10 bg-white/6 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
              <div className="grid gap-4 sm:grid-cols-2">
                {HUB_METRICS.map((metric) => (
                  <article
                    key={metric.label}
                    className="rounded-[1.5rem] border border-white/10 bg-black/25 p-5 sm:last:col-span-2"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#D4AF37]">
                      {metric.label}
                    </p>
                    <p className="mt-4 text-2xl font-semibold text-white">{metric.value}</p>
                    <p className="mt-2 text-sm leading-7 text-white/65">{metric.detail}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="destacadas"
        aria-labelledby="alabanza-featured-collections-title"
        className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16 scroll-mt-20"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2
            id="alabanza-featured-collections-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            Colecciones destacadas
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {featuredCollections.map((collection) => (
            <article
              key={collection.slug}
              className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                  <Disc3 className="h-6 w-6 text-[#D4AF37]" />
                </div>

                <span className="rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]">
                  Destacada
                </span>
              </div>

              <h3 className="mt-5 text-2xl font-semibold text-white">{collection.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{collection.description}</p>

              <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/62">
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  {collection.era}
                </span>
                <span className="rounded-full border border-white/10 bg-black/20 px-3 py-2">
                  ~ {collection.totalTracks} pistas
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/alabanza/${collection.slug}`}
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#D4AF37]/25 bg-black/20 px-5 py-3 text-sm font-semibold text-[#F5E7B5] transition hover:border-[#D4AF37]/45 hover:bg-black/30"
                >
                  Ver colección
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  disabled
                  aria-label={`Reproducción próximamente disponible para ${collection.title}`}
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-5 py-3 text-sm font-semibold text-white/40"
                >
                  <Play className="h-4 w-4 fill-current text-[#D4AF37]/50" />
                  Próximamente
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="alabanza-tracks-title"
        className="mx-auto grid max-w-7xl gap-8 px-6 py-4 md:px-8 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
            <h2
              id="alabanza-tracks-title"
              className="text-2xl font-semibold tracking-tight text-white"
            >
              Pistas destacadas
            </h2>
          </div>

          <div className="space-y-4">
            {FEATURED_TRACKS.map((track, index) => {
              const collectionName =
                MUSIC_COLLECTIONS.find((c) => c.slug === track.collectionSlug)?.title ??
                track.collectionSlug;

              return (
                <article
                  key={track.conferencia_id}
                  className="flex flex-col gap-4 rounded-[1.5rem] border border-white/10 bg-black/20 p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="flex items-start gap-4">
                    <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 text-sm font-semibold text-[#D4AF37]">
                      {String(index + 1).padStart(2, "0")}
                    </div>

                    <div>
                      <h3 className="text-base font-semibold text-white">{track.titulo}</h3>
                      <p className="mt-1 text-sm text-white/62">{track.interprete}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/45">
                        {collectionName}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/62">
                      {track.duracion}
                    </span>

                    <Link
                      href={`/alabanza/${track.collectionSlug}`}
                      className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-white/5 px-4 py-3 text-sm font-semibold text-white/85 transition hover:border-[#D4AF37]/35 hover:bg-white/8"
                    >
                      <Music2 className="h-4 w-4 text-[#D4AF37]" />
                      Colección
                    </Link>

                    <button
                      type="button"
                      disabled
                      aria-label={`Reproducción próximamente disponible para ${track.titulo}`}
                      className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl bg-[#D4AF37]/30 px-4 py-3 text-sm font-semibold text-[#111111]/50"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Próximamente
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/6 p-7 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
              <Headphones className="h-5 w-5 text-[#D4AF37]" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              El valor del registro sonoro
            </h2>
          </div>

          <div className="mt-6 space-y-4">
            <article className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <Radio className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                <div>
                  <h3 className="text-base font-semibold text-white">Acústica y reverencia</h3>
                  <p className="mt-2 text-sm leading-7 text-white/68">
                    La música congregacional y los especiales vocales no son mero entretenimiento, 
                    sino expresiones de reverencia que preparamos para ser escuchadas con la solemnidad debida.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <Waves className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                <div>
                  <h3 className="text-base font-semibold text-white">Preservación de audio</h3>
                  <p className="mt-2 text-sm leading-7 text-white/68">
                    Los registros históricos están siendo procesados para garantizar una calidad 
                    audible óptima sin perder la esencia del momento en que fueron grabados.
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[1.5rem] border border-white/8 bg-black/20 p-5">
              <div className="flex items-start gap-3">
                <Mic2 className="mt-1 h-5 w-5 shrink-0 text-[#D4AF37]" />
                <div>
                  <h3 className="text-base font-semibold text-white">Continuidad generacional</h3>
                  <p className="mt-2 text-sm leading-7 text-white/68">
                    Custodiar estos himnos y cánticos asegura que las futuras generaciones 
                    conozcan la identidad sonora de la congregación a través del tiempo.
                  </p>
                </div>
              </div>
            </article>
          </div>
        </article>
      </section>

      <section
        aria-labelledby="alabanza-collections-grid-title"
        className="mx-auto max-w-7xl px-6 py-12 md:px-8 md:py-16"
      >
        <div className="mb-8 flex items-center gap-3">
          <div className="h-8 w-1 rounded-full bg-[#D4AF37]" />
          <h2
            id="alabanza-collections-grid-title"
            className="text-2xl font-semibold tracking-tight text-white"
          >
            Todas las colecciones musicales
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {regularCollections.map((collection) => (
            <article
              key={collection.slug}
              className="rounded-[2rem] border border-white/10 bg-white/6 p-6 backdrop-blur-2xl"
            >
              <div className="inline-flex rounded-2xl border border-[#D4AF37]/20 bg-[#D4AF37]/10 p-3">
                <Music2 className="h-5 w-5 text-[#D4AF37]" />
              </div>

              <h3 className="mt-5 text-xl font-semibold text-white">{collection.title}</h3>
              <p className="mt-3 text-sm leading-7 text-white/68">{collection.description}</p>

              <dl className="mt-6 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <dt className="text-white/52">Serie</dt>
                  <dd className="font-medium text-white">{collection.era}</dd>
                </div>

                <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                  <dt className="text-white/52">Pistas</dt>
                  <dd className="font-medium text-white">~ {collection.totalTracks}</dd>
                </div>
              </dl>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/alabanza/${collection.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#F5E7B5] transition hover:text-[#D4AF37]"
                >
                  Abrir detalle
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <button
                  type="button"
                  disabled
                  aria-label={`Reproducción próximamente disponible para la colección ${collection.title}`}
                  className="inline-flex cursor-not-allowed items-center gap-2 rounded-2xl border border-white/5 bg-white/5 px-4 py-2 text-sm font-semibold text-white/40"
                >
                  <Play className="h-4 w-4 fill-current text-[#D4AF37]/50" />
                  Próximamente
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="alabanza-cta-title"
        className="mx-auto max-w-7xl px-6 pb-16 md:px-8 md:pb-24"
      >
        <div className="rounded-[2rem] border border-[#D4AF37]/20 bg-[linear-gradient(180deg,rgba(212,175,55,0.12),rgba(255,255,255,0.03))] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#D4AF37]">
                Siguiente ruta
              </p>
              <h2
                id="alabanza-cta-title"
                className="mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl"
              >
                Continúa hacia Podcast o regresa al archivo principal.
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/72">
                Este hub musical ya queda visualmente alineado con la futura capa de reproducción
                persistente y con el sistema general de navegación del proyecto.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/podcast"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-[#111111] transition hover:bg-[#e3bf4f]"
              >
                Ir a Podcast
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                href="/archivo"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/12 bg-black/20 px-5 py-3 text-sm font-semibold text-white transition hover:border-[#D4AF37]/35 hover:bg-black/30"
              >
                Abrir Archivo
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
```

