import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROCESSING_STAGES } from "@/api/songs";

interface ProcessingStatusProps {
  /** Index of the stage currently running. */
  currentStage: number;
}

export function ProcessingStatus({ currentStage }: ProcessingStatusProps) {
  const completedStages = Math.min(currentStage, PROCESSING_STAGES.length);
  const completedWidth = (completedStages / PROCESSING_STAGES.length) * 100;
  const activeStage = PROCESSING_STAGES[currentStage];

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 sm:mb-10">
        <div
          role="progressbar"
          aria-label="Track analysis steps completed"
          aria-valuemin={0}
          aria-valuemax={PROCESSING_STAGES.length}
          aria-valuenow={completedStages}
          className="relative h-1 w-full overflow-hidden rounded-full bg-foreground/15"
        >
          <div
            className="h-full rounded-full bg-primary/70 transition-[width] duration-500 ease-out"
            style={{ width: `${completedWidth}%` }}
          />
          {activeStage && (
            <div
              aria-hidden="true"
              className="absolute inset-y-0 w-1/4 rounded-full bg-primary motion-safe:animate-progress-sweep"
              style={{ left: `${completedWidth}%` }}
            />
          )}
        </div>
        <p className="mt-3 text-center text-[10px] uppercase tracking-[0.24em] text-muted-foreground sm:text-xs sm:tracking-[0.3em]">
          {completedStages} of {PROCESSING_STAGES.length} steps complete
        </p>
        {activeStage && (
          <p className="mt-1 text-center text-xs text-muted-foreground" aria-live="polite">
            {activeStage.label}…
          </p>
        )}
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
