import type { LyricLine, LyricWord, SyncedLyrics } from "@/types/lyrics";

interface RawWord { text?: unknown; start?: unknown; end?: unknown }
interface RawLine { text?: unknown; start?: unknown; end?: unknown; words?: unknown }

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v));

/** Evenly spreads words across a line when the AI gave no usable word timings. */
function spreadWords(text: string, start: number, end: number): LyricWord[] {
  const tokens = text.split(/\s+/).filter(Boolean);
  const total = tokens.reduce((s, t) => s + Math.max(2, t.length), 0);
  let cursor = start;
  return tokens.map((t) => {
    const w = ((end - start) * Math.max(2, t.length)) / total;
    const word = { text: t, start: cursor, end: cursor + w };
    cursor += w;
    return word;
  });
}

/** Cleans raw AI output into well-formed synced lyrics. Returns null when there are no lines. */
export function normalizeLyrics(
  songId: string,
  body: { language?: unknown; lines?: unknown },
  duration: number,
): SyncedLyrics | null {
  const max = duration > 0 ? duration : Infinity;
  const lines: LyricLine[] = [];
  for (const raw of (Array.isArray(body.lines) ? body.lines : []) as RawLine[]) {
    const text = String(raw.text ?? "").trim();
    let start = num(raw.start);
    let end = num(raw.end);
    if (!text || !Number.isFinite(start)) continue;
    start = Math.max(0, Math.min(start, max));
    if (!Number.isFinite(end) || end <= start) end = start + 3;
    end = Math.min(end, max);
    const prev = lines[lines.length - 1];
    if (prev && start < prev.end) prev.end = Math.max(prev.start + 0.2, start);

    let words: LyricWord[] = Array.isArray(raw.words)
      ? (raw.words as RawWord[])
          .map((w) => ({ text: String(w.text ?? "").trim(), start: num(w.start), end: num(w.end) }))
          .filter((w) => w.text && Number.isFinite(w.start) && Number.isFinite(w.end) && w.end > w.start)
          .map((w) => ({ ...w, start: Math.max(start, w.start), end: Math.min(end, w.end) }))
      : [];
    if (words.length === 0) words = spreadWords(text, start, end);

    lines.push({ id: `${songId}-line-${lines.length + 1}`, text, start, end, words });
  }
  if (lines.length === 0) return null;
  return { language: typeof body.language === "string" && body.language ? body.language : "en", lines };
}

/** Asks the server to transcribe a saved song; the lyrics are stored with the song. */
export async function transcribeSavedSong(
  songId: string,
  deviceId: string,
  signal?: AbortSignal,
): Promise<SyncedLyrics> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: songId, deviceId }),
    signal: signal ?? null,
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string; lyrics?: SyncedLyrics };
  if (!res.ok || !body.lyrics) throw new Error(body.error ?? "Transcription failed.");
  return body.lyrics;
}
