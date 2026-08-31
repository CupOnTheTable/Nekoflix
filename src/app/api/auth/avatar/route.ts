import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("avatar") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use JPG, PNG, WebP or GIF" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    return NextResponse.json({ error: "File too large. Max 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${user.id}-${Date.now()}.${ext}`;
  const uploadDir = path.join(process.cwd(), "public", "avatars");

  await mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(uploadDir, filename), buffer);

  const avatarUrl = `/avatars/${filename}`;

  await prisma.user.update({
    where: { id: user.id },
    data: { avatar: avatarUrl },
  });

  return NextResponse.json({ ok: true, avatar: avatarUrl });
}
