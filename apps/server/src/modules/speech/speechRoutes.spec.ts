import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { SpeakResponse } from "@readsync/shared";
import { buildApp } from "../../app.js";
import { PublicError } from "../../infrastructure/errors.js";
import type { SpeechService } from "./SpeechService.js";

class FakeSpeechService implements SpeechService {
  calls: Array<{ text: string; voiceId?: string }> = [];
  failWith?: Error;

  async speak(text: string, voiceId?: string): Promise<SpeakResponse> {
    this.calls.push({ text, voiceId });
    if (this.failWith) throw this.failWith;
    return { text, audioBase64: "AAAA", words: [] };
  }
}

describe("POST /api/speak", () => {
  let speechService: FakeSpeechService;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    speechService = new FakeSpeechService();
    app = await buildApp({ speechService });
  });

  afterEach(() => app.close());

  it("returns the synthesized speech for trimmed text", async () => {
    const res = await app.inject({ method: "POST", url: "/api/speak", payload: { text: "  Hello  " } });

    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ text: "Hello", audioBase64: "AAAA", words: [] });
    expect(speechService.calls).toEqual([{ text: "Hello", voiceId: undefined }]);
  });

  it("rejects blank text with a readable error", async () => {
    const res = await app.inject({ method: "POST", url: "/api/speak", payload: { text: "   " } });

    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "Text is required." });
    expect(speechService.calls).toEqual([]);
  });

  it("passes public errors through with their status", async () => {
    speechService.failWith = new PublicError("Speech generation failed.", 502);
    const res = await app.inject({ method: "POST", url: "/api/speak", payload: { text: "Hi" } });

    expect(res.statusCode).toBe(502);
    expect(res.json()).toEqual({ error: "Speech generation failed." });
  });

  it("hides unexpected errors", async () => {
    speechService.failWith = new Error("secret detail");
    const res = await app.inject({ method: "POST", url: "/api/speak", payload: { text: "Hi" } });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "Internal server error." });
  });
});
