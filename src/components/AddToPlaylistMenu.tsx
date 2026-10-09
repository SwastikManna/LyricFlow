import { useState } from "react";
import { Check, ListPlus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { createPlaylist, listPlaylists, playlistsForSong, setPlaylistSong, type PlaylistSummary } from "@/api/playlists";

interface AddToPlaylistMenuProps {
  songId: string;
  className?: string | undefined;
  label?: string | undefined;
}

export function AddToPlaylistMenu({ songId, className, label }: AddToPlaylistMenuProps) {
  const [playlists, setPlaylists] = useState<PlaylistSummary[] | null>(null);
  const [included, setIncluded] = useState<Set<string>>(new Set());

  const load = async () => {
    try {
      const [all, mine] = await Promise.all([listPlaylists(), playlistsForSong(songId)]);
      setPlaylists(all);
      setIncluded(new Set(mine));
    } catch {
      toast.error("Couldn't load your playlists.");
    }
  };

  const toggle = async (playlist: PlaylistSummary) => {
    const next = !included.has(playlist.id);
    setIncluded((s) => {
      const copy = new Set(s);
      if (next) copy.add(playlist.id);
      else copy.delete(playlist.id);
      return copy;
    });
    try {
      await setPlaylistSong(playlist.id, songId, next);
      toast.success(next ? `Added to ${playlist.name}` : `Removed from ${playlist.name}`);
    } catch {
      toast.error("Couldn't update the playlist.");
      void load();
    }
  };

  const createAndAdd = async () => {
    const name = window.prompt("Name your new playlist")?.trim();
    if (!name) return;
    try {
      const playlist = await createPlaylist(name.slice(0, 80));
      await setPlaylistSong(playlist.id, songId, true);
      toast.success(`Added to ${playlist.name}`);
    } catch {
      toast.error("Couldn't create the playlist.");
    }
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && void load()}>
      <DropdownMenuTrigger asChild>
        <button type="button" className={className} aria-label="Add to playlist" onClick={(e) => e.stopPropagation()}>
          <ListPlus className="size-4" aria-hidden />
          {label && <span className="hidden sm:inline">{label}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuLabel>Add to playlist</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {playlists === null ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>
        ) : playlists.length === 0 ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">No playlists yet.</p>
        ) : (
          playlists.map((p) => (
            <DropdownMenuItem
              key={p.id}
              onSelect={(e) => {
                e.preventDefault();
                void toggle(p);
              }}
            >
              <span className="flex-1 truncate">{p.name}</span>
              {included.has(p.id) && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          ))
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void createAndAdd()}>
          <Plus className="size-4" /> New playlist
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
