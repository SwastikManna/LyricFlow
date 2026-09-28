/** Requests a saved, line-matched translation from the server. */
export async function translateSavedSong(
  songId: string,
  deviceId: string,
  targetLanguage: string,
  signal?: AbortSignal,
): Promise<Record<string, string>> {
  const response = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: songId, deviceId, targetLanguage }),
    signal: signal ?? null,
  });
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    translations?: Record<string, string>;
  };
  if (!response.ok || !body.translations) {
    throw new Error(body.error ?? "Translation failed.");
  }
  return body.translations;
}
