import type { TextChunk, WordTiming } from "@readsync/shared";

/** Index of the chunk containing `offset` in the full text (the last chunk starting at or before it). */
export function chunkIndexAt(chunks: TextChunk[], offset: number): number {
  let index = 0;
  chunks.forEach((chunk, i) => {
    if (chunk.charStart <= offset) index = i;
  });
  return index;
}

/** Audio time at which the word at or after `offset` starts, or 0 if there is none. */
export function startTimeAt(words: WordTiming[], offset: number): number {
  return words.find((word) => word.charEnd > offset)?.startSec ?? 0;
}

/**
 * Where "previous sentence" should go: the start of the current sentence if it has been
 * playing for a while, otherwise the start of the one before (like a music player's back button).
 */
export function previousSentenceStart(
  sentenceStarts: number[],
  position: number,
  secondsIntoSentence: number,
  restartThresholdSec = 1.5,
): number | undefined {
  const current = sentenceStarts.findLastIndex((start) => start <= position);
  if (current === -1) return sentenceStarts[0];
  if (secondsIntoSentence > restartThresholdSec || current === 0) return sentenceStarts[current];
  return sentenceStarts[current - 1];
}

/** Zero-based index of the sentence containing `position` (0 before the first sentence). */
export function sentenceIndexAt(sentenceStarts: number[], position: number): number {
  return Math.max(0, sentenceStarts.findLastIndex((start) => start <= position));
}

export function nextSentenceStart(sentenceStarts: number[], position: number): number | undefined {
  return sentenceStarts.find((start) => start > position);
}
