import { NextRequest } from "next/server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const dynamic = "force-dynamic";

// MegaPlay strips the first 252 bytes of segments from these CDNs
const STRIP_HOSTS = /ibyteimg\.com|tiktokcdn\.com|ipstatp\.com|yoot\.akirax\.buzz/i;
const STRIP_BYTES = 252;

function toAbsoluteUrl(relativeOrAbsolute: string, base: string): string {
  const trimmed = relativeOrAbsolute.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return base + trimmed;
}

function shouldStripSegments(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return STRIP_HOSTS.test(host);
  } catch {
    return false;
  }
}

function getProxyHeaders(targetUrl: string): Record<string, string> {
  try {
    const host = new URL(targetUrl).hostname.toLowerCase();
    if (host.includes("megaplay") || host.includes("nexabloom") || host.includes("ivorysummit") || host.includes("akirax")) {
      return {
        "User-Agent": UA,
        "Accept": "*/*",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://megaplay.buzz/",
        "Origin": "https://megaplay.buzz",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "cross-site",
      };
    }
  } catch {
    // fall through
  }
  return {
    "User-Agent": UA,
    "Accept": "*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": targetUrl,
    "Origin": "*",
  };
}

function rewriteM3u8(content: string, originalUrl: string, proxyBase: string): string {
  const base = originalUrl.substring(0, originalUrl.lastIndexOf("/") + 1);
  return content
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      // Rewrite AES-128 key URIs
      if (trimmed.startsWith("#EXT-X-KEY")) {
        return line.replace(/URI="([^"]+)"/, (_, uri) => {
          const absolute = toAbsoluteUrl(uri, base);
          return `URI="${proxyBase}?url=${encodeURIComponent(absolute)}"`;
        });
      }

      if (trimmed.startsWith("#")) return line;
      const absolute = toAbsoluteUrl(trimmed, base);
      return `${proxyBase}?url=${encodeURIComponent(absolute)}`;
    })
    .join("\n");
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new Response("url required", { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, { headers: getProxyHeaders(targetUrl) });

    if (!res.ok) {
      return new Response(`Upstream ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const isM3u8 = contentType.includes("mpegurl") || targetUrl.includes(".m3u8");
    const isVtt = contentType.includes("webvtt") || targetUrl.includes(".vtt");

    if (isM3u8) {
      const text = await res.text();
      const proxyBase = new URL(req.url).origin + "/api/stream/proxy";
      const rewritten = rewriteM3u8(text, targetUrl, proxyBase);
      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    if (isVtt) {
      const text = await res.text();
      return new Response(text, {
        status: 200,
        headers: {
          "Content-Type": "text/vtt; charset=utf-8",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        },
      });
    }

    let body = await res.arrayBuffer();

    // MegaPlay strips the first 252 bytes from segments hosted on certain CDNs
    if (shouldStripSegments(targetUrl) && body.byteLength > STRIP_BYTES) {
      body = body.slice(STRIP_BYTES);
    }

    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=86400",
    };

    const contentLength = res.headers.get("content-length");
    if (contentLength) headers["Content-Length"] = String(body.byteLength);

    return new Response(body, { status: 200, headers });
  } catch (err: unknown) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Proxy failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
