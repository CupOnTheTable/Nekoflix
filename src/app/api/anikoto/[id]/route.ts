import { NextRequest, NextResponse } from "next/server";
import { getSeries, findSeriesByMalId } from "@/lib/anikoto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const seriesId = parseInt(id);

  if (isNaN(seriesId)) {
    return NextResponse.json({ ok: false, error: "Invalid ID" }, { status: 400 });
  }

  try {
    const raw = await getSeries(seriesId);
    const malId = (raw as unknown as { anime?: { mal_id?: string } })?.anime?.mal_id;
    const data = {
      ...raw,
      mal_id: malId || null,
    };
    return NextResponse.json({ ok: true, data });
  } catch {
    // If AniKoto ID fails, try looking up by MAL ID
    try {
      const found = await findSeriesByMalId(seriesId);
      if (found) {
        const data = await getSeries(found.s_id);
        return NextResponse.json({ ok: true, data });
      }
    } catch {
      // ignore
    }
    return NextResponse.json({ ok: false, error: "Series not found" }, { status: 404 });
  }
}
