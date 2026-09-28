/** Requests phonetic Latin-script versions of a saved song's lyric lines. */
export async function romanizeSavedSong(
  songId: string,
  deviceId: string,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const response = await fetch("/api/romanize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: songId, deviceId }),
    signal: signal ?? null,
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    romanizations?: Record<string, string>;
  };
  if (!response.ok || !body.romanizations) {
    throw new Error(body.error ?? "Romanization failed.");
  }
  return body.romanizations;
}
