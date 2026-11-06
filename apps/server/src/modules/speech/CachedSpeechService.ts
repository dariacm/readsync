import { createHash } from "node:crypto";
import type { SpeakRequest, SpeakResponse } from "@readsync/shared";
import type { FastifyBaseLogger } from "fastify";
import { TEXT_NORMALIZATION, type SpeechService } from "./SpeechService.js";

export interface SpeechCache {
  get(key: string): Promise<SpeakResponse | null>;
  put(key: string, response: SpeakResponse): Promise<void>;
}

export interface SpeechCacheSettings {
  voiceId: string;
  modelId: string;
  /** Changing the rules creates a new dictionary, so the ID covers them. */
  pronunciationDictionaryId?: string;
}

/** Bump when the key or stored format changes, together with `CACHE_PREFIX` in SupabaseSpeechCache. */
const CACHE_FORMAT = 1;

/** Covers everything that changes the audio; hashed, which also keeps the text out of file names. */
export function speechCacheKey(request: SpeakRequest, settings: SpeechCacheSettings): string {
  const parts = [
    CACHE_FORMAT,
    request.voiceId ?? settings.voiceId,
    settings.modelId,
    settings.pronunciationDictionaryId ?? null,
    TEXT_NORMALIZATION,
    request.text.trim(),
    request.previousText ?? null,
    request.nextText ?? null,
  ];
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/** Fails open: if the cache errors, it's logged and speech is generated as if there were no cache. */
export class CachedSpeechService implements SpeechService {
  constructor(
    private readonly inner: SpeechService,
    private readonly cache: SpeechCache,
    private readonly settings: SpeechCacheSettings,
    private readonly log: Pick<FastifyBaseLogger, "info" | "warn">,
  ) {}

  async speak(request: SpeakRequest, signal?: AbortSignal): Promise<SpeakResponse> {
    const key = speechCacheKey(request, this.settings);

    const cached = await this.cache.get(key).catch((err: unknown) => {
      this.log.warn({ err, key }, "Speech cache lookup failed; generating speech instead");
      return null;
    });
    if (cached) {
      this.log.info({ key }, "Speech cache hit");
      return cached;
    }

    const response = await this.inner.speak(request, signal);
    // Not awaited, so a miss is no slower than having no cache.
    this.cache.put(key, response).catch((err: unknown) => {
      this.log.warn({ err, key }, "Couldn't store speech in the cache");
    });
    return response;
  }
}
