import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AudioLines, Play, Trash2, Plus, Grid3X3 } from "lucide-react";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { deleteSong, listSongs } from "@/api/songs";
import { formatTime } from "@/hooks/useAudioPlayer";
import type { LibrarySong } from "@/lib/songs.functions";

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your library — LyricFlow" },
      { name: "description", content: "Every song you've uploaded to LyricFlow, ready to play with live synchronized lyrics." },
      { property: "og:title", content: "Your library — LyricFlow" },
      { property: "og:description", content: "Your saved songs with live, word-by-word lyrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LibraryPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-muted-foreground">{error.message}</div>
  ),
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

  useEffect(() => {
    listSongs().then(setSongs).catch(() => setError("We couldn't load your library. Try again in a moment."));
  }, []);

  const remove = async (id: string) => {
    if (!window.confirm("Delete this song and its lyrics?")) return;
    setSongs((prev) => prev?.filter((s) => s.id !== id) ?? null);
    await deleteSong(id).catch(() => {});
  };

  const open = (song: LibrarySong) =>
    song.processingStatus === "READY"
      ? navigate({ to: "/player/$songId", params: { songId: song.id } })
      : navigate({ to: "/processing/$songId", params: { songId: song.id } });

  return (
    <main className="bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 sm:px-8">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight">
          <AudioLines className="size-5 text-primary" />
          LyricFlow
        </Link>
        <Link
          to="/upload"
          className="inline-flex items-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow"
        >
          <Plus className="size-4" /> Upload
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl px-5 pb-24 pt-6 sm:px-8">
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Your library</h1>
        <p className="mt-2 text-muted-foreground">Songs saved in this browser.</p>

        {error && <p className="mt-10 text-muted-foreground">{error}</p>}
        {!songs && !error && <p className="mt-10 text-muted-foreground">Loading…</p>}

        {songs && songs.length === 0 && (
          <div className="mt-16 flex flex-col items-center text-center">
            <p className="font-display text-xl">No songs yet</p>
            <p className="mt-2 max-w-sm text-muted-foreground">Upload a track and it will appear here with its lyrics.</p>
            <Link to="/upload" className="mt-6 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow">
              Upload a song
            </Link>
          </div>
        )}

        {songs && songs.length > 0 && (
          <ul className="mt-10 divide-y divide-glass-border/60">
            {songs.map((song) => (
              <li key={song.id} className="group flex items-center gap-4 py-4">
                <button
                  type="button"
                  onClick={() => open(song)}
                  className="flex min-w-0 flex-1 items-center gap-4 text-left"
                  aria-label={`Play ${song.title}`}
                >
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl">
                    <AlbumArtwork title={song.title} className="rounded-xl border-0 shadow-none [&_svg]:size-6" />
                    <span className="absolute inset-0 flex items-center justify-center bg-background/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Play className="size-5 fill-foreground" />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-lg font-medium">{song.title}</p>
                    <p className="truncate text-sm text-muted-foreground">
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
                    className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
                    aria-label={`Open beat grid and edit lyrics for ${song.title}`}
                    title={song.bpm ? `Beat grid · ${song.bpm} BPM` : "Open beat grid"}
                  >
                    <Grid3X3 className="size-4" />
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => remove(song.id)}
                  className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
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
