import { NextRequest, NextResponse } from "next/server";
import { getEpisodeSources } from "@/lib/streaming";
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

  if (!malId && !aniListId) {
    return NextResponse.json(
      { error: "malId or aniListId required" },
      { status: 400 }
    );
  }

  try {
    const result = await getEpisodeSources({
      malId: malId ? Number(malId) : undefined,
      aniListId: aniListId ? Number(aniListId) : undefined,
      title,
      episode: episode ? Number(episode) : 1,
      language,
    });

    if (result.sources.length === 0) {
      return NextResponse.json(
        { error: "No stream sources found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stream resolution failed" },
      { status: 500 }
    );
  }
}
