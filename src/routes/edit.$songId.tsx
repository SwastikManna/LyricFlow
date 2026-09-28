import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId, getSongWithLyrics } from "@/api/songs";
import { saveEditedLyricsFn } from "@/lib/songs.functions";
import { alignLyricsToBeats, detectBeats } from "@/lib/beat-detection";
import type { LyricLine, SyncedLyrics } from "@/types/lyrics";
import type { Song } from "@/types/song";

export const Route = createFileRoute("/edit/$songId")({
  head: () => ({
    meta: [
      { title: "Edit lyrics — LyricFlow" },
      { name: "description", content: "Fix lyric lines and timings, then re-sync word timings automatically." },
      { property: "og:title", content: "Edit lyrics — LyricFlow" },
      { property: "og:description", content: "Tweak lyrics line by line and re-sync the words." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditPage,
  errorComponent: ({ error }) => <div role="alert" className="p-10 text-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Page not found.</div>,
});

interface Row { id: string; text: string; start: string; end: string }

/** Spreads words across the line, weighted by word length. */
function resyncWords(line: LyricLine): LyricLine {
  const words = line.text.split(/\s+/).filter(Boolean);
  const total = words.reduce((s, w) => s + w.length + 1, 0) || 1;
  const span = line.end - line.start;
  let t = line.start;
  return {
    ...line,
    words: words.map((w) => {
      const d = (span * (w.length + 1)) / total;
      const out = { text: w, start: Number(t.toFixed(3)), end: Number((t + d).toFixed(3)) };
      t += d;
      return out;
    }),
  };
}

function EditPage() {
  const { songId } = Route.useParams();
  const navigate = useNavigate();
  const audio = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [language, setLanguage] = useState("en");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [beatSnap, setBeatSnap] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSongWithLyrics(songId).then((r) => {
      if (!r) return setMissing(true);
      setSong(r.song);
      const l = r.lyrics?.synchronizedLyrics;
      setLanguage(l?.language ?? "en");
      setRows((l?.lines ?? []).map((x) => ({ id: x.id, text: x.text, start: x.start.toFixed(2), end: x.end.toFixed(2) })));
    }).catch(() => setMissing(true));
  }, [songId]);

  const update = (i: number, patch: Partial<Row>) => setRows((p) => p!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const now = () => (audio.current?.currentTime ?? 0).toFixed(2);
  const addAfter = (i: number) => setRows((p) => {
    const prev = p![i];
    const s = prev ? Number(prev.end) : 0;
    const row = { id: crypto.randomUUID(), text: "", start: s.toFixed(2), end: (s + 2).toFixed(2) };
    const next = [...p!];
    next.splice(i + 1, 0, row);
    return next;
  });

  const save = async () => {
    if (!rows || !song) return;
    const lines: LyricLine[] = [];
    for (const r of rows) {
      const start = Number(r.start), end = Number(r.end);
      if (!r.text.trim()) continue;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
        toast.error(`Check the times on "${r.text.slice(0, 30)}" — the end must be after the start.`);
        return;
      }
      lines.push(resyncWords({ id: r.id, text: r.text.trim(), start, end }));
    }
    lines.sort((a, b) => a.start - b.start);
    setSaving(true);
    try {
      let lyrics: SyncedLyrics = { language, lines };
      if (beatSnap && song.audioFileUrl) {
        const grid = await fetch(song.audioFileUrl).then((r) => r.arrayBuffer()).then(detectBeats).catch(() => null);
        if (grid && grid.confidence > 0.05) lyrics = alignLyricsToBeats(lyrics, grid);
      }
      await saveEditedLyricsFn({ data: { id: songId, deviceId: getDeviceId(), lyrics } });
      toast.success("Lyrics saved");
      navigate({ to: "/player/$songId", params: { songId } });
    } catch {
      toast.error("We couldn't save your changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (missing) return <main className="bg-stage min-h-screen p-10 text-center text-muted-foreground">This song isn't available. <Link to="/library" className="text-primary">Back to library</Link></main>;

  return (
    <main className="bg-stage min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-glass-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center gap-4 px-5 py-4 sm:px-8">
          <Link to="/library" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Library
          </Link>
          <p className="min-w-0 flex-1 truncate font-display text-lg font-medium">{song?.title ?? "Loading…"}</p>
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={beatSnap} onChange={(e) => setBeatSnap(e.target.checked)} className="accent-primary" />
            Snap to beat
          </label>
          <button type="button" onClick={save} disabled={saving || !rows} className="rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-glow disabled:opacity-50">
            {saving ? "Syncing…" : "Save & re-sync"}
          </button>
        </div>
        {song?.audioFileUrl && (
          <div className="mx-auto max-w-4xl px-5 pb-3 sm:px-8">
            <audio ref={audio} src={song.audioFileUrl} controls className="h-9 w-full" />
          </div>
        )}
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-24 pt-6 sm:px-8">
        <p className="text-sm text-muted-foreground">Edit the words or times (in seconds). Use the clock to set a time from where the song is playing. Word timings are rebuilt when you save.</p>
        {rows && rows.length === 0 && (
          <button type="button" onClick={() => addAfter(-1)} className="mt-6 inline-flex items-center gap-1.5 text-primary"><Plus className="size-4" /> Add the first line</button>
        )}
        <ul className="mt-6 space-y-2">
          {rows?.map((r, i) => (
            <li key={r.id} className="group flex flex-wrap items-center gap-2 rounded-xl px-2 py-2 hover:bg-glass sm:flex-nowrap">
              {(["start", "end"] as const).map((k) => (
                <div key={k} className="flex items-center">
                  <input aria-label={`${k} time`} value={r[k]} onChange={(e) => update(i, { [k]: e.target.value })} inputMode="decimal"
                    className="w-16 rounded-md bg-transparent px-1 py-1 text-right text-sm tabular-nums text-muted-foreground outline-none focus:bg-glass focus:text-foreground" />
                  <button type="button" onClick={() => update(i, { [k]: now() })} aria-label={`Set ${k} to current time`} className="p-1 text-muted-foreground hover:text-primary"><Clock className="size-3.5" /></button>
                </div>
              ))}
              <input value={r.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Lyric line"
                className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 font-display text-lg outline-none focus:bg-glass" />
              <button type="button" onClick={() => addAfter(i)} aria-label="Add line below" className="p-1.5 text-muted-foreground opacity-60 hover:text-foreground group-hover:opacity-100"><Plus className="size-4" /></button>
              <button type="button" onClick={() => setRows((p) => p!.filter((_, j) => j !== i))} aria-label="Delete line" className="p-1.5 text-muted-foreground opacity-60 hover:text-foreground group-hover:opacity-100"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
