import type { WordTiming } from "@readsync/shared";

export interface CharacterAlignment {
  characters: string[];
  characterStartTimesSeconds: number[];
  characterEndTimesSeconds: number[];
}

/**
 * Groups ElevenLabs' per-character timings into words, splitting on whitespace.
 * Punctuation stays attached to its word, so "Hello," highlights as one unit.
 */
export function toWordTimings(alignment: CharacterAlignment): WordTiming[] {
  const { characters, characterStartTimesSeconds: starts, characterEndTimesSeconds: ends } = alignment;
  const words: WordTiming[] = [];
  let offset = 0;
  let current: WordTiming | undefined;

  characters.forEach((char, i) => {
    if (/\s/.test(char)) {
      current = undefined;
    } else if (current) {
      current.text += char;
      current.charEnd = offset + char.length;
      current.endSec = ends[i] ?? current.endSec;
    } else {
      current = {
        text: char,
        charStart: offset,
        charEnd: offset + char.length,
        startSec: starts[i] ?? 0,
        endSec: ends[i] ?? 0,
      };
      words.push(current);
    }
    offset += char.length;
  });

  return words;
}
