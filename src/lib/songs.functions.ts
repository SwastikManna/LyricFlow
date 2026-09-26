import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Song } from "@/types/song";
import type { Lyrics } from "@/types/lyrics";

const DeviceInput = z.object({ deviceId: z.string().min(8).max(100) });
const SongInput = DeviceInput.extend({ id: z.string().uuid() });

export interface LibrarySong extends Song {
  lineCount: number;
}

export const listSongsFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => DeviceInput.parse(d))
  .handler(async ({ data }): Promise<LibrarySong[]> => {
    const { admin, toSong } = await import("./songs.server");
    const db = await admin();
    const { data: rows, error } = await db
      .from("songs" as never)
      .select("*")
      .eq("device_id", data.deviceId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return ((rows ?? []) as import("./songs.server").SongRow[]).map((r) => ({
      ...toSong(r, ""),
      lineCount: (r.lyrics as { lines?: unknown[] } | null)?.lines?.length ?? 0,
    }));
  });

export const getSongFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SongInput.parse(d))
  .handler(async ({ data }): Promise<{ song: Song; lyrics: Lyrics | null } | null> => {
    const { getOwnedRow, signedUrl, toSong } = await import("./songs.server");
    const row = await getOwnedRow(data.id, data.deviceId);
    if (!row) return null;
    const url = await signedUrl(row.file_path);
    const lyrics: Lyrics | null = row.lyrics
      ? {
          id: `lyrics_${row.id}`,
          songId: row.id,
          language: row.language ?? "en",
          source: (row.lyrics_source as Lyrics["source"]) ?? "AI_TRANSCRIPTION",
          synchronizedLyrics: row.lyrics as Lyrics["synchronizedLyrics"],
        }
      : null;
    return { song: toSong(row, url), lyrics };
  });

export const setSongDurationFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SongInput.extend({ duration: z.number().positive() }).parse(d))
  .handler(async ({ data }) => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    await db
      .from("songs" as never)
      .update({ duration: Math.round(data.duration) } as never)
      .eq("id", data.id)
      .eq("device_id", data.deviceId);
    return { ok: true };
  });

export const deleteSongFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SongInput.parse(d))
  .handler(async ({ data }) => {
    const { admin, getOwnedRow, BUCKET } = await import("./songs.server");
    const row = await getOwnedRow(data.id, data.deviceId);
    if (!row) return { ok: true };
    const db = await admin();
    await db.storage.from(BUCKET).remove([row.file_path]);
    await db.from("songs" as never).delete().eq("id", data.id);
    return { ok: true };
  });
