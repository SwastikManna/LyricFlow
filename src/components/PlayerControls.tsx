import {
  Maximize2,
  Minimize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  onToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onVolumeChange: (value: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

const iconButton =
  "inline-flex size-10 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-glass hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60";

export function PlayerControls({
  isPlaying,
  volume,
  isMuted,
  isFullscreen,
  onToggle,
  onPrevious,
  onNext,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
}: PlayerControlsProps) {
  const VolumeIcon = isMuted || volume === 0 ? VolumeX : volume < 0.5 ? Volume1 : Volume2;

  return (
    <div className="flex items-center justify-between gap-4">
      <div className="hidden w-32 items-center gap-2 sm:flex">
        <button type="button" className={iconButton} onClick={onToggleMute} aria-label="Mute">
          <VolumeIcon className="size-5" />
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          aria-label="Volume"
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-foreground/15 accent-primary"
        />
      </div>

      <div className="flex flex-1 items-center justify-center gap-3 sm:gap-5">
        <button type="button" className={iconButton} onClick={onPrevious} aria-label="Previous">
          <SkipBack className="size-5" />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-label={isPlaying ? "Pause" : "Play"}
          className={cn(
            "inline-flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground",
            "shadow-glow transition-transform hover:scale-105 active:scale-95",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
          )}
        >
          {isPlaying ? <Pause className="size-6" /> : <Play className="ml-0.5 size-6" />}
        </button>
        <button type="button" className={iconButton} onClick={onNext} aria-label="Next">
          <SkipForward className="size-5" />
        </button>
      </div>

      <div className="flex w-32 justify-end">
        <button
          type="button"
          className={iconButton}
          onClick={onToggleFullscreen}
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>
      </div>
    </div>
  );
}
