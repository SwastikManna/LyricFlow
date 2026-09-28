import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Plus, Trash2, Clock } from "lucide-react";
import { toast } from "sonner";
import { getDeviceId, getSongWithLyrics } from "@/api/songs";
import { saveEditedLyricsFn } from "@/lib/songs.functions";
import { alignLyricsToBeats, detectBeats, type BeatGrid } from "@/lib/beat-detection";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";
import { BeatGridTimeline } from "@/components/BeatGridTimeline";
import type { LyricLine, SyncedLyrics } from "@/types/lyrics";
import type { Song } from "@/types/song";

export const Route = createFileRoute("/edit/$songId")({
  head: () => ({
    meta: [
      { title: "Edit lyrics — LyricFlow" },
      { name: "description", content: "Fix lyric lines and timings, then align each word to the recording." },
      { property: "og:title", content: "Edit lyrics — LyricFlow" },
      { property: "og:description", content: "Tweak lyric text and align the words to the recording." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EditPage,
  errorComponent: ({ error }) => <div role="alert" className="p-10 text-center text-muted-foreground">{error.message}</div>,
  notFoundComponent: () => <div className="p-10 text-center">Page not found.</div>,
});

interface Row { id: string; text: string; start: string; end: string; translations: Record<string, string>; romanization: string }

function EditPage() {
  const { songId } = Route.useParams();
  const navigate = useNavigate();
  const audio = useRef<HTMLAudioElement>(null);
  const [song, setSong] = useState<Song | null>(null);
  const [language, setLanguage] = useState("en");
  const [translationLanguage, setTranslationLanguage] = useState("en");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [missing, setMissing] = useState(false);
  const [beatSnap, setBeatSnap] = useState(true);
  const [beatGrid, setBeatGrid] = useState<BeatGrid | null>(null);
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAnalyzingBeats, setIsAnalyzingBeats] = useState(false);
  const [saving, setSaving] = useState(false);
  const timelineLines = useMemo(
    () => (rows ?? []).map((row) => ({ id: row.id, text: row.text, start: Number(row.start) || 0, end: Number(row.end) || 0 })),
    [rows],
  );

  useEffect(() => {
    let cancelled = false;
    getSongWithLyrics(songId).then(async (r) => {
      if (!r) return setMissing(true);
      if (cancelled) return;
      setSong(r.song);
      const l = r.lyrics?.synchronizedLyrics;
      setLanguage(l?.language ?? "en");
      const initialRows = (l?.lines ?? []).map((x) => ({
        id: x.id,
        text: x.text,
        start: x.start.toFixed(2),
        end: x.end.toFixed(2),
        translations: { ...x.translations },
        romanization: x.romanization ?? "",
      }));
      setRows(initialRows);
      setSelectedLineId(initialRows[0]?.id ?? null);
      if (l?.beatGrid) {
        setBeatGrid(l.beatGrid);
        return;
      }
      if (r.song.audioFileUrl) {
        setIsAnalyzingBeats(true);
        const grid = await fetch(r.song.audioFileUrl)
          .then((response) => response.arrayBuffer())
          .then(detectBeats)
          .catch(() => null);
        if (!cancelled && grid) setBeatGrid(grid);
        if (!cancelled) setIsAnalyzingBeats(false);
      }
    }).catch(() => !cancelled && setMissing(true));
    return () => { cancelled = true; };
  }, [songId]);

  const update = (i: number, patch: Partial<Row>) => setRows((p) => p!.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const now = () => (audio.current?.currentTime ?? 0).toFixed(2);
  const placeLineOnBeat = (id: string, start: number) => setRows((previous) => previous?.map((row) => {
    if (row.id !== id) return row;
    const oldStart = Number(row.start);
    const duration = Math.max(0.3, Number(row.end) - oldStart);
    return { ...row, start: start.toFixed(2), end: (start + duration).toFixed(2) };
  }) ?? null);
  const addAfter = (i: number) => setRows((p) => {
    const prev = p![i];
    const s = prev ? Number(prev.end) : 0;
    const row = { id: crypto.randomUUID(), text: "", start: s.toFixed(2), end: (s + 2).toFixed(2), translations: {}, romanization: "" };
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
      lines.push({ id: r.id, text: r.text.trim(), start, end, translations: r.translations, romanization: r.romanization.trim() });
    }
    lines.sort((a, b) => a.start - b.start);
    setSaving(true);
    try {
      let lyrics: SyncedLyrics = { language, lines, wordTimingSource: "line-only", ...(beatGrid ? { beatGrid } : {}) };
      if (beatSnap && beatGrid && beatGrid.confidence > 0.05) {
        lyrics = alignLyricsToBeats(lyrics, beatGrid);
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
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
        {song?.audioFileUrl && (
          <div className="mx-auto max-w-4xl px-5 pb-3 sm:px-8">
            <audio ref={audio} src={song.audioFileUrl} controls onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} className="h-9 w-full" />
          </div>
        )}
      </header>

      <section className="mx-auto max-w-4xl px-5 pb-24 pt-6 sm:px-8">
        <p className="text-sm text-muted-foreground">Edit lyric text, translations, romanizations, or timings. Romanization writes the same words phonetically in Latin letters. Save your changes, then align the words to the recording from the player.</p>
        {beatGrid && song && (
          <div className="mt-6">
            <BeatGridTimeline
              duration={song.duration}
              beats={beatGrid.beats}
              bpm={beatGrid.bpm}
              confidence={beatGrid.confidence}
              lines={timelineLines}
              selectedLineId={selectedLineId}
              currentTime={currentTime}
              onSelectLine={setSelectedLineId}
              onPlaceLine={placeLineOnBeat}
              onSeek={(time) => { if (audio.current) audio.current.currentTime = time; setCurrentTime(time); }}
            />
          </div>
        )}
        {isAnalyzingBeats && <p className="mt-4 text-xs text-muted-foreground">Analyzing the track’s beat grid…</p>}
        {!beatGrid && !isAnalyzingBeats && rows && <p className="mt-4 text-xs text-muted-foreground">No steady beat grid was detected. You can still enter lyric times manually.</p>}
        {rows && (
          <label className="mt-6 flex w-fit items-center gap-2 text-xs text-muted-foreground">
            Translation language
            <select value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value)} className="rounded-lg border border-glass-border bg-background px-2.5 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60">
              {TRANSLATION_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
        )}
        {rows && rows.length === 0 && (
          <button type="button" onClick={() => addAfter(-1)} className="mt-6 inline-flex items-center gap-1.5 text-primary"><Plus className="size-4" /> Add the first line</button>
        )}
        <ul className="mt-6 space-y-2">
          {rows?.map((r, i) => (
            <li key={r.id} onClick={() => setSelectedLineId(r.id)} className={`group rounded-xl px-2 py-2 hover:bg-glass ${r.id === selectedLineId ? "bg-glass" : ""}`}>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                {(["start", "end"] as const).map((k) => (
                  <div key={k} className="flex items-center">
                    <input aria-label={`${k} time`} value={r[k]} onChange={(e) => update(i, { [k]: e.target.value })} inputMode="decimal"
                      className="w-16 rounded-md bg-transparent px-1 py-1 text-right text-sm tabular-nums text-muted-foreground outline-none focus:bg-glass focus:text-foreground" />
                    <button type="button" onClick={() => update(i, { [k]: now() })} aria-label={`Set ${k} to current time`} className="p-1 text-muted-foreground hover:text-primary"><Clock className="size-3.5" /></button>
                  </div>
                ))}
                <input value={r.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Original lyric line"
                  className="min-w-0 flex-1 rounded-md bg-transparent px-2 py-1 font-display text-lg outline-none focus:bg-glass" />
                <button type="button" onClick={() => addAfter(i)} aria-label="Add line below" className="p-1.5 text-muted-foreground opacity-60 hover:text-foreground group-hover:opacity-100"><Plus className="size-4" /></button>
                <button type="button" onClick={() => setRows((p) => p!.filter((_, j) => j !== i))} aria-label="Delete line" className="p-1.5 text-muted-foreground opacity-60 hover:text-foreground group-hover:opacity-100"><Trash2 className="size-4" /></button>
              </div>
              <input
                aria-label="Romanized lyric line"
                value={r.romanization}
                onChange={(event) => update(i, { romanization: event.target.value })}
                placeholder="Pronunciation in Latin letters (same words, not a translation)"
                className="mt-1.5 ml-16 w-[calc(100%-4rem)] rounded-md bg-transparent px-2 py-1 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-glass focus:text-foreground"
              />
              <input
                aria-label={`${TRANSLATION_LANGUAGES.find((item) => item.code === translationLanguage)?.name ?? translationLanguage} translation`}
                value={r.translations[translationLanguage] ?? ""}
                onChange={(event) => update(i, { translations: { ...r.translations, [translationLanguage]: event.target.value } })}
                placeholder={`${TRANSLATION_LANGUAGES.find((item) => item.code === translationLanguage)?.name ?? translationLanguage} translation (optional)`}
                className="mt-1.5 ml-16 w-[calc(100%-4rem)] rounded-md bg-transparent px-2 py-1 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-glass focus:text-foreground"
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
