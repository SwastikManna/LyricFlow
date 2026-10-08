import { createFileRoute } from "@tanstack/react-router";
import { MAX_SONG_FILE_BYTES, MAX_SONG_FILE_LABEL } from "@/lib/song-constraints";

const TYPES: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  flac: "audio/flac",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function guessTitle(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Untitled track";
  return base.replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 200);
}

/** POST /api/songs — saves the uploaded audio and creates the song entry. */
export const Route = createFileRoute("/api/songs")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (Number(request.headers.get("content-length") ?? 0) > MAX_SONG_FILE_BYTES + 1024 * 1024) {
          return json({ error: `This file is too large (max ${MAX_SONG_FILE_LABEL}).` }, 413);
        }
        const form = await request.formData();
        const file = form.get("file");
        const deviceId = String(form.get("deviceId") ?? "");
        const duration = Number(form.get("duration") ?? 0);
        if (deviceId.length < 8 || deviceId.length > 100) return json({ error: "Invalid request." }, 400);
        if (!(file instanceof File) || file.size === 0) return json({ error: "No audio file received." }, 400);
        if (file.size > MAX_SONG_FILE_BYTES) return json({ error: `This file is too large (max ${MAX_SONG_FILE_LABEL}).` }, 413);
        const ext = file.name.toLowerCase().split(".").pop() ?? "";
        const type = TYPES[ext];
        if (!type) return json({ error: "Unsupported audio format." }, 400);

        const { admin, BUCKET } = await import("@/lib/songs.server");
        const db = await admin();
        const id = crypto.randomUUID();
        const path = `${deviceId}/${id}.${ext}`;

        const { error: upErr } = await db.storage
          .from(BUCKET)
          .upload(path, await file.arrayBuffer(), { contentType: type, upsert: false });
        if (upErr) return json({ error: "Couldn't save the audio file." }, 500);

        const { error } = await db.from("songs" as never).insert({
          id,
          device_id: deviceId,
          title: guessTitle(file.name),
          file_path: path,
          file_name: file.name.slice(0, 255),
          file_size: file.size,
          duration: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0,
        } as never);
        if (error) {
          await db.storage.from(BUCKET).remove([path]);
          return json({ error: "Couldn't create the song." }, 500);
        }
        return json({ id });
      },
    },
  },
});
