import { FileDown } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { downloadLyrics, type ExportVariant } from "@/lib/lyric-exporter";
import { languageName } from "@/lib/languages";
import type { SyncedLyrics } from "@/types/lyrics";

interface Props {
  meta: { title: string; artist: string; duration?: number | undefined };
  /** Lyrics already loaded, or a loader to fetch them on demand. */
  lyrics?: SyncedLyrics | null | undefined;
  loadLyrics?: (() => Promise<SyncedLyrics | null>) | undefined;
  translationLanguage?: string | undefined;
  className?: string | undefined;
  label?: string | undefined;
}

export function LyricExportMenu({ meta, lyrics, loadLyrics, translationLanguage, className, label }: Props) {
  const hasRoman = Boolean(lyrics?.lines.some((l) => l.romanization?.trim()));
  const hasTrans = Boolean(translationLanguage && lyrics?.lines.some((l) => l.translations?.[translationLanguage]?.trim()));

  const run = async (format: "lrc" | "srt", variant: ExportVariant = "original") => {
    try {
      const data = lyrics ?? (loadLyrics ? await loadLyrics() : null);
      if (!data?.lines.length) {
        toast.error("This song has no lyrics to export yet.");
        return;
      }
      downloadLyrics(format, data, meta, variant);
    } catch {
      toast.error("Couldn't export the lyrics. Please try again.");
    }
  };

  const items = (format: "lrc" | "srt") => (
    <>
      <DropdownMenuItem onSelect={() => void run(format)}>Original</DropdownMenuItem>
      {hasRoman && <DropdownMenuItem onSelect={() => void run(format, "romanized")}>Romanized</DropdownMenuItem>}
      {hasTrans && translationLanguage && (
        <DropdownMenuItem onSelect={() => void run(format, { translation: translationLanguage })}>
          {languageName(translationLanguage)} translation
        </DropdownMenuItem>
      )}
    </>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Export lyrics for ${meta.title}`}
        title="Export lyrics"
        className={className ?? "inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-glass hover:text-foreground sm:size-10"}
      >
        <FileDown className="size-4" aria-hidden />
        {label && <span>{label}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>.LRC — music players</DropdownMenuLabel>
        {items("lrc")}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>.SRT — video subtitles</DropdownMenuLabel>
        {items("srt")}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
