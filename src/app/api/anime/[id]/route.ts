import { NextRequest, NextResponse } from "next/server";
import { getAnimeById } from "@/lib/anime-data";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const animeId = parseInt(id, 10);
    if (isNaN(animeId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    const anime = await getAnimeById(animeId);
    if (!anime) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ anime });
  } catch (error) {
    console.error("Anime detail error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
