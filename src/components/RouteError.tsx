import { Link } from "@tanstack/react-router";

/** A calm, consistent fallback for route-level rendering failures. */
export function RouteError() {
  return (
    <main
      className="bg-stage flex min-h-[60vh] flex-col items-center justify-center bg-background px-5 py-16 text-center"
      role="alert"
    >
      <div className="max-w-md">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">LyricFlow</p>
        <h1 className="mt-3 font-display text-2xl font-semibold">This page couldn’t load</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Something went wrong while opening this page. Try again, or return to your listening room.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <Link
            to="/"
            className="rounded-full border border-glass-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-glass"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  );
}
