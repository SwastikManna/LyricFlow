import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AudioLines, Play, Trash2, Plus, Grid3X3 } from "lucide-react";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { deleteSong, listSongs } from "@/api/songs";
import { formatTime } from "@/hooks/useAudioPlayer";
import type { LibrarySong } from "@/lib/songs.functions";
import { toast } from "sonner";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your library — LyricFlow" },
      { name: "description", content: "Every song you've uploaded to LyricFlow, ready to play with live synchronized lyrics." },
      { property: "og:title", content: "Your library — LyricFlow" },
      { property: "og:description", content: "Your saved songs with live, word-by-word lyrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { property: "og:url", content: "https://lyricflow-swastik.lovable.app/library" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://lyricflow-swastik.lovable.app/library" }],
  }),
  component: LibraryPage,
  errorComponent: RouteError,
  notFoundComponent: () => <div className="p-10 text-center">Page not found.</div>,
});

function statusLabel(song: LibrarySong) {
  if (song.processingStatus === "READY") {
    return `${song.lineCount} lyric lines${song.bpm ? ` · ${song.bpm} BPM` : ""}`;
  }
  if (song.processingStatus === "FAILED") return "Lyrics unavailable";
  return "Not analyzed yet";
}

function LibraryPage() {
  const navigate = useNavigate();
  const [songs, setSongs] = useState<LibrarySong[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadSongs = useCallback(() => {
    setSongs(null);
    setError(null);
    listSongs().then(setSongs).catch(() => setError("We couldn't load your library. Check your connection and try again."));
  }, []);

  useEffect(() => { loadSongs(); }, [loadSongs]);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this song and its lyrics?")) return;
    const removed = songs?.find((song) => song.id === id);
    setSongs((prev) => prev?.filter((s) => s.id !== id) ?? null);
    try {
      await deleteSong(id);
    } catch {
      if (removed) setSongs((prev) => [...(prev ?? []), removed].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
      toast.error("That song couldn’t be deleted. Please try again.");
    }
  };

  const open = (song: LibrarySong) =>
    song.processingStatus === "READY"
      ? navigate({ to: "/player/$songId", params: { songId: song.id } })
      : navigate({ to: "/processing/$songId", params: { songId: song.id } });

  return (
    <main className="bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
        <Link to="/" className="inline-flex shrink-0 items-center gap-2 font-display text-base font-semibold tracking-tight sm:text-lg">
          <AudioLines className="size-5 shrink-0 text-primary" />
          LyricFlow
        </Link>
        <Link
          to="/upload"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow sm:px-5 sm:text-sm"
        >
          <Plus className="size-4" /> Upload
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pb-24 sm:pt-6">
        <h1 className="font-display text-2xl font-semibold sm:text-4xl">Your library</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">Songs saved in this browser.</p>

        {error && (
          <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p>{error}</p>
            <button type="button" onClick={loadSongs} className="font-semibold text-primary hover:underline">
              Try again
            </button>
          </div>
        )}
        {!songs && !error && <p className="mt-10 text-muted-foreground">Loading…</p>}

        {songs && songs.length === 0 && (
          <div className="mt-12 flex flex-col items-center text-center sm:mt-16">
            <p className="font-display text-lg sm:text-xl">No songs yet</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground sm:text-base">Upload a track and it will appear here with its lyrics.</p>
            <Link to="/upload" className="mt-6 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow">
              Upload a song
            </Link>
          </div>
        )}

        {songs && songs.length > 0 && (
          <ul className="mt-6 divide-y divide-glass-border/60 sm:mt-10">
            {songs.map((song) => (
              <li key={song.id} className="group flex min-w-0 items-center gap-2 py-3 sm:gap-4 sm:py-4">
                <button
                  type="button"
                  onClick={() => open(song)}
                  className="flex min-w-0 flex-1 items-center gap-2.5 text-left sm:gap-4"
                  aria-label={`Play ${song.title}`}
                >
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-xl sm:size-14">
                    <AlbumArtwork title={song.title} className="rounded-xl border-0 shadow-none [&_svg]:size-6" />
                    <span className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="size-5 fill-foreground" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-base font-medium sm:text-lg">{song.title}</p>
                    <p className="truncate text-xs text-muted-foreground sm:text-sm">
                      {song.artist} · {statusLabel(song)}
                    </p>
                  </div>
                </button>
                <span className="hidden text-sm tabular-nums text-muted-foreground sm:block">
                  {song.duration ? formatTime(song.duration) : "—"}
                </span>
                <span className="hidden w-24 text-right text-sm text-muted-foreground md:block">
                  {new Date(song.createdAt).toLocaleDateString()}
                </span>
                {song.processingStatus === "READY" && (
                  <Link
                    to="/edit/$songId"
                    params={{ songId: song.id }}
                    className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-glass hover:text-foreground sm:size-10"
                    aria-label={`Open beat grid and edit lyrics for ${song.title}`}
                    title={song.bpm ? `Beat grid · ${song.bpm} BPM` : "Open beat grid"}
                  >
                    <Grid3X3 className="size-4" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => remove(song.id)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-glass hover:text-foreground sm:size-10"
                  aria-label={`Delete ${song.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
