import { useEffect, useRef } from "react";

interface AmbientGlowProps {
  audio: HTMLAudioElement | null;
  isPlaying: boolean;
}

// An <audio> element can only be wired into Web Audio once, so cache it.
const graphs = new WeakMap<HTMLAudioElement, { ctx: AudioContext; analyser: AnalyserNode }>();

function getGraph(el: HTMLAudioElement) {
  const cached = graphs.get(el);
  if (cached) return cached;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaElementSource(el);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;
  source.connect(analyser);
  analyser.connect(ctx.destination);
  const graph = { ctx, analyser };
  graphs.set(el, graph);
  return graph;
}

/** Soft aura behind the lyrics that breathes with the music's bass and mids. */
export function AmbientGlow({ audio, isPlaying }: AmbientGlowProps) {
  const warmRef = useRef<HTMLDivElement | null>(null);
  const coolRef = useRef<HTMLDivElement | null>(null);
  const energy = useRef({ bass: 0, mid: 0 });

  useEffect(() => {
    if (!isPlaying || !audio) return;
    let analyser: AnalyserNode | null = null;
    try {
      const graph = getGraph(audio);
      if (graph.ctx.state === "suspended") void graph.ctx.resume();
      analyser = graph.analyser;
    } catch {
      analyser = null; // fall back to a gentle breathing pulse
    }
    const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();

    const tick = (now: number) => {
      let bass: number;
      let mid: number;
      if (analyser && bins) {
        analyser.getByteFrequencyData(bins);
        let b = 0, m = 0;
        for (let i = 1; i < 8; i++) b += bins[i] ?? 0;
        for (let i = 8; i < 48; i++) m += bins[i] ?? 0;
        bass = b / (7 * 255);
        mid = m / (40 * 255);
      } else {
        const t = (now - t0) / 1000;
        bass = 0.35 + 0.25 * Math.sin(t * 2.2);
        mid = 0.3 + 0.2 * Math.sin(t * 1.3 + 1);
      }
      const e = energy.current;
      e.bass += (bass - e.bass) * 0.2;
      e.mid += (mid - e.mid) * 0.12;
      const k = reduced ? 0.3 : 1;
      if (warmRef.current) {
        warmRef.current.style.opacity = String(0.35 + e.bass * 0.65 * k);
        warmRef.current.style.transform = `scale(${1 + e.bass * 0.35 * k})`;
      }
      if (coolRef.current) {
        coolRef.current.style.opacity = String(0.25 + e.mid * 0.7 * k);
        coolRef.current.style.transform = `scale(${1 + e.mid * 0.3 * k}) translateY(${-e.mid * 20 * k}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [audio, isPlaying]);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={warmRef}
        className="absolute -left-1/4 -top-1/4 h-[90%] w-[90%] rounded-full opacity-40 blur-3xl transition-opacity duration-700 will-change-transform"
        style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--primary) 22%, transparent), transparent 65%)" }}
      />
      <div
        ref={coolRef}
        className="absolute -bottom-1/4 -right-1/4 h-[90%] w-[90%] rounded-full opacity-30 blur-3xl transition-opacity duration-700 will-change-transform"
        style={{ background: "radial-gradient(circle, color-mix(in oklch, var(--accent) 20%, transparent), transparent 65%)" }}
      />
    </div>
  );
}
