import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, AudioLines, Disc3 } from "lucide-react";
import { listRecentSongs } from "@/api/songs";
import { formatTime } from "@/hooks/useAudioPlayer";
import type { LibrarySong } from "@/lib/songs.functions";
import { LatestSongMiniPlayer } from "@/components/LatestSongMiniPlayer";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LyricFlow — Karaoke-style synced lyrics for any song" },
      {
        name: "description",
        content:
          "Upload a song and get karaoke-style lyrics that highlight word by word as it plays. Switch between the original script, Latin-letter pronunciation, and optional translations.",
      },
      { property: "og:title", content: "LyricFlow — Karaoke-style synced lyrics for any song" },
      { property: "og:url", content: "https://lyricflow-swastik.lovable.app/" },
      { property: "og:type", content: "website" },
      {
        property: "og:description",
        content:
          "Turn any song into a karaoke experience: AI-transcribed lyrics, word-by-word highlighting, romanization, and translation.",
      },
      { property: "og:image", content: "https://lyricflow-swastik.lovable.app/og-image.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "LyricFlow — Karaoke-style synced lyrics for any song" },
      {
        name: "twitter:description",
        content: "Turn any song into a karaoke experience with word-by-word synced lyrics, romanization, and translation.",
      },
      { name: "twitter:image", content: "https://lyricflow-swastik.lovable.app/og-image.jpg" },
    ],
    links: [{ rel: "canonical", href: "https://lyricflow-swastik.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "LyricFlow",
          url: "https://lyricflow-swastik.lovable.app/",
          description: "Follow song lyrics in the original script or as phonetic romanization, with optional translation and playback timing.",
          applicationCategory: "MultimediaApplication",
          operatingSystem: "All",
          browserRequirements: "Requires a modern web browser with JavaScript enabled.",
          featureList: [
            "AI-generated song transcription",
            "Romanized lyrics in Latin letters",
            "Optional lyric translation",
            "Lyrics timed to audio playback",
            "Editable lyric text and timing",
          ],
          publisher: { "@type": "Organization", name: "LyricFlow" },
        }),
      },
    ],
  }),
  component: Home,
  errorComponent: RouteError,
});

