import { ElevenLabsClient, ElevenLabsError } from "@elevenlabs/elevenlabs-js";
import { getConfig } from "../src/infrastructure/config.js";
import { abbreviationAliases, isDictionaryLanguage } from "../src/modules/speech/pronunciationRules.js";

const language = process.argv[2] ?? "en";
if (!isDictionaryLanguage(language)) {
  console.error(`No rules for "${language}". Available: ${Object.keys(abbreviationAliases).join(", ")}`);
  process.exit(1);
}

const config = getConfig();
const client = new ElevenLabsClient({ apiKey: config.elevenLabs.apiKey });

try {
  const dictionary = await client.pronunciationDictionaries.createFromRules({
    name: `readsync-abbreviations-${language}`,
    description: `Expands common ${language} abbreviations for ReadSync.`,
    rules: abbreviationAliases[language].map((rule) => ({ type: "alias", caseSensitive: false, ...rule })),
  });

  console.log(`Created the ${language} pronunciation dictionary with ${dictionary.versionRulesNum} rules.`);
  console.log("Add this line to apps/server/.env, then restart the server:\n");
  console.log(`ELEVENLABS_PRONUNCIATION_DICTIONARY_ID_${language.toUpperCase()}=${dictionary.id}`);
} catch (err) {
  if (err instanceof ElevenLabsError && (err.statusCode === 401 || err.statusCode === 403)) {
    const detail = (err.body as { detail?: { message?: string } } | undefined)?.detail?.message;
    console.error(`ElevenLabs rejected the request: ${detail ?? err.message}`);
    console.error("Give the API key the Pronunciation Dictionaries permission (read and write) and try again.");
    process.exit(1);
  }
  throw err;
}
