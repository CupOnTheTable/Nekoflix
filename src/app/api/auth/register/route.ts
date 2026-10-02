import { NextRequest, NextResponse } from "next/server";
import { createUser, setSession } from "@/lib/auth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const REGISTER_LIMIT = 3;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizeName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 50) return null;
  return trimmed;
}

function sanitizePassword(password: unknown): string | null {
  if (typeof password !== "string") return null;
  if (password.length < 6 || password.length > 128) return null;
  return password;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limitResult = rateLimit(ip, REGISTER_LIMIT, REGISTER_WINDOW_MS, "register");
  if (!limitResult.success) {
    return rateLimitResponse(limitResult);
  }

  try {
    const body = await request.json();
    const email = sanitizeEmail(body.email);
    const name = sanitizeName(body.name);
    const password = sanitizePassword(body.password);

    if (!email || !name || !password) {
      return NextResponse.json(
        { error: "Valid email, name, and password (6+ chars) are required" },
        { status: 400 }
      );
    }

    const user = await createUser(email, name, password);
    await setSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Email already registered") {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
