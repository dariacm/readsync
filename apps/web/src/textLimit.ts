/** From this share of the limit, the counter warns that the text is getting close. */
const NEAR_LIMIT = 0.9;

export type TextLengthStatus = "ok" | "near" | "over";

export function textLengthStatus(length: number, max: number): TextLengthStatus {
  if (length > max) return "over";
  if (length >= max * NEAR_LIMIT) return "near";
  return "ok";
}
