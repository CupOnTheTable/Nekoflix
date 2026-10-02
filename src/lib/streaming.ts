import {
  findSeriesByMalId,
  getMegaPlayUrl,
  getMegaPlayUrlByAniList,
  getMegaPlayUrlByMal,
  getSeries,
} from "./anikoto";
import { createDecipheriv } from "crypto";

const CONSUMET_BASE =
  process.env.CONSUMET_API_URL || "https://api.consumet.org";

const AMVSTRM_BASE =
  process.env.AMVSTRM_API_URL || "https://api.amvstr.me";

const MEGAPLAY_AES_KEY = "i?LMTAx0Q6,:}50U";
const MEGAPLAY_AES_IV = "W0;27ToaUpl_P%'c";

export interface StreamSource {
  provider: string;
  label: string;
  url: string;
  intro: { start: number; end: number } | null;
  outro: { start: number; end: number } | null;
  subtitles: { url: string; label: string; default?: boolean }[];
  headers?: Record<string, string>;
}

export interface EpisodeSourcesResult {
  sources: StreamSource[];
  episodes: { number: number; title: string | null; thumbnail: string | null }[];
  debug?: { provider: string; status: string; detail?: string }[];
}

export interface SourceContext {
  malId?: number;
  aniListId?: number;
  title?: string;
  episode?: number;
  language?: "sub" | "dub";
}

export interface StreamProvider {
  readonly name: string;
  getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]>;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function padBuffer(str: string, len: number): Buffer {
  const buf = Buffer.alloc(len);
  const encoded = Buffer.from(str, "utf8");
  encoded.copy(buf, 0, 0, Math.min(len, encoded.length));
  return buf;
}

