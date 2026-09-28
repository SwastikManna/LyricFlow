import { useEffect, useRef } from "react";
import { LyricLine, type LyricsScriptMode, type TranslationDisplayMode } from "./LyricLine";
import { useLyricsSync } from "@/hooks/useLyricsSync";
import type { SyncedLyrics } from "@/types/lyrics";

interface LyricsDisplayProps {
  lyrics: SyncedLyrics | null;
  subscribeTime: (listener: (time: number) => void) => () => void;
  onSeek: (time: number) => void;
  translationLanguage: string;
  scriptMode: LyricsScriptMode;
  translationDisplay: TranslationDisplayMode;
  isFullscreen?: boolean;
}

/** Auto-scrolling live lyrics. The active line glides toward the centre. */
export function LyricsDisplay({ lyrics, subscribeTime, onSeek, translationLanguage, scriptMode, translationDisplay, isFullscreen = false }: LyricsDisplayProps) {
  const { activeIndex } = useLyricsSync({ lyrics, subscribeTime });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const lineRefs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const container = containerRef.current;
    const target = lineRefs.current[activeIndex >= 0 ? activeIndex : 0];
    if (!container || !target) return;

    const offset =
      target.offsetTop - container.clientHeight / 2 + target.clientHeight / 2;
    container.scrollTo({ top: Math.max(0, offset), behavior: "smooth" });
  }, [activeIndex]);

  if (!lyrics || lyrics.lines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No lyrics available for this track yet.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`fade-mask-y h-full overflow-y-auto scroll-smooth px-1 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden ${isFullscreen ? "py-[5vh] sm:py-[8vh] lg:py-[12vh]" : "py-[12vh] sm:py-[20vh] lg:py-[28vh]"}`}
    >
      {lyrics.lines.map((line, index) => (
        <div key={line.id} ref={(el) => { lineRefs.current[index] = el; }}>
          <LyricLine
            line={line}
            wordTimingsReliable={lyrics.wordTimingSource === "audio-aligned"}
            isFullscreen={isFullscreen}
            isActive={index === activeIndex}
            translationLanguage={translationLanguage}
            scriptMode={scriptMode}
            translationDisplay={translationDisplay}
            distance={Math.abs(index - (activeIndex < 0 ? 0 : activeIndex))}
            onSeek={onSeek}
            subscribeTime={index === activeIndex ? subscribeTime : undefined}
          />
        </div>
      ))}
    </div>
  );
}
