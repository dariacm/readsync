import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createClient } from "@supabase/supabase-js";
import { pino } from "pino";
import { buildApp, type AppDependencies } from "./app.js";
import { getConfig } from "./infrastructure/config.js";
import { CachedSpeechService } from "./modules/speech/CachedSpeechService.js";
import { FixtureSpeechService, loadSpeechFixture } from "./modules/speech/FixtureSpeechService.js";
import { ElevenLabsSpeechService, type SpeechService } from "./modules/speech/SpeechService.js";
import { SupabaseSpeechCache } from "./modules/speech/SupabaseSpeechCache.js";

const config = getConfig();
// Created here rather than by Fastify, so the speech cache can log before the app exists.
const logger = pino({ transport: process.stdout.isTTY ? { target: "pino-pretty" } : undefined });

function liveDependencies(): AppDependencies {
  const client = new ElevenLabsClient({ apiKey: config.elevenLabs.apiKey });
  let speechService: SpeechService = new ElevenLabsSpeechService(client, config.elevenLabs);

  if (config.speechCache) {
    const { url, secretKey, bucket } = config.speechCache;
    const supabase = createClient(url, secretKey, { auth: { persistSession: false } });
    const cache = new SupabaseSpeechCache(supabase, bucket);
    void startSpeechCache(cache, bucket);
    speechService = new CachedSpeechService(
      speechService,
      cache,
      {
        voiceId: config.elevenLabs.voiceId,
        modelId: config.elevenLabs.modelId,
        pronunciationDictionaryId: config.elevenLabs.pronunciationDictionaryIds.en,
      },
      logger,
    );
  }
  return { speechService };
}

/** Runs in the background; if it fails, the server still reads, just without the cache. */
async function startSpeechCache(cache: SupabaseSpeechCache, bucket: string) {
  try {
    const { public: isPublic } = await cache.checkBucket();
    if (isPublic) {
      logger.warn(`The Supabase bucket "${bucket}" is public, so anyone with a file's address can read cached texts. Make it private.`);
    }
  } catch (err) {
    logger.error(
      { err },
      `Speech can't be cached: couldn't open the Supabase bucket "${bucket}". Check that it exists and that SUPABASE_URL and SUPABASE_SECRET_KEY are right.`,
    );
    return;
  }
  try {
    const entries = await cache.loadIndex();
    logger.info(`Caching speech in the Supabase bucket "${bucket}" (${entries} ${entries === 1 ? "entry" : "entries"}).`);
  } catch (err) {
    logger.warn({ err }, `Caching speech in the Supabase bucket "${bucket}", but couldn't list its entries.`);
  }
}

function demoDependencies(): AppDependencies {
  const fixture = loadSpeechFixture();
  return { speechService: new FixtureSpeechService(fixture), demoText: fixture.text };
}

const app = await buildApp(config.demo ? demoDependencies() : liveDependencies(), { loggerInstance: logger });

await app.listen({ port: config.port });
if (config.demo) app.log.info("Demo mode: replaying the recorded fixture; ElevenLabs isn't called.");
