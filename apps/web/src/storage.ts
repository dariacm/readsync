export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

/** localStorage, or undefined where it's blocked (some private browsing modes throw on access). */
export function browserStorage(): KeyValueStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** Reads a saved preference; a missing or unreadable store just means "not saved". */
export function readPreference(key: string, storage = browserStorage()): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string, storage = browserStorage()) {
  try {
    storage?.setItem(key, value);
  } catch {
    // Not remembering a preference is fine; the reader still works.
  }
}
