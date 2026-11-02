import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeakRequest, SpeakResponse } from "@readsync/shared";
import { buildApp } from "../../app.js";
import { PublicError } from "../../infrastructure/errors.js";
import type { SpeechService } from "./SpeechService.js";

class FakeSpeechService implements SpeechService {
  calls: SpeakRequest[] = [];
  signals: AbortSignal[] = [];
  failWith?: Error;
  /** When set, speak() waits until its signal is aborted, like a slow ElevenLabs request. */
  hang = false;

  async speak(request: SpeakRequest, signal?: AbortSignal): Promise<SpeakResponse> {
    this.calls.push(request);
    if (signal) this.signals.push(signal);
    if (this.hang) {
      await new Promise((resolve) => signal?.addEventListener("abort", resolve));
      throw new PublicError("Request cancelled.", 499);
    }
    if (this.failWith) throw this.failWith;
    return { text: request.text, audioBase64: "AAAA", words: [] };
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
    expect(speechService.calls).toEqual([{ text: "Hello" }]);
  });

  it("passes neighbouring chunks through as context", async () => {
    const payload = { text: "Middle.", previousText: "Before.", nextText: "After." };
    const res = await app.inject({ method: "POST", url: "/api/speak", payload });

    expect(res.statusCode).toBe(200);
    expect(speechService.calls).toEqual([payload]);
  });

  it("aborts speech generation when the client disconnects", async () => {
    speechService.hang = true;
    const address = await app.listen({ port: 0, host: "127.0.0.1" });
    const client = new AbortController();

    const request = fetch(`${address}/api/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Hi" }),
      signal: client.signal,
    }).catch(() => undefined);
    await vi.waitFor(() => expect(speechService.signals).toHaveLength(1));
    client.abort();
    await request;

    await vi.waitFor(() => expect(speechService.signals[0]!.aborted).toBe(true));
  });

  it("doesn't abort generation for requests that complete", async () => {
    const res = await app.inject({ method: "POST", url: "/api/speak", payload: { text: "Hi" } });

    expect(res.statusCode).toBe(200);
    expect(speechService.signals[0]!.aborted).toBe(false);
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

  it("logs the cause of a public error without sending it to the client", async () => {
    const lines: Array<{ level: number; msg: string; statusCode?: number; err?: { message: string } }> = [];
    const loggedApp = await buildApp(
      { speechService },
      { logger: { level: "info", stream: { write: (line: string) => lines.push(JSON.parse(line)) } } },
    );
    speechService.failWith = new PublicError("Speech generation failed.", 502, { cause: new Error("ElevenLabs 500") });

    const res = await loggedApp.inject({ method: "POST", url: "/api/speak", payload: { text: "Hi" } });
    await loggedApp.close();

    expect(res.json()).toEqual({ error: "Speech generation failed." });
    expect(lines).toContainEqual(
      expect.objectContaining({ level: 50, msg: "Speech generation failed.", statusCode: 502, err: expect.objectContaining({ message: "ElevenLabs 500" }) }),
    );
  });

  it("hides unexpected errors", async () => {
    speechService.failWith = new Error("secret detail");
    const res = await app.inject({ method: "POST", url: "/api/speak", payload: { text: "Hi" } });

    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: "Internal server error." });
  });
});
