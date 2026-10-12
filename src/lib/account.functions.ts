import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Links a signed-in account to a library id. The first sign-in claims the
 * current browser's library; later sign-ins elsewhere move that browser's
 * songs and playlists into the account's library and return its id.
 */
export const linkLibraryFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ deviceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }): Promise<{ deviceId: string }> => {
    const { admin } = await import("./songs.server");
    const db = await admin();
    const { data: existing, error } = await db
      .from("user_libraries")
      .select("device_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!existing) {
      const { error: insertError } = await db
        .from("user_libraries")
        .insert({ user_id: context.userId, device_id: data.deviceId });
      if (insertError) throw new Error(insertError.message);
      return { deviceId: data.deviceId };
    }
    if (existing.device_id !== data.deviceId) {
      // Only merge a browser library no other account has claimed.
      const { data: claimed } = await db
        .from("user_libraries")
        .select("user_id")
        .eq("device_id", data.deviceId)
        .maybeSingle();
      if (!claimed) {
        await db.from("songs").update({ device_id: existing.device_id }).eq("device_id", data.deviceId);
        await db.from("playlists").update({ device_id: existing.device_id }).eq("device_id", data.deviceId);
      }
    }
    return { deviceId: existing.device_id };
  });
