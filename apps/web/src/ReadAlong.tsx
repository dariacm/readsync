import type { ReactNode } from "react";
import type { TextChunk } from "@readsync/shared";
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

  return (
    <section aria-label="Read-along">
      <audio ref={reader.audioRef} preload="auto" />
      <div className="controls" role="group" aria-label="Playback">
        <button type="button" onClick={reader.previousSentence}>
          Previous sentence
        </button>
        <button type="button" onClick={reader.togglePlay} className="primary">
          {reader.isPlaying ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={reader.nextSentence}>
          Next sentence
        </button>
        <label>
          Speed{" "}
          <select value={speed} onChange={(e) => onSpeedChange(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        {reader.part.total > 1 && (
          <span className="part">
            Part {reader.part.current} of {reader.part.total}
          </span>
        )}
      </div>
      <p role="status" aria-live="polite" className="status">
        {reader.isLoading ? "Generating speech…" : ""}
      </p>
      {reader.error && (
        <p role="alert" className="status error">
          {reader.error}{" "}
          <button type="button" onClick={reader.retry}>
            Try again
          </button>
        </p>
      )}
      <p className="reading">{segments}</p>
    </section>
  );
}