function decryptMegaPlaySource(encrypted: string): string | null {
  try {
    const base64 = encrypted.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    const padded = pad ? base64 + "=".repeat(4 - pad) : base64;
    const encryptedBuf = Buffer.from(padded, "base64");
    const decipher = createDecipheriv(
      "aes-256-cbc",
      padBuffer(MEGAPLAY_AES_KEY, 32),
      padBuffer(MEGAPLAY_AES_IV, 16)
    );
    const decrypted = Buffer.concat([
      decipher.update(encryptedBuf),
      decipher.final(),
    ]);
    const parsed = JSON.parse(decrypted.toString("utf8"));
    return parsed.file || parsed.url || null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 10000
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

class MegaPlayProvider implements StreamProvider {
  readonly name = "megaPlay";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    const episode = ctx.episode ?? 1;
    const language = ctx.language ?? "sub";

    const urls: string[] = [];

    // Try AniKoto embed_url first if we can find the series by MAL id
    if (ctx.malId) {
      try {
        const seriesInfo = await findSeriesByMalId(ctx.malId);
        if (seriesInfo) {
          const series = await getSeries(seriesInfo.id);
          const ep = series?.episodes?.find((e) => e.number === episode);
          if (ep?.embed_url?.[language]) {
            urls.push(ep.embed_url[language]!);
          } else if (ep?.episode_embed_id) {
            urls.push(getMegaPlayUrl(ep.episode_embed_id, language));
          }
        }
      } catch {
        // ignore and fall through
      }
    }

    if (ctx.malId) {
      urls.push(getMegaPlayUrlByMal(ctx.malId, episode, language));
    }
    if (ctx.aniListId) {
      urls.push(getMegaPlayUrlByAniList(ctx.aniListId, episode, language));
    }

    const sources: StreamSource[] = [];
    for (const megaplayUrl of urls) {
      try {
        const resolved = await this.resolveMegaPlayUrl(megaplayUrl);
        if (resolved) sources.push(resolved);
      } catch {
        // continue to next URL
      }
    }

    return sources;
  }

  private async resolveMegaPlayUrl(megaplayUrl: string): Promise<StreamSource | null> {
    const pageRes = await fetchWithTimeout(megaplayUrl, {
      headers: { "User-Agent": UA, Referer: "https://megaplay.buzz/" },
    });

    if (!pageRes.ok) return null;

    const html = await pageRes.text();
    const dataIdMatch = html.match(/data-id="(\d+)"/);
    if (!dataIdMatch) return null;

    const dataId = dataIdMatch[1];

    const sourceRes = await fetchWithTimeout(
      `https://megaplay.buzz/stream/getSourcesNew?id=${dataId}`,
      {
        headers: {
          "User-Agent": UA,
          Referer: "https://megaplay.buzz/",
          "X-Requested-With": "XMLHttpRequest",
        },
      }
    );

    if (!sourceRes.ok) return null;

    const sourceData = await sourceRes.json();
    let streamUrl = sourceData.sources?.file;

    if (!streamUrl && sourceData.enc) {
      streamUrl = decryptMegaPlaySource(sourceData.enc);
    }
    if (!streamUrl && sourceData.p) {
      streamUrl = decryptMegaPlaySource(sourceData.p);
    }
    if (!streamUrl) return null;

    return {
      provider: this.name,
      label: "Server 1",
      url: `/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`,
      intro: sourceData.intro || null,
      outro: sourceData.outro || null,
      subtitles: (sourceData.tracks || [])
        .filter((t: { kind?: string }) => t.kind === "captions")
        .map((t: { file: string; label: string; default?: boolean }) => ({
          url: `/api/stream/proxy?url=${encodeURIComponent(t.file)}`,
          label: t.label,
          default: t.default || false,
        })),
    };
  }
}

class MegaPlayBackupProvider implements StreamProvider {
  readonly name = "megaPlayBackup";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    const episode = ctx.episode ?? 1;
    const language = ctx.language ?? "sub";
    const urls: string[] = [];

    if (ctx.malId) {
      urls.push(`https://megaplay.buzz/stream/mal/${ctx.malId}/${episode}/${language}`);
    }
    if (ctx.aniListId) {
      urls.push(`https://megaplay.buzz/stream/ani/${ctx.aniListId}/${episode}/${language}`);
    }

    const sources: StreamSource[] = [];
    for (const url of urls) {
      try {
        const pageRes = await fetchWithTimeout(url, {
          headers: { "User-Agent": UA, Referer: "https://megaplay.buzz/" },
        });
        if (!pageRes.ok) continue;
        const html = await pageRes.text();
        const dataIdMatch = html.match(/data-id="(\d+)"/);
        if (!dataIdMatch) continue;

        const sourceRes = await fetchWithTimeout(
          `https://megaplay.buzz/stream/getSourcesNew?id=${dataIdMatch[1]}`,
          {
            headers: {
              "User-Agent": UA,
              Referer: "https://megaplay.buzz/",
              "X-Requested-With": "XMLHttpRequest",
            },
          }
        );
        if (!sourceRes.ok) continue;
        const data = await sourceRes.json();
        let streamUrl = data.sources?.file;
        if (!streamUrl && data.enc) streamUrl = decryptMegaPlaySource(data.enc);
        if (!streamUrl && data.p) streamUrl = decryptMegaPlaySource(data.p);
        if (!streamUrl) continue;

        sources.push({
          provider: this.name,
          label: "Server 2",
          url: `/api/stream/proxy?url=${encodeURIComponent(streamUrl)}`,
          intro: data.intro || null,
          outro: data.outro || null,
          subtitles: (data.tracks || [])
            .filter((t: { kind?: string }) => t.kind === "captions")
            .map((t: { file: string; label: string; default?: boolean }) => ({
              url: `/api/stream/proxy?url=${encodeURIComponent(t.file)}`,
              label: t.label,
              default: t.default || false,
            })),
        });
      } catch {
        // continue
      }
    }

    return sources;
  }
}

class AmvstrmProvider implements StreamProvider {
  readonly name = "amvstrm";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    if (!ctx.title) return [];
    const episode = ctx.episode ?? 1;

