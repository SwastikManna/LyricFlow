import type { LyricLine, SyncedLyrics } from "@/types/lyrics";

export type ExportVariant = "original" | "romanized" | { translation: string };

function lineText(line: LyricLine, variant: ExportVariant): string {
  if (variant === "original") return line.text;
  if (variant === "romanized") return line.romanization?.trim() || line.text;
  return line.translations?.[variant.translation]?.trim() || line.text;
}

function lrcTime(s: number) {
  const t = Math.max(0, s);
  const m = Math.floor(t / 60);
  const sec = t - m * 60;
  return `${String(m).padStart(2, "0")}:${sec.toFixed(2).padStart(5, "0")}`;
}

function srtTime(s: number) {
  const ms = Math.max(0, Math.round(s * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  const r = ms % 1000;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(r).padStart(3, "0")}`;
}

export function toLrc(lyrics: SyncedLyrics, meta: { title: string; artist: string; duration?: number | undefined }, variant: ExportVariant = "original") {
  const head = [`[ti:${meta.title}]`, `[ar:${meta.artist}]`];
  if (meta.duration) head.push(`[length:${lrcTime(meta.duration).slice(0, 5)}]`);
  head.push("[re:LyricFlow]");
  const body = [...lyrics.lines].sort((a, b) => a.start - b.start).map((l) => `[${lrcTime(l.start)}]${lineText(l, variant)}`);
  return [...head, ...body].join("\n") + "\n";
}

export function toSrt(lyrics: SyncedLyrics, variant: ExportVariant = "original") {
  return [...lyrics.lines]
    .sort((a, b) => a.start - b.start)
    .map((l, i) => `${i + 1}\n${srtTime(l.start)} --> ${srtTime(Math.max(l.end, l.start + 0.3))}\n${lineText(l, variant)}\n`)
    .join("\n");
}

function safeName(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "").trim() || "lyrics";
}

export function downloadLyrics(
  format: "lrc" | "srt",
  lyrics: SyncedLyrics,
  meta: { title: string; artist: string; duration?: number | undefined },
  variant: ExportVariant = "original",
) {
  const text = format === "lrc" ? toLrc(lyrics, meta, variant) : toSrt(lyrics, variant);
  const suffix = variant === "original" ? "" : variant === "romanized" ? " (romanized)" : ` (${variant.translation})`;
  const blob = new Blob([text], { type: format === "lrc" ? "text/plain" : "application/x-subrip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeName(`${meta.artist} - ${meta.title}${suffix}`)}.${format}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
