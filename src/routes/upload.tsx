import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft, AudioLines, ShieldCheck } from "lucide-react";
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
          "Upload an MP3, MP4, WAV or M4A file up to 20 MB and follow its lyrics in the player.",
      },
      { property: "og:title", content: "Upload a track — LyricFlow" },
      {
        property: "og:description",
        content: "Upload a song to generate lyrics timed to playback, with phonetic writing and optional translation.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://lyricflow-swastik.lovable.app/upload" },
      { name: "robots", content: "noindex,follow" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Upload a track — LyricFlow" },
      { name: "twitter:description", content: "Upload a song to generate lyrics timed to playback, with phonetic writing and optional translation." },
    ],
    links: [{ rel: "canonical", href: "https://lyricflow-swastik.lovable.app/upload" }],
  }),
  component: UploadPage,
  errorComponent: RouteError,
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
        <Link to="/library" className="rounded-full px-2 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:px-3">Library</Link>
      </header>

      <section className="mx-auto grid w-full max-w-5xl items-center gap-8 px-4 pb-12 pt-6 sm:min-h-[calc(100vh-4.5rem)] sm:gap-10 sm:px-8 sm:pb-16 sm:pt-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <div className="animate-rise-in lg:pl-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-primary"><ArrowLeft className="size-3" /> Back to LyricFlow</Link>
          <p className="mt-7 text-xs font-bold uppercase tracking-[0.18em] text-primary sm:mt-9">Upload a song</p>
          <h1 className="mt-3 max-w-xs font-display text-[2.75rem] leading-[0.9] tracking-[-0.055em] sm:mt-4 sm:text-6xl">
            Upload<br />your<br /><span className="font-display italic tracking-[-0.06em] text-primary">song.</span>
          </h1>
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground sm:mt-5">Choose an audio file. LyricFlow transcribes the vocals and creates lyrics timed to playback. You can edit the words and timing later.</p>
        </div>

        <div className="w-full max-w-xl justify-self-center">
          <UploadBox compact onSubmit={handleSubmit} isUploading={isUploading} progress={progress} />
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
          <aside className="mt-5 rounded-2xl border border-glass-border bg-background/45 p-4 sm:mt-6" aria-labelledby="upload-details-title">
            <h2 id="upload-details-title" className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="size-4 text-primary" aria-hidden /> Before you upload
            </h2>
            <ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground sm:text-sm">
              <li>Your audio and generated lyrics are stored with your LyricFlow library until you delete the song.</li>
              <li>Your library is linked to this browser. Clearing its site data or switching browsers may remove access; download an access backup from your Library to reconnect.</li>
              <li>LyricFlow sends your audio to Lovable AI for transcription and lyric text for phonetic writing or translation. When enabled, audio and its transcript are also sent to ElevenLabs for word-level timing; otherwise timing follows whole lines.</li>
            </ul>
          </aside>
        </div>
      </section>
    </main>
  );
}
