import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, AudioLines, House, Languages, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AlbumArtwork } from "./AlbumArtwork";
import { LyricsDisplay } from "./LyricsDisplay";
import { PlayerControls } from "./PlayerControls";
import { ProgressBar } from "./ProgressBar";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getDeviceId, setSongDuration } from "@/api/songs";
import { alignSavedSong } from "@/lib/ai-transcription";
import { romanizeSavedSong } from "@/lib/ai-romanization";
import { translateSavedSong } from "@/lib/ai-translation";
import { languageName, TRANSLATION_LANGUAGES } from "@/lib/languages";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import type { Song } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";
import type { LyricsScriptMode, TranslationDisplayMode } from "./LyricLine";

interface AudioPlayerProps {
  song: Song;
  lyrics: SyncedLyrics | null;
}

/** The full immersive player: artwork + metadata, live lyrics, transport. */
export function AudioPlayer({ song, lyrics }: AudioPlayerProps) {
  const player = useAudioPlayer(song.audioFileUrl || undefined);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playerLyrics, setPlayerLyrics] = useState(lyrics);
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [scriptMode, setScriptMode] = useState<LyricsScriptMode>("original");
  const [translationDisplay, setTranslationDisplay] = useState<TranslationDisplayMode>("dual");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [romanizationLoading, setRomanizationLoading] = useState(false);
  const [wordAlignmentLoading, setWordAlignmentLoading] = useState(false);

  useEffect(() => setPlayerLyrics(lyrics), [lyrics]);

  const duration = player.duration || song.duration;
  const sourceLanguage = playerLyrics?.language.split("-")[0]?.toLowerCase();
  const sameLanguage = sourceLanguage === translationLanguage.toLowerCase();
  const needsTranslation = Boolean(playerLyrics && !sameLanguage && playerLyrics.lines.some((line) => !line.translations?.[translationLanguage]?.trim()));
  const needsRomanization = Boolean(playerLyrics?.lines.some((line) => !line.romanization?.trim()));
  const needsWordAlignment = Boolean(playerLyrics?.lines.length && playerLyrics.wordTimingSource !== "audio-aligned");

  const alignWordTimings = async () => {
    if (!playerLyrics || wordAlignmentLoading) return;
    setWordAlignmentLoading(true);
    try {
      const result = await alignSavedSong(song.id, getDeviceId());
      setPlayerLyrics(result.lyrics);
      if (result.aligned) toast.success("Word timings aligned to the recording.");
      else if (result.reason === "not_configured") {
        toast.error("Word alignment isn't set up yet. Add ELEVENLABS_API_KEY to the app's server secrets.");
      } else {
        toast.error("The words couldn't be matched to this recording. Check the lyrics and try again.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Word alignment failed. Please try again.");
    } finally {
      setWordAlignmentLoading(false);
    }
  };

  const translateLyrics = async () => {
    if (!playerLyrics || translationLoading) return;
    setTranslationLoading(true);
    try {
      const translations = await translateSavedSong(song.id, getDeviceId(), translationLanguage);
      setPlayerLyrics((current) => current ? {
        ...current,
        lines: current.lines.map((line) => ({
          ...line,
          translations: {
            ...line.translations,
            ...(translations[line.id] ? { [translationLanguage]: translations[line.id] } : {}),
          },
        })),
      } : current);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Translation failed. Please try again.");
    } finally {
      setTranslationLoading(false);
    }
  };

  const romanizeLyrics = async () => {
    if (!playerLyrics || romanizationLoading) return;
    setRomanizationLoading(true);
    try {
      const romanizations = await romanizeSavedSong(song.id, getDeviceId());
      setPlayerLyrics((current) => current ? {
        ...current,
        lines: current.lines.map((line) => ({
          ...line,
          ...(romanizations[line.id] ? { romanization: romanizations[line.id] } : {}),
        })),
      } : current);
      setScriptMode("romanized");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Romanization failed. Please try again.");
    } finally {
      setRomanizationLoading(false);
    }
  };

  useEffect(() => {
    if (player.duration) void setSongDuration(song.id, player.duration);
  }, [player.duration, song.id]);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shellRef.current?.requestFullscreen?.();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") {
        e.preventDefault();
        player.toggle();
      }
      if (e.code === "ArrowRight") player.skip(5);
      if (e.code === "ArrowLeft") player.skip(-5);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [player]);

  return (
    <div ref={shellRef} className="bg-stage relative flex min-h-screen flex-col bg-background">
      <audio ref={player.attach} {...player.audioProps} className="hidden" />

      <header className="mx-auto flex w-full max-w-6xl items-center gap-2 px-5 pt-5 sm:px-8">
        <Link
          to="/library"
          className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Library
        </Link>
        <Link
          to="/"
          aria-label="Home"
          className="inline-flex items-center justify-center rounded-full border border-glass-border bg-glass p-2.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <House className="size-4" aria-hidden />
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 pb-40 pt-6 sm:px-8 lg:flex-row lg:gap-14 lg:pb-44">
        {/* Artwork + metadata */}
        <aside className="lg:sticky lg:top-16 lg:h-fit lg:w-[300px] lg:shrink-0 xl:w-[340px]">
          <div className="mx-auto flex max-w-[220px] flex-col items-center gap-5 sm:max-w-[260px] lg:mx-0 lg:max-w-none lg:items-start">
            <AlbumArtwork
              title={song.title}
              coverImageUrl={song.coverImageUrl}
              isPlaying={player.isPlaying}
              className={player.isPlaying ? "animate-float-slow" : undefined}
            />
            <div className="w-full text-center lg:text-left">
              <h1 className="truncate font-display text-xl font-semibold sm:text-2xl">{song.title}</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{song.artist}</p>
              <p className="mt-3 text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground/70">
                {playerLyrics ? `${playerLyrics.lines.length} lines • ${playerLyrics.language}` : "Instrumental"}
              </p>
            </div>
          </div>
        </aside>

        {/* Live lyrics */}
        <section className="flex min-h-[62vh] flex-1 flex-col gap-3 lg:h-[calc(100vh-13rem)] lg:min-h-[520px]" aria-label="Synchronized lyrics">
          {playerLyrics && (
            <div className="rounded-3xl border border-glass-border/80 bg-background/45 p-4 shadow-lift backdrop-blur-2xl sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
                    <AudioLines className="size-3.5" aria-hidden /> Live lyrics
                  </p>
                  <h2 className="mt-1 font-display text-xl">Choose how lyrics appear</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Keep the original script or read the same words phonetically.</p>
                </div>
                <span className="rounded-full border border-glass-border bg-glass px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {languageName(playerLyrics.language.split("-")[0] ?? playerLyrics.language)} · {playerLyrics.lines.length} lines
                </span>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-glass-border/60 pt-3">
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground" title="Only audio-aligned timings are used for word-by-word highlighting.">
                  {playerLyrics.wordTimingSource === "audio-aligned" ? "Word timing · audio aligned" : "Line timing · word sync unavailable"}
                </span>
                {needsWordAlignment && (
                  <button
                    type="button"
                    onClick={alignWordTimings}
                    disabled={wordAlignmentLoading}
                    className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.08] px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.15] disabled:opacity-60"
                  >
                    {wordAlignmentLoading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <AudioLines className="size-3.5" aria-hidden />}
                    {wordAlignmentLoading ? "Aligning words…" : "Align words to audio"}
                  </button>
                )}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5" role="group" aria-label="Lyric script">
                <button
                  type="button"
                  aria-pressed={scriptMode === "original"}
                  onClick={() => setScriptMode("original")}
                  className={`rounded-2xl border p-3 text-left transition-all duration-200 sm:p-4 ${scriptMode === "original" ? "border-primary/55 bg-primary/[0.09] shadow-glow" : "border-glass-border bg-glass/50 hover:border-primary/30 hover:bg-glass"}`}
                >
                  <span className="flex items-center gap-2 font-display text-base sm:text-lg"><AudioLines className="size-4 text-primary" aria-hidden /> Original script</span>
                  <span className="mt-1 block pl-6 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">As written in the song’s language</span>
                </button>
                <button
                  type="button"
                  aria-pressed={scriptMode === "romanized"}
                  onClick={() => setScriptMode("romanized")}
                  className={`rounded-2xl border p-3 text-left transition-all duration-200 sm:p-4 ${scriptMode === "romanized" ? "border-primary/55 bg-primary/[0.09] shadow-glow" : "border-glass-border bg-glass/50 hover:border-primary/30 hover:bg-glass"}`}
                >
                  <span className="flex items-center gap-2 font-display text-base sm:text-lg"><Languages className="size-4 text-primary" aria-hidden /> Romanized</span>
                  <span className="mt-1 block pl-6 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">Same words, written by sound</span>
                </button>
              </div>

              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-2xl border border-glass-border/70 bg-background/35 p-3">
                  <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Translation language</span>
                  <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
                    <SelectTrigger aria-label="Translation language" className="h-10 rounded-xl border-glass-border bg-glass text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRANSLATION_LANGUAGES.map((language) => <SelectItem key={language.code} value={language.code}>{language.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-2xl border border-glass-border/70 bg-background/35 p-3">
                  <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Translation subtitles</span>
                  <Select value={translationDisplay} onValueChange={(value) => setTranslationDisplay(value as TranslationDisplayMode)}>
                    <SelectTrigger aria-label="Translation subtitle display" className="h-10 rounded-xl border-glass-border bg-glass text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dual">Show under lyrics</SelectItem>
                      <SelectItem value="translated">Translation only</SelectItem>
                      <SelectItem value="hidden">Hide translation</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {(needsRomanization || needsTranslation) && (
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  {needsRomanization && (
                    <button type="button" onClick={romanizeLyrics} disabled={romanizationLoading} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.08] px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/[0.15] disabled:opacity-60">
                      {romanizationLoading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Languages className="size-3.5" aria-hidden />}
                      {romanizationLoading ? "Writing pronunciations…" : "Create romanized lyrics"}
                    </button>
                  )}
                  {needsTranslation && (
                    <button type="button" onClick={translateLyrics} disabled={translationLoading} className="inline-flex items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60">
                      {translationLoading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Languages className="size-3.5" aria-hidden />}
                      {translationLoading ? "Translating…" : `Translate to ${languageName(translationLanguage)}`}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="relative min-h-[40vh] flex-1 overflow-hidden rounded-3xl border border-glass-border/80 bg-foreground/[0.035] shadow-lift backdrop-blur-2xl lg:min-h-0">
            <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,oklch(0.82_0.145_78/0.08),transparent_52%)]" />
            <div className="relative h-full min-h-[40vh] px-3 sm:px-5 lg:min-h-0">
              <LyricsDisplay
                lyrics={playerLyrics}
                subscribeTime={player.subscribeTime}
                onSeek={player.seek}
                translationLanguage={translationLanguage}
                scriptMode={scriptMode}
                translationDisplay={translationDisplay}
              />
            </div>
          </div>
        </section>
      </div>

      {/* Transport */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-glass-border bg-background/70 backdrop-blur-2xl">
        <div className="mx-auto w-full max-w-4xl px-5 pb-5 pt-3 sm:px-8">
          <ProgressBar duration={duration} subscribeTime={player.subscribeTime} onSeek={player.seek} />
          <div className="mt-1">
            <PlayerControls
              isPlaying={player.isPlaying}
              volume={player.volume}
              isMuted={player.isMuted}
              isFullscreen={isFullscreen}
              onToggle={player.toggle}
              onPrevious={() => player.seek(0)}
              onNext={() => player.seek(duration)}
              onVolumeChange={player.setVolume}
              onToggleMute={player.toggleMute}
              onToggleFullscreen={toggleFullscreen}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
