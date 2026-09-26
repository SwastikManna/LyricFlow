import { createFileRoute } from "@tanstack/react-router";

const MAX_BYTES = 20 * 1024 * 1024;
const MODEL = "google/gemini-3.8-flash";

const FORMATS: Record<string, string> = {
  mp3: "mp3",
  wav: "wav",
  m4a: "m4a",
  mp4: "m4a",
};

const PROMPT = `You are a lyrics transcription and alignment engine.
Listen to this song and transcribe ONLY the sung/spoken vocals as lyrics.
Split into natural lyric lines (roughly 3-12 words each).
For every line give start and end time in seconds from the start of the audio, and for every word its start and end time in seconds.
Timestamps must be accurate to the audio, increasing, and never overlap between lines.
If there are no vocals, return an empty lines array.
Respond with ONLY JSON, no markdown, in this exact shape:
{"language":"<BCP-47 code>","lines":[{"text":"...","start":0.0,"end":0.0,"words":[{"text":"...","start":0.0,"end":0.0}]}]}`;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return json({ error: "AI is not configured." }, 500);

        const input = (await request.json().catch(() => null)) as { id?: unknown; deviceId?: unknown } | null;
        const id = typeof input?.id === "string" ? input.id : "";
        const deviceId = typeof input?.deviceId === "string" ? input.deviceId : "";
        if (!/^[0-9a-f-]{36}$/i.test(id) || deviceId.length < 8) return json({ error: "Invalid request." }, 400);

        const { admin, getOwnedRow, BUCKET } = await import("@/lib/songs.server");
        const row = await getOwnedRow(id, deviceId);
        if (!row) return json({ error: "Song not found." }, 404);
        const db = await admin();
        const setStatus = (processing_status: string, error_message: string | null = null) =>
          db.from("songs" as never).update({ processing_status, error_message } as never).eq("id", id);

        if (row.file_size > MAX_BYTES) return json({ error: "This file is too large to analyze (max 20 MB)." }, 413);
        const ext = row.file_name.toLowerCase().split(".").pop() ?? "";
        const format = FORMATS[ext];
        if (!format) return json({ error: "Unsupported audio format." }, 400);

        const { data: blob, error: dlErr } = await db.storage.from(BUCKET).download(row.file_path);
        if (dlErr || !blob) return json({ error: "Couldn't load the saved audio." }, 500);
        await setStatus("TRANSCRIBING");
        const fail = async (message: string, status: number) => {
          await setStatus("FAILED", message);
          return json({ error: message }, status);
        };

        const base64 = Buffer.from(await blob.arrayBuffer()).toString("base64");

        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: MODEL,
            stream: true,
            messages: [
              {
                role: "user",
                content: [
                  { type: "text", text: PROMPT },
                  { type: "input_audio", input_audio: { data: base64, format } },
                ],
              },
            ],
          }),
          signal: request.signal,
        });

        if (!upstream.ok || !upstream.body) {
          let message = "Transcription failed.";
          try {
            const err = (await upstream.json()) as { error?: { message?: string }; message?: string };
            message = err.error?.message ?? err.message ?? message;
          } catch {
            /* ignore */
          }
          if (upstream.status === 402) message = "AI credits are used up. Add credits to keep transcribing.";
          if (upstream.status === 429) message = "Too many requests right now. Please try again in a minute.";
          return json({ error: message }, upstream.status);
        }

        // Accumulate SSE deltas server-side.
        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let text = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx: number;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;
            try {
              const evt = JSON.parse(data) as {
                choices?: { delta?: { content?: string } }[];
                error?: { message?: string };
              };
              if (evt.error) return json({ error: evt.error.message ?? "Transcription failed." }, 502);
              text += evt.choices?.[0]?.delta?.content ?? "";
            } catch {
              /* partial frame */
            }
          }
        }

        const match = text.match(/\{[\s\S]*\}/);
        if (!match) return json({ error: "The AI didn't return any lyrics for this track." }, 502);
        try {
          return json(JSON.parse(match[0]));
        } catch {
          return json({ error: "The AI returned lyrics in an unreadable format." }, 502);
        }
      },
    },
  },
});
