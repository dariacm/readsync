/** A run of non-whitespace characters in a text. */
export interface Token {
  text: string;
  charStart: number;
  charEnd: number;
}

/**
 * Splits text on whitespace, the same rule the server uses to group ElevenLabs' character
 * timings into words, so a token's `charStart` matches the spoken word's.
 */
export function tokenize(text: string): Token[] {
  return [...text.matchAll(/\S+/g)].map((match) => ({
    text: match[0],
    charStart: match.index,
    charEnd: match.index + match[0].length,
  }));
}
