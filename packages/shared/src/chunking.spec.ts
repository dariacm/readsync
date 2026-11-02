import { describe, expect, it } from "vitest";
import { MAX_CHUNK_LENGTH, splitIntoChunks, type TextChunk } from "./chunking.js";

function expectChunksMatchText(text: string, chunks: TextChunk[]) {
  for (const chunk of chunks) {
    expect(text.slice(chunk.charStart, chunk.charStart + chunk.text.length)).toBe(chunk.text);
    expect(chunk.text).toBe(chunk.text.trim());
    expect(chunk.sentenceStarts[0]).toBe(chunk.charStart);
  }
}

describe("splitIntoChunks", () => {
  it("keeps a short text in one chunk, trimmed", () => {
    const text = "  Hello there. How are you?\n";
    const chunks = splitIntoChunks(text);

    expect(chunks).toEqual([{ text: "Hello there. How are you?", charStart: 2, sentenceStarts: [2, 15] }]);
  });

  it("returns no chunks for blank text", () => {
    expect(splitIntoChunks("")).toEqual([]);
    expect(splitIntoChunks(" \n\t")).toEqual([]);
  });

  it("makes the first chunk small and groups later sentences up to the target", () => {
    const sentence = "This sentence is about forty characters. ";
    const text = sentence.repeat(30);
    const chunks = splitIntoChunks(text, { firstChunkLength: 100, chunkLength: 300 });

    expectChunksMatchText(text, chunks);
    expect(chunks[0]!.text.length).toBeLessThanOrEqual(100);
    for (const chunk of chunks.slice(1)) expect(chunk.text.length).toBeLessThanOrEqual(300);
    expect(chunks.map((c) => c.text).join(" ")).toBe(text.trim());
  });

  it("never splits inside a sentence", () => {
    const text = "One short sentence. " + "A much longer sentence that goes past the target length on its own. ";
    const chunks = splitIntoChunks(text, { firstChunkLength: 10, chunkLength: 10 });

    expect(chunks.map((c) => c.text)).toEqual([
      "One short sentence.",
      "A much longer sentence that goes past the target length on its own.",
    ]);
  });

  it("doesn't treat an abbreviation like Dr. as a sentence", () => {
    const text = "Dr. Ellis left early. She came back later.";
    const chunks = splitIntoChunks(text, { firstChunkLength: 5, chunkLength: 5 });

    expect(chunks.map((c) => c.text)).toEqual(["Dr. Ellis left early.", "She came back later."]);
  });

  it("keeps paragraph breaks out of the chunk text", () => {
    const text = "First paragraph.\n\nSecond paragraph.";
    const chunks = splitIntoChunks(text, { firstChunkLength: 10, chunkLength: 10 });

    expect(chunks.map((c) => c.text)).toEqual(["First paragraph.", "Second paragraph."]);
    expect(chunks[1]!.charStart).toBe(18);
  });

  it("splits sentences in languages without spaces", () => {
    const text = "東京は晴れです。明日は雨です。";
    const chunks = splitIntoChunks(text, { locale: "ja", firstChunkLength: 5, chunkLength: 5 });

    expect(chunks.map((c) => c.text)).toEqual(["東京は晴れです。", "明日は雨です。"]);
  });

  it("splits a sentence longer than the request limit at whitespace", () => {
    const text = "word ".repeat(MAX_CHUNK_LENGTH / 2).trim();
    const chunks = splitIntoChunks(text);

    expectChunksMatchText(text, chunks);
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.text.length).toBeLessThanOrEqual(MAX_CHUNK_LENGTH);
      expect(chunk.text.startsWith("word")).toBe(true);
    }
  });
});
