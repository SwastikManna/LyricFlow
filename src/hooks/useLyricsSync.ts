import { useEffect, useRef, useState } from "react";
import type { SyncedLyrics } from "@/types/lyrics";

function findLineIndex(lines: SyncedLyrics["lines"], time: number) {
  // Lines are ordered, so a simple scan from the last known position is cheap.
  for (let i = lines.length - 1; i >= 0; i--) {
    if (time >= lines[i].start) return time <= lines[i].end + 0.75 ? i : i;
  }
  return -1;
}

interface Options {
  lyrics: SyncedLyrics | null | undefined;
  subscribeTime: (listener: (time: number) => void) => () => void;
}

/**
 * Tracks the active lyric line from the audio clock.
 * State only updates when the ACTIVE LINE CHANGES; word-level progress is
 * published through a ref-based subscription so only the active line re-renders.
 */
export function useLyricsSync({ lyrics, subscribeTime }: Options) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const activeIndexRef = useRef(-1);

  useEffect(() => {
    if (!lyrics) return;
    activeIndexRef.current = -1;
    setActiveIndex(-1);

    return subscribeTime((time) => {
      const next = findLineIndex(lyrics.lines, time);
      if (next !== activeIndexRef.current) {
        activeIndexRef.current = next;
        setActiveIndex(next);
      }
    });
  }, [lyrics, subscribeTime]);

  return { activeIndex, activeLine: activeIndex >= 0 ? lyrics?.lines[activeIndex] : undefined };
}
