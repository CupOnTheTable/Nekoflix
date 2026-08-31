import { NextRequest, NextResponse } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const embedId = searchParams.get("embedId");
  const language = searchParams.get("lang") || "sub";

  if (!embedId) {
    return NextResponse.json({ error: "embedId required" }, { status: 400 });
  }

  try {
    const embedUrl = `https://megaplay.buzz/stream/s-2/${embedId}/${language}`;

    const pageRes = await fetch(embedUrl, {
      headers: { "User-Agent": UA, "Referer": "https://megaplay.buzz/" },
    });

    if (!pageRes.ok) {
      return NextResponse.json({ error: `Embed page ${pageRes.status}` }, { status: 502 });
    }

    const html = await pageRes.text();
    const dataIdMatch = html.match(/data-id="(\d+)"/);
    if (!dataIdMatch) {
      return NextResponse.json({ error: "No data-id found" }, { status: 502 });
    }

    const dataId = dataIdMatch[1];

    const sourceRes = await fetch(`https://megaplay.buzz/stream/getSources?id=${dataId}`, {
      headers: {
        "Referer": "https://megaplay.buzz/",
        "X-Requested-With": "XMLHttpRequest",
        "User-Agent": UA,
      },
    });

    if (!sourceRes.ok) {
      return NextResponse.json({ error: `Source API ${sourceRes.status}` }, { status: 502 });
    }

    const sourceData = await sourceRes.json();
    const streamUrl = sourceData.sources?.file;

    if (!streamUrl) {
      return NextResponse.json({ error: "No stream URL" }, { status: 502 });
    }

    const proxyUrl = `/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`;

    return NextResponse.json({
      ok: true,
      stream: {
        url: proxyUrl,
        rawUrl: streamUrl,
        intro: sourceData.intro || { start: 0, end: 0 },
        outro: sourceData.outro || { start: 0, end: 0 },
      },
      embedUrl,
      subtitles: (sourceData.tracks || [])
        .filter((t: { kind?: string }) => t.kind === "captions")
        .map((t: { file: string; label: string; default?: boolean }) => ({
          url: `/api/stream/proxy?url=${encodeURIComponent(t.file)}`,
          label: t.label,
          default: t.default || false,
        })),
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Stream resolution failed" },
      { status: 500 }
    );
  }
}
