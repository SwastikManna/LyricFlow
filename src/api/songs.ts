import type { Song, SongStatus, ProcessingStatus } from "@/types/song";
import type { Lyrics, SyncedLyrics } from "@/types/lyrics";
import { transcribeAudio } from "@/lib/ai-transcription";

/**
 * Song API abstraction.
 *
 * Mirrors the eventual HTTP surface:
 *   POST   /api/songs
 *   GET    /api/songs/:id
 *   GET    /api/songs/:id/status
 *   GET    /api/songs/:id/lyrics
 *   POST   /api/songs/:id/process
 *   PUT    /api/songs/:id/lyrics
 *   DELETE /api/songs/:id
 *
 * Today it is backed by an in-browser store (object URLs + localStorage
 * metadata) and a simulated processing pipeline. Every function is async, so
 * swapping the bodies for real server-function / fetch calls later does not
 * touch any UI code. No API keys ever live in this layer.
 */

const META_KEY = "lyricflow:songs";
const LYRICS_KEY = "lyricflow:lyrics";
const MOCK_USER_ID = "local-user";

/** Object URLs cannot survive a reload, so they are kept in memory only. */
const audioUrls = new Map<string, string>();
/** Original files, kept in memory so they can be sent for transcription. */
const audioFiles = new Map<string, File>();

