/** Keep upload and analysis limits consistent across browser and server code. */
export const MAX_SONG_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_SONG_FILE_LABEL = "20 MB";

export function normalizeSongSearch(query: string) {
  return query
    .slice(0, 100)
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}
