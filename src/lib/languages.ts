export const TRANSLATION_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "es", name: "Spanish" },
  { code: "ja", name: "Japanese" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "ko", name: "Korean" },
  { code: "zh", name: "Chinese" },
  { code: "de", name: "German" },
  { code: "it", name: "Italian" },
  { code: "hi", name: "Hindi" },
] as const;

export function languageName(code: string): string {
  return TRANSLATION_LANGUAGES.find((language) => language.code === code)?.name ?? code;
}
