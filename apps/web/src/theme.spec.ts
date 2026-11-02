import { describe, expect, it } from "vitest";
import { loadTheme, saveTheme } from "./theme";

function memoryStorage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, value),
  };
}

describe("theme preference", () => {
  it("remembers the chosen theme", () => {
    const storage = memoryStorage();
    saveTheme("dark", storage);
    expect(loadTheme(storage)).toBe("dark");
  });

  it("follows the system when nothing valid is saved", () => {
    const storage = memoryStorage();
    expect(loadTheme(storage)).toBeNull();
    storage.setItem("readsync:theme", "sepia");
    expect(loadTheme(storage)).toBeNull();
  });

  it("follows the system when storage is unavailable", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(loadTheme(throwing)).toBeNull();
    expect(() => saveTheme("light", throwing)).not.toThrow();
  });
});
