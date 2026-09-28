export interface LyricWord {
  text: string;
  start: number;
  end: number;
}

export interface LyricLine {
  id: string;
  text: string;
  start: number;
  end: number;
  words?: LyricWord[];
  /** Human or AI translations, keyed by BCP-47 language code. */
  translations?: Record<string, string>;
  /** Phonetic rendering of the same sung words in the Latin alphabet. */
  romanization?: string;
}

export interface SyncedLyrics {
  language: string;
  lines: LyricLine[];
  /** Only forced audio alignment is trusted for word-by-word karaoke highlighting. */
  wordTimingSource?: "audio-aligned" | "line-only";
  beatGrid?: {
    bpm: number;
    beats: number[];
    confidence: number;
  };
}

export interface Lyrics {
  id: string;
  songId: string;
  language: string;
  /** Whether the lyrics came from the AI transcription or were edited manually. */
  source: "MOCK" | "AI_TRANSCRIPTION" | "MANUAL";
  synchronizedLyrics: SyncedLyrics;
}
