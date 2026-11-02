/** Upper bound for one TTS request. Chunks normally stay far below it, to keep each wait short. */
export const MAX_CHUNK_LENGTH = 5000;

/** A piece of the full text, made of whole sentences, generated as one TTS request. */
export interface TextChunk {
  /** Trimmed text sent to ElevenLabs. */
  text: string;
  /** Offset of `text` in the full text. */
  charStart: number;
  /** Offsets in the full text where each sentence of the chunk starts. */
  sentenceStarts: number[];
}

export interface ChunkOptions {
  /** BCP 47 locale for sentence detection; defaults to the runtime's. */
  locale?: string;
  /** Target length of the first chunk, kept small so playback starts quickly. */
  firstChunkLength?: number;
  /** Target length of the following chunks. */
  chunkLength?: number;
}

interface Span {
  start: number;
  end: number;
}

/** Segments shorter than this are usually abbreviations the segmenter mistook for sentences ("Dr."). */
const MIN_SENTENCE_LENGTH = 5;

/**
 * Splits text into chunks of whole sentences. Chunks grow up to the target length, so most
 * sentence-detection mistakes fall inside a chunk rather than on a boundary.
 */
export function splitIntoChunks(
  text: string,
  { locale, firstChunkLength = 250, chunkLength = 800 }: ChunkOptions = {},
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let current: (Span & { sentenceStarts: number[] }) | undefined;

  const close = () => {
    if (!current) return;
    chunks.push({
      text: text.slice(current.start, current.end),
      charStart: current.start,
      sentenceStarts: current.sentenceStarts,
    });
    current = undefined;
  };

  for (const sentence of splitIntoSentences(text, locale)) {
    const target = chunks.length === 0 ? firstChunkLength : chunkLength;
    if (current && sentence.end - current.start > target) close();

    if (current) {
      current.end = sentence.end;
      current.sentenceStarts.push(sentence.start);
    } else {
      current = { ...sentence, sentenceStarts: [sentence.start] };
    }
  }
  close();

  return chunks;
}

function splitIntoSentences(text: string, locale?: string): Span[] {
  const segmenter = new Intl.Segmenter(locale, { granularity: "sentence" });
  const sentences: Span[] = [];
  let pendingStart: number | undefined;

  for (const { segment, index } of segmenter.segment(text)) {
    const span = trimSpan(text, index, index + segment.length);
    if (!span) continue;

    const start = pendingStart ?? span.start;
    if (span.end - span.start < MIN_SENTENCE_LENGTH) {
      pendingStart = start;
      continue;
    }
    pendingStart = undefined;
    sentences.push(...splitOversized(text, { start, end: span.end }));
  }
  if (pendingStart !== undefined) {
    const span = trimSpan(text, pendingStart, text.length);
    if (span) sentences.push(span);
  }

  return sentences;
}

/** Splits a span longer than `MAX_CHUNK_LENGTH` at whitespace (or mid-word as a last resort). */
function splitOversized(text: string, span: Span): Span[] {
  const pieces: Span[] = [];
  let { start } = span;

  while (span.end - start > MAX_CHUNK_LENGTH) {
    let cut = start + MAX_CHUNK_LENGTH;
    while (cut > start && !/\s/.test(text[cut]!)) cut--;
    if (cut === start) cut = start + MAX_CHUNK_LENGTH;

    pieces.push(trimSpan(text, start, cut)!);
    start = trimSpan(text, cut, span.end)!.start;
  }
  pieces.push({ start, end: span.end });

  return pieces;
}

function trimSpan(text: string, start: number, end: number): Span | undefined {
  while (start < end && /\s/.test(text[start]!)) start++;
  while (end > start && /\s/.test(text[end - 1]!)) end--;
  return start < end ? { start, end } : undefined;
}
