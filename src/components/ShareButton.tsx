import { useState } from "react";
import { Link2 } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId } from "@/api/songs";
import { getSongSharedFn, setSongSharedFn } from "@/lib/share.functions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export function ShareButton({ songId, className }: { songId: string; className?: string | undefined }) {
  const [shared, setShared] = useState<boolean | null>(null);
  const link = () => `${window.location.origin}/share/${songId}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link());
      toast.success("Link copied");
    } catch {
      toast.message(link());
    }
  };

  const update = async (value: boolean) => {
    try {
      await setSongSharedFn({ data: { deviceId: getDeviceId(), id: songId, shared: value } });
      setShared(value);
      if (value) await copy();
      else toast.success("Link turned off");
    } catch {
      toast.error("Couldn't change sharing.");
    }
  };

  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open)
          void getSongSharedFn({ data: { deviceId: getDeviceId(), id: songId } })
            .then((r) => setShared(r.shared))
            .catch(() => setShared(false));
      }}
    >
      <DropdownMenuTrigger asChild>
        <button type="button" className={className} aria-label="Share">
          <Link2 className="size-4" aria-hidden />
          <span className="hidden sm:inline">Share</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal text-muted-foreground">
          {shared ? "Anyone with the link can listen." : "Only you can listen to this song."}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {shared === null ? (
          <p className="px-2 py-1.5 text-sm text-muted-foreground">Loading…</p>
        ) : shared ? (
          <>
            <DropdownMenuItem onSelect={() => void copy()}>Copy link</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void update(false)}>Stop sharing</DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem onSelect={() => void update(true)}>Create share link</DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
