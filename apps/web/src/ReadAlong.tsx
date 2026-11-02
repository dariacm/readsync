import { useEffect, useMemo, useRef, useState } from "react";
import type { SpeakResponse } from "@readsync/shared";
import { base64ToAudioUrl } from "./api";
import { useActiveWord } from "./useActiveWord";

const SPEEDS = [0.75, 1, 1.25, 1.5];

export function ReadAlong({ result }: { result: SpeakResponse }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [speed, setSpeed] = useState(1);
  const audioUrl = useMemo(() => base64ToAudioUrl(result.audioBase64), [result.audioBase64]);
  const active = useActiveWord(audioRef, result.words);

  useEffect(() => () => URL.revokeObjectURL(audioUrl), [audioUrl]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, audioUrl]);

  const seekTo = (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = seconds;
    void audio.play();
  };

  // Interleave the words with the whitespace between them, so line breaks survive.
  const segments: React.ReactNode[] = [];
  let cursor = 0;
  result.words.forEach((word, i) => {
    if (word.charStart > cursor) segments.push(result.text.slice(cursor, word.charStart));
    segments.push(
      <span
        key={i}
        className={i === active ? "word active" : "word"}
        onClick={() => seekTo(word.startSec)}
      >
        {word.text}
      </span>,
    );
    cursor = word.charEnd;
  });
  segments.push(result.text.slice(cursor));

  return (
    <section aria-label="Read-along">
      <div className="controls">
        <audio ref={audioRef} src={audioUrl} controls autoPlay />
        <label>
          Speed{" "}
          <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))}>
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="reading">{segments}</p>
    </section>
  );
}
