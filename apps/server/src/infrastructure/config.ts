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
    SUPABASE_URL: z.url().optional(),
    SUPABASE_SECRET_KEY: z.string().min(1).optional(),
    SUPABASE_SPEECH_BUCKET: z.string().min(1).default("speech-cache"),
    PORT: z.coerce.number().int().default(8787),
  })
  .refine((env) => env.READSYNC_DEMO || env.ELEVENLABS_API_KEY, {
    path: ["ELEVENLABS_API_KEY"],
    message: "Copy .env.example to .env and add your ElevenLabs API key, or run `pnpm dev:demo` to try it without one.",
  })
  .refine((env) => !env.SUPABASE_URL === !env.SUPABASE_SECRET_KEY, {
    path: ["SUPABASE_SECRET_KEY"],
    message: "Set both SUPABASE_URL and SUPABASE_SECRET_KEY to cache speech, or neither to run without a cache.",
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
  speechCache?: {
    url: string;
    /** Bypasses Supabase's access rules: server-only. */
    secretKey: string;
    bucket: string;
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
    speechCache:
      parsed.SUPABASE_URL && parsed.SUPABASE_SECRET_KEY
        ? { url: parsed.SUPABASE_URL, secretKey: parsed.SUPABASE_SECRET_KEY, bucket: parsed.SUPABASE_SPEECH_BUCKET }
        : undefined,
    port: parsed.PORT,
  };
}
