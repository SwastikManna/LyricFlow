import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROCESSING_STAGES } from "@/api/songs";

interface ProcessingStatusProps {
  /** Index of the stage currently running. */
  currentStage: number;
  progress: number;
}

export function ProcessingStatus({ currentStage, progress }: ProcessingStatusProps) {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 sm:mb-10">
        <div
          role="progressbar"
          aria-label="Track analysis progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="h-1 w-full overflow-hidden rounded-full bg-foreground/15"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          {progress}% complete
        </p>
      </div>

      <ul className="space-y-3 sm:space-y-4">
        {PROCESSING_STAGES.map((stage, index) => {
          const done = index < currentStage;
          const active = index === currentStage;

          return (
            <li
              key={stage.key}
              className={cn(
                "flex items-center gap-2.5 text-sm transition-all duration-500 sm:gap-3 sm:text-base",
                done && "text-foreground/70",
                active && "text-foreground",
                !done && !active && "text-muted-foreground/50",
              )}
            >
              <span className="inline-flex size-5 shrink-0 items-center justify-center">
                {done ? (
                  <Check className="size-4 text-primary" />
                ) : active ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <Circle className="size-3" />
                )}
              </span>
              <span className={cn(active && "font-medium")}>
                {done ? stage.doneLabel : stage.label}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
