import type { LyricLine, SyncedLyrics } from "@/types/lyrics";

interface RawLine { text?: unknown; start?: unknown; end?: unknown }

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : Number(v));

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
    if (end <= start) continue;
    const prev = lines[lines.length - 1];
    if (prev && start < prev.end) prev.end = Math.max(prev.start + 0.2, start);

    lines.push({
      id: `${songId}-line-${lines.length + 1}`,
      text,
      start,
      end,
    });
  }
  if (lines.length === 0) return null;
  return {
    language: typeof body.language === "string" && body.language ? body.language : "en",
    lines,
    wordTimingSource: "line-only",
  };
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

export interface WordAlignmentResult {
  lyrics: SyncedLyrics;
  aligned: boolean;
  reason?: "not_configured" | "unavailable";
}

/** Requests audio-based word timings for a saved song's current transcript. */
export async function alignSavedSong(
  songId: string,
  deviceId: string,
  signal?: AbortSignal,
): Promise<WordAlignmentResult> {
  const res = await fetch("/api/transcribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: songId, deviceId, action: "align" }),
    signal: signal ?? null,
  });
  const body = (await res.json().catch(() => ({}))) as {
    error?: string;
    lyrics?: SyncedLyrics;
    aligned?: boolean;
    reason?: WordAlignmentResult["reason"];
  };
  if (!res.ok || !body.lyrics) throw new Error(body.error ?? "Word alignment failed.");
  return {
    lyrics: body.lyrics,
    aligned: Boolean(body.aligned),
    ...(body.reason ? { reason: body.reason } : {}),
  };
}
