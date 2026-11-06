import { ElevenLabsError, type ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import type { SpeakRequest, SpeakResponse } from "@readsync/shared";
import type { Config } from "../../infrastructure/config.js";
import { PublicError } from "../../infrastructure/errors.js";
import { toWordTimings } from "./alignment.js";

/** "auto" can leave currencies half-read ("3,500.75" without "pounds"); "on" always expands them. */
export const TEXT_NORMALIZATION = "on";

export interface SpeechService {
  /** Aborting `signal` cancels the ElevenLabs request, e.g. when the client has gone away. */
  speak(request: SpeakRequest, signal?: AbortSignal): Promise<SpeakResponse>;
}

export class ElevenLabsSpeechService implements SpeechService {
  constructor(
    private readonly client: ElevenLabsClient,
    private readonly config: Config["elevenLabs"],
  ) {}

  async speak(
    { text, voiceId = this.config.voiceId, previousText, nextText }: SpeakRequest,
    signal?: AbortSignal,
  ): Promise<SpeakResponse> {
    const { modelId, pronunciationDictionaryIds } = this.config;
    // Texts are treated as English until the reader lets users pick a language.
    const pronunciationDictionaryId = pronunciationDictionaryIds.en;

    let result;
    try {
      result = await this.client.textToSpeech.convertWithTimestamps(
        voiceId,
        {
          text,
          modelId,
          previousText,
          nextText,
          applyTextNormalization: TEXT_NORMALIZATION,
          pronunciationDictionaryLocators: pronunciationDictionaryId
            ? [{ pronunciationDictionaryId }]
            : undefined,
        },
        { abortSignal: signal },
      );
    } catch (err) {
      // 499 (client closed request) is never seen by the client; it keeps cancellations out of the error logs.
      if (signal?.aborted) throw new PublicError("Request cancelled.", 499, { cause: err });
      throw toPublicError(err);
    }

    // `alignment` maps to the text as written, not as spoken, so highlights stay on the user's original words.
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

/** Turns an ElevenLabs failure into a message readers can act on; the original stays as the cause for logging. */
function toPublicError(err: unknown): PublicError {
  if (err instanceof ElevenLabsError) {
    const detail = (err.body as { detail?: { status?: string; code?: string } } | undefined)?.detail;
    if (detail?.status === "quota_exceeded" || detail?.code === "quota_exceeded") {
      return new PublicError("The ElevenLabs credits for this period are used up.", 402, { cause: err });
    }
    if (err.statusCode === 429) {
      return new PublicError("ElevenLabs is busy right now. Try again in a moment.", 429, { cause: err });
    }
  }
  return new PublicError("Speech generation failed.", 502, { cause: err });
}
