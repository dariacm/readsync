import { describe, expect, it } from "vitest";
import { textLengthStatus } from "./textLimit";

describe("textLengthStatus", () => {
  it("is ok well below the limit", () => {
    expect(textLengthStatus(0, 100)).toBe("ok");
    expect(textLengthStatus(89, 100)).toBe("ok");
  });

  it("warns from 90% of the limit, up to and including the limit", () => {
    expect(textLengthStatus(90, 100)).toBe("near");
    expect(textLengthStatus(100, 100)).toBe("near");
  });

  it("is over once the limit is exceeded", () => {
    expect(textLengthStatus(101, 100)).toBe("over");
  });
});
