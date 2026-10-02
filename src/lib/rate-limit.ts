import { NextRequest, NextResponse } from "next/server";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const cache = new Map<string, RateLimitEntry>();

function getKey(identifier: string, prefix: string): string {
  return `${prefix}:${identifier}`;
}

function cleanup(now = Date.now()): void {
  for (const [key, entry] of cache.entries()) {
    if (entry.resetAt < now) {
      cache.delete(key);
    }
  }
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export function rateLimit(
  identifier: string,
  limit: number,
  windowMs: number,
  prefix = "rl"
): RateLimitResult {
  cleanup();
  const now = Date.now();
  const key = getKey(identifier, prefix);
  const entry = cache.get(key);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    cache.set(key, { count: 1, resetAt });
    return { success: true, limit, remaining: limit - 1, reset: resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, limit, remaining: 0, reset: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, limit, remaining: limit - entry.count, reset: entry.resetAt };
}

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    }
  );
}
