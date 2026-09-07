import { NextRequest, NextResponse } from "next/server";
import { getAiringToday } from "@/lib/anime-data";

export async function GET(request: NextRequest) {
  try {
    const anime = await getAiringToday("all");

    return NextResponse.json({ anime }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, max-age=60",
      },
    });
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error", anime: [] },
      { status: 500 }
    );
  }
}
