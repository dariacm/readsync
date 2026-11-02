import type { DemoResponse, ErrorResponse, SpeakRequest, SpeakResponse } from "@readsync/shared";

export async function speak(request: SpeakRequest): Promise<SpeakResponse> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as Partial<ErrorResponse> | null;
    throw new Error(body?.error ?? `Request failed (${res.status})`);
  }
  return res.json() as Promise<SpeakResponse>;
}

export function base64ToAudioUrl(base64: string): string {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  return URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
}

/** The sample text when the server runs in demo mode, otherwise null. */
export async function fetchDemoText(): Promise<string | null> {
  const res = await fetch("/api/demo").catch(() => null);
  if (!res?.ok) return null;
  return ((await res.json()) as DemoResponse).text;
}
