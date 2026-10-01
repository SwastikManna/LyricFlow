import type { LyricLine, LyricWord } from "@/types/lyrics";

interface ProviderWord {
  text?: unknown;
  start?: unknown;
  end?: unknown;
}

interface ProviderResponse {
  words?: unknown;
}

const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

/** Compare transcript tokens while ignoring case and punctuation differences. */
function tokenKey(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/[\p{P}\p{S}\s]/gu, "");
}

function mapProviderWords(
  lines: LyricLine[],
  providerWords: ProviderWord[],
  duration: number,
): LyricLine[] | null {
  const expected = lines.map((line) => line.text.split(/\s+/u).filter(Boolean));
  const actual = providerWords
    .filter((word) => typeof word.text === "string" && finite(word.start) && finite(word.end) && word.end > word.start)
    .map((word) => ({ text: word.text as string, start: word.start as number, end: word.end as number }))
    .filter((word) => tokenKey(word.text));
  const flatExpected = expected.flat();
  if (!flatExpected.length || !actual.length) return null;

  const mapped: LyricWord[] = [];
  let expectedIndex = 0;
  let actualIndex = 0;

  while (expectedIndex < flatExpected.length && actualIndex < actual.length) {
    const target = tokenKey(flatExpected[expectedIndex]!);
    const current = tokenKey(actual[actualIndex]!.text);
    if (!target) {
      mapped.push({ text: flatExpected[expectedIndex]!, start: actual[actualIndex]!.start, end: actual[actualIndex]!.end });
      expectedIndex++;
      continue;
    }
    if (target === current) {
      const word = actual[actualIndex]!;
      mapped.push({ text: flatExpected[expectedIndex]!, start: word.start, end: word.end });
      expectedIndex++;
      actualIndex++;
      continue;
    }

    // Some transcribers split contractions or attach punctuation differently.
    // Join up to four pieces only when the resulting text matches exactly.
    let joinedActual = "";
    let actualCount = 0;
    while (actualIndex + actualCount < actual.length && actualCount < 4 && target.startsWith(joinedActual)) {
      joinedActual += tokenKey(actual[actualIndex + actualCount]!.text);
      actualCount++;
      if (joinedActual === target) break;
    }
    if (joinedActual === target) {
      const group = actual.slice(actualIndex, actualIndex + actualCount);
      mapped.push({
        text: flatExpected[expectedIndex]!,
        start: Math.min(...group.map((word) => word.start)),
        end: Math.max(...group.map((word) => word.end)),
      });
      expectedIndex++;
      actualIndex += actualCount;
      continue;
    }

    // Conversely, a provider may combine adjacent transcript words into one.
    let joinedExpected = "";
    let expectedCount = 0;
    while (expectedIndex + expectedCount < flatExpected.length && expectedCount < 4 && current.startsWith(joinedExpected)) {
      joinedExpected += tokenKey(flatExpected[expectedIndex + expectedCount]!);
      expectedCount++;
      if (joinedExpected === current) break;
    }
    if (joinedExpected === current) {
      const word = actual[actualIndex]!;
      for (let offset = 0; offset < expectedCount; offset++) {
        mapped.push({ text: flatExpected[expectedIndex + offset]!, start: word.start, end: word.end });
      }
      expectedIndex += expectedCount;
      actualIndex++;
      continue;
    }
    return null;
  }

  if (expectedIndex !== flatExpected.length || actualIndex !== actual.length || mapped.length !== flatExpected.length) return null;

  const maximum = duration > 0 ? duration : Infinity;
  let cursor = 0;
  const alignedLines: LyricLine[] = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]!;
    const words = mapped.slice(cursor, cursor + expected[lineIndex]!.length).map((word) => ({
      ...word,
      start: Math.max(0, Math.min(word.start, maximum)),
      end: Math.max(0, Math.min(word.end, maximum)),
    }));
    cursor += expected[lineIndex]!.length;
    const usable = words.filter((word) => word.end > word.start);
    if (usable.length !== words.length || words.length === 0) return null;
    alignedLines.push({
      ...line,
      start: Math.min(...words.map((word) => word.start)),
      end: Math.max(...words.map((word) => word.end)),
      words,
    });
  }
  return alignedLines;
}

/** Ask ElevenLabs to locate each transcript word in the uploaded audio. */
export async function forceAlignLyricsToAudio({
  audio,
  fileName,
  lines,
  duration,
  apiKey,
  signal,
}: {
  audio: Blob;
  fileName: string;
  lines: LyricLine[];
  duration: number;
  apiKey: string;
  signal?: AbortSignal;
}): Promise<LyricLine[] | null> {
  const form = new FormData();
  form.append("file", audio, fileName);
  form.append("text", lines.map((line) => line.text).join("\n"));

  const response = await fetch("https://api.elevenlabs.io/v1/forced-alignment", {
    method: "POST",
    headers: { "xi-api-key": apiKey },
    body: form,
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`Word alignment service returned ${response.status}.`);
  }
  const result = (await response.json().catch(() => null)) as ProviderResponse | null;
  if (!Array.isArray(result?.words)) return null;
  return mapProviderWords(lines, result.words as ProviderWord[], duration);
}
