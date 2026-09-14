import { cn } from "@/lib/utils";
import type { LyricWord as LyricWordType } from "@/types/lyrics";

interface LyricWordProps {
  word: LyricWordType;
  /** Fraction of the word already sung, 0 - 1. */
  progress: number;
}

/** A single karaoke word: the sung portion is revealed left-to-right. */
export function LyricWord({ word, progress }: LyricWordProps) {
  const clamped = Math.max(0, Math.min(1, progress));

  return (
    <span className="relative mr-[0.28em] inline-block whitespace-pre">
      <span className={cn("text-foreground/35")}>{word.text}</span>
      <span
        aria-hidden
        className="absolute inset-0 overflow-hidden text-primary transition-[clip-path] duration-100 ease-linear"
        style={{ clipPath: `inset(0 ${(1 - clamped) * 100}% 0 0)` }}
      >
        {word.text}
      </span>
    </span>
  );
}
