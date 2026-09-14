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
}

export interface SyncedLyrics {
  language: string;
  lines: LyricLine[];
}

export interface Lyrics {
  id: string;
  songId: string;
  language: string;
  /** Where the lyrics came from: mock generator today, AI transcription later. */
  source: "MOCK" | "AI_TRANSCRIPTION" | "MANUAL";
  synchronizedLyrics: SyncedLyrics;
}
