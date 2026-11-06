import { StorageApiError, type SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { SupabaseSpeechCache } from "./SupabaseSpeechCache.js";

const response = {
  text: "Hi.",
  audioBase64: Buffer.from("mp3-bytes").toString("base64"),
  words: [{ text: "Hi.", charStart: 0, charEnd: 3, startSec: 0, endSec: 0.4 }],
};

function fakeClient(failure?: StorageApiError) {
  const files = new Map<string, { body: Blob; contentType: string; createdAt: string }>();
  const downloads: string[] = [];
  const bucket = {
    async download(path: string) {
      downloads.push(path);
      if (failure) return { data: null, error: failure };
      const file = files.get(path);
      if (!file) return { data: null, error: new StorageApiError("Object not found", 400, "404", "storage", "NoSuchKey") };
      return { data: file.body, error: null };
    },
    async upload(path: string, body: Buffer | string, options: { contentType: string }) {
      if (failure) return { data: null, error: failure };
      const blob = new Blob([typeof body === "string" ? body : new Uint8Array(body)]);
      files.set(path, { body: blob, contentType: options.contentType, createdAt: new Date().toISOString() });
      return { data: { path }, error: null };
    },
    async list(prefix: string, { limit, offset }: { limit: number; offset: number }) {
      const listed = [...files.entries()]
        .filter(([path]) => path.startsWith(`${prefix}/`))
        .map(([path, file]) => ({ name: path.slice(prefix.length + 1), created_at: file.createdAt }))
        .sort((a, b) => a.created_at.localeCompare(b.created_at));
      return { data: listed.slice(offset, offset + limit), error: null };
    },
    async remove(paths: string[]) {
      for (const path of paths) files.delete(path);
      return { data: [], error: null };
    },
  };
  const storage = {
    from: () => bucket,
    async getBucket(name: string) {
      if (failure) return { data: null, error: failure };
      return { data: { name, public: name.startsWith("public") }, error: null };
    },
  };
  const client = { storage } as unknown as SupabaseClient;
  return { client, files, downloads };
}

describe("SupabaseSpeechCache", () => {
  it("stores the audio as an MP3 next to its timings, and reads both back", async () => {
    const { client, files } = fakeClient();
    const cache = new SupabaseSpeechCache(client, "speech-cache");

    await cache.put("abc", response);

    expect(files.get("v1/abc.mp3")?.contentType).toBe("audio/mpeg");
    expect(await files.get("v1/abc.mp3")?.body.text()).toBe("mp3-bytes");
    expect(JSON.parse(await files.get("v1/abc.json")!.body.text())).toEqual({ text: "Hi.", words: response.words });
    await expect(cache.get("abc")).resolves.toEqual(response);
  });

  it("treats a missing or half-written entry as a miss", async () => {
    const { client, files } = fakeClient();
    const cache = new SupabaseSpeechCache(client, "speech-cache");
    await expect(cache.get("abc")).resolves.toBeNull();

    await cache.put("abc", response);
    files.delete("v1/abc.json");
    await expect(cache.get("abc")).resolves.toBeNull();
  });

  it("reports other storage failures, so they're logged instead of looking like misses", async () => {
    const { client } = fakeClient(new StorageApiError("Bucket not found", 400, "404", "storage", "NoSuchBucket"));
    const cache = new SupabaseSpeechCache(client, "speech-cache");

    await expect(cache.get("abc")).rejects.toThrow("Bucket not found");
    await expect(cache.put("abc", response)).rejects.toThrow("Bucket not found");
  });

  describe("key index", () => {
    async function indexedCache() {
      const fake = fakeClient();
      const writer = new SupabaseSpeechCache(fake.client, "speech-cache");
      await writer.put("stored", response);
      await writer.put("half", response);
      fake.files.delete("v1/half.mp3");
      const cache = new SupabaseSpeechCache(fake.client, "speech-cache");
      fake.downloads.length = 0;
      return { ...fake, cache };
    }

    it("indexes only complete entries", async () => {
      const { cache } = await indexedCache();
      await expect(cache.loadIndex()).resolves.toBe(1);
    });

    it("skips the lookup for keys that aren't stored, once the index is loaded", async () => {
      const { cache, downloads } = await indexedCache();
      await cache.loadIndex();

      await expect(cache.get("new")).resolves.toBeNull();
      await expect(cache.get("half")).resolves.toBeNull();
      expect(downloads).toEqual([]);
      await expect(cache.get("stored")).resolves.toEqual(response);
    });

    it("asks Supabase while the index isn't loaded", async () => {
      const { cache, downloads } = await indexedCache();

      await expect(cache.get("new")).resolves.toBeNull();
      expect(downloads).toEqual(["v1/new.mp3", "v1/new.json"]);
    });

    it("adds entries saved after the index was loaded", async () => {
      const { cache } = await indexedCache();
      await cache.loadIndex();

      await cache.put("later", response);
      await expect(cache.get("later")).resolves.toEqual(response);
    });

    it("treats an indexed entry deleted elsewhere as a miss", async () => {
      const { cache, files } = await indexedCache();
      await cache.loadIndex();

      files.delete("v1/stored.json");
      await expect(cache.get("stored")).resolves.toBeNull();
    });
  });

  describe("checkBucket", () => {
    it("says whether the bucket is public", async () => {
      const { client } = fakeClient();
      await expect(new SupabaseSpeechCache(client, "speech-cache").checkBucket()).resolves.toEqual({ public: false });
      await expect(new SupabaseSpeechCache(client, "public-cache").checkBucket()).resolves.toEqual({ public: true });
    });

    it("fails when the bucket can't be opened", async () => {
      const { client } = fakeClient(new StorageApiError("Bucket not found", 400, "404", "storage", "NoSuchBucket"));
      await expect(new SupabaseSpeechCache(client, "speed-cache").checkBucket()).rejects.toThrow("Bucket not found");
    });
  });

  describe("prune", () => {
    async function cacheWith(entries: Record<string, string>) {
      const { client, files } = fakeClient();
      const cache = new SupabaseSpeechCache(client, "speech-cache");
      for (const [key, createdAt] of Object.entries(entries)) {
        await cache.put(key, response);
        for (const ext of ["mp3", "json"]) files.get(`v1/${key}.${ext}`)!.createdAt = createdAt;
      }
      return { cache, files };
    }

    it("deletes only the files stored before the cutoff", async () => {
      const { cache, files } = await cacheWith({ old: "2026-09-01T00:00:00Z", recent: "2026-11-01T00:00:00Z" });

      const removed = await cache.prune(new Date("2026-10-01T00:00:00Z"));

      expect(removed.sort()).toEqual(["v1/old.json", "v1/old.mp3"]);
      expect([...files.keys()].sort()).toEqual(["v1/recent.json", "v1/recent.mp3"]);
    });

    it("lists more than one page of files", async () => {
      const entries = Object.fromEntries(
        Array.from({ length: 80 }, (_, i) => [`key${i}`, new Date(Date.UTC(2026, 8, 1, 0, i)).toISOString()]),
      );
      const { cache, files } = await cacheWith(entries);

      await expect(cache.prune(new Date("2026-10-01T00:00:00Z"))).resolves.toHaveLength(160);
      expect(files.size).toBe(0);
    });

    it("deletes nothing on a dry run", async () => {
      const { cache, files } = await cacheWith({ old: "2026-09-01T00:00:00Z" });

      await expect(cache.prune(new Date("2026-10-01T00:00:00Z"), { dryRun: true })).resolves.toHaveLength(2);
      expect(files.size).toBe(2);
    });
  });
});
