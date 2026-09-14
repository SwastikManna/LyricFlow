import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { previewLyrics } from "@/lib/mock-transcription";

/** Decorative, self-driving lyric preview for the landing hero. */
export function LyricsPreview() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % previewLyrics.lines.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="fade-mask-y select-none space-y-2 overflow-hidden py-2">
      {previewLyrics.lines.map((line, i) => (
        <p
          key={line.id}
          className={cn(
            "font-display text-lg leading-snug transition-all duration-700 sm:text-xl",
            i === index
              ? "scale-[1.02] font-semibold text-primary opacity-100"
              : "font-medium text-foreground opacity-25",
          )}
          style={{ transformOrigin: "left center" }}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}
