import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { LibrarySong } from "@/lib/songs.functions";

/**
 * Playlists are scoped to the same anonymous device id as songs. All access
 * goes through these server functions (the tables have no public policies).
 */
const DeviceInput = z.object({ deviceId: z.string().min(8).max(100) });
const PlaylistInput = DeviceInput.extend({ playlistId: z.string().uuid() });
const Name = z.string().trim().min(1).max(80);

export interface PlaylistSummary {
  id: string;
  name: string;
  songCount: number;
  createdAt: string;
}

export interface PlaylistDetail {
  id: string;
  name: string;
  songs: LibrarySong[];
}

async function ownedPlaylist(playlistId: string, deviceId: string) {
  const { admin } = await import("./songs.server");
  const db = await admin();
  const { data, error } = await db
    .from("playlists")
    .select("id, name")
    .eq("id", playlistId)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export const listPlaylistsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeviceInput.parse(d))
  .handler(async ({ data }): Promise<PlaylistSummary[]> => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { data: rows, error } = await db
      .from("playlists")
      .select("id, name, created_at, playlist_songs(count)")
      .eq("device_id", data.deviceId)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      createdAt: r.created_at,
      songCount: (r.playlist_songs as unknown as { count: number }[] | null)?.[0]?.count ?? 0,
    }));
  });

/** Ids of the playlists that already contain a song (for checkmarks). */
export const playlistsForSongFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeviceInput.extend({ songId: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<string[]> => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { data: rows, error } = await db
      .from("playlist_songs")
      .select("playlist_id, playlists!inner(device_id)")
      .eq("song_id", data.songId)
      .eq("playlists.device_id", data.deviceId);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => r.playlist_id);
  });

export const createPlaylistFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeviceInput.extend({ name: Name }).parse(d))
  .handler(async ({ data }): Promise<PlaylistSummary> => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { data: row, error } = await db
      .from("playlists")
      .insert({ device_id: data.deviceId, name: data.name })
      .select("id, name, created_at")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id, name: row.name, createdAt: row.created_at, songCount: 0 };
  });

export const renamePlaylistFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlaylistInput.extend({ name: Name }).parse(d))
  .handler(async ({ data }) => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { error } = await db
      .from("playlists")
      .update({ name: data.name })
      .eq("id", data.playlistId)
      .eq("device_id", data.deviceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deletePlaylistFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlaylistInput.parse(d))
  .handler(async ({ data }) => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { error } = await db
      .from("playlists")
      .delete()
      .eq("id", data.playlistId)
      .eq("device_id", data.deviceId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setPlaylistSongFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    PlaylistInput.extend({ songId: z.string().uuid(), included: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { admin, getOwnedRow } = await import("./songs.server");
    if (!(await ownedPlaylist(data.playlistId, data.deviceId))) throw new Error("Playlist not found");
    if (!(await getOwnedRow(data.songId, data.deviceId))) throw new Error("Song not found");
    const db = await admin();
    if (!data.included) {
      const { error } = await db
        .from("playlist_songs")
        .delete()
        .eq("playlist_id", data.playlistId)
        .eq("song_id", data.songId);
      if (error) throw new Error(error.message);
      return { ok: true };
    }
    const { data: last } = await db
      .from("playlist_songs")
      .select("position")
      .eq("playlist_id", data.playlistId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    const { error } = await db
      .from("playlist_songs")
      .upsert(
        { playlist_id: data.playlistId, song_id: data.songId, position: (last?.position ?? -1) + 1 },
        { onConflict: "playlist_id,song_id", ignoreDuplicates: true },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getPlaylistFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PlaylistInput.parse(d))
  .handler(async ({ data }): Promise<PlaylistDetail | null> => {
    const { admin, toSong } = await import("./songs.server");
    const playlist = await ownedPlaylist(data.playlistId, data.deviceId);
    if (!playlist) return null;
    const db = await admin();
    const { data: rows, error } = await db
      .from("playlist_songs")
      .select("position, songs(*)")
      .eq("playlist_id", data.playlistId)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    const songs = (rows ?? [])
      .map((r) => r.songs as unknown as import("./songs.server").SongRow | null)
      .filter((row): row is import("./songs.server").SongRow => Boolean(row) && row!.device_id === data.deviceId)
      .map((row) => ({
        ...toSong(row, ""),
        lineCount: (row.lyrics as { lines?: unknown[] } | null)?.lines?.length ?? 0,
        bpm: (row.lyrics as { beatGrid?: { bpm?: number }; bpm?: number } | null)?.beatGrid?.bpm
          ?? (row.lyrics as { bpm?: number } | null)?.bpm
          ?? null,
      }));
    return { id: playlist.id, name: playlist.name, songs };
  });
