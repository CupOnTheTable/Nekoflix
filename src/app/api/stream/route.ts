import { NextRequest, NextResponse } from "next/server";
import { getEpisodeSources, defaultProviderRegistry } from "@/lib/streaming";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const STREAM_LIMIT = 30;
const STREAM_WINDOW_MS = 60 * 1000;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const limitResult = rateLimit(ip, STREAM_LIMIT, STREAM_WINDOW_MS, "stream");
  if (!limitResult.success) {
    return rateLimitResponse(limitResult);
  }

  const { searchParams } = new URL(req.url);
  const malId = searchParams.get("malId");
  const aniListId = searchParams.get("aniListId");
  const title = searchParams.get("title") || undefined;
  const episode = searchParams.get("episode");
  const language = (searchParams.get("lang") as "sub" | "dub") || "sub";
  const debug = searchParams.get("debug") === "1";

  if (!malId && !aniListId) {
    return NextResponse.json(
      { error: "malId or aniListId required" },
      { status: 400 }
    );
  }

  try {
    const ctx = {
      malId: malId ? Number(malId) : undefined,
      aniListId: aniListId ? Number(aniListId) : undefined,
      title,
      episode: episode ? Number(episode) : 1,
      language,
    };
    console.log("[stream] resolving", JSON.stringify(ctx));
    const result = await getEpisodeSources(ctx, defaultProviderRegistry, true);
    console.log("[stream] providers", JSON.stringify(result.debug));

    if (result.sources.length === 0) {
      const response: Record<string, unknown> = { error: "No stream sources found" };
      if (debug) response.debug = result.debug;
      return NextResponse.json(response, { status: 404 });
    }

    const response: Record<string, unknown> = { ok: true, ...result };
    if (!debug) delete response.debug;
    return NextResponse.json(response);
  } catch (err: unknown) {
    console.error("[stream] error", err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stream resolution failed" },
      { status: 500 }
    );
  }
}
