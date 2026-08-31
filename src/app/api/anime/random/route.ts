import { NextRequest, NextResponse } from "next/server";
import { getRandomAnime } from "@/lib/anime-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const genres = searchParams.get("genres")?.split(",").filter(Boolean);
    const minScore = searchParams.get("minScore") ? parseFloat(searchParams.get("minScore")!) : undefined;
    const format = searchParams.get("format")?.split(",").filter(Boolean);
    const status = searchParams.get("status")?.split(",").filter(Boolean);

    const constraints: {
      genres?: string[];
      minScore?: number;
      format?: string[];
      status?: string[];
    } = {};
    if (genres?.length) constraints.genres = genres;
    if (minScore !== undefined && minScore > 0) constraints.minScore = minScore;
    if (format?.length) constraints.format = format;
    if (status?.length) constraints.status = status;

    const anime = await getRandomAnime(
      Object.keys(constraints).length > 0 ? constraints : undefined
    );

    return NextResponse.json({ anime });
  } catch (error) {
    console.error("Random anime error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
