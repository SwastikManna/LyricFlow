import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, AudioLines, Disc3, Pause, Play } from "lucide-react";
import { getSongWithLyrics } from "@/api/songs";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useLyricsSync } from "@/hooks/useLyricsSync";
import { LyricsPreview } from "@/components/LyricsPreview";
import { ProgressBar } from "@/components/ProgressBar";
import type { LibrarySong } from "@/lib/songs.functions";
import type { Song } from "@/types/song";
import type { SyncedLyrics } from "@/types/lyrics";

interface LatestSongMiniPlayerProps {
  song: LibrarySong | null;
  loading?: boolean;
  unavailable?: boolean;
}

type LyricScript = "original" | "romanized";

export function LatestSongMiniPlayer({ song, loading = false, unavailable = false }: LatestSongMiniPlayerProps) {
  const [track, setTrack] = useState<{ song: Song; lyrics: SyncedLyrics | null } | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [script, setScript] = useState<LyricScript>("original");
  const player = useAudioPlayer(track?.song.audioFileUrl || undefined);
  const lyrics = track?.lyrics ?? null;
  const { activeIndex } = useLyricsSync({ lyrics, subscribeTime: player.subscribeTime });

  useEffect(() => {
    let cancelled = false;
    setTrack(null);
    setLoadFailed(false);
    setScript("original");
    player.pause();

    if (!song) return () => { cancelled = true; };

    getSongWithLyrics(song.id)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setLoadFailed(true);
          return;
        }
        setTrack({ song: result.song, lyrics: result.lyrics?.synchronizedLyrics ?? null });
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      player.pause();
    };
  }, [song?.id, player.pause]);

  const lines = lyrics?.lines ?? [];
  const hasRomanization = lines.some((line) => Boolean(line.romanization?.trim()));
  const focusedIndex = activeIndex >= 0 ? activeIndex : 0;
  const firstVisibleIndex = Math.max(0, Math.min(lines.length - 3, focusedIndex - 1));
  const visibleLines = lines.slice(firstVisibleIndex, firstVisibleIndex + 3);
  const duration = player.duration || track?.song.duration || song?.duration || 0;
  const playerPath = song?.processingStatus === "READY" ? "/player/$songId" : "/processing/$songId";

  return (
    <div className="animate-lyric-float relative w-full max-w-[480px]">
      <div className="glass-panel relative overflow-hidden rounded-[1.5rem] p-4 shadow-lift sm:rounded-[2rem] sm:p-9">
        <div className="pointer-events-none absolute -right-16 -top-20 size-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex items-center justify-between gap-3 border-b border-glass-border/80 pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/25 bg-primary/10 text-primary"><AudioLines className="size-3.5" /></span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary sm:text-xs">
                {song ? "Live lyrics" : "Lyric preview"}
              </p>
              <p className="mt-1 truncate text-[11px] text-muted-foreground sm:text-xs">
                {song ? `${song.title} · ${song.artist}` : unavailable ? "Your archive is unavailable" : loading ? "Loading your archive…" : "Sample lyrics · no audio"}
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-2 font-mono-ui text-[9px] uppercase tracking-[0.14em] text-foreground/40">
            <span className={`size-1.5 rounded-full ${player.isPlaying ? "animate-signal-pulse bg-primary" : "bg-foreground/30"}`} />
            {player.isPlaying ? "Playing" : track ? "Ready" : song || loading ? "Loading" : unavailable ? "Unavailable" : "Sample"}
          </span>
        </div>

        {song ? (
          <>
            <div className="relative mt-3 flex items-center justify-between gap-3">
              <span className="font-mono-ui text-[9px] uppercase tracking-[0.12em] text-muted-foreground/70 sm:text-[10px] sm:tracking-[0.16em]">
                {lyrics ? `${lyrics.language} · ${lines.length} lines` : song.processingStatus === "READY" ? "Lyrics unavailable" : "Lyrics are being prepared"}
              </span>
              <div className="flex rounded-full border border-glass-border bg-background/45 p-0.5" role="group" aria-label="Lyric script">
                <button
                  type="button"
                  aria-pressed={script === "original"}
                  onClick={() => setScript("original")}
                  className={`rounded-full px-2 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.08em] transition-colors sm:px-2.5 sm:text-[10px] sm:tracking-[0.12em] ${script === "original" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >Original</button>
                <button
                  type="button"
                  aria-pressed={script === "romanized"}
                  onClick={() => setScript("romanized")}
                  disabled={!hasRomanization}
                  title={hasRomanization ? "Show romanized lyrics" : "Romanized lyrics are not available yet"}
                  className={`rounded-full px-2 py-1.5 font-mono-ui text-[9px] uppercase tracking-[0.08em] transition-colors disabled:cursor-not-allowed disabled:opacity-35 sm:px-2.5 sm:text-[10px] sm:tracking-[0.12em] ${script === "romanized" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >Romanized</button>
              </div>
            </div>

            <div className="relative mt-4 min-h-[164px] overflow-hidden py-1 sm:min-h-[206px]" aria-live="polite">
              {visibleLines.length > 0 ? visibleLines.map((line, index) => {
                const lineIndex = firstVisibleIndex + index;
                const isActive = lineIndex === focusedIndex;
                const text = script === "romanized" ? line.romanization?.trim() || line.text : line.text;
                return (
                  <button
                    key={line.id}
                    type="button"
                    onClick={() => player.seek(line.start)}
                    className={`block w-full py-2 text-left font-display leading-tight transition-all duration-500 ${isActive ? "scale-[1.02] text-xl text-foreground sm:text-3xl" : "text-lg text-foreground/25 sm:text-2xl"}`}
                    style={{ transformOrigin: "left center" }}
                    aria-current={isActive ? "true" : undefined}
                  >
                    {text}
                  </button>
                );
              }) : loadFailed ? (
                <p className="flex min-h-[164px] items-center text-sm text-muted-foreground">This track could not be loaded. Try opening it from your library.</p>
              ) : track ? (
                <p className="flex min-h-[164px] items-center text-sm text-muted-foreground">Lyrics will appear here when they are ready.</p>
              ) : (
                <p className="flex min-h-[164px] items-center text-sm text-muted-foreground">Loading your latest song…</p>
              )}
            </div>

            <div className="relative mt-2">
              <ProgressBar duration={duration} subscribeTime={player.subscribeTime} onSeek={player.seek} disabled={!track?.song.audioFileUrl} />
            </div>
            <audio ref={player.attach} {...player.audioProps} preload="none" className="hidden" />
          </>
        ) : (
          <div className="relative mt-5">
            <LyricsPreview />
          </div>
        )}
      </div>

      {song ? (
        <div className="absolute -bottom-5 -left-3 inline-flex items-center gap-3 rounded-full border border-glass-border bg-card/90 px-3 py-2 shadow-lg backdrop-blur-xl sm:-left-5">
          <button
            type="button"
            onClick={player.toggle}
            disabled={!track?.song.audioFileUrl}
            aria-label={player.isPlaying ? `Pause ${song.title}` : `Play ${song.title}`}
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50"
          >
            {player.isPlaying ? <Pause className="size-3.5 fill-current" /> : <Play className="ml-0.5 size-3.5 fill-current" />}
          </button>
          <span className="font-mono-ui text-[8px] uppercase tracking-[0.14em] text-foreground/55">
            {player.isPlaying ? "Now playing" : "Play your latest song"}
          </span>
          <Link to={playerPath} params={{ songId: song.id }} aria-label="Open full player" className="inline-flex size-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-primary">
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : loading || unavailable ? (
        <div className="absolute -bottom-5 -left-3 inline-flex items-center gap-3 rounded-full border border-glass-border bg-card/90 px-4 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.17em] text-foreground/55 shadow-lg backdrop-blur-xl sm:-left-5" role="status">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/15 text-primary"><Disc3 className="size-3" /></span>
          {loading ? "Loading your archive" : "Archive unavailable"}
        </div>
      ) : (
        <Link to="/upload" className="absolute -bottom-5 -left-3 inline-flex items-center gap-3 rounded-full border border-glass-border bg-card/90 px-4 py-2.5 font-mono-ui text-[9px] uppercase tracking-[0.17em] text-foreground/55 shadow-lg backdrop-blur-xl transition-colors hover:text-foreground sm:-left-5">
          <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground"><Disc3 className="size-3" /></span>
          Upload a song
        </Link>
      )}
    </div>
  );
}
