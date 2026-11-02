import { useState, type FormEvent } from "react";
import { MAX_TEXT_LENGTH, splitIntoChunks, type TextChunk } from "@readsync/shared";
import { loadSpeed, saveSpeed } from "./playbackSpeed";
import { ReadAlong } from "./ReadAlong";

interface Session {
  id: number;
  text: string;
  chunks: TextChunk[];
}

export function App() {
  const [text, setText] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  // Lives here, not in the player, so a chosen speed carries over to the next text (and visit).
  const [speed, setSpeed] = useState(loadSpeed);

  const changeSpeed = (value: number) => {
    setSpeed(value);
    saveSpeed(value);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const chunks = splitIntoChunks(text);
    if (chunks.length === 0) return;
    setSession((prev) => ({ id: (prev?.id ?? 0) + 1, text, chunks }));
  };

  return (
    <main>
      <h1>ReadSync</h1>
      <form onSubmit={onSubmit}>
        <label htmlFor="text">Text to read aloud</label>
        <textarea
          id="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TEXT_LENGTH}
          rows={8}
          aria-describedby="text-length"
        />
        <span id="text-length" className="hint">
          {text.length.toLocaleString()} / {MAX_TEXT_LENGTH.toLocaleString()} characters
        </span>
        <button type="submit" disabled={!text.trim()}>
          Read aloud
        </button>
      </form>
      {/* A new key per submission gives each text a fresh player. */}
      {session && (
        <ReadAlong
          key={session.id}
          text={session.text}
          chunks={session.chunks}
          speed={speed}
          onSpeedChange={changeSpeed}
        />
      )}
    </main>
  );
}
