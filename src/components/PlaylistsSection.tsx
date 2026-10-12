import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ListMusic, Plus } from "lucide-react";
import { toast } from "sonner";
import { createPlaylist, listPlaylists, type PlaylistSummary } from "@/api/playlists";

export function PlaylistsSection() {
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);

  useEffect(() => {
    listPlaylists().then(setPlaylists).catch(() => setPlaylists([]));
  }, []);

  const create = async () => {
    const name = window.prompt("Name your new playlist")?.trim();
    if (!name) return;
    try {
      const p = await createPlaylist(name.slice(0, 80));
      setPlaylists((s) => [...(s ?? []), p]);
    } catch {
      toast.error("Couldn't create the playlist.");
    }
  };

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold">Playlists</h2>
        <button
          type="button"
          onClick={() => void create()}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-glass hover:text-foreground"
        >
          <Plus className="size-4" /> New playlist
        </button>
      </div>
      {playlists === null ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
      ) : playlists.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No playlists yet. Use the playlist button on a song to start one.</p>
      ) : (
        <div className="-mx-1 mt-3 flex gap-3 overflow-x-auto px-1 pb-2">
          {playlists.map((p) => (
            <Link
              key={p.id}
              to="/playlists/$playlistId"
              params={{ playlistId: p.id }}
              className="flex w-40 shrink-0 flex-col gap-3 rounded-2xl border border-glass-border bg-glass p-4 transition-colors hover:bg-primary/10"
            >
              <ListMusic className="size-5 text-primary" />
              <span>
                <span className="block truncate font-medium">{p.name}</span>
                <span className="text-xs text-muted-foreground">
                  {p.songCount} {p.songCount === 1 ? "song" : "songs"}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
