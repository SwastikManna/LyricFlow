import { useEffect, useState } from "react";
import { Mic2 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Slider } from "./ui/slider";
import { getAudioGraph } from "@/lib/audio-graph";
import { cn } from "@/lib/utils";

const SPEEDS = [0.75, 0.9, 1, 1.1, 1.25, 1.5];

interface SingAlongMenuProps {
  audio: HTMLAudioElement | null;
  className?: string | undefined;
}

/** Vocal level (karaoke) and playback speed with the pitch kept the same. */
export function SingAlongMenu({ audio, className }: SingAlongMenuProps) {
  const [vocals, setVocals] = useState(100);
  const [speed, setSpeed] = useState(1);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    if (!audio) return;
    audio.preservesPitch = true;
    audio.playbackRate = speed;
  }, [audio, speed]);

  useEffect(() => {
    if (!audio || (vocals === 100 && !unsupported)) {
      if (audio) {
        try {
          getAudioGraph(audio).setVocalLevel(1);
        } catch {
          /* graph not available */
        }
      }
      return;
    }
    try {
      const graph = getAudioGraph(audio);
      if (graph.ctx.state === "suspended") void graph.ctx.resume();
      graph.setVocalLevel(vocals / 100);
    } catch {
      setUnsupported(true);
    }
  }, [audio, vocals, unsupported]);

  const active = vocals < 100 || speed !== 1;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={cn(className, active && "text-primary")} aria-label="Sing along and speed">
          <Mic2 className="size-4" aria-hidden />
          <span className="hidden sm:inline">Sing along</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-5">
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Vocals</span>
            <span className="tabular-nums text-muted-foreground">{vocals === 0 ? "Karaoke" : `${vocals}%`}</span>
          </div>
          <Slider
            className="mt-3"
            value={[vocals]}
            min={0}
            max={100}
            step={5}
            onValueChange={(v) => setVocals(v[0] ?? 100)}
            aria-label="Vocal level"
            disabled={unsupported}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {unsupported
              ? "Your browser can't adjust vocals for this song."
              : "Lowers the main singer. Works best on stereo studio recordings."}
          </p>
        </div>
        <div>
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Speed</span>
            <span className="tabular-nums text-muted-foreground">{speed}×</span>
          </div>
          <div className="mt-3 grid grid-cols-6 gap-1">
            {SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={cn(
                  "rounded-lg py-1.5 text-xs tabular-nums transition-colors",
                  s === speed ? "bg-primary text-primary-foreground" : "bg-glass text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">The key stays the same. Lyrics follow the new speed.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
