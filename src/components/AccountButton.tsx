import { useEffect, useState } from "react";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { resetLibraryAccess } from "@/api/songs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const pill =
  "inline-flex items-center gap-2 rounded-full border border-glass-border bg-glass px-3.5 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:text-sm";

export function AccountButton() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  if (user === undefined) return null;

  if (!user) {
    return (
      <button
        type="button"
        className={pill}
        onClick={async () => {
          const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
          if (result.error) toast.error("Google sign-in didn't work. Please try again.");
        }}
      >
        Sign in
      </button>
    );
  }

  const name = (user.user_metadata["full_name"] as string | undefined) ?? user.email ?? "Account";
  const avatar = user.user_metadata["avatar_url"] as string | undefined;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={pill} aria-label="Account">
          {avatar ? (
            <img src={avatar} alt="" className="size-5 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/20 text-[10px] text-primary">
              {name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="hidden max-w-[8rem] truncate sm:inline">{name.split(" ")[0]}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="truncate font-normal text-muted-foreground">{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async () => {
            await supabase.auth.signOut();
            resetLibraryAccess();
            window.location.assign("/");
          }}
        >
          <LogOut className="size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
