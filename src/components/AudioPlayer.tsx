import { useCallback, useEffect, useRef, useState } from "react";
import { AlbumArtwork } from "./AlbumArtwork";
import { LyricsDisplay } from "./LyricsDisplay";
import { PlayerControls } from "./PlayerControls";
import { ProgressBar } from "./ProgressBar";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { setSongDuration } from "@/api/songs";
import type { Song } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";

interface AudioPlayerProps {
  song: Song;
  lyrics: SyncedLyrics | null;
}

/** The full immersive player: artwork + metadata, live lyrics, transport. */
export function AudioPlayer({ song, lyrics }: AudioPlayerProps) {
  const player = useAudioPlayer(song.audioFileUrl || undefined);
  const shellRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const duration = player.duration || song.duration;

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

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-5 pb-40 pt-8 sm:px-8 lg:flex-row lg:gap-14 lg:pb-44">
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
                {lyrics ? `${lyrics.lines.length} lines • ${lyrics.language}` : "Instrumental"}
              </p>
            </div>
          </div>
        </aside>

        {/* Live lyrics */}
        <section className="min-h-[52vh] flex-1 lg:h-[calc(100vh-13rem)]" aria-label="Synchronized lyrics">
          <LyricsDisplay
            lyrics={lyrics}
            subscribeTime={player.subscribeTime}
            onSeek={player.seek}
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
