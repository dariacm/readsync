import { z } from "zod";
import type { DictionaryLanguage } from "../modules/speech/pronunciationRules.js";

const envSchema = z
  .object({
    /** Replays the recorded demo fixture instead of calling ElevenLabs; no API key needed. */
    READSYNC_DEMO: z.stringbool().default(false),
    ELEVENLABS_API_KEY: z.string().optional(),
    ELEVENLABS_VOICE_ID: z.string().default("JBFqnCBsd6RMkjVDRZzb"),
    ELEVENLABS_MODEL_ID: z.string().default("eleven_multilingual_v2"),
    ELEVENLABS_PRONUNCIATION_DICTIONARY_ID_EN: z.string().min(1).optional(),
    PORT: z.coerce.number().int().default(8787),
  })
  .refine((env) => env.READSYNC_DEMO || env.ELEVENLABS_API_KEY, {
    path: ["ELEVENLABS_API_KEY"],
    message: "Copy .env.example to .env and add your ElevenLabs API key, or run `pnpm dev:demo` to try it without one.",
  });

export interface Config {
  /** In demo mode, speech comes from the recorded fixture and `elevenLabs.apiKey` may be empty. */
  demo: boolean;
  elevenLabs: {
    apiKey: string;
    voiceId: string;
    modelId: string;
    /** Created with `pnpm dictionary:create <language>`; expands abbreviations like "e.g.". */
    pronunciationDictionaryIds: Partial<Record<DictionaryLanguage, string>>;
  };
  port: number;
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(result.error)}`);
  }
  const parsed = result.data;
  return {
    demo: parsed.READSYNC_DEMO,
    elevenLabs: {
      apiKey: parsed.ELEVENLABS_API_KEY ?? "",
      voiceId: parsed.ELEVENLABS_VOICE_ID,
      modelId: parsed.ELEVENLABS_MODEL_ID,
      pronunciationDictionaryIds: { en: parsed.ELEVENLABS_PRONUNCIATION_DICTIONARY_ID_EN },
    },
    port: parsed.PORT,
  };
}
