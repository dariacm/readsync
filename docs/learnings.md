# Learnings

Notes from building ReadSync, mostly about how ElevenLabs behaves.

## Timing and alignment

- **Timestamps come per character, in two versions.** The response has `alignment`, which maps to the text as written, and `normalized_alignment`, which maps to the text as spoken (for example "£12" → "twelve pounds"). ReadSync uses `alignment`, so the highlight stays on the reader's own words even when the voice says more.
- **Emojis are silent but stay in the timings.** The voice skips them, while `alignment` keeps each one with zero duration, starting when the next word starts. Composite emojis like 👩‍💻 arrive split into their parts (👩, a zero-width joiner, 💻) but join back into the original text, so highlight offsets stay correct. Because a standalone emoji starts at the same moment as the next word, the highlight goes straight to that word and never rests on the emoji. Silence is a deliberate default: screen readers announce emoji names, but in a read-along "party popper" would mostly be noise. A "describe emojis" setting could cover texts where an emoji carries meaning.
- **Whitespace isn't a universal word boundary.** Splitting on spaces works for English, French or German, but treats a whole Japanese sentence as one word. `Intl.Segmenter` is the planned fix.

## Text normalization and pronunciation

- **Expand text on the ElevenLabs side, not before sending it.** Rewriting text in code or with an LLM first (the docs suggest both) would make the timings map to the rewritten text, so readers would see words they never pasted. Text normalization and pronunciation dictionaries keep the original text intact.
- **Normalization `auto` isn't always enough.** With the default `apply_text_normalization: "auto"`, "£3,500.75" was read as a bare number without "pounds". ReadSync sets it to `on`.
- **Normalization expands abbreviations, but not reliably.** With normalization on, "i.e." and "e.g." were sometimes spoken as "that is" and "for example" and sometimes read letter by letter, depending on the sentence and the generation. A pronunciation dictionary with alias rules makes the expansion a fixed rule instead of the model's call; the multilingual model supports alias rules but not phoneme rules.
- **Pronunciation dictionaries don't know about languages.** A rule is a plain string replacement applied to every request, so English rules would also fire in a Spanish text (`etc.` → "et cetera" instead of "etcétera"), and other languages' abbreviations (`z. B.`, `p. ex.`) aren't covered at all. The rules are therefore keyed by language, one dictionary each; once the reader has a language picker, each request will send the dictionary for its language. Per-language alias lists are locale data, so a future improvement is managing them in a localization platform such as Lokalise, where translators can review their own language's abbreviations.

## API keys

- **Restricted API keys need every feature they touch.** A key scoped to Text to Speech fails as soon as a request references a pronunciation dictionary, so the key also needs the Pronunciation Dictionaries permission.

## Audio in the browser

- **Audio arrives as base64 inside JSON.** That lets audio and timings travel in one response, at the cost of a ~33% larger payload and no playback until the whole clip has arrived. Streaming with timestamps is the next step for long texts.
- **`timeupdate` is too coarse for word sync.** It fires only a few times per second, so the client reads `currentTime` on every animation frame while audio plays.
