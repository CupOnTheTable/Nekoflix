import { NextRequest, NextResponse } from "next/server";
import { getAiringToday } from "@/lib/anime-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const day = searchParams.get("day") || "Monday";

    const anime = await getAiringToday(day);

    return NextResponse.json({ anime });
  } catch (error) {
    console.error("Schedule error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
