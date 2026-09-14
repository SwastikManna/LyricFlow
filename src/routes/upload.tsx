import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { UploadBox } from "@/components/UploadBox";
import { createSong } from "@/api/songs";

export const Route = createFileRoute("/upload")({
  head: () => ({
    meta: [
      { title: "Upload a track — LyricFlow" },
      {
        name: "description",
        content:
          "Upload an MP3, MP4, WAV or M4A file and LyricFlow will transcribe and synchronize its lyrics for live playback.",
      },
      { property: "og:title", content: "Upload a track — LyricFlow" },
      {
        property: "og:description",
        content: "Drop in a song and get synchronized, scrolling lyrics in seconds.",
      },
    ],
  }),
  component: UploadPage,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-10 text-center text-muted-foreground">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-10 text-center">Page not found.</div>,
});

function UploadPage() {
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSubmit = async (file: File) => {
    setIsUploading(true);
    setError(null);
    abortRef.current = new AbortController();

    try {
      const song = await createSong({
        file,
        onProgress: setProgress,
        signal: abortRef.current.signal,
      });
      navigate({ to: "/processing/$songId", params: { songId: song.id } });
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setError("We couldn't read that file. Try another one.");
      }
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <main className="bg-stage flex min-h-screen flex-col bg-background px-5 py-8 sm:px-8">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center py-12">
        <h1 className="text-balance font-display text-3xl font-semibold sm:text-4xl">
          Add a song
        </h1>
        <p className="mt-3 text-muted-foreground">
          We'll analyze the vocals and build a synchronized lyric track for it.
        </p>

        <div className="mt-8">
          <UploadBox onSubmit={handleSubmit} isUploading={isUploading} progress={progress} />
        </div>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}
