/**
 * One Web Audio graph per <audio> element (an element can only be wired once).
 *
 * source ─┬─ dry ───────────────────────────────┐
 *         └─ split L/R → (L − R) + low bass → wet ┴→ analyser → speakers
 *
 * Vocals are usually mixed in the centre, so L − R removes most of them;
 * the low band is added back so the beat keeps its weight.
 */
export interface AudioGraph {
  ctx: AudioContext;
  analyser: AnalyserNode;
  /** 1 = original mix, 0 = vocals removed as far as possible. */
  setVocalLevel: (level: number) => void;
}

const graphs = new WeakMap<HTMLAudioElement, AudioGraph>();

export function getAudioGraph(el: HTMLAudioElement): AudioGraph {
  const cached = graphs.get(el);
  if (cached) return cached;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  const source = ctx.createMediaElementSource(el);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.82;

  const dry = ctx.createGain();
  const wet = ctx.createGain();
  wet.gain.value = 0;
  source.connect(dry).connect(analyser);

  const splitter = ctx.createChannelSplitter(2);
  const left = ctx.createGain();
  const right = ctx.createGain();
  right.gain.value = -1;
  const diff = ctx.createGain();
  source.connect(splitter);
  splitter.connect(left, 0);
  splitter.connect(right, 1);
  left.connect(diff);
  right.connect(diff);
  diff.connect(wet);

  const bass = ctx.createBiquadFilter();
  bass.type = "lowpass";
  bass.frequency.value = 150;
  const bassGain = ctx.createGain();
  bassGain.gain.value = 0.5;
  source.connect(bass).connect(bassGain).connect(wet);

  wet.connect(analyser);
  analyser.connect(ctx.destination);

  const graph: AudioGraph = {
    ctx,
    analyser,
    setVocalLevel: (level) => {
      const v = Math.min(1, Math.max(0, level));
      const t = ctx.currentTime;
      dry.gain.setTargetAtTime(v, t, 0.05);
      wet.gain.setTargetAtTime(1 - v, t, 0.05);
    },
  };
  graphs.set(el, graph);
  return graph;
}
