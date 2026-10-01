import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, AudioLines, Languages } from "lucide-react";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/romanized-lyrics")({
  head: () => ({
    meta: [
      { title: "Romanized Lyrics for Songs in Other Scripts | LyricFlow" },
      {
        name: "description",
        content: "Follow songs in scripts you don’t read with phonetic romanization, original lyrics, optional translation, and timing that follows playback.",
      },
      { property: "og:title", content: "Romanized Lyrics for Songs in Other Scripts | LyricFlow" },
      { property: "og:url", content: "https://lyricflow-swastik.lovable.app/romanized-lyrics" },
      {
        property: "og:description",
        content: "Learn how lyric romanization differs from translation and how LyricFlow helps you follow a song as it plays.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Romanized Lyrics for Songs in Other Scripts | LyricFlow" },
      { name: "twitter:description", content: "Learn how lyric romanization differs from translation and how LyricFlow helps you follow a song as it plays." },
    ],
    links: [{ rel: "canonical", href: "https://lyricflow-swastik.lovable.app/romanized-lyrics" }],
  }),
  component: RomanizedLyricsPage,
  errorComponent: RouteError,
});

function RomanizedLyricsPage() {
  return (
    <main className="grain bg-stage min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-8 sm:py-6">
        <Link to="/" className="inline-flex items-center gap-2 font-display text-base font-semibold tracking-tight">
          <AudioLines className="size-5 text-primary" /> LyricFlow
        </Link>
        <Link to="/upload" className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow">
          Upload a song
        </Link>
      </header>

      <article className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-8 sm:pb-24 sm:pt-14">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="size-4" aria-hidden /> LyricFlow home
        </Link>

        <header className="mt-8 max-w-3xl sm:mt-12">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">A guide to reading lyrics</p>
          <h1 className="mt-3 font-display text-4xl leading-tight tracking-[-0.05em] sm:text-6xl">
            Follow songs written in a script you don’t read.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Romanized lyrics write the words of a song phonetically in Latin letters. They help you follow pronunciation without replacing the original words with a translation.
          </p>
          <Link to="/upload" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            Try it with a song <ArrowRight className="size-4" aria-hidden />
          </Link>
        </header>

        <section aria-labelledby="difference-title" className="mt-10 rounded-3xl border border-glass-border bg-background/50 p-5 sm:mt-14 sm:p-8">
          <h2 id="difference-title" className="font-display text-2xl sm:text-3xl">Romanization is not translation</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
            Romanization approximates how the original words sound. Translation communicates their meaning in another language. Keep the original script, read the pronunciation, or show a translation under the lyrics.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-glass-border p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Original · Hindi</p>
              <p lang="hi" className="mt-2 font-display text-2xl">नमस्ते</p>
            </div>
            <div className="rounded-2xl border border-primary/30 bg-primary/[0.06] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary"><AudioLines className="size-3.5" aria-hidden /> Romanized</p>
              <p className="mt-2 font-display text-2xl">namaste</p>
            </div>
            <div className="rounded-2xl border border-glass-border p-4">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"><Languages className="size-3.5" aria-hidden /> English meaning</p>
              <p className="mt-2 font-display text-2xl">hello</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Pronunciation spellings can vary by dialect and transcription model. Review the generated lyrics before relying on them.</p>
        </section>

        <section aria-labelledby="steps-title" className="mt-12 sm:mt-16">
          <h2 id="steps-title" className="font-display text-2xl sm:text-3xl">How LyricFlow works</h2>
          <ol className="mt-5 space-y-4">
            <li className="rounded-2xl border border-glass-border bg-glass/35 p-4 sm:p-5">
              <h3 className="font-semibold">1. Upload a song</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Use an MP3, MP4, WAV, or M4A file up to 20 MB.</p>
            </li>
            <li className="rounded-2xl border border-glass-border bg-glass/35 p-4 sm:p-5">
              <h3 className="font-semibold">2. Review its transcript</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">AI transcription can miss words, especially in noisy or layered vocals. Edit the text and line timing in the lyric editor when needed.</p>
            </li>
            <li className="rounded-2xl border border-glass-border bg-glass/35 p-4 sm:p-5">
              <h3 className="font-semibold">3. Choose how to follow along</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Switch between the original script and romanization in the player. Request a translation when you want the meaning, too.</p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="timing-title" className="mt-12 border-t border-glass-border/70 pt-8 sm:mt-16 sm:pt-10">
          <h2 id="timing-title" className="font-display text-2xl sm:text-3xl">What to expect from lyric timing</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            Lyrics are timed by line. Word-by-word highlighting is available only when audio alignment is enabled and succeeds. Transcription and romanization are AI-generated, so check names, dialects, and fast or overlapping vocals in the editor.
          </p>
        </section>

        <section aria-labelledby="faq-title" className="mt-12 border-t border-glass-border/70 pt-8 sm:mt-16 sm:pt-10">
          <h2 id="faq-title" className="font-display text-2xl sm:text-3xl">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-glass-border/70">
            <details className="py-4">
              <summary className="cursor-pointer text-sm font-semibold sm:text-base">Does romanization translate the lyrics?</summary>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">No. It writes the original words phonetically in Latin letters. Translation is a separate option in the player.</p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer text-sm font-semibold sm:text-base">Can LyricFlow transcribe every language accurately?</summary>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">No transcription model is reliable for every song, language, accent, or mix. Review and edit the result before relying on it.</p>
            </details>
            <details className="py-4">
              <summary className="cursor-pointer text-sm font-semibold sm:text-base">Where are my uploaded songs stored?</summary>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Tracks and generated lyrics are stored with your LyricFlow library until deleted. The library is linked to this browser; download an access backup from the Library page before clearing site data or moving to another browser.</p>
            </details>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap items-center gap-4 border-t border-glass-border/70 pt-6">
          <Link to="/upload" className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow">
            Upload a song <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link to="/" className="text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">Back to LyricFlow</Link>
        </div>
      </article>
    </main>
  );
}
