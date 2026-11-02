import { useState, type FormEvent } from "react";
import { MAX_TEXT_LENGTH, type SpeakResponse } from "@readsync/shared";
import { speak } from "./api";
import { ReadAlong } from "./ReadAlong";

export function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<SpeakResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      setResult(await speak({ text }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
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
        />
        <button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Generating…" : "Read aloud"}
        </button>
      </form>
      <p role="status" aria-live="polite">
        {error}
      </p>
      {result && <ReadAlong result={result} />}
    </main>
  );
}
