import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/hooks/useAudioPlayer";

interface ProgressBarProps {
  duration: number;
  subscribeTime: (listener: (time: number) => void) => () => void;
  onSeek: (time: number) => void;
  disabled?: boolean;
}

/** Seekable timeline. Reads the audio clock directly to avoid parent re-renders. */
export function ProgressBar({ duration, subscribeTime, onSeek, disabled = false }: ProgressBarProps) {
  const [time, setTime] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => subscribeTime((t) => {
    if (!draggingRef.current) setTime(t);
  }), [subscribeTime]);

  const percent =
    Number.isFinite(duration) && duration > 0 ? Math.max(0, Math.min(100, (time / duration) * 100)) : 0;

  const seekFromEvent = (clientX: number) => {
    const el = trackRef.current;
    if (!el || duration <= 0) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    setTime(ratio * duration);
    onSeek(ratio * duration);
  };

  return (
    <div className="w-full">
      <div
        ref={trackRef}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label="Seek"
        aria-disabled={disabled}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        aria-valuetext={`${formatTime(time)} of ${formatTime(duration)}`}
        onPointerDown={(e) => {
          if (disabled) return;
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromEvent(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) seekFromEvent(e.clientX);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          draggingRef.current = false;
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowRight") {
            e.preventDefault();
            onSeek(Math.min(duration, time + 5));
          }
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            onSeek(Math.max(0, time - 5));
          }
        }}
        className={`group relative flex h-6 w-full items-center touch-none ${disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/15">
          {/* Driven every animation frame from the audio clock — no CSS easing, so it never lags. */}
          <div
            className="h-full w-full origin-left rounded-full bg-primary"
            style={{ transform: `scaleX(${percent / 100})` }}
          />
        </div>
        <div
          className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-primary shadow-glow transition-transform group-hover:scale-125"
          style={{ left: `${percent}%` }}
        />
      </div>
      <div className="flex justify-between text-xs tabular-nums text-muted-foreground">
        <span>{formatTime(time)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}
