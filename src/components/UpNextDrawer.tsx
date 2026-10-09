import { ListMusic } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { formatTime } from "@/hooks/useAudioPlayer";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/lib/play-queue";

interface UpNextDrawerProps {
  queue: QueueItem[];
  currentId: string;
  autoplay: boolean;
  onAutoplayChange: (value: boolean) => void;
  onSelect: (id: string) => void;
}

export function UpNextDrawer({ queue, currentId, autoplay, onAutoplayChange, onSelect }: UpNextDrawerProps) {
  const index = queue.findIndex((item) => item.id === currentId);
  const upcoming = index >= 0 ? queue.slice(index + 1) : queue;
  const nextTitle = upcoming[0]?.title;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ListMusic className="size-4" aria-hidden />
          <span className="hidden sm:inline">Up next</span>
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="flex w-full flex-col border-glass-border bg-background/90 backdrop-blur-2xl sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl tracking-tight">Up next</SheetTitle>
          <SheetDescription>
            {nextTitle ? `Next: ${nextTitle}` : "This is the last song in your queue."}
          </SheetDescription>
        </SheetHeader>

        <label className="mt-2 flex cursor-pointer items-center justify-between rounded-2xl border border-glass-border bg-glass px-4 py-3 text-sm">
          <span>Play the next song automatically</span>
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(e) => onAutoplayChange(e.target.checked)}
            className="size-4 accent-primary"
          />
        </label>

        <ol className="-mx-2 mt-2 flex-1 space-y-1 overflow-y-auto px-2 pb-6">
          {queue.map((item, i) => {
            const isCurrent = item.id === currentId;
            const isPast = index >= 0 && i < index;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => !isCurrent && onSelect(item.id)}
                  aria-current={isCurrent ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                    isCurrent ? "bg-primary/10 text-foreground" : "hover:bg-glass",
                    isPast && "opacity-50",
                  )}
                >
                  <span className={cn("w-5 text-xs tabular-nums", isCurrent ? "text-primary" : "text-muted-foreground")}>
                    {isCurrent ? "▶" : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{item.title}</span>
                    {item.artist && <span className="block truncate text-xs text-muted-foreground">{item.artist}</span>}
                  </span>
                  <span className="text-xs tabular-nums text-muted-foreground">{formatTime(item.duration)}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </SheetContent>
    </Sheet>
  );
}
