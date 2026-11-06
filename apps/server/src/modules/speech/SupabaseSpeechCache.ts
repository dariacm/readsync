import { speakResponseSchema, type SpeakResponse } from "@readsync/shared";
import { StorageApiError, type SupabaseClient } from "@supabase/supabase-js";
import type { SpeechCache } from "./CachedSpeechService.js";

/** Bump together with `CACHE_FORMAT` in CachedSpeechService. */
export const CACHE_PREFIX = "v1";

/** Supabase Storage's default listing size. */
const PAGE_SIZE = 100;

interface StoredFile {
  name: string;
  created_at: string | null;
}

const timingsSchema = speakResponseSchema.omit({ audioBase64: true });

/**
 * Keeps generated speech in a private Supabase Storage bucket as two files per chunk:
 * `v1/<key>.mp3` and `v1/<key>.json` (the text and word timings).
 */
export class SupabaseSpeechCache implements SpeechCache {
  /** Lets uncached chunks skip the lookup. Until `loadIndex` finishes, every lookup asks Supabase. */
  private readonly storedKeys = new Set<string>();
  private indexLoaded = false;

  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  async loadIndex(): Promise<number> {
    const names = new Set<string>();
    for await (const page of this.listPages("name")) for (const file of page) names.add(file.name);
    for (const name of names) {
      const key = name.replace(/\.json$/, "");
      if (key !== name && names.has(`${key}.mp3`)) this.storedKeys.add(key);
    }
    this.indexLoaded = true;
    return this.storedKeys.size;
  }

  async checkBucket(): Promise<{ public: boolean }> {
    const { data, error } = await this.client.storage.getBucket(this.bucket);
    if (error) throw error;
    return { public: data.public };
  }

  async get(key: string): Promise<SpeakResponse | null> {
    if (this.indexLoaded && !this.storedKeys.has(key)) return null;
    const [audio, timings] = await Promise.all([this.download(`${key}.mp3`), this.download(`${key}.json`)]);
    // One without the other is an unfinished write.
    if (!audio || !timings) return null;
    const { text, words } = timingsSchema.parse(JSON.parse(await timings.text()));
    return { text, words, audioBase64: Buffer.from(await audio.arrayBuffer()).toString("base64") };
  }

  async put(key: string, { audioBase64, ...timings }: SpeakResponse): Promise<void> {
    await Promise.all([
      this.upload(`${key}.mp3`, Buffer.from(audioBase64, "base64"), "audio/mpeg"),
      this.upload(`${key}.json`, JSON.stringify(timings), "application/json"),
    ]);
    this.storedKeys.add(key);
  }

  /** Supabase Storage can't expire files by age, so `cache:prune` runs this by hand. */
  async prune(cutoff: Date, { dryRun = false } = {}): Promise<string[]> {
    const expired: string[] = [];
    for await (const page of this.listPages("created_at")) {
      const older = page.filter((file) => file.created_at && new Date(file.created_at) < cutoff);
      expired.push(...older.map((file) => `${CACHE_PREFIX}/${file.name}`));
      // Sorted oldest first, so the first page with a newer file is the last one to delete from.
      if (older.length < page.length) break;
    }
    if (dryRun) return expired;
    const storage = this.client.storage.from(this.bucket);
    for (let i = 0; i < expired.length; i += PAGE_SIZE) {
      const { error } = await storage.remove(expired.slice(i, i + PAGE_SIZE));
      if (error) throw error;
    }
    return expired;
  }

  private async *listPages(column: "name" | "created_at"): AsyncGenerator<StoredFile[]> {
    const storage = this.client.storage.from(this.bucket);
    for (let offset = 0; ; offset += PAGE_SIZE) {
      const { data, error } = await storage.list(CACHE_PREFIX, {
        limit: PAGE_SIZE,
        offset,
        sortBy: { column, order: "asc" },
      });
      if (error) throw error;
      yield data;
      if (data.length < PAGE_SIZE) return;
    }
  }

  private async download(name: string): Promise<Blob | null> {
    const { data, error } = await this.client.storage.from(this.bucket).download(`${CACHE_PREFIX}/${name}`);
    if (!error) return data;
    // Only a missing file is a miss; anything else (bad key, paused project) should be reported.
    if (error instanceof StorageApiError && (error.code === "NoSuchKey" || (error.status === 404 && !error.code))) {
      return null;
    }
    throw error;
  }

  private async upload(name: string, body: Buffer | string, contentType: string): Promise<void> {
    const { error } = await this.client.storage
      .from(this.bucket)
      // Overwrites, so concurrent misses for the same chunk both succeed.
      .upload(`${CACHE_PREFIX}/${name}`, body, { contentType, upsert: true });
    if (error) throw error;
  }
}
