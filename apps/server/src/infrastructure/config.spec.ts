import { describe, expect, it } from "vitest";
import { getConfig } from "./config.js";

const base = { ELEVENLABS_API_KEY: "key" };
const supabase = { SUPABASE_URL: "https://project.supabase.co", SUPABASE_SECRET_KEY: "secret" };

describe("getConfig", () => {
  it("runs without a speech cache when Supabase isn't configured", () => {
    expect(getConfig(base).speechCache).toBeUndefined();
  });

  it("caches speech in the default bucket when Supabase is configured", () => {
    expect(getConfig({ ...base, ...supabase }).speechCache).toEqual({
      url: "https://project.supabase.co",
      secretKey: "secret",
      bucket: "speech-cache",
    });
  });

  it("refuses to start with only half of the Supabase settings", () => {
    expect(() => getConfig({ ...base, SUPABASE_URL: supabase.SUPABASE_URL })).toThrow(/Set both SUPABASE_URL/);
    expect(() => getConfig({ ...base, SUPABASE_SECRET_KEY: "secret" })).toThrow(/Set both SUPABASE_URL/);
  });
});
