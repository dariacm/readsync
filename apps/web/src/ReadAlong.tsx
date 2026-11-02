import { useEffect, useRef, type ReactNode } from "react";
import type { TextChunk } from "@readsync/shared";
import { NextIcon, PauseIcon, PlayIcon, PreviousIcon } from "./icons";
import { SPEEDS } from "./playbackSpeed";
import { useChunkedReader } from "./useChunkedReader";

interface ReadAlongProps {
  text: string;
  chunks: TextChunk[];
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export function ReadAlong({ text, chunks, speed, onSpeedChange }: ReadAlongProps) {
  const reader = useChunkedReader(text, chunks, speed);
  const sectionRef = useRef<HTMLElement>(null);
  const playButtonRef = useRef<HTMLButtonElement>(null);

  // A new text mounts a new player: bring it into view and move focus to play/pause, so readers
  // don't have to scroll down from the text box, and keyboard users can pause with Space right away.
  useEffect(() => {
    const smooth = !globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    playButtonRef.current?.focus({ preventScroll: true });
    sectionRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "start" });
  }, []);

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
        className={i === reader.activeTokenIndex ? "word active" : "word"}
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
    <section ref={sectionRef} className="card reader" aria-label="Read-along">
      <audio ref={reader.audioRef} preload="auto" />

      <div className="player">
        <div className="transport" role="group" aria-label="Playback">
          <button type="button" className="icon-button" onClick={reader.previousSentence} aria-label="Previous sentence" title="Previous sentence">
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
          <button type="button" className="icon-button" onClick={reader.nextSentence} aria-label="Next sentence" title="Next sentence">
            <NextIcon />
          </button>
        </div>

        <div className="player-progress">
          <div className="progress-track" aria-hidden="true">
            <div className="progress-fill" style={{ transform: `scaleX(${progressRef.current})` }} />
          </div>
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

        <fieldset className="speed">
          <legend className="visually-hidden">Speed</legend>
          {SPEEDS.map((s) => (
            <label key={s} className={s === speed ? "speed-option selected" : "speed-option"}>
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

      <p className="reading">{segments}</p>
    </section>
  );
}
