import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Pencil, Play, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { deletePlaylist, getPlaylist, renamePlaylist, setPlaylistSong, type PlaylistDetail } from "@/api/playlists";
import { requestAutoplay, setQueue } from "@/lib/play-queue";
import { formatTime } from "@/hooks/useAudioPlayer";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/playlists/$playlistId")({
  head: () => ({
    meta: [
      { title: "Playlist — LyricFlow" },
      { name: "description", content: "Play your LyricFlow playlist in order with lyrics timed to every song." },
      { property: "og:title", content: "Playlist — LyricFlow" },
      { property: "og:description", content: "A LyricFlow playlist with synced lyrics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PlaylistPage,
  errorComponent: RouteError,
});

function PlaylistPage() {
  const { playlistId } = Route.useParams();
  const navigate = useNavigate();
  const [playlist, setPlaylist] = useState<PlaylistDetail | null | undefined>(undefined);

  useEffect(() => {
    getPlaylist(playlistId).then(setPlaylist).catch(() => setPlaylist(null));
  }, [playlistId]);

  if (playlist === undefined)
    return <main className="bg-stage flex min-h-screen items-center justify-center text-muted-foreground">Loading playlist…</main>;
  if (playlist === null)
    return (
      <main className="bg-stage flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <h1 className="font-display text-2xl font-semibold">We couldn't find this playlist</h1>
        <Link to="/library" className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">Your library</Link>
      </main>
    );

  const ready = playlist.songs.filter((s) => s.processingStatus === "READY");
  const play = (id: string, autoplay: boolean) => {
    setQueue(playlist.songs);
    if (autoplay) requestAutoplay();
    void navigate({ to: "/player/$songId", params: { songId: id } });
  };
  const rename = async () => {
    const name = window.prompt("Rename playlist", playlist.name)?.trim();
    if (!name) return;
    try {
      await renamePlaylist(playlist.id, name.slice(0, 80));
      setPlaylist({ ...playlist, name: name.slice(0, 80) });
    } catch {
      toast.error("Couldn't rename the playlist.");
    }
  };
  const remove = async () => {
    if (!window.confirm(`Delete "${playlist.name}"? Your songs stay in your library.`)) return;
    try {
      await deletePlaylist(playlist.id);
      void navigate({ to: "/library" });
    } catch {
      toast.error("Couldn't delete the playlist.");
    }
  };
  const removeSong = async (songId: string) => {
    try {
      await setPlaylistSong(playlist.id, songId, false);
      setPlaylist({ ...playlist, songs: playlist.songs.filter((s) => s.id !== songId) });
    } catch {
      toast.error("Couldn't remove the song.");
    }
  };
  const total = playlist.songs.reduce((t, s) => t + s.duration, 0);

  return (
    <main className="bg-stage min-h-screen">
      <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8">
        <Link to="/library" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Library
        </Link>
        <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{playlist.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {playlist.songs.length} {playlist.songs.length === 1 ? "song" : "songs"} · {formatTime(total)}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!ready.length}
            onClick={() => ready[0] && play(ready[0].id, true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow disabled:opacity-50"
          >
            <Play className="size-4 fill-current" /> Play all
          </button>
          <button type="button" onClick={() => void rename()} className="inline-flex items-center gap-2 rounded-full border border-glass-border px-4 py-3 text-sm hover:bg-glass">
            <Pencil className="size-4" /> Rename
          </button>
          <button type="button" onClick={() => void remove()} className="inline-flex items-center gap-2 rounded-full border border-glass-border px-4 py-3 text-sm hover:bg-glass">
            <Trash2 className="size-4" /> Delete
          </button>
        </div>

        {playlist.songs.length === 0 ? (
          <p className="mt-10 text-muted-foreground">This playlist is empty. Add songs from your library or the player.</p>
        ) : (
          <ol className="mt-8 space-y-1">
            {playlist.songs.map((s, i) => (
              <li key={s.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-glass">
                <span className="w-6 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                <button
                  type="button"
                  disabled={s.processingStatus !== "READY"}
                  onClick={() => play(s.id, true)}
                  className="min-w-0 flex-1 text-left disabled:opacity-50"
                >
                  <span className="block truncate font-medium">{s.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.artist}</span>
                </button>
                <span className="text-xs tabular-nums text-muted-foreground">{formatTime(s.duration)}</span>
                <button
                  type="button"
                  onClick={() => void removeSong(s.id)}
                  aria-label={`Remove ${s.title} from playlist`}
                  className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-glass hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </main>
  );
}
