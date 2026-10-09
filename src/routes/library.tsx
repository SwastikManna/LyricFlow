import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Download, Play, Trash2, Plus, Grid3X3, Search, Upload } from "lucide-react";
import { AlbumArtwork } from "@/components/AlbumArtwork";
import { deleteSong, downloadLibraryAccessBackup, getSongWithLyrics, listSongsPage, readLibraryAccessBackup, restoreLibraryAccess } from "@/api/songs";
import { LyricExportMenu } from "@/components/LyricExportMenu";
import { formatTime } from "@/hooks/useAudioPlayer";
import type { LibrarySong, LibrarySort } from "@/lib/songs.functions";
import { normalizeSongSearch } from "@/lib/song-constraints";
import { toast } from "sonner";
import { RouteError } from "@/components/RouteError";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 40;

export const Route = createFileRoute("/library")({
  head: () => ({
    meta: [
      { title: "Your library — LyricFlow" },
      { name: "description", content: "Every song you've uploaded to LyricFlow, ready to play with lyrics timed to playback." },
      { property: "og:title", content: "Your library — LyricFlow" },
      { property: "og:url", content: "https://lyricflow-swastik.lovable.app/library" },
      { property: "og:description", content: "Your saved songs with lyrics timed to playback." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Your library — LyricFlow" },
      { name: "twitter:description", content: "Your saved songs with lyrics timed to playback." },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://lyricflow-swastik.lovable.app/library" }],
  }),
  component: LibraryPage,
  errorComponent: RouteError,
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [sort, setSort] = useState<LibrarySort>("newest");
  const [pendingDelete, setPendingDelete] = useState<LibrarySong | null>(null);
  const [pendingRestoreId, setPendingRestoreId] = useState<string | null>(null);
  const backupInput = useRef<HTMLInputElement | null>(null);

  const loadSongs = useCallback(async (query: string, order: LibrarySort): Promise<boolean> => {
    const normalizedQuery = normalizeSongSearch(query);
    setSongs(null);
    setError(null);
    setAppliedSearch(normalizedQuery);
    setSort(order);
    try {
      const page = await listSongsPage({ offset: 0, limit: PAGE_SIZE, query: normalizedQuery, sort: order });
      setSongs(page.songs);
      setHasMore(page.hasMore);
      return true;
    } catch {
      setError("We couldn't load your library. Check your connection and try again.");
      return false;
    }
  }, []);

  useEffect(() => { void loadSongs("", "newest"); }, [loadSongs]);

  const remove = async (song: LibrarySong) => {
    setPendingDelete(null);
    setSongs((previous) => previous?.filter((item) => item.id !== song.id) ?? null);
    try {
      await deleteSong(song.id);
      toast.success("Song deleted.");
    } catch {
      await loadSongs(appliedSearch, sort);
      toast.error("That song couldn’t be deleted. Please try again.");
    }
  };

  const loadMore = async () => {
    if (!songs || !hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listSongsPage({ offset: songs.length, limit: PAGE_SIZE, query: appliedSearch, sort });
      setSongs((previous) => [...(previous ?? []), ...page.songs]);
      setHasMore(page.hasMore);
    } catch {
      toast.error("More songs couldn’t be loaded. Please try again.");
    } finally {
      setLoadingMore(false);
    }
  };

  const restoreBackup = async () => {
    if (!pendingRestoreId) return;
    try {
      restoreLibraryAccess(pendingRestoreId);
      setPendingRestoreId(null);
      setSearchInput("");
      const loaded = await loadSongs("", sort);
      if (loaded) toast.success("Library access restored.");
      else toast.error("The backup was applied, but the library couldn’t load. Check your connection and retry.");
    } catch {
      toast.error("This browser couldn’t restore library access.");
    }
  };

  const open = (song: LibrarySong) => {
    if (song.processingStatus === "READY") {
      setQueue(songs ?? []);
      return navigate({ to: "/player/$songId", params: { songId: song.id } });
    }
    return navigate({ to: "/processing/$songId", params: { songId: song.id } });
  };

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
          <Plus className="size-4" /> Upload a song
        </Link>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 pb-16 pt-5 sm:px-8 sm:pb-24 sm:pt-6">
        <h1 className="font-display text-2xl font-semibold sm:text-4xl">Your library</h1>
        <p className="mt-1.5 text-sm text-muted-foreground sm:mt-2 sm:text-base">Your library is linked to this browser.</p>

        <details className="mt-4 rounded-2xl border border-glass-border bg-background/35">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
            Back up or restore library access
          </summary>
          <div className="border-t border-glass-border/60 px-4 py-3">
            <p className="max-w-3xl text-xs leading-5 text-muted-foreground sm:text-sm">
              The access backup lets you reconnect this library on another browser. Treat the file like a password: anyone who has it can access and delete songs in this library. Your current library remains online if you switch to a different backup.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => {
                try {
                  downloadLibraryAccessBackup();
                  toast.success("Access backup downloaded. Keep it private.");
                } catch {
                  toast.error("The access backup couldn’t be downloaded.");
                }
              }} className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-glass sm:text-sm">
                <Download className="size-4" aria-hidden /> Download access backup
              </button>
              <button type="button" onClick={() => backupInput.current?.click()} className="inline-flex items-center gap-2 rounded-xl border border-glass-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-glass sm:text-sm">
                <Upload className="size-4" aria-hidden /> Restore access backup
              </button>
              <input
                ref={backupInput}
                type="file"
                accept="application/json,.json"
                aria-label="Choose a LyricFlow library access backup"
                className="sr-only"
                onChange={async (event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (!file) return;
                  try {
                    setPendingRestoreId(await readLibraryAccessBackup(file));
                  } catch {
                    toast.error("That file isn’t a valid LyricFlow access backup.");
                  }
                }}
              />
            </div>
          </div>
        </details>

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            void loadSongs(searchInput.trim(), sort);
          }}
          className="mt-5 flex flex-col gap-2 sm:flex-row"
        >
          <label className="sr-only" htmlFor="library-search">Search song titles and artists</label>
          <input
            id="library-search"
            type="search"
            maxLength={100}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search songs or artists"
            className="min-w-0 flex-1 rounded-xl border border-glass-border bg-glass px-4 py-3 text-sm outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring/60"
          />
          <label className="sr-only" htmlFor="library-sort">Sort songs</label>
          <select
            id="library-sort"
            value={sort}
            onChange={(event) => void loadSongs(appliedSearch, event.target.value as LibrarySort)}
            className="rounded-xl border border-glass-border bg-glass px-3 py-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="title">Title A–Z</option>
          </select>
          <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
            <Search className="size-4" aria-hidden /> Search
          </button>
          {appliedSearch && (
            <button type="button" onClick={() => { setSearchInput(""); void loadSongs("", sort); }} className="rounded-xl border border-glass-border px-4 py-3 text-sm text-muted-foreground hover:text-foreground">
              Clear
            </button>
          )}
        </form>

        {error && (
          <div className="mt-10 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <p>{error}</p>
            <button type="button" onClick={() => void loadSongs(appliedSearch, sort)} className="font-semibold text-primary hover:underline">
              Try again
            </button>
          </div>
        )}
        {!songs && !error && <p className="mt-10 text-muted-foreground">Loading…</p>}

        {songs && songs.length === 0 && appliedSearch && (
          <div className="mt-12 flex flex-col items-center text-center sm:mt-16">
            <p className="font-display text-lg sm:text-xl">No matching songs</p>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">Try another title or artist name.</p>
          </div>
        )}

        {songs && songs.length === 0 && !appliedSearch && (
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
                  aria-label={`Open ${song.title}`}
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
                {song.processingStatus === "READY" && song.lineCount > 0 && (
                  <LyricExportMenu
                    meta={{ title: song.title, artist: song.artist, duration: song.duration }}
                    loadLyrics={async () => (await getSongWithLyrics(song.id))?.lyrics?.synchronizedLyrics ?? null}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setPendingDelete(song)}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-glass hover:text-foreground sm:size-10"
                  aria-label={`Delete ${song.title}`}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {songs && hasMore && (
          <div className="mt-6 text-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="rounded-full border border-glass-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-glass disabled:opacity-60">
              {loadingMore ? "Loading songs…" : "Load more songs"}
            </button>
          </div>
        )}
      </section>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this song?</AlertDialogTitle>
            <AlertDialogDescription>
              “{pendingDelete?.title}” and its saved lyrics will be removed from your library. This can’t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep song</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (pendingDelete) void remove(pendingDelete); }}>
              Delete song
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={pendingRestoreId !== null} onOpenChange={(open) => { if (!open) setPendingRestoreId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Switch to this library?</AlertDialogTitle>
            <AlertDialogDescription>
              This browser will open the library from the selected backup. Your current library isn’t deleted, but you’ll need its own backup to reconnect to it here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void restoreBackup()}>
              Restore library access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
