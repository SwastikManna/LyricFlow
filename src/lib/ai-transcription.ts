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

/** Sends the audio to the server for AI transcription and returns clean synced lyrics. */
export async function transcribeAudio(
  songId: string,
  file: File,
  duration: number,
  signal?: AbortSignal,
): Promise<SyncedLyrics> {
  const form = new FormData();
  form.append("file", file, file.name);
  const res = await fetch("/api/transcribe", { method: "POST", body: form, signal });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    language?: string;
    lines?: RawLine[];
  };
  if (!res.ok) throw new Error(body.error ?? "Transcription failed.");

  const max = duration > 0 ? duration : Infinity;
  const lines: LyricLine[] = [];
  for (const raw of body.lines ?? []) {
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

  if (lines.length === 0) throw new Error("No vocals were detected in this track.");
  return { language: body.language || "en", lines };
}
