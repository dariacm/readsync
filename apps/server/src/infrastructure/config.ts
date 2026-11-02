import { z } from "zod";

const envSchema = z.object({
  ELEVENLABS_API_KEY: z.string().min(1, "Copy .env.example to .env and add your ElevenLabs API key."),
  ELEVENLABS_VOICE_ID: z.string().default("JBFqnCBsd6RMkjVDRZzb"),
  ELEVENLABS_MODEL_ID: z.string().default("eleven_multilingual_v2"),
  PORT: z.coerce.number().int().default(8787),
});

export interface Config {
  elevenLabs: {
    apiKey: string;
    voiceId: string;
    modelId: string;
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
    elevenLabs: {
      apiKey: parsed.ELEVENLABS_API_KEY,
      voiceId: parsed.ELEVENLABS_VOICE_ID,
      modelId: parsed.ELEVENLABS_MODEL_ID,
    },
    port: parsed.PORT,
  };
}
