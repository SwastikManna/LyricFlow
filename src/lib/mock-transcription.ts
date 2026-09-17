import type { SyncedLyrics, LyricLine, LyricWord } from "@/types/lyrics";

/**
 * Mock transcription engine.
 *
 * This is the ONLY place that fabricates lyric data. Replacing it with a real
 * speech-to-text + forced-alignment pipeline (server side) requires no changes
 * to the player, hooks, or components — they only consume `SyncedLyrics`.
 */

const VERSES = [
  "City lights are bleeding into the rain",
  "I hear your name inside the静 quiet of the train",
  "Every streetlight keeps a secret of its own",
  "We were young and made of neon and bone",
  "Hold the night a little longer, love",
  "The static hum of everything above",
  "And if the morning takes it all away",
  "I'll keep this song to say what I can't say",
  "Slow down, let the echo find its way",
  "Somewhere between the silence and the day",
  "You were the chorus I forgot to write",
  "A melody that only moves at night",
  "So play it back until the ending fades",
  "Until the color runs out of the shade",
  "We are only borrowed light and sound",
  "Turning, turning, never touching ground",
];

function cleanLine(line: string) {
  return line.replace(/静/g, "");
}

function buildWords(text: string, start: number, end: number): LyricWord[] {
  const tokens = text.split(" ").filter(Boolean);
  const totalWeight = tokens.reduce((sum, t) => sum + Math.max(2, t.length), 0);
  const span = Math.max(0.4, end - start - 0.15);
  let cursor = start;

  return tokens.map((token) => {
    const weight = Math.max(2, token.length) / totalWeight;
    const wordStart = cursor;
    const wordEnd = Math.min(end, wordStart + span * weight);
    cursor = wordEnd;
    return { text: token, start: wordStart, end: wordEnd };
  });
}

/**
 * Produces plausible synchronized lyrics for a track of `duration` seconds.
 * Deterministic per song id so reloads keep the same lyrics.
 */
export function generateMockLyrics(songId: string, duration: number): SyncedLyrics {
  const safeDuration = duration > 5 ? duration : 180;
  const seed = [...songId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  const intro = Math.min(6, safeDuration * 0.04);
  const outro = Math.min(8, safeDuration * 0.05);
  const singingSpan = Math.max(20, safeDuration - intro - outro);

  const lineCount = Math.max(6, Math.min(VERSES.length, Math.round(singingSpan / 6.5)));
  const perLine = singingSpan / lineCount;

  const lines: LyricLine[] = [];
  for (let i = 0; i < lineCount; i++) {
    const text = cleanLine(VERSES[(i + seed) % VERSES.length]!);
    const start = Number((intro + i * perLine).toFixed(2));
    // Small breath between lines keeps highlighting from feeling mechanical.
    const end = Number((start + perLine * 0.88).toFixed(2));
    lines.push({
      id: `${songId}-line-${i + 1}`,
      text,
      start,
      end,
      words: buildWords(text, start, end),
    });
  }

  return { language: "en", lines };
}

/** Small preview used on the landing page. */
export const previewLyrics: SyncedLyrics = {
  language: "en",
  lines: [
    { id: "p1", text: "City lights are bleeding into the rain", start: 0, end: 3.2 },
    { id: "p2", text: "I hear your name inside the quiet of the train", start: 3.2, end: 6.6 },
    { id: "p3", text: "Every streetlight keeps a secret of its own", start: 6.6, end: 10 },
    { id: "p4", text: "We were young and made of neon and bone", start: 10, end: 13.4 },
  ],
};
