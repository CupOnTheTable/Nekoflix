"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw, Home } from "lucide-react";
import { ERRORS } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex flex-col items-center text-center">
          <AlertTriangle className="h-16 w-16 text-red-500" />
          <h1 className="mt-6 text-3xl font-black text-foreground">{ERRORS.generic}</h1>
          <p className="mt-2 max-w-md text-muted">
            {error.message || "An unexpected error occurred. Please try again."}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
            >
              <RotateCw className="h-4 w-4" />
              {ERRORS.retry}
            </button>
            <a
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-surface px-5 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-surface-hover"
            >
              <Home className="h-4 w-4" />
              {ERRORS.goHome}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