function Home() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<LibrarySong[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  const loadSongs = useCallback(() => {
    setSongs(null);
    setLoadError(false);
    listRecentSongs()
      .then(setSongs)
      .catch(() => {
        setSongs([]);
        setLoadError(true);
      });
  }, []);

  useEffect(() => loadSongs(), [loadSongs]);

  return (
    <main className="grain bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-2 px-4 py-4 sm:px-8 sm:py-5">
        <Link to="/" className="inline-flex shrink-0 items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-primary/40 text-primary">
            <AudioLines className="size-3.5" />
          </span>
          Lyric<span className="text-primary">Flow</span>
        </Link>
        <nav className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link to="/library" className="rounded-full px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground sm:px-4 sm:tracking-[0.14em]">
            Library
          </Link>
          <Link to="/upload" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 text-xs font-bold uppercase tracking-[0.08em] text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5 sm:gap-2 sm:px-4 sm:tracking-[0.12em]">
            Upload <ArrowRight className="size-3" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[540px] w-full max-w-6xl items-center gap-9 px-4 pb-14 pt-10 sm:min-h-[580px] sm:gap-12 sm:px-8 sm:pb-16 sm:pt-14 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:pt-20">
        <div className="animate-rise-in">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            <span className="h-px w-5 bg-primary" /> Lyrics that follow your song
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-[3rem] leading-[0.94] tracking-[-0.06em] min-[380px]:text-[3.35rem] sm:mt-5 sm:text-[6.3rem] lg:text-[7.4rem]">
            Follow every lyric.
            <br />
            <span className="font-display italic tracking-[-0.06em] text-primary">In any script.</span>
          </h1>
          <p className="mt-5 max-w-sm text-xs leading-5 text-muted-foreground sm:mt-6 sm:text-sm sm:leading-6">
            Upload a song and follow its lyrics as it plays. Switch between the original script and a Latin-letter pronunciation, or request a translation when you need one.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-7 sm:gap-4">
            <Link to="/upload" className="inline-flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.1em] text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
              Upload a song <ArrowRight className="size-3.5" />
            </Link>
            <a href="#lyric-preview" className="rounded-full px-3 py-3 text-xs font-medium text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline">
              See a lyric preview
            </a>
            <span className="text-xs text-muted-foreground">MP3 · MP4 · WAV · M4A · up to 20 MB</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[450px] lg:justify-self-end">
          <div className="pointer-events-none absolute -inset-3 rounded-[42%] border border-primary/[0.08]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 sm:size-[420px]" />
          <div className="animate-orbit pointer-events-none absolute left-1/2 top-1/2 hidden size-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/[0.06] sm:block sm:size-[520px]" />
          <div id="lyric-preview" className="scroll-mt-6">
            <LatestSongMiniPlayer song={songs?.[0] ?? null} loading={songs === null} unavailable={loadError} />
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl border-t border-glass-border/60 px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Your archive</p>
            <h2 className="mt-2 font-display text-xl tracking-[-0.04em] sm:text-3xl">Your songs</h2>
          </div>
          <Link to="/library" className="pb-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary">{songs?.length ? `${songs.length} songs` : "Open library"}</Link>
        </div>

        {songs === null ? (
          <p className="mt-5 text-sm text-muted-foreground" role="status">Loading your archive…</p>
        ) : loadError ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-glass-border px-4 py-4">
            <p className="text-xs text-muted-foreground">Your archive couldn’t load. Check your connection and try again.</p>
            <button type="button" onClick={loadSongs} className="ml-auto text-xs font-semibold text-primary">Try again</button>
          </div>
        ) : songs.length > 0 ? (
          <ul className="mt-5 divide-y divide-glass-border/50">
            {songs.slice(0, 3).map((song) => (
              <li key={song.id} className="flex items-center gap-3 py-3">
                <button type="button" onClick={() => navigate({ to: song.processingStatus === "READY" ? "/player/$songId" : "/processing/$songId", params: { songId: song.id } })} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-gradient-to-br from-primary/20 to-accent/10 text-primary"><Disc3 className="size-5 transition-transform group-hover:rotate-12" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-semibold">{song.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">{song.artist} <span className="mx-1 text-primary/60">·</span> {song.lineCount ? `${song.lineCount} lines` : "Preparing lyrics"}</span>
                  </span>
                  <span className="hidden text-xs tabular-nums text-muted-foreground sm:block">{song.duration ? formatTime(song.duration) : "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-glass-border px-4 py-4">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Disc3 className="size-4" /></span>
            <p className="text-sm text-muted-foreground">No songs uploaded yet.</p>
            <Link to="/upload" className="ml-auto text-xs font-semibold text-primary">Upload a song <ArrowRight className="ml-1 inline size-3" /></Link>
          </div>
        )}
      </section>

      <section aria-labelledby="how-it-works-title" className="mx-auto w-full max-w-6xl border-t border-glass-border/60 px-4 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">How it works</p>
        <h2 id="how-it-works-title" className="mt-2 max-w-2xl font-display text-2xl tracking-[-0.04em] sm:text-4xl">
          Your song, with lyrics you can follow.
        </h2>
        <div className="mt-6 grid gap-3 sm:mt-8 sm:grid-cols-3 sm:gap-4">
          {[
            { number: "01", title: "Upload a track", copy: "Choose an MP3, MP4, WAV or M4A file up to 20 MB." },
            { number: "02", title: "Review the lyrics", copy: "LyricFlow transcribes the vocals. Correct words or timing in the editor if needed." },
            { number: "03", title: "Choose how to read", copy: "Follow the original script, Latin-letter pronunciation, or request a translation." },
          ].map((step) => (
            <article key={step.number} className="rounded-2xl border border-glass-border bg-glass/45 p-4 sm:p-5">
              <p className="font-mono-ui text-xs text-primary">{step.number}</p>
              <h3 className="mt-3 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.copy}</p>
            </article>
          ))}
        </div>
        <Link to="/romanized-lyrics" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          How romanized lyrics work <ArrowRight className="size-4" aria-hidden />
        </Link>
      </section>
    </main>
  );
}
