import { useRef, useState } from "react";
import { ArrowRight, FileAudio, Loader2, UploadCloud, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatFileSize, isAcceptedAudioFile } from "@/api/songs";

interface UploadBoxProps {
  onSubmit: (file: File) => void;
  isUploading?: boolean;
  progress?: number;
  /** Compact variant for the landing hero. */
  compact?: boolean;
}

export function UploadBox({ onSubmit, isUploading = false, progress = 0, compact = false }: UploadBoxProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isOver, setIsOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = (candidate: File | undefined | null) => {
    if (!candidate) return;
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
        className={cn(
          "glass-panel group relative flex flex-col items-center justify-center rounded-3xl text-center transition-all duration-300",
          compact ? "px-6 py-10" : "px-6 py-16 sm:py-24",
          !file && "cursor-pointer hover:border-primary/50",
          isOver && "border-primary/70 bg-primary/10 scale-[1.01]",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mp3,.mp4,.wav,.m4a,audio/*,video/mp4"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />

        {!file ? (
          <>
            <span className="relative mb-5 inline-flex size-16 items-center justify-center rounded-full bg-primary/15 text-primary">
              <span className="absolute inset-0 rounded-full bg-primary/25 animate-pulse-ring" />
              <UploadCloud className="size-7" />
            </span>
            <p className={cn("font-display font-semibold", compact ? "text-lg" : "text-2xl")}>
              Drop your track here
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              or click to browse your files
            </p>
            <p className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground/70">
              MP3 • MP4 • WAV • M4A
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                inputRef.current?.click();
              }}
              className="mt-6 rounded-full border border-glass-border px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-glass"
            >
              Browse files
            </button>
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

            <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-foreground/15">
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
                  Continue <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}
