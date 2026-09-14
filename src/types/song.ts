export type ProcessingStatus =
  | "UPLOADED"
  | "PROCESSING"
  | "TRANSCRIBING"
  | "ALIGNING"
  | "READY"
  | "FAILED";

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface Song {
  id: string;
  userId: string;
  title: string;
  artist: string;
  /** Seconds. 0 until the audio metadata is known. */
  duration: number;
  originalFileUrl: string;
  audioFileUrl: string;
  coverImageUrl: string | null;
  processingStatus: ProcessingStatus;
  createdAt: string;
}

export interface SongStatus {
  songId: string;
  processingStatus: ProcessingStatus;
  /** 0 - 100 */
  progress: number;
  stage: string;
}
