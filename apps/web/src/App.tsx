import { useEffect, useRef, useState, type FormEvent } from "react";
import { MAX_TEXT_LENGTH, splitIntoChunks, type TextChunk } from "@readsync/shared";
import { fetchDemoText } from "./api";
import { MoonIcon, PlayIcon, SunIcon, WaveIcon } from "./icons";
import { loadSpeed, saveSpeed } from "./playbackSpeed";
import { ReadAlong } from "./ReadAlong";
import { ReadingSettingsPanel } from "./ReadingSettingsPanel";
import { useReadingSettings } from "./readingSettings";
import { useTheme } from "./theme";

interface Session {
  id: number;
  text: string;
  chunks: TextChunk[];
}

export function App() {
  const [text, setText] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  /** Set when the server replays a recorded sample (`pnpm dev:demo`), which can only read that text. */
  const [demoText, setDemoText] = useState<string | null>(null);
  // Lives here, not in the player, so a chosen speed carries over to the next text (and visit).
  const [speed, setSpeed] = useState(loadSpeed);
  const { theme, toggleTheme } = useTheme();
  const themeLabel = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  // In the header, not the player, so readers can set them up before reading anything.
  const { settings, updateSettings } = useReadingSettings();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const settingsPanelRef = useRef<HTMLDivElement>(null);

  // Close the settings on Escape (returning focus to their button) or on a click outside them.
  useEffect(() => {
    if (!settingsOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setSettingsOpen(false);
      settingsButtonRef.current?.focus();
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!settingsPanelRef.current?.contains(target) && !settingsButtonRef.current?.contains(target)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [settingsOpen]);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    saveSpeed(value);
  };

  useEffect(() => {
    let active = true;
    void fetchDemoText().then((sample) => {
      if (!active || sample === null) return;
      setDemoText(sample);
      setText(sample);
    });
    return () => {
      active = false;
    };
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) return;
    setSession((prev) => ({ id: (prev?.id ?? 0) + 1, text, chunks }));
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand">
            <WaveIcon className="brand-mark" />
            ReadSync
          </div>
          <div className="topbar-actions">
            <button
              ref={settingsButtonRef}
              type="button"
              className="icon-button text-icon"
              onClick={() => setSettingsOpen((open) => !open)}
              aria-label="Reading settings"
              title="Reading settings"
              aria-expanded={settingsOpen}
              aria-controls="reading-settings"
            >
              Aa
            </button>
            <button type="button" className="icon-button" onClick={toggleTheme} aria-label={themeLabel} title={themeLabel}>
              {theme === "dark" ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
          {settingsOpen && (
            <ReadingSettingsPanel
              ref={settingsPanelRef}
              id="reading-settings"
              settings={settings}
              onChange={updateSettings}
            />
          )}
        </div>
      </header>

      <main className="container">
        <div className="intro">
          <h1>Listen and follow along</h1>
          <p>Paste any text. ReadSync reads it aloud and highlights each word as it's spoken.</p>
        </div>

        {demoText !== null && (
          <div className="notice demo" role="note">
            <strong>Demo mode</strong>
            <span>
              This plays a pre-recorded sample, so no API key is needed. Audio generated with{" "}
              <a href="https://elevenlabs.io" target="_blank" rel="noreferrer">
                elevenlabs.io
              </a>
              .
            </span>
          </div>
        )}

        <form className="card composer" onSubmit={onSubmit}>
          <label htmlFor="text" className="visually-hidden">
            Text to read aloud
          </label>
          <textarea
            id="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_TEXT_LENGTH}
            readOnly={demoText !== null}
            rows={6}
            placeholder="Paste or type the text you'd like to hear…"
            aria-describedby="text-length"
          />
          <div className="composer-footer">
            <span id="text-length" className="muted small">
              {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
            </span>
            <button type="submit" className="button primary" disabled={!text.trim()}>
              <PlayIcon width={16} height={16} />
              Read aloud
            </button>
          </div>
        </form>

        {/* A new key per submission gives each text a fresh player. */}
        {session && (
          <ReadAlong
            key={session.id}
            text={session.text}
            chunks={session.chunks}
            speed={speed}
            onSpeedChange={changeSpeed}
            settings={settings}
          />
        )}
      </main>
    </div>
  );
}
