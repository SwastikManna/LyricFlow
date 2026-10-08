import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, AudioLines, ChevronDown, House, Languages, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AmbientGlow } from "./AmbientGlow";
import { AlbumArtwork } from "./AlbumArtwork";
import { LyricsDisplay } from "./LyricsDisplay";
import { LyricExportMenu } from "./LyricExportMenu";
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
        lines: current.lines.map((line) => {
          const translation = translations[line.id];
          return translation
            ? { ...line, translations: { ...line.translations, [translationLanguage]: translation } }
            : line;
        }),
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
      if (
        e.target instanceof HTMLElement &&
        (e.target.isContentEditable || e.target.closest("input, textarea, select, button, [role='slider']"))
      ) return;
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

  const lyricsControls = playerLyrics && (
    <div className={`border border-glass-border/80 bg-background/45 backdrop-blur-2xl ${isFullscreen ? "rounded-2xl p-3" : "rounded-3xl p-4 shadow-lift sm:p-5"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <AudioLines className="size-3.5" aria-hidden /> Live lyrics
          </p>
          <h2 className={`mt-1 font-display ${isFullscreen ? "text-base sm:text-lg" : "text-xl"}`}>{isFullscreen ? "Lyric display" : "Choose how lyrics appear"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {isFullscreen ? "Choose the script and subtitle language." : "Keep the original script or read the same words phonetically."}
          </p>
        </div>
        <span className="rounded-full border border-glass-border bg-glass px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
          {languageName(playerLyrics.language.split("-")[0] ?? playerLyrics.language)} · {playerLyrics.lines.length} lines
        </span>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-glass-border/60 pt-3">
        <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground" title="Only audio-aligned timings are used for word-by-word highlighting.">
          {playerLyrics.wordTimingSource === "audio-aligned" ? "Word-by-word timing · audio aligned" : "Line timing · word-by-word sync not set"}
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

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Lyric script">
        <button
          type="button"
          aria-pressed={scriptMode === "original"}
          onClick={() => setScriptMode("original")}
          className={`rounded-2xl border text-left transition-all duration-200 ${isFullscreen ? "p-2.5" : "p-3 sm:p-4"} ${scriptMode === "original" ? "border-primary/55 bg-primary/[0.09] shadow-glow" : "border-glass-border bg-glass/50 hover:border-primary/30 hover:bg-glass"}`}
        >
          <span className={`flex items-center gap-2 font-display ${isFullscreen ? "text-sm lg:text-base" : "text-base sm:text-lg"}`}><AudioLines className="size-4 text-primary" aria-hidden /> Original script</span>
          {!isFullscreen && <span className="mt-1 block pl-6 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">As written in the song’s language</span>}
        </button>
        <button
          type="button"
          aria-pressed={scriptMode === "romanized"}
          onClick={() => setScriptMode("romanized")}
          className={`rounded-2xl border text-left transition-all duration-200 ${isFullscreen ? "p-2.5" : "p-3 sm:p-4"} ${scriptMode === "romanized" ? "border-primary/55 bg-primary/[0.09] shadow-glow" : "border-glass-border bg-glass/50 hover:border-primary/30 hover:bg-glass"}`}
        >
          <span className={`flex items-center gap-2 font-display ${isFullscreen ? "text-sm lg:text-base" : "text-base sm:text-lg"}`}><Languages className="size-4 text-primary" aria-hidden /> Romanized</span>
          {!isFullscreen && <span className="mt-1 block pl-6 text-[10px] leading-relaxed text-muted-foreground sm:text-xs">Same words, written by sound</span>}
        </button>
      </div>

      {needsRomanization && (
        <div className="mt-3">
          <button type="button" onClick={romanizeLyrics} disabled={romanizationLoading} className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/[0.08] px-3 py-2 text-sm font-semibold text-primary transition-colors hover:bg-primary/[0.15] disabled:opacity-60">
            {romanizationLoading ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden /> : <Languages className="size-3.5" aria-hidden />}
            {romanizationLoading ? "Writing pronunciations…" : "Create romanized lyrics"}
          </button>
        </div>
      )}

      <details className="group mt-3 rounded-2xl border border-glass-border/70 bg-background/25">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><Languages className="size-4 text-primary" aria-hidden /> Translation options</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className={`grid gap-2.5 border-t border-glass-border/60 p-3 ${isFullscreen ? "grid-cols-1 lg:grid-cols-2" : "sm:grid-cols-2"}`}>
          <div className="rounded-xl border border-glass-border/70 bg-background/35 p-2.5">
            <label htmlFor="player-translation-language" className="mb-1.5 block text-xs font-medium text-muted-foreground">Translation language</label>
            <Select value={translationLanguage} onValueChange={setTranslationLanguage}>
              <SelectTrigger id="player-translation-language" aria-label="Translation language" className="h-10 rounded-xl border-glass-border bg-glass text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSLATION_LANGUAGES.map((language) => <SelectItem key={language.code} value={language.code}>{language.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="rounded-xl border border-glass-border/70 bg-background/35 p-2.5">
            <label htmlFor="player-translation-display" className="mb-1.5 block text-xs font-medium text-muted-foreground">Subtitle display</label>
            <Select value={translationDisplay} onValueChange={(value) => setTranslationDisplay(value as TranslationDisplayMode)}>
              <SelectTrigger id="player-translation-display" aria-label="Translation subtitle display" className="h-10 rounded-xl border-glass-border bg-glass text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dual">Show under lyrics</SelectItem>
                <SelectItem value="translated">Translation only</SelectItem>
                <SelectItem value="hidden">Hide translation</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {needsTranslation && (
            <button type="button" onClick={translateLyrics} disabled={translationLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 disabled:opacity-60 sm:col-span-2 sm:justify-self-start">
              {translationLoading ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Languages className="size-4" aria-hidden />}
              {translationLoading ? "Translating…" : `Translate to ${languageName(translationLanguage)}`}
            </button>
          )}
        </div>
      </details>
    </div>
  );

  return (
    <div ref={shellRef} className={`bg-stage relative flex flex-col bg-background ${isFullscreen ? "h-dvh min-h-0 overflow-hidden" : "min-h-screen"}`}>
      <audio ref={player.attach} {...player.audioProps} className="hidden" />

      <header className={`mx-auto flex w-full items-center gap-2 px-4 pt-4 sm:px-8 sm:pt-5 ${isFullscreen ? "max-w-[1600px] flex-none pt-3 sm:pt-3" : "max-w-6xl"}`}>
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
        {playerLyrics && playerLyrics.lines.length > 0 && (
          <div className="ml-auto">
            <LyricExportMenu
              meta={{ title: song.title, artist: song.artist, duration }}
              lyrics={playerLyrics}
              translationLanguage={translationLanguage}
              label="Export"
              className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            />
          </div>
        )}
      </header>

      <div className={`mx-auto flex w-full flex-1 px-4 sm:px-8 ${isFullscreen ? "min-h-0 max-w-[1600px] flex-col gap-3 overflow-hidden pb-32 pt-3 md:flex-row md:gap-4 lg:gap-5" : "max-w-6xl flex-col gap-5 pb-32 pt-4 sm:gap-6 sm:pb-40 sm:pt-6 lg:flex-row lg:gap-14 lg:pb-44"}`}>
        {/* Artwork + metadata */}
        <aside className={isFullscreen ? "flex min-h-0 w-full shrink-0 flex-col gap-3 overflow-y-auto pr-1 md:w-[280px] lg:w-[360px]" : "lg:sticky lg:top-16 lg:h-fit lg:w-[300px] lg:shrink-0 xl:w-[340px]"}>
          {isFullscreen && (
            <div className="flex items-center gap-3 lg:hidden">
              <div className="size-11 shrink-0 overflow-hidden rounded-xl sm:size-12">
                <AlbumArtwork title={song.title} coverImageUrl={song.coverImageUrl} isPlaying={player.isPlaying} className="rounded-xl border-0 shadow-none [&_svg]:size-6" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate font-display text-base font-semibold sm:text-lg">{song.title}</h1>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{song.artist} · {playerLyrics?.language ?? "Instrumental"}</p>
              </div>
            </div>
          )}
          <div className={isFullscreen ? "mx-auto hidden w-full max-w-[200px] flex-col items-center gap-2.5 lg:mx-0 lg:flex lg:items-start" : "mx-auto flex max-w-[220px] flex-col items-center gap-5 sm:max-w-[260px] lg:mx-0 lg:max-w-none lg:items-start"}>
            <AlbumArtwork
              title={song.title}
              coverImageUrl={song.coverImageUrl}
              isPlaying={player.isPlaying}
              className={player.isPlaying ? "animate-float-slow" : undefined}
            />
            <div className={`w-full ${isFullscreen ? "text-left" : "text-center lg:text-left"}`}>
              <h1 className={`truncate font-display font-semibold ${isFullscreen ? "text-lg" : "text-xl sm:text-2xl"}`}>{song.title}</h1>
              <p className="mt-1 truncate text-sm text-muted-foreground">{song.artist}</p>
              <p className={`text-[0.7rem] uppercase tracking-[0.25em] text-muted-foreground/70 ${isFullscreen ? "mt-1.5" : "mt-3"}`}>
                {playerLyrics ? `${playerLyrics.lines.length} lines • ${playerLyrics.language}` : "Instrumental"}
              </p>
            </div>
          </div>
          {lyricsControls}
        </aside>

        {/* Live lyrics */}
        <section className={`flex flex-1 flex-col gap-3 ${isFullscreen ? "min-h-0 md:h-full" : "min-h-[55vh] lg:h-[calc(100vh-13rem)] lg:min-h-[520px]"}`} aria-label="Synchronized lyrics">
          <div className={`relative flex-1 overflow-hidden rounded-3xl border border-glass-border/80 bg-foreground/[0.035] shadow-lift backdrop-blur-2xl ${isFullscreen ? "min-h-0" : "min-h-[40vh] lg:min-h-0"}`}>
            <AmbientGlow audio={player.audioEl} isPlaying={player.isPlaying} />
            <div className={`relative h-full px-3 sm:px-5 ${isFullscreen ? "min-h-0" : "min-h-[40vh] lg:min-h-0"}`}>
              <LyricsDisplay
                lyrics={playerLyrics}
                subscribeTime={player.subscribeTime}
                onSeek={player.seek}
                translationLanguage={translationLanguage}
                scriptMode={scriptMode}
                translationDisplay={translationDisplay}
                isFullscreen={isFullscreen}
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
