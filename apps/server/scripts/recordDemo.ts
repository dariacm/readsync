import { writeFileSync } from "node:fs";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { splitIntoChunks } from "@readsync/shared";
import { getConfig } from "../src/infrastructure/config.js";
import { DEMO_FIXTURE_URL, type SpeechFixture } from "../src/modules/speech/FixtureSpeechService.js";
import { ElevenLabsSpeechService } from "../src/modules/speech/SpeechService.js";

/** Chosen to show the features: several sentences and chunks, numbers and years, an abbreviation, apostrophes. */
const DEMO_TEXT =
  "Kimi Antonelli is the 2026 Formula 1 world champion. " +
  "On Sunday, the 20-year-old Mercedes driver finished third at the Mexico City Grand Prix, which was enough to seal the title while Max Verstappen won the race. " +
  "He's now the youngest champion in the sport's history, in only his second season. " +
  "It also ends a long wait for Italy, i.e. its first world champion since Alberto Ascari in 1953.";

// Same split and context as the reader in the browser, so its requests match the recording.
const chunks = splitIntoChunks(DEMO_TEXT);
const requests = chunks.map((chunk, i) => ({
  text: chunk.text,
  previousText: chunks[i - 1]?.text,
  nextText: chunks[i + 1]?.text,
}));

console.log(`${DEMO_TEXT.length} characters in ${chunks.length} chunks:`);
requests.forEach((r, i) => console.log(`  ${i + 1}. (${r.text.length}) ${r.text}`));

if (process.argv.includes("--dry-run")) process.exit(0);

const config = getConfig();
const service = new ElevenLabsSpeechService(new ElevenLabsClient({ apiKey: config.elevenLabs.apiKey }), config.elevenLabs);

const fixture: SpeechFixture = { text: DEMO_TEXT, chunks: [] };
for (const request of requests) {
  fixture.chunks.push({ request, response: await service.speak(request) });
}

writeFileSync(DEMO_FIXTURE_URL, JSON.stringify(fixture, null, 2) + "\n");
console.log(`Recorded ${fixture.chunks.length} chunks to ${DEMO_FIXTURE_URL.pathname}`);
