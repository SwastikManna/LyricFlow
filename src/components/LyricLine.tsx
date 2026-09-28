import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LyricWord } from "./LyricWord";
import type { LyricLine as LyricLineType } from "@/types/lyrics";

export type LyricsScriptMode = "original" | "romanized";
export type TranslationDisplayMode = "dual" | "translated" | "hidden";

interface LyricLineProps {
  line: LyricLineType;
  isActive: boolean;
  translationLanguage: string;
  scriptMode: LyricsScriptMode;
  translationDisplay: TranslationDisplayMode;
  /** Distance from the active line; used to fade far-away lines. */
  distance: number;
  onSeek: (time: number) => void;
  /** Only supplied for the active line, so only it re-renders per frame. */
  subscribeTime?: ((listener: (time: number) => void) => () => void) | undefined;
}

export function LyricLine({ line, isActive, distance, onSeek, subscribeTime, translationLanguage, scriptMode, translationDisplay }: LyricLineProps) {
  const [time, setTime] = useState(line.start);
  const frame = useRef(0);

  useEffect(() => {
    if (!isActive || !subscribeTime) return;
    return subscribeTime((t) => {
      // Throttle to ~20fps: karaoke reveal does not need every frame.
      frame.current = (frame.current + 1) % 3;
      if (frame.current === 0) setTime(t);
    });
  }, [isActive, subscribeTime]);

  const opacity = isActive ? 1 : Math.max(0.14, 0.5 - distance * 0.09);
  const hasWords = Boolean(line.words?.length);
  const translation = line.translations?.[translationLanguage]?.trim();
  const romanization = line.romanization?.trim();
  const sourceText = scriptMode === "romanized" && romanization ? romanization : line.text;
  const hasTranslation = Boolean(translation) && translation?.toLocaleLowerCase() !== sourceText.toLocaleLowerCase();
  const primaryText = translationDisplay === "translated" && hasTranslation ? translation! : sourceText;
  const showTranslation = translationDisplay === "dual" && hasTranslation;
  const primaryIsOriginal = primaryText === line.text;
  const primaryIsRomanized = Boolean(romanization) && primaryText === romanization;

  return (
    <button
      type="button"
      onClick={() => onSeek(line.start)}
      aria-current={isActive ? "true" : undefined}
      className={cn(
        "block w-full cursor-pointer text-balance px-1 py-3 text-left font-display leading-tight",
        "text-2xl transition-all duration-500 ease-out sm:text-3xl md:text-4xl lg:text-[2.75rem]",
        "hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0",
        isActive ? "scale-[1.02] font-semibold" : "font-medium blur-[0.3px]",
      )}
      style={{ opacity, transformOrigin: "left center" }}
    >
      <span className="block">
        {isActive && hasWords && primaryIsOriginal ? (
          <span>
            {line.words!.map((word, i) => {
              const span = Math.max(0.001, word.end - word.start);
              return (
                <LyricWord
                  key={`${line.id}-w${i}`}
                  word={word}
                  progress={(time - word.start) / span}
                />
              );
            })}
          </span>
        ) : isActive && primaryIsRomanized ? (
          <LyricWord
            word={{ text: primaryText, start: line.start, end: line.end }}
            progress={(time - line.start) / Math.max(0.001, line.end - line.start)}
          />
        ) : (
          <span className={isActive ? "text-foreground" : undefined}>{primaryText}</span>
        )}
        {showTranslation && (
          <span className={`mt-1 block animate-in fade-in-0 duration-300 font-normal leading-snug tracking-normal transition-opacity font-sans text-[0.55em] text-muted-foreground ${isActive ? "opacity-90" : "opacity-75"}`}>
            {translation}
          </span>
        )}
      </span>
    </button>
  );
}
