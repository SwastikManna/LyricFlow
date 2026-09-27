import type { Song, SongStatus, ProcessingStatus } from "@/types/song";
import type { Lyrics } from "@/types/lyrics";
import { transcribeSavedSong } from "@/lib/ai-transcription";
import { alignLyricsToBeats, detectBeats } from "@/lib/beat-detection";
import type { SyncedLyrics } from "@/types/lyrics";
import {
  deleteSongFn,
  getSongFn,
  listSongsFn,
  saveAlignedLyricsFn,
  setSongDurationFn,
  type LibrarySong,
} from "@/lib/songs.functions";

/**
 * Song API used by the UI. Audio and lyrics are saved online; songs are tied
 * to this browser through an anonymous device id (no sign-in yet).
 */

const DEVICE_KEY = "lyricflow:device";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = window.localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    window.localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

async function readDuration(file: File): Promise<number> {
  if (typeof window === "undefined") return 0;
  return new Promise((resolve) => {
    const el = document.createElement("audio");
    const url = URL.createObjectURL(file);
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? value : 0);
    };
    el.preload = "metadata";
    el.onloadedmetadata = () => done(el.duration);
    el.onerror = () => done(0);
    el.src = url;
  });
}

export interface CreateSongInput {
  file: File;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** Uploads the file and creates the saved song. Resolves with the new song id. */
export async function createSong({ file, onProgress, signal }: CreateSongInput): Promise<{ id: string }> {
  const duration = await readDuration(file);
  const form = new FormData();
  form.append("file", file, file.name);
  form.append("deviceId", getDeviceId());
  form.append("duration", String(duration));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/songs");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      let body: { id?: string; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* ignore */
      }
      if (xhr.status >= 200 && xhr.status < 300 && body.id) resolve({ id: body.id });
      else reject(new Error(body.error ?? "Upload failed."));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Check your connection."));
    xhr.onabort = () => reject(new DOMException("Upload cancelled", "AbortError"));
    signal?.addEventListener("abort", () => xhr.abort());
    xhr.send(form);
  });
}

/** Loads a saved song (with a playable audio URL) and its lyrics. */
export async function getSongWithLyrics(id: string): Promise<{ song: Song; lyrics: Lyrics | null } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  return getSongFn({ data: { id, deviceId: getDeviceId() } });
}

export async function getSong(id: string): Promise<Song | null> {
  return (await getSongWithLyrics(id))?.song ?? null;
}

export async function listSongs(): Promise<LibrarySong[]> {
  return listSongsFn({ data: { deviceId: getDeviceId() } });
}

export async function deleteSong(id: string): Promise<void> {
  await deleteSongFn({ data: { id, deviceId: getDeviceId() } });
}

export async function setSongDuration(id: string, duration: number): Promise<void> {
  if (!Number.isFinite(duration) || duration <= 0) return;
  await setSongDurationFn({ data: { id, deviceId: getDeviceId(), duration } }).catch(() => {});
}

export interface ProcessingStage {
  key: string;
  label: string;
  doneLabel: string;
  status: ProcessingStatus;
  progress: number;
  durationMs: number;
}

export const PROCESSING_STAGES: ProcessingStage[] = [
  { key: "upload", label: "Uploading audio", doneLabel: "Audio uploaded", status: "UPLOADED", progress: 12, durationMs: 500 },
  { key: "extract", label: "Extracting audio", doneLabel: "Audio extracted", status: "PROCESSING", progress: 30, durationMs: 800 },
  { key: "vocals", label: "Analyzing vocals", doneLabel: "Vocals isolated", status: "PROCESSING", progress: 48, durationMs: 800 },
  { key: "transcribe", label: "Transcribing lyrics", doneLabel: "Lyrics detected", status: "TRANSCRIBING", progress: 70, durationMs: 0 },
  { key: "align", label: "Synchronizing timestamps", doneLabel: "Lyrics synchronized", status: "ALIGNING", progress: 90, durationMs: 600 },
  { key: "finalize", label: "Finalizing", doneLabel: "Ready to play", status: "READY", progress: 100, durationMs: 400 },
];

/** Runs AI transcription for a saved song while stepping through the stages. */
export async function processSong(
  id: string,
  onStage?: (stageIndex: number, status: SongStatus) => void,
  signal?: AbortSignal,
): Promise<void> {
  const transcription = transcribeSavedSong(id, getDeviceId(), signal);
  transcription.catch(() => {});
  // Beat detection runs in parallel with transcription; failures just skip alignment.
  const beats = getSong(id)
    .then((s) => (s?.audioFileUrl ? fetch(s.audioFileUrl, { signal: signal ?? null }) : null))
    .then((r) => (r && r.ok ? r.arrayBuffer() : null))
    .then((buf) => (buf ? detectBeats(buf) : null))
    .catch(() => null);
  let lyrics: SyncedLyrics | null = null;
  for (let i = 0; i < PROCESSING_STAGES.length; i++) {
    const stage = PROCESSING_STAGES[i]!;
    if (signal?.aborted) throw new DOMException("Processing cancelled", "AbortError");
    onStage?.(i, { songId: id, processingStatus: stage.status, progress: stage.progress, stage: stage.label });
    if (stage.key === "transcribe") lyrics = await transcription;
    else if (stage.key === "align" && lyrics) {
      const grid = await beats;
      if (grid && grid.confidence > 0.05) {
        const aligned = alignLyricsToBeats(lyrics, grid);
        await saveAlignedLyricsFn({
          data: { id, deviceId: getDeviceId(), lyrics: aligned, bpm: grid.bpm },
        }).catch(() => {});
      }
      await wait(stage.durationMs);
    } else await wait(stage.durationMs);
  }
}

export const ACCEPTED_AUDIO_TYPES = [".mp3", ".mp4", ".wav", ".m4a"] as const;

export function isAcceptedAudioFile(file: File) {
  const name = file.name.toLowerCase();
  return ACCEPTED_AUDIO_TYPES.some((ext) => name.endsWith(ext));
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
