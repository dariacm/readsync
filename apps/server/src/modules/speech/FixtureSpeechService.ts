import { readFileSync } from "node:fs";
import { speakResponseSchema, type SpeakRequest, type SpeakResponse } from "@readsync/shared";
import { z } from "zod";
import { PublicError } from "../../infrastructure/errors.js";
import type { SpeechService } from "./SpeechService.js";

/** Recorded with `pnpm demo:record`: real ElevenLabs responses for each chunk of one text. */
export const speechFixtureSchema = z.object({
  text: z.string(),
  chunks: z.array(
    z.object({
      request: z.object({ text: z.string(), previousText: z.string().optional(), nextText: z.string().optional() }),
      response: speakResponseSchema,
    }),
  ),
});

export type SpeechFixture = z.infer<typeof speechFixtureSchema>;

export const DEMO_FIXTURE_URL = new URL("../../../fixtures/demo.json", import.meta.url);

/** Matches requests on everything that changes the audio: the chunk and its context. */
function fixtureKey({ text, previousText, nextText }: SpeakRequest): string {
  return JSON.stringify([text.trim(), previousText ?? null, nextText ?? null]);
}

export function loadSpeechFixture(url: URL = DEMO_FIXTURE_URL): SpeechFixture {
  return speechFixtureSchema.parse(JSON.parse(readFileSync(url, "utf8")));
}

/** Replays recorded responses instead of calling ElevenLabs, so the demo needs no API key or credits. */
export class FixtureSpeechService implements SpeechService {
  private readonly responses: Map<string, SpeakResponse>;

  constructor(fixture: SpeechFixture) {
    this.responses = new Map(fixture.chunks.map(({ request, response }) => [fixtureKey(request), response]));
  }

  async speak(request: SpeakRequest): Promise<SpeakResponse> {
    const response = this.responses.get(fixtureKey(request));
    if (!response) throw new PublicError("Demo mode can only read the sample text.", 404);
    return response;
  }
}
