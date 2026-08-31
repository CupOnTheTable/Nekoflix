import { NextResponse } from "next/server";
import { getRecentAnime } from "@/lib/anikoto";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const recent = await getRecentAnime(1, 30);
    return NextResponse.json({ ok: true, data: recent });
  } catch {
    return NextResponse.json({ ok: false, data: [] });
  }
}
