import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function extractDriveId(url: string): string | null {
  const patterns = [
    /\/file\/d\/([a-zA-Z0-9_-]+)/,
    /[?&]id=([a-zA-Z0-9_-]+)/,
    /\/drive\/folders\/([a-zA-Z0-9_-]+)/,
    /\/open\?id=([a-zA-Z0-9_-]+)/,
    /drive\.google\.com\/([a-zA-Z0-9_-]{20,})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  if (/^[a-zA-Z0-9_-]{20,}$/.test(url)) return url;
  return null;
}

function getStreamUrl(driveUrl: string): string {
  const id = extractDriveId(driveUrl);
  if (!id) return driveUrl;
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

function getEmbedUrl(driveUrl: string): string {
  const id = extractDriveId(driveUrl);
  if (!id) return "";
  return `https://drive.google.com/file/d/${id}/preview`;
}

function getThumbnailUrl(driveUrl: string): string {
  const id = extractDriveId(driveUrl);
  if (!id) return "";
  return `https://drive.google.com/thumbnail?id=${id}&sz=w400`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const videos = await prisma.personalVideo.findMany({
      where: { userId: user.id },
      orderBy: { addedAt: "desc" },
    });

    const enriched = videos.map((v) => ({
      ...v,
      streamUrl: getStreamUrl(v.driveUrl),
      embedUrl: getEmbedUrl(v.driveUrl),
      thumbnailUrl: v.thumbnail || getThumbnailUrl(v.driveUrl),
    }));

    return NextResponse.json({ videos: enriched });
  } catch (error) {
    console.error("Videos GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, driveUrl, thumbnail, duration } = body;

    if (!title || !driveUrl) {
      return NextResponse.json({ error: "Title and URL are required" }, { status: 400 });
    }

    const id = extractDriveId(driveUrl);
    if (!id) {
      return NextResponse.json({ error: "Invalid Google Drive URL" }, { status: 400 });
    }

    const video = await prisma.personalVideo.create({
      data: {
        userId: user.id,
        title,
        driveUrl,
        thumbnail: thumbnail || getThumbnailUrl(driveUrl),
        duration: duration || null,
      },
    });

    return NextResponse.json({
      video: {
        ...video,
        streamUrl: getStreamUrl(video.driveUrl),
        embedUrl: getEmbedUrl(video.driveUrl),
        thumbnailUrl: video.thumbnail || getThumbnailUrl(video.driveUrl),
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Videos POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const existing = await prisma.personalVideo.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.personalVideo.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Videos DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
