export type DictionaryLanguage = "en";

export interface AliasRule {
  stringToReplace: string;
  alias: string;
}

/**
 * Abbreviations the TTS normalizer doesn't reliably expand, per language. ElevenLabs applies
 * them through a pronunciation dictionary (see `pnpm dictionary:create`), so the timings still
 * map to the text as the user wrote it. Rules are plain string replacements that ignore the
 * text's language, which is why each language gets its own dictionary.
 */
export const abbreviationAliases: Record<DictionaryLanguage, AliasRule[]> = {
  en: [
    { stringToReplace: "e.g.", alias: "for example" },
    { stringToReplace: "i.e.", alias: "that is" },
    { stringToReplace: "etc.", alias: "et cetera" },
    { stringToReplace: "vs.", alias: "versus" },
    { stringToReplace: "approx.", alias: "approximately" },
    { stringToReplace: "incl.", alias: "including" },
  ],
};

export function isDictionaryLanguage(value: string): value is DictionaryLanguage {
  return value in abbreviationAliases;
}
