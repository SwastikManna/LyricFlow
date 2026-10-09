import { listSongsPage } from "@/api/songs";
import type { LibrarySong } from "@/lib/songs.functions";

/**
 * Play queue: an ordered list of ready songs kept in sessionStorage so it
 * survives player route changes. The library seeds it with the order the
 * listener is looking at; otherwise it falls back to newest-first.
 */
export interface QueueItem {
  id: string;
  title: string;
  artist: string;
  duration: number;
}

const QUEUE_KEY = "lyricflow:queue";
const AUTOPLAY_KEY = "lyricflow:autoplay";

function toItem(song: LibrarySong): QueueItem {
  return { id: song.id, title: song.title, artist: song.artist, duration: song.duration };
}

export function setQueue(songs: LibrarySong[]) {
  if (typeof window === "undefined") return;
  const items = songs.filter((s) => s.processingStatus === "READY").map(toItem);
  window.sessionStorage.setItem(QUEUE_KEY, JSON.stringify(items));
}

function readStored(): QueueItem[] | null {
  try {
    const raw = window.sessionStorage.getItem(QUEUE_KEY);
    const parsed = raw ? (JSON.parse(raw) as QueueItem[]) : null;
    return Array.isArray(parsed) && parsed.length ? parsed : null;
  } catch {
    return null;
  }
}

/** Returns a queue that contains `songId`, loading the library if needed. */
export async function loadQueue(songId: string): Promise<QueueItem[]> {
  const stored = readStored();
  if (stored?.some((item) => item.id === songId)) return stored;
  const page = await listSongsPage({ offset: 0, limit: 100, query: "", sort: "newest" });
  setQueue(page.songs);
  return readStored() ?? [];
}

/** Marks that the next player screen should start playing automatically. */
export function requestAutoplay() {
  window.sessionStorage.setItem(AUTOPLAY_KEY, "1");
}

export function consumeAutoplay(): boolean {
  if (typeof window === "undefined") return false;
  const wanted = window.sessionStorage.getItem(AUTOPLAY_KEY) === "1";
  window.sessionStorage.removeItem(AUTOPLAY_KEY);
  return wanted;
}
