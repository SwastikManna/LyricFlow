import { cn } from "@/lib/utils";
import { Disc3 } from "lucide-react";

interface AlbumArtworkProps {
  title: string;
  coverImageUrl?: string | null;
  isPlaying?: boolean;
  className?: string;
}

/** Cover art, or a generated gradient placeholder derived from the title. */
export function AlbumArtwork({ title, coverImageUrl, isPlaying, className }: AlbumArtworkProps) {
  const seed = [...title].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const hueA = seed % 360;
  const hueB = (hueA + 48) % 360;

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-3xl border border-glass-border shadow-lift",
        className,
      )}
    >
      {coverImageUrl ? (
        <img src={coverImageUrl} alt={`${title} cover art`} className="size-full object-cover" />
      ) : (
        <div
          className="flex size-full items-center justify-center"
          style={{
            backgroundImage: `radial-gradient(120% 120% at 20% 10%, oklch(0.6 0.16 ${hueA}) 0%, oklch(0.34 0.11 ${hueB}) 45%, oklch(0.18 0.03 268) 100%)`,
          }}
        >
          <Disc3
            className={cn(
              "size-16 text-foreground/70 sm:size-20",
              isPlaying && "animate-spin [animation-duration:6s]",
            )}
            strokeWidth={1}
          />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/50 to-transparent" />
    </div>
  );
}
