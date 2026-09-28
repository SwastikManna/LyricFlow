import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, AudioLines } from "lucide-react";
import { UploadBox } from "@/components/UploadBox";
import { createSong } from "@/api/songs";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a track — LyricFlow" },
      {
        name: "description",
        content:
          "Upload an MP3, MP4, WAV or M4A file and LyricFlow will transcribe and synchronize its lyrics for live playback.",
      },
      { property: "og:title", content: "Upload a track — LyricFlow" },
      {
        property: "og:description",
        content: "Upload a song and get synchronized lyrics ready for live playback.",
      },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: UploadPage,
  errorComponent: RouteError,
  notFoundComponent: () => <div className="p-10 text-center">Page not found.</div>,
});

function UploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (file: File) => {
    setIsUploading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const song = await createSong({
        file,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
      navigate({ to: "/processing/$songId", params: { songId: song.id } });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("The upload didn’t finish. Please try again.");
      }
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <main className="grain bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-8 sm:py-5">
        <Link to="/" className="inline-flex shrink-0 items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-primary/40 text-primary"><AudioLines className="size-3.5" /></span>
          Lyric<span className="text-primary">Flow</span>
        </Link>
        <Link to="/library" className="rounded-full px-2 py-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">Library</Link>
      </header>

      <section className="mx-auto grid w-full max-w-5xl items-center gap-8 px-4 pb-12 pt-6 sm:min-h-[calc(100vh-4.5rem)] sm:gap-10 sm:px-8 sm:pb-16 sm:pt-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="animate-rise-in lg:pl-8">
          <Link to="/" className="inline-flex items-center gap-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="size-3" /> Back to room</Link>
          <p className="mt-7 text-[9px] font-bold uppercase tracking-[0.24em] text-primary sm:mt-9">01 / Bring a song</p>
          <h1 className="mt-3 max-w-xs font-display text-[2.75rem] leading-[0.9] tracking-[-0.055em] sm:mt-4 sm:text-6xl">
            Start<br />with<br /><span className="font-display italic tracking-[-0.06em] text-primary">sound.</span>
          </h1>
          <p className="mt-4 max-w-xs text-xs leading-5 text-muted-foreground sm:mt-5 sm:text-sm sm:leading-6">We’ll map the feeling in your track, then give every word a moment to arrive.</p>
        </div>

        <div className="w-full max-w-xl justify-self-center">
          <UploadBox compact onSubmit={handleSubmit} isUploading={isUploading} progress={progress} />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </section>
    </main>
  );
}
