import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { tokenize, type TextChunk, type WordTiming } from "@readsync/shared";
import { base64ToAudioUrl } from "./api";
import { chunkIndexAt, nextSentenceStart, previousSentenceStart, sentenceIndexAt, startTimeAt } from "./readerPosition";
import { speakOnce } from "./speechCache";
import { useActiveWord } from "./useActiveWord";

type ChunkState =
  | { status: "idle" | "loading" }
  | { status: "ready"; audioUrl: string; words: WordTiming[] }
  | { status: "error"; message: string };

/** How many chunks to generate ahead of the one playing. */
const LOOKAHEAD = 1;
const NO_WORDS: WordTiming[] = [];

/** Keeps a ref pointing at the latest value, for event handlers registered once. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Plays a text chunk by chunk through one <audio> element: generates the current chunk and the
 * next one ahead of time, moves on when a chunk ends, and maps the spoken word back to the full text.
 */
export function useChunkedReader(text: string, chunks: TextChunk[], speed: number) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [states, setStates] = useState<ChunkState[]>(() => chunks.map(() => ({ status: "idle" })));
  const [current, setCurrent] = useState(0);
  const [wantsToPlay, setWantsToPlay] = useState(true);

  const statesRef = useLatest(states);
  const currentRef = useLatest(current);
  const wantsToPlayRef = useLatest(wantsToPlay);
  const speedRef = useLatest(speed);

  /** Offset in the full text to start from once the current chunk is loaded. */
  const pendingSeek = useRef<number | null>(null);
  /** Set while we pause the audio ourselves to switch chunks, so it isn't taken as the user pausing. */
  const switchingChunk = useRef(false);
  const requested = useRef(new Set<number>());
  /** Identifies the current mount, so results arriving after an unmount are ignored. */
  const mountRef = useRef<object | null>(null);
  const urlsRef = useRef<string[]>([]);

  // Requests aren't aborted on unmount: ElevenLabs charges for them anyway, and speakOnce lets
  // StrictMode's second mount reuse the requests its first mount sent.
  useEffect(() => {
    const mount = {};
    const urls: string[] = [];
    mountRef.current = mount;
    urlsRef.current = urls;
    return () => {
      mountRef.current = null;
      requested.current.clear();
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const setChunkState = useCallback((index: number, state: ChunkState) => {
    setStates((prev) => prev.map((s, i) => (i === index ? state : s)));
  }, []);

  const load = useCallback(
    (index: number) => {
      const chunk = chunks[index];
      const mount = mountRef.current;
      if (!chunk || !mount || requested.current.has(index)) return;

      requested.current.add(index);
      setChunkState(index, { status: "loading" });
      speakOnce({ text: chunk.text, previousText: chunks[index - 1]?.text, nextText: chunks[index + 1]?.text })
        .then((res) => {
          if (mountRef.current !== mount) return;
          if (res.text !== chunk.text) console.warn(`Chunk ${index} came back with different text; highlights may drift.`);
          const audioUrl = base64ToAudioUrl(res.audioBase64);
          urlsRef.current.push(audioUrl);
          const words = res.words.map((w) => ({
            ...w,
            charStart: w.charStart + chunk.charStart,
            charEnd: w.charEnd + chunk.charStart,
          }));
          setChunkState(index, { status: "ready", audioUrl, words });
        })
        .catch((err: unknown) => {
          if (mountRef.current !== mount) return;
          requested.current.delete(index);
          setChunkState(index, {
            status: "error",
            message: err instanceof Error ? err.message : "Speech generation failed.",
          });
        });
    },
    [chunks, setChunkState],
  );

  useEffect(() => {
    for (let i = current; i <= current + LOOKAHEAD; i++) load(i);
  }, [current, load]);

  const play = useCallback(() => {
    audioRef.current?.play().catch((err: unknown) => {
      // AbortError means a newer src replaced this one; anything else (e.g. autoplay blocked) stops playback.
      if (!(err instanceof DOMException && err.name === "AbortError")) setWantsToPlay(false);
    });
  }, []);

  const currentState = states[current];
  const ready = currentState?.status === "ready" ? currentState : undefined;

  // Load the current chunk's audio once it's generated, then apply any pending seek.
  // Declared before useActiveWord so the new src is in place before it reads currentTime.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !ready) return;

    audio.src = ready.audioUrl;
    audio.defaultPlaybackRate = audio.playbackRate = speedRef.current;
    const onLoaded = () => {
      if (pendingSeek.current !== null) {
        audio.currentTime = startTimeAt(ready.words, pendingSeek.current);
        pendingSeek.current = null;
      }
      if (wantsToPlayRef.current) play();
    };
    audio.addEventListener("loadedmetadata", onLoaded, { once: true });
    return () => audio.removeEventListener("loadedmetadata", onLoaded);
  }, [ready, play, speedRef, wantsToPlayRef]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.defaultPlaybackRate = audio.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      if (currentRef.current < chunks.length - 1) setCurrent((c) => c + 1);
      else setWantsToPlay(false);
    };
    const onPause = () => {
      if (switchingChunk.current) switchingChunk.current = false;
      else if (!audio.ended) setWantsToPlay(false);
    };
    const onPlay = () => setWantsToPlay(true);

    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [chunks.length, currentRef]);

  const words = ready?.words ?? NO_WORDS;
  const activeWord = words[useActiveWord(audioRef, words)];

  const tokens = useMemo(() => tokenize(text), [text]);
  const tokenIndexByOffset = useMemo(() => new Map(tokens.map((t, i) => [t.charStart, i])), [tokens]);
  const sentenceStarts = useMemo(() => chunks.flatMap((c) => c.sentenceStarts), [chunks]);

  const seekToOffset = useCallback(
    (offset: number) => {
      const audio = audioRef.current;
      const index = chunkIndexAt(chunks, offset);
      setWantsToPlay(true);

      if (index === currentRef.current) {
        const state = statesRef.current[index];
        if (audio && state?.status === "ready") {
          audio.currentTime = startTimeAt(state.words, offset);
          play();
        } else {
          pendingSeek.current = offset;
        }
        return;
      }

      if (audio && !audio.paused) {
        switchingChunk.current = true;
        audio.pause();
      }
      pendingSeek.current = offset;
      setCurrent(index);
    },
    [chunks, currentRef, statesRef, play],
  );

  const position = activeWord?.charStart ?? chunks[current]?.charStart ?? 0;

  const previousSentence = () => {
    const audio = audioRef.current;
    const sentence = sentenceStarts.findLast((start) => start <= position) ?? 0;
    const elapsed = audio && ready ? audio.currentTime - startTimeAt(ready.words, sentence) : 0;
    const target = previousSentenceStart(sentenceStarts, position, elapsed);
    if (target !== undefined) seekToOffset(target);
  };

  const nextSentence = () => {
    const target = nextSentenceStart(sentenceStarts, position);
    if (target !== undefined) seekToOffset(target);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (wantsToPlay) {
      setWantsToPlay(false);
      audio.pause();
    } else if (audio.ended && current === chunks.length - 1) {
      seekToOffset(chunks[0]!.charStart);
    } else {
      setWantsToPlay(true);
      if (ready) play();
    }
  };

  return {
    audioRef,
    tokens,
    activeTokenIndex: activeWord ? (tokenIndexByOffset.get(activeWord.charStart) ?? -1) : -1,
    isPlaying: wantsToPlay,
    isLoading: wantsToPlay && currentState?.status !== "ready" && currentState?.status !== "error",
    error: currentState?.status === "error" ? currentState.message : undefined,
    retry: () => load(current),
    // Chunks are an internal detail; readers see their position in sentences.
    sentence: { current: sentenceIndexAt(sentenceStarts, position) + 1, total: sentenceStarts.length },
    togglePlay,
    previousSentence,
    nextSentence,
    seekToOffset,
  };
}
