import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { previewLyrics } from "@/lib/preview-lyrics";

/** Short animated sample showing how lyrics are emphasized in the landing preview. */
export function LyricsPreview() {
  const [index, setIndex] = useState(1);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % previewLyrics.lines.length), 2600);
    return () => clearInterval(id);
  }, []);

  return (
    <div aria-hidden className="select-none space-y-5 overflow-hidden py-2 sm:space-y-6">
      {previewLyrics.lines.map((line, i) => (
        <p
          key={line.id}
          className={cn(
            "font-display leading-tight transition-all duration-700",
            i === index
              ? "max-w-[360px] scale-[1.02] text-2xl text-foreground sm:text-4xl"
              : "text-xl text-foreground/25 sm:text-3xl",
          )}
          style={{ transformOrigin: "left center" }}
        >
          {line.text}
        </p>
      ))}
    </div>
  );
}
