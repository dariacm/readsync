import { describe, expect, it } from "vitest";
import { PublicError } from "../../infrastructure/errors.js";
import { FixtureSpeechService, type SpeechFixture } from "./FixtureSpeechService.js";

const response = (text: string) => ({ text, audioBase64: "AAAA", words: [] });

const fixture: SpeechFixture = {
  text: "One. Two.",
  chunks: [
    { request: { text: "One.", nextText: "Two." }, response: response("One.") },
    { request: { text: "Two.", previousText: "One." }, response: response("Two.") },
  ],
};

describe("FixtureSpeechService", () => {
  const service = new FixtureSpeechService(fixture);

  it("replays the recorded response for a chunk and its context", async () => {
    await expect(service.speak({ text: "Two.", previousText: "One." })).resolves.toEqual(response("Two."));
  });

  it("rejects anything that wasn't recorded, including the same chunk with other context", async () => {
    const expected = new PublicError("Demo mode can only read the sample text.", 404);
    await expect(service.speak({ text: "Three." })).rejects.toEqual(expected);
    await expect(service.speak({ text: "Two." })).rejects.toEqual(expected);
  });
});
