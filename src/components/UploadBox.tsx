import { useRef, useState } from "react";
import { ArrowRight, FileAudio, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, isAcceptedAudioFile } from "@/api/songs";
import { MAX_SONG_FILE_BYTES, MAX_SONG_FILE_LABEL } from "@/lib/song-constraints";

interface UploadBoxProps {
  onSubmit: (file: File) => void;
  isUploading?: boolean | undefined;
  progress?: number | undefined;
  /** Compact variant for the landing hero. */
  compact?: boolean | undefined;
}

export function UploadBox({ onSubmit, isUploading = false, progress = 0, compact = false }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (candidate: File | undefined | null) => {
    if (!candidate) return;
    if (candidate.size > MAX_SONG_FILE_BYTES) {
      setError(`That file is too large. Choose a track under ${MAX_SONG_FILE_LABEL}.`);
      setFile(null);
      return;
    }
    if (!isAcceptedAudioFile(candidate)) {
      setError("That format isn't supported. Use MP3, MP4, WAV or M4A.");
      setFile(null);
      return;
    }
    setError(null);
    setFile(candidate);
  };

  return (
    <div className="w-full">
      <div
        role={file ? undefined : "button"}
        tabIndex={file ? undefined : 0}
        aria-label={file ? undefined : "Choose an audio track to upload"}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !file && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (file || (event.key !== "Enter" && event.key !== " ")) return;
          event.preventDefault();
          inputRef.current?.click();
        }}
        className={cn(
          "glass-panel group relative flex flex-col items-center justify-center text-center transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          compact
            ? "rounded-xl border-dashed border-primary/40 bg-card/40"
            : "rounded-3xl",
          compact ? "px-4 py-8 sm:px-6 sm:py-10" : "px-5 py-12 sm:px-6 sm:py-24",
          !file && "cursor-pointer hover:border-primary/50",
          isOver && "border-primary/70 bg-primary/10 scale-[1.01]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.mp4,.wav,.m4a,audio/*,video/mp4"
          className="hidden"
          onChange={(e) => {
            accept(e.target.files?.[0]);
            e.currentTarget.value = "";
          }}
        />

        {!file ? (
          <>
            <span className={cn("relative inline-flex items-center justify-center rounded-full bg-primary/15 text-primary", compact ? "mb-3 size-11" : "mb-5 size-16")}>
              <span className="absolute inset-0 rounded-full bg-primary/25 animate-pulse-ring" />
              <UploadCloud className={compact ? "size-5" : "size-7"} />
            </span>
            <p className={cn("font-display font-semibold", compact ? "text-base sm:text-lg" : "text-xl sm:text-2xl")}>
              Drop your track here
            </p>
            <p className={cn("text-muted-foreground", compact ? "mt-1 text-xs" : "mt-2 text-sm")}>
              or click to browse your files
            </p>
            <p className={cn("mt-4 text-xs text-muted-foreground", compact ? "" : "sm:mt-6")}>
              MP3, MP4, WAV or M4A · up to {MAX_SONG_FILE_LABEL}
            </p>
            <span className={cn("rounded-full border border-glass-border px-6 text-sm font-medium text-foreground transition-colors group-hover:bg-glass", compact ? "mt-4 py-2" : "mt-6 py-2.5")}>
              Browse files
            </span>
          </>
        ) : (
          <div className="w-full max-w-lg text-left">
            <div className="flex items-center gap-4">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                <FileAudio className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  aria-label="Remove file"
                  className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            <div
              role={isUploading ? "progressbar" : undefined}
              aria-label={isUploading ? "Upload progress" : undefined}
              aria-valuemin={isUploading ? 0 : undefined}
              aria-valuemax={isUploading ? 100 : undefined}
              aria-valuenow={isUploading ? progress : undefined}
              className="mt-6 h-1 w-full overflow-hidden rounded-full bg-foreground/15"
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-200"
                style={{ width: `${isUploading ? progress : 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {isUploading ? `Uploading… ${progress}%` : "Ready to analyze"}
            </p>

            <button
              type="button"
              disabled={isUploading}
              onClick={() => onSubmit(file)}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow transition-transform hover:scale-[1.01] disabled:opacity-70"
            >
              {isUploading ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Uploading
                </>
              ) : (
                <>
                  Upload and prepare lyrics <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
