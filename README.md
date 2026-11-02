# readsync

ReadSync: a read-along reader for dyslexia and low vision, in any language.

Paste text, and ReadSync reads it aloud with an [ElevenLabs](https://elevenlabs.io) voice while highlighting each word as it is spoken. Click any word to jump there.

## How it works

ElevenLabs' [text-to-speech with timestamps](https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps) endpoint returns the audio together with a start and end time for every character. The server groups those character timings into words; the client follows the audio's playback position on every animation frame and highlights the word being spoken.

## Project layout

```
apps/
  server/   Fastify API — keeps the ElevenLabs key server-side, turns character timings into word timings
  web/      Vite + React reader UI
packages/
  shared/   Zod schemas and types for the API, used by both sides
```

## Getting started

Requires Node 26.12.1+ (`nvm use` picks it up from `.nvmrc`) and pnpm.

```bash
pnpm install
cp apps/server/.env.example apps/server/.env   # then add your ElevenLabs API key
pnpm dev                                       # API on :8787, web on :5173
```

Open http://localhost:5173.

## Scripts

| Command          | What it does                          |
| ---------------- | ------------------------------------- |
| `pnpm dev`       | Run the API and web app in watch mode |
| `pnpm test`      | Run the tests                         |
| `pnpm typecheck` | Type-check every package              |
