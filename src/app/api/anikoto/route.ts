import { NextRequest, NextResponse } from "next/server";
import { getRecentAnime, searchAnimeAniKoto } from "@/lib/anikoto";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");
  const page = parseInt(searchParams.get("page") || "1");
  const perPage = parseInt(searchParams.get("per_page") || "20");

  try {
    if (q) {
      const results = await searchAnimeAniKoto(q);
      return NextResponse.json({ ok: true, data: results, total: results.length });
    }
    const data = await getRecentAnime(page, perPage);
    return NextResponse.json({ ok: true, data, total: data.length });
  } catch {
    return NextResponse.json({ ok: false, data: [], error: "Failed to fetch" }, { status: 500 });
  }
}
