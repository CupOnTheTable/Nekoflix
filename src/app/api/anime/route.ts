import { NextRequest, NextResponse } from "next/server";
import { fetchAnimeSearch } from "@/lib/jikan";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q") || "";
    const genres = searchParams.get("genres")?.split(",").filter(Boolean);
    const status = searchParams.get("status")?.split(",").filter(Boolean);
    const format = searchParams.get("format")?.split(",").filter(Boolean);
    const yearFrom = searchParams.get("yearFrom") ? parseInt(searchParams.get("yearFrom")!, 10) : undefined;
    const yearTo = searchParams.get("yearTo") ? parseInt(searchParams.get("yearTo")!, 10) : undefined;
    const minScore = searchParams.get("minScore") ? parseFloat(searchParams.get("minScore")!) : undefined;
    const sort = searchParams.get("sort") || (!q ? "popularity" : undefined);
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;

    const results = await fetchAnimeSearch(q, {
      genres,
      status,
      format,
      yearFrom,
      yearTo,
      sort,
      page,
      limit: 25,
    });

    return NextResponse.json({
      anime: results.data,
      total: results.total,
      page,
      totalPages: Math.ceil(results.total / 25),
    });
  } catch (error) {
    console.error("Anime search error:", error);
    return NextResponse.json({ anime: [], total: 0, page: 1, totalPages: 0 });
  }
}
