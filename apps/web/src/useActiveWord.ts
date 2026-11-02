import { useEffect, useState, type RefObject } from "react";
import type { WordTiming } from "@readsync/shared";

/** Index of the last word that has started by `time`, or -1 before the first word. */
export function findActiveWord(words: WordTiming[], time: number): number {
  let lo = 0;
  let hi = words.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (words[mid]!.startSec <= time) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * Tracks which word is being spoken. Polls on animation frames while playing,
 * because `timeupdate` only fires a few times per second — too coarse for word sync.
 */
export function useActiveWord(audioRef: RefObject<HTMLAudioElement | null>, words: WordTiming[]): number {
  const [active, setActive] = useState(-1);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let frame = 0;
    const update = () => setActive(findActiveWord(words, audio.currentTime));
    const tick = () => {
      update();
      frame = requestAnimationFrame(tick);
    };
    const start = () => {
      cancelAnimationFrame(frame);
      tick();
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      update();
    };

    audio.addEventListener("play", start);
    audio.addEventListener("pause", stop);
    audio.addEventListener("seeked", update);
    audio.addEventListener("ended", stop);
    update();

    return () => {
      cancelAnimationFrame(frame);
      audio.removeEventListener("play", start);
      audio.removeEventListener("pause", stop);
      audio.removeEventListener("seeked", update);
      audio.removeEventListener("ended", stop);
    };
  }, [audioRef, words]);

  return active;
}
