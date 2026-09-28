import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, House, Languages, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AlbumArtwork } from "./AlbumArtwork";
import { LyricsDisplay } from "./LyricsDisplay";
import { PlayerControls } from "./PlayerControls";
import { ProgressBar } from "./ProgressBar";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { getDeviceId, setSongDuration } from "@/api/songs";
import { romanizeSavedSong } from "@/lib/ai-romanization";
import { translateSavedSong } from "@/lib/ai-translation";
import { languageName, TRANSLATION_LANGUAGES } from "@/lib/languages";
import type { Song } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";
import type { LyricsDisplayMode } from "./LyricLine";

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
  const [displayMode, setDisplayMode] = useState<LyricsDisplayMode>("dual");
  const [translationLoading, setTranslationLoading] = useState(false);
  const [romanizationLoading, setRomanizationLoading] = useState(false);

  useEffect(() => setPlayerLyrics(lyrics), [lyrics]);

  const duration = player.duration || song.duration;
  const sourceLanguage = playerLyrics?.language.split("-")[0]?.toLowerCase();
  const sameLanguage = sourceLanguage === translationLanguage.toLowerCase();
  const needsTranslation = Boolean(playerLyrics && !sameLanguage && playerLyrics.lines.some((line) => !line.translations?.[translationLanguage]?.trim()));
  const needsRomanization = Boolean(playerLyrics?.lines.some((line) => !line.romanization?.trim()));

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
      setDisplayMode((mode) => mode === "romanized" ? "romanized" : "dualRomanized");
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
        {playerLyrics && (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <label className="sr-only" htmlFor="translation-language">Translation language</label>
            <select
              id="translation-language"
              value={translationLanguage}
              onChange={(event) => setTranslationLanguage(event.target.value)}
              className="max-w-28 rounded-full border border-glass-border bg-glass px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:max-w-none"
            >
              {TRANSLATION_LANGUAGES.map((language) => <option key={language.code} value={language.code}>{language.name}</option>)}
            </select>
            <label className="sr-only" htmlFor="lyrics-display-mode">Lyrics display mode</label>
            <select
              id="lyrics-display-mode"
              value={displayMode}
              onChange={(event) => setDisplayMode(event.target.value as LyricsDisplayMode)}
              className="max-w-40 rounded-full border border-glass-border bg-glass px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:max-w-none"
            >
              <option value="dual">Dual · {languageName(translationLanguage)}</option>
              <option value="translated">{languageName(translationLanguage)} only</option>
              <option value="original">Original only</option>
              <option value="dualRomanized">Original + Romanized</option>
              <option value="romanized">Romanized only</option>
            </select>
            {needsTranslation && (
              <button
                type="button"
                onClick={translateLyrics}
                disabled={translationLoading}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {translationLoading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Languages className="size-3.5" aria-hidden />}
                {translationLoading ? "Translating…" : "Translate"}
              </button>
            )}
            {needsRomanization && (
              <button
                type="button"
                onClick={romanizeLyrics}
                disabled={romanizationLoading}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/50 bg-primary/10 px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 disabled:opacity-60"
              >
                {romanizationLoading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Languages className="size-3.5" aria-hidden />}
                {romanizationLoading ? "Writing sounds…" : "Romanize"}
              </button>
            )}
          </div>
        )}
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
        <section className="min-h-[52vh] flex-1 lg:h-[calc(100vh-13rem)]" aria-label="Synchronized lyrics">
          <LyricsDisplay
            lyrics={playerLyrics}
            subscribeTime={player.subscribeTime}
            onSeek={player.seek}
            translationLanguage={translationLanguage}
            displayMode={displayMode}
          />
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
