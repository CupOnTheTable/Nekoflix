import { NextRequest, NextResponse } from "next/server";
import { loginUser, setSession } from "@/lib/auth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 60 * 1000;

function sanitizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function sanitizePassword(password: unknown): string | null {
  if (typeof password !== "string") return null;
  if (password.length < 1 || password.length > 128) return null;
  return password;
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limitResult = rateLimit(ip, LOGIN_LIMIT, LOGIN_WINDOW_MS, "login");
  if (!limitResult.success) {
    return rateLimitResponse(limitResult);
  }

  try {
    const body = await request.json();
    const email = sanitizeEmail(body.email);
    const password = sanitizePassword(body.password);

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await loginUser(email, password);
    await setSession(user.id);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Invalid credentials") {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
