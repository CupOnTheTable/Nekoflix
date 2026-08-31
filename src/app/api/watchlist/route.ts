import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAnimeById } from "@/lib/anime-data";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.watchlist.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "desc" },
    });

    const itemsWithAnime = await Promise.all(
      items.map(async (item) => ({
        ...item,
        anime: await getAnimeById(item.animeId) || null,
      }))
    );

    return NextResponse.json({ items: itemsWithAnime });
  } catch (error) {
    console.error("Watchlist GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { animeId, status } = body;

    if (!animeId || typeof animeId !== "number") {
      return NextResponse.json(
        { error: "Valid animeId is required" },
        { status: 400 }
      );
    }

    const validStatuses = ["plan_to_watch", "watching", "completed", "on_hold", "dropped"];
    const watchlistStatus = validStatuses.includes(status) ? status : "plan_to_watch";

    const existing = await prisma.watchlist.findUnique({
      where: { userId_animeId: { userId: user.id, animeId } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Anime already in watchlist" },
        { status: 409 }
      );
    }

    const item = await prisma.watchlist.create({
      data: {
        userId: user.id,
        animeId,
        status: watchlistStatus,
      },
    });

    const anime = await getAnimeById(animeId) || null;

    return NextResponse.json({ item: { ...item, anime } }, { status: 201 });
  } catch (error) {
    console.error("Watchlist POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, progress, score } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.watchlist.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (progress !== undefined) updateData.progress = progress;
    if (score !== undefined) updateData.score = score;

    const item = await prisma.watchlist.update({
      where: { id },
      data: updateData,
    });

    const anime = await getAnimeById(item.animeId) || null;

    return NextResponse.json({ item: { ...item, anime } });
  } catch (error) {
    console.error("Watchlist PUT error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Valid id is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.watchlist.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Watchlist item not found" },
        { status: 404 }
      );
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.watchlist.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Watchlist DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
