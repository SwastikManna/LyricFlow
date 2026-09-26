import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { getSongWithLyrics } from "@/api/songs";
import type { Song } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";

export const Route = createFileRoute("/player/$songId")({
  head: () => ({
    meta: [
      { title: "Live lyrics player — LyricFlow" },
      {
        name: "description",
        content:
          "Play your song with large, word-by-word synchronized lyrics that scroll in time with the music.",
      },
      { property: "og:title", content: "Live lyrics player — LyricFlow" },
      {
        property: "og:description",
        content: "Word-by-word synchronized lyrics that follow your song in real time.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlayerPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Song not found.</div>,
});

function PlayerPage() {
  const { songId } = Route.useParams();
  const [song, setSong] = useState<Song | null>(null);
  const [lyrics, setLyrics] = useState<SyncedLyrics | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "unavailable">("loading");

  useEffect(() => {
    let cancelled = false;
    getSongWithLyrics(songId)
      .then((found) => {
        if (cancelled) return;
        if (!found) return setState("unavailable");
        setSong(found.song);
        setLyrics(found.lyrics?.synchronizedLyrics ?? null);
        setState("ready");
      })
      .catch(() => !cancelled && setState("unavailable"));
    return () => {
      cancelled = true;
    };
  }, [songId]);

  if (state === "loading") {
    return (
      <main className="bg-stage flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading track…
      </main>
    );
  }

  if (state === "unavailable" || !song) {
    return (
      <main className="bg-stage flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-semibold">We couldn't find this track</h1>
        <p className="max-w-sm text-muted-foreground">
          It may have been deleted, or it was uploaded from another browser.
        </p>
        <div className="mt-2 flex gap-3">
          <Link to="/library" className="rounded-full border border-glass-border px-6 py-3 font-medium hover:bg-glass">
            Your library
          </Link>
          <Link to="/upload" className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow">
            Upload a song
          </Link>
        </div>
      </main>
    );
  }

  return <AudioPlayer song={song} lyrics={lyrics} />;
}