    try {
      // Search by title
      const searchRes = await fetchWithTimeout(
        `${AMVSTRM_BASE}/api/v2/search?q=${encodeURIComponent(ctx.title)}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        10000
      );
      if (!searchRes.ok) return [];
      const searchData = (await searchRes.json()) as {
        status?: boolean;
        results?: Array<{ id: string; title: string; jp_title?: string }>;
      };
      if (!searchData.status || !searchData.results?.length) return [];

      // Try to find the best match
      const query = ctx.title.toLowerCase();
      let match = searchData.results[0];
      for (const result of searchData.results) {
        const t = (result.title || result.jp_title || "").toLowerCase();
        if (t === query || query.includes(t) || t.includes(query)) {
          match = result;
          break;
        }
      }

      // Get episodes
      const epRes = await fetchWithTimeout(
        `${AMVSTRM_BASE}/api/v2/episode/${match.id}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        10000
      );
      if (!epRes.ok) return [];
      const epData = (await epRes.json()) as {
        status?: boolean;
        episodes?: Array<{ id: string; number: number; title?: string }>;
      };
      const ep = epData.episodes?.find((e) => e.number === episode);
      if (!ep) return [];

      // Get stream sources
      const streamRes = await fetchWithTimeout(
        `${AMVSTRM_BASE}/api/v2/stream/${ep.id}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        10000
      );
      if (!streamRes.ok) return [];
      const streamData = (await streamRes.json()) as {
        status?: boolean;
        streams?: Array<{ url: string; quality: string; isM3U8?: boolean; type?: string }>;
        subtitles?: Array<{ url: string; lang: string }>;
      };

      const sources: StreamSource[] = [];
      for (const stream of streamData.streams || []) {
        if (!stream.url) continue;
        sources.push({
          provider: this.name,
          label: `AMVstrm ${stream.quality || "Auto"}${stream.type ? ` (${stream.type})` : ""}`,
          url: stream.isM3U8 !== false && stream.url.includes(".m3u8")
            ? `/api/stream/proxy?url=${encodeURIComponent(stream.url)}`
            : stream.url,
          intro: null,
          outro: null,
          subtitles: (streamData.subtitles || [])
            .filter((s) => s.url)
            .map((s) => ({
              url: `/api/stream/proxy?url=${encodeURIComponent(s.url)}`,
              label: s.lang,
            })),
        });
      }

      return sources;
    } catch {
      return [];
    }
  }
}

class ConsumetGogoProvider implements StreamProvider {
  readonly name = "consumetGogo";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    if (!ctx.title) return [];
    const episode = ctx.episode ?? 1;

    try {
      // Search Gogoanime by title
      const searchRes = await fetchWithTimeout(
        `${CONSUMET_BASE}/anime/gogoanime/${encodeURIComponent(ctx.title)}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        8000
      );
      if (!searchRes.ok) return [];
      const searchData = (await searchRes.json()) as {
        results?: Array<{ id: string; title: string }>;
      };
      const first = searchData.results?.[0];
      if (!first) return [];

      // Get episode list
      const infoRes = await fetchWithTimeout(
        `${CONSUMET_BASE}/anime/gogoanime/info/${first.id}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        8000
      );
      if (!infoRes.ok) return [];
      const infoData = (await infoRes.json()) as {
        episodes?: Array<{ id: string; number: number }>;
      };
      const ep = infoData.episodes?.find((e) => e.number === episode);
      if (!ep) return [];

      // Get streaming links
      const watchRes = await fetchWithTimeout(
        `${CONSUMET_BASE}/anime/gogoanime/watch/${ep.id}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        8000
      );
      if (!watchRes.ok) return [];
      const watchData = (await watchRes.json()) as {
        sources?: Array<{ url: string; quality: string; isM3U8?: boolean }>;
        subtitles?: Array<{ url: string; lang: string }>;
      };

      const sources: StreamSource[] = [];
      for (const src of watchData.sources || []) {
        if (!src.url) continue;
        sources.push({
          provider: this.name,
          label: `Gogo ${src.quality || "Auto"}`,
          url: src.isM3U8
            ? `/api/stream/proxy?url=${encodeURIComponent(src.url)}`
            : src.url,
          intro: null,
          outro: null,
          subtitles: (watchData.subtitles || [])
            .filter((s) => s.url)
            .map((s) => ({
              url: `/api/stream/proxy?url=${encodeURIComponent(s.url)}`,
              label: s.lang,
            })),
        });
      }

      return sources;
    } catch {
      return [];
    }
  }
}

class ConsumetZoroProvider implements StreamProvider {
  readonly name = "consumetZoro";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    if (!ctx.title) return [];
    const episode = ctx.episode ?? 1;

