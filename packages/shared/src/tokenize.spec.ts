import { describe, expect, it } from "vitest";
import { tokenize } from "./tokenize.js";

describe("tokenize", () => {
  it("splits on any whitespace and keeps offsets", () => {
    expect(tokenize(" Hi,\n\nthere 👩‍💻!")).toEqual([
      { text: "Hi,", charStart: 1, charEnd: 4 },
      { text: "there", charStart: 6, charEnd: 11 },
      { text: "👩‍💻!", charStart: 12, charEnd: 18 },
    ]);
  });

  it("returns no tokens for blank text", () => {
    expect(tokenize("  ")).toEqual([]);
  });
});