type StoredSong = Omit<Song, "originalFileUrl" | "audioFileUrl"> & {
  fileName: string;
  fileSize: number;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function readMap<T>(key: string): Record<string, T> {
  if (!isBrowser()) return {};
  try {
    return JSON.parse(window.localStorage.getItem(key) ?? "{}") as Record<string, T>;
  } catch {
    return {};
  }
}

function writeMap<T>(key: string, value: Record<string, T>) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function hydrate(stored: StoredSong): Song {
  const url = audioUrls.get(stored.id) ?? "";
  return { ...stored, originalFileUrl: url, audioFileUrl: url };
}

function persist(song: Song, extra: { fileName: string; fileSize: number }) {
  const songs = readMap<StoredSong>(META_KEY);
  const { originalFileUrl: _o, audioFileUrl: _a, ...rest } = song;
  songs[song.id] = { ...rest, ...extra };
  writeMap(META_KEY, songs);
}

function patch(id: string, changes: Partial<StoredSong>) {
  const songs = readMap<StoredSong>(META_KEY);
  if (!songs[id]) return;
  songs[id] = { ...songs[id], ...changes };
  writeMap(META_KEY, songs);
}

function guessTitle(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Untitled track";
  return base.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

async function readDuration(file: File): Promise<number> {
  if (!isBrowser()) return 0;
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
  title?: string;
  artist?: string;
  onProgress?: (percent: number) => void;
  signal?: AbortSignal;
}

/** POST /api/songs — uploads the file and creates the song entry. */
export async function createSong({
  file,
  title,
  artist,
  onProgress,
  signal,
}: CreateSongInput): Promise<Song> {
  const id = `song_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

  // Simulated upload progress; a real implementation streams to storage.
  for (let p = 0; p <= 100; p += 10) {
    if (signal?.aborted) throw new DOMException("Upload cancelled", "AbortError");
    onProgress?.(p);
    await wait(70);
  }

  const duration = await readDuration(file);
  const url = URL.createObjectURL(file);
  audioUrls.set(id, url);
  audioFiles.set(id, file);

  const song: Song = {
    id,
    userId: MOCK_USER_ID,
    title: title?.trim() || guessTitle(file.name),
    artist: artist?.trim() || "Unknown artist",
    duration,
    originalFileUrl: url,
    audioFileUrl: url,
    coverImageUrl: null,
    processingStatus: "UPLOADED",
    createdAt: new Date().toISOString(),
  };

  persist(song, { fileName: file.name, fileSize: file.size });
  return song;
}

/** GET /api/songs/:id */
export async function getSong(id: string): Promise<Song | null> {
  const stored = readMap<StoredSong>(META_KEY)[id];
  return stored ? hydrate(stored) : null;
}

/** GET /api/songs — most recent first. */
export async function listSongs(): Promise<Song[]> {
  return Object.values(readMap<StoredSong>(META_KEY))
    .map(hydrate)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** True when the in-memory audio URL is gone (e.g. after a page reload). */
export function hasPlayableAudio(id: string) {
  return audioUrls.has(id);
}

export interface ProcessingStage {
  key: string;
  label: string;
  doneLabel: string;
  status: ProcessingStatus;
  /** Progress value reached when this stage completes. */
  progress: number;
  durationMs: number;
}

export const PROCESSING_STAGES: ProcessingStage[] = [
  { key: "upload", label: "Uploading audio", doneLabel: "Audio uploaded", status: "UPLOADED", progress: 12, durationMs: 900 },
  { key: "extract", label: "Extracting audio", doneLabel: "Audio extracted", status: "PROCESSING", progress: 30, durationMs: 1400 },
  { key: "vocals", label: "Analyzing vocals", doneLabel: "Vocals isolated", status: "PROCESSING", progress: 48, durationMs: 1600 },
  { key: "transcribe", label: "Transcribing lyrics", doneLabel: "Lyrics detected", status: "TRANSCRIBING", progress: 70, durationMs: 2000 },
  { key: "align", label: "Synchronizing timestamps", doneLabel: "Lyrics synchronized", status: "ALIGNING", progress: 90, durationMs: 1700 },
  { key: "finalize", label: "Finalizing", doneLabel: "Ready to play", status: "READY", progress: 100, durationMs: 900 },
];

/**
 * POST /api/songs/:id/process — kicks off the pipeline.
 * Mocked as a client-side timeline; later this enqueues a background job and
 * the UI simply keeps polling `getSongStatus`.
 */
export async function processSong(
  id: string,
  onStage?: (stageIndex: number, status: SongStatus) => void,
  signal?: AbortSignal,
): Promise<Song> {
  const song = await getSong(id);
  if (!song) throw new Error("Song not found");
  const file = audioFiles.get(id);
  if (!file) throw new Error("The audio for this song is no longer available. Please upload it again.");

  const transcribeIndex = PROCESSING_STAGES.findIndex((s) => s.key === "transcribe");
  let transcription: Promise<SyncedLyrics> | null = null;

  try {
    for (let i = 0; i < PROCESSING_STAGES.length; i++) {
      const stage = PROCESSING_STAGES[i]!;
      if (signal?.aborted) throw new DOMException("Processing cancelled", "AbortError");
      patch(id, { processingStatus: stage.status });
      onStage?.(i, {
        songId: id,
        processingStatus: stage.status,
        progress: stage.progress,
        stage: stage.label,
      });
      // Start the real AI call early so it runs while the intro stages animate.
      if (i === 1) transcription = transcribeAudio(id, file, song.duration, signal);
      if (i === transcribeIndex && transcription) {
        const synced = await transcription;
        const lyrics: Lyrics = {
          id: `lyrics_${id}`,
          songId: id,
          language: synced.language,
          source: "AI_TRANSCRIPTION",
          synchronizedLyrics: synced,
        };
        const all = readMap<Lyrics>(LYRICS_KEY);
        all[id] = lyrics;
        writeMap(LYRICS_KEY, all);
      } else {
        await wait(Math.min(stage.durationMs, 900));
      }
    }
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      patch(id, { processingStatus: "FAILED" });
    }
    throw err;
  }

  patch(id, { processingStatus: "READY" });
  return (await getSong(id))!;
}

/** GET /api/songs/:id/status */
export async function getSongStatus(id: string): Promise<SongStatus | null> {
  const song = await getSong(id);
  if (!song) return null;
  const stage =
    PROCESSING_STAGES.find((s) => s.status === song.processingStatus) ??
    PROCESSING_STAGES[PROCESSING_STAGES.length - 1]!;
  return {
    songId: id,
    processingStatus: song.processingStatus,
    progress: song.processingStatus === "READY" ? 100 : stage.progress,
    stage: stage.label,
  };
}

/** GET /api/songs/:id/lyrics */
export async function getSongLyrics(id: string): Promise<Lyrics | null> {
  return readMap<Lyrics>(LYRICS_KEY)[id] ?? null;
}

/** PUT /api/songs/:id/lyrics */
export async function updateSongLyrics(id: string, synchronizedLyrics: SyncedLyrics): Promise<Lyrics> {
  const all = readMap<Lyrics>(LYRICS_KEY);
  const next: Lyrics = {
    id: all[id]?.id ?? `lyrics_${id}`,
    songId: id,
    language: synchronizedLyrics.language,
    source: "MANUAL",
    synchronizedLyrics,
  };
  all[id] = next;
  writeMap(LYRICS_KEY, all);
  return next;
}

/** DELETE /api/songs/:id */
export async function deleteSong(id: string): Promise<void> {
  const songs = readMap<StoredSong>(META_KEY);
  delete songs[id];
  writeMap(META_KEY, songs);

  const all = readMap<Lyrics>(LYRICS_KEY);
  delete all[id];
  writeMap(LYRICS_KEY, all);

  const url = audioUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  audioUrls.delete(id);
  audioFiles.delete(id);
}

/** Records the true duration once the audio element reports it. */
export async function setSongDuration(id: string, duration: number): Promise<void> {
  if (!Number.isFinite(duration) || duration <= 0) return;
  patch(id, { duration: Math.round(duration) });
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
