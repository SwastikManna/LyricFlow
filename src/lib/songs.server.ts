import type { Song, ProcessingStatus } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";

export const BUCKET = "songs";
export const SIGNED_URL_TTL = 60 * 60 * 6;

export interface SongRow {
  id: string;
  device_id: string;
  title: string;
  artist: string;
  duration: number | string;
  file_path: string;
  file_name: string;
  file_size: number;
  processing_status: string;
  lyrics: unknown;
  lyrics_source: string | null;
  language: string | null;
  error_message: string | null;
  created_at: string;
}

export async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export function toSong(row: SongRow, url: string): Song {
  return {
    id: row.id,
    userId: row.device_id,
    title: row.title,
    artist: row.artist,
    duration: Number(row.duration) || 0,
    originalFileUrl: url,
    audioFileUrl: url,
    coverImageUrl: null,
    processingStatus: row.processing_status as ProcessingStatus,
    createdAt: row.created_at,
  };
}

export async function getOwnedRow(id: string, deviceId: string): Promise<SongRow | null> {
  const db = await admin();
  const { data, error } = await db
    .from("songs" as never)
    .select("*")
    .eq("id", id)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as SongRow | null) ?? null;
}

export async function signedUrl(path: string) {
  const db = await admin();
  const { data } = await db.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return data?.signedUrl ?? "";
}

export type { SyncedLyrics };
