import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ProcessingStatus } from "@/components/ProcessingStatus";
import { getSong, processSong, PROCESSING_STAGES } from "@/api/songs";
import type { Song } from "@/types/song";
import { RouteError } from "@/components/RouteError";

export const Route = createFileRoute("/processing/$songId")({
  head: () => ({
    meta: [
      { title: "Analyzing your track — LyricFlow" },
      {
        name: "description",
        content:
          "LyricFlow transcribes your song and prepares phonetic lyrics with timestamps. Review and adjust timing in the editor.",
      },
      { property: "og:title", content: "Analyzing your track — LyricFlow" },
      {
        property: "og:description",
        content: "Transcribing vocals and preparing phonetic lyrics with editable lyric timestamps.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProcessingPage,
  errorComponent: RouteError,
});

function ProcessingPage() {
  const { songId } = Route.useParams();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    (async () => {
      let found: Song | null;
      try {
        found = await getSong(songId);
      } catch (loadError) {
        if (!cancelled) {
          console.error("[processing] Could not load saved track:", loadError);
          setError("We couldn’t load this saved track. Check your connection and try again.");
        }
        return;
      }
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
          (index) => {
            if (cancelled) return;
            setStageIndex(index);
          },
          controller.signal,
        );
        if (!cancelled) {
          setStageIndex(PROCESSING_STAGES.length);
          setTimeout(
            () => navigate({ to: "/player/$songId", params: { songId } }),
            500,
          );
        }
      } catch (err) {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        console.error("[processing] Could not finish analyzing track:", err);
        setError("The analysis stopped before it could finish. Your uploaded track is still in your library.");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [songId, navigate, attempt]);

  if (missing || error) {
    return (
      <main className="bg-stage flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <h1 className="font-display text-2xl font-semibold">
          {error ? "We couldn’t finish analyzing this song" : "This song isn’t available"}
        </h1>
        <p className="max-w-sm text-muted-foreground">
          {error ??
            "It may have been deleted, or it was uploaded from another browser."}
        </p>
        {error ? (
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStageIndex(0);
                setAttempt((current) => current + 1);
              }}
              className="rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow"
            >
              Retry analysis
            </button>
            <Link to="/library" className="rounded-full border border-glass-border px-6 py-3 font-medium hover:bg-glass">
              Back to library
            </Link>
          </div>
        ) : (
          <Link to="/upload" className="mt-2 rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground shadow-glow">
            Upload a song
          </Link>
        )}
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
        <p className="mt-3 max-w-sm text-xs leading-5 text-muted-foreground">
          Keep this page open while LyricFlow prepares your lyrics. If analysis fails, you can retry without uploading the track again.
        </p>
      </div>

      <div className="mt-14 flex justify-center">
        <ProcessingStatus currentStage={stageIndex} />
      </div>
    </main>
  );
}
