import { useEffect, useRef, useState } from "react";
import { formatTime } from "@/hooks/useAudioPlayer";

interface ProgressBarProps {
  duration: number;
  subscribeTime: (listener: (time: number) => void) => () => void;
  onSeek: (time: number) => void;
}

/** Seekable timeline. Reads the audio clock directly to avoid parent re-renders. */
export function ProgressBar({ duration, subscribeTime, onSeek }: ProgressBarProps) {
  const [time, setTime] = useState(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  useEffect(() => subscribeTime((t) => {
    if (!draggingRef.current) setTime(t);
  }), [subscribeTime]);

  const percent = duration > 0 ? Math.min(100, (time / duration) * 100) : 0;

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
        tabIndex={0}
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(time)}
        onPointerDown={(e) => {
          draggingRef.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          seekFromEvent(e.clientX);
        }}
        onPointerMove={(e) => {
          if (draggingRef.current) seekFromEvent(e.clientX);
        }}
        onPointerUp={(e) => {
          draggingRef.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") onSeek(time + 5);
          if (e.key === "ArrowLeft") onSeek(time - 5);
        }}
        className="group relative flex h-6 w-full cursor-pointer touch-none items-center"
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-foreground/15">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100 ease-linear"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div
          className="pointer-events-none absolute size-3 -translate-x-1/2 rounded-full bg-primary opacity-0 shadow-glow transition-opacity group-hover:opacity-100"
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
