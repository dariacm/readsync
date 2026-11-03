import { useEffect, useMemo, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from "react";
import type { TextChunk } from "@readsync/shared";
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from "./icons";
import { SPEEDS } from "./playbackSpeed";
import type { ReadingSettings } from "./readingSettings";
import { sentenceIndexes, wordIndexForKey } from "./readerPosition";
import { useChunkedReader } from "./useChunkedReader";

interface ReadAlongProps {
  text: string;
  chunks: TextChunk[];
  speed: number;
  onSpeedChange: (speed: number) => void;
  settings: ReadingSettings;
}

export function ReadAlong({ text, chunks, speed, onSpeedChange, settings }: ReadAlongProps) {
  const reader = useChunkedReader(text, chunks, speed);
  const sectionRef = useRef<HTMLElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  // For sentence focus: which sentence each word belongs to, and which one is being read.
  const wordSentences = useMemo(
    () => sentenceIndexes(reader.sentenceStarts, reader.tokens.map((t) => t.charStart)),
    [reader.sentenceStarts, reader.tokens],
  );
  const currentSentence = reader.sentence.current - 1;

  // A new text mounts a new player: bring it into view and move focus to play/pause, so readers
  // don't have to scroll down from the text box, and keyboard users can pause with Space right away.
  useEffect(() => {
    const smooth = !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    playButtonRef.current?.focus({ preventScroll: true });
    sectionRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }, []);

  // Keyboard navigation: the text is one Tab stop ("roving" focus). Arrow keys, Home and End move
  // between words, Enter reads from the focused word, and Space pauses or resumes, as in media
  // players, so keyboard users never have to leave the text. Tabbing in lands on the spoken word.
  const readingRef = useRef<HTMLParagraphElement>(null);
  const [focusedWord, setFocusedWord] = useState<number | null>(null);
  const [focusInText, setFocusInText] = useState(false);
  const tabbableWord =
    focusInText && focusedWord !== null
      ? focusedWord
      : reader.activeTokenIndex >= 0
        ? reader.activeTokenIndex
        : (focusedWord ?? 0);

  const onTextKeyDown = (e: KeyboardEvent<HTMLParagraphElement>) => {
    const index = Number((e.target as HTMLElement).dataset.index);
    if (Number.isNaN(index)) return;

    if (e.key === "Enter") {
      e.preventDefault();
      reader.seekToOffset(reader.tokens[index]!.charStart);
      return;
    }
    if (e.key === " ") {
      e.preventDefault(); // also stops the page from scrolling
      reader.togglePlay();
      return;
    }
    const next = wordIndexForKey(e.key, index, reader.tokens.length);
    if (next === null) return;
    e.preventDefault();
    readingRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
  };

  const onTextBlur = (e: FocusEvent<HTMLParagraphElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setFocusInText(false);
  };

  // Hold the bar where it was while the next part loads (no word is active then).
  const progressRef = useRef(0);
  if (reader.activeTokenIndex >= 0) progressRef.current = (reader.activeTokenIndex + 1) / reader.tokens.length;

  // Interleave the words with the whitespace between them, so line breaks survive.
  const segments: ReactNode[] = [];
  let cursor = 0;
  reader.tokens.forEach((token, i) => {
    if (token.charStart > cursor) segments.push(text.slice(cursor, token.charStart));
    segments.push(
      <span
        key={i}
        className={[
          "word",
          i === reader.activeTokenIndex && "active",
          settings.sentenceFocus && wordSentences[i] !== currentSentence && "dimmed",
        ]
          .filter(Boolean)
          .join(" ")}
        tabIndex={i === tabbableWord ? 0 : -1}
        data-index={i}
        onFocus={() => setFocusedWord(i)}
        onClick={() => reader.seekToOffset(token.charStart)}
      >
        {token.text}
      </span>,
    );
    cursor = token.charEnd;
  });
  segments.push(text.slice(cursor));

  const playLabel = reader.isPlaying ? "Pause" : "Play";

  return (
    <section
      ref={sectionRef}
      className="card reader"
      aria-label="Read-along"
      data-size={settings.size}
      data-font={settings.font}
      data-highlight={settings.highlight}
      data-colours={settings.colours}
    >
      <audio ref={reader.audioRef} preload="auto" />

      <div className="player">
        <div className="transport" role="group" aria-label="Playback">
          <button
            type="button"
            className="icon-button"
            onClick={reader.previousSentence}
            aria-label="Previous sentence"
            title="Previous sentence"
          >
            <PreviousIcon />
          </button>
          <button
            ref={playButtonRef}
            type="button"
            className="icon-button play"
            onClick={reader.togglePlay}
            aria-label={playLabel}
            title={playLabel}
          >
            {reader.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={reader.nextSentence}
            aria-label="Next sentence"
            title="Next sentence"
          >
            <NextIcon />
          </button>
        </div>

        <div className="player-progress">
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ transform: `scaleX(${progressRef.current})` }} />
          </div>
          <div className="progress-meta">
            <span className="muted small" role="status" aria-live="polite">
              {reader.isLoading ? (
                <span className="loading">
                  <span className="spinner" aria-hidden="true" /> Generating speech…
                </span>
              ) : reader.sentence.total > 1 ? (
                `Sentence ${reader.sentence.current} of ${reader.sentence.total}`
              ) : null}
            </span>
          </div>
        </div>

        <fieldset className="pills speed">
          <legend className="visually-hidden">Speed</legend>
          {SPEEDS.map((s) => (
            <label key={s} className={s === speed ? "pill selected" : "pill"}>
              <input
                type="radio"
                name="speed"
                value={s}
                checked={s === speed}
                onChange={() => onSpeedChange(s)}
                aria-label={`${s} times`}
                className="visually-hidden"
              />
              {s}×
            </label>
          ))}
        </fieldset>
      </div>

      {reader.error && (
        <div role="alert" className="notice error">
          <span>{reader.error}</span>
          <button type="button" className="button secondary small" onClick={reader.retry}>
            Try again
          </button>
        </div>
      )}

      <p id="reading-hint" className="visually-hidden">
        Use the left and right arrow keys to move between words, Enter to read from a word, and Space to pause or
        resume.
      </p>
      <p
        ref={readingRef}
        className="reading"
        role="group"
        aria-label="Text"
        aria-describedby="reading-hint"
        onKeyDown={onTextKeyDown}
        onFocus={() => setFocusInText(true)}
        onBlur={onTextBlur}
      >
        {segments}
      </p>
    </section>
  );
}
