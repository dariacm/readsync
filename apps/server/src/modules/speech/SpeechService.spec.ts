import type { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
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
    const result = await new ElevenLabsSpeechService(client, config).speak("Hi");

    expect(convertWithTimestamps).toHaveBeenCalledWith("default-voice", {
      text: "Hi",
      modelId: "eleven_multilingual_v2",
      applyTextNormalization: "on",
      pronunciationDictionaryLocators: undefined,
    });
    expect(result).toEqual({
      text: "Hi",
      audioBase64: "AAAA",
      words: [{ text: "Hi", charStart: 0, charEnd: 2, startSec: 0, endSec: 0.2 }],
    });
  });

  it("uses the English pronunciation dictionary when configured", async () => {
    const service = new ElevenLabsSpeechService(client, { ...config, pronunciationDictionaryIds: { en: "dict-1" } });
    await service.speak("Hi", "other-voice");

    expect(convertWithTimestamps).toHaveBeenCalledWith(
      "other-voice",
      expect.objectContaining({ pronunciationDictionaryLocators: [{ pronunciationDictionaryId: "dict-1" }] }),
    );
  });

  it("wraps ElevenLabs failures in a public error", async () => {
    convertWithTimestamps.mockRejectedValue(new Error("401 invalid key"));

    await expect(new ElevenLabsSpeechService(client, config).speak("Hi")).rejects.toEqual(
      new PublicError("Speech generation failed.", 502),
    );
  });

  it("fails when no timing data comes back", async () => {
    convertWithTimestamps.mockResolvedValue({ audioBase64: "AAAA" });

    await expect(new ElevenLabsSpeechService(client, config).speak("Hi")).rejects.toThrow(
      "No timing data returned for this text.",
    );
  });
});
