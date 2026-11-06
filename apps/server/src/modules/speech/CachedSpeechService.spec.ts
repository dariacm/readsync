import type { SpeakResponse } from "@readsync/shared";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CachedSpeechService, speechCacheKey, type SpeechCache } from "./CachedSpeechService.js";

const settings = { voiceId: "voice", modelId: "model", pronunciationDictionaryId: "dictionary" };
const response: SpeakResponse = { text: "Hi.", audioBase64: "AAAA", words: [] };

class MemoryCache implements SpeechCache {
  readonly entries = new Map<string, SpeakResponse>();
  async get(key: string) {
    return this.entries.get(key) ?? null;
  }
  async put(key: string, value: SpeakResponse) {
    this.entries.set(key, value);
  }
}

describe("speechCacheKey", () => {
  const request = { text: "Hi.", previousText: "Before.", nextText: "After." };
  const key = speechCacheKey(request, settings);

  it("is the same for the same request and settings", () => {
    expect(speechCacheKey({ ...request }, { ...settings })).toBe(key);
    expect(key).toMatch(/^[0-9a-f]{64}$/);
  });

  it("changes with anything that changes the audio", () => {
    const variants = [
      speechCacheKey({ ...request, text: "Hello." }, settings),
      speechCacheKey({ ...request, previousText: undefined }, settings),
      speechCacheKey({ ...request, nextText: "Later." }, settings),
      speechCacheKey({ ...request, voiceId: "other-voice" }, settings),
      speechCacheKey(request, { ...settings, modelId: "other-model" }),
      speechCacheKey(request, { ...settings, pronunciationDictionaryId: undefined }),
    ];
    expect(new Set([key, ...variants]).size).toBe(variants.length + 1);
  });

  it("treats the default voice and the same voice sent explicitly alike", () => {
    expect(speechCacheKey({ ...request, voiceId: "voice" }, settings)).toBe(key);
  });
});

describe("CachedSpeechService", () => {
  const inner = { speak: vi.fn() };
  const log = { info: vi.fn(), warn: vi.fn() };
  let cache: MemoryCache;
  let service: CachedSpeechService;

  beforeEach(() => {
    inner.speak.mockReset().mockResolvedValue(response);
    log.warn.mockReset();
    cache = new MemoryCache();
    service = new CachedSpeechService(inner, cache, settings, log);
  });

  it("generates speech once, then replays it from the cache", async () => {
    await expect(service.speak({ text: "Hi." })).resolves.toEqual(response);
    await vi.waitFor(() => expect(cache.entries.size).toBe(1));
    await expect(service.speak({ text: "Hi." })).resolves.toEqual(response);

    expect(inner.speak).toHaveBeenCalledTimes(1);
  });

  it("passes the abort signal on and stores nothing when the request is cancelled", async () => {
    const controller = new AbortController();
    inner.speak.mockRejectedValue(new Error("cancelled"));

    await expect(service.speak({ text: "Hi." }, controller.signal)).rejects.toThrow("cancelled");
    expect(inner.speak).toHaveBeenCalledWith({ text: "Hi." }, controller.signal);
    expect(cache.entries.size).toBe(0);
  });

  it("still reads aloud when the cache can't be read", async () => {
    vi.spyOn(cache, "get").mockRejectedValue(new Error("paused"));

    await expect(service.speak({ text: "Hi." })).resolves.toEqual(response);
    expect(log.warn).toHaveBeenCalledWith(expect.objectContaining({ err: expect.any(Error) }), expect.any(String));
  });

  it("still reads aloud when the cache can't be written", async () => {
    vi.spyOn(cache, "put").mockRejectedValue(new Error("full"));

    await expect(service.speak({ text: "Hi." })).resolves.toEqual(response);
    await vi.waitFor(() => expect(log.warn).toHaveBeenCalled());
  });
});
