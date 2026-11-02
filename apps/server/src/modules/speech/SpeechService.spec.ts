import { ElevenLabsError, type ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublicError } from "../../infrastructure/errors.js";
import { ElevenLabsSpeechService } from "./SpeechService.js";

const config = { apiKey: "key", voiceId: "default-voice", modelId: "eleven_multilingual_v2", pronunciationDictionaryIds: {} };

describe("ElevenLabsSpeechService", () => {
  const convertWithTimestamps = vi.fn();
  const client = { textToSpeech: { convertWithTimestamps } } as unknown as ElevenLabsClient;

  beforeEach(() => {
    convertWithTimestamps.mockReset().mockResolvedValue({
      audioBase64: "AAAA",
      alignment: {
        characters: [..."Hi"],
        characterStartTimesSeconds: [0, 0.1],
        characterEndTimesSeconds: [0.1, 0.2],
      },
    });
  });

  it("always applies text normalization and maps the response", async () => {
    const result = await new ElevenLabsSpeechService(client, config).speak({ text: "Hi" });

    expect(convertWithTimestamps).toHaveBeenCalledWith("default-voice", {
      text: "Hi",
      modelId: "eleven_multilingual_v2",
      previousText: undefined,
      nextText: undefined,
      applyTextNormalization: "on",
      pronunciationDictionaryLocators: undefined,
    }, { abortSignal: undefined });
    expect(result).toEqual({
      text: "Hi",
      audioBase64: "AAAA",
      words: [{ text: "Hi", charStart: 0, charEnd: 2, startSec: 0, endSec: 0.2 }],
    });
  });

  it("passes context and the English pronunciation dictionary when configured", async () => {
    const service = new ElevenLabsSpeechService(client, { ...config, pronunciationDictionaryIds: { en: "dict-1" } });
    await service.speak({ text: "Hi", voiceId: "other-voice", previousText: "Before.", nextText: "After." });

    expect(convertWithTimestamps).toHaveBeenCalledWith(
      "other-voice",
      expect.objectContaining({
        previousText: "Before.",
        nextText: "After.",
        pronunciationDictionaryLocators: [{ pronunciationDictionaryId: "dict-1" }],
      }),
      expect.anything(),
    );
  });

  it("wraps ElevenLabs failures in a public error", async () => {
    convertWithTimestamps.mockRejectedValue(new Error("401 invalid key"));

    await expect(new ElevenLabsSpeechService(client, config).speak({ text: "Hi" })).rejects.toEqual(
      new PublicError("Speech generation failed.", 502),
    );
  });

  it.each([
    {
      name: "used-up credits",
      error: new ElevenLabsError({ message: "Quota", statusCode: 401, body: { detail: { status: "quota_exceeded" } } }),
      expected: new PublicError("The ElevenLabs credits for this period are used up.", 402),
    },
    {
      name: "rate limiting",
      error: new ElevenLabsError({ message: "Too many", statusCode: 429, body: { detail: { status: "too_many_concurrent_requests" } } }),
      expected: new PublicError("ElevenLabs is busy right now. Try again in a moment.", 429),
    },
    {
      name: "other ElevenLabs errors",
      error: new ElevenLabsError({ message: "Bad key", statusCode: 401, body: { detail: { status: "invalid_api_key" } } }),
      expected: new PublicError("Speech generation failed.", 502),
    },
  ])("explains $name and keeps the original error as the cause", async ({ error, expected }) => {
    convertWithTimestamps.mockRejectedValue(error);

    const result = new ElevenLabsSpeechService(client, config).speak({ text: "Hi" });

    await expect(result).rejects.toEqual(expected);
    await expect(result).rejects.toHaveProperty("statusCode", expected.statusCode);
    await expect(result).rejects.toHaveProperty("cause", error);
  });

  it("passes the abort signal to ElevenLabs and reports cancellations separately", async () => {
    const controller = new AbortController();
    convertWithTimestamps.mockImplementation(async () => {
      controller.abort();
      throw new Error("The user aborted a request");
    });

    const result = new ElevenLabsSpeechService(client, config).speak({ text: "Hi" }, controller.signal);

    await expect(result).rejects.toEqual(new PublicError("Request cancelled.", 499));
    expect(convertWithTimestamps).toHaveBeenCalledWith("default-voice", expect.anything(), {
      abortSignal: controller.signal,
    });
  });

  it("fails when no timing data comes back", async () => {
    convertWithTimestamps.mockResolvedValue({ audioBase64: "AAAA" });

    await expect(new ElevenLabsSpeechService(client, config).speak({ text: "Hi" })).rejects.toThrow(
      "No timing data returned for this text.",
    );
  });
});
