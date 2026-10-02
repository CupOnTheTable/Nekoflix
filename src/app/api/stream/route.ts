import { NextRequest, NextResponse } from "next/server";
import { getEpisodeSources } from "@/lib/streaming";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const malId = searchParams.get("malId");
  const aniListId = searchParams.get("aniListId");
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
