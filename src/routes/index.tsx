import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { AudioLines } from "lucide-react";
import { UploadBox } from "@/components/UploadBox";
import { LyricsPreview } from "@/components/LyricsPreview";
import { createSong } from "@/api/songs";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LyricFlow — Turn your music into a living lyric experience" },
      {
        name: "description",
        content:
          "Upload a song and LyricFlow transcribes and synchronizes its lyrics, then plays them word by word in a cinematic live-lyrics player.",
      },
      { property: "og:title", content: "LyricFlow — Living lyrics for your music" },
      {
        property: "og:description",
        content:
          "Upload MP3, MP4, WAV or M4A and watch your lyrics scroll in perfect time with the music.",
      },
    ],
  }),
  component: Home,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Page not found.</div>,
});

const STEPS = [
  { title: "Upload", body: "Drop in an MP3, MP4, WAV or M4A file." },
  { title: "Analyze", body: "The audio is extracted and the vocals isolated." },
  { title: "Synchronize", body: "Lyrics are transcribed and timestamped." },
  { title: "Listen", body: "Every line lights up in time with the song." },
];

function Home() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (file: File) => {
    setIsUploading(true);
    abortRef.current = new AbortController();
    try {
      const song = await createSong({
        file,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
      navigate({ to: "/processing/$songId", params: { songId: song.id } });
    } catch {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <main className="bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <span className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <AudioLines className="size-5 text-primary" />
          LyricFlow
        </span>
        <Link
          to="/upload"
          className="rounded-full border border-glass-border px-5 py-2 text-sm font-medium transition-colors hover:bg-glass"
        >
          Upload
        </Link>
      </header>

      <section className="mx-auto grid w-full max-w-6xl gap-12 px-5 pb-24 pt-10 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pt-16">
        <div className="animate-rise-in">
          <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
            Live lyrics, automatically
          </p>
          <h1 className="mt-5 text-balance font-display text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl">
            <span className="text-gradient">Turn your music into a living lyric experience.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-muted-foreground">
            Upload a track. LyricFlow listens, writes down every word, and plays it back with lyrics
            that move in time with the music.
          </p>

          <div className="mt-10">
            <UploadBox
              compact
              onSubmit={handleSubmit}
              isUploading={isUploading}
              progress={progress}
            />
          </div>
        </div>

        <div className="glass-panel animate-float-slow rounded-3xl p-7 shadow-lift sm:p-9">
          <p className="mb-5 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Now playing
          </p>
          <LyricsPreview />
          <div className="mt-7 h-1 w-full overflow-hidden rounded-full bg-foreground/15">
            <div className="h-full w-2/5 rounded-full bg-primary" />
          </div>
        </div>
      </section>

      <section className="border-t border-glass-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">How it works</h2>
          <ol className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="font-display text-sm text-primary">0{i + 1}</span>
                <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <footer className="border-t border-glass-border/60">
        <div className="mx-auto w-full max-w-6xl px-5 py-8 text-sm text-muted-foreground sm:px-8">
          LyricFlow — your audio stays in your browser.
        </div>
      </footer>
    </main>
  );
}
