import { useState, type KeyboardEvent } from "react";
import { InfoIcon } from "./icons";

/**
 * An ⓘ button that shows a short explanation in a bubble: on hover and keyboard focus, and on
 * click or tap (for touch screens, which can't hover). The text stays in the page while hidden, so
 * whatever `aria-describedby`s it is read out with its setting by screen readers.
 */
export function InfoTip({ id, label, text }: { id: string; label: string; text: string }) {
  const [open, setOpen] = useState(false);
  /** Keyboard focus shows the bubble too, so keyboard users get the same explanation as mouse users. */
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  /** Set by Escape, so the bubble stays hidden even while hovered or focused, until focus leaves. */
  const [dismissed, setDismissed] = useState(false);

  // Escape hides the bubble first; the settings panel only closes on a second Escape.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && !dismissed) {
      e.stopPropagation();
      setOpen(false);
      setDismissed(true);
    }
  };

  return (
    <span className="info-tip" data-open={open || keyboardFocus} data-dismissed={dismissed}>
      <button
        type="button"
        className="info-button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => {
          setOpen((value) => !value);
          setDismissed(false);
        }}
        onFocus={(e) => setKeyboardFocus(e.currentTarget.matches(":focus-visible"))}
        onBlur={() => {
          setOpen(false);
          setKeyboardFocus(false);
          setDismissed(false);
        }}
        onKeyDown={onKeyDown}
      >
        <InfoIcon width={16} height={16} />
      </button>
      <span id={id} className="info-bubble" role="tooltip">
        {text}
      </span>
    </span>
  );
}
