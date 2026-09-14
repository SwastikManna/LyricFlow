import { useCallback, useEffect, useRef, useState } from "react";

export interface AudioPlayerState {
  isPlaying: boolean;
  duration: number;
  volume: number;
  isMuted: boolean;
  isReady: boolean;
}

/**
 * Owns a real HTML5 <audio> element.
 *
 * `currentTime` is intentionally NOT React state — it is exposed through a ref
 * plus a subscription so consumers (progress bar, lyric sync) can read the
 * clock at animation-frame rate without re-rendering the whole player tree.
 */
export function useAudioPlayer(src: string | undefined) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTimeRef = useRef(0);
  const listenersRef = useRef(new Set<(time: number) => void>());
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    duration: 0,
    volume: 0.9,
    isMuted: false,
    isReady: false,
  });

  const subscribeTime = useCallback((listener: (time: number) => void) => {
    listenersRef.current.add(listener);
    listener(currentTimeRef.current);
    return () => {
      listenersRef.current.delete(listener);
    };
  }, []);

  const emit = useCallback((time: number) => {
    currentTimeRef.current = time;
    listenersRef.current.forEach((l) => l(time));
  }, []);

  // Animation-frame clock while playing (smoother than 'timeupdate').
  useEffect(() => {
    if (!state.isPlaying) return;
    const tick = () => {
      const el = audioRef.current;
      if (el) emit(el.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state.isPlaying, emit]);

  const attach = useCallback(
    (el: HTMLAudioElement | null) => {
      audioRef.current = el;
      if (el) el.volume = state.isMuted ? 0 : state.volume;
    },
    [state.isMuted, state.volume],
  );

  const play = useCallback(() => {
    audioRef.current?.play().catch(() => setState((s) => ({ ...s, isPlaying: false })));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) play();
    else pause();
  }, [play, pause]);

  const seek = useCallback(
    (time: number) => {
      const el = audioRef.current;
      if (!el) return;
      const clamped = Math.max(0, Math.min(time, el.duration || 0));
      el.currentTime = clamped;
      emit(clamped);
    },
    [emit],
  );

  const skip = useCallback(
    (delta: number) => seek(currentTimeRef.current + delta),
    [seek],
  );

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    if (audioRef.current) audioRef.current.volume = clamped;
    setState((s) => ({ ...s, volume: clamped, isMuted: clamped === 0 }));
  }, []);

  const toggleMute = useCallback(() => {
    setState((s) => {
      const isMuted = !s.isMuted;
      if (audioRef.current) audioRef.current.volume = isMuted ? 0 : s.volume || 0.9;
      return { ...s, isMuted };
    });
  }, []);

  // Event handlers wired onto the element by the consumer component.
  const audioProps = {
    src,
    preload: "metadata" as const,
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      const el = e.currentTarget;
      setState((s) => ({ ...s, duration: el.duration || 0, isReady: true }));
    },
    onPlay: () => setState((s) => ({ ...s, isPlaying: true })),
    onPause: () => setState((s) => ({ ...s, isPlaying: false })),
    onEnded: () => setState((s) => ({ ...s, isPlaying: false })),
    onSeeked: (e: React.SyntheticEvent<HTMLAudioElement>) => emit(e.currentTarget.currentTime),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLAudioElement>) => {
      // Fallback clock for paused/background states.
      if (!state.isPlaying) emit(e.currentTarget.currentTime);
    },
  };

  return {
    ...state,
    attach,
    audioProps,
    currentTimeRef,
    subscribeTime,
    play,
    pause,
    toggle,
    seek,
    skip,
    setVolume,
    toggleMute,
  };
}

export type AudioPlayerApi = ReturnType<typeof useAudioPlayer>;

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
