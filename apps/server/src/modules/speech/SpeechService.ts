import type { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SpeakResponse } from "@readsync/shared";
import type { Config } from "../../infrastructure/config.js";
import { PublicError } from "../../infrastructure/errors.js";
import { toWordTimings } from "./alignment.js";

export interface SpeechService {
  speak(text: string, voiceId?: string): Promise<SpeakResponse>;
}

export class ElevenLabsSpeechService implements SpeechService {
  constructor(
    private readonly client: ElevenLabsClient,
    private readonly config: Config["elevenLabs"],
  ) {}

  async speak(text: string, voiceId = this.config.voiceId): Promise<SpeakResponse> {
    let result;
    try {
      result = await this.client.textToSpeech.convertWithTimestamps(voiceId, {
        text,
        modelId: this.config.modelId,
      });
    } catch (err) {
      throw new PublicError("Speech generation failed.", 502, { cause: err });
    }

    if (!result.alignment) {
      throw new PublicError("No timing data returned for this text.", 502);
    }

    return {
      text: result.alignment.characters.join(""),
      audioBase64: result.audioBase64,
      words: toWordTimings(result.alignment),
    };
  }
}
