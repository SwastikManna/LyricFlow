import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, AudioLines, Disc3, Play } from "lucide-react";
import { listSongs } from "@/api/songs";
import { formatTime } from "@/hooks/useAudioPlayer";
import type { LibrarySong } from "@/lib/songs.functions";
import { LyricsPreview } from "@/components/LyricsPreview";

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

function Home() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<LibrarySong[]>([]);

  useEffect(() => {
    listSongs().then(setSongs).catch(() => setSongs([]));
  }, []);

  return (
    <main className="grain bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-sm font-semibold tracking-tight">
          <span className="inline-flex size-7 items-center justify-center rounded-full border border-primary/40 text-primary">
            <AudioLines className="size-3.5" />
          </span>
          Lyric<span className="text-primary">Flow</span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link to="/library" className="rounded-full px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
            Library
          </Link>
          <Link to="/upload" className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
            + New song <ArrowRight className="size-3" />
          </Link>
        </nav>
      </header>

      <section className="mx-auto grid min-h-[580px] w-full max-w-6xl items-center gap-12 px-5 pb-16 pt-14 sm:px-8 lg:grid-cols-[1fr_1.05fr] lg:gap-20 lg:pt-20">
        <div className="animate-rise-in">
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">
            <span className="h-px w-5 bg-primary" /> Private listening room
          </p>
          <h1 className="mt-5 max-w-2xl font-display text-[3.5rem] leading-[0.91] tracking-[-0.06em] sm:text-[6.3rem] lg:text-[7.4rem]">
            Let the song
            <br />
            <span className="font-display italic tracking-[-0.06em] text-primary">say more.</span>
          </h1>
          <p className="mt-6 max-w-sm text-xs leading-6 text-muted-foreground sm:text-sm">
            Upload a track and watch every lyric find its place in time. A quieter way to listen, made for the songs you keep coming back to.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-4">
            <Link to="/upload" className="inline-flex items-center gap-3 rounded-full bg-primary px-5 py-3 text-[10px] font-bold uppercase tracking-[0.13em] text-primary-foreground shadow-glow transition-transform hover:-translate-y-0.5">
              Start with a song <ArrowRight className="size-3.5" />
            </Link>
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">MP3 · WAV · M4A</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[450px] lg:justify-self-end">
          <div className="pointer-events-none absolute -inset-3 rounded-[42%] border border-primary/[0.08]" />
          <div className="absolute h-[300px] w-[300px] rounded-full border border-primary/10 sm:h-[420px] sm:w-[420px]" />
          <div className="animate-orbit absolute h-[390px] w-[390px] rounded-full border border-primary/[0.06] sm:h-[520px] sm:w-[520px]" />
          <div className="animate-lyric-float relative w-full max-w-[480px]">
          <span className="absolute -right-1 -top-8 font-mono-ui text-[9px] uppercase tracking-[0.22em] text-foreground/35 sm:right-3">01 / 06</span>
          <div className="glass-panel relative overflow-hidden rounded-[2rem] p-5 shadow-lift sm:p-9">
            <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-accent/10 blur-3xl" />
            <div className="flex items-center justify-between border-b border-glass-border/80 pb-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary"><AudioLines className="size-3.5" /></span>
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-primary">Live lyrics</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Finding the shape of sound</p>
                </div>
              </div>
              <span className="flex items-center gap-2 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-foreground/40"><span className="animate-signal-pulse size-1.5 rounded-full bg-primary" /> Sync</span>
            </div>
            <div className="relative mt-6">
              <LyricsPreview />
            </div>
            <div className="relative mt-8 flex items-center gap-4 font-mono-ui text-[9px] text-foreground/45"><span>00:06</span><div className="h-px flex-1 bg-foreground/15"><div className="h-px w-[22%] bg-primary" /></div><span>00:28</span></div>
          </div>
          <Link to="/library" className="absolute -bottom-5 -left-3 inline-flex items-center gap-3 rounded-full border border-glass-border bg-card/80 px-4 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.17em] text-foreground/55 shadow-lg backdrop-blur-xl transition-colors hover:text-foreground sm:-left-5">
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Play className="ml-0.5 size-2.5 fill-current" /></span>
            Press play / feel time
          </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl border-t border-glass-border/60 px-5 pb-16 pt-9 sm:px-8 sm:pt-12">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-primary">Your archive</p>
            <h2 className="mt-2 font-display text-2xl tracking-[-0.04em] sm:text-3xl">The room remembers.</h2>
          </div>
          <Link to="/library" className="pb-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-primary">{songs.length ? `${songs.length} songs` : "See all"}</Link>
        </div>

        {songs.length > 0 ? (
          <ul className="mt-5 divide-y divide-glass-border/50">
            {songs.slice(0, 3).map((song) => (
              <li key={song.id} className="flex items-center gap-3 py-3">
                <button type="button" onClick={() => navigate({ to: song.processingStatus === "READY" ? "/player/$songId" : "/processing/$songId", params: { songId: song.id } })} className="group flex min-w-0 flex-1 items-center gap-3 text-left">
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-glass-border bg-gradient-to-br from-primary/20 to-accent/10 text-primary"><Disc3 className="size-5 transition-transform group-hover:rotate-12" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-display text-sm font-semibold">{song.title}</span>
                    <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{song.artist} <span className="mx-1 text-primary/60">·</span> {song.lineCount ? `${song.lineCount} lines` : "Finding its shape"}</span>
                  </span>
                  <span className="hidden text-[10px] tabular-nums text-muted-foreground sm:block">{song.duration ? formatTime(song.duration) : "—"}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-5 flex items-center gap-3 rounded-xl border border-dashed border-glass-border px-4 py-4">
            <span className="inline-flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary"><Disc3 className="size-4" /></span>
            <p className="text-xs text-muted-foreground">Your songs will find a home here.</p>
            <Link to="/upload" className="ml-auto text-[9px] font-semibold uppercase tracking-widest text-primary">Add one <ArrowRight className="ml-1 inline size-3" /></Link>
          </div>
        )}
      </section>
    </main>
  );
}
