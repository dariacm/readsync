import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SpeakRequest } from "@readsync/shared";
import { speak } from "./api";
import { clearSpeechCache, speakOnce } from "./speechCache";

vi.mock("./api", () => ({ speak: vi.fn() }));
const speakMock = vi.mocked(speak);

const response = (text: string) => ({ text, audioBase64: "AAAA", words: [] });

describe("speakOnce", () => {
  beforeEach(() => {
    clearSpeechCache();
    speakMock.mockReset().mockImplementation(async (request: SpeakRequest) => response(request.text));
  });

  it("shares one request between identical calls, even while it's in flight", async () => {
    const [first, second] = await Promise.all([speakOnce({ text: "Hi." }), speakOnce({ text: "Hi." })]);

    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
  });

  it("sends separate requests when the context differs", async () => {
    await speakOnce({ text: "Hi.", nextText: "Bye." });
    await speakOnce({ text: "Hi.", nextText: "See you." });

    expect(speakMock).toHaveBeenCalledTimes(2);
  });

  it("sends a fresh request after a failure, so retrying works", async () => {
    speakMock.mockRejectedValueOnce(new Error("Speech generation failed."));

    await expect(speakOnce({ text: "Hi." })).rejects.toThrow("Speech generation failed.");
    await expect(speakOnce({ text: "Hi." })).resolves.toEqual(response("Hi."));
    expect(speakMock).toHaveBeenCalledTimes(2);
  });

  it("evicts the least recently used entry beyond 20", async () => {
    for (let i = 0; i < 20; i++) await speakOnce({ text: `Text ${i}.` });
    await speakOnce({ text: "Text 0." }); // recently used again, so it stays
    await speakOnce({ text: "Text 20." }); // evicts "Text 1."
    speakMock.mockClear();

    await speakOnce({ text: "Text 0." });
    expect(speakMock).not.toHaveBeenCalled();
    await speakOnce({ text: "Text 1." });
    expect(speakMock).toHaveBeenCalledTimes(1);
  });
});
