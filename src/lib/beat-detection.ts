import type { LyricLine, SyncedLyrics } from "@/types/lyrics";

/**
 * Browser-side beat detection (Web Audio API) and lyric re-alignment.
 *
 * 1. Decode the audio and build an energy-onset envelope.
 * 2. Estimate tempo from the strongest normalized autocorrelation in the
 *    musical range (40–240 BPM), without assuming a preferred click tempo.
 * 3. Pick the beat phase that best matches the onsets and build a beat grid.
 * 4. Snap each lyric line to the nearest beat (within a tolerance) and
 *    re-map its word timings proportionally into the new line span.
 */

export interface BeatGrid {
  bpm: number;
  beats: number[];
  /** 0–1, how strongly the song follows a steady pulse. */
  confidence: number;
}

const HOP = 512;
const FRAME = 1024;

export async function detectBeats(data: ArrayBuffer): Promise<BeatGrid | null> {
  if (typeof window === "undefined") return null;
  const Ctx = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  if (!Ctx) return null;
  const ctx = new Ctx(1, 44100, 44100);
  const buffer = await ctx.decodeAudioData(data.slice(0));
  const sr = buffer.sampleRate;

  // Downmix to mono.
  const len = buffer.length;
  const mono = new Float32Array(len);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const ch = buffer.getChannelData(c);
    for (let i = 0; i < len; i++) mono[i]! += ch[i]! / buffer.numberOfChannels;
  }

  // Onset envelope: positive change in frame energy (log-compressed).
  const frames = Math.floor((len - FRAME) / HOP);
  if (frames < 64) return null;
  const env = new Float32Array(frames);
  let prev = 0;
  for (let f = 0; f < frames; f++) {
    let e = 0;
    const off = f * HOP;
    for (let i = 0; i < FRAME; i++) {
      const v = mono[off + i]!;
      e += v * v;
    }
    const le = Math.log1p(1000 * (e / FRAME));
    env[f] = Math.max(0, le - prev);
    prev = le;
  }
  // Remove local mean so steady loudness doesn't dominate.
  const win = 16;
  const onset = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let s = 0;
    let n = 0;
    for (let k = Math.max(0, f - win); k < Math.min(frames, f + win); k++) {
      s += env[k]!;
      n++;
    }
    onset[f] = Math.max(0, env[f]! - s / n);
  }

  const fps = sr / HOP;
  const minLag = Math.floor((60 / 240) * fps);
  const maxLag = Math.ceil((60 / 40) * fps);
  let bestLag = 0;
  let bestScore = -1;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    let energyA = 0;
    let energyB = 0;
    for (let f = lag; f < frames; f++) {
      const a = onset[f]!;
      const b = onset[f - lag]!;
      s += a * b;
      energyA += a * a;
      energyB += b * b;
    }
    const score = energyA && energyB ? s / Math.sqrt(energyA * energyB) : 0;
    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }
  if (!bestLag || bestScore <= 0) return null;

  // Best phase for that period.
  let bestPhase = 0;
  let phaseScore = -1;
  for (let ph = 0; ph < bestLag; ph++) {
    let s = 0;
    for (let f = ph; f < frames; f += bestLag) s += onset[f]!;
    if (s > phaseScore) {
      phaseScore = s;
      bestPhase = ph;
    }
  }

  const period = bestLag / fps;
  const beats: number[] = [];
  for (let t = (bestPhase * HOP + FRAME / 2) / sr; t < buffer.duration; t += period) beats.push(Number(t.toFixed(3)));

  const confidence = Math.max(0, Math.min(1, bestScore));
  return { bpm: Math.round(60 / period), beats, confidence };
}

function nearestBeat(beats: number[], t: number): number {
  let lo = 0;
  let hi = beats.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (beats[mid]! < t) lo = mid + 1;
    else hi = mid;
  }
  const a = beats[Math.max(0, lo - 1)]!;
  const b = beats[lo]!;
  return Math.abs(a - t) <= Math.abs(b - t) ? a : b;
}

/** Snaps lines to the beat grid and re-syncs word timings inside each line. */
export function alignLyricsToBeats(lyrics: SyncedLyrics, grid: BeatGrid): SyncedLyrics {
  if (grid.beats.length < 4) return lyrics;
  const period = 60 / grid.bpm;
  const tolerance = Math.min(0.35, period * 0.45);

  const snap = (t: number) => {
    const b = nearestBeat(grid.beats, t);
    return Math.abs(b - t) <= tolerance ? b : t;
  };

  const lines: LyricLine[] = lyrics.lines.map((l) => ({ ...l }));
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const orig = lyrics.lines[i]!;
    const prevEnd = i > 0 ? lines[i - 1]!.end : 0;
    const start = Math.max(prevEnd, snap(orig.start));
    const nextStart = lines[i + 1] ? snap(lyrics.lines[i + 1]!.start) : Infinity;
    let end = snap(orig.end);
    if (end > nextStart) end = nextStart;
    if (end - start < 0.3) end = Math.min(Math.max(start + 0.3, orig.end), nextStart);
    if (end <= start) end = start + 0.3;

    const oldSpan = Math.max(0.001, orig.end - orig.start);
    const newSpan = end - start;
    const remap = (t: number) => start + ((t - orig.start) / oldSpan) * newSpan;

    line.start = Number(start.toFixed(3));
    line.end = Number(end.toFixed(3));
    if (orig.words) line.words = orig.words.map((w) => ({
      text: w.text,
      start: Number(Math.max(line.start, remap(w.start)).toFixed(3)),
      end: Number(Math.min(line.end, remap(w.end)).toFixed(3)),
    }));
  }
  return { ...lyrics, lines };
}
