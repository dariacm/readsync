import type { SpeakRequest, SpeakResponse } from "@readsync/shared";
import { speak } from "./api";

/** Generated chunks kept in memory; each is up to about a minute of audio. */
const MAX_ENTRIES = 20;
const cache = new Map<string, Promise<SpeakResponse>>();

/**
 * Sends each distinct speech request once and shares the result. ElevenLabs charges for every
 * request sent, even one abandoned before the audio arrives, so a repeat (React StrictMode
 * mounting twice in development, or reading the same text again) reuses the first request.
 */
export function speakOnce(request: SpeakRequest): Promise<SpeakResponse> {
  const key = JSON.stringify([request.text, request.voiceId, request.previousText, request.nextText]);
  const cached = cache.get(key);
  if (cached) {
    // Re-insert to mark as recently used; Map keeps insertion order.
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const promise = speak(request).catch((err: unknown) => {
    cache.delete(key); // let a retry send a fresh request
    throw err;
  });
  cache.set(key, promise);
  if (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
  return promise;
}

export function clearSpeechCache() {
  cache.clear();
}
