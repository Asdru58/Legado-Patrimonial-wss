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
