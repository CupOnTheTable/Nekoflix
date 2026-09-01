import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface AniSkipResult {
  interval: { startTime: number; endTime: number };
  skipType: string;
  episodeLength: number;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const malId = searchParams.get("malId");
  const ep = searchParams.get("ep");
  const duration = searchParams.get("duration");

  if (!malId || !ep) {
    return NextResponse.json({ error: "malId and ep required" }, { status: 400 });
  }

  const epNum = parseInt(ep);
  const dur = parseInt(duration || "1400");

  try {
    const types = ["op", "ed"];
    const typeParams = types.map((t) => `types=${t}`).join("&");
    const url = `https://api.aniskip.com/v2/skip-times/${malId}/${epNum}?${typeParams}&episodeLength=${dur}`;

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    const data = await res.json();

    if (!data.found || !data.results?.length) {
      return NextResponse.json({ ok: true, intro: null, outro: null });
    }

    let intro = null;
    let outro = null;

    for (const r of data.results as AniSkipResult[]) {
      if (r.skipType === "op" && !intro) {
        intro = { start: r.interval.startTime, end: r.interval.endTime };
      }
      if (r.skipType === "ed" && !outro) {
        outro = { start: r.interval.startTime, end: r.interval.endTime };
      }
    }

    return NextResponse.json({ ok: true, intro, outro });
  } catch {
    return NextResponse.json({ ok: true, intro: null, outro: null });
  }
}
