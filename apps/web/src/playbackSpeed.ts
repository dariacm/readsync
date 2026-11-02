export const SPEEDS = [0.75, 1, 1.25, 1.5];
const STORAGE_KEY = "readsync:speed";

type SpeedStorage = Pick<Storage, "getItem" | "setItem">;

/** localStorage, or undefined where it's blocked (some private browsing modes throw on access). */
function browserStorage(): SpeedStorage | undefined {
  try {
    return globalThis.localStorage;
  } catch {
    return undefined;
  }
}

/** The speed chosen on an earlier visit, or 1× if there's none or it can't be read. */
export function loadSpeed(storage = browserStorage()): number {
  try {
    const saved = Number(storage?.getItem(STORAGE_KEY));
    return SPEEDS.includes(saved) ? saved : 1;
  } catch {
    return 1;
  }
}

export function saveSpeed(speed: number, storage = browserStorage()) {
  try {
    storage?.setItem(STORAGE_KEY, String(speed));
  } catch {
    // Not remembering the speed is fine; the reader still works.
  }
}
