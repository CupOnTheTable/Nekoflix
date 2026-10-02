import {
  findSeriesByMalId,
  getMegaPlayUrl,
  getMegaPlayUrlByAniList,
  getMegaPlayUrlByMal,
  getSeries,
} from "./anikoto";

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
      `https://megaplay.buzz/stream/getSources?id=${dataId}`,
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
    const streamUrl = sourceData.sources?.file;
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
          `https://megaplay.buzz/stream/getSources?id=${dataIdMatch[1]}`,
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
        const streamUrl = data.sources?.file;
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

export const megaPlayProvider = new MegaPlayProvider();
export const megaPlayBackupProvider = new MegaPlayBackupProvider();

export class ProviderRegistry {
  private providers: StreamProvider[] = [];

  register(provider: StreamProvider): this {
    this.providers.push(provider);
    return this;
  }

  async resolve(ctx: SourceContext): Promise<EpisodeSourcesResult> {
    const allSources: StreamSource[] = [];

    for (const provider of this.providers) {
      try {
        const sources = await provider.getEpisodeSources(ctx);
        for (const src of sources) {
          if (!allSources.find((s) => s.url === src.url)) {
            allSources.push(src);
          }
        }
      } catch {
        // try next provider
      }
    }

    return { sources: allSources, episodes: [] };
  }
}

export const defaultProviderRegistry = new ProviderRegistry()
  .register(megaPlayProvider)
  .register(megaPlayBackupProvider);

export async function getEpisodeSources(
  ctx: SourceContext,
  registry = defaultProviderRegistry
): Promise<EpisodeSourcesResult> {
  return registry.resolve(ctx);
}
