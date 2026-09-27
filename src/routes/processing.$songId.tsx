import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { getSong, processSong, PROCESSING_STAGES } from "@/api/songs";
import type { Song } from "@/types/song";

export const Route = createFileRoute("/processing/$songId")({
  head: () => ({
    meta: [
      { title: "Analyzing your track — LyricFlow" },
      {
        name: "description",
        content:
          "LyricFlow is extracting the audio, transcribing the vocals and aligning timestamps for your song.",
      },
      { property: "og:title", content: "Analyzing your track — LyricFlow" },
      {
        property: "og:description",
        content: "Extracting audio, transcribing vocals and aligning lyric timestamps.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProcessingPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Song not found.</div>,
});

function ProcessingPage() {
  const { songId } = Route.useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      const found = await getSong(songId).catch(() => null);
      if (cancelled) return;
      if (!found) {
        setMissing(true);
        return;
      }
      if (found.processingStatus === "READY") {
        navigate({ to: "/player/$songId", params: { songId }, replace: true });
        return;
      }
      setSong(found);

      try {
        await processSong(
          songId,
          (index, status) => {
            if (cancelled) return;
            setStageIndex(index);
            setProgress(status.progress);
          },
          controller.signal,
        );
        if (!cancelled) {
          setStageIndex(PROCESSING_STAGES.length);
          setProgress(100);
          setTimeout(
            () => navigate({ to: "/player/$songId", params: { songId } }),
            500,
          );
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        setError(err instanceof Error ? err.message : "Something went wrong analyzing this track.");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [songId, navigate]);

  if (missing || error) {
    return (
      <main className="bg-stage flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-semibold">
          {error ? "We couldn't read the lyrics" : "This song isn't available"}
        </h1>
        <p className="max-w-sm text-muted-foreground">
          {error ??
            "It may have been deleted, or it was uploaded from another browser."}
        </p>
        <Link
          to="/upload"
          className="mt-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow"
        >
          Upload a song
        </Link>
      </main>
    );
  }

  return (
    <main className="bg-stage flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="animate-rise-in flex flex-col items-center text-center">
        <span className="relative mb-8 inline-flex size-20 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-primary/25 animate-pulse-ring" />
          <span className="absolute inset-0 rounded-full border border-primary/40" />
          <span className="size-3 rounded-full bg-primary shadow-glow" />
        </span>

        <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">Analyzing</p>
        <h1 className="mt-4 max-w-xl text-balance font-display text-2xl font-semibold sm:text-3xl">
          {song?.title ?? "Your track"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{song?.artist}</p>
      </div>

      <div className="mt-14 flex justify-center">
        <ProcessingStatus currentStage={stageIndex} progress={progress} />
      </div>
    </main>
  );
}
