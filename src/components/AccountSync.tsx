import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getDeviceId, restoreLibraryAccess } from "@/api/songs";
import { linkLibraryFn } from "@/lib/account.functions";

/** After sign-in, points this browser at the account's library (once per session). */
export function AccountSync() {
  useEffect(() => {
    const sync = async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const key = `lyricflow:linked:${data.user.id}`;
      if (window.sessionStorage.getItem(key)) return;
      try {
        const current = getDeviceId();
        const { deviceId } = await linkLibraryFn({ data: { deviceId: current } });
        window.sessionStorage.setItem(key, "1");
        if (deviceId !== current) {
          restoreLibraryAccess(deviceId);
          window.location.reload();
        }
      } catch (error) {
        console.error("Library sync failed", error);
      }
    };
    void sync();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") void sync();
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return null;
}
