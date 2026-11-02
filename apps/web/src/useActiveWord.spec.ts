import { describe, expect, it } from "vitest";
import type { WordTiming } from "@readsync/shared";
import { findActiveWord } from "./useActiveWord";

function word(text: string, startSec: number, endSec: number): WordTiming {
  return { text, charStart: 0, charEnd: text.length, startSec, endSec };
}

describe("findActiveWord", () => {
  const words = [word("Great", 0, 0.3), word("news", 0.4, 0.6), word("🎉", 0.66, 0.66), word("she", 0.66, 0.78)];

  it("returns -1 before the first word starts", () => {
    expect(findActiveWord(words, -0.1)).toBe(-1);
  });

  it("keeps the current word active through the pause after it", () => {
    expect(findActiveWord(words, 0.2)).toBe(0);
    expect(findActiveWord(words, 0.35)).toBe(0);
  });

  it("never highlights a silent emoji that starts with the next word", () => {
    expect(findActiveWord(words, 0.66)).toBe(3);
    expect(findActiveWord(words, 0.7)).toBe(3);
  });

  it("keeps the last word active after the audio ends", () => {
    expect(findActiveWord(words, 10)).toBe(3);
  });
});
