import { describe, expect, it } from "vitest";
import { loadSpeed, saveSpeed } from "./playbackSpeed";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("playback speed", () => {
  it("remembers a saved speed", () => {
    const storage = memoryStorage();
    saveSpeed(0.75, storage);
    expect(loadSpeed(storage)).toBe(0.75);
  });

  it("defaults to 1× when nothing valid is saved", () => {
    const storage = memoryStorage();
    expect(loadSpeed(storage)).toBe(1);
    storage.setItem("readsync:speed", "3");
    expect(loadSpeed(storage)).toBe(1);
    storage.setItem("readsync:speed", "fast");
    expect(loadSpeed(storage)).toBe(1);
  });

  it("works when storage is unavailable or throws", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadSpeed(undefined)).toBe(1);
    expect(loadSpeed(throwing)).toBe(1);
    expect(() => saveSpeed(1.25, throwing)).not.toThrow();
  });
});
