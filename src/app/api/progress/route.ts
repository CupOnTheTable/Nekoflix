import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { animeId, episode, currentTime, duration, completed } = body;

    if (!animeId || typeof episode !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    await prisma.watchProgress.upsert({
      where: {
        userId_animeId_episode: {
          userId: user.id,
          animeId: Number(animeId),
          episode: Number(episode),
        },
      },
      update: {
        currentTime: typeof currentTime === "number" ? currentTime : undefined,
        duration: typeof duration === "number" ? duration : undefined,
        completed: typeof completed === "boolean" ? completed : undefined,
      },
      create: {
        userId: user.id,
        animeId: Number(animeId),
        episode: Number(episode),
        currentTime: typeof currentTime === "number" ? currentTime : 0,
        duration: typeof duration === "number" ? duration : 0,
        completed: typeof completed === "boolean" ? completed : false,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save progress" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const animeId = searchParams.get("animeId");
    const episode = searchParams.get("episode");

    if (!animeId || !episode) {
      return NextResponse.json({ error: "Missing params" }, { status: 400 });
    }

    const progress = await prisma.watchProgress.findUnique({
      where: {
        userId_animeId_episode: {
          userId: user.id,
          animeId: Number(animeId),
          episode: Number(episode),
        },
      },
    });

    return NextResponse.json({ ok: true, progress });
  } catch {
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
