"use client";

import { ConferenceDetail } from "@/components/ui";
import type { ConferenceData } from "@/components/ui";

interface Props {
    conference: ConferenceData;
}

export function ConferenceDetailWrapper({ conference }: Props) {
    return (
        <ConferenceDetail
            conference={conference}
            onPlayAudio={() => {
                // En producción: cargar conferencia en el player store
                console.log("Play audio for:", conference.id);
            }}
        />
    );
}
