import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buildApp, type AppDependencies } from "./app.js";
import { getConfig } from "./infrastructure/config.js";
import { FixtureSpeechService, loadSpeechFixture } from "./modules/speech/FixtureSpeechService.js";
import { ElevenLabsSpeechService } from "./modules/speech/SpeechService.js";

const config = getConfig();

function liveDependencies(): AppDependencies {
  const client = new ElevenLabsClient({ apiKey: config.elevenLabs.apiKey });
  return { speechService: new ElevenLabsSpeechService(client, config.elevenLabs) };
}

function demoDependencies(): AppDependencies {
  const fixture = loadSpeechFixture();
  return { speechService: new FixtureSpeechService(fixture), demoText: fixture.text };
}

const app = await buildApp(config.demo ? demoDependencies() : liveDependencies(), {
  logger: { transport: process.stdout.isTTY ? { target: "pino-pretty" } : undefined },
});

await app.listen({ port: config.port });
if (config.demo) app.log.info("Demo mode: replaying the recorded fixture; ElevenLabs isn't called.");
