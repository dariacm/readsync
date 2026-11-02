import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { buildApp } from "./app.js";
import { getConfig } from "./infrastructure/config.js";
import { ElevenLabsSpeechService } from "./modules/speech/SpeechService.js";

const config = getConfig();
const client = new ElevenLabsClient({ apiKey: config.elevenLabs.apiKey });

const app = await buildApp(
  { speechService: new ElevenLabsSpeechService(client, config.elevenLabs) },
  { logger: { transport: process.stdout.isTTY ? { target: "pino-pretty" } : undefined } },
);

await app.listen({ port: config.port });
