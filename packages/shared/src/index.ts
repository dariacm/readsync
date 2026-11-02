import { z } from "zod";

export const MAX_TEXT_LENGTH = 5000;

export const speakRequestSchema = z.object({
  text: z
    .string()
    .trim()
    .min(1, "Text is required.")
    .max(MAX_TEXT_LENGTH, `Text must be at most ${MAX_TEXT_LENGTH} characters.`),
  voiceId: z.string().min(1).optional(),
});

/** A word in the spoken text, with its position and timing in the audio. */
export const wordTimingSchema = z.object({
  text: z.string(),
  /** Offset of the first character in `SpeakResponse.text`. */
  charStart: z.number().int(),
  /** Offset one past the last character in `SpeakResponse.text`. */
  charEnd: z.number().int(),
  startSec: z.number(),
  endSec: z.number(),
});

export const speakResponseSchema = z.object({
  /** The text as aligned by ElevenLabs; word offsets index into this. */
  text: z.string(),
  /** MP3 audio, base64-encoded. */
  audioBase64: z.string(),
  words: z.array(wordTimingSchema),
});

export const errorResponseSchema = z.object({
  error: z.string(),
});

export type SpeakRequest = z.input<typeof speakRequestSchema>;
export type WordTiming = z.infer<typeof wordTimingSchema>;
export type SpeakResponse = z.infer<typeof speakResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