    try {
      const searchRes = await fetchWithTimeout(
        `${CONSUMET_BASE}/anime/zoro/${encodeURIComponent(ctx.title)}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        8000
      );
      if (!searchRes.ok) return [];
      const searchData = (await searchRes.json()) as {
        results?: Array<{ id: string; title: string }>;
      };
      const first = searchData.results?.[0];
      if (!first) return [];

      const infoRes = await fetchWithTimeout(
        `${CONSUMET_BASE}/anime/zoro/info?id=${encodeURIComponent(first.id)}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        8000
      );
      if (!infoRes.ok) return [];
      const infoData = (await infoRes.json()) as {
        episodes?: Array<{ id: string; number: number; title?: string }>;
      };
      const ep = infoData.episodes?.find((e) => e.number === episode);
      if (!ep) return [];

      const watchRes = await fetchWithTimeout(
        `${CONSUMET_BASE}/anime/zoro/watch?episodeId=${encodeURIComponent(
          ep.id
        )}&mediaId=${encodeURIComponent(first.id)}`,
        { headers: { "User-Agent": UA, Accept: "application/json" } },
        8000
      );
      if (!watchRes.ok) return [];
      const watchData = (await watchRes.json()) as {
        sources?: Array<{ url: string; quality: string; isM3U8?: boolean }>;
        subtitles?: Array<{ url: string; lang: string }>;
      };

      const sources: StreamSource[] = [];
      for (const src of watchData.sources || []) {
        if (!src.url) continue;
        sources.push({
          provider: this.name,
          label: `Zoro ${src.quality || "Auto"}`,
          url: src.isM3U8
            ? `/api/stream/proxy?url=${encodeURIComponent(src.url)}`
            : src.url,
          intro: null,
          outro: null,
          subtitles: (watchData.subtitles || [])
            .filter((s) => s.url)
            .map((s) => ({
              url: `/api/stream/proxy?url=${encodeURIComponent(s.url)}`,
              label: s.lang,
            })),
        });
      }

      return sources;
    } catch {
      return [];
    }
  }
}

class VidSrcProvider implements StreamProvider {
  readonly name = "vidSrc";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    const episode = ctx.episode ?? 1;
    const ids: string[] = [];
    if (ctx.malId) ids.push(String(ctx.malId));
    if (ctx.aniListId) ids.push(String(ctx.aniListId));
    if (ids.length === 0) return [];

    const sources: StreamSource[] = [];
    for (const id of ids) {
      sources.push({
        provider: this.name,
        label: "VidSrc",
        url: `https://vidsrc.cc/v2/embed/anime/${id}/${episode}`,
        intro: null,
        outro: null,
        subtitles: [],
      });
      sources.push({
        provider: this.name,
        label: "VidSrc XYZ",
        url: `https://vidsrc.xyz/embed/anime/${id}/${episode}`,
        intro: null,
        outro: null,
        subtitles: [],
      });
    }
    return sources;
  }
}

class EmbedSuProvider implements StreamProvider {
  readonly name = "embedSu";

  async getEpisodeSources(ctx: SourceContext): Promise<StreamSource[]> {
    const episode = ctx.episode ?? 1;
    if (!ctx.malId) return [];
    return [{
      provider: this.name,
      label: "EmbedSu",
      url: `https://embed.su/embed/anime/${ctx.malId}/${episode}`,
      intro: null,
      outro: null,
      subtitles: [],
    }];
  }
}

export const megaPlayProvider = new MegaPlayProvider();
export const megaPlayBackupProvider = new MegaPlayBackupProvider();
export const amvstrmProvider = new AmvstrmProvider();
export const consumetGogoProvider = new ConsumetGogoProvider();
export const consumetZoroProvider = new ConsumetZoroProvider();
export const vidSrcProvider = new VidSrcProvider();
export const embedSuProvider = new EmbedSuProvider();

export class ProviderRegistry {
  private providers: StreamProvider[] = [];

  register(provider: StreamProvider): this {
    this.providers.push(provider);
    return this;
  }

  async resolve(ctx: SourceContext, debug = false): Promise<EpisodeSourcesResult> {
    const allSources: StreamSource[] = [];
    const debugInfo: { provider: string; status: string; detail?: string }[] = [];

    for (const provider of this.providers) {
      try {
        const sources = await provider.getEpisodeSources(ctx);
        const added = sources.filter((src) => !allSources.find((s) => s.url === src.url));
        for (const src of added) allSources.push(src);
        if (debug) {
          debugInfo.push({
            provider: provider.name,
            status: sources.length > 0 ? "ok" : "empty",
            detail: sources.length > 0 ? `${sources.length} source(s)` : "no sources",
          });
        }
      } catch (err) {
        if (debug) {
          debugInfo.push({
            provider: provider.name,
            status: "error",
            detail: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const result: EpisodeSourcesResult = { sources: allSources, episodes: [] };
    if (debug) result.debug = debugInfo;
    return result;
  }
}

export const defaultProviderRegistry = new ProviderRegistry()
  .register(megaPlayProvider)
  .register(megaPlayBackupProvider)
  .register(amvstrmProvider)
  .register(consumetGogoProvider)
  .register(consumetZoroProvider)
  .register(vidSrcProvider)
  .register(embedSuProvider);

export async function getEpisodeSources(
  ctx: SourceContext,
  registry = defaultProviderRegistry,
  debug = false
): Promise<EpisodeSourcesResult> {
  return registry.resolve(ctx, debug);
}
