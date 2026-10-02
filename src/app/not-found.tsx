import Link from "next/link";
import { Home, AlertTriangle } from "lucide-react";
import { ERRORS } from "@/lib/i18n";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-16 w-16 text-muted" />
      <h1 className="mt-6 text-4xl font-black text-foreground">{ERRORS.notFound}</h1>
      <p className="mt-2 max-w-md text-muted">{ERRORS.notFoundDescription}</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent-hover"
      >
        <Home className="h-4 w-4" />
        {ERRORS.goHome}
      </Link>
    </div>
  );
}
