import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Song } from "@/types/song";
import type { Lyrics } from "@/types/lyrics";

/** Owner turns public sharing on or off for one song. */
export const setSongSharedFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({ deviceId: z.string().min(8).max(100), id: z.string().uuid(), shared: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { data: rows, error } = await db
      .from("songs")
      .update({ is_public: data.shared })
      .eq("id", data.id)
      .eq("device_id", data.deviceId)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows?.length) throw new Error("Song not found");
    return { shared: data.shared };
  });

export const getSongSharedFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ deviceId: z.string().min(8).max(100), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { data: row } = await db
      .from("songs")
      .select("is_public")
      .eq("id", data.id)
      .eq("device_id", data.deviceId)
      .maybeSingle();
    return { shared: Boolean(row?.is_public) };
  });

/** Anyone with the link can load a song whose owner turned sharing on. */
export const getPublicSongFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }): Promise<{ song: Song; lyrics: Lyrics | null } | null> => {
    const { admin, signedUrl, toSong } = await import("./songs.server");
    const db = await admin();
    const { data: found, error } = await db
      .from("songs")
      .select("*")
      .eq("id", data.id)
      .eq("is_public", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!found) return null;
    const row = found as unknown as import("./songs.server").SongRow;
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
    // Never expose the owner's library id to listeners.
    return { song: { ...toSong(row, url), userId: "" }, lyrics };
  });
