import { NextRequest, NextResponse } from "next/server";
import { searchSuggestions } from "@/lib/jikan";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q");

  if (!q || q.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const suggestions = await searchSuggestions(q);
  return NextResponse.json({ suggestions });
}
