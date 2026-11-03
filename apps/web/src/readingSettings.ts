import { useState } from "react";
import { readPreference, writePreference, type KeyValueStorage } from "./storage";

export const TEXT_SIZES = ["standard", "large", "x-large", "huge"] as const;
export const FONTS = ["default", "hyperlegible"] as const;
export const HIGHLIGHTS = ["marker", "outline", "inverted"] as const;
export const COLOURS = ["paper", "contrast", "blue"] as const;

export interface ReadingSettings {
  size: (typeof TEXT_SIZES)[number];
  font: (typeof FONTS)[number];
  /** How the spoken word is marked; every style works without telling colours apart. */
  highlight: (typeof HIGHLIGHTS)[number];
  /** Text and background colours of the reading area, in light and dark mode. */
  colours: (typeof COLOURS)[number];
  /** Dims everything but the sentence being read. */
  sentenceFocus: boolean;
}

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  size: "standard",
  font: "default",
  highlight: "marker",
  colours: "paper",
  sentenceFocus: false,
};

const STORAGE_KEY = "readsync:reading";

function oneOf<T extends string>(options: readonly T[], value: unknown, fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback;
}

/** Saved settings, field by field: anything missing or invalid falls back to its default. */
export function loadReadingSettings(storage?: KeyValueStorage): ReadingSettings {
  let saved: Partial<Record<keyof ReadingSettings, unknown>> = {};
  try {
    saved = JSON.parse(readPreference(STORAGE_KEY, storage) ?? "{}") ?? {};
  } catch {
    // Unreadable JSON: use the defaults.
  }
  const d = DEFAULT_READING_SETTINGS;
  return {
    size: oneOf(TEXT_SIZES, saved.size, d.size),
    font: oneOf(FONTS, saved.font, d.font),
    highlight: oneOf(HIGHLIGHTS, saved.highlight, d.highlight),
    colours: oneOf(COLOURS, saved.colours, d.colours),
    sentenceFocus: typeof saved.sentenceFocus === "boolean" ? saved.sentenceFocus : d.sentenceFocus,
  };
}

export function saveReadingSettings(settings: ReadingSettings, storage?: KeyValueStorage) {
  writePreference(STORAGE_KEY, JSON.stringify(settings), storage);
}

/** Reading settings that are remembered across texts and visits. */
export function useReadingSettings() {
  const [settings, setSettings] = useState(loadReadingSettings);

  const updateSettings = (change: Partial<ReadingSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...change };
      saveReadingSettings(next);
      return next;
    });
  };

  return { settings, updateSettings };
}
