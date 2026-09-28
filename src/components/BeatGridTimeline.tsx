import { useEffect, useMemo, useRef, useState } from "react";
import { AudioLines, ChevronLeft, ChevronRight, Crosshair } from "lucide-react";
import type { LyricLine } from "@/types/lyrics";

const WINDOW_SECONDS = 16;

interface BeatGridTimelineProps {
  duration: number;
  beats: number[];
  bpm: number;
  confidence: number;
  lines: LyricLine[];
  selectedLineId: string | null;
  currentTime: number;
  onSelectLine: (id: string) => void;
  onPlaceLine: (id: string, time: number) => void;
  onSeek: (time: number) => void;
}

export function BeatGridTimeline({
  duration,
  beats,
  bpm,
  confidence,
  lines,
  selectedLineId,
  currentTime,
  onSelectLine,
  onPlaceLine,
  onSeek,
}: BeatGridTimelineProps) {
  const maxStart = Math.max(0, duration - WINDOW_SECONDS);
  const [windowStart, setWindowStart] = useState(0);
  const manualNavigation = useRef(false);
  const previousPlaybackTime = useRef(currentTime);

  useEffect(() => {
    const previousTime = previousPlaybackTime.current;
    previousPlaybackTime.current = currentTime;
    const windowEnd = windowStart + WINDOW_SECONDS;

    // Let a manually chosen section stay put. Resume following after playback
    // passes through that section, or when the user chooses Now.
    if (manualNavigation.current) {
      if (currentTime > previousTime && previousTime <= windowEnd && currentTime > windowEnd) {
        manualNavigation.current = false;
        setWindowStart(Math.min(maxStart, Math.max(0, currentTime - WINDOW_SECONDS / 2)));
      }
      return;
    }

    if (currentTime < windowStart || currentTime > windowEnd) {
      setWindowStart(Math.min(maxStart, Math.max(0, currentTime - WINDOW_SECONDS / 2)));
    }
  }, [currentTime, maxStart, windowStart]);

  const ticks = useMemo(() => {
    const first = Math.ceil(windowStart);
    const last = Math.min(Math.floor(windowStart + WINDOW_SECONDS), Math.ceil(duration));
    return Array.from({ length: Math.max(0, last - first + 1) }, (_, i) => first + i);
  }, [duration, windowStart]);
  const visibleBeats = useMemo(
    () => beats.filter((beat) => beat >= windowStart && beat <= windowStart + WINDOW_SECONDS),
    [beats, windowStart],
  );
  const visibleLines = useMemo(
    () => lines.filter((line) => line.end >= windowStart && line.start <= windowStart + WINDOW_SECONDS),
    [lines, windowStart],
  );
  const selectedLine = lines.find((line) => line.id === selectedLineId);

  const percent = (time: number) => Math.max(0, Math.min(100, ((time - windowStart) / WINDOW_SECONDS) * 100));
  const setManualWindow = (start: number) => {
    manualNavigation.current = true;
    setWindowStart(Math.max(0, Math.min(maxStart, start)));
  };
  const shiftWindow = (delta: number) => setManualWindow(windowStart + delta);
  const seekTo = (time: number) => {
    manualNavigation.current = false;
    onSeek(time);
  };

  return (
    <section className="glass-panel rounded-2xl p-4 sm:p-5" aria-label="Beat grid timeline">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary"><AudioLines className="size-4" /></span>
          <div>
            <h2 className="font-display text-lg">Beat grid</h2>
            <p className="text-xs text-muted-foreground">Use the slider or arrows to find a lyric, then tap a beat to place its start.</p>
          </div>
        </div>
        <div className="flex items-baseline gap-2 rounded-full border border-glass-border bg-background/40 px-3 py-1.5">
          <span className="font-display text-lg tabular-nums text-primary">{bpm}</span>
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">BPM</span>
          <span className="ml-1 border-l border-glass-border pl-2 text-[10px] tabular-nums text-muted-foreground">{Math.round(confidence * 100)}% confidence</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button type="button" onClick={() => shiftWindow(-WINDOW_SECONDS / 2)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-glass-border text-muted-foreground hover:bg-glass hover:text-foreground" aria-label="Previous timeline section"><ChevronLeft className="size-4" /></button>
        <input
          type="range"
          min={0}
          max={maxStart}
          step={0.1}
          value={Math.min(windowStart, maxStart)}
          onChange={(event) => setManualWindow(Number(event.target.value))}
          className="h-1 w-full cursor-pointer accent-primary"
          aria-label="Timeline section"
        />
        <button type="button" onClick={() => shiftWindow(WINDOW_SECONDS / 2)} className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-glass-border text-muted-foreground hover:bg-glass hover:text-foreground" aria-label="Next timeline section"><ChevronRight className="size-4" /></button>
        <button type="button" onClick={() => { manualNavigation.current = false; setWindowStart(Math.min(maxStart, Math.max(0, currentTime - WINDOW_SECONDS / 2))); }} className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-glass-border px-2 text-[10px] text-muted-foreground hover:bg-glass hover:text-foreground" aria-label="Center timeline on playback"><Crosshair className="size-3" /> Now</button>
      </div>

      <div className="mt-2 overflow-x-auto pb-1">
        <div className="min-w-[640px]">
          <div className="relative h-7 border-b border-glass-border/70">
            {ticks.map((tick) => (
              <button key={tick} type="button" onClick={() => seekTo(tick)} className="absolute bottom-0 -translate-x-1/2 text-[9px] tabular-nums text-muted-foreground hover:text-primary" style={{ left: `${percent(tick)}%` }}>{Math.floor(tick / 60)}:{String(tick % 60).padStart(2, "0")}</button>
            ))}
          </div>

          <div className="relative mt-3 h-12 rounded-lg bg-background/35" aria-label="Detected beats">
            {ticks.map((tick) => <span key={tick} aria-hidden className="absolute inset-y-0 w-px bg-foreground/[0.06]" style={{ left: `${percent(tick)}%` }} />)}
            {visibleBeats.map((beat, index) => (
              <button
                key={`${beat}-${index}`}
                type="button"
                onClick={() => selectedLineId && onPlaceLine(selectedLineId, beat)}
                disabled={!selectedLineId}
                title={selectedLine ? `Place “${selectedLine.text}” at ${beat.toFixed(2)} seconds` : `Beat at ${beat.toFixed(2)} seconds`}
                aria-label={`Beat at ${beat.toFixed(2)} seconds`}
                className={`absolute bottom-2 top-2 w-1 -translate-x-1/2 rounded-full bg-primary/65 transition-colors ${selectedLineId ? "cursor-pointer hover:w-1.5 hover:bg-foreground" : "cursor-default"}`}
                style={{ left: `${percent(beat)}%` }}
              />
            ))}
            {currentTime >= windowStart && currentTime <= windowStart + WINDOW_SECONDS && <span className="pointer-events-none absolute inset-y-0 z-[2] w-px bg-accent" style={{ left: `${percent(currentTime)}%` }} />}
          </div>

          <div className="relative mt-2 min-h-10 rounded-lg border border-dashed border-glass-border/70 bg-background/20">
            {visibleLines.map((line) => {
              const left = percent(Math.max(line.start, windowStart));
              const right = percent(Math.min(line.end, windowStart + WINDOW_SECONDS));
              return (
                <button
                  key={line.id}
                  type="button"
                  onClick={() => onSelectLine(line.id)}
                  title={`${line.text} · ${line.start.toFixed(2)}s`}
                  className={`absolute inset-y-1 overflow-hidden rounded-md border px-1.5 text-left text-[9px] transition-colors ${line.id === selectedLineId ? "border-primary/70 bg-primary/20 text-foreground" : "border-glass-border bg-glass text-muted-foreground hover:border-primary/40"}`}
                  style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%` }}
                >
                  <span className="block truncate">{line.text}</span>
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] text-muted-foreground">
            <span>BEATS</span>
            <span>{selectedLine ? `Placing: ${selectedLine.text}` : "Select a lyric line below"}</span>
            <span>LYRICS</span>
          </div>
        </div>
      </div>
    </section>
  );
}
