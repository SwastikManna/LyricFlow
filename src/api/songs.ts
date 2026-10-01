import type { Song, SongStatus, ProcessingStatus } from "@/types/song";
import type { Lyrics } from "@/types/lyrics";
import { alignSavedSong, transcribeSavedSong } from "@/lib/ai-transcription";
import { romanizeSavedSong } from "@/lib/ai-romanization";
import { alignLyricsToBeats, detectBeats } from "@/lib/beat-detection";
import type { SyncedLyrics } from "@/types/lyrics";
import {
  deleteSongFn,
  getSongFn,
  listSongsFn,
  listSongsPageFn,
  saveAlignedLyricsFn,
  setSongDurationFn,
  type LibrarySong,
  type LibrarySort,
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

export async function listRecentSongs(): Promise<LibrarySong[]> {
  return listSongsFn({ data: { deviceId: getDeviceId() } });
}

export async function listSongsPage(input: {
  offset: number;
  limit: number;
  query: string;
  sort: LibrarySort;
}) {
  return listSongsPageFn({ data: { deviceId: getDeviceId(), ...input } });
}

const LIBRARY_BACKUP_FORMAT = "lyricflow-library-access";

/** Downloads the browser-linked library identifier so access can be restored elsewhere. */
export function downloadLibraryAccessBackup() {
  const deviceId = getDeviceId();
  if (!deviceId || typeof window === "undefined") throw new Error("Library backup is only available in a browser.");
  const backup = {
    format: LIBRARY_BACKUP_FORMAT,
    version: 1,
    deviceId,
    createdAt: new Date().toISOString(),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lyricflow-library-access-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readLibraryAccessBackup(file: File): Promise<string> {
  if (file.size > 4096) throw new Error("The backup file is too large.");
  const value: unknown = JSON.parse(await file.text());
  if (typeof value !== "object" || value === null) throw new Error("Invalid library backup.");
  const backup = value as Record<string, unknown>;
  if (
    backup["format"] !== LIBRARY_BACKUP_FORMAT ||
    backup["version"] !== 1 ||
    typeof backup["deviceId"] !== "string" ||
    !/^[0-9a-f-]{36}$/i.test(backup["deviceId"])
  ) {
    throw new Error("This file isn’t a valid LyricFlow library access backup.");
  }
  return backup["deviceId"];
}

export function restoreLibraryAccess(deviceId: string) {
  if (typeof window === "undefined" || !/^[0-9a-f-]{36}$/i.test(deviceId)) {
    throw new Error("This library access backup is invalid.");
  }
  window.localStorage.setItem(DEVICE_KEY, deviceId);
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
  { key: "inspect", label: "Reading audio", doneLabel: "Audio ready", status: "PROCESSING", progress: 24, durationMs: 300 },
  { key: "transcribe", label: "Transcribing lyrics", doneLabel: "Lyrics transcribed", status: "TRANSCRIBING", progress: 58, durationMs: 0 },
  { key: "romanize", label: "Writing phonetic lyrics", doneLabel: "Romanized lyrics ready", status: "PROCESSING", progress: 70, durationMs: 0 },
  { key: "word-align", label: "Aligning words to the recording", doneLabel: "Timing step complete", status: "ALIGNING", progress: 79, durationMs: 0 },
  { key: "beat", label: "Tracking the beat", doneLabel: "Beat grid detected", status: "PROCESSING", progress: 87, durationMs: 0 },
  { key: "align", label: "Syncing the lyric lines", doneLabel: "Lyrics synchronized", status: "ALIGNING", progress: 95, durationMs: 0 },
  { key: "finalize", label: "Finalizing", doneLabel: "Ready to play", status: "READY", progress: 100, durationMs: 300 },
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
  let grid: Awaited<typeof beats> = null;
  for (let i = 0; i < PROCESSING_STAGES.length; i++) {
    const stage = PROCESSING_STAGES[i]!;
    if (signal?.aborted) throw new DOMException("Processing cancelled", "AbortError");
    onStage?.(i, { songId: id, processingStatus: stage.status, progress: stage.progress, stage: stage.label });
    if (stage.key === "transcribe") lyrics = await transcription;
    else if (stage.key === "romanize" && lyrics) {
      const romanizations = await romanizeSavedSong(id, getDeviceId(), signal).catch(() => null);
      if (romanizations && lyrics) {
        const currentLyrics: SyncedLyrics = lyrics;
        lyrics = {
          ...currentLyrics,
          lines: currentLyrics.lines.map((line) => {
            const romanization = romanizations[line.id];
            return romanization ? { ...line, romanization } : line;
          }),
        };
      }
    }
    else if (stage.key === "word-align" && lyrics) {
      const result = await alignSavedSong(id, getDeviceId(), signal).catch(() => null);
      if (result) lyrics = result.lyrics;
    }
    else if (stage.key === "beat") grid = await beats;
    else if (stage.key === "align" && lyrics) {
      if (grid && grid.confidence > 0.05) {
        // Beat snapping must not overwrite word boundaries measured from audio.
        const aligned = lyrics.wordTimingSource === "audio-aligned"
          ? { ...lyrics, beatGrid: grid }
          : alignLyricsToBeats(lyrics, grid);
        await saveAlignedLyricsFn({
          data: {
            id,
            deviceId: getDeviceId(),
            lyrics: { ...aligned, beatGrid: grid },
            bpm: grid.bpm,
            beatGrid: grid,
          },
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
