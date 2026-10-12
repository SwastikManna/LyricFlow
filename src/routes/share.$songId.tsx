import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AudioPlayer } from "@/components/AudioPlayer";
import { RouteError } from "@/components/RouteError";
import { getPublicSongFn } from "@/lib/share.functions";
import type { Song } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";

export const Route = createFileRoute("/share/$songId")({
  head: () => ({
    meta: [
      { title: "Listen with live lyrics — LyricFlow" },
      { name: "description", content: "A song shared with you on LyricFlow, with lyrics synced as it plays." },
      { property: "og:title", content: "Listen with live lyrics — LyricFlow" },
      { property: "og:description", content: "A song shared with you on LyricFlow, with lyrics synced as it plays." },
      { property: "og:type", content: "music.song" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharePage,
  errorComponent: RouteError,
});

function SharePage() {
  const { songId } = Route.useParams();
  const [data, setData] = useState<{ song: Song; lyrics: SyncedLyrics | null } | null | undefined>(undefined);

  useEffect(() => {
    if (!/^[0-9a-f-]{36}$/i.test(songId)) return setData(null);
    getPublicSongFn({ data: { id: songId } })
      .then((found) => setData(found ? { song: found.song, lyrics: found.lyrics?.synchronizedLyrics ?? null } : null))
      .catch(() => setData(null));
  }, [songId]);

  if (data === undefined) {
    return (
      <main className="bg-stage flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading track…
      </main>
    );
  }
  if (!data) {
    return (
      <main className="bg-stage flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-semibold">This link isn't available</h1>
        <p className="max-w-sm text-muted-foreground">The owner may have stopped sharing this song.</p>
        <Link to="/" className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow">
          Discover LyricFlow
        </Link>
      </main>
    );
  }
  return <AudioPlayer key={data.song.id} song={data.song} lyrics={data.lyrics} shared />;
}
