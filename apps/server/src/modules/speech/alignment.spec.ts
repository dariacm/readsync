import { describe, expect, it } from "vitest";
import { toWordTimings, type CharacterAlignment } from "./alignment.js";

function alignmentFor(text: string, secondsPerChar = 0.1): CharacterAlignment {
  const characters = [...text];
  return {
    characters,
    characterStartTimesSeconds: characters.map((_, i) => i * secondsPerChar),
    characterEndTimesSeconds: characters.map((_, i) => (i + 1) * secondsPerChar),
  };
}

describe("toWordTimings", () => {
  it("groups characters into words with offsets and timings", () => {
    const words = toWordTimings(alignmentFor("Hi there"));
    expect(words).toHaveLength(2);
    expect(words[0]).toMatchObject({ text: "Hi", charStart: 0, charEnd: 2 });
    expect(words[0]!.startSec).toBeCloseTo(0);
    expect(words[0]!.endSec).toBeCloseTo(0.2);
    expect(words[1]).toMatchObject({ text: "there", charStart: 3, charEnd: 8 });
    expect(words[1]!.startSec).toBeCloseTo(0.3);
  });

  it("keeps punctuation with its word and collapses repeated whitespace", () => {
    const words = toWordTimings(alignmentFor("Hello,  world!\n"));
    expect(words.map((w) => w.text)).toEqual(["Hello,", "world!"]);
    expect(words[1]!.charStart).toBe(8);
  });

  it("returns no words for empty or whitespace-only input", () => {
    expect(toWordTimings(alignmentFor(""))).toEqual([]);
    expect(toWordTimings(alignmentFor("  \n"))).toEqual([]);
  });
});
