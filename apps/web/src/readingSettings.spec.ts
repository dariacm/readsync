import { describe, expect, it } from "vitest";
import { DEFAULT_READING_SETTINGS, loadReadingSettings, saveReadingSettings } from "./readingSettings";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("reading settings", () => {
  it("uses the defaults when nothing is saved", () => {
    expect(loadReadingSettings(memoryStorage())).toEqual(DEFAULT_READING_SETTINGS);
  });

  it("remembers saved settings", () => {
    const storage = memoryStorage();
    const settings = { size: "huge", font: "hyperlegible", highlight: "inverted", colours: "blue", sentenceFocus: true } as const;
    saveReadingSettings(settings, storage);
    expect(loadReadingSettings(storage)).toEqual(settings);
  });

  it("replaces invalid or missing fields with their defaults, keeping the valid ones", () => {
    const storage = memoryStorage();
    storage.setItem("readsync:reading", JSON.stringify({ size: "large", font: "comic", sentenceFocus: "yes" }));
    expect(loadReadingSettings(storage)).toEqual({ ...DEFAULT_READING_SETTINGS, size: "large" });
  });

  it("falls back to the defaults for unreadable JSON or blocked storage", () => {
    const broken = memoryStorage();
    broken.setItem("readsync:reading", "{not json");
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadReadingSettings(broken)).toEqual(DEFAULT_READING_SETTINGS);
    expect(loadReadingSettings(blocked)).toEqual(DEFAULT_READING_SETTINGS);
    expect(() => saveReadingSettings(DEFAULT_READING_SETTINGS, blocked)).not.toThrow();
  });
});
