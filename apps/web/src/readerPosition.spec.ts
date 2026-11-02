import { describe, expect, it } from "vitest";
import type { TextChunk, WordTiming } from "@readsync/shared";
import {
  chunkIndexAt,
  nextSentenceStart,
  previousSentenceStart,
  sentenceIndexAt,
  startTimeAt,
  wordIndexForKey,
} from "./readerPosition";

const chunks: TextChunk[] = [
  { text: "One. Two.", charStart: 0, sentenceStarts: [0, 5] },
  { text: "Three.", charStart: 11, sentenceStarts: [11] },
];

const words: WordTiming[] = [
  { text: "Three.", charStart: 11, charEnd: 17, startSec: 0.1, endSec: 0.5 },
  { text: "Four.", charStart: 18, charEnd: 23, startSec: 0.7, endSec: 1 },
];

describe("chunkIndexAt", () => {
  it("finds the chunk containing an offset", () => {
    expect(chunkIndexAt(chunks, 0)).toBe(0);
    expect(chunkIndexAt(chunks, 6)).toBe(0);
    expect(chunkIndexAt(chunks, 11)).toBe(1);
    expect(chunkIndexAt(chunks, 100)).toBe(1);
  });
});

describe("startTimeAt", () => {
  it("returns the start of the word at or after an offset", () => {
    expect(startTimeAt(words, 11)).toBe(0.1);
    expect(startTimeAt(words, 14)).toBe(0.1);
    expect(startTimeAt(words, 17)).toBe(0.7);
    expect(startTimeAt(words, 50)).toBe(0);
  });
});

describe("sentence navigation", () => {
  const starts = [0, 5, 11];

  it("restarts the current sentence once it has played for a while", () => {
    expect(previousSentenceStart(starts, 7, 3)).toBe(5);
  });

  it("goes to the previous sentence near the start of the current one", () => {
    expect(previousSentenceStart(starts, 5, 0.2)).toBe(0);
    expect(previousSentenceStart(starts, 11, 0)).toBe(5);
  });

  it("stays on the first sentence", () => {
    expect(previousSentenceStart(starts, 2, 0.2)).toBe(0);
  });

  it("finds the sentence containing a position", () => {
    expect(sentenceIndexAt(starts, 0)).toBe(0);
    expect(sentenceIndexAt(starts, 7)).toBe(1);
    expect(sentenceIndexAt(starts, 11)).toBe(2);
    expect(sentenceIndexAt([3, 8], 0)).toBe(0);
  });

  it("finds the next sentence, if any", () => {
    expect(nextSentenceStart(starts, 5)).toBe(11);
    expect(nextSentenceStart(starts, 11)).toBeUndefined();
  });
});

describe("wordIndexForKey", () => {
  it("moves one word left or right, stopping at the ends", () => {
    expect(wordIndexForKey("ArrowRight", 2, 5)).toBe(3);
    expect(wordIndexForKey("ArrowLeft", 2, 5)).toBe(1);
    expect(wordIndexForKey("ArrowRight", 4, 5)).toBe(4);
    expect(wordIndexForKey("ArrowLeft", 0, 5)).toBe(0);
  });

  it("jumps to the first or last word", () => {
    expect(wordIndexForKey("Home", 3, 5)).toBe(0);
    expect(wordIndexForKey("End", 1, 5)).toBe(4);
  });

  it("ignores other keys", () => {
    expect(wordIndexForKey("Enter", 2, 5)).toBeNull();
    expect(wordIndexForKey("a", 2, 5)).toBeNull();
  });
});
