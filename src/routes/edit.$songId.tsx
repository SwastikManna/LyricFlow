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
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/edit/$songId")({
  head: () => ({
    meta: [
      { title: "Edit lyrics — LyricFlow" },
      { name: "description", content: "Fix lyric lines and timings, then align each word to the recording." },
      { property: "og:title", content: "Edit lyrics — LyricFlow" },
      { property: "og:description", content: "Tweak lyric text and align the words to the recording." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: EditPage,
  errorComponent: RouteError,
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

  if (missing) return <main className="bg-stage min-h-screen p-4 text-center text-muted-foreground sm:p-10">This song isn't available. <Link to="/library" className="text-primary">Back to library</Link></main>;

  return (
    <main className="bg-stage min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-glass-border/60 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto max-w-4xl px-4 py-3 sm:px-8 sm:py-4">
          <div className="flex items-center gap-2.5 sm:gap-4">
            <Link to="/library" className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground sm:px-3 sm:text-sm">
              <ArrowLeft className="size-4" /> Library
            </Link>
            <p className="min-w-0 flex-1 truncate font-display text-base font-medium sm:text-lg">{song?.title ?? "Loading…"}</p>
            <button type="button" onClick={save} disabled={saving || !rows} className="shrink-0 rounded-full bg-primary px-3 py-2 text-xs font-medium text-primary-foreground shadow-glow disabled:opacity-50 sm:px-5 sm:text-sm">
              <span className="sm:hidden">{saving ? "Saving" : "Save"}</span>
              <span className="hidden sm:inline">{saving ? "Saving…" : "Save changes"}</span>
            </button>
          </div>
          <label className="mt-2 flex w-fit items-center gap-2 text-xs text-muted-foreground sm:mt-3 sm:text-sm">
            <input type="checkbox" checked={beatSnap} onChange={(e) => setBeatSnap(e.target.checked)} className="accent-primary" />
            Snap to beat
          </label>
        </div>
        {song?.audioFileUrl && (
          <div className="mx-auto max-w-4xl px-4 pb-3 sm:px-8">
            <audio ref={audio} src={song.audioFileUrl} controls onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} className="h-9 w-full" />
          </div>
        )}
      </header>

      <section className="mx-auto max-w-4xl px-4 pb-16 pt-5 sm:px-8 sm:pb-24 sm:pt-6">
        <p className="text-xs leading-5 text-muted-foreground sm:text-sm sm:leading-6">Edit lyric text, translations, romanizations, or timings. Romanization writes the same words phonetically in Latin letters. Save your changes, then align the words to the recording from the player.</p>
        {rows === null && !missing && <p role="status" className="mt-6 text-sm text-muted-foreground">Loading track and lyrics…</p>}
        {beatGrid && song && (
          <div className="mt-4 sm:mt-6">
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
          <label className="mt-5 flex w-full max-w-full items-center justify-between gap-3 text-xs text-muted-foreground sm:mt-6 sm:w-fit sm:justify-start">
            Translation language
            <select value={translationLanguage} onChange={(event) => setTranslationLanguage(event.target.value)} className="min-w-0 max-w-[65%] rounded-lg border border-glass-border bg-background px-2.5 py-1.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/60 sm:max-w-none">
              {TRANSLATION_LANGUAGES.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
            </select>
          </label>
        )}
        {rows && rows.length === 0 && (
          <button type="button" onClick={() => addAfter(-1)} className="mt-6 inline-flex items-center gap-1.5 text-primary"><Plus className="size-4" /> Add the first line</button>
        )}
        <ul className="mt-5 space-y-2 sm:mt-6">
          {rows?.map((r, i) => (
            <li key={r.id} onClick={() => setSelectedLineId(r.id)} className={`group rounded-xl px-2 py-2 hover:bg-glass ${r.id === selectedLineId ? "bg-glass" : ""}`}>
              <div className="grid grid-cols-2 items-center gap-x-2 gap-y-1 sm:flex sm:flex-nowrap sm:gap-2">
                {(["start", "end"] as const).map((k) => (
                  <div key={k} className="flex min-w-0 items-center rounded-lg border border-glass-border/50 bg-background/25 px-1 sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0">
                    <input aria-label={`${k} time`} value={r[k]} onChange={(e) => update(i, { [k]: e.target.value })} inputMode="decimal"
                      className="w-full min-w-0 rounded-md bg-transparent px-1 py-2 text-right text-xs tabular-nums text-muted-foreground outline-none focus:bg-glass focus:text-foreground sm:w-16 sm:py-1 sm:text-sm" />
                    <button type="button" onClick={() => update(i, { [k]: now() })} aria-label={`Set ${k} to current time`} className="p-1 text-muted-foreground hover:text-primary"><Clock className="size-3.5" /></button>
                  </div>
                ))}
                <input value={r.text} onChange={(e) => update(i, { text: e.target.value })} placeholder="Original lyric line"
                  className="col-span-2 min-w-0 rounded-md bg-transparent px-2 py-2 font-display text-base outline-none focus:bg-glass sm:col-span-1 sm:flex-1 sm:py-1 sm:text-lg" />
                <div className="col-span-2 flex justify-end gap-1 sm:contents">
                  <button type="button" onClick={() => addAfter(i)} aria-label="Add line below" className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-glass hover:text-foreground sm:size-8 sm:rounded-md sm:opacity-60 sm:group-hover:opacity-100"><Plus className="size-4" /></button>
                  <button type="button" onClick={() => setRows((p) => p!.filter((_, j) => j !== i))} aria-label="Delete line" className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-glass hover:text-foreground sm:size-8 sm:rounded-md sm:opacity-60 sm:group-hover:opacity-100"><Trash2 className="size-4" /></button>
                </div>
              </div>
              <input
                aria-label="Romanized lyric line"
                value={r.romanization}
                onChange={(event) => update(i, { romanization: event.target.value })}
                placeholder="Pronunciation in Latin letters (same words, not a translation)"
                className="mt-1.5 ml-0 w-full rounded-md bg-transparent px-2 py-2 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-glass focus:text-foreground sm:ml-16 sm:w-[calc(100%-4rem)] sm:py-1"
              />
              <input
                aria-label={`${TRANSLATION_LANGUAGES.find((item) => item.code === translationLanguage)?.name ?? translationLanguage} translation`}
                value={r.translations[translationLanguage] ?? ""}
                onChange={(event) => update(i, { translations: { ...r.translations, [translationLanguage]: event.target.value } })}
                placeholder={`${TRANSLATION_LANGUAGES.find((item) => item.code === translationLanguage)?.name ?? translationLanguage} translation (optional)`}
                className="mt-1.5 ml-0 w-full rounded-md bg-transparent px-2 py-2 text-sm text-muted-foreground outline-none placeholder:text-muted-foreground/50 focus:bg-glass focus:text-foreground sm:ml-16 sm:w-[calc(100%-4rem)] sm:py-1"
              />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
