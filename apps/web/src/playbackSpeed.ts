import { readPreference, writePreference, type KeyValueStorage } from "./storage";

export const SPEEDS = [0.75, 1, 1.25, 1.5];
const STORAGE_KEY = "readsync:speed";

/** The speed chosen on an earlier visit, or 1× if there's none or it can't be read. */
export function loadSpeed(storage?: KeyValueStorage): number {
  const saved = Number(readPreference(STORAGE_KEY, storage));
  return SPEEDS.includes(saved) ? saved : 1;
}

export function saveSpeed(speed: number, storage?: KeyValueStorage) {
  writePreference(STORAGE_KEY, String(speed), storage);
}
